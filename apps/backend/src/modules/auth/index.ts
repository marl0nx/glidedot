import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { UserService } from "./services/user.service";
import { TeamService } from "./services/team.service";
import { createAuthHooks } from "./hooks";

export default fp(async function authModule(fastify: FastifyInstance) {
    const userService = new UserService(fastify.db);
    const teamService = new TeamService(fastify.db);
    const hooks = createAuthHooks(userService, teamService);

    // Decorate fastify with auth hooks for use in other modules
    fastify.decorate('authHooks', hooks);

    // Global authentication hook for all routes under /v1
    fastify.addHook('onRequest', async (request, reply) => {
        // Skip auth for OPTIONS (CORS preflight)
        if (request.method === 'OPTIONS') return;

        // Skip auth for setup routes
        if (request.url.startsWith('/v1/setup')) return;

        // Allow public access to login
        if (request.url.startsWith('/v1/sessions/login')) return;

        // Allow public access to read public settings (needed for maintenance mode check and setup UI)
        if (request.method === 'GET' && request.url.startsWith('/v1/admin/settings/public')) return;
        
        console.log(`[Auth Hook] URL: ${request.url}, originalUrl: ${request.originalUrl}`);

        // Call authenticate hook
        await hooks.authenticate(request, reply);
    });
});

declare module 'fastify' {
    interface FastifyInstance {
        authHooks: ReturnType<typeof createAuthHooks>;
    }
}
