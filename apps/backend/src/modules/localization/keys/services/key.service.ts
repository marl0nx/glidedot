import { FastifyInstance } from 'fastify';
import { translationKeys, translations, keysToLabels, projects, languages, labels } from '../../schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { DeeplService } from '../../services/deepl.service';
import { GoogleService } from '../../services/google.service';

export class KeyService {
    private deeplService: DeeplService;
    private googleService: GoogleService;

    constructor(private db: FastifyInstance['db']) {
        this.deeplService = new DeeplService(this.db);
        this.googleService = new GoogleService();
    }

    async getByProject(projectId: number) {
        const keys = await this.db.select().from(translationKeys).where(eq(translationKeys.projectId, projectId));
        const keyIds = keys.map(k => k.id);

        if (keyIds.length === 0) return [];

        const { users } = await import('../../../admin/users/schema');
        const allTranslations = await this.db.select({
            id: translations.id,
            keyId: translations.keyId,
            languageId: translations.languageId,
            value: translations.value,
            draftValue: translations.draftValue,
            reviewStatus: translations.reviewStatus,
            authorId: translations.authorId,
            authorName: users.username,
            authorAvatar: users.avatarUrl
        })
        .from(translations)
        .leftJoin(users, eq(translations.authorId, users.id))
        .where(inArray(translations.keyId, keyIds));
        
        const allLabels = await this.db.select({
            keyId: keysToLabels.keyId,
            id: labels.id,
            name: labels.name,
            color: labels.color
        })
        .from(keysToLabels)
        .innerJoin(labels, eq(keysToLabels.labelId, labels.id))
        .where(inArray(keysToLabels.keyId, keyIds));

        return keys.map(k => ({
            ...k,
            translations: allTranslations.filter(t => t.keyId === k.id),
            labels: allLabels.filter(l => l.keyId === k.id).map(l => ({ id: l.id, name: l.name, color: l.color }))
        }));
    }

    async createKey(projectId: number, key: string, labelIds?: number[], userId?: number) {
        const { users } = await import('../../../admin/users/schema');
        const { projects } = await import('../../schema');

        let needsReview = false;
        let userRecord = null;
        
        if (userId) {
            const [user] = await this.db.select().from(users).where(eq(users.id, userId));
            userRecord = user;
            const [project] = await this.db.select().from(projects).where(eq(projects.id, projectId));
            needsReview = !user?.isAdmin && !user?.isReviewer && (project?.reviewEnabled || user?.requiresReview);
        }

        const [newKey] = await this.db.insert(translationKeys).values({ 
            projectId, 
            key,
            reviewStatus: needsReview ? 'PENDING_REVIEW' : 'APPROVED',
            authorId: needsReview ? userId : undefined
        }).returning();

        if (labelIds?.length) {
            await this.db.insert(keysToLabels).values(
                labelIds.map(labelId => ({ keyId: newKey.id, labelId }))
            );
        }

        if (needsReview) {
            try {
                const { or } = await import('drizzle-orm');
                const { NotificationService } = await import('../../../../services/notification.service');
                const reviewers = await this.db.select().from(users).where(or(eq(users.isAdmin, true), eq(users.isReviewer, true)));
                
                for (const reviewer of reviewers) {
                    if (reviewer.alertConfig) {
                        await NotificationService.send(reviewer.alertConfig, 'pending.reviews', {
                            title: 'New Key Created Pending Review 🔑',
                            message: `A new key \`${key}\` was created by ${userRecord?.username || 'Unknown'} and is waiting for approval.`
                        }, {
                            throttleKey: `pending.reviews-${reviewer.id}`,
                            throttleHours: 2
                        });
                    }
                }
            } catch(e) {
                console.error("Failed to send key creation review notifications", e);
            }
        }

        return newKey;
    }

