# In-Context Editing (Live Editor)

> Visually edit translations directly on your own website, while saving them directly to the glide. database.

glide. supports **In-Context Editing**! This allows you to visually edit translations directly on your own website, while saving them directly to the glide. database.

---

## 1. Setup in your App

To enable the In-Context Editor on your own website, simply embed the `glide-client.js` script into your HTML `<head>` (ideally only in development or staging environments):

```html
<!-- Include this script on your website (e.g. in staging/dev environments) -->
<script src="https://your-glide-instance.com/glide-client.js"></script>
```

> [!IMPORTANT]
> **Iframe Embedding Required**  
> Because the In-Context Editor embeds your website within an `<iframe>` inside the glide. dashboard, your web application must allow being framed. Ensure that security headers like `X-Frame-Options` or `Content-Security-Policy` (CSP) permit embedding from your glide. instance URL. Otherwise, the editor will fail to load and might show a "Connection refused" error.

---

## 2. How Key Detection Works (Keyless & Zero-Code)

You do **not** need to add custom HTML attributes (like `data-glide-key`) or placeholder templates to your code anymore! 

Instead, the script automatically scans your website's text nodes for any **raw translation keys with dots** (e.g., `homepage.hero.title`).

### How to use this in your Dev System:
Most i18n frameworks (like `vue-i18n`, `next-intl`, `react-i18next`, etc.) have a mode where if translations are disabled, missing, or set to a fallback mode, the framework will **render the key itself as the text** on the page.

Simply configure your local development or staging environment to render these raw keys (e.g. `homepage.hero.title`).

#### Rendered HTML Output of your app in Dev/Staging:
```html
<h1>homepage.hero.title</h1>
<p>homepage.hero.subtitle</p>
```

#### What glide. does in the In-Context Editor:
1. Detects the dot-separated text nodes (`homepage.hero.title`).
2. Live-replaces them with the actual translation from the glide. database.
3. Automatically wraps them in an interactive element with a dashed outline on hover, making them click-to-edit.

---

## 3. Configuration in glide.

1. Open your glide. Dashboard.
2. Go to **Admin > Manage Projects** and edit your project.
3. Enter your app's URL (e.g., `http://localhost:3000` or `https://staging.myapp.com`) into the **In-Context Preview URL** field.
4. Click the **In-Context Editor** button in your project dashboard (located in the navigation sidebar) to open your website within glide.
5. Hover over any text element and click to edit the translation live!

---

## 4. Try the Local Example

If you want to test how In-Context Editing looks and feels without integrating it into your own app yet, we've provided a simple demo HTML file.

1. Open the `docs/` folder in your glide. project repository.
2. Locate the `TEST-SITE-EXAMPLE.html` file.
3. Open this file locally in your browser, or host it on a local development server.
4. Set the **In-Context Preview URL** in your glide. project settings to point to this local file/server.
5. Open the In-Context Editor in glide. and start testing!
