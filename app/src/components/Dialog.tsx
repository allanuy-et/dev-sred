'use client'

import { useEffect, useRef, type ReactNode } from 'react'

export interface DialogProps {
  title: string
  /** Whether the dialog is currently open. Two-way controlled. */
  open: boolean
  /** Called when the user dismisses the dialog (close button, ESC, backdrop click, programmatic). */
  onClose: () => void
  children: ReactNode
  /** Optional `max-w-*` Tailwind class override. Defaults to `max-w-[720px]`. */
  maxWidthClass?: string
}

/**
 * Modal dialog backed by the native `<dialog>` element. We get focus trap,
 * ESC-to-close, modal stacking, and body scroll lock for free.
 *
 * - Backdrop click closes (we handle this manually — native `<dialog>`
 *   doesn't include that behavior in stable yet).
 * - The dialog is rendered as a portal-ish full-viewport element; styled
 *   via Tailwind including the `::backdrop` pseudo (`backdrop:bg-…`).
 *
 * Use the FormDialog wrappers (LabourFormDialog, etc.) for forms; this
 * primitive is for any modal need.
 */
export function Dialog({
  title,
  open,
  onClose,
  children,
  maxWidthClass = 'max-w-[720px]',
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  // Sync open prop with native dialog state.
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  // Native `close` event fires on close button, ESC, and programmatic .close().
  // Mirror it back to the parent so they can flip `open` to false.
  function handleNativeClose() {
    onClose()
  }

  // Native dialog has no backdrop-click-to-close. Synthesise it: when the
  // click event target is the dialog element itself (i.e. outside its content
  // box), the user clicked the backdrop.
  function handleClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === ref.current) onClose()
  }

  return (
    <dialog
      ref={ref}
      onClose={handleNativeClose}
      onClick={handleClick}
      // `backdrop:` variants style the `::backdrop` pseudo. The dialog itself
      // is centered by browser default; we just style the surface + max sizes.
      className={`w-[92vw] ${maxWidthClass} max-h-[85vh] overflow-hidden rounded-xl border border-border bg-surface p-0 shadow-md backdrop:bg-black/40 backdrop:backdrop-blur-sm`}
    >
      <div className="flex max-h-[85vh] flex-col">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="-mr-2 inline-flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:bg-surface-hover hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </dialog>
  )
}
