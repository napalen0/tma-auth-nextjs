import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

export interface SessionConfig {
  secret: string
  expiresIn?: string // jose duration, default '7d'
}

export interface SessionPayload {
  sub: string
  tgId: number
  [key: string]: unknown
}

function encodeSecret(secret: string): Uint8Array {
  return new TextEncoder().encode(secret)
}

/**
 * Sign a session JWT for the authenticated Telegram user.
 */
export async function signSession(
  payload: SessionPayload,
  config: SessionConfig,
): Promise<string> {
  const { secret, expiresIn = '7d' } = config
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(encodeSecret(secret))
}

/**
 * Verify and decode a session JWT. Returns null if invalid or expired.
 */
export async function verifySession(
  token: string,
  config: SessionConfig,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodeSecret(config.secret))
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}
