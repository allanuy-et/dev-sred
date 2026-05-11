'use client'

import { useState } from 'react'

import type { Attachment } from '@sred/shared'

import {
  AttachmentPreviewDialog,
  attachmentDownloadUrl,
  type AttachmentParentKind,
  type AttachmentPreviewTarget,
} from '@/components/AttachmentPreviewDialog'

export interface AttachmentsViewListProps {
  parentKind: AttachmentParentKind
  attachments: Attachment[]
  /** Heading text — defaults to "Attachments". */
  label?: string
}

function fileTypeIcon(mime: string): string {
  if (mime === 'application/pdf') return 'PDF'
  if (mime === 'image/jpeg') return 'JPG'
  if (mime === 'image/png') return 'PNG'
  return 'FILE'
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

/**
 * Read-only attachments list rendered on detail pages. Same look as
 * `<AttachmentsField>` minus the edit affordances; clicking Preview opens the
 * same inline dialog (image or PDF).
 */
export function AttachmentsViewList({
  parentKind,
  attachments,
  label = 'Attachments',
}: AttachmentsViewListProps) {
  const [preview, setPreview] = useState<AttachmentPreviewTarget | null>(null)

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted">
        {label}
      </h3>
      {attachments.length === 0 ? (
        <p className="text-xs text-text-muted">No attachments.</p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((att) => {
            const isImage =
              att.mimeType === 'image/jpeg' || att.mimeType === 'image/png'
            const dl = attachmentDownloadUrl(parentKind, att.id, false)
            const dlInline = attachmentDownloadUrl(parentKind, att.id, true)
            return (
              <li
                key={att.id}
                className="flex items-center gap-3 rounded border border-border bg-surface px-3 py-2 text-sm"
              >
                <span className="inline-flex h-8 w-10 items-center justify-center rounded bg-surface-muted text-[10px] font-semibold text-text-muted">
                  {fileTypeIcon(att.mimeType)}
                </span>
                {isImage ? (
                  <img
                    src={dlInline}
                    alt=""
                    className="h-10 w-10 rounded border border-border object-cover"
                    aria-hidden
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{att.originalName}</div>
                  <div className="text-xs text-text-muted">
                    {formatBytes(att.sizeBytes)}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setPreview({
                        kind: parentKind,
                        attachmentId: att.id,
                        mimeType: att.mimeType,
                        originalName: att.originalName,
                      })
                    }
                    className="font-medium text-accent hover:underline"
                  >
                    Preview
                  </button>
                  <a
                    href={dl}
                    className="font-medium text-accent hover:underline"
                  >
                    Download
                  </a>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <AttachmentPreviewDialog
        target={preview}
        onClose={() => setPreview(null)}
      />
    </div>
  )
}
