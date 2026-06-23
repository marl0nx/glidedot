import { sqliteTable, text, integer, uniqueIndex, primaryKey } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Projects Table
export const projects = sqliteTable('projects', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull().unique(),
    sourceLanguageId: integer('source_language_id').references(() => languages.id),
    reviewEnabled: integer('review_enabled', { mode: 'boolean' }).notNull().default(false),
    requireTemplate: integer('require_template', { mode: 'boolean' }).notNull().default(false),
    inContextUrl: text('in_context_url'),
});

// Languages Table
export const languages = sqliteTable('languages', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    code: text('code').notNull().unique(), // e.g., 'en', 'de'
    name: text('name').notNull().unique(),
    flag: text('flag'),
});

// Join Table for Projects and Languages
export const projectLanguages = sqliteTable('project_languages', {
    projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    languageId: integer('language_id').notNull().references(() => languages.id, { onDelete: 'cascade' }),
}, (table) => ({
    pk: primaryKey({ columns: [table.projectId, table.languageId] }),
}));

// Labels Table
export const labels = sqliteTable('labels', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').notNull(), // Hex color
}, (table) => ({
    labelIdx: uniqueIndex('name_project_idx').on(table.projectId, table.name),
}));

// Translation Keys Table
export const translationKeys = sqliteTable('translation_keys', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
}, (table) => ({
    keyIdx: uniqueIndex('key_project_idx').on(table.projectId, table.key),
}));

// Translations Table
export const translations = sqliteTable('translations', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    keyId: integer('key_id').notNull().references(() => translationKeys.id, { onDelete: 'cascade' }),
    languageId: integer('language_id').notNull().references(() => languages.id, { onDelete: 'cascade' }),
    value: text('value').notNull(),
    draftValue: text('draft_value'),
    reviewStatus: text('review_status').notNull().default('APPROVED'), // 'APPROVED', 'PENDING_REVIEW', 'REJECTED'
    authorId: integer('author_id'),
}, (table) => ({
    translationIdx: uniqueIndex('translation_key_lang_idx').on(table.keyId, table.languageId),
}));

// Join Table for Keys and Labels
export const keysToLabels = sqliteTable('keys_to_labels', {
    keyId: integer('key_id').notNull().references(() => translationKeys.id, { onDelete: 'cascade' }),
    labelId: integer('label_id').notNull().references(() => labels.id, { onDelete: 'cascade' }),
}, (table) => ({
    pk: primaryKey({ columns: [table.keyId, table.labelId] }),
}));

// Activity Logs Table
export const activityLogs = sqliteTable('activity_logs', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id'),
    projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }),
    action: text('action').notNull(),
    details: text('details').notNull(),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Key Templates Table
export const keyTemplates = sqliteTable('key_templates', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    segments: text('segments').notNull(), // JSON string
});

// Key Glossary Table
export const keyGlossary = sqliteTable('key_glossary', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    badWord: text('bad_word').notNull(),
    goodWord: text('good_word').notNull(),
}, (table) => ({
    glossaryIdx: uniqueIndex('glossary_project_idx').on(table.projectId, table.badWord),
}));

// Key Variables Table (for Shared Enums)
export const keyVariables = sqliteTable('key_variables', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    options: text('options').notNull(), // JSON string array or comma separated
}, (table) => ({
    variableIdx: uniqueIndex('variable_project_idx').on(table.projectId, table.name),
}));
