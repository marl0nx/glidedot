function formatLangCode(code: string): string {
    if (!code) return code;
    const parts = code.split(/[-_]/);
    const lang = parts[0].toLowerCase();

    // Chinese and Portuguese have significantly different variants, keep country suffix
    if (lang === 'zh' || lang === 'pt') {
        return code.replace('_', '-');
    }

    // Google Translate is very forgiving, but for standard languages like de-DE, de_DE
    // sending just the primary code is safer.
    return parts[0];
}

export class GoogleService {
    async translate(text: string[], targetLang: string, sourceLang?: string): Promise<string[]> {
        const results: string[] = [];

        const formattedTarget = formatLangCode(targetLang);
        const formattedSource = sourceLang ? formatLangCode(sourceLang) : 'auto';

        for (const segment of text) {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${formattedSource}&tl=${formattedTarget}&dt=t&q=${encodeURIComponent(segment)}`;

            const response = await fetch(url);

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Google translation failed: ${error}`);
            }

            const data = await response.json() as any;
            const translatedText = data[0].map((item: any) => item[0]).join('');
            results.push(translatedText);
        }

        return results;
    }
}

