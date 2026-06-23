import fp from 'fastify-plugin';
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as schema from '../db/schema';
import { UserService } from '../modules/auth/services/user.service';
import { env } from '../config/env';

export default fp(async (fastify) => {
    const sqlite = new Database(env.DB_URL);
    sqlite.run("PRAGMA foreign_keys = ON;");
    const db = drizzle(sqlite, { schema });
    fastify.decorate('db', db);

    // Migrations are now handled by `drizzle-kit push` on container startup

    // Bootstrap Admin User
    const userService = new UserService(db);
    await userService.createAdminIfNotExists();

    // Close database connection on server close
    fastify.addHook('onClose', async () => {
        sqlite.close();
    });
});

// TypeScript Type extensions for Fastify to include our database instance
declare module 'fastify' {
    interface FastifyInstance {
        db: ReturnType<typeof drizzle<typeof schema>>;
    }
}