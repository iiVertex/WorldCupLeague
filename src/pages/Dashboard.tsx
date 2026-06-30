import { useMemo, useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { useToast } from '../components/Toast'
import { Header } from '../components/Header'
import { StatCard } from '../components/StatCard'
import { WildcardChips } from '../components/WildcardChips'
import { LeaderboardModal } from '../components/LeaderboardModal'
import { MatchCard, type PredictionInput } from '../components/MatchCard'
import { MatchdayBar, MATCHDAYS, type MatchdayKey } from '../components/MatchdayBar'
import { WILDCARD_RESET_MATCHDAY } from '../lib/scoring'
import { Spinner } from '../components/Spinner'
import type { LeaderboardRow, Match, Prediction, PredictionPhase } from '../types'

export default function Dashboard() {
  const { player } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()

  const matchesQ = useQuery({
    queryKey: ['matches'],
    queryFn: async (): Promise<Match[]> => {
      // Read the safe view: result columns are NULL until the admin publishes.
      const { data, error } = await supabase
        .from('match_view')
        .select('*')
        .order('kickoff', { ascending: true })
      if (error) throw error
      return data as Match[]
    },
  })

  const predsQ = useQuery({
    queryKey: ['my-predictions', player?.id],
    enabled: !!player,
    queryFn: async (): Promise<Prediction[]> => {
      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('player_id', player!.id)
      if (error) throw error
      return data as Prediction[]
    },
  })

  const leaderboardQ = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async (): Promise<LeaderboardRow[]> => {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('total_points', { ascending: false })
      if (error) throw error
      return data as LeaderboardRow[]
    },
  })

  const myPoints =
    leaderboardQ.data?.find((r) => r.player_id === player?.id)?.total_points ?? 0

  const preds = predsQ.data ?? []

  // Remaining wildcards = allowance − distinct matches used (edit-safe). Usage is
  // counted only from WILDCARD_RESET_MATCHDAY onward — cards spent on earlier
  // matchdays don't count, so the "3 each from MD4" allocation can't drift.
  const remaining = useMemo(() => {
    const allowance = {
      double: player?.wc_double ?? 0,
      late: player?.wc_late ?? 0,
      assist: player?.wc_assist ?? 0,
    }
    const matchdayById = new Map<number, number | null>(
      (matchesQ.data ?? []).map((m) => [m.id, m.matchday]),
    )
    const counts = (md: number | null | undefined) =>
      md != null && md >= WILDCARD_RESET_MATCHDAY
    const usedDouble = new Set(
      preds.filter((p) => p.wc_double && counts(matchdayById.get(p.match_id))).map((p) => p.match_id),
    ).size
    const usedAssist = new Set(
      preds.filter((p) => p.wc_assist && counts(matchdayById.get(p.match_id))).map((p) => p.match_id),
    ).size
    const usedLate = new Set(
      preds
        .filter((p) => p.phase === 'late' && counts(matchdayById.get(p.match_id)))
        .map((p) => p.match_id),
    ).size
    return {
      double: Math.max(0, allowance.double - usedDouble),
      late: Math.max(0, allowance.late - usedLate),
      assist: Math.max(0, allowance.assist - usedAssist),
    }
  }, [preds, player, matchesQ.data])

  const submit = useMutation({
    mutationFn: async ({
      matchId,
      values,
      phase,
    }: {
      matchId: number
      values: PredictionInput
      phase: PredictionPhase
    }) => {
      const { error } = await supabase.from('predictions').upsert(
        {
          match_id: matchId,
          player_id: player!.id,
          pred_home: Number(values.pred_home) || 0,
          pred_away: Number(values.pred_away) || 0,
          pred_scorer: values.pred_scorer || null,
          pred_assist: values.pred_assist || null,
          wc_double: values.wc_double,
          wc_assist: values.wc_assist,
          phase,
        },
        { onConflict: 'match_id,player_id,phase' },
      )
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Prediction saved!')
      qc.invalidateQueries({ queryKey: ['my-predictions', player?.id] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not save'),
  })

  const predsByMatch = useMemo(() => {
    const map = new Map<number, { initial?: Prediction; late?: Prediction }>()
    for (const p of preds) {
      const entry = map.get(p.match_id) ?? {}
      entry[p.phase] = p
      map.set(p.match_id, entry)
    }
    return map
  }, [preds])

  // Group matches into rounds (MD1..MD5); anything unassigned/out-of-range falls
  // into an "Other" bucket so it stays visible until a round is assigned.
  const { byRound, counts, otherMatches } = useMemo(() => {
    const byRound = new Map<number, Match[]>()
    const otherMatches: Match[] = []
    const counts: Record<number, number> = {}
    for (const m of matchesQ.data ?? []) {
      const md = m.matchday
      if (md != null && (MATCHDAYS as readonly number[]).includes(md)) {
        const arr = byRound.get(md) ?? []
        arr.push(m)
        byRound.set(md, arr)
        counts[md] = (counts[md] ?? 0) + 1
      } else {
        otherMatches.push(m)
      }
    }
    return { byRound, counts, otherMatches }
  }, [matchesQ.data])

  // Default to the first round that has matches (then "Other", then MD1).
  const defaultMd: MatchdayKey = useMemo(() => {
    const first = MATCHDAYS.find((md) => (counts[md] ?? 0) > 0)
    if (first) return first
    if (otherMatches.length > 0) return 'other'
    return 1
  }, [counts, otherMatches])

  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [activeMd, setActiveMd] = useState<MatchdayKey | null>(null)
  const active = activeMd ?? defaultMd
  const shownMatches = active === 'other' ? otherMatches : (byRound.get(active) ?? [])

  const loading = matchesQ.isLoading || predsQ.isLoading

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-6">
        {/* Stats */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Welcome" value={player?.display_name ?? '—'} hint="Good luck! ⚽" />
          <StatCard label="Total Points" value={myPoints} hint="From published matches" />
          <div className="card p-5">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
              Wildcards Left
            </span>
            <div className="mt-3">
              {player && (
                <WildcardChips
                  player={{
                    ...player,
                    wc_double: remaining.double,
                    wc_late: remaining.late,
                    wc_assist: remaining.assist,
                  }}
                />
              )}
            </div>
          </div>
        </section>

        {/* Quick access to standings */}
        <button
          className="btn-primary w-full py-3 text-base"
          onClick={() => setLeaderboardOpen(true)}
        >
          🏆 View Leaderboard
        </button>

        {/* Matches */}
        <section>
          <h2 className="mb-4 font-display text-xl font-extrabold">Matches</h2>
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner label="Loading matches…" />
            </div>
          ) : matchesQ.data?.length === 0 ? (
            <p className="text-white/40">No matches scheduled yet.</p>
          ) : (
            <>
              <MatchdayBar
                counts={counts}
                otherCount={otherMatches.length}
                active={active}
                onSelect={setActiveMd}
              />
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {shownMatches.map((m) => {
                  const mp = predsByMatch.get(m.id)
                  return (
                    <MatchCard
                      key={m.id}
                      match={m}
                      initial={mp?.initial}
                      late={mp?.late}
                      remaining={remaining}
                      onSubmit={(values, phase) =>
                        submit.mutateAsync({ matchId: m.id, values, phase })
                      }
                    />
                  )
                })}
                {shownMatches.length === 0 && (
                  <p className="text-white/40">No matches in this round yet.</p>
                )}
              </div>
            </>
          )}
        </section>
      </main>

      {leaderboardOpen && (
        <LeaderboardModal
          rows={leaderboardQ.data ?? []}
          currentPlayerId={player?.id}
          onClose={() => setLeaderboardOpen(false)}
        />
      )}
    </div>
  )
}
