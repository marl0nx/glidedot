import { FastifyInstance } from 'fastify';
import { LanguageService } from '../services/language.service';

export default async function languageRoutes(fastify: FastifyInstance) {
    const service = new LanguageService(fastify.db);
    const { requireAdmin } = fastify.authHooks;

    fastify.get('/', async () => {
        return service.getAll();
    });

    fastify.post('/', { preHandler: [requireAdmin] }, async (request, reply) => {
        const body = request.body as { code: string; name: string; flag?: string };
        const result = await service.create(body);
        reply.status(201).send(result[0]);
    });

    fastify.delete('/:id', { preHandler: [requireAdmin] }, async (request) => {
        const { id } = request.params as { id: string };
        return service.delete(parseInt(id));
    });

    fastify.patch('/:id', { preHandler: [requireAdmin] }, async (request) => {
        const { id } = request.params as { id: string };
        const body = request.body as { code?: string; name?: string; flag?: string };
        return service.update(parseInt(id), body);
    });
}
