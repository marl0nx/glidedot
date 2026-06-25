import { Webhook, MessageBuilder } from 'discord-webhook-node';

export class NotificationService {
    private static throttleMap = new Map<string, number>();

    static async send(
        alertConfig: { provider: 'none' | 'discord' | 'slack' | 'ntfy' | 'custom' | 'telegram' | 'gotify'; url: string; events: string[]; pingUserId?: string } | null | undefined,
        event: string,
        payload: { title: string; message: string; [key: string]: any },
        options?: { throttleKey?: string; throttleHours?: number }
    ) {
        if (!alertConfig || alertConfig.provider === 'none' || !alertConfig.url) {
            return;
        }

        if (!alertConfig.events.includes(event) && !event.startsWith('test.')) {
            return;
        }

        if (options?.throttleKey && options.throttleHours) {
            const lastSent = this.throttleMap.get(options.throttleKey);
            const now = Date.now();
            const throttleMs = options.throttleHours * 60 * 60 * 1000;
            
            if (lastSent && now - lastSent < throttleMs) {
                return; // Throttled, do not send
            }
            this.throttleMap.set(options.throttleKey, now);
        }

        try {
            switch (alertConfig.provider) {
                case 'discord':
                    await this.sendDiscord(alertConfig.url, payload, alertConfig.pingUserId, alertConfig.avatarUrl);
                    break;
                case 'slack':
                    await this.sendSlack(alertConfig.url, payload);
                    break;
                case 'ntfy':
                    await this.sendNtfy(alertConfig.url, payload);
                    break;
                case 'telegram':
                    await this.sendTelegram(alertConfig.url, payload);
                    break;
                case 'gotify':
                    await this.sendGotify(alertConfig.url, payload);
                    break;
                case 'custom':
                    await this.sendCustom(alertConfig.url, payload, event);
                    break;
            }
        } catch (error) {
            console.error(`Failed to send ${alertConfig.provider} notification for event ${event}:`, error);
        }
    }

    private static async sendDiscord(url: string, payload: { title: string; message: string; [key: string]: any }, pingUserId?: string, avatarUrl?: string) {
        const hook = new Webhook(url);
        
        if (avatarUrl) {
            hook.setAvatar(avatarUrl);
        }

        const embed = new MessageBuilder()
            .setTitle(payload.title)
            .setDescription(payload.message)
            .setColor(0x0284c7) // Primary color of glide (tailwind primary-600 approx)
            .setFooter('Powered by glide.', avatarUrl || 'https://raw.githubusercontent.com/marl0nx/glide/main/apps/frontend/public/icon.png')
            .setTimestamp();

        // Add additional fields if they exist in payload
        for (const [key, value] of Object.entries(payload)) {
            if (key !== 'title' && key !== 'message' && typeof value === 'string' && value.length > 0) {
                // capitalize first letter for the field name
                const fieldName = key.charAt(0).toUpperCase() + key.slice(1);
                embed.addField(fieldName, value, true);
            }
        }

        if (pingUserId) {
            embed.setText(`<@${pingUserId}>`);
        }

        await hook.send(embed);
    }

    private static async sendSlack(url: string, payload: { title: string; message: string }) {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: `*${payload.title}*\n${payload.message}`
            })
        });
    }

    private static async sendNtfy(url: string, payload: { title: string; message: string }) {
        // ntfy.sh requires the Title header to be RFC 2047 encoded if it contains non-ASCII characters (like emojis)
        const encodedTitle = `=?UTF-8?B?${Buffer.from(payload.title).toString('base64')}?=`;
        await fetch(url, {
            method: 'POST',
            headers: {
                'Title': encodedTitle,
                'Content-Type': 'text/plain; charset=utf-8'
            },
            body: Buffer.from(payload.message, 'utf8')
        });
    }

    private static async sendCustom(url: string, payload: any, event: string) {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event,
                ...payload
            })
        });
    }

    private static async sendTelegram(url: string, payload: { title: string; message: string }) {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: `*${payload.title}*\n${payload.message}`,
                parse_mode: 'Markdown'
            })
        });
    }

    private static async sendGotify(url: string, payload: { title: string; message: string }) {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: payload.title,
                message: payload.message,
                priority: 5
            })
        });
    }
}
