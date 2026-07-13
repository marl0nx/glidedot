import { eq, and } from "drizzle-orm";
import { userGitConnections, projectGitSyncs } from "../schema";
import { users } from "../../admin/users/schema";
import { languages, projectLanguages, translationKeys, translations } from "../../localization/schema";
import { encryptString, decryptString } from "../../../utils/encryption";

export class GitService {
    private db: any;

    constructor(db: any) {
        this.db = db;
    }

    async getUserConnections(userId: number) {
        return this.db.select().from(userGitConnections).where(eq(userGitConnections.userId, userId));
    }

    async saveUserConnection(userId: number, provider: 'github' | 'gitlab' | 'forgejo', token: string, baseUrl?: string) {
        let url = '';
        const headers: Record<string, string> = {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        };

        if (provider === 'github') {
            url = 'https://api.github.com/user';
            headers['X-GitHub-Api-Version'] = '2022-11-28';
            headers['User-Agent'] = 'glide.-App';
        } else if (provider === 'gitlab') {
            const base = baseUrl?.replace(/\/$/, '') || 'https://gitlab.com';
            url = `${base}/api/v4/user`;
        } else if (provider === 'forgejo') {
            if (!baseUrl) {
                const err = new Error('Base URL is required for Forgejo/Gitea');
                (err as any).statusCode = 400;
                throw err;
            }
            const base = baseUrl.replace(/\/$/, '');
            url = `${base}/api/v1/user`;
        }

        try {
            const res = await fetch(url, { headers });
            if (!res.ok) {
                const err = new Error(`Invalid Token: Provider returned ${res.status}`);
                (err as any).statusCode = 400;
                throw err;
            }
        } catch (e: any) {
            if (e.statusCode === 400) throw e;
            const err = new Error(`Connection failed: ${e.message}`);
            (err as any).statusCode = 400;
            throw err;
        }
        const existing = await this.db.select().from(userGitConnections)
            .where(and(eq(userGitConnections.userId, userId), eq(userGitConnections.provider, provider)))
            .limit(1);
        
        if (existing.length > 0) {
            return this.db.update(userGitConnections)
                .set({ token: encryptString(token), baseUrl })
                .where(eq(userGitConnections.id, existing[0].id))
                .returning();
        } else {
            return this.db.insert(userGitConnections)
                .values({ userId, provider, token: encryptString(token), baseUrl })
                .returning();
        }
    }

    async deleteUserConnection(userId: number, provider: 'github' | 'gitlab' | 'forgejo') {
        return this.db.delete(userGitConnections)
            .where(and(eq(userGitConnections.userId, userId), eq(userGitConnections.provider, provider)));
    }

    async getProjectSyncs(projectId: number) {
        const syncs = await this.db.select({
            sync: projectGitSyncs,
            user: users
        })
        .from(projectGitSyncs)
        .leftJoin(users, eq(projectGitSyncs.lastSyncedBy, users.id))
        .where(eq(projectGitSyncs.projectId, projectId));

        return syncs.map((row: any) => ({
            ...row.sync,
            lastSyncedByName: row.user?.username || null
        }));
    }

    async saveProjectSync(projectId: number, data: { provider: 'github' | 'gitlab' | 'forgejo', repoName: string, branch: string, filePath: string }) {
        const existing = await this.db.select().from(projectGitSyncs)
            .where(and(eq(projectGitSyncs.projectId, projectId), eq(projectGitSyncs.provider, data.provider)))
            .limit(1);
        
        if (existing.length > 0) {
            return this.db.update(projectGitSyncs)
                .set(data)
                .where(eq(projectGitSyncs.id, existing[0].id))
                .returning();
        } else {
            return this.db.insert(projectGitSyncs)
                .values({ projectId, ...data })
                .returning();
        }
    }

    async deleteProjectSync(id: number) {
        return this.db.delete(projectGitSyncs).where(eq(projectGitSyncs.id, id));
    }

