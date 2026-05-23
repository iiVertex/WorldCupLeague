import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../Toast'

export function AddMatchForm({ onCreated }: { onCreated: () => void }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({
    home_team: '',
    away_team: '',
    home_flag: '',
    away_flag: '',
    kickoff: '',
    is_test: false,
  })

  const set = (k: keyof typeof f, v: string | boolean) => setF((s) => ({ ...s, [k]: v }))

  const create = async () => {
    if (!f.home_team || !f.away_team || !f.kickoff) {
      toast.error('Teams and kickoff are required')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('matches').insert({
      home_team: f.home_team,
      away_team: f.away_team,
      home_flag: f.home_flag || null,
      away_flag: f.away_flag || null,
      kickoff: new Date(f.kickoff).toISOString(),
      is_test: f.is_test,
    })
    setSaving(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Match added')
    setF({ home_team: '', away_team: '', home_flag: '', away_flag: '', kickoff: '', is_test: false })
    setOpen(false)
    onCreated()
  }

  if (!open) {
    return (
      <button className="btn-ghost" onClick={() => setOpen(true)}>
        ＋ Add Match
      </button>
    )
  }

  return (
    <div className="card space-y-3 p-5">
      <h3 className="font-display font-bold">New Match</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <input className="input" placeholder="Home team" value={f.home_team} onChange={(e) => set('home_team', e.target.value)} />
        <input className="input" placeholder="Home flag 🏴" value={f.home_flag} onChange={(e) => set('home_flag', e.target.value)} />
        <input className="input" placeholder="Away team" value={f.away_team} onChange={(e) => set('away_team', e.target.value)} />
        <input className="input" placeholder="Away flag 🏴" value={f.away_flag} onChange={(e) => set('away_flag', e.target.value)} />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1">
          <label className="label">Kickoff</label>
          <input
            type="datetime-local"
            className="input"
            value={f.kickoff}
            onChange={(e) => set('kickoff', e.target.value)}
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 pt-5 text-sm">
          <input type="checkbox" checked={f.is_test} onChange={(e) => set('is_test', e.target.checked)} />
          🧪 Test match
        </label>
      </div>
      <div className="flex gap-2">
        <button className="btn-primary" disabled={saving} onClick={create}>
          {saving ? 'Adding…' : 'Add Match'}
        </button>
        <button className="btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  )
}
