import { FastifyPluginAsync } from 'fastify';
import { settingsRoutes } from './routes';
import { createAuthHooks } from '../auth/hooks';
import { UserService } from '../auth/services/user.service';
import { TeamService } from '../auth/services/team.service';

const settingsModule: FastifyPluginAsync = async (app) => {
    const userService = new UserService(app.db);
    const teamService = new TeamService(app.db);
    const { authenticate, requireAdmin } = createAuthHooks(userService, teamService);

    app.register(settingsRoutes);
};

export default settingsModule;
