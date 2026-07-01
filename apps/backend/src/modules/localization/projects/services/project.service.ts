import { FastifyInstance } from 'fastify';
import { projects, projectLanguages, languages, translations, translationKeys, activityLogs, keyTemplates, keyGlossary, keyVariables } from '../../schema';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { users } from '../../../admin/users/schema';
import { teamMembers, teamProjects, teams } from '../../../admin/teams/schema';

export class ProjectService {
    constructor(private db: FastifyInstance['db']) {}

    async getAll(user?: { id: number; isAdmin: boolean }) {
        if (!user || user.isAdmin) {
            return this.db.select().from(projects);
        }

        // Fetch user's OIDC groups
        const [userRec] = await this.db.select().from(users).where(eq(users.id, user.id));
        const oidcGroupsStr = userRec?.oidcGroups;
        const oidcGroupsArr: string[] = oidcGroupsStr ? JSON.parse(oidcGroupsStr) : [];

        const userProjects = await this.db.select({
            id: projects.id,
            name: projects.name,
            sourceLanguageId: projects.sourceLanguageId,
            inContextUrl: projects.inContextUrl
        })
        .from(projects)
        .innerJoin(teamProjects, eq(projects.id, teamProjects.projectId))
        .innerJoin(teamMembers, eq(teamProjects.teamId, teamMembers.teamId))
        .where(eq(teamMembers.userId, user.id))
        .groupBy(projects.id);

        let oidcLinkedProjects: any[] = [];
        if (oidcGroupsArr.length > 0) {
            const { inArray } = await import('drizzle-orm');
            
            // First find teams matching the user's OIDC groups (case insensitive)
            const allTeams = await this.db.select().from(teams);
            const matchedTeamIds = allTeams
                .filter(t => {
                    if (!t.oidcMappedGroups) return false;
                    try {
                        const mappedGroups: string[] = JSON.parse(t.oidcMappedGroups).map((g: string) => g.toLowerCase());
                        return oidcGroupsArr.some(g => mappedGroups.includes(g.toLowerCase()));
                    } catch (e) {
                        return false;
                    }
                })
                .map(t => t.id);

            if (matchedTeamIds.length > 0) {
                oidcLinkedProjects = await this.db.select({
                    id: projects.id,
                    name: projects.name,
                    sourceLanguageId: projects.sourceLanguageId,
                    inContextUrl: projects.inContextUrl
                })
                .from(projects)
                .innerJoin(teamProjects, eq(projects.id, teamProjects.projectId))
                .where(inArray(teamProjects.teamId, matchedTeamIds))
                .groupBy(projects.id);
            }
        }

        // Combine and deduplicate
        const allAccessible = [...userProjects];
        for (const op of oidcLinkedProjects) {
            if (!allAccessible.some(p => p.id === op.id)) {
                allAccessible.push(op);
            }
        }

        return allAccessible;
    }

    async create(data: { name: string; sourceLanguageId?: number }) {
        return this.db.insert(projects).values(data).returning();
    }

    async update(id: number, data: { name?: string; sourceLanguageId?: number; reviewEnabled?: boolean; requireTemplate?: boolean; inContextUrl?: string | null }) {
        return this.db.update(projects).set(data).where(eq(projects.id, id)).returning();
    }

    async delete(id: number) {
        return this.db.delete(projects).where(eq(projects.id, id));
    }

    async addLanguage(projectId: number, languageId: number) {
        const result = await this.db.insert(projectLanguages).values({ projectId, languageId }).returning();
        
        const [project] = await this.db.select().from(projects).where(eq(projects.id, projectId));
        if (project && !project.sourceLanguageId) {
            await this.setSourceLanguage(projectId, languageId);
        }
        
        return result;
    }

    async setSourceLanguage(projectId: number, languageId: number) {
        return this.db.update(projects).set({ sourceLanguageId: languageId }).where(eq(projects.id, projectId)).returning();
    }

