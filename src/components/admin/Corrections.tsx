import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { adminCanSeePredictions } from '../../lib/scoring'
import { useToast } from '../Toast'
import type { Match, Player, Prediction } from '../../types'

type PredWithPlayer = Prediction & { players: { display_name: string; username: string } | null }

export function Corrections({
  matches,
  players,
  onChanged,
}: {
  matches: Match[]
  players: Player[]
  onChanged: () => void
}) {
  const toast = useToast()
  const [matchId, setMatchId] = useState<number | ''>('')

  // Admins are participants too, so other players' picks stay hidden until the
  // match has effectively finished (2h after kickoff) or results are published.
  const selectedMatch = matchId !== '' ? matches.find((m) => m.id === matchId) : undefined
  const canSee = selectedMatch ? adminCanSeePredictions(selectedMatch) : false

  const predsQ = useQuery({
    queryKey: ['admin-preds', matchId],
    enabled: matchId !== '' && canSee,
    queryFn: async (): Promise<PredWithPlayer[]> => {
      const { data, error } = await supabase
        .from('predictions')
        .select('*, players(display_name, username)')
        .eq('match_id', matchId)
      if (error) throw error
      return data as PredWithPlayer[]
    },
  })

  const savePoints = async (predId: number, points: number) => {
    const { error } = await supabase
      .from('predictions')
      .update({ points, points_overridden: true })
      .eq('id', predId)
    if (error) return toast.error(error.message)
    toast.success('Points updated')
    onChanged()
  }

  const saveWildcards = async (p: Player, fields: Partial<Player>) => {
    const { error } = await supabase.from('players').update(fields).eq('id', p.id)
    if (error) return toast.error(error.message)
    toast.success(`${p.display_name}'s wildcards updated`)
    onChanged()
  }

  return (
    <div className="space-y-8">
      {/* Edit predictions / points */}
      <section className="card space-y-4 p-5">
        <h3 className="font-display font-bold">Edit predictions & points</h3>
        <select
          className="input max-w-sm"
          value={matchId}
          onChange={(e) => setMatchId(e.target.value ? Number(e.target.value) : '')}
        >
          <option value="">Select a match…</option>
          {matches.map((m) => (
            <option key={m.id} value={m.id}>
              {m.home_team} vs {m.away_team}
            </option>
          ))}
        </select>

        {matchId !== '' && !canSee && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center text-sm text-white/60">
            🔒 Predictions are hidden until 2 hours after kickoff (or once results are
            published) to keep things fair.
          </div>
        )}

        {matchId !== '' && canSee && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-white/50">
                <tr>
                  <th className="py-2 pr-3">Player</th>
                  <th className="py-2 pr-3">Phase</th>
                  <th className="py-2 pr-3">Pick</th>
                  <th className="py-2 pr-3">Scorer / Assist</th>
                  <th className="py-2 pr-3">WC</th>
                  <th className="py-2 pr-3">Points</th>
                </tr>
              </thead>
              <tbody>
                {predsQ.data?.map((p) => (
                  <PredRow key={p.id} pred={p} onSave={savePoints} />
                ))}
                {predsQ.data?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-white/40">
                      No predictions for this match.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Wildcard allowances */}
      <section className="card space-y-4 p-5">
        <h3 className="font-display font-bold">Wildcard allowances</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-white/50">
              <tr>
                <th className="py-2 pr-3">Player</th>
                <th className="py-2 pr-3">Double</th>
                <th className="py-2 pr-3">Late</th>
                <th className="py-2 pr-3">Assist</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <WildcardRow key={p.id} player={p} onSave={saveWildcards} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function PredRow({
  pred,
  onSave,
}: {
  pred: PredWithPlayer
  onSave: (id: number, points: number) => void
}) {
  const [points, setPoints] = useState(pred.points)
  return (
    <tr className="border-t border-white/5">
      <td className="py-2 pr-3 font-semibold">{pred.players?.display_name ?? '—'}</td>
      <td className="py-2 pr-3 text-white/60">{pred.phase}</td>
      <td className="py-2 pr-3">
        {pred.pred_home}–{pred.pred_away}
      </td>
      <td className="py-2 pr-3 text-white/60">
        {pred.pred_scorer || '—'} / {pred.pred_assist || '—'}
      </td>
      <td className="py-2 pr-3 text-xs">
        {pred.wc_double && <span className="text-sky-accent">×2 </span>}
        {pred.wc_assist && <span className="text-success">🅰</span>}
      </td>
      <td className="flex items-center gap-2 py-2 pr-3">
        <input
          type="number"
          className="input w-20 py-1"
          value={points}
          onChange={(e) => setPoints(Number(e.target.value))}
        />
        <button className="btn-ghost px-2 py-1 text-xs" onClick={() => onSave(pred.id, points)}>
          Save
        </button>
        {pred.points_overridden && <span className="text-xs text-warn">manual</span>}
      </td>
    </tr>
  )
}

function WildcardRow({
  player,
  onSave,
}: {
  player: Player
  onSave: (p: Player, fields: Partial<Player>) => void
}) {
  const [d, setD] = useState(player.wc_double)
  const [l, setL] = useState(player.wc_late)
  const [a, setA] = useState(player.wc_assist)
  return (
    <tr className="border-t border-white/5">
      <td className="py-2 pr-3 font-semibold">{player.display_name}</td>
      <td className="py-2 pr-3">
        <input type="number" className="input w-16 py-1" value={d} onChange={(e) => setD(Number(e.target.value))} />
      </td>
      <td className="py-2 pr-3">
        <input type="number" className="input w-16 py-1" value={l} onChange={(e) => setL(Number(e.target.value))} />
      </td>
      <td className="py-2 pr-3">
        <input type="number" className="input w-16 py-1" value={a} onChange={(e) => setA(Number(e.target.value))} />
      </td>
      <td className="py-2">
        <button
          className="btn-ghost px-2 py-1 text-xs"
          onClick={() => onSave(player, { wc_double: d, wc_late: l, wc_assist: a })}
        >
          Save
        </button>
      </td>
    </tr>
  )
}
