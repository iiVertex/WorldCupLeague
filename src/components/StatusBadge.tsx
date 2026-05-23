import type { MatchStatus } from '../types'

const STYLES: Record<MatchStatus, { label: string; cls: string }> = {
  upcoming: { label: 'Open', cls: 'bg-success/15 text-success border border-success/30' },
  locked: { label: 'Locked', cls: 'bg-white/10 text-white/60 border border-white/15' },
  halftime: { label: 'Half-time', cls: 'bg-warn/15 text-warn border border-warn/30' },
  final: { label: 'Final', cls: 'bg-sky-accent/15 text-sky-accent border border-sky-accent/30' },
}

export function StatusBadge({ status }: { status: MatchStatus }) {
  const s = STYLES[status]
  return <span className={`badge ${s.cls}`}>{s.label}</span>
}