    async removeLanguage(projectId: number, languageId: number) {
        const [project] = await this.db.select({ sourceLanguageId: projects.sourceLanguageId }).from(projects).where(eq(projects.id, projectId));
        if (project && project.sourceLanguageId === languageId) {
            throw new Error('Cannot delete the source language of the project.');
        }

        // 1. Delete mapping in project_languages
        await this.db.delete(projectLanguages)
            .where(and(
                eq(projectLanguages.projectId, projectId),
                eq(projectLanguages.languageId, languageId)
            ));

        // 2. Delete all translations for this language in this project
        const keyIds = await this.db.select({ id: translationKeys.id })
            .from(translationKeys)
            .where(eq(translationKeys.projectId, projectId));

        if (keyIds.length > 0) {
            await this.db.delete(translations)
                .where(and(
                    inArray(translations.keyId, keyIds.map(k => k.id)),
                    eq(translations.languageId, languageId)
                ));
        }

        // 3. Delete language from languages table if it is not used in any other project
        const otherUsages = await this.db.select()
            .from(projectLanguages)
            .where(eq(projectLanguages.languageId, languageId));

        if (otherUsages.length === 0) {
            await this.db.delete(languages)
                .where(eq(languages.id, languageId));
        }

        return { success: true };
    }

    async bulkRemoveLanguages(projectId: number, languageIds: number[]) {
        if (!languageIds.length) return;
        const [project] = await this.db.select({ sourceLanguageId: projects.sourceLanguageId }).from(projects).where(eq(projects.id, projectId));
        if (project && project.sourceLanguageId && languageIds.includes(project.sourceLanguageId)) {
            throw new Error('Cannot delete the source language of the project.');
        }

        // 1. Delete mapping in project_languages
        await this.db.delete(projectLanguages)
            .where(and(
                eq(projectLanguages.projectId, projectId),
                inArray(projectLanguages.languageId, languageIds)
            ));

        // 2. Delete all translations for these languages in this project
        const keyIds = await this.db.select({ id: translationKeys.id })
            .from(translationKeys)
            .where(eq(translationKeys.projectId, projectId));

        if (keyIds.length > 0) {
            await this.db.delete(translations)
                .where(and(
                    inArray(translations.keyId, keyIds.map(k => k.id)),
                    inArray(translations.languageId, languageIds)
                ));
        }

        // 3. Delete languages from languages table if they are not used in any other project
        for (const langId of languageIds) {
            const otherUsages = await this.db.select()
                .from(projectLanguages)
                .where(eq(projectLanguages.languageId, langId));

            if (otherUsages.length === 0) {
                await this.db.delete(languages)
                    .where(eq(languages.id, langId));
            }
        }

        return { success: true };
    }

    async updateProjectLanguage(projectId: number, languageId: number, data: { code?: string; name?: string; flag?: string }) {
        const { ne } = await import('drizzle-orm');

        // 1. Check if the language is used by other projects
        const otherUsages = await this.db.select()
            .from(projectLanguages)
            .where(and(
                eq(projectLanguages.languageId, languageId),
                ne(projectLanguages.projectId, projectId)
            ));

        if (otherUsages.length === 0) {
            // No other projects use this language, update globally in languages table
            return this.db.update(languages)
                .set(data)
                .where(eq(languages.id, languageId))
                .returning();
        } else {
            // Other projects use this language, duplicate it for this project to decouple
            const [currentLang] = await this.db.select()
                .from(languages)
                .where(eq(languages.id, languageId));
            if (!currentLang) {
                throw new Error('Language not found');
            }

            // Create new entry in languages
            const [newLang] = await this.db.insert(languages)
                .values({
                    code: data.code !== undefined ? data.code : currentLang.code,
                    name: data.name !== undefined ? data.name : currentLang.name,
                    flag: data.flag !== undefined ? data.flag : currentLang.flag,
                })
                .returning();

            const newLanguageId = newLang.id;

            // Update mapping in project_languages
            await this.db.update(projectLanguages)
                .set({ languageId: newLanguageId })
                .where(and(
                    eq(projectLanguages.projectId, projectId),
                    eq(projectLanguages.languageId, languageId)
                ));

            // Move translations to the new languageId for this project
            const keyIds = await this.db.select({ id: translationKeys.id })
                .from(translationKeys)
                .where(eq(translationKeys.projectId, projectId));

            if (keyIds.length > 0) {
                await this.db.update(translations)
                    .set({ languageId: newLanguageId })
                    .where(and(
                        inArray(translations.keyId, keyIds.map(k => k.id)),
                        eq(translations.languageId, languageId)
                    ));
            }

            // Update sourceLanguageId if it was the project's source language
            const [project] = await this.db.select({ sourceLanguageId: projects.sourceLanguageId })
                .from(projects)
                .where(eq(projects.id, projectId));
            if (project && project.sourceLanguageId === languageId) {
                await this.db.update(projects)
                    .set({ sourceLanguageId: newLanguageId })
                    .where(eq(projects.id, projectId));
            }

            return [newLang];
        }
    }

