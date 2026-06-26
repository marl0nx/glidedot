import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { settings } from '../../settings/schema';
import { env } from '../../../config/env';

import { encryptString, decryptString } from '../../../utils/encryption';

export class DeeplService {
    constructor(private db: FastifyInstance['db']) {}

    async translate(text: string[], targetLang: string, sourceLang?: string): Promise<string[]> {
        const apiKeySetting = await this.db.select().from(settings).where(eq(settings.key, 'deeplApiKey')).limit(1);
        let apiKey = env.DEEPL_API_KEY;
        if (apiKeySetting.length > 0 && apiKeySetting[0].value) {
            try {
                apiKey = decryptString(apiKeySetting[0].value);
            } catch {
                apiKey = apiKeySetting[0].value;
            }
        }

        const apiUrlSetting = await this.db.select().from(settings).where(eq(settings.key, 'deeplApiUrl')).limit(1);
        let apiUrl = env.DEEPL_API_URL;
        if (apiUrlSetting.length > 0 && apiUrlSetting[0].value) {
            apiUrl = apiUrlSetting[0].value;
        }

        if (!apiKey) {
            throw new Error('DeepL API Key is not configured');
        }

        const body = {
            text,
            target_lang: targetLang.toUpperCase(),
            source_lang: sourceLang?.toUpperCase(),
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

