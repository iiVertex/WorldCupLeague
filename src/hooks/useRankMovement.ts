import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { LeaderboardRow } from '../types'

// Shared baseline rank per player, frozen by an admin via snapshot_leaderboard().
interface SnapshotRow {
  player_id: string
  rank: number
}

// Stable ordering that mirrors the snapshot RPC (points desc, then player_id),
// so the live rank we compute lines up 1:1 with the stored baseline rank.
function stableRank(rows: LeaderboardRow[]): Record<string, number> {
  const sorted = [...rows].sort(
    (a, b) =>
      b.total_points - a.total_points || a.player_id.localeCompare(b.player_id),
  )
  const ranks: Record<string, number> = {}
  sorted.forEach((r, i) => {
    ranks[r.player_id] = i + 1
  })
  return ranks
}

/**
 * Returns a map of player_id → rank movement against the shared snapshot:
 * positive = moved up, negative = moved down, 0 = unchanged or not in the
 * baseline. Every user sees the same values because the baseline lives in
 * Postgres (reset by an admin "freezing" the standings).
 */
export function useRankMovement(rows: LeaderboardRow[]): Record<string, number> {
  const snapshotQ = useQuery({
    queryKey: ['leaderboard-snapshot'],
    queryFn: async (): Promise<SnapshotRow[]> => {
      const { data, error } = await supabase
        .from('leaderboard_snapshot')
        .select('player_id, rank')
      if (error) throw error
      return data as SnapshotRow[]
    },
  })

  return useMemo(() => {
    const baseline = snapshotQ.data
    if (!baseline || baseline.length === 0 || rows.length === 0) return {}
    const baseRank: Record<string, number> = {}
    for (const s of baseline) baseRank[s.player_id] = s.rank
    const curRank = stableRank(rows)

    const movements: Record<string, number> = {}
    for (const row of rows) {
      const prev = baseRank[row.player_id]
      // positive = rank number went down = moved up the table.
      movements[row.player_id] = prev === undefined ? 0 : prev - curRank[row.player_id]
    }
    return movements
  }, [snapshotQ.data, rows])
}
