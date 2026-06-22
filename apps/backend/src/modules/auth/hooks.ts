import { FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from './services/user.service';
import { TeamService } from './services/team.service';

export function createAuthHooks(userService: UserService, teamService: TeamService) {
    return {
        authenticate: async (request: FastifyRequest, reply: FastifyReply) => {
            const authHeader = request.headers['authorization'] as string;
            const apiKey = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
            
            if (!apiKey) {
                const err = new Error('Authorization Bearer Token is required');
                (err as any).statusCode = 401;
                throw err;
            }

            const user = await userService.getByApiKey(apiKey);
            if (!user) {
                const err = new Error('Invalid API Key');
                (err as any).statusCode = 401;
                throw err;
            }

            request.user = user;
        },

        requireAdmin: async (request: FastifyRequest, reply: FastifyReply) => {
            if (!request.user?.isAdmin) {
                const err = new Error('Admin access required');
                (err as any).statusCode = 403;
                throw err;
            }
        },

        checkProjectAccess: async (request: FastifyRequest, reply: FastifyReply) => {
            if (request.user?.isAdmin) return;

            const { projectId } = request.params as { projectId?: string };
            const pId = projectId ? parseInt(projectId) : (request.body as any)?.projectId;

            if (!pId) return;

            const hasAccess = await teamService.checkProjectAccess(request.user!.id, pId);
            if (!hasAccess) {
                return reply.status(403).send({ error: 'No access to this project' });
            }
        },

        checkLanguagePermission: async (request: FastifyRequest, reply: FastifyReply) => {
            // Disabled granular language permission until UI supports it
            return;
        }
    };
}

// Extend FastifyRequest to include user
declare module 'fastify' {
    interface FastifyRequest {
        user?: {
            id: number;
            username: string;
            email: string;
            isAdmin: boolean;
            avatarUrl: string | null;
            translationQuota: number;
            allowSuggestions: boolean;
            enableSuggestions: boolean;
            hasDeepL?: boolean;
            apiKey: string;
        };
    }
}
