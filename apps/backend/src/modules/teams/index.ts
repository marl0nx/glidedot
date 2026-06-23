import { FastifyInstance } from "fastify";
import routes from "./routes";

export default async function teamsModule(fastify: FastifyInstance) {
    await fastify.register(routes);
}
