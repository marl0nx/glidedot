import { readdir, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { FastifyInstance } from "fastify";
import { env } from "../../../config/env";
import { projectPlugins, pluginSettings } from "../schema";
import { eq, and } from "drizzle-orm";

export interface PluginManifest {
    id: string;
    name: string;
    version: string;
    description?: string;
    author?: string;
    icon?: string;
    category?: string;
    settingsSchema?: Record<string, unknown>;
    extensions?: Array<{
        id: string;
        label: string;
        icon?: string;
        views: unknown[];
    }>;
}

export interface PluginModule {
    register?: (system: PluginSystem, fastify?: FastifyInstance) => void | Promise<void>;
    unregister?: (system: PluginSystem) => void | Promise<void>;
    [key: string]: unknown;
}

export class PluginSystem {
    private plugins = new Map<string, { manifest: PluginManifest; module: PluginModule; dirPath: string }>();
    private hooks = new Map<string, ((...args: unknown[]) => unknown)[]>();

    constructor(private db: FastifyInstance['db']) {}

    /**
     * Resolve the plugins directory relative to DB_URL
     */
    getPluginsDir(): string {
        const dbDir = path.dirname(env.DB_URL);
        return path.resolve(dbDir, "plugins");
    }

    /**
     * Scan the plugins directory and initialize all valid plugins
     */
    async init(fastify?: FastifyInstance) {
        const pluginsPath = this.getPluginsDir();
        
        // Ensure directory exists
        try {
            await mkdir(pluginsPath, { recursive: true });
        } catch (err) {
            console.error(`[PluginSystem] Failed to create plugins directory at ${pluginsPath}:`, err);
            return;
        }

        console.log(`[PluginSystem] Scanning plugins directory: ${pluginsPath}`);
        
        let dirs;
        try {
            dirs = await readdir(pluginsPath, { withFileTypes: true });
        } catch (err) {
            console.error("[PluginSystem] Failed to read plugins directory:", err);
            return;
        }

        for (const dir of dirs) {
            if (dir.isDirectory()) {
                const pluginDir = path.join(pluginsPath, dir.name);
                const manifestPath = path.join(pluginDir, "manifest.json");
                
                try {
                    const manifestFile = Bun.file(manifestPath);
                    if (!(await manifestFile.exists())) {
                        console.warn(`[PluginSystem] Skipping plugin folder "${dir.name}" - manifest.json not found.`);
                        continue;
                    }

                    const manifest: PluginManifest = await manifestFile.json();
                    
                    if (!manifest.id) {
                        console.error(`[PluginSystem] Error in ${dir.name}/manifest.json: Missing "id" field.`);
                        continue;
                    }

                    // Look for index.ts first, then index.js
                    let entryPath = path.join(pluginDir, "index.ts");
                    if (!(await Bun.file(entryPath).exists())) {
                        entryPath = path.join(pluginDir, "index.js");
                    }

                    if (!(await Bun.file(entryPath).exists())) {
                        console.warn(`[PluginSystem] Plugin "${manifest.id}" has no entry point index.ts or index.js.`);
                        continue;
                    }

                    // Dynamically import the module
                    console.log(`[PluginSystem] Loading plugin "${manifest.id}" from ${entryPath}`);
                    const module: PluginModule = await import(entryPath);
                    
                    this.plugins.set(manifest.id, { manifest, module, dirPath: pluginDir });
                    
                    // Call register hook if the plugin exports one
                    if (module.register) {
                        module.register(this, fastify);
                    }
                    
                    console.log(`[PluginSystem] Successfully loaded plugin "${manifest.name}" (${manifest.version})`);
                } catch (err) {
                    console.error(`[PluginSystem] Failed to load plugin from "${dir.name}":`, err);
                }
            }
        }
    }

    /**
     * Hook registration for plugins
     */
    on(event: string, callback: (...args: unknown[]) => unknown) {
        if (!this.hooks.has(event)) {
            this.hooks.set(event, []);
        }
        this.hooks.get(event)!.push(callback);
    }

    /**
     * Emit an event to all listening plugins
     */
    async emit(event: string, ...args: unknown[]) {
        const callbacks = this.hooks.get(event) || [];
        for (const cb of callbacks) {
            try {
                await cb(...args);
            } catch (err) {
                console.error(`[PluginSystem] Error executing hook for event "${event}":`, err);
            }
        }
    }

    /**
     * Get list of all discovered plugins
     */
    getPlugins(): PluginManifest[] {
        return Array.from(this.plugins.values()).map(p => p.manifest);
    }

    /**
     * Get a specific plugin by ID
     */
    getPlugin(pluginId: string) {
        return this.plugins.get(pluginId);
    }

    /**
     * Check if a plugin is active for a given project
     */
    async isPluginEnabled(projectId: number, pluginId: string): Promise<boolean> {
        const rows = await this.db.select()
            .from(projectPlugins)
            .where(and(
                eq(projectPlugins.projectId, projectId),
                eq(projectPlugins.pluginId, pluginId)
            ))
            .limit(1);
        return rows.length > 0 ? !!rows[0].enabled : false;
    }

    /**
     * Enable or disable a plugin for a project
     */
    async togglePlugin(projectId: number, pluginId: string, enabled: boolean): Promise<void> {
        const rows = await this.db.select()
            .from(projectPlugins)
            .where(and(
                eq(projectPlugins.projectId, projectId),
                eq(projectPlugins.pluginId, pluginId)
            ))
            .limit(1);

        if (rows.length > 0) {
            await this.db.update(projectPlugins)
                .set({ enabled })
                .where(and(
                    eq(projectPlugins.projectId, projectId),
                    eq(projectPlugins.pluginId, pluginId)
                ));
        } else {
            await this.db.insert(projectPlugins)
                .values({ projectId, pluginId, enabled });
        }
        
        // Emit toggle event
        await this.emit(enabled ? 'plugin.enabled' : 'plugin.disabled', { projectId, pluginId });
    }

    /**
     * Save a specific setting for a plugin in a project
     */
    async setSetting(projectId: number, pluginId: string, key: string, value: string): Promise<void> {
        const rows = await this.db.select()
            .from(pluginSettings)
            .where(and(
                eq(pluginSettings.projectId, projectId),
                eq(pluginSettings.pluginId, pluginId),
                eq(pluginSettings.key, key)
            ))
            .limit(1);

        if (rows.length > 0) {
            await this.db.update(pluginSettings)
                .set({ value })
                .where(and(
                    eq(pluginSettings.projectId, projectId),
                    eq(pluginSettings.pluginId, pluginId),
                    eq(pluginSettings.key, key)
                ));
        } else {
            await this.db.insert(pluginSettings)
                .values({ projectId, pluginId, key, value });
        }
    }

    /**
     * Get a specific setting for a plugin in a project
     */
    async getSetting(projectId: number, pluginId: string, key: string, defaultValue?: string): Promise<string | undefined> {
        const rows = await this.db.select()
            .from(pluginSettings)
            .where(and(
                eq(pluginSettings.projectId, projectId),
                eq(pluginSettings.pluginId, pluginId),
                eq(pluginSettings.key, key)
            ))
            .limit(1);
        return rows.length > 0 ? rows[0].value : defaultValue;
    }

    /**
     * Get all settings for a plugin in a project
     */
    async getSettings(projectId: number, pluginId: string): Promise<Record<string, string>> {
        const rows = await this.db.select()
            .from(pluginSettings)
            .where(and(
                eq(pluginSettings.projectId, projectId),
                eq(pluginSettings.pluginId, pluginId)
            ));
        
        const settingsObj: Record<string, string> = {};
        for (const row of rows) {
            settingsObj[row.key] = row.value;
        }
        return settingsObj;
    }

    /**
     * Download and install a plugin from a ZIP URL
     */
    async installPluginFromUrl(url: string, fastify?: FastifyInstance): Promise<PluginManifest> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download plugin from ${url}. Status: ${response.status} ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        const AdmZip = (await import("adm-zip")).default;
        const zip = new AdmZip(buffer);
        const entries = zip.getEntries();
        
        // Find manifest.json (could be nested inside a GitHub repository subfolder)
        const manifestEntry = entries.find(e => e.entryName === "manifest.json" || e.entryName.endsWith("/manifest.json"));
        if (!manifestEntry) {
            throw new Error("Invalid plugin zip: manifest.json not found.");
        }
        
        // Load manifest content
        const manifestContent = manifestEntry.getData().toString("utf8");
        const manifest: PluginManifest = JSON.parse(manifestContent);
        
        if (!manifest.id) {
            throw new Error("Invalid plugin manifest: missing 'id' field.");
        }
        
        // Determine the target directory path
        const pluginsPath = this.getPluginsDir();
        const targetDir = path.join(pluginsPath, manifest.id);
        
        // Ensure directory exists
        await mkdir(targetDir, { recursive: true });
        
        // Extract files
        // If the manifest was nested, we need to extract from that sub-folder prefix
        const isNested = manifestEntry.entryName.includes("/");
        const prefix = isNested ? manifestEntry.entryName.substring(0, manifestEntry.entryName.indexOf("/") + 1) : "";
        
        for (const entry of entries) {
            if (entry.isDirectory) continue;
            
            let targetRelativePath = entry.entryName;
            if (prefix && targetRelativePath.startsWith(prefix)) {
                targetRelativePath = targetRelativePath.substring(prefix.length);
            }
            
            const destPath = path.join(targetDir, targetRelativePath);
            await mkdir(path.dirname(destPath), { recursive: true });
            
            const fileData = entry.getData();
            await Bun.write(destPath, fileData);
        }
        
        console.log(`[PluginSystem] Extracted plugin ${manifest.id} into ${targetDir}`);
        
        // Load entry point dynamically
        let entryPath = path.join(targetDir, "index.ts");
        if (!(await Bun.file(entryPath).exists())) {
            entryPath = path.join(targetDir, "index.js");
        }

        if (await Bun.file(entryPath).exists()) {
            // Dynamically import the module
            console.log(`[PluginSystem] Loading newly installed plugin "${manifest.id}" from ${entryPath}`);
            const module: PluginModule = await import(entryPath);
            
            this.plugins.set(manifest.id, { manifest, module, dirPath: targetDir });
            
            // Call register hook if the plugin exports one
            if (module.register) {
                module.register(this, fastify);
            }
            
            console.log(`[PluginSystem] Successfully loaded plugin "${manifest.name}" (${manifest.version})`);
        } else {
            console.warn(`[PluginSystem] Newly installed plugin "${manifest.id}" has no entry point index.ts or index.js.`);
            // Save manifest anyway so it shows up in list (e.g. static template extension only or frontend-only view plugins)
            this.plugins.set(manifest.id, { manifest, module: {}, dirPath: targetDir });
        }
        
        return manifest;
    }

    /**
     * Completely uninstalls a plugin:
     * 1. If plugin module exports an unregister/uninstall hook, trigger it.
     * 2. Delete plugin folder on filesystem.
     * 3. Clear database associations and settings.
     * 4. Remove from in-memory plugins Map.
     */
    async uninstallPlugin(pluginId: string): Promise<void> {
        const plugin = this.getPlugin(pluginId);
        let dirPath: string;

        if (plugin) {
            if (plugin.module && typeof plugin.module.unregister === 'function') {
                try {
                    await plugin.module.unregister(this);
                } catch (err) {
                    console.error(`[PluginSystem] Error calling unregister hook for plugin "${pluginId}":`, err);
                }
            }
            dirPath = plugin.dirPath;
        } else {
            const pluginsPath = this.getPluginsDir();
            dirPath = path.join(pluginsPath, pluginId);
        }

        // 1. Delete files from filesystem
        try {
            await rm(dirPath, { recursive: true, force: true });
            console.log(`[PluginSystem] Deleted plugin directory from disk: ${dirPath}`);
        } catch (err) {
            console.error(`[PluginSystem] Failed to delete directory ${dirPath}:`, err);
        }

        // 2. Clear Database records (purge settings and projects relationship)
        await this.db.delete(projectPlugins).where(eq(projectPlugins.pluginId, pluginId));
        await this.db.delete(pluginSettings).where(eq(pluginSettings.pluginId, pluginId));

        // 3. Remove from memory
        this.plugins.delete(pluginId);

        console.log(`[PluginSystem] Successfully uninstalled plugin "${pluginId}"`);
    }
}
