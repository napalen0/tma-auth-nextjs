// Example: Client-side auth hook for Telegram Mini App
// File: hooks/useTmaAuth.ts

'use client'

import { useEffect, useState } from 'react'

interface TmaUser {
  id: number
  username?: string
  firstName: string
  isPremium?: boolean
}

interface AuthState {
  token: string | null
  user: TmaUser | null
  loading: boolean
  error: string | null
}

export function useTmaAuth() {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    const authenticate = async () => {
      try {
        // Get initData from Telegram WebApp
        const webApp = (window as any).Telegram?.WebApp
        if (!webApp?.initData) {
          setState(s => ({ ...s, loading: false, error: 'Not in Telegram' }))
          return
        }

        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: webApp.initData }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setState(s => ({ ...s, loading: false, error: data.error || 'Auth failed' }))
          return
        }

        const { token, user } = await res.json()
        setState({ token, user, loading: false, error: null })
      } catch (e) {
        setState(s => ({ ...s, loading: false, error: 'Network error' }))
      }
    }

    authenticate()
  }, [])

  return state
}
