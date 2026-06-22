# In-Context Editing (Live Editor)

glide. supports **In-Context Editing**! This allows you to visually edit translations directly on your own website, while saving them directly to the glide. database.

## 1. Setup in your App (Optional)
To enable the In-Context Editor on your own website, simply embed the `glide-client.js` script into your HTML `<head>`:

```html
<!-- Include this script on your website (e.g. in staging/dev environments) -->
<script src="https://your-glide-instance.com/glide-client.js"></script>
```

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

## Pro-Tip: Auto-Creation of Keys
You don't need to manually create keys in the dashboard before using them! 
Just add a new `data-glide-key` or `{glide...}` placeholder to your website. When you click on it in the In-Context Editor, **glide. will automatically create the new key** in the database and immediately open the translation window for you!
