import { FastifyInstance } from "fastify";
import { UserService } from "../../services/user.service";

export default async function sessionsRoutes(fastify: FastifyInstance) {
    const userService = new UserService(fastify.db);

    fastify.post('/login', async (request, reply) => {
        const { username, password } = request.body as any;
        console.log(`Login attempt for user: ${username}`);
        const user = await userService.getByUsername(username);

        if (!user || !(await userService.verifyPassword(password, user.passwordHash))) {
            console.log(`Login failed for user: ${username}`);
            return reply.status(401).send({ error: 'Invalid credentials' });
        }

        return {
            id: user.id,
            username: user.username,
            isAdmin: user.isAdmin,
            isOidc: user.isOidc,
            apiKey: user.apiKey
        };
    });

    fastify.post('/login/oidc', async (request, reply) => {
        const { email, username, avatarUrl, groups } = request.body as any;
        if (!email || !username) return reply.status(400).send({ error: 'Missing email or username' });

        const oidcGroupsArr = Array.isArray(groups) ? groups.map(String) : [];
        const oidcGroupsStr = JSON.stringify(oidcGroupsArr);

        // Import users and eq locally since we need them
        const { users } = await import('../../../admin/users/schema');
        const { eq } = await import('drizzle-orm');

        let user = await userService.getByUsername(username);
        if (!user) {
            const byEmail = await fastify.db.select().from(users).where(eq(users.email, email));
            if (byEmail.length > 0) {
                user = byEmail[0];
            }
        }

        if (!user) {
            const { randomBytes } = await import('node:crypto');
            const result = await userService.createUser({
                username,
                email,
                password: randomBytes(16).toString('hex') + 'A!', // Secure random password they don't know
                isOidc: true,
                avatarUrl,
                oidcGroups: oidcGroupsStr
            } as any);
            user = result[0];
        } else {
            const updates: any = {};
            if (avatarUrl && user.avatarUrl !== avatarUrl) updates.avatarUrl = avatarUrl;
            if (!user.isOidc) updates.isOidc = true;
            if (user.oidcGroups !== oidcGroupsStr) updates.oidcGroups = oidcGroupsStr;
            if (Object.keys(updates).length > 0) {
                const updated = await userService.updateUser(user.id, updates);
                user = updated[0];
            }
        }

        return {
            id: user.id,
            username: user.username,
            isAdmin: user.isAdmin,
            isOidc: user.isOidc,
            apiKey: user.apiKey,
            avatarUrl: user.avatarUrl
        };
    });

}
