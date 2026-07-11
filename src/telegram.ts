export interface ChannelMemberOptions {
  botToken: string
}

/**
 * Check if a Telegram user is a member of a channel or group.
 * The bot must be an administrator of the channel.
 */
export async function isChannelMember(
  channel: string,
  telegramId: number,
  options: ChannelMemberOptions,
): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${options.botToken}/getChatMember?chat_id=${encodeURIComponent(channel)}&user_id=${telegramId}`
    const res = await fetch(url)
    const data = (await res.json()) as Record<string, unknown>
    if (!data.ok) return false
    const status = (data.result as Record<string, unknown>)?.status
    return status === 'member' || status === 'administrator' || status === 'creator'
  } catch {
    return false
  }
}

export interface SendMessageOptions {
  botToken: string
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'
  disableLinkPreview?: boolean
  button?: { text: string; url: string } | { text: string; web_app: { url: string } }
}

export interface SendResult {
  ok: boolean
  blocked: boolean
  messageId?: number
}

/**
 * Send a text message to a Telegram user via Bot API.
 * Returns `blocked: true` if the user blocked the bot or never started it.
 */
export async function sendMessage(
  chatId: number | string,
  text: string,
  options: SendMessageOptions,
): Promise<SendResult> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${options.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options.parseMode ?? 'HTML',
        link_preview_options: { is_disabled: options.disableLinkPreview ?? true },
        ...(options.button && {
          reply_markup: { inline_keyboard: [[options.button]] },
        }),
      }),
    })
    if (res.ok) {
      const data = (await res.json().catch(() => ({}))) as Record<string, any>
      return { ok: true, blocked: false, messageId: data?.result?.message_id }
    }
    const data = (await res.json().catch(() => ({}))) as Record<string, any>
    const blocked =
      res.status === 403 ||
      (res.status === 400 && /not found|blocked|deactivated/i.test(data?.description || ''))
    return { ok: false, blocked }
  } catch {
    return { ok: false, blocked: false }
  }
}
