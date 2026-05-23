export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-white/70">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-sky-accent" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  )
}