    async getProjectLanguages(projectId: number) {
        const [project] = await this.db.select().from(projects).where(eq(projects.id, projectId));
        if (!project) throw new Error('Project not found');

        const projectLangs = await this.db.select({
            id: languages.id,
            code: languages.code,
            name: languages.name,
            flag: languages.flag
        })
        .from(projectLanguages)
        .innerJoin(languages, eq(projectLanguages.languageId, languages.id))
        .where(eq(projectLanguages.projectId, projectId));

        return projectLangs.map(l => ({
            ...l,
            isSource: l.id === project.sourceLanguageId
        }));
    }

    async exportTranslations(projectId: number, languageId: number) {
        const keys = await this.db.select().from(translationKeys).where(eq(translationKeys.projectId, projectId));
        const keyIds = keys.map(k => k.id);
        if (keyIds.length === 0) return {};

        const allTranslations = await this.db.select()
            .from(translations)
            .where(and(inArray(translations.keyId, keyIds), eq(translations.languageId, languageId)));

        const result: Record<string, string> = {};
        for (const key of keys) {
            const t = allTranslations.find(tr => tr.keyId === key.id);
            if (t) {
                result[key.key] = t.value;
            }
        }
        return result;
    }

    async exportTranslationsByCode(projectId: number, languageCode: string) {
        const [lang] = await this.db.select({ id: languages.id })
            .from(languages)
            .innerJoin(projectLanguages, eq(projectLanguages.languageId, languages.id))
            .where(and(eq(projectLanguages.projectId, projectId), eq(languages.code, languageCode)));
        if (!lang) return {};
        return this.exportTranslations(projectId, lang.id);
    }

    async importTranslations(projectId: number, languageId: number, data: Record<string, string>, importAsPending: boolean = false) {
        const existingKeys = await this.db.select().from(translationKeys).where(eq(translationKeys.projectId, projectId));
        const keyMap = new Map(existingKeys.map(k => [k.key, k.id]));

        for (const [rawKeyName, value] of Object.entries(data)) {
            if (typeof value !== 'string') continue;
            
            // Sanitize key name: replace colons, double colons, slashes, and backslashes with dots, and collapse any consecutive dots
            const keyName = rawKeyName
                .replace(/[:\\/]+/g, '.')
                .replace(/\.+/g, '.')
                .replace(/^\.|\.$/g, '');
                
            if (!keyName) continue;

            let keyId = keyMap.get(keyName);
            if (!keyId) {
                const [newKey] = await this.db.insert(translationKeys).values({ projectId, key: keyName }).returning();
                keyId = newKey.id;
                keyMap.set(keyName, keyId);
            }
            
            const insertData = importAsPending 
                ? { keyId, languageId, value: "", draftValue: value, reviewStatus: 'PENDING_REVIEW' as const }
                : { keyId, languageId, value, draftValue: null, reviewStatus: 'APPROVED' as const };

            await this.db.insert(translations)
                .values(insertData)
                .onConflictDoUpdate({
                    target: [translations.keyId, translations.languageId],
                    set: insertData
                });
        }
        return { success: true, imported: Object.keys(data).length };
    }

