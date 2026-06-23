import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { settings } from './schema';
import { createAuthHooks } from '../auth/hooks';
import { UserService } from '../auth/services/user.service';
import { TeamService } from '../auth/services/team.service';

export const settingsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  const userService = new UserService(app.db);
  const teamService = new TeamService(app.db);
  const { requireAdmin } = createAuthHooks(userService, teamService);

  // Anyone can read public settings (like theming) or we can make it public.
  // Actually, we'll just allow authenticated users to read settings for now,
  // or we can make GET public if it's strictly for UI appearance.
  app.get('/', { preHandler: [requireAdmin] }, async (request, reply) => {
    const allSettings = await app.db.select().from(settings);
    const settingsObj: Record<string, any> = {};
    for (const row of allSettings) {
      settingsObj[row.key] = row.value;
    }
    const { env } = await import('../../config/env');
    settingsObj['s3Configured'] = !!(env.S3_ENDPOINT && env.S3_BUCKET && env.S3_ACCESS_KEY && env.S3_SECRET_KEY);
    return settingsObj;
  });

  app.get('/public', async (request, reply) => {
    const { inArray } = await import('drizzle-orm');
    const publicKeys = ['maintenanceMode', 'logoType', 'logoUrl', 'logoUrlMinimal', 'logoText', 'logoSize', 'logoShowDot', 'primaryColor', 'themeMode', 'customBackgroundColor'];
    const rows = await app.db.select().from(settings).where(inArray(settings.key, publicKeys));
    const result: Record<string, any> = {};
    for (const r of rows) {
      result[r.key] = r.value;
    }
    result.maintenanceMode = result.maintenanceMode === 'true';
    return result;
  });

  app.post('/', {
    preHandler: [requireAdmin]
  }, async (request, reply) => {
    const { sql } = await import('drizzle-orm');
    const body = request.body as Record<string, string>;
    console.log("RECEIVED SETTINGS BODY:", typeof body, body);
    const entries = Object.entries(body || {});
    
    // Execute all upserts using raw SQL to bypass ORM builder issues that cause hanging
    for (const [key, value] of entries) {
      if (key && value !== undefined && value !== null) {
        await app.db.run(sql`INSERT INTO settings (key, value) VALUES (${key}, ${value}) ON CONFLICT(key) DO UPDATE SET value=excluded.value`);
      }
    }
    
    return { success: true };
  });
};
