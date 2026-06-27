import { FastifyInstance } from "fastify";
import { TeamService } from "../../../auth/services/team.service";

export default async function teamsRoutes(fastify: FastifyInstance) {
    const teamService = new TeamService(fastify.db);
    const { requireAdmin } = fastify.authHooks;

    fastify.get('/', { preHandler: [requireAdmin] }, async () => {
        return teamService.getAllTeams();
    });

    fastify.post('/', { preHandler: [requireAdmin] }, async (request, reply) => {
        const { name } = request.body as { name: string };
        const result = await teamService.createTeam(name);
        reply.status(201).send(result[0]);
    });

    fastify.patch('/:teamId', { preHandler: [requireAdmin] }, async (request) => {
        const { teamId } = request.params as { teamId: string };
        const body = request.body as any;
        return teamService.updateTeam(parseInt(teamId), body);
    });

    fastify.post('/:teamId/members', { preHandler: [requireAdmin] }, async (request) => {
        const { teamId } = request.params as { teamId: string };
        const { userId } = request.body as { userId: number };
        return teamService.addMember(parseInt(teamId), userId);
    });

    fastify.post('/:teamId/projects', { preHandler: [requireAdmin] }, async (request) => {
        const { teamId } = request.params as { teamId: string };
        const { projectId } = request.body as { projectId: number };
        return teamService.addProjectToTeam(parseInt(teamId), projectId);
    });

    fastify.delete('/:teamId/members/:userId', { preHandler: [requireAdmin] }, async (request) => {
        const { teamId, userId } = request.params as { teamId: string, userId: string };
        return teamService.removeMember(parseInt(teamId), parseInt(userId));
    });

    fastify.delete('/:teamId/projects/:projectId', { preHandler: [requireAdmin] }, async (request) => {
        const { teamId, projectId } = request.params as { teamId: string, projectId: string };
        return teamService.removeProjectFromTeam(parseInt(teamId), parseInt(projectId));
    });

    fastify.delete('/:teamId', { preHandler: [requireAdmin] }, async (request) => {
        const { teamId } = request.params as { teamId: string };
        return teamService.deleteTeam(parseInt(teamId));
    });

}
