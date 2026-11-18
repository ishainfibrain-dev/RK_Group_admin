/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { profileApi } from '../services/api'
import type { AppUser } from '../types/domain'

type AuthState = {
  session: Session | null
  profile: AppUser | null
  permissions: string[]
  loading: boolean
  error: string | null
  has: (permission: string) => boolean
  reload: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<AppUser | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (nextSession: Session | null) => {
    if (!nextSession?.user) {
      setProfile(null)
      setPermissions([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [nextProfile, nextPermissions] = await Promise.all([
        profileApi.get(nextSession.user.id),
        profileApi.permissions(),
      ])
      setProfile(nextProfile)
      setPermissions(nextPermissions)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
      setProfile(null)
      setPermissions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      void load(data.session)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      queueMicrotask(() => void load(nextSession))
    })
    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [load])

  const value = useMemo<AuthState>(() => ({
    session,
    profile,
    permissions,
    loading,
    error,
    has: (permission) => permissions.includes(permission),
    reload: () => load(session),
  }), [session, profile, permissions, loading, error, load])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider.')
  return value
}
