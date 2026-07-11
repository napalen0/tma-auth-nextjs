<div align="center">

# tma-auth-nextjs

**Telegram Mini App authentication for Next.js**

initData validation, JWT sessions, channel membership — production-ready, zero config.

[![npm version](https://img.shields.io/npm/v/tma-auth-nextjs.svg)](https://www.npmjs.com/package/tma-auth-nextjs)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-3178C6.svg)](tsconfig.json)

<br>

```
Telegram WebApp → initData → HMAC verify → JWT session → your API
```

</div>

---

## Why

Building a Telegram Mini App with Next.js? You need to:

1. Validate `initData` (HMAC-SHA256 with WebAppData secret)
2. Issue JWT sessions so users stay logged in
3. Maybe check channel subscriptions

Sounds simple, but the [official docs](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app) leave you with raw crypto primitives. Most tutorials get the key derivation wrong, skip expiry checks, or use `jsonwebtoken` (which doesn't work in Edge Runtime).

This package does it right in ~200 lines. Battle-tested in production with real Telegram Mini Apps.

---

## Install

```bash
npm install tma-auth-nextjs
```

Only one dependency: [`jose`](https://github.com/panva/jose) (Edge Runtime compatible JWT library).

---

## Quick Start

### 1. Auth endpoint

```typescript
// app/api/auth/route.ts
import { NextResponse } from 'next/server'
import { validateInitData, signSession } from 'tma-auth-nextjs'

export async function POST(req: Request) {
  const { initData } = await req.json()

  // Validate Telegram signature
  const data = validateInitData(initData, {
    botToken: process.env.TELEGRAM_BOT_TOKEN!,
  })
  if (!data) {
    return NextResponse.json({ error: 'Invalid' }, { status: 401 })
  }

  // Issue JWT session (7 days by default)
  const token = await signSession(
    { sub: String(data.user.id), tgId: data.user.id },
    { secret: process.env.JWT_SECRET! },
  )

  return NextResponse.json({ token, user: data.user })
}
```

### 2. Client-side

```typescript
// In your Telegram Mini App
const webApp = window.Telegram.WebApp

const res = await fetch('/api/auth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ initData: webApp.initData }),
})

const { token, user } = await res.json()
// Store token, use in Authorization header for subsequent requests
```

### 3. Protect routes

```typescript
// app/api/protected/route.ts
import { verifySession } from 'tma-auth-nextjs'

export async function GET(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const session = await verifySession(token!, {
    secret: process.env.JWT_SECRET!,
  })
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  // session.sub = user ID, session.tgId = Telegram user ID
  return Response.json({ userId: session.sub })
}
```

---

## API

### `validateInitData(initData, options)`

Validates Telegram Mini App `initData` string.

```typescript
import { validateInitData } from 'tma-auth-nextjs'

const result = validateInitData(initData, {
  botToken: 'YOUR_BOT_TOKEN',   // required
  maxAge: 86400,                 // optional, seconds (default: 24h, 0 = no expiry check)
})

// Returns null if invalid, or:
// {
//   user: { id, first_name, last_name?, username?, language_code?, is_premium? },
//   authDate: number,
//   hash: string,
//   startParam?: string,
//   chatType?: string,
//   chatInstance?: string,
// }
```

**What it does under the hood:**
1. Parses the URL-encoded `initData` string
2. Builds the `data-check-string` (sorted key=value pairs joined by `\n`)
3. Derives the secret: `HMAC-SHA256("WebAppData", bot_token)`
4. Computes: `HMAC-SHA256(secret, data_check_string)`
5. Compares with the provided `hash`
6. Checks `auth_date` is within `maxAge`
7. Parses and returns the `user` object

### `signSession(payload, config)` / `verifySession(token, config)`

JWT session management using `jose` (works in Edge Runtime, Node.js, and Workers).

```typescript
import { signSession, verifySession } from 'tma-auth-nextjs'

const config = {
  secret: 'your-jwt-secret',    // required
  expiresIn: '7d',              // optional (default: '7d')
}

// Sign
const token = await signSession(
  { sub: '123', tgId: 456, role: 'user' },  // custom fields allowed
  config,
)

// Verify
const payload = await verifySession(token, config)
// null if invalid/expired, or { sub, tgId, ...customFields }
```

### `isChannelMember(channel, telegramId, options)`

Check if a user is subscribed to a Telegram channel/group.

```typescript
import { isChannelMember } from 'tma-auth-nextjs'

const subscribed = await isChannelMember(
  '@your_channel',        // channel username or numeric chat ID
  user.id,                // Telegram user ID
  { botToken: 'TOKEN' },  // bot must be admin in the channel
)
```

### `sendMessage(chatId, text, options)`

Send a message via Bot API with bot-blocked detection.

```typescript
import { sendMessage } from 'tma-auth-nextjs'

const result = await sendMessage(userId, 'Hello!', {
  botToken: 'TOKEN',
  parseMode: 'HTML',              // optional, default 'HTML'
  disableLinkPreview: true,       // optional, default true
  button: { text: 'Open', url: 'https://...' },  // optional inline button
})

// { ok: boolean, blocked: boolean, messageId?: number }
// blocked = true means user blocked the bot (permanent, don't retry)
```

---

## Environment Variables

| Variable | Used by |
|---|---|
| `TELEGRAM_BOT_TOKEN` | `validateInitData`, `isChannelMember`, `sendMessage` |
| `JWT_SECRET` | `signSession`, `verifySession` |

You can pass these directly in options instead of using env vars — the library doesn't read `process.env` itself.

---

## Edge Runtime

This package works in Next.js Edge Runtime, Cloudflare Workers, and Vercel Edge Functions. It uses `jose` (not `jsonwebtoken`) and Node.js `crypto` module (available in all modern runtimes).

---

## Common Patterns

### Channel subscription gate

Require users to subscribe to your channel before accessing features:

```typescript
const subscribed = await isChannelMember('@mychannel', session.tgId, { botToken })
if (!subscribed) {
  return NextResponse.json({ error: 'Subscribe to @mychannel first' }, { status: 403 })
}
```

### Referral tracking via startParam

```typescript
const data = validateInitData(initData, { botToken })
if (data?.startParam) {
  // startParam comes from t.me/your_bot?startapp=REF_CODE
  await trackReferral(data.user.id, data.startParam)
}
```

### Custom session fields

```typescript
const token = await signSession(
  { sub: String(user.id), tgId: user.id, role: 'admin', plan: 'pro' },
  { secret: JWT_SECRET },
)

const session = await verifySession(token, { secret: JWT_SECRET })
// session.role === 'admin', session.plan === 'pro'
```

---

## Examples

See the [`examples/`](examples/) directory:

- [`nextjs-auth-route.ts`](examples/nextjs-auth-route.ts) — Full auth endpoint with user upsert
- [`protected-route.ts`](examples/protected-route.ts) — JWT-protected API route
- [`client-hook.ts`](examples/client-hook.ts) — React hook for client-side auth
- [`channel-gate.ts`](examples/channel-gate.ts) — Channel subscription check

---

## Security

- HMAC validation follows the [official Telegram specification](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app) exactly
- Uses `HMAC-SHA256` with proper two-step key derivation (not raw bot token)
- `auth_date` expiry check prevents replay attacks (default: 24 hours)
- JWT via `jose` with HS256 — no algorithm confusion attacks
- `sendMessage` detects bot-blocked status (403/400) so you don't retry permanently failed deliveries

---

## License

MIT — free to use, modify, fork, and build upon. See [LICENSE](LICENSE).

---

<div align="center">

### Support the Project

If this package saved you time, consider supporting development:

**BTC** `bc1qxt2jyf7w7wmf8y96875y9yk5sas5gqss4um48j`

Built by [473 Studios](https://github.com/napalen0)

</div>
