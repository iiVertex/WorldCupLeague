type Size = 'sm' | 'md' | 'lg'

const SIZES: Record<Size, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-24 w-24 text-2xl',
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Round avatar: shows the image when `url` is set, otherwise an initials circle.
 */
export function Avatar({
  url,
  name,
  size = 'sm',
  className = '',
}: {
  url?: string | null
  name: string
  size?: Size
  className?: string
}) {
  const base = `inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${SIZES[size]} ${className}`
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`${base} border border-white/10 object-cover`}
        loading="lazy"
      />
    )
  }
  return (
    <span
      className={`${base} border border-white/10 bg-sky-accent/20 font-bold text-sky-accent`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}
