# glide. Plugin Development Guide

Welcome to the glide. Plugin Development Guide! This documentation is designed to help you build, configure, and install custom extensions for your translation and localization engine.

Whether you are connecting glide. to external publishing pipelines (like Discord, Slack, or Telegram), integrating third-party notification APIs, or extending the editing workspace, glide's extensible architecture has you covered.

---

## Documentation Quick Index

Dive deep into individual specifications:

### 📖 [Plugin Syntax & manifest.json](file:///Users/marl0nx/Documents/Projects/glide/Code/glidedot/docs/plugins/syntax.md)
Learn how to define your plugin’s name, icon, admin configuration schemas, and front-end editor input fields.

### ⚙️ [Plugin Setup & Administration](file:///Users/marl0nx/Documents/Projects/glide/Code/glidedot/docs/plugins/setup.md)
Discover the directories, installation processes, global project assignments, and how dynamic forms inject directly into glide.'s frontend.

### 🛠️ [Reusable Plugin Helper Toolkit](file:///Users/marl0nx/Documents/Projects/glide/Code/glidedot/docs/plugins/helper.ts)
A copy-pasteable, robust helper module containing methods for dynamic module loading, country flag extraction, color parsing, REST API error handling, and lightweight JSON storage.

---

## Core Architecture Design Principles

When writing or maintaining glide. plugins, keep the following core tenets in mind:

### 1. Maintain Statelessness
Do not launch persistent background WebSocket workers or full bot instances (e.g. standard Discord clients that listen to events 24/7). Instead, make lightweight, stateless REST requests using Bun's native `fetch` API. This keeps memory overhead at zero.

### 2. Strict Type Separation
Do **not** share TypeScript interfaces or types between the backend plugin environment and the frontend page views. Keep frontend models and backend adapters strictly independent to prevent breaking compilation boundaries.

### 3. Native & Local Assets
Do not load fonts, style sheets, or icons from external CDNs. All assets and styling elements must be bundled locally or leverage glide's preconfigured TailwindCSS/Nuxt UI tokens.

### 4. Robust, Actionable Error Handling
When making external API requests, catch errors and parse their bodies to throw explicit, detailed messages back to glide.'s server. Under-the-hood 400 Bad Request errors should bubble up with highly expressive details so editors receive clear, actionable feedback via toast notifications.

---

## Getting Started: Create your first Plugin in 3 Steps

### Step 1: Create a Folder
Create a folder inside `plugins/` named after your extension (e.g., `plugins/slack-notifier`).

### Step 2: Define the Manifest
Create a `manifest.json` describing your extension, its global configuration, and its compose forms.

### Step 3: Write Route Handlers
Create an `index.ts` file and write your Fastify route handlers inside the `register` hook. Tap into core translation systems or project variables, and you're good to go!
