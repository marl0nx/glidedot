# Import, Export & Backup (Migration)

> Guidelines for moving data in and out of glide., distinguishing between project-level data migrations and full system backups.

glide. provides multiple ways to move data in and out of the system. This is crucial for initial onboarding, CI/CD integrations, and disaster recovery.

## 1. Project Data vs. System Backup

It's important to understand the difference between importing/exporting Project Data and performing a System Backup:

- **Project Data (Translations & Conventions):** This is project-specific. You import or export translations for a single language in a single project, or export the naming conventions of a single project. This is designed for moving data between tools (e.g., migrating from Traduora to glide.) or for CI/CD workflows where your code pulls the latest translations.
- **System Backup (Local & Cloud):** This creates a backup of all localization data across your entire glide. instance. It includes all projects, languages, translations (including history and pending reviews), and conventions.

> [!NOTE]
> A System Backup does *not* backup your Users, Teams, or System Settings. It exports this data as a structured JSON file inside a ZIP archive. This is designed for safely exporting your entire localization database at once.

## 2. Translations (Import / Export)

Translations are the core data of your project. glide. supports importing and exporting them on a per-language basis.

- **Exporting:** Returns a flat JSON key-value map (e.g., `{"header.title": "Welcome"}`).
- **Importing:** Accepts a flat JSON map. 
  - **Traduora Migration:** If you are migrating from Traduora or a similar tool, make sure to export your data as **JSON (Flat)**. Nested JSON is currently not supported for direct imports.
  - **Pending Reviews:** You can optionally set the `importAsPending` flag to force all imported translations into the "Pending Review" status rather than automatically approving them. Missing keys are created on the fly.

## 3. Conventions (Import / Export)

Setting up Naming Conventions (Templates, Variables, Glossary) can be tedious. glide. allows you to export your entire conventions rule-set as a JSON file and import it into another project.

- **Payload:** The JSON contains three arrays: `templates`, `variables`, and `glossary`.
- **Behavior:** When importing, glide. updates existing terms/variables with the same name and inserts new ones. Existing templates with the same name are overwritten.

## 4. Automated S3 Backups (Cloud Backup)

For self-hosted instances, glide. includes an automated backup service to prevent data loss.

- **Process:** The service safely copies the entire SQLite database (`sqlite.db`) and uploads it to an S3-compatible storage bucket (AWS S3, MinIO, Cloudflare R2).
- **Configuration:** Requires configuring S3 credentials (Access Key, Secret Key, Bucket Name, Region, Endpoint) in the system settings. Backups can be scheduled to run daily, weekly, or monthly.

## 5. Local Backup & Restore

You can download a complete ZIP backup of your system directly from the Admin Dashboard and restore it later. 

> [!WARNING]
> Restoring a ZIP backup completely replaces your current database. All changes made since the backup was created will be permanently lost.
