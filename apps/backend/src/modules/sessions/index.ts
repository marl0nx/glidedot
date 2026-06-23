import { FastifyInstance } from "fastify";
import routes from "./routes";

export default async function sessionsModule(fastify: FastifyInstance) {
    await fastify.register(routes);
}
