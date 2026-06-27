import { FastifyInstance } from "fastify";
import { UserService } from "../../../auth/services/user.service";

export default async function usersRoutes(fastify: FastifyInstance) {
    const userService = new UserService(fastify.db);
    const { requireAdmin } = fastify.authHooks;

    fastify.get('/', { preHandler: [requireAdmin] }, async () => {
        return userService.getAllUsers();
    });

    fastify.post('/', { preHandler: [requireAdmin] }, async (request, reply) => {
        const body = request.body as any;
        const result = await userService.createUser(body);
        reply.status(201).send(result[0]);
    });

    fastify.get('/me', async (request) => {
        const { settings } = await import('../../../settings/schema');
        const { eq } = await import('drizzle-orm');
        
        const apiKeySetting = await fastify.db.select().from(settings).where(eq(settings.key, 'deeplApiKey')).limit(1);
        const hasDeepLSetting = apiKeySetting.length > 0 && !!apiKeySetting[0].value;

        return {
            ...request.user,
            hasDeepL: hasDeepLSetting
        };
    });

    fastify.post('/me/api-key', async (request) => {
        return userService.updateApiKey(request.user!.id);
    });

    fastify.post('/me/password', async (request) => {
        const { password } = request.body as any;
        return userService.updatePassword(request.user!.id, password);
    });

    fastify.patch('/me', async (request, reply) => {
        const body = request.body as any;
        
        delete body.username;

        if (request.user!.isOidc) {
            delete body.email;
            delete body.avatarUrl;
            delete body.password;
            delete body.oldPassword;
        }

        if (body.password) {
            if (!body.oldPassword) {
                return reply.status(400).send({ error: 'Current password is required to change password' });
            }
            const user = await userService.getByUsername(request.user!.username);
            if (!user || !(await userService.verifyPassword(body.oldPassword, user.passwordHash))) {
                return reply.status(401).send({ error: 'Incorrect current password' });
            }
        }
        
        return userService.updateUser(request.user!.id, body);
    });

    fastify.post('/me/test-alert', async (request, reply) => {
        const { alertConfig, testEvent } = request.body as any;
        const { NotificationService } = await import('../../../../services/notification.service');
        
        let payload: any = {
            title: 'Test Notification',
            message: 'This is a test notification from glide. If you are seeing this, your webhook is configured correctly!',
            event: testEvent || 'test.alert'
        };

        switch (testEvent) {
            case 'translation.approved':
                payload = {
                    title: 'Translation Approved 🎉',
                    message: `Your translation for key \`homepage.hero.title\` was approved by reviewer.`,
                    key: 'homepage.hero.title',
                    language: 'German (de)',
                    reviewer: 'reviewer'
                };
                break;
            case 'translation.rejected':
                payload = {
                    title: 'Translation Rejected ❌',
                    message: `Your translation for key \`homepage.hero.title\` was rejected by reviewer.`,
                    key: 'homepage.hero.title',
                    language: 'German (de)',
                    reviewer: 'reviewer',
                    reason: 'Typo in the second word.'
                };
                break;
            case 'quota.low':
                payload = {
                    title: 'Low Translation Quota ⚠️',
                    message: `Your automated translation quota is running low (12 remaining).`,
                    remaining: '12',
                    total: '500'
                };
                break;
            case 'pending.reviews':
                payload = {
                    title: 'Pending Reviews ⏳',
                    message: `There are 5 new translations waiting for your review.`,
                    pendingCount: '5',
                    project: 'Main Project'
                };
                break;
            case 'backup.failed':
                payload = {
                    title: 'Backup Failed 🚨',
                    message: `The automated S3 database backup failed to complete.`,
                    error: 'Connection timeout',
                    bucket: 'glide-backups-bucket'
                };
                break;
        }
        
        await NotificationService.send(alertConfig, `test.${testEvent || 'alert'}`, payload);

        return { success: true };
    });

    fastify.post('/:id/api-key', { preHandler: [requireAdmin] }, async (request) => {
        const { id } = request.params as { id: string };
        return userService.updateApiKey(parseInt(id));
    });

    fastify.patch('/:id', { preHandler: [requireAdmin] }, async (request) => {
        const { id } = request.params as { id: string };
        const body = request.body as any;

        const { users } = await import('../schema');
        const { eq } = await import('drizzle-orm');
        const targetUsers = await fastify.db.select().from(users).where(eq(users.id, parseInt(id)));

        if (targetUsers.length > 0 && targetUsers[0].isOidc) {
            delete body.username;
            delete body.email;
            delete body.password;
            delete body.avatarUrl;
        }

        return userService.updateUser(parseInt(id), body);
    });

    fastify.delete('/:id', { preHandler: [requireAdmin] }, async (request) => {
        const { id } = request.params as { id: string };
        return userService.deleteUser(parseInt(id));
    });
}
