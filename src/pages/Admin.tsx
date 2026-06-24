import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { useToast } from '../components/Toast'
import { Header } from '../components/Header'
import { Spinner } from '../components/Spinner'
import { AddMatchForm } from '../components/admin/AddMatchForm'
import { MatchAdminRow } from '../components/admin/MatchAdminRow'
import { Corrections } from '../components/admin/Corrections'
import type { Match, MatchResult, Player } from '../types'

// Shape returned by the admin matches query (base row + embedded result).
type MatchWithResult = Omit<
  Match,
  'final_home' | 'final_away' | 'scorers' | 'assisters'
> & { match_results: MatchResult | MatchResult[] | null }

export default function Admin() {
  const toast = useToast()
  const qc = useQueryClient()
  const { refreshPlayer } = useAuth()
  const [tab, setTab] = useState<'matches' | 'corrections'>('matches')

  const matchesQ = useQuery({
    queryKey: ['admin-matches'],
    queryFn: async (): Promise<Match[]> => {
      // Admin reads base scheduling + the gated result rows (RLS allows admin),
      // then flattens result fields onto each match for the editor.
      const { data, error } = await supabase
        .from('matches')
        .select('*, match_results(*)')
        .order('kickoff', { ascending: true })
      if (error) throw error
      return (data as MatchWithResult[]).map((row) => {
        const r = Array.isArray(row.match_results)
          ? row.match_results[0]
          : row.match_results
        return {
          ...row,
          final_home: r?.final_home ?? null,
          final_away: r?.final_away ?? null,
          scorers: r?.scorers ?? [],
          assisters: r?.assisters ?? [],
        } as Match
      })
    },
  })

  const playersQ = useQuery({
    queryKey: ['admin-players'],
    queryFn: async (): Promise<Player[]> => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('display_name', { ascending: true })
      if (error) throw error
      return data as Player[]
    },
  })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-matches'] })
    qc.invalidateQueries({ queryKey: ['matches'] })
    qc.invalidateQueries({ queryKey: ['admin-players'] })
    qc.invalidateQueries({ queryKey: ['leaderboard'] })
    // Wildcard allowances live on the auth player profile, not in a query —
    // refetch it so edits to your own account show without a page reload.
    void refreshPlayer()
  }

  const calcScore = useMutation({
    mutationFn: async (matchId: number) => {
      const { error } = await supabase.rpc('score_match', { p_match_id: matchId })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Points calculated')
      refresh()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Scoring failed'),
  })

  // The "most recent" match: the latest one that has already kicked off, or — if
  // none have yet — the next upcoming one. Used by the jump-to button so the admin
  // doesn't have to scroll through past rounds. Matches are ordered by kickoff asc.
  const currentMatchId = (() => {
    const list = matchesQ.data
    if (!list || list.length === 0) return null
    const now = Date.now()
    let started: Match | null = null
    for (const m of list) {
      if (new Date(m.kickoff).getTime() <= now) started = m
    }
    return (started ?? list[0]).id
  })()

  const jumpToCurrent = () => {
    if (currentMatchId == null) return
    const el = document.getElementById(`admin-match-${currentMatchId}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-extrabold">Admin Panel</h1>
          <div className="flex gap-2">
            <button
              className={tab === 'matches' ? 'btn-primary px-3 py-2 text-sm' : 'btn-ghost px-3 py-2 text-sm'}
              onClick={() => setTab('matches')}
            >
              Matches & Results
            </button>
            <button
              className={tab === 'corrections' ? 'btn-primary px-3 py-2 text-sm' : 'btn-ghost px-3 py-2 text-sm'}
              onClick={() => setTab('corrections')}
            >
              Corrections
            </button>
          </div>
        </div>

        {tab === 'matches' && (
          <>
            <AddMatchForm onCreated={refresh} />
            {currentMatchId != null && (
              <button className="btn-ghost px-3 py-2 text-sm" onClick={jumpToCurrent}>
                ⤓ Jump to current match
              </button>
            )}
            {matchesQ.isLoading ? (
              <div className="flex justify-center py-12">
                <Spinner label="Loading matches…" />
              </div>
            ) : (
              <div className="space-y-4">
                {matchesQ.data?.map((m) => (
                  <div key={m.id} id={`admin-match-${m.id}`} className="scroll-mt-4">
                    <MatchAdminRow
                      match={m}
                      onChanged={refresh}
                      onCalculate={() => calcScore.mutate(m.id)}
                      calculating={calcScore.isPending}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'corrections' && (
          <Corrections
            matches={matchesQ.data ?? []}
            players={playersQ.data ?? []}
            onChanged={refresh}
          />
        )}
      </main>
    </div>
  )
}
