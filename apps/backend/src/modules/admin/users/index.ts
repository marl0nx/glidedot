import { FastifyInstance } from "fastify";
import routes from "./routes";

export default async function usersModule(fastify: FastifyInstance) {
    await fastify.register(routes);
}
