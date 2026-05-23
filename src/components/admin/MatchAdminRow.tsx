import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../Toast'
import { Flag } from '../Flag'
import type { Match } from '../../types'

interface Props {
  match: Match
  onChanged: () => void
  onCalculate: () => void
  calculating: boolean
}

const toList = (s: string) =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

// ISO timestamp → value for <input type="datetime-local"> (local time, no seconds).
const toLocalInput = (iso: string) => {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function MatchAdminRow({ match, onChanged, onCalculate, calculating }: Props) {
  const toast = useToast()
  const [home, setHome] = useState(match.final_home?.toString() ?? '')
  const [away, setAway] = useState(match.final_away?.toString() ?? '')
  const [scorers, setScorers] = useState((match.scorers ?? []).join(', '))
  const [assisters, setAssisters] = useState((match.assisters ?? []).join(', '))
  const [kickoff, setKickoff] = useState(toLocalInput(match.kickoff))
  const [busy, setBusy] = useState(false)

  const patch = async (fields: Partial<Match>, successMsg?: string) => {
    setBusy(true)
    const { error } = await supabase.from('matches').update(fields).eq('id', match.id)
    setBusy(false)
    if (error) {
      toast.error(error.message)
      return
    }
    if (successMsg) toast.success(successMsg)
    onChanged()
  }

  const saveResult = async () => {
    if (home === '' || away === '') {
      toast.error('Enter both scores')
      return
    }
    setBusy(true)
    // Results live in the gated match_results table, not on matches.
    const { error } = await supabase.from('match_results').upsert(
      {
        match_id: match.id,
        final_home: Number(home),
        final_away: Number(away),
        scorers: toList(scorers),
        assisters: toList(assisters),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'match_id' },
    )
    setBusy(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Result saved')
    onChanged()
  }

  const remove = async () => {
    if (!confirm(`Delete ${match.home_team} vs ${match.away_team}? This removes its predictions too.`)) {
      return
    }
    setBusy(true)
    const { error } = await supabase.from('matches').delete().eq('id', match.id)
    setBusy(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Match deleted')
    onChanged()
  }

  return (
    <div className="card space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-display font-bold">
          <Flag flag={match.home_flag} /> {match.home_team} <span className="text-white/40">vs</span>{' '}
          {match.away_team} <Flag flag={match.away_flag} />
          {match.is_test && <span className="ml-2 text-warn">🧪</span>}
        </div>
        <div className="text-xs text-white/40">
          {new Date(match.kickoff).toLocaleString()}
        </div>
      </div>

      {/* Kickoff editor */}
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="label">Kickoff</label>
          <input
            type="datetime-local"
            className="input"
            value={kickoff}
            onChange={(e) => setKickoff(e.target.value)}
          />
        </div>
        <button
          className="btn-ghost"
          disabled={busy}
          onClick={() => patch({ kickoff: new Date(kickoff).toISOString() }, 'Kickoff updated')}
        >
          Save Time
        </button>
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap gap-3">
        <Toggle
          label="Half-time open"
          on={match.halftime_open}
          onClick={() => patch({ halftime_open: !match.halftime_open }, 'Half-time window updated')}
          disabled={busy}
        />
        <Toggle
          label="Results published"
          on={match.results_published}
          onClick={() =>
            patch({ results_published: !match.results_published }, 'Visibility updated')
          }
          disabled={busy}
          accent
        />
      </div>

      {/* Result entry */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="label">{match.home_team} goals</label>
          <input className="input" type="number" min={0} value={home} onChange={(e) => setHome(e.target.value)} />
        </div>
        <div>
          <label className="label">{match.away_team} goals</label>
          <input className="input" type="number" min={0} value={away} onChange={(e) => setAway(e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="label">Scorers (comma-separated)</label>
          <input className="input" value={scorers} onChange={(e) => setScorers(e.target.value)} placeholder="Messi, Álvarez" />
        </div>
        <div className="col-span-2 sm:col-span-4">
          <label className="label">Assisters (comma-separated)</label>
          <input className="input" value={assisters} onChange={(e) => setAssisters(e.target.value)} placeholder="Di María" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" disabled={busy} onClick={saveResult}>
          Save Result
        </button>
        <button className="btn-ghost" disabled={calculating} onClick={onCalculate}>
          {calculating ? 'Calculating…' : '∑ Calculate Points'}
        </button>
        <button className="btn-danger ml-auto" disabled={busy} onClick={remove}>
          Delete
        </button>
      </div>
    </div>
  )
}

function Toggle({
  label,
  on,
  onClick,
  disabled,
  accent,
}: {
  label: string
  on: boolean
  onClick: () => void
  disabled?: boolean
  accent?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`chip transition disabled:opacity-50 ${
        on
          ? accent
            ? 'border-success/40 bg-success/15 text-success'
            : 'border-warn/40 bg-warn/15 text-warn'
          : 'text-white/50 hover:bg-white/10'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${on ? 'bg-current' : 'bg-white/30'}`} />
      {label}: {on ? 'ON' : 'OFF'}
    </button>
  )
}
