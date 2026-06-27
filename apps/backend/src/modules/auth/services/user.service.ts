import { FastifyInstance } from 'fastify';
import { users } from '../../admin/users/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';

export const validatePasswordStrength = (password: string) => {
    const isLengthValid = password.length >= 12;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    if (!isLengthValid || !hasUpper || !hasLower || !hasSpecial) {
        throw new Error('Password must be at least 12 characters long and contain at least one uppercase letter, one lowercase letter, and one special character.');
    }
}

export class UserService {
    constructor(private db: FastifyInstance['db']) {}

    async getByUserId(userId: number) {
        const result = await this.db.select().from(users).where(eq(users.id, userId));
        return result[0];
    }

    async getByUsername(username: string) {
        const result = await this.db.select().from(users).where(eq(users.username, username));
        return result[0];
    }

    async getByApiKey(apiKey: string) {
        const result = await this.db.select().from(users).where(eq(users.apiKey, apiKey));
        return result[0];
    }

    async getAllUsers() {
        return this.db.select({
            id: users.id,
            username: users.username,
            email: users.email,
            isAdmin: users.isAdmin,
            isOidc: users.isOidc,
            allowSuggestions: users.allowSuggestions,
            enableSuggestions: users.enableSuggestions,
            translationQuota: users.translationQuota,
            baseTranslationQuota: users.baseTranslationQuota,
            quotaResetPeriodValue: users.quotaResetPeriodValue,
            quotaResetPeriodUnit: users.quotaResetPeriodUnit,
            quotaNextResetAt: users.quotaNextResetAt,
            avatarUrl: users.avatarUrl,
            apiKey: users.apiKey
        }).from(users);
    }

    async createAdminIfNotExists() {
        const existingAdmins = await this.db.select().from(users).where(eq(users.isAdmin, true)).limit(1);
        if (existingAdmins.length === 0) {
            const passwordHash = await Bun.password.hash('admin');
            const apiKey = `gl_${randomBytes(24).toString('hex')}`;
            await this.db.insert(users).values({
                username: 'admin',
                email: 'admin@glide.local',
                passwordHash,
                apiKey,
                isAdmin: true,
            });
            console.log(`Admin user created. API Key: ${apiKey}`);
        }
    }

    async createUser(data: { username: string; email: string; password: string; isAdmin?: boolean; isOidc?: boolean; isReviewer?: boolean; requiresReview?: boolean; avatarUrl?: string; oidcGroups?: string }) {
        validatePasswordStrength(data.password);
        const passwordHash = await Bun.password.hash(data.password);
        const apiKey = `gl_${randomBytes(24).toString('hex')}`;
        return this.db.insert(users).values({
            ...data,
            passwordHash,
            apiKey,
        }).returning();
    }

    async updateApiKey(userId: number) {
        const newApiKey = `gl_${randomBytes(24).toString('hex')}`;
        return this.db.update(users)
            .set({ apiKey: newApiKey })
            .where(eq(users.id, userId))
            .returning();
    }

    async updatePassword(userId: number, newPassword: string) {
        validatePasswordStrength(newPassword);
        const passwordHash = await Bun.password.hash(newPassword);
        return this.db.update(users)
            .set({ passwordHash })
            .where(eq(users.id, userId))
            .returning();
    }

    async updateUser(userId: number, data: Partial<{ username: string; email: string; password?: string; isAdmin: boolean; isOidc: boolean; isReviewer: boolean; requiresReview: boolean; allowSuggestions: boolean; enableSuggestions: boolean; translationQuota: number; baseTranslationQuota: number; quotaResetPeriodValue: number | null; quotaResetPeriodUnit: string | null; avatarUrl: string; oidcGroups: string; alertConfig: any }>) {
        const updateData: any = { ...data };
        if (updateData.password) {
            validatePasswordStrength(updateData.password);
            updateData.passwordHash = await Bun.password.hash(updateData.password);
            delete updateData.password;
        }
        if (updateData.allowSuggestions === false) {
            updateData.enableSuggestions = false;
        }
        
        if (updateData.quotaResetPeriodValue !== undefined || updateData.quotaResetPeriodUnit !== undefined) {
            const user = await this.getByUserId(userId);
            const value = updateData.quotaResetPeriodValue !== undefined ? updateData.quotaResetPeriodValue : user.quotaResetPeriodValue;
            const unit = updateData.quotaResetPeriodUnit !== undefined ? updateData.quotaResetPeriodUnit : user.quotaResetPeriodUnit;
            
            if (value && unit) {
                const nextReset = new Date();
                if (unit === 'days') nextReset.setDate(nextReset.getDate() + value);
                else if (unit === 'weeks') nextReset.setDate(nextReset.getDate() + value * 7);
                else if (unit === 'months') nextReset.setMonth(nextReset.getMonth() + value);
                updateData.quotaNextResetAt = nextReset;
            } else {
                updateData.quotaNextResetAt = null;
                updateData.quotaResetPeriodValue = null;
                updateData.quotaResetPeriodUnit = null;
            }
        }

        return this.db.update(users)
            .set(updateData)
            .where(eq(users.id, userId))
            .returning();
    }

    async deleteUser(userId: number) {
        return this.db.delete(users).where(eq(users.id, userId));
    }

    async verifyPassword(password: string, passwordHash: string) {
        return Bun.password.verify(password, passwordHash);
    }
}
