<div align="center">
  <h1>glide.</h1>
  <p><strong>A modern localization and translation management platform.</strong></p>
  
  <p>
    <img src="https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white" alt="Bun" />
    <img src="https://img.shields.io/badge/Nuxt-00DC82?style=for-the-badge&logo=nuxt.js&logoColor=white" alt="Nuxt" />
    <img src="https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white" alt="Fastify" />
    <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
    <img src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  </p>
</div>

<br />

> glide. is a self-hosted localization platform designed to streamline translation management across your projects using modern tools, automated workflows, and AI.

## 1. Overview

glide. provides an interface to manage translation keys, labels, conventions, and multiple languages across your projects. It helps streamline the management of multi-language applications through its APIs and automated workflows. The project was built with the assistance of modern AI agents, carefully guided to ensure a solid and secure foundation.

### 1.1 Architecture
glide. uses SQLite and Fastify to ensure reliable performance. With features like naming conventions, a translation review system, and automated S3 backups, the platform is designed to run securely and dependably in your environment.

## 2. Core Features

- **In-Context Editor:** Edit translations directly inside your target application using the glide. overlay.
- **Naming Conventions & Linting:** Enforce key structures using templates, variables, and a glossary linter.
- **Translation Review System:** Route new translations through a drafting and approval workflow.
- **Activity Logs & Heatmap:** Track actions on the platform, visualized in a GitHub-style heatmap.
- **Auto-Translation:** Integrated with DeepL and Google Translate for quick translation suggestions.
- **OIDC & Backups:** OpenID Connect (OIDC) support for single sign-on (SSO) and automated S3 backups.
- **Access Control:** Manage teams, user roles (Admins, Reviewers), and set translation quotas.

## 3. Tech Stack

glide. is structured as a monorepo (powered by Bun Workspaces) and uses the following technologies:

- **Runtime & Package Manager:** [Bun](https://bun.sh/)
- **Frontend (`apps/frontend`):** [Nuxt](https://nuxt.com/) (Vue.js) + Tailwind CSS / Nuxt UI
- **Backend (`apps/backend`):** [Fastify](https://fastify.dev/) + TypeScript
- **Database / ORM:** [SQLite](https://sqlite.org/) + [Drizzle ORM](https://orm.drizzle.team/)
- **Deployment:** Multi-stage Docker + Docker Compose

## 4. Documentation

Check out the guides to learn how to deploy, configure, and use glide.:

- [**Comprehensive Setup & Configuration**](SETUP.md) — Detailed guide explaining installation steps, Docker Compose, and all environment variables.
- [**Project Structure: Keys, Labels & Languages**](docs/STRUCTURE.md) — Manage unique keys, grouping labels, and languages in your projects.
- [**Translations Editor & Workspace**](docs/TRANSLATIONS.md) — Learn how to translate, search, filter, and view version history.
- [**Key Conventions & Templates**](docs/CONVENTIONS.md) — Enforce naming rules using templates, variables, and linting.
- [**In-Context Editing**](docs/IN-CONTEXT-EDIT.md) — Set up visual editing inside your target applications.
- [**Sync (Git & Traduora Sync)**](docs/SYNC.md) — Push translations as automated Pull Requests on GitHub, GitLab, or Forgejo, or sync directly with Traduora.
- [**The Review System**](docs/REVIEWS.md) — Understand how the drafting and approval lifecycle works.
- [**AI Translation & DeepL**](docs/AI-TRANSLATION.md) — Configure machine translation, inline suggestions, and manage translation quotas.
- [**Insights & Analytics**](docs/INSIGHTS.md) — View team productivity, automation impact, and time saved tracking.
- [**Event Notifications**](docs/NOTIFICATIONS.md) — Configure custom webhooks (Discord, Slack, ntfy) for system alerts.
- [**REST API**](docs/API.md) — Easily integrate translations into your apps.
- [**Namespaces & Best Practices**](docs/BEST-PRACTICE.md) — Learn how to structure keys with namespaces and labels for large projects.
- [**Migration & Backups**](docs/MIGRATION.md) — Import/export translations and configure automated S3 backups.
- [**Theming & UI Customization**](docs/THEMING.md) — Learn about UI customizations and dark mode settings.
- [**Plugins**](docs/plugins/README.md) — Learn how to manage and create your own plugins for glide.

## 5. Repository Structure

```text
glidedot/
├── apps/
│   ├── backend/        # Fastify API, Drizzle ORM schemas, Cron jobs
│   └── frontend/       # Nuxt App, Pages, UI Components
|   └── plugins/        # Optional: Custom plugins for glide.
├── docker-compose.yml  # Production Orchestration
└── bun.lockb           # Lockfile (DO NOT DELETE)
```

---

<div align="center">
  <i>Built with ❤️ by marl0nx</i>
</div>
