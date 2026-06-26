import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { users } from "../users/schema";
import { projects } from "../localization/schema";

export const userGitConnections = sqliteTable('user_git_connections', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(), // 'github', 'gitlab', 'forgejo'
    token: text('token').notNull(),
    baseUrl: text('base_url'), // for self-hosted gitlab/forgejo
}, (table) => ({
    userProviderIdx: uniqueIndex('user_provider_idx').on(table.userId, table.provider),
}));

export const projectGitSyncs = sqliteTable('project_git_syncs', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(), // 'github', 'gitlab', 'forgejo'
    repoName: text('repo_name').notNull(),
    branch: text('branch').notNull(),
    filePath: text('file_path').notNull(), // e.g., 'locales/{{lang}}.json'
    lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
    lastSyncedBy: integer('last_synced_by').references(() => users.id, { onDelete: 'set null' }),
}, (table) => ({
    projectProviderIdx: uniqueIndex('project_provider_idx').on(table.projectId, table.provider),
}));
