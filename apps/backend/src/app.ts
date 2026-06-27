import Fastify from 'fastify';
import cors from '@fastify/cors';
import pluginDB from './plugins/db';
import authModule from './modules/auth';
import setupModule from './modules/setup';
import sessionsModule from './modules/auth/sessions';
import usersModule from './modules/admin/users';
import teamsModule from './modules/admin/teams';
import adminModule from './modules/admin';
import localizationModule from './modules/localization';
import settingsModule from './modules/settings';
import migrationModule from './modules/settings/migration';
import gitModule from './modules/git';
import multipart from '@fastify/multipart';
import responseWrapper from './plugins/response-wrapper';

export async function buildApp() {
    const app = Fastify({
        logger: process.env.NODE_ENV !== 'test',
        routerOptions: {
            ignoreTrailingSlash: true
        }
    });

    await app.register(cors, {
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        exposedHeaders: ['Content-Disposition', 'Content-Length', 'Content-Type'],
    });

    // Register Plugins
    await app.register(pluginDB);
    await app.register(responseWrapper);
    await app.register(multipart, {
        limits: {
            fileSize: 100 * 1024 * 1024 // 100MB
        }
    });

    // Register Modules
    await app.register(authModule);
    await app.register(setupModule, { prefix: '/v1/setup' });
    await app.register(sessionsModule, { prefix: '/v1/sessions' });
    await app.register(usersModule, { prefix: '/v1/users' });
    await app.register(teamsModule, { prefix: '/v1/admin/teams' });
    await app.register(adminModule, { prefix: '/v1/admin' });
    await app.register(localizationModule, { prefix: '/v1/localization' });
    await app.register(settingsModule, { prefix: '/v1/admin/settings' });
    await app.register(migrationModule, { prefix: '/v1/admin/migration' });
    await app.register(gitModule, { prefix: '/v1/git' });

    return app;
}