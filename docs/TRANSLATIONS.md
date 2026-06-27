# Translation Editor & Workspace

> Easily browse namespaces, track translation completion, and edit key values with real-time AI suggestions, quality linters, and translation history in glide.

The **Translations** workspace is the most active page on the glide. platform. It provides a visual, highly efficient interface designed for copywriters, translators, and developers to manage, search, and update localized strings.

---

## 1. Navigating the Workspace

The layout of the Translation Editor is optimized for swift navigation, even across thousands of keys.

### 1.1 Browsing by Namespace (Scopes)
On the left side of the screen (or in a horizontal scrollbar on mobile), you'll find the **Browse Namespace** menu.
- glide. parses dot-separated key names (e.g., `landing.hero.title`, `auth.login.button`) and compiles them into nested scopes.
- Clicking a namespace/scope filters the central view to only display keys belonging to that folder structure.
- You can select **All Translations** to view every key in the project.

### 1.2 View Modes: Grid vs. List
You can toggle between two beautiful layout modes depending on your preference. glide. remembers your selection across sessions using cookies:
- **Grid View (Default):** Displays target languages as spacious cards, highlighting their current translation progress (e.g., `85% complete`) and visual charts. This is perfect for a quick overview of what needs work.
- **List View:** Compresses target languages into a dense table/list row format. This is ideal for developers or translators working on high-density displays.

---

## 2. Interactive Key Editing

Clicking on any language card or list row opens the translation editor overlay or detail view.

### 2.1 The Editor interface
When you select a translation key to edit:
- **Base Language Reference:** The key's value in the Base Language (e.g., English) is displayed prominently as a read-only reference.
- **Real-Time Input Validation:** As you type your translation, glide.'s background glossary linter continuously checks your copy against corporate style guides or banned terminology (see [Key Conventions](CONVENTIONS.md)).
- **Placeholders and Variables:** The editor automatically warns you if you accidentally modify variables like `{{username}}` or `{count}`, helping prevent application crashes.

### 2.2 Machine Translation & AI Suggestions
If configured, glide. provides inline translation suggestions powered by **DeepL** or **Google Translate** (see [Machine Translation](AI-TRANSLATION.md)):
- A suggestion card appears next to the input field.
- Clicking the suggestion instantly inserts it into the text editor, allowing for rapid-fire translation of standard phrases.

---

## 3. Translation Status & Drafts

When updating a value, the lifecycle depends on your project settings and user roles (see [The Review System](REVIEWS.md)):

- **Direct Publish:** If you are an Admin, Reviewer, or a trusted translator with publish permissions, saving a translation updates the live value immediately.
- **Draft Mode:** If reviews are enforced, your changes are saved as a **Draft** (`draftValue`). The status of the key becomes `PENDING_REVIEW`, and the live value remains unchanged until a reviewer approves it.

---

## 4. Deep-Linking and Auditing

### 4.1 URL Deep-Linking
glide. supports direct linking to specific translation keys. By passing query parameters `?editKey=some.key.path&langId=1` to the Translations page, the application will:
1. Automatically navigate to the correct namespace/scope.
2. Open the translation editor modal.
3. Select the specified target language.
4. Pre-fill search filters to point to that exact key.
This is used by the **In-Context Editor** and **System Notifications** to link developers and reviewers directly to the string that needs attention.

### 4.2 Translation Activity Audit Log
Want to see who edited a key, or what the previous value was?
- Click the **History / Activity** button inside the editing panel.
- This displays a detailed timeline showing every modification, status change, and approval/rejection event, complete with timestamps and user profiles.
