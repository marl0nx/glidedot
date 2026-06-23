import { FastifyInstance } from 'fastify';
import { Cron } from 'croner';
import { lt, eq } from 'drizzle-orm';
import { activityLogs } from '../../localization/schema';
import { settings } from '../../settings/schema';

export class LogCleanupService {
    private job: Cron | null = null;

    constructor(private db: FastifyInstance['db']) {}

    async init() {
        // Run once every hour
        this.job = new Cron('0 * * * *', async () => {
            await this.cleanup();
        });
        
        // Also run immediately on startup
        await this.cleanup();
    }

    private async cleanup() {
        try {
            const retentionSetting = await this.db.select().from(settings).where(eq(settings.key, 'logRetentionDays')).limit(1);
            let retentionDays = 0;
            if (retentionSetting.length > 0) {
                retentionDays = parseInt(retentionSetting[0].value, 10);
            }

            if (!retentionDays || isNaN(retentionDays) || retentionDays <= 0) {
                return;
            }

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
            const cutoffStr = cutoffDate.toISOString().replace('T', ' ').substring(0, 19);

            await this.db.delete(activityLogs)
                .where(lt(activityLogs.createdAt, cutoffStr))
                .execute();
        } catch (error) {
            console.error('Failed to run activity log cleanup:', error);
        }
    }
}
