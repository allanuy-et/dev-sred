import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import type { NarrativeResponse } from '@sred/shared'
import { query } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()
router.use(requireAuth)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v)

// SDK reads ANTHROPIC_API_KEY from the environment automatically.
// If the env var is missing the SDK constructor throws — guard at the route boundary instead.
let client: Anthropic | null = null
function getClient(): Anthropic | null {
  if (client) return client
  if (!process.env.ANTHROPIC_API_KEY) return null
  client = new Anthropic()
  return client
}

// System prompt is intentionally focused, not artificially padded. With a short
// prompt the `cache_control` directive is a no-op (silent — below the model's
// minimum cacheable prefix); when teams later expand the prompt with examples
// or rubrics, caching kicks in automatically.
const NARRATIVE_SYSTEM_PROMPT = `You are drafting a single-paragraph SR&ED narrative for an internal record.

SR&ED context:
- SR&ED is a Canadian R&D tax credit. To qualify, a project must demonstrate
  three things: a technological uncertainty (something not knowable from
  publicly available information), a systematic investigation (a documented,
  hypothesis-driven approach), and an attempted technological advancement
  (a new or improved capability that wasn't otherwise available).

Output requirements:
- Exactly one paragraph, 150–250 words. No preamble, no headings, no bullets.
- Factual, technical, third-person voice. No marketing language. No exclamation
  marks. Avoid words like "innovative", "cutting-edge", "revolutionary".
- Structure: open with the technological uncertainty the project addressed,
  then describe the systematic investigation (experiments, iterations,
  measurements), close with what the team attempted to advance and what they
  learned. If the activity is plainly routine engineering, say so directly
  rather than overclaiming.

Source discipline:
- Use ONLY the project name, description, and labour-entry notes provided in
  the user message. Do not invent test results, partners, technologies, or
  outcomes that aren't in the source data.
- If the labour notes are thin, write what you can defend from the notes and
  note (in one sentence) what additional evidence would strengthen the claim.
- Cluster related entries into themes rather than narrating each entry.

Return only the paragraph.`

interface ProjectRow {
  id: string
  name: string
  description: string | null
  type: string
  phase: string
}

interface LabourNoteRow {
  date: Date | string
  hours: string
  labour_type: string
  objective_evidence: string
  notes: string | null
  employee_name: string
}

router.post('/projects/:id/narrative', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Not found' })

    const anthropic = getClient()
    if (!anthropic) {
      return res.status(503).json({
        error:
          'AI narrative is unavailable: set ANTHROPIC_API_KEY on the API and restart.',
      })
    }

    // Company-scope the project lookup. Cross-tenant → 404.
    const projectRes = await query<ProjectRow>(
      `SELECT p.id, p.name, p.description, p.type, p.phase
       FROM projects p
       JOIN users me ON me.id = $1
       WHERE p.id = $2 AND p.company_id = me.company_id`,
      [req.user!.userId, req.params.id]
    )
    const project = projectRes.rows[0]
    if (!project) return res.status(404).json({ error: 'Not found' })

    // Pull labour entries with non-empty notes, last 90 days, scoped to same company.
    const labourRes = await query<LabourNoteRow>(
      `SELECT l.date,
              l.hours::text AS hours,
              l.labour_type,
              l.objective_evidence,
              l.notes,
              (u.first_name || ' ' || u.last_name) AS employee_name
       FROM labour_entries l
       JOIN projects p ON p.id = l.project_id
       JOIN users u    ON u.id = l.employee_id
       JOIN users me   ON me.id = $1
       WHERE l.project_id = $2
         AND p.company_id = me.company_id
         AND l.date >= (CURRENT_DATE - INTERVAL '90 days')
         AND l.notes IS NOT NULL
         AND TRIM(l.notes) <> ''
       ORDER BY l.date DESC
       LIMIT 100`,
      [req.user!.userId, req.params.id]
    )

    if (labourRes.rows.length === 0) {
      return res.status(400).json({
        error:
          'No labour entries with notes for this project in the last 90 days. Add detailed notes to your labour entries first.',
      })
    }

    const formatDate = (d: Date | string) =>
      typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10)

    const entriesSummary = labourRes.rows
      .map(
        (r) =>
          `- ${formatDate(r.date)} | ${r.employee_name} | ${r.hours}h | ${r.labour_type} | evidence: ${r.objective_evidence} | ${r.notes?.trim() ?? ''}`
      )
      .join('\n')

    const userPrompt = `Project: ${project.name}
Type: ${project.type}
Phase: ${project.phase}
Description: ${project.description ?? '(none provided)'}

Labour entries (most recent first, last 90 days, with non-empty notes):
${entriesSummary}

Draft the SR&ED narrative paragraph for this project.`

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      // Adaptive thinking off + medium effort: narrative writing is well-scoped,
      // and the demo UX needs to be quick (no long pause before output appears).
      thinking: { type: 'disabled' },
      output_config: { effort: 'medium' },
      // Marks the assembled prefix (system + first user turn fragment) as cacheable.
      // Silently no-ops if the prefix is below the model's minimum cacheable size.
      cache_control: { type: 'ephemeral' },
      system: NARRATIVE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const narrative = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n\n')
      .trim()

    if (!narrative) {
      return res.status(502).json({ error: 'Model returned no text content.' })
    }

    const body: NarrativeResponse = {
      narrative,
      model: response.model,
      sourceLabourCount: labourRes.rows.length,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cacheReadInputTokens: response.usage.cache_read_input_tokens ?? 0,
        cacheCreationInputTokens: response.usage.cache_creation_input_tokens ?? 0,
      },
    }
    return res.json(body)
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      // Surface a generic upstream error to the client; log details server-side.
      console.error('[ai/narrative] Anthropic API error:', err.status, err.message)
      return res
        .status(502)
        .json({ error: `Upstream model error (${err.status}). Please try again.` })
    }
    return next(err)
  }
})

export default router
