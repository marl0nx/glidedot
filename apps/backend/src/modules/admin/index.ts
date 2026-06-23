import { FastifyInstance } from "fastify";
import routes from "./routes";

export default async function adminModule(fastify: FastifyInstance) {
    await fastify.register(routes);
}
