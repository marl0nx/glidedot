import { FastifyInstance } from "fastify";

export default async function adminRoutes(fastify: FastifyInstance) {
    const { requireAdmin } = fastify.authHooks;

    fastify.get('/activity-logs/leaderboard', { preHandler: [requireAdmin] }, async (request) => {
        const { activityLogs } = await import('../../localization/schema');
        const { users } = await import('../users/schema');
        const { gte } = await import('drizzle-orm');

        const query = request.query as { timeframe?: string };
        const timeframe = query.timeframe || '30d';

        let fromDate = new Date(0);
        const now = new Date();
        if (timeframe === 'today') {
            fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (timeframe === '7d') {
            fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (timeframe === '14d') {
            fromDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        } else if (timeframe === '30d') {
            fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        } else if (timeframe === '60d') {
            fromDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        } else if (timeframe === '90d') {
            fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        } else if (timeframe === '180d') {
            fromDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        } else if (timeframe === 'year') {
            fromDate = new Date(now.getFullYear(), 0, 1);
        }

        const dateStr = fromDate.toISOString().replace('T', ' ').slice(0, 19);

        const allUsers = await fastify.db.select({
            id: users.id,
            username: users.username,
            avatarUrl: users.avatarUrl
        }).from(users);

        const logsQuery = fastify.db.select({
            userId: activityLogs.userId,
            details: activityLogs.details,
            action: activityLogs.action,
            createdAt: activityLogs.createdAt
        })
        .from(activityLogs);
        
        let logs;
        if (timeframe !== 'all') {
            logs = await logsQuery.where(gte(activityLogs.createdAt, dateStr));
        } else {
            logs = await logsQuery;
        }
        
        const userStats = allUsers.map(u => ({
            id: u.id,
            username: u.username,
            avatarUrl: u.avatarUrl,
            translationsUpdated: 0,
            keysCreated: 0,
            labelsCreated: 0,
            languagesAdded: 0,
            totalActivity: 0,
            lastActivity: null as string | null,
            averageTranslationSpeedMs: 0,
            timeSpentArr: [] as number[],
            topLanguages: [] as { code: string, count: number }[]
        }));

        const userMap = new Map(userStats.map(u => [u.id, u]));
        const langCounts = new Map<number, Map<string, number>>();

        for (const log of logs) {
            if (!log.userId) continue;
            const stats = userMap.get(log.userId);
            if (!stats) continue;

            stats.totalActivity++;

            if (!stats.lastActivity || new Date(log.createdAt) > new Date(stats.lastActivity)) {
                stats.lastActivity = log.createdAt;
            }

            if (log.action === 'TRANSLATION_UPDATED') {
                stats.translationsUpdated++;
                try {
                    const details = JSON.parse(log.details);
                    if (details.languageCode) {
                        if (!langCounts.has(log.userId)) langCounts.set(log.userId, new Map());
                        const userLangs = langCounts.get(log.userId)!;
                        userLangs.set(details.languageCode, (userLangs.get(details.languageCode) || 0) + 1);
                    }
                    if (!details.isAutomated && details.timeSpentMs && details.timeSpentMs > 0) {
                        stats.timeSpentArr.push(details.timeSpentMs);
                    }
                } catch {}
            } else if (log.action === 'KEY_CREATED') {
                stats.keysCreated++;
            } else if (log.action === 'LABEL_CREATED') {
                stats.labelsCreated++;
            } else if (log.action === 'LANGUAGE_ADDED') {
                stats.languagesAdded++;
            }
        }

        for (const stats of userStats) {
            const langs = langCounts.get(stats.id);
            if (langs) {
                stats.topLanguages = Array.from(langs.entries())
                    .map(([code, count]) => ({ code, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 3);
            }
            
            if (stats.timeSpentArr.length > 0) {
                const sum = stats.timeSpentArr.reduce((acc, val) => acc + val, 0);
                stats.averageTranslationSpeedMs = sum / stats.timeSpentArr.length;
            }
            // @ts-expect-error - timeSpentArr is an internal aggregation field not part of the response type
            delete stats.timeSpentArr;
        }

        userStats.sort((a, b) => b.totalActivity - a.totalActivity);

        return { data: userStats };
    });

    fastify.get('/activity-logs/automation', { preHandler: [requireAdmin] }, async (request) => {
        const { activityLogs } = await import('../../localization/schema');
        const { eq, and, gte, or } = await import('drizzle-orm');

        const query = request.query as { timeframe?: string };
        const timeframe = query.timeframe || '30d';

        let fromDate = new Date(0);
        const now = new Date();
        if (timeframe === 'today') {
            fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (timeframe === '7d') {
            fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (timeframe === '14d') {
            fromDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        } else if (timeframe === '30d') {
            fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        } else if (timeframe === '60d') {
            fromDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        } else if (timeframe === '90d') {
            fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        } else if (timeframe === '180d') {
            fromDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        } else if (timeframe === 'year') {
            fromDate = new Date(now.getFullYear(), 0, 1);
        }

        const dateStr = fromDate.toISOString().replace('T', ' ').slice(0, 19);

        const conditions = [
            or(eq(activityLogs.action, 'TRANSLATION_UPDATED'), eq(activityLogs.action, 'AUTO_TRANSLATED'))
        ];

        if (timeframe !== 'all') {
            conditions.push(gte(activityLogs.createdAt, dateStr));
        }

        const logs = await fastify.db.select({
            action: activityLogs.action,
            details: activityLogs.details,
            createdAt: activityLogs.createdAt
        })
        .from(activityLogs)
        .where(and(...conditions));

        const timeSpentArr: number[] = [];
        const dailyStats = new Map<string, { manualCount: number, autoCount: number, timeSavedMs: number }>();

        for (const log of logs) {
            const d = new Date(log.createdAt);
            let dateKey = '';
            if (timeframe === 'today') {
                dateKey = d.toISOString().substring(0, 13) + ':00:00.000Z';
            } else {
                dateKey = d.toISOString().split('T')[0];
            }
            
            if (!dailyStats.has(dateKey)) {
                dailyStats.set(dateKey, { manualCount: 0, autoCount: 0, timeSavedMs: 0 });
            }
            
            const stats = dailyStats.get(dateKey)!;

            try {
                if (log.details) {
                    const parsed = JSON.parse(log.details);
                    if (log.action === 'AUTO_TRANSLATED') {
                        stats.autoCount += parsed.count || 1;
                    } else if (log.action === 'TRANSLATION_UPDATED') {
                        if (parsed.isAutomated) {
                            stats.autoCount++;
                        } else {
                            stats.manualCount++;
                            if (parsed.timeSpentMs && parsed.timeSpentMs > 0) {
                                timeSpentArr.push(parsed.timeSpentMs);
                            }
                        }
                    }
                }
            } catch {}
        }

        let averageSpeedMs = 0;
        if (timeSpentArr.length > 0) {
            const sum = timeSpentArr.reduce((acc, val) => acc + val, 0);
            averageSpeedMs = sum / timeSpentArr.length;
        }

        let totalTimeSavedMs = 0;
        let totalAuto = 0;
        let totalManual = 0;

        const timeline: { date: string, manualCount: number, autoCount: number, timeSavedMs: number }[] = [];
        
        // Populate the timeline and calculate time saved based on average speed
        // To show 0s for missing days, we'll iterate through the date range
        let currentDate = new Date(fromDate);
        currentDate.setUTCHours(0, 0, 0, 0);

        if (timeframe === 'all') {
            // Find earliest date
            if (logs.length > 0) {
                const earliest = logs.reduce((min: Date, log: { createdAt: string }) => {
                    const d = new Date(log.createdAt);
                    return d < min ? d : min;
                }, new Date());
                currentDate = new Date(earliest);
                currentDate.setUTCHours(0, 0, 0, 0);
            }
        }

        const end = new Date();
        end.setUTCHours(23, 59, 59, 999);

        while (currentDate <= end) {
            let dateKey = '';
            if (timeframe === 'today') {
                dateKey = currentDate.toISOString().substring(0, 13) + ':00:00.000Z';
            } else {
                dateKey = currentDate.toISOString().split('T')[0];
            }
            const stats = dailyStats.get(dateKey) || { manualCount: 0, autoCount: 0, timeSavedMs: 0 };
            
            const timeSaved = stats.autoCount * averageSpeedMs;
            
            totalTimeSavedMs += timeSaved;
            totalAuto += stats.autoCount;
            totalManual += stats.manualCount;

            timeline.push({
                date: dateKey,
                manualCount: stats.manualCount,
                autoCount: stats.autoCount,
                timeSavedMs: timeSaved
            });
            if (timeframe === 'today') {
                currentDate.setUTCHours(currentDate.getUTCHours() + 1);
            } else {
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }

        return {
            data: {
                timeline,
                summary: {
                    totalManual,
                    totalAuto,
                    totalTimeSavedMs,
                    averageSpeedMs
                }
            }
        };
    });

    fastify.get('/activity-logs', { preHandler: [requireAdmin] }, async (request) => {
        const { activityLogs } = await import('../../localization/schema');
        const { projects } = await import('../../localization/schema');
        const { users } = await import('../users/schema');
        const { desc, eq, sql, or, like } = await import('drizzle-orm');

        const query = request.query as { page?: string, limit?: string, search?: string };
        const page = parseInt(query.page || '1', 10);
        const limit = parseInt(query.limit || '50', 10);
        const offset = (page - 1) * limit;
        const searchTerm = query.search ? `%${query.search.toLowerCase()}%` : null;
        
        const conditions = searchTerm ? or(
            like(sql`lower(${activityLogs.action})`, searchTerm),
            like(sql`lower(${activityLogs.details})`, searchTerm)
        ) : undefined;

        const [totalResult] = await fastify.db.select({ count: sql<number>`count(*)` })
            .from(activityLogs)
            .where(conditions);
        const total = Number(totalResult?.count || 0);

        const logs = await fastify.db.select({
            id: activityLogs.id,
            action: activityLogs.action,
            details: activityLogs.details,
            createdAt: activityLogs.createdAt,
            username: users.username,
            avatarUrl: users.avatarUrl,
            projectName: projects.name
        })
        .from(activityLogs)
        .leftJoin(users, eq(activityLogs.userId, users.id))
        .leftJoin(projects, eq(activityLogs.projectId, projects.id))
        .where(conditions)
        .orderBy(desc(activityLogs.createdAt))
        .limit(limit)
        .offset(offset);
        
        return {
            data: logs,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    });
}
