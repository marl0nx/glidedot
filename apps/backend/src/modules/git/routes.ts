import { FastifyInstance } from "fastify";
import { GitService } from "./services/git.service";

export default async function gitRoutes(fastify: FastifyInstance) {
    const gitService = new GitService(fastify.db);

    fastify.get('/connections', async (request) => {
        return gitService.getUserConnections(request.user!.id);
    });

    fastify.post('/connections', async (request, reply) => {
        const body = request.body as { provider: 'github' | 'gitlab' | 'forgejo', token: string, baseUrl?: string };
        const result = await gitService.saveUserConnection(request.user!.id, body.provider, body.token, body.baseUrl);
        reply.status(201).send(result);
    });

    fastify.delete('/connections/:provider', async (request, reply) => {
        const { provider } = request.params as { provider: 'github' | 'gitlab' | 'forgejo' };
        await gitService.deleteUserConnection(request.user!.id, provider);
        reply.status(204).send();
    });

    fastify.get('/projects/:projectId/syncs', async (request) => {
        const { projectId } = request.params as { projectId: string };
        return gitService.getProjectSyncs(parseInt(projectId));
    });

    fastify.post('/projects/:projectId/syncs', async (request, reply) => {
        const { projectId } = request.params as { projectId: string };
        const body = request.body as { provider: 'github' | 'gitlab' | 'forgejo', repoName: string, branch: string, filePath: string };
        const result = await gitService.saveProjectSync(parseInt(projectId), body);
        reply.status(201).send(result);
    });

    fastify.delete('/projects/:projectId/syncs/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        await gitService.deleteProjectSync(parseInt(id));
        reply.status(204).send();
    });

    fastify.get('/repos', async (request) => {
        const { provider } = request.query as { provider: 'github' | 'gitlab' | 'forgejo' };
        return gitService.getRepos(request.user!.id, provider);
    });

    fastify.get('/branches', async (request) => {
        const { provider, repo } = request.query as { provider: 'github' | 'gitlab' | 'forgejo', repo: string };
        return gitService.getBranches(request.user!.id, provider, repo);
    });

    fastify.post('/projects/:projectId/syncs/:syncId/execute', async (request, reply) => {
        const { syncId } = request.params as { syncId: string };
        const result = await gitService.executeSync(parseInt(syncId), request.user!.id);
        reply.status(200).send(result);
    });
}
