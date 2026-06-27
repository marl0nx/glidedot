declare module 'discord-webhook-node' {
    export class Webhook {
        constructor(url: string);
        setAvatar(avatarUrl: string): void;
        send(message: string | MessageBuilder): Promise<void>;
    }
    export class MessageBuilder {
        setTitle(title: string): this;
        setDescription(description: string): this;
        setColor(color: number): this;
        setFooter(footer: string, iconUrl?: string): this;
        setTimestamp(): this;
        addField(name: string, value: string, inline?: boolean): this;
        setText(text: string): this;
    }
}
