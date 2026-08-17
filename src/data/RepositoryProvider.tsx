import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../config/supabase'
import { userFromSupabase } from '../auth/authCore'
import type { AuthUser } from '../auth/authCore'
import type { ToolboxRepository } from './repository'
import { LocalRepository } from './local/LocalRepository'
import { SupabaseRepository } from './supabase/SupabaseRepository'

export type AuthMode = 'guest' | 'signed-in'

export interface RepositoryContextValue {
  repo: ToolboxRepository
  mode: AuthMode
  user: AuthUser | null
}

const RepositoryContext = createContext<RepositoryContextValue | undefined>(undefined)

export function RepositoryProvider({
  children,
  initialRepo,
}: {
  children: ReactNode
  /** Test/demo injection: use this repo and skip auth entirely. */
  initialRepo?: ToolboxRepository
}): ReactNode {
  const [state, setState] = useState<RepositoryContextValue>(() =>
    initialRepo
      ? { repo: initialRepo, mode: 'guest', user: null }
      : { repo: new LocalRepository(), mode: 'guest', user: null },
  )

  useEffect(() => {
    // Injected repo (tests/demo) or no Supabase configured -> stay in guest mode.
    if (initialRepo || !supabase) return
    const client = supabase

    client.auth
      .getSession()
      .then(({ data }) => {
        if (data.session) {
          setState({
            repo: new SupabaseRepository(client),
            mode: 'signed-in',
            user: userFromSupabase(data.session.user),
          })
        }
      })
      .catch(() => undefined)

    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setState({
          repo: new SupabaseRepository(client),
          mode: 'signed-in',
          user: userFromSupabase(session.user),
        })
      } else {
        setState({ repo: new LocalRepository(), mode: 'guest', user: null })
      }
    })

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [initialRepo])

  return <RepositoryContext.Provider value={state}>{children}</RepositoryContext.Provider>
}

export function useRepository(): ToolboxRepository {
  const context = useContext(RepositoryContext)
  if (!context) throw new Error('useRepository must be used within RepositoryProvider')
  return context.repo
}

export function useAuthMode(): { mode: AuthMode; user: AuthUser | null } {
  const context = useContext(RepositoryContext)
  if (!context) throw new Error('useAuthMode must be used within RepositoryProvider')
  return { mode: context.mode, user: context.user }
}