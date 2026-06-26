import type { LeaderboardRow } from '../types'
import { useRankMovement } from '../hooks/useRankMovement'
import { Avatar } from './Avatar'

const MEDALS = ['🥇', '🥈', '🥉']

function RankMove({ delta }: { delta: number }) {
  if (delta === 0) {
    return <span className="text-white/25" title="No change">–</span>
  }
  const up = delta > 0
  return (
    <span
      className={`flex items-center gap-0.5 font-bold ${up ? 'text-green-400' : 'text-red-400'}`}
      title={`${up ? 'Up' : 'Down'} ${Math.abs(delta)} ${Math.abs(delta) === 1 ? 'place' : 'places'}`}
    >
      <span className="leading-none">{up ? '▲' : '▼'}</span>
      <span className="text-[10px]">{Math.abs(delta)}</span>
    </span>
  )
}

export function Leaderboard({
  rows,
  currentPlayerId,
}: {
  rows: LeaderboardRow[]
  currentPlayerId?: string
}) {
  const movements = useRankMovement(rows)
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-navy-800 text-sky-accent">
            <th className="px-4 py-3 text-left font-bold">#</th>
            <th className="px-1 py-3 text-center font-bold" aria-label="Movement"></th>
            <th className="px-4 py-3 text-left font-bold">Player</th>
            <th className="px-4 py-3 text-right font-bold">Points</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const isMe = row.player_id === currentPlayerId
            return (
              <tr
                key={row.player_id}
                className={`border-t border-white/5 transition ${
                  isMe ? 'bg-sky-accent/10' : 'hover:bg-white/[0.03]'
                }`}
              >
                <td className="px-4 py-3 font-semibold text-white/70">
                  {MEDALS[i] ?? i + 1}
                </td>
                <td className="px-1 py-3 text-center text-xs">
                  <span className="flex justify-center">
                    <RankMove delta={movements[row.player_id] ?? 0} />
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold">
                  <span className="flex items-center gap-2.5">
                    <Avatar url={row.avatar_url} name={row.display_name} size="sm" />
                    <span className="truncate">{row.display_name}</span>
                    {isMe && (
                      <span className="rounded bg-sky-accent/20 px-1.5 py-0.5 text-[10px] font-bold text-sky-accent">
                        YOU
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-display text-base font-extrabold text-sky-accent">
                  {row.total_points}
                </td>
              </tr>
            )
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-white/40">
                No published results yet — points appear once the admin reveals them.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