    async updateKey(projectId: number, keyId: number, newKeyName: string, userId?: number, forceReview: boolean = false) {
        const { users } = await import('../../../admin/users/schema');
        const { projects } = await import('../../schema');
        
        let needsReview = forceReview;
        let userRecord = null;
        
        if (userId) {
            const [user] = await this.db.select().from(users).where(eq(users.id, userId));
            userRecord = user;
            if (!needsReview) {
                const [project] = await this.db.select().from(projects).where(eq(projects.id, projectId));
                needsReview = !user?.isAdmin && !user?.isReviewer && (project?.reviewEnabled || user?.requiresReview);
            }
        }

        if (needsReview) {
            const result = await this.db.update(translationKeys)
                .set({ draftKey: newKeyName, reviewStatus: 'PENDING_REVIEW', authorId: userId })
                .where(and(eq(translationKeys.id, keyId), eq(translationKeys.projectId, projectId)))
                .returning();

            try {
                const { or } = await import('drizzle-orm');
                const { NotificationService } = await import('../../../../services/notification.service');
                const reviewers = await this.db.select().from(users).where(or(eq(users.isAdmin, true), eq(users.isReviewer, true)));
                
                for (const reviewer of reviewers) {
                    if (reviewer.alertConfig) {
                        await NotificationService.send(reviewer.alertConfig, 'pending.reviews', {
                            title: 'New Key Edit Pending Review 🔑',
                            message: `A key name edit was submitted by ${userRecord?.username || 'Unknown'} and is waiting for approval.`
                        }, {
                            throttleKey: `pending.reviews-${reviewer.id}`,
                            throttleHours: 2
                        });
                    }
                }
            } catch(e) {
                console.error("Failed to send key review notifications", e);
            }
            return result;
        }

        return this.db.update(translationKeys)
            .set({ key: newKeyName })
            .where(and(eq(translationKeys.id, keyId), eq(translationKeys.projectId, projectId)))
            .returning();
    }

    async bulkUpdateKeys(projectId: number, updates: { id: number, key: string }[], userId?: number, forceReview: boolean = false) {
        if (!updates.length) return [];
        
        const { users } = await import('../../../admin/users/schema');
        const { projects } = await import('../../schema');
        
        let needsReview = forceReview;
        let userRecord = null;
        
        if (userId) {
            const [user] = await this.db.select().from(users).where(eq(users.id, userId));
            userRecord = user;
            if (!needsReview) {
                const [project] = await this.db.select().from(projects).where(eq(projects.id, projectId));
                needsReview = !user?.isAdmin && !user?.isReviewer && (project?.reviewEnabled || user?.requiresReview);
            }
        }

        const results = [];
        let reviewsTriggered = 0;

        // Batched into a single real transaction via raw BEGIN/COMMIT (see ProjectService.importTranslations
        // for why db.transaction() with an async callback doesn't actually batch on the bun-sqlite driver).
        await this.db.run(sql.raw('BEGIN'));
        try {
            for (const update of updates) {
                if (needsReview) {
                    const result = await this.db.update(translationKeys)
                        .set({ draftKey: update.key, reviewStatus: 'PENDING_REVIEW', authorId: userId })
                        .where(and(eq(translationKeys.id, update.id), eq(translationKeys.projectId, projectId)))
                        .returning();
                    results.push(...result);
                    reviewsTriggered++;
                } else {
                    const result = await this.db.update(translationKeys)
                        .set({ key: update.key })
                        .where(and(eq(translationKeys.id, update.id), eq(translationKeys.projectId, projectId)))
                        .returning();
                    results.push(...result);
                }
            }
            await this.db.run(sql.raw('COMMIT'));
        } catch (err) {
            await this.db.run(sql.raw('ROLLBACK'));
            throw err;
        }

        if (needsReview && reviewsTriggered > 0) {
            try {
                const { or } = await import('drizzle-orm');
                const { NotificationService } = await import('../../../../services/notification.service');
                const reviewers = await this.db.select().from(users).where(or(eq(users.isAdmin, true), eq(users.isReviewer, true)));
                
                for (const reviewer of reviewers) {
                    if (reviewer.alertConfig) {
                        await NotificationService.send(reviewer.alertConfig, 'pending.reviews', {
                            title: 'Bulk Key Edits Pending Review 🔑',
                            message: `${reviewsTriggered} key name edit(s) were submitted by ${userRecord?.username || 'Unknown'} and are waiting for approval.`
                        }, {
                            throttleKey: `pending.reviews-${reviewer.id}`,
                            throttleHours: 2
                        });
                    }
                }
            } catch(e) {
                console.error("Failed to send bulk key review notifications", e);
            }
        }

        return results;
    }

    async deleteKey(projectId: number, keyId: number) {
        // delete translations and label links first
        await this.db.delete(translations).where(eq(translations.keyId, keyId));
        await this.db.delete(keysToLabels).where(eq(keysToLabels.keyId, keyId));
        return this.db.delete(translationKeys).where(and(eq(translationKeys.id, keyId), eq(translationKeys.projectId, projectId))).returning();
    }

    async bulkDeleteKeys(projectId: number, keyIds: number[]) {
        if (!keyIds.length) return;
        await this.db.delete(translations).where(inArray(translations.keyId, keyIds));
        await this.db.delete(keysToLabels).where(inArray(keysToLabels.keyId, keyIds));
        return this.db.delete(translationKeys).where(and(inArray(translationKeys.id, keyIds), eq(translationKeys.projectId, projectId))).returning();
    }

