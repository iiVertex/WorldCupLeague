import type { ReactNode } from 'react'

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
          {label}
        </span>
        {icon && <span className="text-sky-accent">{icon}</span>}
      </div>
      <div className="mt-2 font-display text-3xl font-extrabold text-white">{value}</div>
      {hint && <div className="mt-1 text-sm text-white/50">{hint}</div>}
    </div>
  )
}
