import { FastifyInstance } from "fastify";
import { SetupService } from "../../auth/services/setup.service";

export default async function setupRoutes(fastify: FastifyInstance) {
    const setupService = new SetupService(fastify.db);

    fastify.get('/status', async () => {
        const required = await setupService.isSetupRequired();
        return { setupRequired: required };
    });

    fastify.post('/initial', async (request, _reply) => {
        const required = await setupService.isSetupRequired();
        if (!required) {
            return { success: true };
        }
        const body = request.body as any;
        return setupService.performInitialSetup(body);
    });
}
