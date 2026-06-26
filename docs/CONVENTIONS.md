# Key Naming Conventions & Templates

> Enforce consistent naming structures across your projects using templates, shared variables, and a global glossary linter in glide.

This document outlines the architecture for the "Key Naming Conventions & Templates" feature in glide. The goal of this feature is to enforce consistent naming structures for translation keys across large projects while remaining flexible enough to handle deep nesting and edge cases.

## 1. Core Pillars

The architecture is built upon three main database tables:
1. **Key Templates** (`key_templates`)
2. **Key Variables** (`key_variables`)
3. **Key Glossary** (`key_glossary`)

---

## 2. Key Templates

Project administrators can define visual schemas for their translation keys. Instead of writing complex Regex strings, schemas are built using **Segments**.

### 2.1 Segment Types
- **Variable (Dropdown):** Links to a globally defined "Key Variable" (e.g., a shared list of modules).
- **Text Segment:** A single text string (no dots allowed). Enforces casing rules like `camelCase` or `kebab-case`.
- **Nested Path (Infinite Tail):** A special free-text segment that allows dots (`.`). This permits infinite deep nesting (e.g., `settings.profile.avatar.image`).
- **Constant:** A hardcoded, uneditable string (e.g., forcing a template to start with `app.`).

### 2.2 Segment Options
- **Optional:** If a segment is left blank, the system intelligently removes the trailing delimiter to prevent double dots (like `module..identifier`).

> [!TIP]
> **Example Templates:**
> 1. **The Standard UI Component:** `[Module].[Component].[Nested Path]` ➔ `auth.loginButton.label.text`
> 2. **The Status Code:** `constant("error").[ErrorCode]` ➔ `error.404`

---

## 3. Key Variables (Shared Enums)

Variables are reusable lists of allowed values. Instead of hardcoding dropdown options directly inside a template, they are stored globally per project.

- **Example:** A variable `[Platform]` with options `web, ios, android`.
- **Benefits:** Multiple templates can reference the `[Platform]` variable. If a new platform `desktop` is added, all templates inherit the change automatically.

---

## 4. Key Creation UX (Add Key Modal)

When a developer creates a new key, the modal adapts based on the selected Template.

- **Dynamic Inputs:** The single text input is replaced by compact, individual input fields and dropdowns that match the schema's segments exactly.
- **Strict Mode:** Administrators can enable a project-wide setting: *"Require Template"*. This disables the "Freeform" key creation entirely.

---

## 5. Key Glossary (The Linter)

To prevent terminology chaos (e.g., developers mixing `description` vs. `desc`, `message` vs. `msg`), a global linter runs in the background.

- **Global Dictionary:** Maintained in the Project Settings, mapping banned words to preferred words (e.g., `description` ➔ `desc`).
- **Real-time Validation:** If a user types a banned word into a "Text Segment" or the "Nested Path" field, the word is underlined in yellow (similar to an IDE spellchecker or ESLint).
  - *Example:* If you type `modal.success.description`, the system highlights `description` and warns you.
- **Quick-Fix:** A warning message appears (*"In this project, we use `desc` instead of `description`."*) along with a 1-click auto-fix button to instantly apply the correct terminology.

> [!NOTE]
> This approach ensures that terminology rules apply globally across all templates and even freeform keys, without having to redundantly define them inside every single template segment.
