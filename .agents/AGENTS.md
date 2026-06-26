# glide. Project Rules

These rules must be followed by all agents working on the `glide` / `glidedot` project.

## General
- **Package Manager:** Exclusively use `bun`. Do not use `npm`, `yarn`, or `pnpm`.
- **Docker & Configuration:** The project environment is fully containerized. Configuration must be handled entirely via `docker-compose.yml` (e.g. environment variables). Do not use `.env` files.
- **External Dependencies:** Do not load resources from external CDNs (e.g. Google Fonts, Iconify API). All assets, icons, and fonts must be bundled locally and served from the frontend container.

## Frontend (Nuxt/Vue)
- **Component Naming:** Always use kebab-case for Nuxt/Vue components in templates (e.g. `<u-button>` instead of `<UButton>`).
- **Composables:** Avoid using standard Nuxt composables unless absolutely necessary.
- **Modals:** All modal components must be placed within a `modal` folder.
- **Notifications:** Only use `toast` for notifications (no other notification systems).
- **Icons:** Use `@nuxt/icon` but ensure the icons are bundled locally via `icon: { serverBundle: { collections: [...] }, provider: 'server', fallbackToApi: false }`.

## Backend (Fastify/Drizzle) & Frontend Separation
- **Types:** Do NOT share types between the frontend and backend. Keep them strictly separated.
- **Database:** Use `bun:sqlite` with `drizzle-orm`. Migrations are applied via `drizzle-kit push --force` using the `@libsql/client` driver in the startup script, rather than running manual database migration commands.
