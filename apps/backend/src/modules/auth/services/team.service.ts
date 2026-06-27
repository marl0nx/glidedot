import { FastifyInstance } from 'fastify';
import { users } from '../../admin/users/schema';
import { teams, teamMembers, teamProjects } from '../../admin/teams/schema';
import { eq, and } from 'drizzle-orm';

export class TeamService {
    constructor(private db: FastifyInstance['db']) {}

    async createTeam(name: string) {
        return this.db.insert(teams).values({ name, oidcMappedGroups: '[]' }).returning();
    }

    async getAllTeams() {
        const allTeams = await this.db.select().from(teams);
        
        const allMembers = await this.db.select({
            teamId: teamMembers.teamId,
            userId: teamMembers.userId,
            username: users.username
        }).from(teamMembers).innerJoin(users, eq(teamMembers.userId, users.id));

        // Dynamically add OIDC members based on mapped groups
        const oidcUsers = await this.db.select({
            id: users.id,
            username: users.username,
            oidcGroups: users.oidcGroups
        }).from(users);

        for (const u of oidcUsers) {
            if (u.oidcGroups) {
                try {
                    const userGroups: string[] = JSON.parse(u.oidcGroups).map((g: string) => g.toLowerCase());
                    for (const team of allTeams) {
                        if (team.oidcMappedGroups) {
                            const mappedGroups: string[] = JSON.parse(team.oidcMappedGroups).map((g: string) => g.toLowerCase());
                            const hasMatch = mappedGroups.some(mg => userGroups.includes(mg));
                            if (hasMatch) {
                                // Check if already in the list to avoid duplicates
                                if (!allMembers.some(m => m.teamId === team.id && m.userId === u.id)) {
                                    allMembers.push({
                                        teamId: team.id,
                                        userId: u.id,
                                        username: u.username
                                    });
                                }
                            }
                        }
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }
        }

        const allProjects = await this.db.select().from(teamProjects);

        return allTeams.map(t => ({
            ...t,
            members: allMembers.filter(m => m.teamId === t.id),
            projects: allProjects.filter(p => p.teamId === t.id).map(p => p.projectId)
        }));
    }

    async deleteTeam(teamId: number) {
        // Delete relationships first to prevent foreign key constraint issues
        await this.db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
        await this.db.delete(teamProjects).where(eq(teamProjects.teamId, teamId));
        return this.db.delete(teams).where(eq(teams.id, teamId)).returning();
    }

    async addMember(teamId: number, userId: number) {
        return this.db.insert(teamMembers).values({ teamId, userId }).onConflictDoNothing().returning();
    }

    async addProjectToTeam(teamId: number, projectId: number) {
        return this.db.insert(teamProjects).values({ teamId, projectId }).onConflictDoNothing().returning();
    }

    async removeMember(teamId: number, userId: number) {
        return this.db.delete(teamMembers).where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))).returning();
    }

    async removeProjectFromTeam(teamId: number, projectId: number) {
        return this.db.delete(teamProjects).where(and(eq(teamProjects.teamId, teamId), eq(teamProjects.projectId, projectId))).returning();
    }



    async checkProjectAccess(userId: number, projectId: number) {
        // Check if user is in a team that has access to the project
        const results = await this.db.select()
            .from(teamMembers)
            .innerJoin(teamProjects, eq(teamMembers.teamId, teamProjects.teamId))
            .where(and(
                eq(teamMembers.userId, userId),
                eq(teamProjects.projectId, projectId)
            ));
        return results.length > 0;
    }

    async updateTeam(teamId: number, data: { name?: string; oidcMappedGroups?: string }) {
        return this.db.update(teams).set(data).where(eq(teams.id, teamId)).returning();
    }
}