    async bulkTranslate(projectId: number, targetLanguageId: number, providerId: string, markAsPending: boolean) {
        const [project] = await this.db.select({ sourceLanguageId: projects.sourceLanguageId }).from(projects).where(eq(projects.id, projectId));
        if (!project || !project.sourceLanguageId) throw new Error('Project source language not set');
        if (project.sourceLanguageId === targetLanguageId) throw new Error('Cannot bulk translate the source language');

        const [sourceLang] = await this.db.select().from(languages).where(eq(languages.id, project.sourceLanguageId));
        const [targetLang] = await this.db.select().from(languages).where(eq(languages.id, targetLanguageId));
        if (!sourceLang || !targetLang) throw new Error('Language not found');

        const keys = await this.db.select().from(translationKeys).where(eq(translationKeys.projectId, projectId));
        if (!keys.length) return { success: true, count: 0 };
        const keyIds = keys.map(k => k.id);

        const allTranslations = await this.db.select()
            .from(translations)
            .where(and(
                inArray(translations.keyId, keyIds),
                inArray(translations.languageId, [project.sourceLanguageId, targetLanguageId])
            ));

        const sourceMap = new Map<number, string>();
        const targetMap = new Map<number, string>();

        for (const t of allTranslations) {
            if (t.languageId === project.sourceLanguageId && t.value.trim() !== '') {
                sourceMap.set(t.keyId, t.value);
            }
            if (t.languageId === targetLanguageId && t.value.trim() !== '') {
                targetMap.set(t.keyId, t.value);
            }
        }

        const missingKeys: { keyId: number, text: string }[] = [];
        for (const keyId of sourceMap.keys()) {
            if (!targetMap.has(keyId)) {
                missingKeys.push({ keyId, text: sourceMap.get(keyId)! });
            }
        }

        if (!missingKeys.length) return { success: true, count: 0 };

        let translatedTexts: string[] = [];
        if (providerId === 'deepl') {
            const { DeeplService } = await import('../../services/deepl.service');
            const deeplService = new DeeplService(this.db as any);
            translatedTexts = await deeplService.translate(missingKeys.map(k => k.text), targetLang.code, sourceLang.code);
        } else if (providerId === 'google') {
            const { GoogleService } = await import('../../services/google.service');
            const googleService = new GoogleService();
            translatedTexts = await googleService.translate(missingKeys.map(k => k.text), targetLang.code, sourceLang.code);
        } else {
            throw new Error(`Unsupported provider: ${providerId}`);
        }

        if (translatedTexts.length !== missingKeys.length) {
            throw new Error('Translation count mismatch');
        }

        for (let i = 0; i < missingKeys.length; i++) {
            const keyId = missingKeys[i].keyId;
            const text = translatedTexts[i];

            const insertData = markAsPending 
                ? { keyId, languageId: targetLanguageId, value: "", draftValue: text, reviewStatus: 'PENDING_REVIEW' as const }
                : { keyId, languageId: targetLanguageId, value: text, draftValue: null, reviewStatus: 'APPROVED' as const };

            await this.db.insert(translations)
                .values(insertData)
                .onConflictDoUpdate({
                    target: [translations.keyId, translations.languageId],
                    set: insertData
                });
        }

        return { success: true, count: missingKeys.length };
    }

    async getTemplates(projectId: number) {
        return this.db.select().from(keyTemplates).where(eq(keyTemplates.projectId, projectId));
    }

    async createTemplate(projectId: number, data: { name: string, segments: string }) {
        return this.db.insert(keyTemplates).values({ projectId, ...data }).returning();
    }

    async updateTemplate(id: number, data: { name?: string, segments?: string }) {
        return this.db.update(keyTemplates).set(data).where(eq(keyTemplates.id, id)).returning();
    }

    async deleteTemplate(id: number) {
        return this.db.delete(keyTemplates).where(eq(keyTemplates.id, id));
    }

    async getGlossary(projectId: number) {
        return this.db.select().from(keyGlossary).where(eq(keyGlossary.projectId, projectId));
    }

    async createGlossaryTerm(projectId: number, data: { badWord: string, goodWord: string }) {
        return this.db.insert(keyGlossary).values({ projectId, ...data }).returning();
    }

    async updateGlossaryTerm(id: number, data: { badWord?: string, goodWord?: string }) {
        return this.db.update(keyGlossary).set(data).where(eq(keyGlossary.id, id)).returning();
    }

