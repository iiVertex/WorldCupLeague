import type { Match, MatchStatus, Prediction } from '../types'

// Standard scoring scheme (mirror of the server-side score_prediction RPC).
// Each component is worth 1 point; the home score, away score and winner are
// scored independently (a perfect scoreline = home + away + winner = 3).
export const POINTS = {
  homeScore: 1,
  awayScore: 1,
  result: 1,
  scorer: 1,
  assist: 1,
} as const

// Non-decomposing accented letters the SQL `normalize_name` folds via translate()
// but that NFD diacritic-stripping leaves intact. Listed explicitly so the client
// and server normalizers stay aligned.
const SPECIAL_FOLDS: Record<string, string> = { ø: 'o', đ: 'd', ł: 'l' }

/**
 * Normalize a scorer/assist name for matching: lowercase, strip accents, collapse
 * internal whitespace, trim ends. MUST stay in sync with the Postgres
 * `normalize_name(text)` function used by the authoritative score_prediction RPC.
 */
export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[øđł]/g, (c) => SPECIAL_FOLDS[c] ?? c)
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Compute the points a single prediction earns against a finished match.
 * This is the same logic the database RPC applies; we keep a client copy so
 * the admin can preview scores and players can understand the breakdown.
 */
export function scorePrediction(
  match: Pick<Match, 'final_home' | 'final_away' | 'scorers' | 'assisters'>,
  pred: Pick<
    Prediction,
    'pred_home' | 'pred_away' | 'pred_scorer' | 'pred_assist' | 'wc_double' | 'wc_assist'
  >,
): { total: number; breakdown: string[] } {
  const { final_home, final_away } = match
  if (final_home === null || final_away === null) {
    return { total: 0, breakdown: [] }
  }

  const scorers = (match.scorers ?? []).map(normalizeName)
  const assisters = (match.assisters ?? []).map(normalizeName)
  const breakdown: string[] = []
  let total = 0

  if (pred.pred_home === final_home) {
    total += POINTS.homeScore
    breakdown.push(`Home score +${POINTS.homeScore}`)
  }
  if (pred.pred_away === final_away) {
    total += POINTS.awayScore
    breakdown.push(`Away score +${POINTS.awayScore}`)
  }
  if (resultSign(pred.pred_home, pred.pred_away) === resultSign(final_home, final_away)) {
    total += POINTS.result
    breakdown.push(`Winner +${POINTS.result}`)
  }

  const scorer = pred.pred_scorer ? normalizeName(pred.pred_scorer) : ''
  if (scorer && scorers.includes(scorer)) {
    total += POINTS.scorer
    breakdown.push(`Goalscorer +${POINTS.scorer}`)
  }

  // Assist only counts when the Assist wildcard was played on this match.
  const assist = pred.pred_assist ? normalizeName(pred.pred_assist) : ''
  if (pred.wc_assist && assist && assisters.includes(assist)) {
    total += POINTS.assist
    breakdown.push(`Assist +${POINTS.assist}`)
  }

  if (pred.wc_double) {
    total *= 2
    breakdown.push('Double Points ×2')
  }

  return { total, breakdown }
}

const resultSign = (a: number, b: number) => Math.sign(a - b)

// Predictions open only within this many hours before kickoff. Earlier than that
// the match is 'scheduled' (locked). Mirrors the predictions RLS policies.
export const PREDICTION_WINDOW_HOURS = 10

/** Derive the lifecycle state of a match for UI display. */
export function matchStatus(match: Match, now: Date = new Date()): MatchStatus {
  if (match.final_home !== null && match.final_away !== null && match.results_published) {
    return 'final'
  }
  const kickoff = new Date(match.kickoff)
  if (now < kickoff) {
    const opensAt = new Date(kickoff.getTime() - PREDICTION_WINDOW_HOURS * 60 * 60 * 1000)
    return now < opensAt ? 'scheduled' : 'upcoming'
  }
  if (match.halftime_open) return 'halftime'
  return 'locked'
}

export const isLocked = (match: Match, now: Date = new Date()) =>
  new Date(match.kickoff) <= now
