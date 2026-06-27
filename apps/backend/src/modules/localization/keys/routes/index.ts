import { FastifyInstance } from 'fastify';
import { KeyService } from '../services/key.service';

export default async function keyRoutes(fastify: FastifyInstance) {
    const service = new KeyService(fastify.db);
    const { checkProjectAccess, checkLanguagePermission } = fastify.authHooks;

    fastify.get('/:projectId', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId } = request.params as { projectId: string };
        return service.getByProject(parseInt(projectId));
    });

    fastify.post('/:projectId', { preHandler: [checkProjectAccess] }, async (request, reply) => {
        const { projectId } = request.params as { projectId: string };
        const body = request.body as { key: string; labelIds?: number[] };
        const result = await service.createKey(parseInt(projectId), body.key, body.labelIds, request.user?.id);
        
        if (request.user) {
            await service.logActivity(request.user.id, parseInt(projectId), 'KEY_CREATED', JSON.stringify({ key: body.key }));
        }
        
        reply.status(201).send(result);
    });

    fastify.post('/:projectId/:keyId/translations', { preHandler: [checkProjectAccess, checkLanguagePermission] }, async (request) => {
        const { projectId, keyId } = request.params as { projectId: string; keyId: string };
        const body = request.body as { languageId: number; value: string; timeSpentMs?: number; isAutomated?: boolean };
        
        const { translationKeys, languages, translations } = await import('../../schema');
        const { eq, and } = await import('drizzle-orm');

        const keyRecord = await fastify.db.select().from(translationKeys).where(eq(translationKeys.id, parseInt(keyId))).limit(1);
        const keyName = keyRecord.length > 0 ? keyRecord[0].key : `Key #${keyId}`;

        const langRecord = await fastify.db.select().from(languages).where(eq(languages.id, body.languageId)).limit(1);
        const languageCode = langRecord.length > 0 ? langRecord[0].code : `Lang #${body.languageId}`;

        const oldTranslation = await fastify.db.select().from(translations).where(and(eq(translations.keyId, parseInt(keyId)), eq(translations.languageId, body.languageId))).limit(1);
        const oldValue = oldTranslation.length > 0 ? oldTranslation[0].value : "";

        const result = await service.upsertTranslation(parseInt(projectId), parseInt(keyId), body.languageId, body.value, request.user!.id);
        if (request.user) {
            await service.logActivity(request.user.id, parseInt(projectId), 'TRANSLATION_UPDATED', JSON.stringify({ 
                keyId, 
                languageId: body.languageId,
                keyName,
                languageCode,
                oldValue,
                newValue: body.value,
                timeSpentMs: body.timeSpentMs || 0,
                isAutomated: body.isAutomated || false
            }));
        }
        return result;
    });

    fastify.delete('/:projectId/:keyId', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId, keyId } = request.params as { projectId: string, keyId: string };
        const result = await service.deleteKey(parseInt(projectId), parseInt(keyId));
        if (request.user) {
            await service.logActivity(request.user.id, parseInt(projectId), 'KEY_DELETED', JSON.stringify({ keyId }));
        }
        return result;
    });

    fastify.patch('/:projectId/:keyId', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId, keyId } = request.params as { projectId: string, keyId: string };
        const body = request.body as { key: string, forceReview?: boolean };
        const result = await service.updateKey(parseInt(projectId), parseInt(keyId), body.key, request.user?.id, body.forceReview);
        
        if (request.user) {
            await service.logActivity(request.user.id, parseInt(projectId), 'KEY_UPDATED', JSON.stringify({ keyId, newKey: body.key }));
        }
        
        return result;
    });

    fastify.patch('/:projectId/bulk', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId } = request.params as { projectId: string };
        const body = request.body as { updates: { id: number, key: string }[], forceReview?: boolean };
        
        const result = await service.bulkUpdateKeys(parseInt(projectId), body.updates, request.user?.id, body.forceReview);
        
        if (request.user && body.updates.length > 0) {
            await service.logActivity(request.user.id, parseInt(projectId), 'KEYS_BULK_UPDATED', JSON.stringify({ count: body.updates.length }));
        }
        
        return result;
    });

    fastify.post('/:projectId/:keyId/translations/:languageId/approve', { preHandler: [checkProjectAccess] }, async (request, reply) => {
        const { projectId, keyId, languageId } = request.params as { projectId: string, keyId: string, languageId: string };
        const { translations } = await import('../../schema');
        const { eq, and } = await import('drizzle-orm');
        
        // Ensure user is reviewer or admin
        if (!request.user?.isAdmin && !request.user?.isReviewer) {
            return reply.status(403).send({ error: 'Only admins or reviewers can approve translations' });
        }

        const [existing] = await fastify.db.select().from(translations).where(and(eq(translations.keyId, parseInt(keyId)), eq(translations.languageId, parseInt(languageId))));
        if (!existing || existing.reviewStatus !== 'PENDING_REVIEW') {
            return reply.status(400).send({ error: 'Translation is not pending review' });
        }

        const updated = await fastify.db.update(translations)
            .set({ value: existing.draftValue || existing.value, draftValue: null, reviewStatus: 'APPROVED' })
            .where(eq(translations.id, existing.id))
            .returning();
            
        await service.logActivity(request.user.id, parseInt(projectId), 'TRANSLATION_APPROVED', JSON.stringify({ keyId, languageId }));

        if (existing.authorId && existing.authorId !== request.user.id) {
            const { users } = await import('../../../admin/users/schema');
            const { NotificationService } = await import('../../../../services/notification.service');
            const [author] = await fastify.db.select().from(users).where(eq(users.id, existing.authorId));
            if (author?.alertConfig) {
                const { translationKeys } = await import('../../schema');
                const [keyRecord] = await fastify.db.select().from(translationKeys).where(eq(translationKeys.id, parseInt(keyId)));
                await NotificationService.send(author.alertConfig, 'translation.approved', {
                    title: 'Translation Approved 🎉',
                    message: `Your translation for key \`${keyRecord?.key}\` was approved by ${request.user.username}.`
                });
            }
        }

        return updated[0];
    });

    fastify.post('/:projectId/:keyId/translations/:languageId/reject', { preHandler: [checkProjectAccess] }, async (request, reply) => {
        const { projectId, keyId, languageId } = request.params as { projectId: string, keyId: string, languageId: string };
        const { translations } = await import('../../schema');
        const { eq, and } = await import('drizzle-orm');
        
        // Ensure user is reviewer or admin
        if (!request.user?.isAdmin && !request.user?.isReviewer) {
            return reply.status(403).send({ error: 'Only admins or reviewers can reject translations' });
        }

        const [existing] = await fastify.db.select().from(translations).where(and(eq(translations.keyId, parseInt(keyId)), eq(translations.languageId, parseInt(languageId))));
        if (!existing || existing.reviewStatus !== 'PENDING_REVIEW') {
            return reply.status(400).send({ error: 'Translation is not pending review' });
        }

        const updated = await fastify.db.update(translations)
            .set({ draftValue: null, reviewStatus: 'REJECTED' })
            .where(eq(translations.id, existing.id))
            .returning();

        await service.logActivity(request.user.id, parseInt(projectId), 'TRANSLATION_REJECTED', JSON.stringify({ keyId, languageId }));

        if (existing.authorId && existing.authorId !== request.user.id) {
            const { users } = await import('../../../admin/users/schema');
            const { NotificationService } = await import('../../../../services/notification.service');
            const [author] = await fastify.db.select().from(users).where(eq(users.id, existing.authorId));
            if (author?.alertConfig) {
                const { translationKeys } = await import('../../schema');
                const [keyRecord] = await fastify.db.select().from(translationKeys).where(eq(translationKeys.id, parseInt(keyId)));
                await NotificationService.send(author.alertConfig, 'translation.rejected', {
                    title: 'Translation Rejected ❌',
                    message: `Your translation for key \`${keyRecord?.key}\` was rejected by ${request.user.username}. Please review it.`
                });
            }
        }

        return updated[0];
    });

    fastify.post('/:projectId/:keyId/approve', { preHandler: [checkProjectAccess] }, async (request, reply) => {
        const { projectId, keyId } = request.params as { projectId: string, keyId: string };
        const { translationKeys } = await import('../../schema');
        const { eq, and } = await import('drizzle-orm');
        
        // Ensure user is reviewer or admin
        if (!request.user?.isAdmin && !request.user?.isReviewer) {
            return reply.status(403).send({ error: 'Only admins or reviewers can approve key edits' });
        }

        const [existing] = await fastify.db.select().from(translationKeys).where(and(eq(translationKeys.id, parseInt(keyId)), eq(translationKeys.projectId, parseInt(projectId))));
        if (!existing || existing.reviewStatus !== 'PENDING_REVIEW') {
            return reply.status(400).send({ error: 'Key is not pending review' });
        }

        const newName = existing.draftKey || existing.key;
        if (newName !== existing.key) {
            const [conflict] = await fastify.db.select().from(translationKeys).where(and(eq(translationKeys.key, newName), eq(translationKeys.projectId, parseInt(projectId))));
            if (conflict) {
                return reply.status(400).send({ error: `A key with the name '${newName}' already exists. Please reject this review or delete the conflicting key first.` });
            }
        }

        const updated = await fastify.db.update(translationKeys)
            .set({ key: newName, draftKey: null, reviewStatus: 'APPROVED' })
            .where(eq(translationKeys.id, existing.id))
            .returning();
            
        await service.logActivity(request.user.id, parseInt(projectId), 'KEY_APPROVED', JSON.stringify({ keyId }));

        return updated[0];
    });

    fastify.post('/:projectId/:keyId/reject', { preHandler: [checkProjectAccess] }, async (request, reply) => {
        const { projectId, keyId } = request.params as { projectId: string, keyId: string };
        const { translationKeys } = await import('../../schema');
        const { eq, and } = await import('drizzle-orm');
        
        // Ensure user is reviewer or admin
        if (!request.user?.isAdmin && !request.user?.isReviewer) {
            return reply.status(403).send({ error: 'Only admins or reviewers can reject key edits' });
        }

        const [existing] = await fastify.db.select().from(translationKeys).where(and(eq(translationKeys.id, parseInt(keyId)), eq(translationKeys.projectId, parseInt(projectId))));
        if (!existing || existing.reviewStatus !== 'PENDING_REVIEW') {
            return reply.status(400).send({ error: 'Key is not pending review' });
        }

        const updated = await fastify.db.update(translationKeys)
            .set({ draftKey: null, reviewStatus: 'REJECTED' })
            .where(eq(translationKeys.id, existing.id))
            .returning();

        await service.logActivity(request.user.id, parseInt(projectId), 'KEY_REJECTED', JSON.stringify({ keyId }));

        return updated[0];
    });

    fastify.post('/:projectId/bulk-delete', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId } = request.params as { projectId: string };
        const { keyIds } = request.body as { keyIds: number[] };
        const result = await service.bulkDeleteKeys(parseInt(projectId), keyIds);
        if (request.user) {
            await service.logActivity(request.user.id, parseInt(projectId), 'KEY_DELETED', JSON.stringify({ count: keyIds.length }));
        }
        return result;
    });

    fastify.post('/:projectId/:keyId/labels', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId, keyId } = request.params as { projectId: string, keyId: string };
        const { labelId } = request.body as { labelId: number };
        const result = await service.addLabelToKey(parseInt(projectId), parseInt(keyId), labelId);
        if (request.user) {
            await service.logActivity(request.user.id, parseInt(projectId), 'LABEL_ASSIGNED', JSON.stringify({ keyId, labelId }));
        }
        return result;
    });

    fastify.post('/:projectId/bulk-labels-add', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId } = request.params as { projectId: string };
        const { keyIds, labelId } = request.body as { keyIds: number[], labelId: number };
        const result = await service.bulkAddLabelToKeys(parseInt(projectId), keyIds, labelId);
        if (request.user) {
            await service.logActivity(request.user.id, parseInt(projectId), 'LABEL_ASSIGNED', JSON.stringify({ count: keyIds.length, labelId }));
        }
        return result;
    });

    fastify.delete('/:projectId/:keyId/labels/:labelId', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId, keyId, labelId } = request.params as { projectId: string, keyId: string, labelId: string };
        const result = await service.removeLabelFromKey(parseInt(projectId), parseInt(keyId), parseInt(labelId));
        if (request.user) {
            await service.logActivity(request.user.id, parseInt(projectId), 'LABEL_REMOVED', JSON.stringify({ keyId, labelId }));
        }
        return result;
    });

    fastify.post('/:projectId/bulk-labels-remove', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId } = request.params as { projectId: string };
        const { keyIds, labelId } = request.body as { keyIds: number[], labelId: number };
        const result = await service.bulkRemoveLabelFromKeys(parseInt(projectId), keyIds, labelId);
        if (request.user) {
            await service.logActivity(request.user.id, parseInt(projectId), 'LABEL_REMOVED', JSON.stringify({ count: keyIds.length, labelId }));
        }
        return result;
    });

    fastify.post('/:projectId/:keyId/auto-translate', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId, keyId } = request.params as { projectId: string; keyId: string };
        const { targetLanguageIds, provider } = request.body as { targetLanguageIds: number[], provider?: 'deepl' | 'google' };

        await service.autoTranslate(parseInt(projectId), parseInt(keyId), targetLanguageIds, provider || 'google', request.user?.id);
        if (request.user) {
            await service.logActivity(request.user.id, parseInt(projectId), 'AUTO_TRANSLATED', JSON.stringify({ keyId, count: targetLanguageIds.length }));
        }
        return { success: true };
    });

    fastify.post('/:projectId/:keyId/suggest', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId, keyId } = request.params as { projectId: string; keyId: string };
        const { targetLanguageId, provider } = request.body as { targetLanguageId: number, provider?: 'deepl' | 'google' };

        return service.suggestTranslation(parseInt(projectId), parseInt(keyId), targetLanguageId, provider || 'google', request.user?.id);
    });
}
