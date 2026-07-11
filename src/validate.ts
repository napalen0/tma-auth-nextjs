import { createHmac } from 'crypto'

export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  photo_url?: string
}

export interface ValidatedInitData {
  user: TelegramUser
  authDate: number
  hash: string
  startParam?: string
  chatType?: string
  chatInstance?: string
}

export interface ValidateOptions {
  botToken: string
  maxAge?: number // seconds, default 86400 (24h)
}

/**
 * Validate Telegram Mini App initData string.
 *
 * Verifies the HMAC-SHA256 signature using the WebAppData secret key derived
 * from the bot token, checks expiry, and parses the user object.
 *
 * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateInitData(
  initData: string,
  options: ValidateOptions,
): ValidatedInitData | null {
  const { botToken, maxAge = 86400 } = options

  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return null

  // Build data-check-string: sorted key=value pairs joined by \n
  params.delete('hash')
  const entries = Array.from(params.entries())
  entries.sort(([a], [b]) => a.localeCompare(b))
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n')

  // HMAC-SHA256 with secret = HMAC-SHA256("WebAppData", bot_token)
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest()
  const computedHash = createHmac('sha256', new Uint8Array(secretKey))
    .update(dataCheckString)
    .digest('hex')

  if (computedHash !== hash) return null

  // Check expiry
  const authDate = parseInt(params.get('auth_date') || '0', 10)
  const now = Math.floor(Date.now() / 1000)
  if (maxAge > 0 && now - authDate > maxAge) return null

  // Parse user
  const userStr = params.get('user')
  if (!userStr) return null

  let user: TelegramUser
  try {
    user = JSON.parse(userStr)
  } catch {
    return null
  }

  return {
    user,
    authDate,
    hash,
    startParam: params.get('start_param') || undefined,
    chatType: params.get('chat_type') || undefined,
    chatInstance: params.get('chat_instance') || undefined,
  }
}
