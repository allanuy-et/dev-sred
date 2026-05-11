'use client'

import { useState } from 'react'

import type { NarrativeResponse } from '@sred/shared'

import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { ApiError } from '@/lib/api'
import { clientApi } from '@/lib/api.client'

export interface NarrativeButtonProps {
  projectId: string
  projectName: string
}

/**
 * Renders the SR&ED narrative generator as a compact aside card. Lives in the
 * project detail's left column via {@link DetailLayout}.
 */
export function NarrativeButton({
  projectId,
  projectName,
}: NarrativeButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<NarrativeResponse | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleGenerate() {
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const body = await clientApi<NarrativeResponse>(
        `/ai/projects/${projectId}/narrative`,
        { method: 'POST' },
      )
      setResult(body)
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setError(
          'AI narrative is unavailable on this server. Set ANTHROPIC_API_KEY and restart the API.',
        )
      } else if (err instanceof ApiError && err.status === 400) {
        setError(
          'No labour entries with notes for this project in the last 90 days. Add detailed notes first.',
        )
      } else if (err instanceof ApiError && err.status === 401) {
        setError('Your session expired. Please sign in again.')
      } else if (err instanceof ApiError && err.status === 502) {
        setError('The model returned an error. Please try again in a moment.')
      } else {
        setError('Could not generate the narrative. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.narrative)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore — copy is a nice-to-have, not load-bearing.
    }
  }

  return (
    <Card compact title="SR&ED narrative">
      <p className="text-xs text-text-muted">
        Draft a one-paragraph SR&amp;ED narrative from this project&rsquo;s
        labour-entry notes (last 90 days). Uses Claude.
      </p>

      <div className="mt-4">
        <Button onClick={handleGenerate} disabled={loading}>
          {loading
            ? 'Generating…'
            : result
              ? 'Regenerate'
              : 'Generate narrative'}
        </Button>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-danger"
        >
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-4 space-y-3">
          <p className="whitespace-pre-wrap text-sm leading-6 text-text">
            {result.narrative}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-text-muted">
            <span>
              Drafted from {result.sourceLabourCount} labour{' '}
              {result.sourceLabourCount === 1 ? 'entry' : 'entries'} for{' '}
              <span className="font-medium text-text">{projectName}</span> via{' '}
              <span className="font-mono">{result.model}</span>.
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="font-medium text-accent hover:underline"
            >
              {copied ? 'Copied!' : 'Copy paragraph'}
            </button>
          </div>
        </div>
      ) : null}
    </Card>
  )
}
