import { FastifyInstance } from 'fastify';
import { users } from '../../admin/users/schema';
import { systemSettings } from '../../settings/schema';
import { projects, languages } from '../../localization/schema';
import { eq } from 'drizzle-orm';
import { UserService } from './user.service';
import { ProjectService } from '../../localization/projects/services/project.service';
import { LanguageService } from '../../localization/languages/services/language.service';
import * as fs from 'node:fs';

export class SetupService {
    constructor(private db: FastifyInstance['db']) {}

    async isSetupRequired() {
        // Setup is required if no admin user exists OR no system settings initialized
        const adminExists = await this.db.select().from(users).where(eq(users.isAdmin, true)).limit(1);
        const settingsExist = await this.db.select().from(systemSettings).limit(1);

        return adminExists.length === 0 || settingsExist.length === 0;
    }

    async getSettings() {
        return this.db.select().from(systemSettings);
    }

    async updateSetting(key: string, value: string) {
        return this.db.insert(systemSettings)
            .values({ key, value })
            .onConflictDoUpdate({
                target: systemSettings.key,
                set: { value }
            })
            .returning();
    }

    async performInitialSetup(data: {
        initialProjectName?: string,
        adminPassword?: string
    }) {
        const userService = new UserService(this.db);
        const projectService = new ProjectService(this.db);
        const languageService = new LanguageService(this.db);

        // Ensure database directory exists
        if (!fs.existsSync('data')) {
            fs.mkdirSync('data');
        }

        // 1. Create default languages if they don't exist
        const defaultLangs = [
            { code: 'en', name: 'English' },
            { code: 'de', name: 'German' }
        ];

        for (const lang of defaultLangs) {
            const existing = await this.db.select().from(languages).where(eq(languages.code, lang.code));
            if (existing.length === 0) {
                await languageService.create(lang);
            }
        }

        const [enLang] = await this.db.select().from(languages).where(eq(languages.code, 'en'));

        // 2. Create Admin if not exists
        const admin = await userService.getByUsername('admin');
        if (!admin) {
            await userService.createUser({
                username: 'admin',
                email: 'admin@glide.local',
                password: data.adminPassword || 'admin',
                isAdmin: true
            });
        } else if (data.adminPassword) {
            await userService.updatePassword(admin.id, data.adminPassword);
        }

        // 3. Save Settings
        await this.updateSetting('SETUP_COMPLETED', 'true');

        // 4. Create Initial Project if requested
        if (data.initialProjectName) {
            const existing = await this.db.select().from(projects).where(eq(projects.name, data.initialProjectName));
            if (existing.length === 0) {
                await projectService.create({
                    name: data.initialProjectName,
                    sourceLanguageId: enLang.id
                });
            }
        }

        return { success: true };
    }
}
