import type { Player } from '../types'

export function WildcardChips({ player }: { player: Player }) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="chip border-sky-accent/30 bg-sky-accent/10 text-sky-accent">
        ✕2 Double · {player.wc_double}
      </span>
      <span className="chip border-warn/30 bg-warn/10 text-warn">
        ⏱ Late · {player.wc_late}
      </span>
      <span className="chip border-success/30 bg-success/10 text-success">
        🅰 Assist · {player.wc_assist}
      </span>
    </div>
  )
}
