# Project Structure: Keys, Labels & Languages

> Define and manage the core architectural building blocks of your translation workflow, including unique keys, grouping labels, and translation languages in glide.

The **Structure** page is the administrative command center for your project's organization. It is divided into three key tabs: **Translation Keys**, **Labels**, and **Languages**. Ensuring a solid structure from the start guarantees clean exports, logical developer workflows, and a cohesive team workspace.

---

## 1. Translation Keys

Translation keys are the unique, code-friendly identifiers (names) used by developers to reference text strings in their codebases (e.g., `dashboard.buttons.save`).

### 1.1 Namespaces & Dot Notation
- glide. highly recommends organizing your keys into hierarchical paths using periods/dots (`.`) as delimiters.
- Using dot-separated keys dynamically constructs a **Namespace Tree** (e.g. `settings.profile.avatar.image`).
- In the side navigation of the **Translations Editor**, these dots are parsed to let translators browse through directories and namespaces like folders on a hard drive.

### 1.2 Managing Keys
Under the **Translation Keys** tab, you can perform the following operations:
- **Add Key:** Create new identifiers manually. If *Strict Mode* is enabled in Project Settings, keys must follow one of your predefined naming templates (see [Key Conventions](CONVENTIONS.md)).
- **Delete Key:** Permanently remove keys.
  > [!CAUTION]
  > Deleting a key removes it and all associated translations across all languages permanently. This action is irreversible.
- **Bulk Cleanup:** Select and delete multiple obsolete keys in a single action.

---

## 2. Labels (Tags)

While dot-separated namespaces enforce a strict technical hierarchy, **Labels** are lightweight, color-coded tags designed to cross-cut your technical structure and group keys regardless of where they sit in your namespace tree.

```text
               NAMESPACES                              LABELS (Cross-Cutting)
┌──────────────────────────────────────┐
│  auth.login.title                    │ ◄────────── [ Release v1.0 ]
├──────────────────────────────────────┤
│  settings.profile.avatar             │ ◄────────── [ Release v1.0 ] [ Mobile App ]
├──────────────────────────────────────┤
│  error.404                           │ ◄────────── [ Help Wanted ]
└──────────────────────────────────────┘
```

### 2.1 Use Cases for Labels
- **Releases & Sprints:** Mark keys with `sprint-23` or `v2.4.0` to let copywriters and developers know what is ready or what needs translation for the upcoming release.
- **Platform Separation:** If your translation database is shared across `Web`, `iOS`, and `Android`, apply these respective platform labels to optimize translation syncs.
- **Copywriter Attention:** Use labels like `needs-legal-review` or `needs-polish` for custom internal review processes.

### 2.2 Configuring Labels
In the **Labels** tab, you can:
- **Create Label:** Set a name and a custom color.
- **Edit/Delete Label:** Modify existing labels or delete them. Deleting a label removes the tag from all associated keys but does **not** delete the keys or translations themselves.

---

## 3. Languages

Configuring the translation languages of your project is essential before translators can start localizing content.

### 3.1 Base Language
- Every project has exactly **one Base Language** (typically English - `en`).
- The Base Language is the primary source of truth. Suggestion utilities, AI translations (DeepL / Google Translate), and completion progress bars are calculated relative to the Base Language.
- It is highly recommended to fill in all Base Language translations first.

### 3.2 Target Languages
- Target languages are the additional locales you want to support (e.g. German `de`, Spanish `es`, French `fr`).
- Under the **Languages** tab, you can:
  - **Add Language:** Enter the language name and its respective ISO standard code (e.g. `de-DE`, `fr-FR`).
  - **Set Default:** Define which target language should be highlighted first.
  - **Delete Language:** Remove a language and its translations permanently from the project.

---

## 4. Best Practices Summary

> [!TIP]
> - Always use **Namespaces (`.`)** for technical, feature-based, or component-based locations (e.g., `auth.register.input_error`).
> - Use **Labels** for cross-functional organization like releases, status stages, or technical platforms (e.g., `iOS`, `v1.2.0`).
> - Keep ISO codes consistent and lowercase where possible (e.g., `en-us`, `de-de`) or match your frontend framework's naming scheme perfectly to ensure flawless exports.
