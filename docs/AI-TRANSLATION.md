# Machine Translation & Suggestions

> An overview of how glide. uses machine translation (DeepL & Google Translate) to accelerate localization workflows and manage usage quotas.

glide. features an integrated Machine Translation system to speed up your localization workflow by suggesting translations on the fly. 

## 1. Providers (DeepL & Google Translate)

By default, glide. uses **Google Translate** to provide machine translation suggestions out of the box without requiring any API keys. 

If you prefer higher quality or more nuanced translations, you can optionally configure **DeepL**:
1. In the glide. **Admin Settings**, navigate to the **Machine Translation** section.
2. Enter your **DeepL Auth Key**.

> [!NOTE]
> Once configured, glide. will automatically prioritize DeepL for all translation suggestions.

## 2. Inline Suggestions

When editing a translation in the glide. Web UI or the In-Context Editor, glide. can automatically fetch a suggested translation.

- **How it works:** glide. looks at the translation in the project's **Base Language** (e.g., English) and translates it into the target language you are currently editing.
- **Triggering:** Suggestions appear in the UI near the text editor. You can click them to instantly apply the translation.
- **Variables & Formatting:** The system attempts to preserve placeholders (like `{{username}}`).

> [!WARNING]
> You should always carefully review the output to ensure the formatting hasn't been broken by the AI.

## 3. User Quotas and Limits

To prevent excessive API usage or abuse (especially if you are paying for DeepL Pro), glide. includes a powerful built-in quota management system.

- **Default Quotas:** By default, every non-admin user is granted a fixed allowance of **500 translation suggestions**.
- **Admin Bypass:** Administrators have no limits and can generate an unlimited number of suggestions.
- **User Management:** Administrators can easily manage these quotas via **Admin Dashboard > Users**. For each individual user, you can:
  - Increase or decrease their specific quota limit.
  - Configure an **Auto-Renewal** schedule (e.g., automatically reset their quota to the maximum every `X` days, weeks, or months).

## 4. Limitations

- **Glossary Support:** Currently, glide. does *not* automatically sync your glide. Glossary with external translation APIs. Machine translation relies purely on general context. If you have highly specific brand terms, manual adjustments will be required.
- **Context:** The system translates each key individually. It does not know the broader context of your application (e.g., whether "Save" is a verb for a button or a noun in a game). 

> [!TIP]
> Using the **Review System** to verify machine-translated text is highly recommended!
