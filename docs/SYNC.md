# Synchronization (Sync)

> Seamlessly synchronize your translations with your development environments and third-party systems. glide. supports two powerful sync methods: **Git Sync** (Continuous Localization via Pull Requests) and **Traduora Sync** (direct data synchronization with Traduora).

Under the **Sync** menu item in the sidebar, you will find a central interface where you can easily switch between both sync methods using tabs.

---

## 1. Git Sync (Continuous Localization)

**Git Sync** automates writing back localized translations directly into your Git repository (GitHub, GitLab, Forgejo). Instead of manually downloading JSON files and integrating them into your project, glide. opens clean, structured Pull Requests at the click of a button.

### 1.1 Supported Git Providers
- **GitHub:** Fully authenticated using Personal Access Tokens (PAT) or GitHub Apps.
- **GitLab:** Seamless integration using Project/Personal Access Tokens.
- **Forgejo / Gitea:** Support for lightweight, self-hosted Git environments.

### 1.2 Configuration and Security
An administrator configures Git Sync on a per-project basis:
1. Navigate to **Admin Dashboard > Projects** and edit the desired project.
2. In the **Git Integration** section, configure:
   - **Provider:** Select GitHub, GitLab, or Forgejo.
   - **Repository Name:** E.g., `owner/my-web-app`.
   - **Target Branch:** The development branch (e.g., `main` or `develop`).
   - **File Path:** The exact path of the translation file in the repository (e.g., `locales/en.json`).
   - **Auth Secret:** The token used for authentication and PR creation.

> [!NOTE]
> All credentials and tokens are securely encrypted and stored in the SQLite database using AES-256 with the server-wide `DB_ENCRYPTION_KEY`.

### 1.3 PR Safeguards (Guardrails)
To prevent uncoordinated Pull Request creation and spam in the repository, glide. includes built-in protective mechanisms:

- **Time Safety Check (1-Hour Lock):**
  If a PR has already been opened in the last 60 minutes, the interface displays a clear warning. You immediately see **who** triggered the PR and **when** (e.g., *"12 minutes ago by marl0nx"*). This encourages team coordination.
- **Explicit Username Confirmation:**
  To prevent accidental clicks, you must type your username exactly as requested (e.g., *"Please type your username 'alice' to confirm"*). The confirm button will only unlock after correct input.

---

## 2. Traduora Sync (Provisional Evaluation & Parallel Sync)

> [!IMPORTANT]
> **Purpose of Traduora Sync:**
> Traduora Sync is designed **solely for provisional testing and evaluation** of `glide.`. It allows you to run `glide.` in parallel with your existing Traduora setup so you can evaluate if `glide.` fits your team's needs without immediately shutting down Traduora.
> 
> **Long-term recommendation:** 
> If you find that `glide.` fits your needs, we highly recommend migrating fully to `glide.` and using either **Git Sync** (recommended) or calling the **native `glide.` APIs** directly in your build pipeline, rather than relying permanently on parallel synchronization with Traduora.

### 2.1 Configuration (Exclusively on Project Level)
To maximize security and keep environment variables clean, Traduora credentials are configured **exclusively on a per-project basis**.

1. Navigate as an administrator to **Admin Dashboard > Projects** and click the edit icon on the desired project.
2. Enter your credentials in the **Traduora Sync Configuration** section:
   - **Traduora Server URL** (e.g., `https://translate.your-domain.com/`)
   - **Traduora Client ID** (OAuth2 Credentials)
   - **Traduora Client Secret** (Securely and encrypted stored in the SQLite database)
   - **Traduora Project ID** (The unique UUID of your translation project in Traduora)
3. Click **Save Configuration**.

> [!TIP]
> **Handling restricted API keys (401 Unauthorized):**
> API keys created in Traduora are often restricted to their respective project (project-scoped). Therefore, such API keys do not have permission to fetch the global projects list (clicking *"Load Projects"* will fail with a **401 Unauthorized** error).
> **The Solution:** Simply paste the **Traduora Project ID** directly and manually into the text field. The actual synchronization (import) will work perfectly because it targets that specific project directly.

> [!WARNING]
> **Warning banner for missing configuration:**
> If a project does not have complete credentials or a Traduora Project ID configured, a warning banner is displayed under the Traduora tab, informing the user that Traduora Sync must be set up and directing administrators to **Admin Dashboard > Projects**.

### 2.2 How the Transfer Works
When you click **Push to Traduora** under the Traduora tab, the following happens:
1. **Authentication:** Glide requests a temporary OAuth2 Bearer token from the Traduora API.
2. **Data Export:** The current translations of the Glide project are compiled into a flat, clean JSON.
3. **API Import:** Glide sends the JSON via `POST` to the import endpoint of Traduora (`/api/v1/projects/{traduoraProjectId}/imports`). This updates existing keys in Traduora and adds new ones.
4. **History & Status:** Upon a successful sync, the exact timestamp of the last synchronization is saved and clearly displayed in the dashboard.

### 2.3 Troubleshooting: 402 Payment Required (Plan Limits)
If your synchronization fails with a **402 Payment Required** error (`"You seem to have reached your plan limit"`), Traduora is blocking the import because the number of translation strings (terms) has exceeded the project's configured plan limit. 

By default, self-hosted Traduora instances assign the `"open-source"` plan to new projects, which is capped at **100,000 strings**.

**To resolve/bypass this limit in a self-hosted environment:**
- **Option A: Update Server Environment Variables**
  Change the default project plan to an unlimited one (e.g., `enterprise` or `unlimited`) in your Traduora server's environment settings:
  ```env
  TR_DEFAULT_PROJECT_PLAN=enterprise
  ```
- **Option B: Modify the Traduora Database Directly**
  If you already have a project, you can lift the limit by executing an SQL command directly on your Traduora PostgreSQL database to upgrade the project plan:
  ```sql
  -- Find your project UUID and verify its current plan
  SELECT id, name, plan FROM project;

  -- Upgrade your project plan to bypass limits
  UPDATE project SET plan = 'enterprise' WHERE id = 'YOUR_TRADUORA_PROJECT_UUID';
  ```
