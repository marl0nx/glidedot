# Best Practices

> Recommended strategies for structuring keys with namespaces and organizing projects with labels in glide.

In large applications, managing hundreds or thousands of translation keys can quickly become messy. This document outlines the recommended best practices for keeping your glide. projects clean, structured, and maintainable.

## 1. Namespaces & Organization (Dot Notation)

glide. encourages you to group related keys together using **namespaces**. Rather than creating a flat list of random keys, you use periods (`.`) to simulate a folder structure.

> [!TIP]
> **Best Practices:**
> - **Feature-based naming:** `auth.login.title`, `auth.login.button`, `auth.register.title`.
> - **Component-based naming:** `button.save`, `button.cancel`, `modal.confirm.title`.

### 1.1 How glide. Handles Namespaces
When you export your translations as JSON, glide. automatically structures these dot-separated keys into a flat JSON file (e.g., `{"auth.login.title": "Login"}`). Some tools prefer nested JSON, but flat JSON is generally the most compatible format across different frameworks (like `vue-i18n`, `next-intl`, or `react-i18next`).

### 1.2 Namespace Graph
In the **Insights** section of your project, glide. visualizes your key structure using a **Namespace Tree Graph**. This allows you to quickly spot inconsistencies, such as typos in namespaces (e.g., having both `auth.login` and `aut.login`).

## 2. Labels (Tags)

While namespaces dictate the *structural* hierarchy of a key, **Labels** allow you to group keys across entirely different namespaces.

### 2.1 Use Cases for Labels
- **Releases/Versions:** Tag all keys belonging to your "v2.0 Update".
- **Platforms:** If you share a project across Web and Mobile, you might label keys with `iOS`, `Android`, or `Web`.
- **Status:** Label keys that need a copywriter's attention with `needs-copy-review`.

### 2.2 Working with Labels
- You can apply multiple labels to a single key.
- Labels are color-coded in the UI to make them easily distinguishable.
- You can filter the Translation Editor to only show keys matching specific labels.

> [!IMPORTANT]
> **Summary**
> Use **Namespaces (`.`)** for the strict, technical location of where a text appears in your app. 
> Use **Labels** for flexible, cross-cutting categories like project phases or platforms.
