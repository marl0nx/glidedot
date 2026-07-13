import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import AdmZip from 'adm-zip';
import { sql } from 'drizzle-orm';
import { S3BackupService } from './s3-backup.service';

import {
    projects, languages, projectLanguages, labels,
    translationKeys, translations, keysToLabels, activityLogs,
    keyTemplates, keyGlossary, keyVariables
} from '../../localization/schema';

type Db = FastifyInstance['db'];

// Helper function to insert in chunks to avoid SQLite 'too many SQL variables' error
async function insertInChunks<T extends Parameters<Db['insert']>[0]>(db: Db, table: T, data: (T extends { $inferInsert: infer I } ? I : never)[], chunkSize: number = 500) {
    for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        await db.insert(table).values(chunk);
    }
}

const migrationModule: FastifyPluginAsync = async (fastify, _opts) => {
    fastify.get('/backup', async (request, reply) => {
        try {
            const allProjects = await fastify.db.select().from(projects);
            const allLanguages = await fastify.db.select().from(languages);
            const allProjectLanguages = await fastify.db.select().from(projectLanguages);
            const allLabels = await fastify.db.select().from(labels);
            const allTranslationKeys = await fastify.db.select().from(translationKeys);
            const allTranslations = await fastify.db.select().from(translations);
            const allKeysToLabels = await fastify.db.select().from(keysToLabels);
            const allActivityLogs = await fastify.db.select().from(activityLogs);
            const allKeyTemplates = await fastify.db.select().from(keyTemplates);
            const allKeyGlossary = await fastify.db.select().from(keyGlossary);
            const allKeyVariables = await fastify.db.select().from(keyVariables);

            const backupData = {
                projects: allProjects,
                languages: allLanguages,
                projectLanguages: allProjectLanguages,
                labels: allLabels,
                translationKeys: allTranslationKeys,
                translations: allTranslations,
                keysToLabels: allKeysToLabels,
                activityLogs: allActivityLogs,
                keyTemplates: allKeyTemplates,
                keyGlossary: allKeyGlossary,
                keyVariables: allKeyVariables,
            };

            const zip = new AdmZip();
            zip.addFile("backup.json", Buffer.from(JSON.stringify(backupData, null, 2), "utf8"));
            
            const zipBuffer = zip.toBuffer();

            reply.header('Content-Type', 'application/zip');
            reply.header('Content-Disposition', 'attachment; filename=glide-backup.zip');
            return zipBuffer;
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({ error: 'Failed to generate backup' });
        }
    });

    fastify.post('/backup', async (request, reply) => {
        try {
            const data = await request.file();
            if (!data) {
                return reply.status(400).send({ error: 'No file uploaded' });
            }

            const buffer = await data.toBuffer();
            const zip = new AdmZip(buffer);
            const zipEntries = zip.getEntries();
            
            const backupEntry = zipEntries.find((entry) => entry.entryName === 'backup.json');
            if (!backupEntry) {
                return reply.status(400).send({ error: 'Invalid backup file: backup.json not found' });
            }

            const backupDataStr = backupEntry.getData().toString('utf8');
            const backupData = JSON.parse(backupDataStr);

            const restoreProjectsField = data.fields?.restoreProjects;
            const restoreProjects = restoreProjectsField && !Array.isArray(restoreProjectsField) && restoreProjectsField.type === 'field'
                ? restoreProjectsField.value === 'true'
                : true;

            const restoreConventionsField = data.fields?.restoreConventions;
            const restoreConventions = restoreConventionsField && !Array.isArray(restoreConventionsField) && restoreConventionsField.type === 'field'
                ? restoreConventionsField.value === 'true'
                : true;

            // Import data
            // Batched into a single real transaction via raw BEGIN/COMMIT/ROLLBACK: db.transaction()
            // wraps bun:sqlite's *synchronous* native transaction() internally, so an async callback
            // (like this one, full of awaited deletes/inserts) suspends at its first `await` and the
            // native wrapper commits immediately - every statement after that first await then runs
            // auto-committed and un-rollback-able. That's especially dangerous here: if a later insert
            // failed, the earlier deletes would already be permanently committed, leaving the database
            // half-wiped instead of rolled back.
            await fastify.db.run(sql.raw('BEGIN'));
            try {
                if (restoreProjects) {
                    // Delete project data safely (child tables first)
                    await fastify.db.delete(keysToLabels);
                    await fastify.db.delete(translations);
                    await fastify.db.delete(translationKeys);
                    await fastify.db.delete(labels);
                    await fastify.db.delete(projectLanguages);
                    await fastify.db.delete(activityLogs);
                    await fastify.db.delete(projects);
                    await fastify.db.delete(languages);
                }

                if (restoreConventions) {
                    await fastify.db.delete(keyTemplates);
                    await fastify.db.delete(keyGlossary);
                    await fastify.db.delete(keyVariables);
                }

                // Re-insert
                if (restoreProjects) {
                    if (backupData.languages && backupData.languages.length > 0) {
                        await insertInChunks(fastify.db, languages, backupData.languages);
                    }
                    if (backupData.projects && backupData.projects.length > 0) {
                        await insertInChunks(fastify.db, projects, backupData.projects);
                    }
                    if (backupData.projectLanguages && backupData.projectLanguages.length > 0) {
                        await insertInChunks(fastify.db, projectLanguages, backupData.projectLanguages);
                    }
                    if (backupData.labels && backupData.labels.length > 0) {
                        await insertInChunks(fastify.db, labels, backupData.labels);
                    }
                    if (backupData.translationKeys && backupData.translationKeys.length > 0) {
                        await insertInChunks(fastify.db, translationKeys, backupData.translationKeys);
                    }
                    if (backupData.translations && backupData.translations.length > 0) {
                        await insertInChunks(fastify.db, translations, backupData.translations);
                    }
                    if (backupData.keysToLabels && backupData.keysToLabels.length > 0) {
                        await insertInChunks(fastify.db, keysToLabels, backupData.keysToLabels);
                    }
                    if (backupData.activityLogs && backupData.activityLogs.length > 0) {
                        await insertInChunks(fastify.db, activityLogs, backupData.activityLogs);
                    }
                }

                if (restoreConventions) {
                    if (backupData.keyTemplates && backupData.keyTemplates.length > 0) {
                        await insertInChunks(fastify.db, keyTemplates, backupData.keyTemplates);
                    }
                    if (backupData.keyGlossary && backupData.keyGlossary.length > 0) {
                        await insertInChunks(fastify.db, keyGlossary, backupData.keyGlossary);
                    }
                    if (backupData.keyVariables && backupData.keyVariables.length > 0) {
                        await insertInChunks(fastify.db, keyVariables, backupData.keyVariables);
                    }
                }

                await fastify.db.run(sql.raw('COMMIT'));
            } catch (err) {
                await fastify.db.run(sql.raw('ROLLBACK'));
                throw err;
            }

            return reply.send({ success: true, message: 'Backup restored successfully' });
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({ error: 'Failed to restore backup' });
        }
    });

    fastify.post('/s3-backup/trigger', async (request, reply) => {
        try {
            const s3BackupService = new S3BackupService(fastify.db);
            await s3BackupService.performBackup();
            return reply.send({ success: true, message: 'S3 Backup triggered successfully' });
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({ error: 'Failed to trigger S3 backup' });
        }
    });
};

export default migrationModule;
