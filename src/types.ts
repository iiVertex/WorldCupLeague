// Database row types — kept in sync with the Supabase schema.

export type PredictionPhase = 'initial' | 'late'

export interface Player {
  id: string
  username: string
  display_name: string
  is_admin: boolean
  wc_double: number
  wc_late: number
  wc_assist: number
  avatar_url: string | null
}

// As returned by the `match_view` (player feed) and flattened admin query.
// Result fields are null/empty until the admin publishes.
export interface Match {
  id: number
  home_team: string
  away_team: string
  home_flag: string | null
  away_flag: string | null
  kickoff: string // ISO timestamp
  halftime_open: boolean
  is_test: boolean
  matchday: number | null // logical round (MD1..MD5); null = unassigned
  final_home: number | null
  final_away: number | null
  scorers: string[] | null
  assisters: string[] | null
  results_published: boolean
}

// Row in the gated `match_results` table.
export interface MatchResult {
  match_id: number
  final_home: number
  final_away: number
  scorers: string[]
  assisters: string[]
}

export interface Prediction {
  id: number
  match_id: number
  player_id: string
  pred_home: number
  pred_away: number
  pred_scorer: string | null
  pred_assist: string | null
  wc_double: boolean
  wc_assist: boolean
  phase: PredictionPhase
  points: number
  submitted_at: string
}

export interface LeaderboardRow {
  player_id: string
  username: string
  display_name: string
  total_points: number
  avatar_url: string | null
}

// Derived match lifecycle state used by the UI.
// `scheduled` = kickoff is further away than the prediction window, so it's not open yet.
export type MatchStatus = 'scheduled' | 'upcoming' | 'locked' | 'halftime' | 'final'
