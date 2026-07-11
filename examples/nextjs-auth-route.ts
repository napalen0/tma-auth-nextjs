// Example: Next.js App Router auth endpoint
// File: app/api/auth/route.ts

import { NextResponse } from 'next/server'
import { validateInitData, signSession } from 'tma-auth-nextjs'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const JWT_SECRET = process.env.JWT_SECRET!

export async function POST(req: Request) {
  try {
    const { initData } = await req.json()
    if (!initData) {
      return NextResponse.json({ error: 'Missing initData' }, { status: 400 })
    }

    // 1. Validate Telegram initData
    const validated = validateInitData(initData, { botToken: BOT_TOKEN })
    if (!validated) {
      return NextResponse.json({ error: 'Invalid initData' }, { status: 401 })
    }

    const { user, startParam } = validated

    // 2. Upsert user in your database
    // const dbUser = await prisma.user.upsert({
    //   where: { telegramId: user.id },
    //   create: { telegramId: user.id, username: user.username },
    //   update: { username: user.username },
    // })

    // 3. Sign session JWT
    const token = await signSession(
      { sub: String(user.id), tgId: user.id },
      { secret: JWT_SECRET },
    )

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.first_name,
        isPremium: user.is_premium,
      },
    })
  } catch (e) {
    console.error('Auth error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