    async addLabelToKey(projectId: number, keyId: number, labelId: number) {
        // verify key belongs to project
        const [key] = await this.db.select().from(translationKeys).where(and(eq(translationKeys.id, keyId), eq(translationKeys.projectId, projectId)));
        if (!key) throw new Error('Key not found in project');
        return this.db.insert(keysToLabels).values({ keyId, labelId }).onConflictDoNothing().returning();
    }

    async bulkAddLabelToKeys(projectId: number, keyIds: number[], labelId: number) {
        if (!keyIds.length) return;
        const validKeys = await this.db.select({ id: translationKeys.id }).from(translationKeys).where(and(inArray(translationKeys.id, keyIds), eq(translationKeys.projectId, projectId)));
        const validKeyIds = validKeys.map(k => k.id);
        if (!validKeyIds.length) return;
        return this.db.insert(keysToLabels).values(validKeyIds.map(keyId => ({ keyId, labelId }))).onConflictDoNothing().returning();
    }

    async removeLabelFromKey(projectId: number, keyId: number, labelId: number) {
        const [key] = await this.db.select().from(translationKeys).where(and(eq(translationKeys.id, keyId), eq(translationKeys.projectId, projectId)));
        if (!key) throw new Error('Key not found in project');
        return this.db.delete(keysToLabels).where(and(eq(keysToLabels.keyId, keyId), eq(keysToLabels.labelId, labelId))).returning();
    }

    async bulkRemoveLabelFromKeys(projectId: number, keyIds: number[], labelId: number) {
        if (!keyIds.length) return;
        const validKeys = await this.db.select({ id: translationKeys.id }).from(translationKeys).where(and(inArray(translationKeys.id, keyIds), eq(translationKeys.projectId, projectId)));
        const validKeyIds = validKeys.map(k => k.id);
        if (!validKeyIds.length) return;
        return this.db.delete(keysToLabels).where(and(inArray(keysToLabels.keyId, validKeyIds), eq(keysToLabels.labelId, labelId))).returning();
    }

    async upsertTranslation(projectId: number, keyId: number, languageId: number, value: string, userId: number) {
        const { users } = await import('../../../admin/users/schema');
        const { projects, translations } = await import('../../schema');
        const [user] = await this.db.select().from(users).where(eq(users.id, userId));
        const [project] = await this.db.select().from(projects).where(eq(projects.id, projectId));
        
        const needsReview = !user?.isAdmin && !user?.isReviewer && (project?.reviewEnabled || user?.requiresReview);

        const [existing] = await this.db.select().from(translations).where(and(eq(translations.keyId, keyId), eq(translations.languageId, languageId)));
        
        if (needsReview) {
            let result;
            if (existing) {
                result = await this.db.update(translations)
                    .set({ draftValue: value, reviewStatus: 'PENDING_REVIEW', authorId: userId })
                    .where(eq(translations.id, existing.id))
                    .returning();
            } else {
                result = await this.db.insert(translations)
                    .values({ keyId, languageId, value: '', draftValue: value, reviewStatus: 'PENDING_REVIEW', authorId: userId })
                    .returning();
            }

            try {
                const { or } = await import('drizzle-orm');
                const { NotificationService } = await import('../../../../services/notification.service');
                const reviewers = await this.db.select().from(users).where(or(eq(users.isAdmin, true), eq(users.isReviewer, true)));
                
                for (const reviewer of reviewers) {
                    if (reviewer.alertConfig) {
                        await NotificationService.send(reviewer.alertConfig, 'pending.reviews', {
                            title: 'New Translation Pending Review 🧐',
                            message: `A new translation draft was submitted by ${user?.username} and is waiting for approval.`
                        }, {
                            throttleKey: `pending.reviews-${reviewer.id}`,
                            throttleHours: 2
                        });
                    }
                }
            } catch (notifyError) {
                console.error('Failed to send pending review notifications', notifyError);
            }

            return result;
        } else {
            return this.db.insert(translations)
                .values({ keyId, languageId, value, draftValue: null, reviewStatus: 'APPROVED', authorId: userId })
                .onConflictDoUpdate({
                    target: [translations.keyId, translations.languageId],
                    set: { value, draftValue: null, reviewStatus: 'APPROVED', authorId: userId }
                })
                .returning();
        }
    }

