import { FastifyInstance } from 'fastify';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import AdmZip from 'adm-zip';
import { Cron } from 'croner';
import { env } from '../../../config/env';
import { 
    projects, languages, projectLanguages, labels, 
    translationKeys, translations, keysToLabels,
    activityLogs, keyTemplates, keyGlossary, keyVariables
} from '../../localization/schema';
import { settings } from '../schema';

export class S3BackupService {
    private s3: S3Client | null = null;
    private job: Cron | null = null;

    constructor(private db: FastifyInstance['db']) {
        if (env.S3_ENDPOINT && env.S3_BUCKET && env.S3_ACCESS_KEY && env.S3_SECRET_KEY) {
            this.s3 = new S3Client({
                region: env.S3_REGION,
                endpoint: env.S3_ENDPOINT,
                credentials: {
                    accessKeyId: env.S3_ACCESS_KEY,
                    secretAccessKey: env.S3_SECRET_KEY
                },
                forcePathStyle: true // Needed for MinIO and some other S3-compatible storage
            });
        }
    }

    async init() {
        if (!this.s3) return;

        // Load settings to check if enabled and schedule
        await this.syncSchedule();

        // Listen for setting updates (we can poll every minute, or just restart the server to apply cron changes)
        // A simple polling mechanism to check if settings changed
        setInterval(() => this.syncSchedule(), 60000);
    }

    private async syncSchedule() {
        try {
            const allSettings = await this.db.select().from(settings);
            const settingsObj: Record<string, string> = {};
            for (const row of allSettings) {
                settingsObj[row.key] = row.value;
            }

            const isEnabled = settingsObj['s3BackupEnabled'] === 'true';
            const frequency = settingsObj['s3BackupFrequency'] || 'weekly';

            if (!isEnabled) {
                if (this.job) {
                    this.job.stop();
                    this.job = null;
                }
                return;
            }

            // Map frequency to cron expression
            let cronExpr = '0 0 * * 0'; // weekly (Sunday at midnight)
            if (frequency === 'daily') cronExpr = '0 0 * * *';
            else if (frequency === 'monthly') cronExpr = '0 0 1 * *';

            // Check if job needs updating
            if (this.job) {
                const currentPattern = this.job.getPattern();
                if (currentPattern === cronExpr) return; // No change
                this.job.stop();
            }

            const lastBackupAtStr = settingsObj['s3LastBackupAt'];
            const lastBackupAt = lastBackupAtStr ? new Date(lastBackupAtStr).getTime() : 0;
            const now = Date.now();
            
            let shouldCatchUp = false;
            if (lastBackupAt > 0) {
                const diffDays = (now - lastBackupAt) / (1000 * 60 * 60 * 24);
                if (frequency === 'daily' && diffDays >= 1) shouldCatchUp = true;
                if (frequency === 'weekly' && diffDays >= 7) shouldCatchUp = true;
                if (frequency === 'monthly' && diffDays >= 30) shouldCatchUp = true;
            } else {
                // If never backed up and scheduled, do it now
                shouldCatchUp = true;
            }

            if (shouldCatchUp) {
                console.log('Catching up missed S3 Backup or performing initial scheduled backup...');
                this.performBackup(true).catch(err => console.error('Failed catchup backup', err));
            }

            console.log(`Starting S3 Backup cron job with frequency: ${frequency} (${cronExpr})`);
            this.job = new Cron(cronExpr, async () => {
                console.log('Running scheduled S3 backup...');
                await this.performBackup(true);
            });
        } catch (err) {
            console.error('Failed to sync S3 backup schedule', err);
        }
    }

    async performBackup(isScheduled: boolean = false) {
        if (!this.s3 || !env.S3_BUCKET) {
            console.log('S3 not configured, skipping backup');
            return;
        }

        try {
            const allProjects = await this.db.select().from(projects);
            const allLanguages = await this.db.select().from(languages);
            const allProjectLanguages = await this.db.select().from(projectLanguages);
            const allLabels = await this.db.select().from(labels);
            const allTranslationKeys = await this.db.select().from(translationKeys);
            const allTranslations = await this.db.select().from(translations);
            const allKeysToLabels = await this.db.select().from(keysToLabels);
            const allActivityLogs = await this.db.select().from(activityLogs);
            const allKeyTemplates = await this.db.select().from(keyTemplates);
            const allKeyGlossary = await this.db.select().from(keyGlossary);
            const allKeyVariables = await this.db.select().from(keyVariables);

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

            const dateStr = new Date().toISOString().replace(/:/g, '-').split('.')[0];
            const fileName = `glide-backup-${dateStr}.zip`;

            const command = new PutObjectCommand({
                Bucket: env.S3_BUCKET,
                Key: `backups/${fileName}`,
                Body: zipBuffer,
                ContentType: 'application/zip'
            });

            await this.s3.send(command);
            console.log(`Successfully uploaded backup to S3: backups/${fileName}`);

            // Persist the last backup time to the database ONLY if it's a scheduled/catch-up backup.
            // This prevents manual backups from resetting the cron catch-up logic.
            if (isScheduled) {
                const nowIso = new Date().toISOString();
                await this.db.insert(settings)
                    .values({ key: 's3LastBackupAt', value: nowIso })
                    .onConflictDoUpdate({
                        target: settings.key,
                        set: { value: nowIso }
                    });
            }

        } catch (error) {
            console.error('Failed to perform S3 backup', error);

            try {
                const { users } = await import('../../admin/users/schema');
                const { NotificationService } = await import('../../../services/notification.service');
                const { eq } = await import('drizzle-orm');
                const admins = await this.db.select().from(users).where(eq(users.isAdmin, true));
                
                for (const admin of admins) {
                    if (admin.alertConfig) {
                        await NotificationService.send(admin.alertConfig, 'backup.failed', {
                            title: 'S3 Backup Failed 🚨',
                            message: `The automated S3 backup failed. Please check the server logs.\nError: ${error instanceof Error ? error.message : String(error)}`
                        });
                    }
                }
            } catch (notifyError) {
                console.error('Failed to send backup failed notifications', notifyError);
            }

            throw error;
        }
    }
}
