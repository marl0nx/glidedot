# Plugin Syntax & manifest.json Specification

Every glide. plugin contains a `manifest.json` file in its root. This manifest acts as the identity card of the plugin, defining its UI forms, required settings, active scopes, and general configuration.

---

## The `manifest.json` Structure

Here is a full specification of the parameters available inside a plugin's manifest:

```json
{
  "id": "discord-news",
  "name": "Discord News & Blog Integration",
  "description": "Auto-translates and distributes announcements, blogs, and articles to Discord with multiple image grids and active threads.",
  "version": "1.0.0",
  "author": "glide. Core Team",
  "icon": "i-heroicons-bell-alert",
  "settingsSchema": [
    {
      "key": "botToken",
      "label": "Discord Bot Token",
      "type": "text",
      "required": true,
      "description": "Stateless REST Bot Token used to authenticate requests."
    },
    {
      "key": "autoTranslate",
      "label": "Auto-Translate Announcements",
      "type": "checkbox",
      "default": "true"
    }
  ],
  "composeSchema": [
    {
      "key": "channelId",
      "label": "Discord Channel ID",
      "type": "text",
      "required": true,
      "placeholder": "Enter channel ID"
    },
    {
      "key": "embedColor",
      "label": "Embed Color Bar",
      "type": "color",
      "default": "#5865F2"
    },
    {
      "key": "targetLanguages",
      "label": "Translate to Languages",
      "type": "languages",
      "required": false,
      "description": "Select target languages to translate and post into the thread."
    }
  ]
}
```

---

## Parameter Field Explanations

| Property | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `id` | `string` | **Yes** | Unique identifier for your plugin. Must be kebab-case and match folder name. |
| `name` | `string` | **Yes** | User-friendly name of the plugin displayed in the plugin directory. |
| `description` | `string` | **Yes** | Brief overview of what the plugin does and its primary integrations. |
| `version` | `string` | **Yes** | Semantic versioning of the plugin (e.g. `1.0.0`). |
| `author` | `string` | **No** | Name of the developer or team who built the plugin. |
| `icon` | `string` | **No** | Icon name resolving to locally bundled `@nuxt/icon` collections (e.g., `i-heroicons-cog-6-tooth`). |
| `settingsSchema` | `Array` | **No** | Global configuration settings configured per-project by system administrators under *Assignments*. |
| `composeSchema` | `Array` | **No** | Custom forms displayed directly to the editor/author when creating/distributing content. |

---

## Form Field Input Types

Within both `settingsSchema` and `composeSchema`, you can declare input fields. glide.'s frontend automatically generates beautiful responsive views based on these types:

### 1. `text`
A standard text input field.
* **Additional Fields:** `placeholder`, `default`, `description`, `required`.

### 2. `textarea`
A multiline text area, ideal for custom descriptions, scripts, or templates.

### 3. `checkbox`
A simple binary toggle returning a string representation of Boolean values (`"true"` or `"false"`).

### 4. `color`
A native color-picker yielding hexadecimal color codes (e.g., `#5865F2`).

### 5. `languages`
A premium, specialized field type designed for glide.'s translation suite. 
* Renders all active project target languages as toggleable, clickable `<u-badge>` components.
* Upon selection, the frontend automatically serializes the selected languages into a clean comma-separated list (e.g. `"de,fr,es"`).
* This provides a premium UI while remaining 100% backward-compatible with comma-separated string payloads on the backend!

---

## Backend Routing and Registration (`index.ts`)

The entry point of your plugin's backend logic is `index.ts`. It must export a standard `register` function that receives the plugin system manager and glide's Fastify instance:

```typescript
import { DiscordAdapter } from './discord';
import { readJsonDatabase, writeJsonDatabase } from './helper';

export function register(pluginSystem: any, fastify: any) {
    console.log('[Plugin MyPlugin] Initializing routes...');

    // Standard Endpoint Pattern: /v1/plugins/{pluginId}/{resource}
    fastify.post('/v1/plugins/my-plugin/action', { 
        preHandler: [fastify.authHooks.checkProjectAccess] 
    }, async (request: any, reply: any) => {
        const { projectId, content } = request.body;

        // Retrieve settings configured by admins
        const botToken = await pluginSystem.getSetting(projectId, 'my-plugin', 'botToken');

        if (!botToken) {
             return reply.status(400).send({ 
                 error: 'Configuration Incomplete', 
                 message: 'Discord Bot Token is not set.' 
             });
        }

        // Execute your adapter or business logic
        const discord = new DiscordAdapter(botToken);
        const result = await discord.send(content);

        return { success: true, result };
    });
}
```

> [!NOTE]
> All plugin API routes must match `/v1/plugins/{your-plugin-id}/...` and use the `fastify.authHooks.checkProjectAccess` hook to ensure secure access scopes.
