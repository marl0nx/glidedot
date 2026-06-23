import { FastifyInstance } from "fastify";
import { UserService } from "../../auth/services/user.service";

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
        const { env } = await import('../../../config/env');
        const { settings } = await import('../../settings/schema');
        const { eq } = await import('drizzle-orm');
        
        const apiKeySetting = await fastify.db.select().from(settings).where(eq(settings.key, 'deeplApiKey')).limit(1);
        const hasDeepLSetting = apiKeySetting.length > 0 && !!apiKeySetting[0].value;

        return {
            ...request.user,
            hasDeepL: !!env.DEEPL_API_KEY || hasDeepLSetting
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
