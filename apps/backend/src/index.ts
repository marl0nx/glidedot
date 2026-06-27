import { buildApp } from './app';
import { env } from './config/env';
import { UserService } from './modules/auth/services/user.service';
import { S3BackupService } from './modules/settings/migration/s3-backup.service';
import { LogCleanupService } from './modules/admin/services/log-cleanup.service';

async function start() {
    const app = await buildApp();

    // Create default admin user if it doesn't exist
    const userService = new UserService(app.db);
    await userService.createAdminIfNotExists();

    // Init S3 Backups
    const s3BackupService = new S3BackupService(app.db);
    await s3BackupService.init();

    // Init Log Cleanup Cron
    const logCleanupService = new LogCleanupService(app.db);
    await logCleanupService.init();

    try {
        await app.listen({ port: env.PORT, host: '0.0.0.0' });
        console.log(`Server is running on port ${env.PORT}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}

start()