    async checkAndDecrementQuota(userId?: number, count: number = 1): Promise<number | null> {
        if (!userId) return null;
        const { users } = await import('../../../admin/users/schema');
        const [user] = await this.db.select().from(users).where(eq(users.id, userId));
        if (!user) return null;
        if (!user.allowSuggestions) throw new Error('Translation suggestions are disabled for this user');
        
        if (user.isAdmin) {
            return user.translationQuota; // Unlimited, so we don't decrement
        }

        let currentQuota = user.translationQuota;
        let updateNextResetAt = user.quotaNextResetAt;

        if (user.quotaResetPeriodValue && user.quotaResetPeriodUnit && user.quotaNextResetAt) {
            if (new Date() >= user.quotaNextResetAt) {
                currentQuota = user.baseTranslationQuota;
                
                const nextReset = new Date(user.quotaNextResetAt);
                while (nextReset <= new Date()) {
                    if (user.quotaResetPeriodUnit === 'days') nextReset.setDate(nextReset.getDate() + user.quotaResetPeriodValue);
                    else if (user.quotaResetPeriodUnit === 'weeks') nextReset.setDate(nextReset.getDate() + user.quotaResetPeriodValue * 7);
                    else if (user.quotaResetPeriodUnit === 'months') nextReset.setMonth(nextReset.getMonth() + user.quotaResetPeriodValue);
                    else break;
                }
                updateNextResetAt = nextReset;
            }
        }

        if (currentQuota < count) throw new Error('Translation quota exceeded');
        
        const newQuota = currentQuota - count;
        await this.db.update(users)
            .set({ 
                translationQuota: newQuota,
                quotaNextResetAt: updateNextResetAt
            })
            .where(eq(users.id, userId));
            
        if (newQuota <= 50 && user.alertConfig) {
            const { NotificationService } = await import('../../../../services/notification.service');
            await NotificationService.send(user.alertConfig, 'quota.low', {
                title: 'Translation Quota Low ⚠️',
                message: `You only have ${newQuota} translation suggestions remaining.`
            }, {
                throttleKey: `quota.low-${user.id}`,
                throttleHours: 24
            });
        }

        return newQuota;
    }

    async autoTranslate(projectId: number, keyId: number, targetLanguageIds: number[], provider: 'deepl' | 'google' = 'google', userId?: number) {
        const [project] = await this.db.select().from(projects).where(eq(projects.id, projectId));
        if (!project || !project.sourceLanguageId) throw new Error('Project or source language not found');

        const [sourceTranslation] = await this.db.select()
            .from(translations)
            .where(and(eq(translations.keyId, keyId), eq(translations.languageId, project.sourceLanguageId)));

        if (!sourceTranslation) throw new Error('Source translation not found');

        const sourceLang = await this.db.select().from(languages).where(eq(languages.id, project.sourceLanguageId));
        const targetLangs = await this.db.select().from(languages).where(inArray(languages.id, targetLanguageIds));

        await this.checkAndDecrementQuota(userId, targetLangs.length);

        const translationService = provider === 'deepl' ? this.deeplService : this.googleService;

        for (const targetLang of targetLangs) {
            const [translatedText] = await translationService.translate(
                [sourceTranslation.value],
                targetLang.code,
                sourceLang[0].code
            );
            await this.upsertTranslation(projectId, keyId, targetLang.id, translatedText, userId!);
        }
    }

    async suggestTranslation(projectId: number, keyId: number, targetLanguageId: number, provider: 'deepl' | 'google' = 'google', userId?: number) {
        const [project] = await this.db.select().from(projects).where(eq(projects.id, projectId));
        if (!project || !project.sourceLanguageId) throw new Error('Project or source language not found');

        const [sourceTranslation] = await this.db.select()
            .from(translations)
            .where(and(eq(translations.keyId, keyId), eq(translations.languageId, project.sourceLanguageId)));

        if (!sourceTranslation) throw new Error('Source translation not found');

        const sourceLang = await this.db.select().from(languages).where(eq(languages.id, project.sourceLanguageId));
        const targetLang = await this.db.select().from(languages).where(eq(languages.id, targetLanguageId));

        if (!targetLang.length) throw new Error('Target language not found');

        const quotaRemaining = await this.checkAndDecrementQuota(userId, 1);

        const translationService = provider === 'deepl' ? this.deeplService : this.googleService;

        const [translatedText] = await translationService.translate(
            [sourceTranslation.value],
            targetLang[0].code,
            sourceLang[0].code
        );

        return { suggestion: translatedText, quotaRemaining };
    }

    async logActivity(userId: number, projectId: number, action: string, details: string) {
        const { activityLogs } = await import('../../schema');
        return this.db.insert(activityLogs).values({ userId, projectId, action, details }).execute();
    }
}
