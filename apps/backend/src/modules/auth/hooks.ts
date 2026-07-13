import { FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from './services/user.service';
import { TeamService } from './services/team.service';
import { HttpError } from '../../utils/http-error';
import type { AlertConfig } from '../../services/notification.service';

export function createAuthHooks(userService: UserService, teamService: TeamService) {
    return {
        authenticate: async (request: FastifyRequest, _reply: FastifyReply) => {
            const authHeader = request.headers['authorization'] as string;
            const apiKey = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

            if (!apiKey) {
                throw new HttpError('Authorization Bearer Token is required', 401);
            }

            const user = await userService.getByApiKey(apiKey);
            if (!user) {
                throw new HttpError('Invalid API Key', 401);
            }

            if (!user.isAdmin) {
                const { settings } = await import('../settings/schema');
                const { eq } = await import('drizzle-orm');
                const mode = await request.server.db.select().from(settings).where(eq(settings.key, 'maintenanceMode')).limit(1);
                if (mode.length > 0 && mode[0].value === 'true') {
                    throw new HttpError('Maintenance Mode is active', 503);
                }
            }

            request.user = user;
        },

        requireAdmin: async (request: FastifyRequest, _reply: FastifyReply) => {
            if (!request.user?.isAdmin) {
                throw new HttpError('Admin access required', 403);
            }
        },

        checkProjectAccess: async (request: FastifyRequest, reply: FastifyReply) => {
            if (request.user?.isAdmin) return;

            const { projectId } = request.params as { projectId?: string };
            let pId = projectId ? parseInt(projectId) : undefined;

            const body = request.body as { projectId?: string | number } | undefined;
            const query = request.query as { projectId?: string | number } | undefined;

            if (!pId && body?.projectId) {
                pId = parseInt(String(body.projectId));
            }
            if (!pId && query?.projectId) {
                pId = parseInt(String(query.projectId));
            }

            if (!pId) return;

            const hasAccess = await teamService.checkProjectAccess(request.user!.id, pId);
            if (!hasAccess) {
                return reply.status(403).send({ error: 'No access to this project' });
            }
        },

        checkLanguagePermission: async (_request: FastifyRequest, _reply: FastifyReply) => {
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
            isReviewer?: boolean;
            requiresReview?: boolean;
            isOidc?: boolean;
            avatarUrl: string | null;
            translationQuota: number;
            allowSuggestions: boolean;
            enableSuggestions: boolean;
            hasDeepL?: boolean;
            apiKey: string;
            alertConfig?: AlertConfig | null;
        };
    }
}
