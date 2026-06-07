// Round selector shown above the match grid. Renders a fixed MD1–MD5 bar;
// a round with no matches is locked (greyed + 🔒, non-clickable). An extra
// "Other" tab appears only while there are still-unassigned matches.

export const MATCHDAYS = [1, 2, 3, 4, 5] as const

export type MatchdayKey = number | 'other'

interface Props {
  counts: Record<number, number> // matches per round (1..5)
  otherCount: number
  active: MatchdayKey
  onSelect: (key: MatchdayKey) => void
}

export function MatchdayBar({ counts, otherCount, active, onSelect }: Props) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {MATCHDAYS.map((md) => {
        const enabled = (counts[md] ?? 0) > 0
        const isActive = active === md
        return (
          <button
            key={md}
            type="button"
            disabled={!enabled}
            onClick={() => enabled && onSelect(md)}
            className={
              isActive
                ? 'btn-primary px-3 py-2 text-sm'
                : enabled
                  ? 'btn-ghost px-3 py-2 text-sm'
                  : 'chip cursor-not-allowed text-white/30 opacity-50'
            }
          >
            MD{md}
            {!enabled && <span className="ml-1">🔒</span>}
          </button>
        )
      })}
      {otherCount > 0 && (
        <button
          type="button"
          onClick={() => onSelect('other')}
          className={
            active === 'other'
              ? 'btn-primary px-3 py-2 text-sm'
              : 'btn-ghost px-3 py-2 text-sm'
          }
        >
          Other
        </button>
      )}
    </div>
  )
}
