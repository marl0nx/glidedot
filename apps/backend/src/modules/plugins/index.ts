import { FastifyInstance } from "fastify";
import routes from "./routes";

export default async function pluginsModule(fastify: FastifyInstance) {
    await fastify.register(routes);
}
