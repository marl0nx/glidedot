import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { projects } from '../localization/schema';

// Table to track which plugins are active per project
export const projectPlugins = sqliteTable('project_plugins', {
    projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    pluginId: text('plugin_id').notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
}, (table) => ({
    pk: primaryKey({ columns: [table.projectId, table.pluginId] }),
}));

// Table to store plugin settings per project
export const pluginSettings = sqliteTable('plugin_settings', {
    projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    pluginId: text('plugin_id').notNull(),
    key: text('key').notNull(),
    value: text('value').notNull(), // can store JSON or raw text
}, (table) => ({
    pk: primaryKey({ columns: [table.projectId, table.pluginId, table.key] }),
}));
