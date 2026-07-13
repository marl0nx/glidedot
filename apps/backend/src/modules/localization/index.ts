import { FastifyInstance } from "fastify";
import languageRoutes from "./languages/routes";
import projectRoutes from "./projects/routes";
import labelRoutes from "./labels/routes";
import keyRoutes from "./keys/routes";

export default async function localizationModule(fastify: FastifyInstance) {
    await fastify.register(languageRoutes, { prefix: '/languages' });
    await fastify.register(projectRoutes, { prefix: '/projects' });
    await fastify.register(labelRoutes, { prefix: '/labels' });
    await fastify.register(keyRoutes, { prefix: '/keys' });
}