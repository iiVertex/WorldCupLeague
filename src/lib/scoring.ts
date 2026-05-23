import type { Match, MatchStatus, Prediction } from '../types'

// Standard scoring scheme (mirror of the server-side score_match RPC).
export const POINTS = {
  exactScore: 5,
  correctResult: 2,
  scorer: 2,
  assist: 2,
} as const

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

  const scorers = (match.scorers ?? []).map((s) => s.trim().toLowerCase())
  const assisters = (match.assisters ?? []).map((s) => s.trim().toLowerCase())
  const breakdown: string[] = []
  let total = 0

  const exact = pred.pred_home === final_home && pred.pred_away === final_away
  if (exact) {
    total += POINTS.exactScore
    breakdown.push(`Exact score +${POINTS.exactScore}`)
  } else if (resultSign(pred.pred_home, pred.pred_away) === resultSign(final_home, final_away)) {
    total += POINTS.correctResult
    breakdown.push(`Correct result +${POINTS.correctResult}`)
  }

  const scorer = pred.pred_scorer?.trim().toLowerCase()
  if (scorer && scorers.includes(scorer)) {
    total += POINTS.scorer
    breakdown.push(`Goalscorer +${POINTS.scorer}`)
  }

  const assist = pred.pred_assist?.trim().toLowerCase()
  if (assist && assisters.includes(assist)) {
    const assistPts = pred.wc_assist ? POINTS.assist * 2 : POINTS.assist
    total += assistPts
    breakdown.push(`Assist +${assistPts}${pred.wc_assist ? ' (wildcard ×2)' : ''}`)
  }

  if (pred.wc_double) {
    total *= 2
    breakdown.push('Double Points ×2')
  }

  return { total, breakdown }
}

const resultSign = (a: number, b: number) => Math.sign(a - b)

/** Derive the lifecycle state of a match for UI display. */
export function matchStatus(match: Match, now: Date = new Date()): MatchStatus {
  if (match.final_home !== null && match.final_away !== null && match.results_published) {
    return 'final'
  }
  const kickoff = new Date(match.kickoff)
  if (now < kickoff) return 'upcoming'
  if (match.halftime_open) return 'halftime'
  return 'locked'
}

export const isLocked = (match: Match, now: Date = new Date()) =>
  new Date(match.kickoff) <= now
