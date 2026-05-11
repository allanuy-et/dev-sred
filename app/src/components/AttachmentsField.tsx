'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import type { Attachment } from '@sred/shared'

import {
  AttachmentPreviewDialog,
  attachmentDownloadUrl,
  type AttachmentParentKind,
  type AttachmentPreviewTarget,
} from '@/components/AttachmentPreviewDialog'
import { Button } from '@/components/Button'

export interface AttachmentsFieldProps {
  /** Existing server-side attachments (visible only in edit mode). */
  existing: Attachment[]
  /** New files queued for upload on next save. */
  pendingFiles: File[]
  /** Ids of existing attachments marked for deletion on next save. */
  removedIds: string[]
  onAddFiles: (files: File[]) => void
  onRemoveExisting: (id: string) => void
  onUndoRemoveExisting: (id: string) => void
  onRemovePending: (index: number) => void
  parentKind: AttachmentParentKind
  /** Parent record id — present only in edit mode. New-record forms omit this
   *  (uploads fire after the record is created, against the new id). */
  parentId?: string
  label?: string
  /** Hard cap on attachments. Defaults to 10 (mirrors backend). */
  maxFiles?: number
}

const ACCEPT_EXT = '.pdf,.jpg,.jpeg,.png'
const ACCEPT_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
])
const MAX_FILE_BYTES = 5 * 1024 * 1024

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

export function AttachmentsField({
  existing,
  pendingFiles,
  removedIds,
  onAddFiles,
  onRemoveExisting,
  onUndoRemoveExisting,
  onRemovePending,
  parentKind,
  parentId,
  label = 'Attachments',
  maxFiles = 10,
}: AttachmentsFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<AttachmentPreviewTarget | null>(null)

  // Blob URLs for pending images. Created here, revoked on unmount / change
  // so the browser doesn't leak memory.
  const pendingPreviewUrls = useMemo(() => {
    return pendingFiles.map((f) =>
      f.type === 'image/jpeg' || f.type === 'image/png'
        ? URL.createObjectURL(f)
        : null,
    )
  }, [pendingFiles])

  useEffect(() => {
    return () => {
      pendingPreviewUrls.forEach((url) => {
        if (url) URL.revokeObjectURL(url)
      })
    }
  }, [pendingPreviewUrls])

  const keptExistingCount = existing.length - removedIds.length
  const remainingSlots = Math.max(
    0,
    maxFiles - keptExistingCount - pendingFiles.length,
  )

  function handlePicked(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null)
    const picked = Array.from(e.target.files ?? [])
    if (picked.length === 0) return

    const accepted: File[] = []
    for (const f of picked) {
      if (!ACCEPT_MIME.has(f.type)) {
        setError(`\`${f.name}\` is not a supported type. PDF, JPG, PNG only.`)
        continue
      }
      if (f.size > MAX_FILE_BYTES) {
        setError(`\`${f.name}\` is too large (max 5 MB).`)
        continue
      }
      accepted.push(f)
    }
    if (accepted.length > remainingSlots) {
      setError(
        `Only ${remainingSlots} more file${remainingSlots === 1 ? '' : 's'} allowed.`,
      )
      accepted.splice(remainingSlots)
    }
    if (accepted.length > 0) onAddFiles(accepted)
    // Clear the input so picking the same file twice still fires onChange.
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-text-muted">{label}</label>

      <ul className="space-y-2">
        {existing.map((att) => {
          const removed = removedIds.includes(att.id)
          const isImage =
            att.mimeType === 'image/jpeg' || att.mimeType === 'image/png'
          const dl = attachmentDownloadUrl(parentKind, att.id, false)
          const dlInline = attachmentDownloadUrl(parentKind, att.id, true)
          return (
            <li
              key={att.id}
              className={`flex items-center gap-3 rounded border border-border bg-surface px-3 py-2 text-sm ${
                removed ? 'opacity-50' : ''
              }`}
            >
              <span className="inline-flex h-8 w-10 items-center justify-center rounded bg-surface-muted text-[10px] font-semibold text-text-muted">
                {fileTypeIcon(att.mimeType)}
              </span>
              {isImage && parentId ? (
                <img
                  src={dlInline}
                  alt=""
                  className="h-10 w-10 rounded border border-border object-cover"
                  aria-hidden
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <div
                  className={`truncate font-medium ${
                    removed ? 'line-through' : ''
                  }`}
                >
                  {att.originalName}
                </div>
                <div className="text-xs text-text-muted">
                  {formatBytes(att.sizeBytes)}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {removed ? (
                  <button
                    type="button"
                    onClick={() => onUndoRemoveExisting(att.id)}
                    className="font-medium text-accent hover:underline"
                  >
                    Undo
                  </button>
                ) : (
                  <>
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
                    <button
                      type="button"
                      onClick={() => onRemoveExisting(att.id)}
                      className="font-medium text-danger hover:underline"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </li>
          )
        })}

        {pendingFiles.map((f, idx) => {
          const blobUrl = pendingPreviewUrls[idx]
          return (
            <li
              key={`pending-${idx}-${f.name}`}
              className="flex items-center gap-3 rounded border border-dashed border-border bg-surface px-3 py-2 text-sm"
            >
              <span className="inline-flex h-8 w-10 items-center justify-center rounded bg-accent-soft text-[10px] font-semibold text-accent">
                {fileTypeIcon(f.type)}
              </span>
              {blobUrl ? (
                <img
                  src={blobUrl}
                  alt=""
                  className="h-10 w-10 rounded border border-border object-cover"
                  aria-hidden
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{f.name}</div>
                <div className="text-xs text-text-muted">
                  {formatBytes(f.size)} · queued
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemovePending(idx)}
                className="text-xs font-medium text-danger hover:underline"
              >
                Remove
              </button>
            </li>
          )
        })}

        {existing.length === 0 && pendingFiles.length === 0 ? (
          <li className="rounded border border-dashed border-border px-3 py-3 text-center text-xs text-text-muted">
            No attachments yet.
          </li>
        ) : null}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={remainingSlots === 0}
        >
          {existing.length + pendingFiles.length === 0
            ? 'Attach files'
            : 'Add more files'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_EXT}
          multiple
          hidden
          onChange={handlePicked}
        />
        <span className="text-xs text-text-muted">
          Up to {maxFiles} files. PDF, JPG, PNG. Max 5 MB each.
        </span>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-danger"
        >
          {error}
        </p>
      ) : null}

      <AttachmentPreviewDialog target={preview} onClose={() => setPreview(null)} />
    </div>
  )
}
