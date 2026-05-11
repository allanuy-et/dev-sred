'use client'

import { Dialog } from '@/components/Dialog'

export type AttachmentParentKind = 'labour' | 'expense'

// Backend mounts /labour (singular) and /expenses (plural). Keep the type
// names singular for readability and translate to the route segment here.
const ROUTE_SEGMENT: Record<AttachmentParentKind, string> = {
  labour: 'labour',
  expense: 'expenses',
}

export function attachmentDownloadUrl(
  kind: AttachmentParentKind,
  attachmentId: string,
  inline: boolean,
): string {
  const q = inline ? '?inline=1' : ''
  return `/api/${ROUTE_SEGMENT[kind]}/attachments/${attachmentId}/download${q}`
}

export function attachmentParentBase(
  kind: AttachmentParentKind,
  parentId: string,
): string {
  return `/${ROUTE_SEGMENT[kind]}/${parentId}`
}

export interface AttachmentPreviewTarget {
  kind: AttachmentParentKind
  attachmentId: string
  mimeType: string
  originalName: string
}

export interface AttachmentPreviewDialogProps {
  target: AttachmentPreviewTarget | null
  onClose: () => void
}

function downloadUrl(target: AttachmentPreviewTarget, inline: boolean): string {
  return attachmentDownloadUrl(target.kind, target.attachmentId, inline)
}

/**
 * Inline preview for an attachment. Images render through `<img>`, PDFs
 * through a native `<iframe>` (the browser's built-in PDF viewer handles
 * paging/zoom). Reuses the same `<Dialog>` primitive used everywhere else.
 */
export function AttachmentPreviewDialog({
  target,
  onClose,
}: AttachmentPreviewDialogProps) {
  const open = target !== null
  const isImage =
    target?.mimeType === 'image/jpeg' || target?.mimeType === 'image/png'
  const isPdf = target?.mimeType === 'application/pdf'

  return (
    <Dialog
      title={target?.originalName ?? 'Preview'}
      open={open}
      onClose={onClose}
      maxWidthClass="max-w-[960px]"
    >
      {target ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-end">
            <a
              href={downloadUrl(target, false)}
              className="text-xs font-medium text-accent hover:underline"
            >
              Download
            </a>
          </div>
          {isImage ? (
            <img
              src={downloadUrl(target, true)}
              alt={target.originalName}
              className="max-h-[75vh] w-auto max-w-full self-center rounded border border-border object-contain"
            />
          ) : isPdf ? (
            <iframe
              src={`${downloadUrl(target, true)}#toolbar=1`}
              title={target.originalName}
              className="h-[75vh] w-full rounded border border-border"
            />
          ) : (
            <p className="text-sm text-text-muted">
              Cannot preview this file type — use the Download link above.
            </p>
          )}
        </div>
      ) : null}
    </Dialog>
  )
}
