import { FastifyPluginAsync } from 'fastify';
import { settingsRoutes } from './routes';

const settingsModule: FastifyPluginAsync = async (app) => {
    app.register(settingsRoutes);
};

export default settingsModule;
