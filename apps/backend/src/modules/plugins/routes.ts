import { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";

export default async function pluginRoutes(fastify: FastifyInstance) {
    const { checkProjectAccess, requireAdmin } = fastify.authHooks;
    const { pluginSystem } = fastify;

    // --- USER / PROJECT ENDPOINTS ---

    // Serve the plugin's frontend compiled UI script
    fastify.get('/serve-ui/:pluginId', async (request, reply) => {
        const { pluginId } = request.params as { pluginId: string };
        const path = require('node:path');
        const pluginPath = path.join(pluginSystem.getPluginsDir(), pluginId, 'dist', 'ui.js');
        
        try {
            const file = Bun.file(pluginPath);
            if (await file.exists()) {
                reply.header('Content-Type', 'application/javascript');
                reply.header('Access-Control-Allow-Origin', '*');
                return await file.text();
            } else {
                return reply.status(404).send({ error: 'Not found', message: 'Plugin UI not found' });
            }
        } catch (err) {
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    // Get all plugins and their status/settings for a specific project (used by sidebar & extensions page)
    fastify.get('/projects/:projectId', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId } = request.params as { projectId: string };
        const pId = parseInt(projectId);

        const plugins = pluginSystem.getPlugins();
        const result = [];

        for (const plugin of plugins) {
            const enabled = await pluginSystem.isPluginEnabled(pId, plugin.id);
            const settings = await pluginSystem.getSettings(pId, plugin.id);

            result.push({
                ...plugin,
                enabled,
                settings
            });
        }

        return result;
    });

    // Toggle plugin activation status for a project (fallback, kept for compatibility)
    fastify.post('/projects/:projectId/:pluginId/toggle', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId, pluginId } = request.params as { projectId: string, pluginId: string };
        const { enabled } = request.body as { enabled: boolean };
        const pId = parseInt(projectId);

        await pluginSystem.togglePlugin(pId, pluginId, enabled);
        return { success: true, enabled };
    });

    // Save plugin settings for a project (fallback, kept for compatibility)
    fastify.post('/projects/:projectId/:pluginId/settings', { preHandler: [checkProjectAccess] }, async (request) => {
        const { projectId, pluginId } = request.params as { projectId: string, pluginId: string };
        const { settings } = request.body as { settings: Record<string, string> };
        const pId = parseInt(projectId);

        for (const [key, value] of Object.entries(settings)) {
            await pluginSystem.setSetting(pId, pluginId, key, value);
        }

        return { success: true };
    });


    // --- CENTRAL ADMIN ENDPOINTS ---

    // Get all discovered plugins (Admin area)
    fastify.get('/admin/list', { preHandler: [requireAdmin] }, async () => {
        return pluginSystem.getPlugins();
    });

    // Get activation status and settings of a specific plugin across all projects
    fastify.get('/admin/project-status/:pluginId', { preHandler: [requireAdmin] }, async (request) => {
        const { pluginId } = request.params as { pluginId: string };
        
        // Fetch all projects using drizzle raw SQL to avoid schema imports path complexity
        const allProjects = await fastify.db.all(sql`SELECT id, name FROM projects`) as any[];
        
        const result = [];
        for (const proj of allProjects) {
            const enabled = await pluginSystem.isPluginEnabled(proj.id, pluginId);
            const settings = await pluginSystem.getSettings(proj.id, pluginId);
            result.push({
                projectId: proj.id,
                projectName: proj.name,
                enabled,
                settings
            });
        }
        return result;
    });

    // Central Admin: Toggle plugin activation for a specific project
    fastify.post('/admin/toggle', { preHandler: [requireAdmin] }, async (request) => {
        const { projectId, pluginId, enabled } = request.body as { projectId: number, pluginId: string, enabled: boolean };
        await pluginSystem.togglePlugin(projectId, pluginId, enabled);
        return { success: true };
    });

    // Central Admin: Save plugin settings for a specific project
    fastify.post('/admin/settings', { preHandler: [requireAdmin] }, async (request) => {
        const { projectId, pluginId, settings } = request.body as { projectId: number, pluginId: string, settings: Record<string, string> };
        
        for (const [key, value] of Object.entries(settings)) {
            await pluginSystem.setSetting(projectId, pluginId, key, value);
        }
        return { success: true };
    });

    // Central Admin: Install a plugin from a URL (ZIP archive)
    fastify.post('/admin/install', { preHandler: [requireAdmin] }, async (request) => {
        const { url } = request.body as { url: string };
        if (!url || !url.startsWith("http")) {
            throw new Error("Invalid URL. It must be an absolute HTTP or HTTPS link.");
        }
        
        try {
            const manifest = await pluginSystem.installPluginFromUrl(url, fastify);
            return { success: true, manifest };
        } catch (err: any) {
            console.error(`[PluginRoutes] Installation failed for URL ${url}:`, err);
            throw new Error(err.message || "Failed to install plugin.");
        }
    });

    // Central Admin: Uninstall a plugin (delete files, DB settings, and remove from memory)
    fastify.delete('/admin/uninstall/:pluginId', { preHandler: [requireAdmin] }, async (request) => {
        const { pluginId } = request.params as { pluginId: string };
        
        try {
            await pluginSystem.uninstallPlugin(pluginId);
            return { success: true };
        } catch (err: any) {
            console.error(`[PluginRoutes] Uninstall failed for plugin ID ${pluginId}:`, err);
            throw new Error(err.message || "Failed to uninstall plugin.");
        }
    });
}
