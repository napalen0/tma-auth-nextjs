// Example: Protecting API routes with session verification
// File: app/api/protected/route.ts

import { NextResponse } from 'next/server'
import { verifySession } from 'tma-auth-nextjs'

const JWT_SECRET = process.env.JWT_SECRET!

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const session = await verifySession(token, { secret: JWT_SECRET })
  if (!session) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }

  // session.sub = user ID, session.tgId = Telegram user ID
  return NextResponse.json({ userId: session.sub, tgId: session.tgId })
}
