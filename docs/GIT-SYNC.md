# Git Sync: Continuous Localization

> Push translation updates directly to your version control provider (GitHub, GitLab, Forgejo) as automated Pull Requests, closing the gap between translators and developers.

The **Git Sync** tab is a premium developer-focused feature in glide. It automates the process of pushing localized translation updates back to your application's Git repository. Instead of developers manually exporting JSON files and committing them to the repository, glide. generates structured, clean Pull Requests on demand.

---

## 1. Supported Providers

glide. natively integrates with major Git hosting solutions:

- **GitHub:** Fully authenticated using personal access tokens or GitHub Apps.
- **GitLab:** Integrates seamlessly using GitLab Project Access Tokens.
- **Forgejo:** Support for self-hosted, lightweight Git servers.

---

## 2. Configuration & Architecture

To use Git Sync, the integration must be set up by an Administrator for the specific project:

1. Navigate to **Admin Dashboard > Projects** and edit your project.
2. Under the **Git Integration** section, configure the connection:
   - **Provider:** Select GitHub, GitLab, or Forgejo.
   - **Repository Name:** E.g., `owner/my-web-app`.
   - **Target Branch:** The default development branch where translation files should end up (e.g., `main` or `develop`).
   - **File Path:** The exact path in the repository where the JSON translations should be written (e.g., `locales/en.json` or `apps/frontend/locales/de.json`).
   - **Auth Secret:** The access token required to authenticate and open Pull Requests.

> [!NOTE]
> All credentials and Auth secrets are encrypted in the SQLite database using AES-256 with the server-wide `DB_ENCRYPTION_KEY` environment variable.

---

## 3. Creating a Pull Request (The Sync Workflow)

Once configured, the Git Sync option becomes active in your project's dashboard. Any authorized team member can trigger a sync:

1. Click **Create Pull Request** next to the active repository sync configuration.
2. glide. will compile the project's translation database, generate a perfectly formatted JSON file matching your schema, and commit it to a new isolated branch.
3. It will automatically open a descriptive Pull Request (e.g., `"chore(localization): update translation strings from glide."`) targeting your configured branch.

---

## 4. Premium Team Collaboration Features

To ensure smooth operations in team environments, glide. includes a set of guardrails to prevent accidental PR spam and merge conflicts.

### 4.1 Recent PR Time Safety Check
If a team member attempts to open a Pull Request within **1 hour** of a previously created PR, the Git Sync dashboard will display an overlay warning.
- It highlights exactly **when** the last PR was created (e.g., `"last PR created 12 minutes ago"`).
- It identifies **who** triggered that sync (e.g., `"by marl0nx"`).
- This encourages translators and developers to coordinate and compile changes before opening another PR.

### 4.2 Explicit Username Confirmation
To prevent automated clicks or absent-minded double-submits, you must explicitly confirm the action:
- A text box will prompt you: `"Please type your username '<your_username>' to confirm:"`.
- The button remains disabled until you match your username exactly, ensuring a high-intent, safe sync.

```text
┌──────────────────────────────────────────────────────────┐
│                  Create Pull Request                     │
├──────────────────────────────────────────────────────────┤
│ ⚠️  A Pull Request was already created 12 minutes ago    │
│    by marl0nx. Are you sure you want to open another     │
│    one right now to avoid spamming the repository?       │
│                                                          │
│    Please type your username 'alice' to confirm:         │
│    [ alice              ]                                │
│                                                          │
│                       [ Cancel ] [ Create Pull Request ] │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Tips & Automation

> [!TIP]
> - Combine Git Sync with your continuous integration (CI) pipelines. When glide. opens a Pull Request, your CI (e.g., GitHub Actions) can automatically run tests, preview the changes, and deploy them.
> - Ensure your target file path is perfectly accurate and that the repository's main branch allows opening PRs.
