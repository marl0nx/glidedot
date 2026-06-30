# Plugin Setup, Administration & Installation

This guide walks you through the life cycle of a glide. plugin—from uploading/installing, configuring settings, to integrating them seamlessly inside your translation projects.

---

## Directory Location

By default, glide. loads all active plugins dynamically on startup from the central plugins directory:
* **Production / Docker Environment:** `/plugins/` inside the workspace or mapped volume.
* **Source Code Directory:** `plugins/` in the project root.

Each plugin exists in its own isolated subfolder:
```bash
plugins/
├── discord-news/
│   ├── data/             # Lightweight JSON file database (per-project post logs)
│   │   └── posts-1.json
│   ├── discord.ts        # Stateless Adapter containing REST API logic
│   ├── index.ts          # Fastify route registration entry point
│   └── manifest.json     # Plugin configuration schema
└── translator-pro/
    ├── index.ts
    └── manifest.json
```

---

## Installation & Upgrades

glide. provides two modern ways to install and manage plugins:

### 1. Manual Upload
Copying the plugin's folder directly into the `plugins/` directory of your glide. instance. A system restart (or container reload) automatically discovers, parses, and loads the plugin on startup.

### 2. URL-Based Plugin Installer (Premium Feature)
Directly download, extract, and register plugins using a valid download URL.
* Access this under **Admin Panel -> Manage Plugins -> Install Plugin**.
* Paste the direct download URL (e.g. `https://github.com/my-org/glide-my-plugin/archive/main.zip`).
* glide. will securely download, unpack, and verify the `manifest.json` before registering the plugin dynamically.

### 3. Deleting and Uninstalling
Plugins can be cleanly deleted or uninstalled:
* **Via Administration Panel:** Go to **Admin -> Manage Plugins** and click **Uninstall** next to the designated plugin. This removes the local files and clears registered settings.
* **Local Data Cleanup:** Active data stored in `plugins/{plugin-id}/data/` (such as published post logs) remains saved to prevent data loss. You can manually delete this if no history is required anymore.

---

## Configuration Variables & Settings

Admin-level configurations (like private bot tokens, API keys, and auto-translate preferences) are handled entirely via the UI without modifying source files.

1. **Global Assignments:** Go to **Admin -> Manage Plugins -> Assignments**.
2. Click **Configure** on the designated plugin.
3. System settings mapped to the `settingsSchema` inside `manifest.json` will render as clean inputs.
4. Saving these settings persists them to the core SQLite database (`settings` table) mapped to the current `projectId`.

### Fetching Settings on the Backend

Inside your plugin's `index.ts` route handlers, you can retrieve settings securely using the plugin system manager:

```typescript
// Retrieve setting value for a given project ID
const botToken = await pluginSystem.getSetting(projectId, 'discord-news', 'botToken');
```

---

## Front-end Custom Forms

When a user writes or composes content in glide. (e.g. creating an article or preparing an announcement):
1. glide. scans all installed and active plugins for `composeSchema` fields.
2. Form inputs are dynamically injected into the sidebar or distribution panel of the editor view.
3. Upon clicking "Publish" or "Send", these input fields are compiled into a JSON payload and forwarded directly to your backend plugin endpoint.

> [!TIP]
> When defining fields, always provide default values using the `default` parameter in `manifest.json` to ensure the smoothesion experience for the user.
