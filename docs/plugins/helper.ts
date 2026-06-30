/**
 * Reusable Helper Toolkit for glide. Plugins
 * 
 * You can copy this file directly into your plugin folder (e.g. `plugins/your-plugin/helper.ts`)
 * to quickly access essential utilities for database access, configuration loading,
 * API requests, error formatting, and local JSON storage.
 */

import { join } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

/**
 * Dynamically loads a core glide. backend module relative to glide's root folder.
 * This allows plugins to easily access core services, models, and utility classes
 * without hardcoding complex relative paths.
 * 
 * @example
 * const { DeeplService } = await getBackendModule('src/modules/localization/services/deepl.service.ts');
 */
export async function getBackendModule(relativePath: string): Promise<any> {
    const absolutePath = join(process.cwd(), relativePath);
    return await import(absolutePath);
}

/**
 * Parses a hex color string into a decimal number used by external APIs (like Discord).
 * 
 * @param hex The hex color string (e.g. '#5865f2' or '5865f2')
 * @param fallbackDefault Decimal representation of default color (e.g., 0x5865F2)
 */
export function parseHexToDecimal(hex?: string, fallbackDefault = 0x5865F2): number {
    if (!hex) return fallbackDefault;
    const cleaned = hex.replace('#', '').trim();
    const num = parseInt(cleaned, 16);
    return isNaN(num) ? fallbackDefault : num;
}

/**
 * Standardized mapping of two-letter language codes to high-definition emoji country flags.
 * Includes fallback logic to extract base codes from regional locales (like 'de-DE' -> 'de').
 */
export function getLanguageFlag(langCode: string): string {
    const cleanCode = langCode.trim().toLowerCase().split('-')[0].split('_')[0];
    const flagEmojis: Record<string, string> = {
        de: "🇩🇪",
        fr: "🇫🇷",
        es: "🇪🇸",
        it: "🇮🇹",
        nl: "🇳🇱",
        pl: "🇵🇱",
        pt: "🇵🇹",
        ru: "🇷🇺",
        ja: "🇯🇵",
        zh: "🇨🇳",
        ko: "🇰🇷",
        en: "🇬🇧",
        us: "🇺🇸",
        gb: "🇬🇧"
    };
    return flagEmojis[cleanCode] || "🌐";
}

/**
 * Map two-letter language codes to their full English names.
 */
export function getLanguageName(langCode: string): string {
    const cleanCode = langCode.trim().toLowerCase().split('-')[0].split('_')[0];
    const languageNames: Record<string, string> = {
        de: "German",
        fr: "French",
        es: "Spanish",
        it: "Italian",
        nl: "Dutch",
        pl: "Polish",
        pt: "Portuguese",
        ru: "Russian",
        ja: "Japanese",
        zh: "Chinese",
        ko: "Korean",
        en: "English"
    };
    return languageNames[cleanCode] || langCode.toUpperCase();
}

/**
 * Securely read a JSON file from your plugin's data folder.
 * Perfect for stateless plugins that need a lightweight file-based data storage.
 * 
 * @param pluginDir The absolute path to your plugin folder (e.g. `import.meta.dir`)
 * @param filename The name of the database file (e.g. `posts-12.json`)
 */
export async function readJsonDatabase<T>(pluginDir: string, filename: string): Promise<T[]> {
    const filePath = join(pluginDir, 'data', filename);
    try {
        const fileContent = await readFile(filePath, 'utf-8');
        return JSON.parse(fileContent) as T[];
    } catch {
        return []; // Fallback to an empty list if file doesn't exist
    }
}

/**
 * Securely write an array or object to a JSON file in your plugin's data folder.
 * Automatically creates parent directories if they do not exist.
 * 
 * @param pluginDir The absolute path to your plugin folder (e.g. `import.meta.dir`)
 * @param filename The name of the database file (e.g. `posts-12.json`)
 * @param data The JSON data payload to persist
 */
export async function writeJsonDatabase<T>(pluginDir: string, filename: string, data: T[]): Promise<void> {
    const dataDir = join(pluginDir, 'data');
    const filePath = join(dataDir, filename);
    await mkdir(dataDir, { recursive: true });
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Formats a premium expressive error message from external fetch responses.
 * Parses JSON response error messages if available, falling back to raw body text.
 */
export async function formatFetchError(response: Response, prefixContext: string): Promise<Error> {
    let details = '';
    try {
        const body = await response.json();
        details = body.message ? `: ${body.message}` : ` (Error Code: ${body.code || response.status})`;
    } catch {
        try {
            details = `: ${await response.text()}`;
        } catch {
            details = ` (HTTP status ${response.status})`;
        }
    }
    return new Error(`${prefixContext}${details}. Please verify API endpoints, keys, and connection params.`);
}
