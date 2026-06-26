import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Users Table
export const users = sqliteTable('users', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    username: text('username').notNull().unique(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    apiKey: text('api_key').notNull().unique(),
    isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
    isOidc: integer('is_oidc', { mode: 'boolean' }).notNull().default(false),
    isReviewer: integer('is_reviewer', { mode: 'boolean' }).notNull().default(false),
    requiresReview: integer('requires_review', { mode: 'boolean' }).notNull().default(false),
    allowSuggestions: integer('allow_suggestions', { mode: 'boolean' }).notNull().default(true),
    enableSuggestions: integer('enable_suggestions', { mode: 'boolean' }).notNull().default(true),
    translationQuota: integer('translation_quota').notNull().default(500),
    baseTranslationQuota: integer('base_translation_quota').notNull().default(500),
    quotaResetPeriodValue: integer('quota_reset_period_value'),
    quotaResetPeriodUnit: text('quota_reset_period_unit'),
    quotaNextResetAt: integer('quota_next_reset_at', { mode: 'timestamp' }),
    avatarUrl: text('avatar_url'),
    oidcGroups: text('oidc_groups'),
    alertConfig: text('alert_config', { mode: 'json' }).$type<{
        provider: 'none' | 'discord' | 'slack' | 'ntfy' | 'custom' | 'telegram' | 'gotify';
        url: string;
        events: string[];
        pingUserId?: string;
        avatarUrl?: string;
    }>(),
});
