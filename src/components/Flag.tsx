// Windows' system emoji font has no flag glyphs, so a flag emoji like 🇲🇽 renders
// as its two-letter code ("MX") in every browser on Windows. To show flags
// reliably we convert the regional-indicator emoji to an ISO 3166-1 code and load
// an image from flagcdn.com. Non-flag values (🧪, ⚽, null) fall back to text.

const REGIONAL_A = 0x1f1e6 // 🇦
const REGIONAL_Z = 0x1f1ff // 🇿

/** "🇲🇽" → "mx", or null if `flag` isn't a 2-letter regional-indicator flag. */
function flagToIsoCode(flag: string): string | null {
  const cps = Array.from(flag.trim()).map((c) => c.codePointAt(0) ?? 0)
  if (cps.length !== 2) return null
  if (cps.some((cp) => cp < REGIONAL_A || cp > REGIONAL_Z)) return null
  return cps.map((cp) => String.fromCharCode(cp - REGIONAL_A + 0x61)).join('')
}

export function Flag({ flag, className = 'h-[1em]' }: { flag: string | null; className?: string }) {
  const code = flag ? flagToIsoCode(flag) : null
  if (!code) {
    return <span className={className}>{flag ?? '🏳️'}</span>
  }
  return (
    <img
      src={`https://flagcdn.com/h40/${code}.png`}
      srcSet={`https://flagcdn.com/h80/${code}.png 2x`}
      alt={flag ?? ''}
      loading="lazy"
      className={`inline-block w-auto rounded-[3px] align-[-0.15em] ${className}`}
    />
  )
}
