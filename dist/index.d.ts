interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
    photo_url?: string;
}
interface ValidatedInitData {
    user: TelegramUser;
    authDate: number;
    hash: string;
    startParam?: string;
    chatType?: string;
    chatInstance?: string;
}
interface ValidateOptions {
    botToken: string;
    maxAge?: number;
}
/**
 * Validate Telegram Mini App initData string.
 *
 * Verifies the HMAC-SHA256 signature using the WebAppData secret key derived
 * from the bot token, checks expiry, and parses the user object.
 *
 * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
declare function validateInitData(initData: string, options: ValidateOptions): ValidatedInitData | null;

interface SessionConfig {
    secret: string;
    expiresIn?: string;
}
interface SessionPayload {
    sub: string;
    tgId: number;
    [key: string]: unknown;
}
/**
 * Sign a session JWT for the authenticated Telegram user.
 */
declare function signSession(payload: SessionPayload, config: SessionConfig): Promise<string>;
/**
 * Verify and decode a session JWT. Returns null if invalid or expired.
 */
declare function verifySession(token: string, config: SessionConfig): Promise<SessionPayload | null>;

interface ChannelMemberOptions {
    botToken: string;
}
/**
 * Check if a Telegram user is a member of a channel or group.
 * The bot must be an administrator of the channel.
 */
declare function isChannelMember(channel: string, telegramId: number, options: ChannelMemberOptions): Promise<boolean>;
interface SendMessageOptions {
    botToken: string;
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    disableLinkPreview?: boolean;
    button?: {
        text: string;
        url: string;
    } | {
        text: string;
        web_app: {
            url: string;
        };
    };
}
interface SendResult {
    ok: boolean;
    blocked: boolean;
    messageId?: number;
}
/**
 * Send a text message to a Telegram user via Bot API.
 * Returns `blocked: true` if the user blocked the bot or never started it.
 */
declare function sendMessage(chatId: number | string, text: string, options: SendMessageOptions): Promise<SendResult>;

export { type ChannelMemberOptions, type SendMessageOptions, type SendResult, type SessionConfig, type SessionPayload, type TelegramUser, type ValidateOptions, type ValidatedInitData, isChannelMember, sendMessage, signSession, validateInitData, verifySession };
