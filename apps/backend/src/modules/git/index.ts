import { FastifyInstance } from "fastify";
import routes from "./routes";

export default async function gitModule(fastify: FastifyInstance) {
    await fastify.register(routes);
}
