// Windows' system emoji font has no flag glyphs, so a flag emoji like 🇲🇽 renders
// as its two-letter code ("MX") in every browser on Windows. To show flags
// reliably we convert the regional-indicator emoji to an ISO 3166-1 code and load
// an image from flagcdn.com. Non-flag values (🧪, ⚽, null) fall back to text.

const REGIONAL_A = 0x1f1e6 // 🇦
const REGIONAL_Z = 0x1f1ff // 🇿
const BLACK_FLAG = 0x1f3f4 // 🏴 (base of subdivision tag sequences)
const TAG_BASE = 0xe0000 // tag chars map to ASCII via (cp - TAG_BASE)
const TAG_END = 0xe007f // cancel tag terminating a sequence

/**
 * Map a flag emoji to a flagcdn code:
 * - "🇲🇽" → "mx" (2-letter regional-indicator flag)
 * - "🏴󠁧󠁢󠁥󠁮󠁧󠁿" → "gb-eng", "🏴󠁧󠁢󠁳󠁣󠁴󠁿" → "gb-sct" (subdivision tag sequences, e.g. England/Scotland)
 * Returns null for non-flag values (🧪, ⚽, null).
 */
function flagToIsoCode(flag: string): string | null {
  const cps = Array.from(flag.trim()).map((c) => c.codePointAt(0) ?? 0)

  // Regional-indicator flags: exactly two letters.
  if (cps.length === 2 && cps.every((cp) => cp >= REGIONAL_A && cp <= REGIONAL_Z)) {
    return cps.map((cp) => String.fromCharCode(cp - REGIONAL_A + 0x61)).join('')
  }

  // Subdivision tag sequences: 🏴 + tag chars (e.g. "gbeng") + cancel tag.
  if (cps[0] === BLACK_FLAG && cps[cps.length - 1] === TAG_END) {
    const subdivision = cps
      .slice(1, -1)
      .map((cp) => String.fromCharCode(cp - TAG_BASE))
      .join('')
    // "gbeng" → "gb-eng" (flagcdn expects a hyphen after the 2-letter country).
    if (/^[a-z]{4,}$/.test(subdivision)) {
      return `${subdivision.slice(0, 2)}-${subdivision.slice(2)}`
    }
  }

  return null
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