    async getRepos(userId: number, provider: 'github' | 'gitlab' | 'forgejo') {
        const conn = await this.getConnection(userId, provider);
        if (!conn) throw new Error("Connection not found");

        if (provider === 'github') {
            const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
                headers: { 'Authorization': `Bearer ${conn.token}`, 'Accept': 'application/vnd.github.v3+json' }
            });
            if (!res.ok) throw new Error(`GitHub API Error: ${res.status}`);
            const data = await res.json();
            return data.map((r: any) => ({ id: r.id.toString(), name: r.full_name, defaultBranch: r.default_branch }));
        } else if (provider === 'gitlab') {
            const baseUrl = conn.baseUrl || 'https://gitlab.com';
            const res = await fetch(`${baseUrl}/api/v4/projects?membership=true&per_page=100&order_by=updated_at`, {
                headers: { 'Authorization': `Bearer ${conn.token}` }
            });
            if (!res.ok) throw new Error(`GitLab API Error: ${res.status}`);
            const data = await res.json();
            return data.map((r: any) => ({ id: r.id.toString(), name: r.path_with_namespace, defaultBranch: r.default_branch }));
        } else if (provider === 'forgejo') {
            const baseUrl = conn.baseUrl;
            if (!baseUrl) throw new Error("Base URL required for Forgejo");
            const res = await fetch(`${baseUrl}/api/v1/user/repos?limit=100`, {
                headers: { 'Authorization': `token ${conn.token}` }
            });
            if (!res.ok) throw new Error(`Forgejo API Error: ${res.status}`);
            const data = await res.json();
            return data.map((r: any) => ({ id: r.id.toString(), name: r.full_name, defaultBranch: r.default_branch }));
        }
        return [];
    }

    async getBranches(userId: number, provider: 'github' | 'gitlab' | 'forgejo', repoName: string) {
        const conn = await this.getConnection(userId, provider);
        if (!conn) throw new Error("Connection not found");

        if (provider === 'github') {
            const res = await fetch(`https://api.github.com/repos/${repoName}/branches`, {
                headers: { 'Authorization': `Bearer ${conn.token}`, 'Accept': 'application/vnd.github.v3+json' }
            });
            if (!res.ok) throw new Error(`GitHub API Error: ${res.status}`);
            const data = await res.json();
            return data.map((b: any) => ({ name: b.name }));
        } else if (provider === 'gitlab') {
            const baseUrl = conn.baseUrl || 'https://gitlab.com';
            const encodedRepo = encodeURIComponent(repoName);
            const res = await fetch(`${baseUrl}/api/v4/projects/${encodedRepo}/repository/branches`, {
                headers: { 'Authorization': `Bearer ${conn.token}` }
            });
            if (!res.ok) throw new Error(`GitLab API Error: ${res.status}`);
            const data = await res.json();
            return data.map((b: any) => ({ name: b.name }));
        } else if (provider === 'forgejo') {
            const baseUrl = conn.baseUrl;
            if (!baseUrl) throw new Error("Base URL required for Forgejo");
            const res = await fetch(`${baseUrl}/api/v1/repos/${repoName}/branches`, {
                headers: { 'Authorization': `token ${conn.token}` }
            });
            if (!res.ok) throw new Error(`Forgejo API Error: ${res.status}`);
            const data = await res.json();
            return data.map((b: any) => ({ name: b.name }));
        }
        return [];
    }

    async executeSync(syncId: number, userId: number) {
        const syncRes = await this.db.select().from(projectGitSyncs).where(eq(projectGitSyncs.id, syncId)).limit(1);
        if (syncRes.length === 0) throw new Error("Sync setting not found");
        const sync = syncRes[0];

        const conn = await this.getConnection(userId, sync.provider as 'github' | 'gitlab' | 'forgejo');
        if (!conn) throw new Error("Connection not found");

        const translationsData = await this.generateTranslationsJson(sync.projectId);
        
        // Prepare files for commit
        const files: { path: string, content: string }[] = [];
        for (const langCode in translationsData) {
            let filePath = sync.filePath.replace('{{lang}}', langCode);
            filePath = filePath.replace('{{lang_code}}', langCode);
            files.push({
                path: filePath,
                content: JSON.stringify(translationsData[langCode], null, 2) + "\n"
            });
        }

        const now = new Date();
        const formattedDate = now.getFullYear().toString() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0') +
            String(now.getHours()).padStart(2, '0') +
            String(now.getMinutes()).padStart(2, '0') +
            String(now.getSeconds()).padStart(2, '0');
        const branchName = `glide-sync/${formattedDate}`;
        const commitMessage = `Sync translations from glide.`;

        if (sync.provider === 'github') {
            await this.pushToGithub(conn.token, sync.repoName, sync.branch, branchName, commitMessage, files);
        } else if (sync.provider === 'gitlab') {
            await this.pushToGitlab(conn.token, conn.baseUrl, sync.repoName, sync.branch, branchName, commitMessage, files);
        } else if (sync.provider === 'forgejo') {
            await this.pushToForgejo(conn.token, conn.baseUrl, sync.repoName, sync.branch, branchName, commitMessage, files);
        }

        await this.db.update(projectGitSyncs).set({ lastSyncedAt: new Date(), lastSyncedBy: userId }).where(eq(projectGitSyncs.id, syncId));

        return { branch: branchName };
    }

    private async getConnection(userId: number, provider: 'github' | 'gitlab' | 'forgejo') {
        const res = await this.db.select().from(userGitConnections)
            .where(and(eq(userGitConnections.userId, userId), eq(userGitConnections.provider, provider)))
            .limit(1);
        if (res.length > 0) {
            try {
                res[0].token = decryptString(res[0].token);
            } catch {
                console.error("Failed to decrypt git token for user", userId);
            }
            return res[0];
        }
        return null;
    }

    private async generateTranslationsJson(projectId: number) {
        const langsQuery = await this.db.select({ id: languages.id, code: languages.code }).from(languages)
            .innerJoin(projectLanguages, eq(projectLanguages.languageId, languages.id))
            .where(eq(projectLanguages.projectId, projectId));
            
        const keysQuery = await this.db.select({ id: translationKeys.id, key: translationKeys.key }).from(translationKeys)
            .where(and(eq(translationKeys.projectId, projectId), eq(translationKeys.isPendingDelete, false)));
            
        const transQuery = await this.db.select({ keyId: translations.keyId, languageId: translations.languageId, value: translations.value }).from(translations)
            .innerJoin(translationKeys, eq(translations.keyId, translationKeys.id))
            .where(and(eq(translationKeys.projectId, projectId), eq(translationKeys.isPendingDelete, false)));

        const result: Record<string, any> = {};
        for (const lang of langsQuery) {
            result[lang.code] = {};
        }

        for (const trans of transQuery) {
            const lang = langsQuery.find((l: any) => l.id === trans.languageId);
            const keyObj = keysQuery.find((k: any) => k.id === trans.keyId);
            if (lang && keyObj && trans.value) {
                result[lang.code][keyObj.key] = trans.value;
            }
        }

        return result;
    }

    private async pushToGithub(token: string, repo: string, baseBranch: string, newBranch: string, message: string, files: {path: string, content: string}[]) {
        const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };
        const apiUrl = `https://api.github.com/repos/${repo}`;

        // Get base branch SHA
        const refRes = await fetch(`${apiUrl}/git/ref/heads/${baseBranch}`, { headers });
        if (!refRes.ok) throw new Error("Could not fetch base branch");
        const refData = await refRes.json();
        const baseSha = refData.object.sha;

        // Create new branch
        const createRefRes = await fetch(`${apiUrl}/git/refs`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ ref: `refs/heads/${newBranch}`, sha: baseSha })
        });
        if (!createRefRes.ok) throw new Error("Could not create new branch");

        // Create blobs and build tree
        const treeItems = [];
        for (const file of files) {
            const blobRes = await fetch(`${apiUrl}/git/blobs`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ content: file.content, encoding: 'utf-8' })
            });
            if (!blobRes.ok) throw new Error("Could not create blob for file " + file.path);
            const blobData = await blobRes.json();
            treeItems.push({ path: file.path, mode: '100644', type: 'blob', sha: blobData.sha });
        }

        // Create tree
        const getCommitRes = await fetch(`${apiUrl}/git/commits/${baseSha}`, { headers });
        const commitData = await getCommitRes.json();
        const baseTreeSha = commitData.tree.sha;

        const treeRes = await fetch(`${apiUrl}/git/trees`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems })
        });
        if (!treeRes.ok) throw new Error("Could not create tree");
        const treeData = await treeRes.json();

        // Create commit
        const createCommitRes = await fetch(`${apiUrl}/git/commits`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ message, tree: treeData.sha, parents: [baseSha] })
        });
        if (!createCommitRes.ok) throw new Error("Could not create commit");
        const newCommitData = await createCommitRes.json();

        // Update ref
        const updateRefRes = await fetch(`${apiUrl}/git/refs/heads/${newBranch}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ sha: newCommitData.sha })
        });
        if (!updateRefRes.ok) throw new Error("Could not update ref");

        // Create Pull Request
        const prRes = await fetch(`${apiUrl}/pulls`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                title: message,
                head: newBranch,
                base: baseBranch,
                body: "Automated translation sync from glide."
            })
        });
        if (!prRes.ok) throw new Error("Could not create pull request");
    }

    private async pushToGitlab(token: string, baseUrl: string | null | undefined, repo: string, baseBranch: string, newBranch: string, message: string, files: {path: string, content: string}[]) {
        const apiUrl = baseUrl || 'https://gitlab.com';
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
        const encodedRepo = encodeURIComponent(repo);

        // GitLab has an awesome Commits API that creates branch and commits in one request!
        const actions = files.map(f => ({ action: 'update', file_path: f.path, content: f.content }));
        
        // Let's try to update, if file doesn't exist, we need 'create'. Best to just do a smart check or ignore if create/update fails.
        // Actually, we can use GitLab's clever behavior: use action 'update', if it fails, fallback to something else, or use a script.
        // Wait, GitLab supports checking if file exists first. But to keep it simple, let's just create a new branch and then create a commit with actions.
        
        // 1. Create branch
        const branchRes = await fetch(`${apiUrl}/api/v4/projects/${encodedRepo}/repository/branches?branch=${newBranch}&ref=${baseBranch}`, {
            method: 'POST', headers
        });
        if (!branchRes.ok) throw new Error(`Could not create branch on GitLab. ${await branchRes.text()}`);

        // 2. We need to check if file exists to use 'update' vs 'create'.
        for (let i = 0; i < actions.length; i++) {
            const checkRes = await fetch(`${apiUrl}/api/v4/projects/${encodedRepo}/repository/files/${encodeURIComponent(actions[i].file_path)}?ref=${baseBranch}`, { headers });
            if (checkRes.status === 404) {
                actions[i].action = 'create';
            }
        }

        // 3. Create commit
        const commitRes = await fetch(`${apiUrl}/api/v4/projects/${encodedRepo}/repository/commits`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                branch: newBranch,
                commit_message: message,
                actions: actions
            })
        });
        if (!commitRes.ok) throw new Error("Could not create commit on GitLab");

        // 4. Create Merge Request
        const mrRes = await fetch(`${apiUrl}/api/v4/projects/${encodedRepo}/merge_requests`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                source_branch: newBranch,
                target_branch: baseBranch,
                title: message,
                description: "Automated translation sync from glide.",
                remove_source_branch: true
            })
        });
        if (!mrRes.ok) throw new Error("Could not create merge request");
    }

    private async pushToForgejo(token: string, baseUrl: string | null | undefined, repo: string, baseBranch: string, newBranch: string, message: string, files: {path: string, content: string}[]) {
        if (!baseUrl) throw new Error("Base URL required for Forgejo");
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');
        const apiUrl = `${cleanBaseUrl}/api/v1/repos/${repo}`;
        const headers = { 
            'Authorization': `token ${token}`, 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        // 1. Get base branch SHA
        const refRes = await fetch(`${apiUrl}/git/refs/heads/${baseBranch}`, { headers });
        if (!refRes.ok) throw new Error(`Could not fetch base branch: ${refRes.status} ${await refRes.text()}`);
        const refData = await refRes.json();
        const baseSha = refData.object.sha;

        // 2. Create new branch
        const createRefRes = await fetch(`${apiUrl}/git/refs`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ ref: `refs/heads/${newBranch}`, sha: baseSha })
        });
        if (!createRefRes.ok) throw new Error(`Could not create new branch: ${createRefRes.status} ${await createRefRes.text()}`);

        // 3. Create blobs for each file
        const treeItems = [];
        for (const file of files) {
            const blobRes = await fetch(`${apiUrl}/git/blobs`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ content: file.content, encoding: 'utf-8' })
            });
            if (!blobRes.ok) throw new Error(`Could not create blob for file ${file.path}: ${blobRes.status} ${await blobRes.text()}`);
            const blobData = await blobRes.json();
            treeItems.push({ path: file.path, mode: '100644', type: 'blob', sha: blobData.sha });
        }

        // 4. Create Tree
        // Get the tree SHA from the base commit
        const getCommitRes = await fetch(`${apiUrl}/git/commits/${baseSha}`, { headers });
        if (!getCommitRes.ok) throw new Error(`Could not fetch base commit: ${getCommitRes.status}`);
        const commitData = await getCommitRes.json();
        const baseTreeSha = commitData.tree.sha;

        const treeRes = await fetch(`${apiUrl}/git/trees`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems })
        });
        if (!treeRes.ok) throw new Error(`Could not create tree: ${treeRes.status} ${await treeRes.text()}`);
        const treeData = await treeRes.json();

        // 5. Create Commit
        const createCommitRes = await fetch(`${apiUrl}/git/commits`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ message, tree: treeData.sha, parents: [baseSha] })
        });
        if (!createCommitRes.ok) throw new Error(`Could not create commit: ${createCommitRes.status} ${await createCommitRes.text()}`);
        const newCommitData = await createCommitRes.json();

        // 6. Update branch reference
        const updateRefRes = await fetch(`${apiUrl}/git/refs/heads/${newBranch}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ sha: newCommitData.sha, force: true })
        });
        if (!updateRefRes.ok) throw new Error(`Could not update reference: ${updateRefRes.status} ${await updateRefRes.text()}`);

        // 7. Create Pull Request
        const prRes = await fetch(`${apiUrl}/pulls`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                title: message,
                head: newBranch,
                base: baseBranch,
                body: "Automated translation sync from glide."
            })
        });
        if (!prRes.ok) throw new Error(`Could not create pull request: ${prRes.status} ${await prRes.text()}`);
    }
}