    async deleteGlossaryTerm(id: number) {
        return this.db.delete(keyGlossary).where(eq(keyGlossary.id, id));
    }

    // --- Key Variables (Shared Enums) ---
    async getVariables(projectId: number) {
        return this.db.select().from(keyVariables).where(eq(keyVariables.projectId, projectId));
    }

    async createVariable(projectId: number, data: { name: string, options: string }) {
        return this.db.insert(keyVariables).values({ projectId, ...data }).returning();
    }

    async updateVariable(id: number, data: { name?: string, options?: string }) {
        return this.db.update(keyVariables).set(data).where(eq(keyVariables.id, id)).returning();
    }

    async deleteVariable(id: number) {
        return this.db.delete(keyVariables).where(eq(keyVariables.id, id));
    }

    async exportConventions(projectId: number) {
        const [templates, glossary, variables] = await Promise.all([
            this.db.select().from(keyTemplates).where(eq(keyTemplates.projectId, projectId)),
            this.db.select().from(keyGlossary).where(eq(keyGlossary.projectId, projectId)),
            this.db.select().from(keyVariables).where(eq(keyVariables.projectId, projectId))
        ]);

        return {
            templates: templates.map(t => ({ name: t.name, segments: t.segments })),
            glossary: glossary.map(g => ({ badWord: g.badWord, goodWord: g.goodWord })),
            variables: variables.map(v => ({ name: v.name, options: v.options }))
        };
    }

    async importConventions(projectId: number, data: { templates?: { name: string, segments: string }[], glossary?: { badWord: string, goodWord: string }[], variables?: { name: string, options: string }[] }) {
        if (data.templates && data.templates.length > 0) {
            for (const t of data.templates) {
                // Delete existing with same name if exists, then insert
                const existing = await this.db.select().from(keyTemplates).where(and(eq(keyTemplates.projectId, projectId), eq(keyTemplates.name, t.name)));
                if (existing.length > 0) {
                    await this.db.delete(keyTemplates).where(eq(keyTemplates.id, existing[0].id));
                }
                await this.db.insert(keyTemplates).values({ projectId, name: t.name, segments: t.segments });
            }
        }
        if (data.glossary && data.glossary.length > 0) {
            for (const g of data.glossary) {
                await this.db.insert(keyGlossary).values({ projectId, badWord: g.badWord, goodWord: g.goodWord })
                    .onConflictDoUpdate({
                        target: [keyGlossary.projectId, keyGlossary.badWord],
                        set: { goodWord: g.goodWord }
                    });
            }
        }
        if (data.variables && data.variables.length > 0) {
            for (const v of data.variables) {
                await this.db.insert(keyVariables).values({ projectId, name: v.name, options: v.options })
                    .onConflictDoUpdate({
                        target: [keyVariables.projectId, keyVariables.name],
                        set: { options: v.options }
                    });
            }
        }
        return { success: true };
    }

