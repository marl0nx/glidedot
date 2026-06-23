import { FastifyInstance } from "fastify";
import routes from "./routes";

export default async function setupModule(fastify: FastifyInstance) {
    await fastify.register(routes);
}
