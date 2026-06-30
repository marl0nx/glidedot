import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { settings } from '../../settings/schema';

import { encryptString, decryptString } from '../../../utils/encryption';

function formatLangCode(code: string, isTarget: boolean): string {
    if (!code) return code;
    const parts = code.split(/[-_]/);
    const lang = parts[0].toLowerCase();

    // Chinese and Portuguese have significantly different variants, keep country suffix
    if (lang === 'zh' || lang === 'pt') {
        return code.replace('_', '-');
    }

    // DeepL requires target language for English to specify region (EN-US or EN-GB)
    if (isTarget && lang === 'en') {
        const suffix = parts[1]?.toUpperCase();
        if (suffix === 'US' || suffix === 'GB') {
            return `en-${suffix}`;
        }
        return 'en-US';
    }

    // For all other languages (like de-DE, fr-FR), just use the primary language code
    return parts[0];
}

export class DeeplService {
    constructor(private db: FastifyInstance['db']) {}

    async translate(text: string[], targetLang: string, sourceLang?: string): Promise<string[]> {
        const apiKeySetting = await this.db.select().from(settings).where(eq(settings.key, 'deeplApiKey')).limit(1);
        let apiKey = null;
        if (apiKeySetting.length > 0 && apiKeySetting[0].value) {
            try {
                apiKey = decryptString(apiKeySetting[0].value);
            } catch {
                apiKey = apiKeySetting[0].value;
            }
        }

        const apiUrlSetting = await this.db.select().from(settings).where(eq(settings.key, 'deeplApiUrl')).limit(1);
        let apiUrl = 'https://api-free.deepl.com/v2';
        if (apiUrlSetting.length > 0 && apiUrlSetting[0].value) {
            apiUrl = apiUrlSetting[0].value;
        }

        if (!apiKey) {
            throw new Error('DeepL API Key is not configured');
        }

        const formattedTarget = formatLangCode(targetLang, true);
        const formattedSource = sourceLang ? formatLangCode(sourceLang, false) : undefined;

        const body = {
            text,
            target_lang: formattedTarget.toUpperCase(),
            source_lang: formattedSource?.toUpperCase(),
        };

        const response = await fetch(`${apiUrl}/translate`, {
            method: 'POST',
            headers: {
                'Authorization': `DeepL-Auth-Key ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('DeepL API Key is invalid or unauthorized.');
            }
            if (response.status === 456) {
                throw new Error('DeepL API Quota exceeded.');
            }
            const error = await response.text();
            throw new Error(`DeepL translation failed: ${error}`);
        }

        const data = await response.json() as { translations: { text: string }[] };
        return data.translations.map(t => t.text);
    }
}

