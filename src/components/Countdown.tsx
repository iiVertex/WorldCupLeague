import { useEffect, useState } from 'react'

function format(target: number, now: number): string {
  const diff = target - now
  if (diff <= 0) return 'Kicked off'
  const s = Math.floor(diff / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${sec}s`
  return `${m}m ${sec}s`
}

export function Countdown({ to }: { to: string }) {
  const target = new Date(to).getTime()
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const live = target - now > 0
  return (
    <span className={live ? 'text-white/70' : 'text-white/40'}>
      {live ? `Locks in ${format(target, now)}` : 'Predictions locked'}
    </span>
  )
}
