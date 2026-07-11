// Example: Channel subscription gate
// File: app/api/check-subscription/route.ts

import { NextResponse } from 'next/server'
import { verifySession, isChannelMember } from 'tma-auth-nextjs'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const JWT_SECRET = process.env.JWT_SECRET!
const REQUIRED_CHANNEL = '@your_channel'

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const session = await verifySession(token, { secret: JWT_SECRET })
  if (!session) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }

  const isMember = await isChannelMember(
    REQUIRED_CHANNEL,
    session.tgId,
    { botToken: BOT_TOKEN },
  )

  return NextResponse.json({ subscribed: isMember })
}
