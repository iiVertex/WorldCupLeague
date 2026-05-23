import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, usernameToEmail } from '../lib/supabase'
import type { Player } from '../types'

interface AuthState {
  session: Session | null
  player: Player | null
  loading: boolean
  signIn: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshPlayer: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [player, setPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadPlayer(userId: string | undefined) {
    if (!userId) {
      setPlayer(null)
      return
    }
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    setPlayer((data as Player) ?? null)
  }

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      await loadPlayer(data.session?.user.id)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      loadPlayer(newSession?.user.id)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signIn = async (username: string, password: string) => {
    const email = usernameToEmail(username)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error('Invalid username or password')
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setPlayer(null)
  }

  const refreshPlayer = async () => {
    await loadPlayer(session?.user.id)
  }

  const value = useMemo<AuthState>(
    () => ({ session, player, loading, signIn, signOut, refreshPlayer }),
    [session, player, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
