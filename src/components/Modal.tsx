import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Lightweight overlay modal — fixed backdrop + centered panel.
 * Closes on backdrop click or Escape. Toasts (z-50) sit above this (z-40).
 */
export function Modal({
  title,
  onClose,
  children,
  className = '',
}: {
  title?: ReactNode
  onClose: () => void
  children: ReactNode
  className?: string
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className={`card my-auto w-full max-w-md p-5 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? (
            <h2 className="font-display text-lg font-extrabold text-sky-accent">{title}</h2>
          ) : (
            <span />
          )}
          <button
            className="rounded-lg px-2 py-1 text-xl leading-none text-white/60 hover:bg-white/10 hover:text-white"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