    async getDashboardStats(user: { id: number; isAdmin: boolean }) {
        const accessibleProjects = await this.getAll(user);
        
        // Always calculate personal stats
        const personalLogs = await this.db.select({ 
            action: activityLogs.action,
            createdAt: activityLogs.createdAt,
            details: activityLogs.details
        }).from(activityLogs).where(eq(activityLogs.userId, user.id));

        const now = new Date();
        const lastDays = new Map<string, number>();
        for (let i = 167; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            lastDays.set(dateStr, 0);
        }

        personalLogs.forEach(log => {
            const d = new Date(log.createdAt);
            const iso = d.toISOString().split('T')[0];
            if (lastDays.has(iso)) {
                lastDays.set(iso, lastDays.get(iso)! + 1);
            }
        });
        
        const activityHeatmap: { date: string; count: number }[] = [];
        lastDays.forEach((count, date) => {
            activityHeatmap.push({ date, count });
        });

        const timeSpentArr: number[] = [];
        personalLogs.filter(l => l.action === 'TRANSLATION_UPDATED').forEach(l => {
            try {
                if (l.details) {
                    const parsed = JSON.parse(l.details);
                    if (parsed.timeSpentMs && parsed.timeSpentMs > 0 && !parsed.isAutomated) {
                        timeSpentArr.push(parsed.timeSpentMs);
                    }
                }
            } catch (e) {}
        });
        
        let averageTranslationSpeedMs = 0;
        if (timeSpentArr.length > 0) {
            const sum = timeSpentArr.reduce((acc, val) => acc + val, 0);
            averageTranslationSpeedMs = sum / timeSpentArr.length;
        }

        const personalStats = {
            keysCreated: personalLogs.filter(l => l.action === 'KEY_CREATED').length,
            translationsUpdated: personalLogs.filter(l => l.action === 'TRANSLATION_UPDATED').length,
            languagesAdded: personalLogs.filter(l => l.action === 'LANGUAGE_ADDED').length,
            labelsCreated: personalLogs.filter(l => l.action === 'LABEL_CREATED').length,
            activityHeatmap,
            averageTranslationSpeedMs
        };

        if (!accessibleProjects.length) {
            return { 
                globalStats: { totalProjects: 0, totalKeys: 0, totalLanguages: 0, totalTranslations: 0, overallProgress: 0 }, 
                projects: [],
                recentProjects: [],
                personalStats
            };
        }

        const projectIds = accessibleProjects.map(p => p.id);
        
        const keys = await this.db.select().from(translationKeys).where(inArray(translationKeys.projectId, projectIds));
        const totalKeys = keys.length;

        const projLangs = await this.db.select().from(projectLanguages).where(inArray(projectLanguages.projectId, projectIds));
        const totalProjectLanguages = projLangs.length;
        
        const distinctLanguageIds = new Set(projLangs.map(pl => pl.languageId));
        const totalLanguages = distinctLanguageIds.size;

        const keyIds = keys.map(k => k.id);
        let totalTranslations = 0;
        let transRecs: any[] = [];
        if (keyIds.length > 0) {
            transRecs = await this.db.select().from(translations).where(inArray(translations.keyId, keyIds));
            totalTranslations = transRecs.filter(t => t.value.trim() !== '').length;
        }

        let expectedTranslations = 0;
        
        const projectStats = accessibleProjects.map(p => {
            const pKeys = keys.filter(k => k.projectId === p.id);
            const pLangs = projLangs.filter(pl => pl.projectId === p.id);
            const expected = pKeys.length * pLangs.length;
            expectedTranslations += expected;
            
            const pKeyIds = new Set(pKeys.map(k => k.id));
            const pTrans = transRecs.filter(t => pKeyIds.has(t.keyId) && t.value.trim() !== '');
            const progress = expected === 0 ? 0 : Math.floor((pTrans.length / expected) * 100);
            
            return {
                id: p.id,
                name: p.name,
                keysCount: pKeys.length,
                languagesCount: pLangs.length,
                translationsCount: pTrans.length,
                progress,
                lastActivity: null as Date | null
            };
        });

        const logs = await this.db.select({
            projectId: activityLogs.projectId,
            createdAt: activityLogs.createdAt
        }).from(activityLogs).where(inArray(activityLogs.projectId, projectIds));

        const projectLastActivity = new Map<number, Date>();
        logs.forEach(log => {
            if (!log.projectId) return;
            const date = new Date(log.createdAt);
            const existing = projectLastActivity.get(log.projectId);
            if (!existing || date > existing) {
                projectLastActivity.set(log.projectId, date);
            }
        });

        projectStats.forEach(p => {
            p.lastActivity = projectLastActivity.get(p.id) || null;
        });

        const recentProjects = [...projectStats]
            .filter(p => p.lastActivity)
            .sort((a, b) => b.lastActivity!.getTime() - a.lastActivity!.getTime())
            .slice(0, 3);

        const overallProgress = expectedTranslations === 0 ? 0 : Math.floor((totalTranslations / expectedTranslations) * 100);

        return {
            globalStats: {
                totalProjects: accessibleProjects.length,
                totalKeys,
                totalLanguages,
                totalTranslations,
                overallProgress
            },
            projects: projectStats,
            recentProjects,
            personalStats
        };
    }
}
