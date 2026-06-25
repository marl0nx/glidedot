# In-Context Editing (Live Editor)

> Visually edit translations directly on your own website, while saving them directly to the glide. database.

glide. supports **In-Context Editing**! This allows you to visually edit translations directly on your own website, while saving them directly to the glide. database.

## 1. Setup in your App (Optional)

To enable the In-Context Editor on your own website, simply embed the `glide-client.js` script into your HTML `<head>`:

```html
<!-- Include this script on your website (e.g. in staging/dev environments) -->
<script src="https://your-glide-instance.com/glide-client.js"></script>
```

> [!IMPORTANT]
> **Iframe Embedding Required**  
> Because the In-Context Editor embeds your website within an `<iframe>` inside the glide. dashboard, your web application must allow being framed. Ensure that security headers like `X-Frame-Options` or `Content-Security-Policy` (CSP) permit embedding from your glide. instance URL. Otherwise, the editor will fail to load and might show a "Connection refused" error.

## 2. Formatting your Keys

The script automatically scans your website for localization keys and replaces them with live translations.
You can provide keys in two ways:

**Option A: HTML Attributes (Recommended)**
```html
<h1 data-glide-key="landing.hero.title">Welcome to our app</h1>
```
*Note: The text inside the element will be used as a fallback if no translation exists.*

**Option B: Text Placeholders**
```html
<p>{glide.landing.hero.subtitle}</p>
```

## 3. Configuration in glide.

1. Open your glide. Dashboard.
2. Go to **Admin > Manage Projects** and edit your project.
3. Enter your app's URL (e.g., `http://localhost:3000` or `https://staging.myapp.com`) into the **In-Context Preview URL** field.
4. Click the **In-Context Editor** button in your project dashboard (located in the navigation sidebar) to open your website within glide.
5. Hover over any text element and click to edit the translation live!

> [!TIP]
> **Pro-Tip: Auto-Creation of Keys**
> You don't need to manually create keys in the dashboard before using them! 
> Just add a new `data-glide-key` or `{glide...}` placeholder to your website. When you click on it in the In-Context Editor, **glide. will automatically create the new key** in the database and immediately open the translation window for you!

## 4. Try the Local Example

If you want to test how In-Context Editing looks and feels without integrating it into your own app yet, we've provided a simple demo HTML file.

1. Open the `docs/` folder in your glide. project repository.
2. Locate the `TEST-SITE-EXAMPLE.html` file.
3. Open this file locally in your browser, or host it on a local development server.
4. Set the **In-Context Preview URL** in your glide. project settings to point to this local file/server.
5. Open the In-Context Editor in glide. and start testing!
