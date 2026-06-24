import { useMemo, useState } from 'react'
import type { Match, Prediction, PredictionPhase } from '../types'
import { matchStatus, scorePrediction, PREDICTION_WINDOW_HOURS } from '../lib/scoring'
import { StatusBadge } from './StatusBadge'
import { Countdown } from './Countdown'
import { Flag } from './Flag'

export interface PredictionInput {
  pred_home: number | ''
  pred_away: number | ''
  pred_scorer: string
  pred_assist: string
  wc_double: boolean
  wc_assist: boolean
}

interface Props {
  match: Match
  initial?: Prediction
  late?: Prediction
  remaining: { double: number; late: number; assist: number }
  onSubmit: (values: PredictionInput, phase: PredictionPhase) => Promise<void>
}

export function MatchCard({ match, initial, late, remaining, onSubmit }: Props) {
  const status = matchStatus(match)
  const published = status === 'final'

  // During half-time we edit the (new) late prediction; otherwise the initial one.
  const phase: PredictionPhase = status === 'halftime' ? 'late' : 'initial'
  const editable = status === 'upcoming' || status === 'halftime'

  // Show the pick that actually counts (late ?? initial) except while editing the
  // initial prediction — otherwise a locked second-half match would render the
  // superseded initial pick instead of the submitted late one.
  const source = phase === 'late' || !editable ? (late ?? initial) : initial

  // The Assist wildcard may not be played on a half-time (late) prediction.
  const assistAllowed = phase !== 'late'
  // Double Points can't be switched on at half-time: it only counts if it was
  // activated on the initial pick (which carries through via `source`).
  const doubleAllowed = phase !== 'late'
  // At half-time the goalscorer is no longer locked: the player may either keep
  // the scorer from their initial pick or predict a new player to score in the
  // second half. `scorerMode` tracks that choice (initial phase is always 'keep').
  const isLate = phase === 'late'
  const initialScorer = initial?.pred_scorer ?? ''

  const [form, setForm] = useState<PredictionInput>(() => ({
    pred_home: source?.pred_home ?? '',
    pred_away: source?.pred_away ?? '',
    pred_scorer: source?.pred_scorer ?? '',
    pred_assist: assistAllowed ? (source?.pred_assist ?? '') : '',
    wc_double: source?.wc_double ?? false,
    wc_assist: assistAllowed ? (source?.wc_assist ?? false) : false,
  }))
  // 'new' when an existing late pick already diverges from the initial scorer.
  const [scorerMode, setScorerMode] = useState<'keep' | 'new'>(() =>
    isLate && late && (late.pred_scorer ?? '') !== initialScorer ? 'new' : 'keep',
  )
  const [saving, setSaving] = useState(false)

  // The scorer field is editable normally pre-kickoff, and at half-time only in
  // 'new' mode (in 'keep' mode it mirrors the locked initial pick).
  const scorerEditable = editable && (!isLate || scorerMode === 'new')

  const selectScorerMode = (mode: 'keep' | 'new') => {
    setScorerMode(mode)
    setForm((f) => ({
      ...f,
      // Keep → snap back to the initial scorer. New → clear it (unless the player
      // already typed something different) so they enter a fresh second-half pick.
      pred_scorer:
        mode === 'keep' ? initialScorer : f.pred_scorer === initialScorer ? '' : f.pred_scorer,
    }))
  }

  const effective = late ?? initial // which prediction actually counts
  const overridden = published && !!effective?.points_overridden

  // Wildcard availability: allow if you already had it on this match, or have some left.
  const canDouble = form.wc_double || remaining.double > 0 || !!source?.wc_double
  const canAssist =
    assistAllowed && (form.wc_assist || remaining.assist > 0 || !!source?.wc_assist)
  const needsLateWildcard = phase === 'late' && !late // first late submission consumes one
  const lateBlocked = needsLateWildcard && remaining.late <= 0

  const earned = useMemo(() => {
    if (!published || !effective) return null
    // The Assist wildcard can only be played on the initial pick (it's blocked at
    // half-time), so the assist always lives on the initial row. Source it from
    // there even when a late prediction supersedes the rest of the pick.
    return scorePrediction(match, {
      ...effective,
      pred_assist: initial?.pred_assist ?? null,
      wc_assist: initial?.wc_assist ?? false,
    })
  }, [published, effective, match, initial])

  const set = <K extends keyof PredictionInput>(k: K, v: PredictionInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    setSaving(true)
    try {
      await onSubmit(form, phase)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card animate-fade-in p-5">
      {/* Header: status + countdown */}
      <div className="mb-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          {match.is_test && (
            <span className="badge border border-warn/40 bg-warn/10 text-warn">🧪 Test</span>
          )}
        </div>
        <Countdown to={match.kickoff} />
      </div>

      {/* Teams */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <Team name={match.home_team} flag={match.home_flag} align="right" />
        <div className="px-1 text-center">
          {published ? (
            <div className="font-display text-2xl font-extrabold text-sky-accent">
              {match.final_home}–{match.final_away}
            </div>
          ) : (
            <div className="font-display text-lg font-bold text-white/40">vs</div>
          )}
        </div>
        <Team name={match.away_team} flag={match.away_flag} align="left" />
      </div>
      <div className="mt-2 text-center text-[11px] text-white/40">
        {new Date(match.kickoff).toLocaleString(undefined, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>

      {/* Published result detail */}
      {published && (
        <div className="mt-4 rounded-xl border border-white/10 bg-navy-850 p-3 text-sm">
          {match.scorers?.length ? (
            <p className="text-white/70">
              <span className="text-white/40">Scorers:</span> {match.scorers.join(', ')}
            </p>
          ) : null}
          {match.assisters?.length ? (
            <p className="text-white/70">
              <span className="text-white/40">Assists:</span> {match.assisters.join(', ')}
            </p>
          ) : null}
          {effective ? (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-white/50">
                Your pick: {effective.pred_home}–{effective.pred_away}
                {effective.pred_scorer ? ` · ${effective.pred_scorer}` : ''}
              </span>
              <span className="flex items-center gap-2">
                {overridden && (
                  <span className="badge border border-warn/40 bg-warn/10 text-warn">
                    Manually updated
                  </span>
                )}
                <span className="font-display text-lg font-extrabold text-sky-accent">
                  +{overridden ? effective.points : (earned?.total ?? effective.points)} pts
                </span>
              </span>
            </div>
          ) : (
            <p className="mt-2 text-white/40">You didn't predict this match.</p>
          )}
          {!overridden && earned && earned.breakdown.length > 0 && (
            <p className="mt-1 text-xs text-white/40">{earned.breakdown.join(' · ')}</p>
          )}
        </div>
      )}

      {/* Prediction form */}
      {!published && (
        <div className="mt-4 space-y-3">
          {status === 'halftime' && (
            <div className="rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
              Half-time window open. Submitting a new prediction now
              {needsLateWildcard ? ` uses 1 Late wildcard (${remaining.late} left)` : ' (Late wildcard already used here)'}
              .
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{match.home_team} goals</label>
              <input
                type="number"
                min={0}
                className="input"
                placeholder="0"
                value={form.pred_home}
                disabled={!editable}
                onChange={(e) => {
                  const v = e.target.value
                  set('pred_home', v === '' ? '' : Math.max(0, Number(v)))
                }}
              />
            </div>
            <div>
              <label className="label">{match.away_team} goals</label>
              <input
                type="number"
                min={0}
                className="input"
                placeholder="0"
                value={form.pred_away}
                disabled={!editable}
                onChange={(e) => {
                  const v = e.target.value
                  set('pred_away', v === '' ? '' : Math.max(0, Number(v)))
                }}
              />
            </div>
          </div>

          <div>
            <label className="label">Goalscorer</label>
            {isLate && editable && (
              <div className="mb-2 grid grid-cols-2 gap-2">
                <ScorerModeButton
                  active={scorerMode === 'keep'}
                  onClick={() => selectScorerMode('keep')}
                  title="Keep initial pick"
                  subtitle={initialScorer || 'no scorer picked'}
                />
                <ScorerModeButton
                  active={scorerMode === 'new'}
                  onClick={() => selectScorerMode('new')}
                  title="New 2nd-half scorer"
                  subtitle="pick a fresh player"
                />
              </div>
            )}
            <input
              className="input"
              placeholder={
                isLate && scorerMode === 'new' ? 'New 2nd-half scorer, e.g. Messi' : 'e.g. Messi'
              }
              value={form.pred_scorer}
              disabled={!scorerEditable}
              onChange={(e) => set('pred_scorer', e.target.value)}
            />
            {isLate && editable && (
              <p className="mt-1 text-xs text-white/50">
                {scorerMode === 'keep' ? (
                  initialScorer ? (
                    <>
                      🔒 Keeping your initial goalscorer:{' '}
                      <strong className="text-white/70">{initialScorer}</strong>
                    </>
                  ) : (
                    <>You didn't pick an initial goalscorer.</>
                  )
                ) : (
                  <>✏️ Predicting a new player to score in the second half.</>
                )}
              </p>
            )}
          </div>

          <div>
            <label className="label">Assist</label>
            <input
              className="input"
              placeholder={
                !assistAllowed
                  ? 'Assist card not available at half-time'
                  : form.wc_assist
                    ? 'e.g. Di María'
                    : 'Activate the 🅰 Assist card to predict'
              }
              value={form.pred_assist}
              disabled={!editable || !form.wc_assist || !assistAllowed}
              onChange={(e) => set('pred_assist', e.target.value)}
            />
            {editable && assistAllowed && !form.wc_assist && (
              <p className="mt-1 text-xs text-white/40">
                Play the 🅰 Assist card below to enter an assist prediction (+2 if correct, −1 if wrong).
              </p>
            )}
            {editable && !assistAllowed && (
              <p className="mt-1 text-xs text-white/40">
                The 🅰 Assist card can't be played on a half-time prediction.
              </p>
            )}
          </div>

          {editable && !doubleAllowed && (
            <p className="text-xs text-white/40">
              ✕2 Double Points can't be switched on at half-time — it only counts if you
              activated it on your initial prediction.
            </p>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            <Wildcard
              label="✕2 Double Points"
              checked={form.wc_double}
              disabled={!editable || !doubleAllowed || !canDouble}
              onChange={(v) => set('wc_double', v)}
            />
            <Wildcard
              label="🅰 Assist +2"
              checked={form.wc_assist}
              disabled={!editable || !canAssist}
              onChange={(v) =>
                setForm((f) => ({ ...f, wc_assist: v, pred_assist: v ? f.pred_assist : '' }))
              }
            />
          </div>

          {editable ? (
            <button
              className="btn-primary w-full"
              disabled={saving || lateBlocked}
              onClick={submit}
            >
              {saving
                ? 'Saving…'
                : lateBlocked
                  ? 'No Late wildcards left'
                  : status === 'halftime'
                    ? 'Submit Half-time Prediction'
                    : initial
                      ? 'Update Prediction'
                      : 'Submit Prediction'}
            </button>
          ) : status === 'scheduled' ? (
            <p className="text-center text-sm text-white/40">
              Predictions open {PREDICTION_WINDOW_HOURS}h before kickoff.
            </p>
          ) : (
            <p className="text-center text-sm text-white/40">
              Predictions are locked for this match.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function Team({
  name,
  flag,
  align,
}: {
  name: string
  flag: string | null
  align: 'left' | 'right'
}) {
  return (
    <div
      className={`flex min-w-0 flex-col items-center gap-1 text-center sm:flex-row sm:gap-2 ${
        align === 'right' ? 'sm:justify-end sm:text-right' : 'sm:justify-start sm:text-left'
      }`}
    >
      <Flag
        flag={flag}
        className={`h-7 shrink-0 ${align === 'right' ? 'sm:order-2' : 'sm:order-1'}`}
      />
      <span
        className={`min-w-0 break-words font-display text-sm font-bold leading-tight sm:text-base ${
          align === 'right' ? 'sm:order-1' : 'sm:order-2'
        }`}
      >
        {name}
      </span>
    </div>
  )
}

function ScorerModeButton({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean
  onClick: () => void
  title: string
  subtitle: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start rounded-lg border px-3 py-2 text-left transition ${
        active
          ? 'border-warn bg-warn/15 text-warn'
          : 'border-white/10 text-white/60 hover:bg-white/5'
      }`}
    >
      <span className="text-xs font-semibold">{title}</span>
      <span className="w-full truncate text-[11px] opacity-70">{subtitle}</span>
    </button>
  )
}

function Wildcard({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label
      className={`chip cursor-pointer select-none transition ${
        checked
          ? 'border-sky-accent bg-sky-accent/15 text-sky-accent'
          : 'text-white/60 hover:bg-white/10'
      } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
    >
      <input
        type="checkbox"
        className="hidden"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  )
}
