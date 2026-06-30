import { FastifyInstance } from 'fastify';
import { ProjectService } from '../services/project.service';

export default async function projectRoutes(fastify: FastifyInstance) {
    const service = new ProjectService(fastify.db);
    const { checkProjectAccess, requireAdmin } = fastify.authHooks;

    const logActivity = async (userId: number, projectId: number | null, action: string, details: string) => {
        if (!projectId) return;
        const { activityLogs } = await import('../../schema');
        await fastify.db.insert(activityLogs).values({ userId, projectId, action, details }).execute();
    };

    fastify.get('/', async (request) => {
        return service.getAll(request.user!);
    });

    fastify.get('/dashboard', async (request) => {
        return service.getDashboardStats(request.user!);
    });

    fastify.post('/', { preHandler: [requireAdmin] }, async (request, reply) => {
        const body = request.body as { name: string; sourceLanguageId?: number };
        const result = await service.create(body);
        const newProject = result[0];
        
        if (request.user && newProject) {
            await logActivity(request.user.id, newProject.id, 'PROJECT_CREATED', JSON.stringify({ name: body.name }));
        }
        
        reply.status(201).send(newProject);
    });

    fastify.patch('/:projectId', { preHandler: [requireAdmin] }, async (request) => {
        const { projectId } = request.params as { projectId: string };
        const body = request.body as { name?: string; sourceLanguageId?: number; reviewEnabled?: boolean; requireTemplate?: boolean; inContextUrl?: string | null };
        const result = await service.update(parseInt(projectId), body);
        if (request.user) await logActivity(request.user.id, parseInt(projectId), 'PROJECT_UPDATED', JSON.stringify(body));
        return result;
    });

    fastify.delete('/:projectId', { preHandler: [requireAdmin] }, async (request) => {
        const { projectId } = request.params as { projectId: string };
        const result = await service.delete(parseInt(projectId));
        if (request.user) await logActivity(request.user.id, parseInt(projectId), 'PROJECT_DELETED', JSON.stringify({ projectId }));
        return result;
    });

    fastify.post('/:projectId/languages', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId } = request.params as { projectId: string };
        const body = request.body as { languageId?: number; code?: string; name?: string; flag?: string };
        
        let languageId = body.languageId;
        if (!languageId && body.code && body.name) {
            const { LanguageService } = await import('../../languages/services/language.service');
            const langService = new LanguageService(fastify.db);
            const [newLang] = await langService.create({
                code: body.code,
                name: body.name,
                flag: body.flag
            });
            languageId = newLang.id;
        }

        if (!languageId) {
            throw new Error('languageId or code and name are required');
        }

        const result = await service.addLanguage(parseInt(projectId), languageId);
        
        if (request.user) {
            await logActivity(request.user.id, parseInt(projectId), 'LANGUAGE_ADDED', JSON.stringify({ languageId }));
        }
        
        return result;
    });

    fastify.patch('/:projectId/languages/:languageId', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId, languageId } = request.params as { projectId: string, languageId: string };
        const body = request.body as { code?: string; name?: string; flag?: string };
        const { LanguageService } = await import('../../languages/services/language.service');
        const langService = new LanguageService(fastify.db);
        return langService.update(parseInt(languageId), body);
    });

    fastify.get('/:projectId/languages', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId } = request.params as { projectId: string };
        return service.getProjectLanguages(parseInt(projectId));
    });

    fastify.delete('/:projectId/languages/:languageId', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId, languageId } = request.params as { projectId: string, languageId: string };
        const result = await service.removeLanguage(parseInt(projectId), parseInt(languageId));
        if (request.user) await logActivity(request.user.id, parseInt(projectId), 'LANGUAGE_REMOVED', JSON.stringify({ languageId }));
        return result;
    });

    fastify.post('/:projectId/languages/bulk-delete', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId } = request.params as { projectId: string };
        const { languageIds } = request.body as { languageIds: number[] };
        const result = await service.bulkRemoveLanguages(parseInt(projectId), languageIds);
        if (request.user) await logActivity(request.user.id, parseInt(projectId), 'LANGUAGE_REMOVED', JSON.stringify({ count: languageIds.length }));
        return result;
    });

    fastify.put('/:projectId/source-language', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId } = request.params as { projectId: string };
        const { languageId } = request.body as { languageId: number };
        return service.setSourceLanguage(parseInt(projectId), languageId);
    });

    fastify.get('/:projectId/languages/:languageId/export', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId, languageId } = request.params as { projectId: string, languageId: string };
        return service.exportTranslations(parseInt(projectId), parseInt(languageId));
    });

    fastify.get('/:projectId/translations/:langCode', { preHandler: [checkProjectAccess] }, async (request, reply) => {
        const { projectId, langCode } = request.params as { projectId: string, langCode: string };
        return service.exportTranslationsByCode(parseInt(projectId), langCode);
    });

    fastify.post('/:projectId/languages/:languageId/import', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId, languageId } = request.params as { projectId: string, languageId: string };
        const body = request.body as { data: Record<string, string>, importAsPending?: boolean } | Record<string, string>;
        
        // Handle backwards compatibility where body is just the data object
        const isLegacyFormat = !('data' in body) || typeof body.data !== 'object';
        const data = isLegacyFormat ? body as Record<string, string> : (body as { data: Record<string, string> }).data;
        const importAsPending = isLegacyFormat ? false : (body as { importAsPending?: boolean }).importAsPending ?? false;

        const result = await service.importTranslations(parseInt(projectId), parseInt(languageId), data, importAsPending);
        if (request.user) await logActivity(request.user.id, parseInt(projectId), 'TRANSLATIONS_IMPORTED', JSON.stringify({ languageId, count: Object.keys(data).length }));
        return result;
    });

    // --- Key Templates ---
    fastify.get('/:projectId/templates', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId } = request.params as { projectId: string };
        return service.getTemplates(parseInt(projectId));
    });

    fastify.post('/:projectId/templates', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId } = request.params as { projectId: string };
        const body = request.body as { name: string, segments: string };
        const result = await service.createTemplate(parseInt(projectId), body);
        if (request.user) await logActivity(request.user.id, parseInt(projectId), 'TEMPLATE_CREATED', JSON.stringify({ name: body.name }));
        return result;
    });

    fastify.patch('/:projectId/templates/:templateId', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId, templateId } = request.params as { projectId: string, templateId: string };
        const body = request.body as { name?: string, segments?: string };
        const result = await service.updateTemplate(parseInt(templateId), body);
        if (request.user) await logActivity(request.user.id, parseInt(projectId), 'TEMPLATE_UPDATED', JSON.stringify({ templateId }));
        return result;
    });

    fastify.delete('/:projectId/templates/:templateId', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId, templateId } = request.params as { projectId: string, templateId: string };
        const result = await service.deleteTemplate(parseInt(templateId));
        if (request.user) await logActivity(request.user.id, parseInt(projectId), 'TEMPLATE_DELETED', JSON.stringify({ templateId }));
        return result;
    });

    // --- Key Glossary ---
    fastify.get('/:projectId/glossary', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId } = request.params as { projectId: string };
        return service.getGlossary(parseInt(projectId));
    });

    fastify.post('/:projectId/glossary', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId } = request.params as { projectId: string };
        const body = request.body as { badWord: string, goodWord: string };
        const result = await service.createGlossaryTerm(parseInt(projectId), body);
        if (request.user) await logActivity(request.user.id, parseInt(projectId), 'GLOSSARY_TERM_CREATED', JSON.stringify({ badWord: body.badWord }));
        return result;
    });

    fastify.patch('/:projectId/glossary/:glossaryId', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId, glossaryId } = request.params as { projectId: string, glossaryId: string };
        const body = request.body as { badWord?: string, goodWord?: string };
        const result = await service.updateGlossaryTerm(parseInt(glossaryId), body);
        if (request.user) await logActivity(request.user.id, parseInt(projectId), 'GLOSSARY_TERM_UPDATED', JSON.stringify({ glossaryId }));
        return result;
    });

    fastify.delete('/:projectId/glossary/:glossaryId', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId, glossaryId } = request.params as { projectId: string, glossaryId: string };
        const result = await service.deleteGlossaryTerm(parseInt(glossaryId));
        if (request.user) await logActivity(request.user.id, parseInt(projectId), 'GLOSSARY_TERM_DELETED', JSON.stringify({ glossaryId }));
        return result;
    });

    // --- Key Variables ---
    fastify.get('/:projectId/variables', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId } = request.params as { projectId: string };
        return service.getVariables(parseInt(projectId));
    });

    fastify.post('/:projectId/variables', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId } = request.params as { projectId: string };
        const body = request.body as { name: string, options: string };
        const result = await service.createVariable(parseInt(projectId), body);
        if (request.user) await logActivity(request.user.id, parseInt(projectId), 'VARIABLE_CREATED', JSON.stringify({ name: body.name }));
        return result;
    });

    fastify.patch('/:projectId/variables/:variableId', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId, variableId } = request.params as { projectId: string, variableId: string };
        const body = request.body as { name?: string, options?: string };
        const result = await service.updateVariable(parseInt(variableId), body);
        if (request.user) await logActivity(request.user.id, parseInt(projectId), 'VARIABLE_UPDATED', JSON.stringify({ variableId }));
        return result;
    });

    fastify.delete('/:projectId/variables/:variableId', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId, variableId } = request.params as { projectId: string, variableId: string };
        const result = await service.deleteVariable(parseInt(variableId));
        if (request.user) await logActivity(request.user.id, parseInt(projectId), 'VARIABLE_DELETED', JSON.stringify({ variableId }));
        return result;
    });

    // --- Conventions Import/Export ---
    fastify.get('/:projectId/conventions/export', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId } = request.params as { projectId: string };
        return service.exportConventions(parseInt(projectId));
    });

    fastify.post('/:projectId/conventions/import', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId } = request.params as { projectId: string };
        const body = request.body as { templates?: any[], glossary?: any[], variables?: any[] };
        const result = await service.importConventions(parseInt(projectId), body);
        if (request.user) await logActivity(request.user.id, parseInt(projectId), 'CONVENTIONS_IMPORTED', JSON.stringify({}));
        return result;
    });

    // --- Traduora Sync ---
    async function getTraduoraConfig(projectId: string) {
        const { env } = await import('../../../../config/env');
        const { settings } = await import('../../../settings/schema');
        const { eq } = await import('drizzle-orm');
        const { decryptString } = await import('../../../../utils/encryption');

        const urlKey = `traduora_url_project_${projectId}`;
        const clientIdKey = `traduora_client_id_project_${projectId}`;
        const clientSecretKey = `traduora_client_secret_project_${projectId}`;
        const projectMapKey = `traduora_project_id_project_${projectId}`;

        const [urlRow] = await fastify.db.select().from(settings).where(eq(settings.key, urlKey));
        const [clientIdRow] = await fastify.db.select().from(settings).where(eq(settings.key, clientIdKey));
        const [clientSecretRow] = await fastify.db.select().from(settings).where(eq(settings.key, clientSecretKey));
        const [projectMapRow] = await fastify.db.select().from(settings).where(eq(settings.key, projectMapKey));

        const traduoraUrl = (urlRow && urlRow.value) ? urlRow.value : env.TRADUORA_URL || null;
        const traduoraClientId = (clientIdRow && clientIdRow.value) ? clientIdRow.value : env.TRADUORA_CLIENT_ID || null;
        
        let traduoraClientSecret = env.TRADUORA_CLIENT_SECRET || null;
        if (clientSecretRow && clientSecretRow.value) {
            try {
                traduoraClientSecret = decryptString(clientSecretRow.value);
            } catch {
                traduoraClientSecret = clientSecretRow.value;
            }
        }

        const traduoraProjectId = (projectMapRow && projectMapRow.value) ? projectMapRow.value : env.TRADUORA_PROJECT_ID || null;

        const configured = !!(traduoraUrl && traduoraClientId && traduoraClientSecret);

        return {
            configured,
            traduoraUrl,
            traduoraClientId,
            traduoraClientSecret,
            traduoraProjectId
        };
    }

    fastify.get('/:projectId/sync/traduora-status', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId } = request.params as { projectId: string };
        const { settings } = await import('../../../settings/schema');
        const { eq } = await import('drizzle-orm');

        const config = await getTraduoraConfig(projectId);
        
        const lastSyncKey = `traduora_last_sync_project_${projectId}`;
        const [lastSyncRow] = await fastify.db.select().from(settings).where(eq(settings.key, lastSyncKey));
        const lastSyncedAt = lastSyncRow ? lastSyncRow.value : null;

        return {
            configured: config.configured,
            lastSyncedAt,
            traduoraUrl: config.configured ? config.traduoraUrl : undefined,
            traduoraProjectId: config.traduoraProjectId
        };
    });

    fastify.get('/:projectId/sync/traduora-config', { preHandler: [requireAdmin] }, async (request) => {
        const { projectId } = request.params as { projectId: string };
        const { settings } = await import('../../../settings/schema');
        const { eq } = await import('drizzle-orm');

        const urlKey = `traduora_url_project_${projectId}`;
        const clientIdKey = `traduora_client_id_project_${projectId}`;
        const clientSecretKey = `traduora_client_secret_project_${projectId}`;
        const projectMapKey = `traduora_project_id_project_${projectId}`;

        const [urlRow] = await fastify.db.select().from(settings).where(eq(settings.key, urlKey));
        const [clientIdRow] = await fastify.db.select().from(settings).where(eq(settings.key, clientIdKey));
        const [clientSecretRow] = await fastify.db.select().from(settings).where(eq(settings.key, clientSecretKey));
        const [projectMapRow] = await fastify.db.select().from(settings).where(eq(settings.key, projectMapKey));

        return {
            traduoraUrl: urlRow ? urlRow.value : '',
            traduoraClientId: clientIdRow ? clientIdRow.value : '',
            hasClientSecret: !!(clientSecretRow && clientSecretRow.value),
            traduoraProjectId: projectMapRow ? projectMapRow.value : ''
        };
    });

    fastify.post('/:projectId/sync/traduora-config', { preHandler: [requireAdmin] }, async (request, reply) => {
        const { projectId } = request.params as { projectId: string };
        const body = request.body as { traduoraUrl?: string | null; traduoraClientId?: string | null; traduoraClientSecret?: string | null; traduoraProjectId?: string | null };
        const { sql, eq } = await import('drizzle-orm');
        const { encryptString } = await import('../../../../utils/encryption');
        const { settings } = await import('../../../settings/schema');

        const urlKey = `traduora_url_project_${projectId}`;
        const clientIdKey = `traduora_client_id_project_${projectId}`;
        const clientSecretKey = `traduora_client_secret_project_${projectId}`;
        const projectMapKey = `traduora_project_id_project_${projectId}`;

        // Get existing config to fallback and resolve complete set of values
        const config = await getTraduoraConfig(projectId);
        const finalUrl = body.traduoraUrl !== undefined ? body.traduoraUrl : config.traduoraUrl;
        const finalClientId = body.traduoraClientId !== undefined ? body.traduoraClientId : config.traduoraClientId;
        const finalClientSecret = (body.traduoraClientSecret !== undefined && body.traduoraClientSecret !== null && body.traduoraClientSecret !== '') ? body.traduoraClientSecret : config.traduoraClientSecret;
        const finalProjectId = body.traduoraProjectId !== undefined ? body.traduoraProjectId : config.traduoraProjectId;

        // Ensure all fields are provided for saving
        if (!finalUrl || !finalClientId || !finalClientSecret || !finalProjectId) {
            reply.status(400).send({ message: 'All Traduora configuration fields (Server URL, Client ID, Client Secret, and Project ID) must be filled out.' });
            return;
        }

        // 1. Validate connection and credentials by requesting an auth token
        let accessToken = '';
        try {
            const authUrl = `${finalUrl.replace(/\/$/, '')}/api/v1/auth/token`;
            const authRes = await fetch(authUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    grant_type: 'client_credentials',
                    client_id: finalClientId,
                    client_secret: finalClientSecret
                }),
                signal: AbortSignal.timeout(5000)
            });

            if (!authRes.ok) {
                const errorText = await authRes.text();
                throw new Error(`Authentication failed (status ${authRes.status}): ${errorText}`);
            }

            const authData = await authRes.json() as { access_token: string };
            accessToken = authData.access_token;
        } catch (err: any) {
            reply.status(400).send({ message: `Traduora validation failed: Unable to authenticate. Please check Server URL, Client ID, and Client Secret. Details: ${err.message}` });
            return;
        }

        // 2. Validate that the Traduora Project ID exists and is accessible.
        // Note: Project-scoped API keys do not have permission for the global project fetch route
        // (/api/v1/projects/:id), but they are fully authorized to fetch project stats (/api/v1/projects/:id/stats)
        // which serves as an excellent, query-parameter-free, lightweight validation endpoint.
        try {
            const projectUrl = `${finalUrl.replace(/\/$/, '')}/api/v1/projects/${finalProjectId}/stats`;
            const projectRes = await fetch(projectUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                },
                signal: AbortSignal.timeout(5000)
            });

            if (!projectRes.ok) {
                const errorText = await projectRes.text();
                throw new Error(`Project validation check failed (status ${projectRes.status}): ${errorText}`);
            }
        } catch (err: any) {
            reply.status(400).send({ message: `Traduora validation failed: The project ID "${finalProjectId}" was not found or is inaccessible on this Traduora instance. Details: ${err.message}` });
            return;
        }

        // If validation succeeds, save the values
        if (body.traduoraUrl) {
            await fastify.db.run(sql`INSERT INTO settings (key, value) VALUES (${urlKey}, ${body.traduoraUrl}) ON CONFLICT(key) DO UPDATE SET value=excluded.value`);
        } else if (body.traduoraUrl === '') {
            await fastify.db.delete(settings).where(eq(settings.key, urlKey));
        }

        if (body.traduoraClientId) {
            await fastify.db.run(sql`INSERT INTO settings (key, value) VALUES (${clientIdKey}, ${body.traduoraClientId}) ON CONFLICT(key) DO UPDATE SET value=excluded.value`);
        } else if (body.traduoraClientId === '') {
            await fastify.db.delete(settings).where(eq(settings.key, clientIdKey));
        }

        if (body.traduoraClientSecret) {
            const encryptedSecret = encryptString(body.traduoraClientSecret);
            await fastify.db.run(sql`INSERT INTO settings (key, value) VALUES (${clientSecretKey}, ${encryptedSecret}) ON CONFLICT(key) DO UPDATE SET value=excluded.value`);
        } else if (body.traduoraClientSecret === '') {
            await fastify.db.delete(settings).where(eq(settings.key, clientSecretKey));
        }

        if (body.traduoraProjectId) {
            await fastify.db.run(sql`INSERT INTO settings (key, value) VALUES (${projectMapKey}, ${body.traduoraProjectId}) ON CONFLICT(key) DO UPDATE SET value=excluded.value`);
        } else if (body.traduoraProjectId === '') {
            await fastify.db.delete(settings).where(eq(settings.key, projectMapKey));
        }

        return { success: true };
    });

    fastify.get('/:projectId/sync/traduora-projects', { preHandler: [checkProjectAccess] }, async (request, reply) => {
        const { projectId } = request.params as { projectId: string };
        const config = await getTraduoraConfig(projectId);
        if (!config.configured) {
            reply.status(400).send({ message: 'Traduora is not configured on the backend.' });
            return;
        }

        // 1. Authenticate with Traduora
        let accessToken = '';
        try {
            const authUrl = `${config.traduoraUrl!.replace(/\/$/, '')}/api/v1/auth/token`;
            const authRes = await fetch(authUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    grant_type: 'client_credentials',
                    client_id: config.traduoraClientId,
                    client_secret: config.traduoraClientSecret
                })
            });

            if (!authRes.ok) {
                throw new Error(`Auth failed status ${authRes.status}`);
            }

            const authData = await authRes.json() as { access_token: string };
            accessToken = authData.access_token;
        } catch (err: any) {
            reply.status(500).send({ message: `Failed to authenticate with Traduora: ${err.message}` });
            return;
        }

        // 2. Fetch projects from Traduora
        try {
            const projectsUrl = `${config.traduoraUrl!.replace(/\/$/, '')}/api/v1/projects`;
            const projectsRes = await fetch(projectsUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (!projectsRes.ok) {
                throw new Error(`Fetch projects failed with status ${projectsRes.status}`);
            }

            const data = await projectsRes.json();
            const rawProjects = Array.isArray(data) ? data : (data && Array.isArray(data.projects) ? data.projects : []);
            
            const projectsList = rawProjects.map((p: any) => ({
                id: p.id || p.projectId,
                name: p.name || p.projectName || p.id
            }));

            return projectsList;
        } catch (err: any) {
            reply.status(500).send({ message: `Failed to fetch Traduora projects: ${err.message}` });
        }
    });

    fastify.post('/:projectId/sync/traduora-project', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId } = request.params as { projectId: string };
        const body = request.body as { traduoraProjectId: string | null };
        const { sql } = await import('drizzle-orm');

        const key = `traduora_project_id_project_${projectId}`;
        if (body.traduoraProjectId) {
            await fastify.db.run(sql`INSERT INTO settings (key, value) VALUES (${key}, ${body.traduoraProjectId}) ON CONFLICT(key) DO UPDATE SET value=excluded.value`);
        } else {
            const { settings } = await import('../../../settings/schema');
            const { eq } = await import('drizzle-orm');
            await fastify.db.delete(settings).where(eq(settings.key, key));
        }

        return { success: true };
    });

    fastify.post('/:projectId/sync/traduora', { preHandler: [checkProjectAccess] }, async (request, reply) => {
        const { projectId } = request.params as { projectId: string };
        const { settings } = await import('../../../settings/schema');
        const { sql } = await import('drizzle-orm');

        const config = await getTraduoraConfig(projectId);
        if (!config.configured) {
            reply.status(400).send({ message: 'Traduora is not configured on the backend. Please check configuration.' });
            return;
        }

        if (!config.traduoraProjectId) {
            reply.status(400).send({ message: 'No Traduora project associated with this Glide project. Please configure a Traduora Project ID.' });
            return;
        }

        // 1. Authenticate with Traduora
        let accessToken = '';
        try {
            const authUrl = `${config.traduoraUrl!.replace(/\/$/, '')}/api/v1/auth/token`;
            const authRes = await fetch(authUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    grant_type: 'client_credentials',
                    client_id: config.traduoraClientId,
                    client_secret: config.traduoraClientSecret
                })
            });

            if (!authRes.ok) {
                const errorText = await authRes.text();
                throw new Error(`Auth failed with status ${authRes.status}: ${errorText}`);
            }

            const authData = await authRes.json() as { access_token: string };
            accessToken = authData.access_token;
        } catch (err: any) {
            reply.status(500).send({ message: `Failed to authenticate with Traduora: ${err.message}` });
            return;
        }

        // 2. Fetch project languages and translations
        const projectLangs = await service.getProjectLanguages(parseInt(projectId));
        const syncedLocales: string[] = [];
        const errors: string[] = [];

        for (const lang of projectLangs) {
            try {
                const translationsData = await service.exportTranslations(parseInt(projectId), lang.id);
                const localeCode = lang.code;

                // Create formData with file and fields
                // Note: Traduora API's format enum expects 'jsonflat' rather than 'flat_json'
                const formData = new FormData();
                const jsonContent = JSON.stringify(translationsData);
                const blob = new Blob([jsonContent], { type: 'application/json' });
                formData.append('file', blob, `translations_${localeCode}.json`);
                formData.append('locale', localeCode);
                formData.append('format', 'jsonflat');

                const importUrl = `${config.traduoraUrl!.replace(/\/$/, '')}/api/v1/projects/${config.traduoraProjectId}/imports?locale=${localeCode}&format=jsonflat`;
                const importRes = await fetch(importUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: formData
                });

                if (!importRes.ok) {
                    const errorText = await importRes.text();
                    throw new Error(`Failed to import locale ${localeCode} (status ${importRes.status}): ${errorText}`);
                }

                syncedLocales.push(localeCode);
            } catch (err: any) {
                errors.push(err.message || String(err));
            }
        }

        if (syncedLocales.length === 0 && projectLangs.length > 0) {
            reply.status(500).send({ message: `Sync failed for all locales: ${errors.join('; ')}` });
            return;
        }

        // 3. Save last synced timestamp
        const lastSyncKey = `traduora_last_sync_project_${projectId}`;
        const nowStr = new Date().toISOString();
        await fastify.db.run(sql`INSERT INTO settings (key, value) VALUES (${lastSyncKey}, ${nowStr}) ON CONFLICT(key) DO UPDATE SET value=excluded.value`);

        if (request.user) {
            await logActivity(request.user.id, parseInt(projectId), 'TRADUORA_SYNCED', JSON.stringify({ syncedLocales, errors, targetProjectId: config.traduoraProjectId }));
        }

        return {
            success: true,
            syncedLocales,
            errors: errors.length > 0 ? errors : undefined
        };
    });
}

