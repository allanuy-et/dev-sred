import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { Router } from 'express'
import multer from 'multer'
import type {
  Attachment,
  LabourEntry,
  LabourEntryWithRelations,
  LabourTime,
  LabourType,
  ObjectiveEvidence,
} from '@sred/shared'
import { query } from '../db.js'
import {
  ALLOWED_MIME,
  MAX_FILES_PER_REQUEST,
  MAX_FILE_BYTES,
  MAX_TOTAL_ATTACHMENTS_PER_PARENT,
  looksLike,
  resolveAbsolute,
  saveBuffer,
  unlinkRelative,
} from '../lib/attachments.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()

router.use(requireAuth)

// --- Validation helpers (hand-written; no external library) ---

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const LABOUR_TIMES = new Set<LabourTime>(['regular', 'overtime', 'double'])
const LABOUR_TYPES = new Set<LabourType>([
  'alpha_test',
  'beta_test',
  'programming',
  'test_and_measurement',
  'design_modifications',
  'analysis',
  'other',
])
const OBJECTIVE_EVIDENCE_VALUES = new Set<ObjectiveEvidence>([
  'none',
  'design_of_experiments',
  'test_records',
  'progress_reports',
])

function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v)
}

function isIsoDate(v: unknown): v is string {
  if (typeof v !== 'string' || !ISO_DATE_RE.test(v)) return false
  const d = new Date(`${v}T00:00:00Z`)
  return !Number.isNaN(d.getTime())
}

function isValidHours(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= 24
}

// Escape ILIKE wildcards so user input can't act as wildcards.
function escapeIlikeWildcards(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

// --- Row mappers ---

interface LabourRow {
  id: string
  date: Date | string
  employee_id: string
  project_id: string
  hours: string // NUMERIC returns string
  labour_time: LabourTime
  labour_type: LabourType
  objective_evidence: ObjectiveEvidence
  notes: string | null
  file_path: string | null
  created_at: Date | string
  updated_at: Date | string
}

interface LabourRowWithRelations extends LabourRow {
  employee_first_name: string
  employee_last_name: string
  project_name: string
}

function toIsoDate(v: Date | string): string {
  if (typeof v === 'string') return v.length >= 10 ? v.slice(0, 10) : v
  // pg returns DATE columns as a Date pinned to local midnight; use UTC parts
  // to avoid off-by-one when the server is east of UTC.
  const y = v.getUTCFullYear()
  const m = String(v.getUTCMonth() + 1).padStart(2, '0')
  const d = String(v.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toIsoTimestamp(v: Date | string): string {
  return typeof v === 'string' ? new Date(v).toISOString() : v.toISOString()
}

function toLabourEntry(row: LabourRow): LabourEntry {
  return {
    id: row.id,
    date: toIsoDate(row.date),
    employeeId: row.employee_id,
    projectId: row.project_id,
    hours: Number(row.hours),
    labourTime: row.labour_time,
    labourType: row.labour_type,
    objectiveEvidence: row.objective_evidence,
    notes: row.notes,
    filePath: row.file_path,
    createdAt: toIsoTimestamp(row.created_at),
    updatedAt: toIsoTimestamp(row.updated_at),
  }
}

function toLabourEntryWithRelations(
  row: LabourRowWithRelations,
  attachments: Attachment[] = [],
): LabourEntryWithRelations {
  return {
    ...toLabourEntry(row),
    employeeName: `${row.employee_first_name} ${row.employee_last_name}`.trim(),
    projectName: row.project_name,
    attachments,
  }
}

// SELECT lists kept centralized so column names stay in sync with mappers.
const LABOUR_SELECT = `
  l.id, l.date, l.employee_id, l.project_id, l.hours, l.labour_time, l.labour_type,
  l.objective_evidence, l.notes, l.file_path, l.created_at, l.updated_at`

const LABOUR_SELECT_WITH_RELATIONS = `
  ${LABOUR_SELECT},
  u.first_name AS employee_first_name,
  u.last_name  AS employee_last_name,
  p.name       AS project_name`

// --- Routes ---

router.get('/', async (req, res, next) => {
  try {
    const { from, to, projectId, employeeId } = req.query
    const limitRaw = Number(req.query.limit ?? 50)
    const offsetRaw = Number(req.query.offset ?? 0)
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 500 ? Math.floor(limitRaw) : 50
    const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? Math.floor(offsetRaw) : 0

    // Company-scoping: first param is always caller's user id, joined as `me`.
    const params: unknown[] = [req.user!.userId]
    const where: string[] = ['p.company_id = me.company_id']

    if (typeof from === 'string') {
      if (!isIsoDate(from)) return res.status(400).json({ error: 'Invalid `from` date' })
      params.push(from)
      where.push(`l.date >= $${params.length}`)
    }
    if (typeof to === 'string') {
      if (!isIsoDate(to)) return res.status(400).json({ error: 'Invalid `to` date' })
      params.push(to)
      where.push(`l.date <= $${params.length}`)
    }
    if (typeof projectId === 'string') {
      if (!isUuid(projectId)) return res.status(400).json({ error: 'Invalid `projectId`' })
      params.push(projectId)
      where.push(`l.project_id = $${params.length}`)
    }
    if (typeof employeeId === 'string') {
      if (!isUuid(employeeId)) return res.status(400).json({ error: 'Invalid `employeeId`' })
      params.push(employeeId)
      where.push(`l.employee_id = $${params.length}`)
    }
    // ?q= free-text search on notes: ignore silently if missing / <2 chars after trim.
    if (typeof req.query.q === 'string') {
      const trimmed = req.query.q.trim()
      if (trimmed.length >= 2) {
        params.push(`%${escapeIlikeWildcards(trimmed)}%`)
        where.push(`COALESCE(l.notes, '') ILIKE $${params.length}`)
      }
    }

    const whereSql = `WHERE ${where.join(' AND ')}`

    // Total count uses the same filters but no limit/offset.
    const totalRes = await query<{ total: string }>(
      `SELECT COUNT(*)::text AS total
       FROM labour_entries l
       JOIN projects p ON p.id = l.project_id
       JOIN users me   ON me.id = $1
       ${whereSql}`,
      params
    )
    const total = Number(totalRes.rows[0]?.total ?? 0)

    params.push(limit)
    const limitIdx = params.length
    params.push(offset)
    const offsetIdx = params.length

    const rows = await query<LabourRowWithRelations>(
      `SELECT ${LABOUR_SELECT_WITH_RELATIONS}
       FROM labour_entries l
       JOIN users u    ON u.id = l.employee_id
       JOIN projects p ON p.id = l.project_id
       JOIN users me   ON me.id = $1
       ${whereSql}
       ORDER BY l.date DESC, l.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    )

    return res.json({
      entries: rows.rows.map((r) => toLabourEntryWithRelations(r)),
      total,
    })
  } catch (err) {
    return next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Not found' })

    const result = await query<LabourRowWithRelations>(
      `SELECT ${LABOUR_SELECT_WITH_RELATIONS}
       FROM labour_entries l
       JOIN users u    ON u.id = l.employee_id
       JOIN projects p ON p.id = l.project_id
       JOIN users me   ON me.id = $1
       WHERE l.id = $2 AND p.company_id = me.company_id`,
      [req.user!.userId, req.params.id]
    )
    const row = result.rows[0]
    if (!row) return res.status(404).json({ error: 'Not found' })
    const attachments = await listLabourAttachments(req.params.id)
    return res.json({ entry: toLabourEntryWithRelations(row, attachments) })
  } catch (err) {
    return next(err)
  }
})

// --- Attachments ----------------------------------------------------------

interface LabourAttachmentRow {
  id: string
  file_path: string
  original_name: string
  mime_type: string
  size_bytes: number
  uploaded_by: string | null
  created_at: Date | string
}

function toAttachment(row: LabourAttachmentRow): Attachment {
  return {
    id: row.id,
    filePath: row.file_path,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    uploadedBy: row.uploaded_by,
    createdAt:
      typeof row.created_at === 'string'
        ? new Date(row.created_at).toISOString()
        : row.created_at.toISOString(),
  }
}

async function listLabourAttachments(labourId: string): Promise<Attachment[]> {
  const res = await query<LabourAttachmentRow>(
    `SELECT id, file_path, original_name, mime_type, size_bytes, uploaded_by, created_at
     FROM labour_attachments
     WHERE labour_entry_id = $1
     ORDER BY created_at ASC`,
    [labourId]
  )
  return res.rows.map(toAttachment)
}

// Look up the labour entry + its company + the caller's auth context in one
// trip. Returns null when the entry isn't in caller's company (treated as 404).
// Standard users get an additional ownership flag; the caller decides whether
// to enforce it for the action they're performing.
async function loadLabourForAuth(
  entryId: string,
  callerId: string,
): Promise<{ employeeId: string; companyId: string; callerAccess: string; callerIsAdmin: boolean } | null> {
  const r = await query<{
    employee_id: string
    company_id: string
    access_level: string
  }>(
    `SELECT l.employee_id, me.company_id, me.access_level
     FROM labour_entries l
     JOIN projects p ON p.id = l.project_id
     JOIN users me ON me.id = $2
     WHERE l.id = $1 AND p.company_id = me.company_id`,
    [entryId, callerId]
  )
  const row = r.rows[0]
  if (!row) return null
  return {
    employeeId: row.employee_id,
    companyId: row.company_id,
    callerAccess: row.access_level,
    callerIsAdmin: row.access_level === 'admin',
  }
}

const labourUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES_PER_REQUEST },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true)
    else cb(new Error('UNSUPPORTED_TYPE'))
  },
})

function multerErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large (max 5 MB).' })
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: `Too many files (max ${MAX_FILES_PER_REQUEST}).` })
    }
    return res.status(400).json({ error: err.message })
  }
  if (err instanceof Error && err.message === 'UNSUPPORTED_TYPE') {
    return res
      .status(400)
      .json({ error: 'Unsupported file type. Only PDF, JPG, and PNG are allowed.' })
  }
  return next(err)
}

// multer ships its own @types/express that clash with the workspace's
// @types/express. Cast the produced middleware back to the workspace's
// RequestHandler so router.post(... handler) accepts it.
const labourUploadMiddleware = labourUpload.array(
  'files',
  MAX_FILES_PER_REQUEST,
) as unknown as RequestHandler

router.get('/:id/attachments', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Not found' })
    const auth = await loadLabourForAuth(req.params.id, req.user!.userId)
    if (!auth) return res.status(404).json({ error: 'Not found' })
    const attachments = await listLabourAttachments(req.params.id)
    return res.json({ attachments })
  } catch (err) {
    return next(err)
  }
})

router.post(
  '/:id/attachments',
  (req, res, next) =>
    labourUploadMiddleware(req, res, (err) =>
      err ? multerErrorHandler(err, req, res, next) : next(),
    ),
  async (req, res, next) => {
    try {
      if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Not found' })
      const files = (req.files as Express.Multer.File[] | undefined) ?? []
      if (files.length === 0) return res.status(400).json({ error: 'No files in upload.' })

      const auth = await loadLabourForAuth(req.params.id, req.user!.userId)
      if (!auth) return res.status(404).json({ error: 'Not found' })

      // Standard users can only attach to their own entries.
      if (
        auth.callerAccess === 'standard' &&
        auth.employeeId !== req.user!.userId
      ) {
        return res
          .status(403)
          .json({ error: 'You can only attach files to your own labour entries.' })
      }

      // Enforce total attachments cap.
      const existingCount = await query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM labour_attachments WHERE labour_entry_id = $1`,
        [req.params.id]
      )
      const existing = Number(existingCount.rows[0]?.count ?? 0)
      if (existing + files.length > MAX_TOTAL_ATTACHMENTS_PER_PARENT) {
        return res.status(400).json({
          error: `Too many attachments (max ${MAX_TOTAL_ATTACHMENTS_PER_PARENT} per labour entry).`,
        })
      }

      // Magic-byte check on each buffer.
      for (const f of files) {
        if (!looksLike(f.buffer, f.mimetype)) {
          return res
            .status(400)
            .json({ error: `\`${f.originalname}\` does not match its declared file type.` })
        }
      }

      // Write all to disk, then insert all rows. If a write fails partway, we
      // remove the files that already landed before bailing.
      const saved: { relativePath: string; sizeBytes: number; file: Express.Multer.File }[] = []
      try {
        for (const f of files) {
          const s = await saveBuffer(auth.companyId, f.mimetype, f.buffer)
          saved.push({ ...s, file: f })
        }
      } catch (err) {
        await Promise.allSettled(saved.map((s) => unlinkRelative(s.relativePath)))
        throw err
      }

      const inserted: Attachment[] = []
      for (const s of saved) {
        const r = await query<LabourAttachmentRow>(
          `INSERT INTO labour_attachments
            (labour_entry_id, file_path, original_name, mime_type, size_bytes, uploaded_by)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, file_path, original_name, mime_type, size_bytes, uploaded_by, created_at`,
          [
            req.params.id,
            s.relativePath,
            s.file.originalname,
            s.file.mimetype,
            s.sizeBytes,
            req.user!.userId,
          ]
        )
        inserted.push(toAttachment(r.rows[0]))
      }

      return res.status(201).json({ attachments: inserted })
    } catch (err) {
      return next(err)
    }
  },
)

router.delete('/:id/attachments/:attachmentId', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id) || !isUuid(req.params.attachmentId)) {
      return res.status(404).json({ error: 'Not found' })
    }
    const auth = await loadLabourForAuth(req.params.id, req.user!.userId)
    if (!auth) return res.status(404).json({ error: 'Not found' })
    if (
      auth.callerAccess === 'standard' &&
      auth.employeeId !== req.user!.userId
    ) {
      return res
        .status(403)
        .json({ error: 'You can only delete attachments on your own labour entries.' })
    }
    const r = await query<{ file_path: string }>(
      `DELETE FROM labour_attachments
       WHERE id = $1 AND labour_entry_id = $2
       RETURNING file_path`,
      [req.params.attachmentId, req.params.id]
    )
    const row = r.rows[0]
    if (!row) return res.status(404).json({ error: 'Not found' })
    await unlinkRelative(row.file_path)
    return res.json({ ok: true })
  } catch (err) {
    return next(err)
  }
})

router.get('/attachments/:id/download', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Not found' })
    // Join to the labour row + caller's company in one trip.
    const r = await query<{
      file_path: string
      original_name: string
      mime_type: string
      size_bytes: number
    }>(
      `SELECT la.file_path, la.original_name, la.mime_type, la.size_bytes
       FROM labour_attachments la
       JOIN labour_entries l ON l.id = la.labour_entry_id
       JOIN projects p ON p.id = l.project_id
       JOIN users me ON me.id = $2
       WHERE la.id = $1 AND p.company_id = me.company_id`,
      [req.params.id, req.user!.userId]
    )
    const row = r.rows[0]
    if (!row) return res.status(404).json({ error: 'Not found' })

    const absolute = resolveAbsolute(row.file_path)
    try {
      await stat(absolute)
    } catch {
      return res.status(404).json({ error: 'File missing on disk.' })
    }
    // `?inline=1` → render in browser (used by preview UI). Default forces save.
    const disposition = req.query.inline === '1' ? 'inline' : 'attachment'
    const encoded = encodeURIComponent(row.original_name)
    res.setHeader('Content-Type', row.mime_type)
    res.setHeader('Content-Length', String(row.size_bytes))
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="${row.original_name.replace(/"/g, '')}"; filename*=UTF-8''${encoded}`,
    )
    createReadStream(absolute).pipe(res)
  } catch (err) {
    return next(err)
  }
})

// Validate and extract a CreateLabourInput from arbitrary body.
// Returns either a parsed object or an error message.
function parseCreateLabour(body: unknown): { ok: true; value: {
  date: string
  employeeId: string
  projectId: string
  hours: number
  labourTime: LabourTime
  labourType: LabourType
  objectiveEvidence: ObjectiveEvidence
  notes: string | null
} } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Body must be an object' }
  const b = body as Record<string, unknown>

  if (!isIsoDate(b.date)) return { ok: false, error: 'Invalid `date` (expected YYYY-MM-DD)' }
  if (!isUuid(b.employeeId)) return { ok: false, error: 'Invalid `employeeId`' }
  if (!isUuid(b.projectId)) return { ok: false, error: 'Invalid `projectId`' }
  if (!isValidHours(b.hours)) return { ok: false, error: '`hours` must be a number > 0 and <= 24' }
  if (typeof b.labourTime !== 'string' || !LABOUR_TIMES.has(b.labourTime as LabourTime)) {
    return { ok: false, error: 'Invalid `labourTime`' }
  }
  if (typeof b.labourType !== 'string' || !LABOUR_TYPES.has(b.labourType as LabourType)) {
    return { ok: false, error: 'Invalid `labourType`' }
  }
  if (typeof b.objectiveEvidence !== 'string' || !OBJECTIVE_EVIDENCE_VALUES.has(b.objectiveEvidence as ObjectiveEvidence)) {
    return { ok: false, error: 'Invalid `objectiveEvidence`' }
  }
  const notes = b.notes === undefined || b.notes === null
    ? null
    : typeof b.notes === 'string'
      ? b.notes
      : null

  return {
    ok: true,
    value: {
      date: b.date,
      employeeId: b.employeeId,
      projectId: b.projectId,
      hours: b.hours,
      labourTime: b.labourTime as LabourTime,
      labourType: b.labourType as LabourType,
      objectiveEvidence: b.objectiveEvidence as ObjectiveEvidence,
      notes,
    },
  }
}

// Verify (employeeId, projectId) exist AND belong to the caller's company.
// Cross-tenant returns the same "does not exist" error to avoid leaking row
// existence across tenants.
async function verifyForeignKeysInCompany(
  employeeId: string,
  projectId: string,
  companyId: string
): Promise<string | null> {
  const res = await query<{ employee_exists: boolean; project_exists: boolean }>(
    `SELECT
       EXISTS(SELECT 1 FROM users    WHERE id = $1 AND company_id = $3) AS employee_exists,
       EXISTS(SELECT 1 FROM projects WHERE id = $2 AND company_id = $3) AS project_exists`,
    [employeeId, projectId, companyId]
  )
  const row = res.rows[0]
  if (!row?.employee_exists) return 'employeeId does not exist'
  if (!row?.project_exists) return 'projectId does not exist'
  return null
}

router.post('/', async (req, res, next) => {
  try {
    const parsed = parseCreateLabour(req.body)
    if (!parsed.ok) return res.status(400).json({ error: parsed.error })
    const v = parsed.value

    // Standard users can only log labour for themselves. Admins can log on
    // behalf of any employee in the company.
    if (
      req.user!.accessLevel === 'standard' &&
      v.employeeId !== req.user!.userId
    ) {
      return res
        .status(403)
        .json({ error: 'You can only log labour for yourself.' })
    }

    const me = await query<{ company_id: string }>(
      `SELECT company_id FROM users WHERE id = $1`,
      [req.user!.userId]
    )
    const companyId = me.rows[0]?.company_id
    if (!companyId) return res.status(401).json({ error: 'Not authenticated' })

    const fkErr = await verifyForeignKeysInCompany(v.employeeId, v.projectId, companyId)
    if (fkErr) return res.status(400).json({ error: fkErr })

    const result = await query<LabourRow>(
      `INSERT INTO labour_entries
        (date, employee_id, project_id, hours, labour_time, labour_type, objective_evidence, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${LABOUR_SELECT.replace(/l\./g, '')}`,
      [v.date, v.employeeId, v.projectId, v.hours, v.labourTime, v.labourType, v.objectiveEvidence, v.notes]
    )
    return res.status(201).json({ entry: toLabourEntry(result.rows[0]) })
  } catch (err) {
    return next(err)
  }
})

// Bulk insert across a date range. Same validations as POST /, plus a sanity
// cap on the range length so a typo can't insert a year of rows. Atomic — one
// SQL statement, all rows inserted or none.
const MAX_BULK_DAYS = 92

router.post('/bulk', async (req, res, next) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Body must be an object' })
    }
    const b = req.body as Record<string, unknown>

    if (!isIsoDate(b.startDate)) return res.status(400).json({ error: 'Invalid `startDate`' })
    if (!isIsoDate(b.endDate)) return res.status(400).json({ error: 'Invalid `endDate`' })
    if (b.startDate > b.endDate) {
      return res.status(400).json({ error: '`startDate` must be on or before `endDate`' })
    }
    if (!isUuid(b.employeeId)) return res.status(400).json({ error: 'Invalid `employeeId`' })
    if (!isUuid(b.projectId)) return res.status(400).json({ error: 'Invalid `projectId`' })
    if (!isValidHours(b.hours)) {
      return res.status(400).json({ error: '`hours` must be a number > 0 and <= 24' })
    }
    if (typeof b.labourTime !== 'string' || !LABOUR_TIMES.has(b.labourTime as LabourTime)) {
      return res.status(400).json({ error: 'Invalid `labourTime`' })
    }
    if (typeof b.labourType !== 'string' || !LABOUR_TYPES.has(b.labourType as LabourType)) {
      return res.status(400).json({ error: 'Invalid `labourType`' })
    }
    if (
      typeof b.objectiveEvidence !== 'string' ||
      !OBJECTIVE_EVIDENCE_VALUES.has(b.objectiveEvidence as ObjectiveEvidence)
    ) {
      return res.status(400).json({ error: 'Invalid `objectiveEvidence`' })
    }
    const notes =
      b.notes === undefined || b.notes === null
        ? null
        : typeof b.notes === 'string'
          ? b.notes.trim() === ''
            ? null
            : b.notes
          : (() => {
              throw new Error('Invalid `notes`')
            })()
    const skipWeekends = b.skipWeekends === true

    if (
      req.user!.accessLevel === 'standard' &&
      b.employeeId !== req.user!.userId
    ) {
      return res
        .status(403)
        .json({ error: 'You can only log labour for yourself.' })
    }

    // Build the date list in JS to keep the SQL simple. We anchor at UTC noon
    // to avoid any tz-induced day shift; only the date part is sent.
    const start = new Date(`${b.startDate}T12:00:00Z`)
    const end = new Date(`${b.endDate}T12:00:00Z`)
    const dates: string[] = []
    for (
      let cur = new Date(start);
      cur.getTime() <= end.getTime();
      cur.setUTCDate(cur.getUTCDate() + 1)
    ) {
      const dow = cur.getUTCDay()
      if (skipWeekends && (dow === 0 || dow === 6)) continue
      dates.push(cur.toISOString().slice(0, 10))
    }
    if (dates.length === 0) {
      return res.status(400).json({ error: 'No dates in range after applying filters.' })
    }
    if (dates.length > MAX_BULK_DAYS) {
      return res
        .status(400)
        .json({ error: `Date range too large (max ${MAX_BULK_DAYS} entries).` })
    }

    // Company-scope + FK validation (single round-trip).
    const me = await query<{ company_id: string }>(
      `SELECT company_id FROM users WHERE id = $1`,
      [req.user!.userId]
    )
    const companyId = me.rows[0]?.company_id
    if (!companyId) return res.status(401).json({ error: 'Not authenticated' })
    const fkErr = await verifyForeignKeysInCompany(b.employeeId, b.projectId, companyId)
    if (fkErr) return res.status(400).json({ error: fkErr })

    const inserted = await query<LabourRow>(
      `INSERT INTO labour_entries
         (date, employee_id, project_id, hours, labour_time, labour_type, objective_evidence, notes)
       SELECT d::date, $2, $3, $4, $5, $6, $7, $8
       FROM unnest($1::date[]) AS d
       RETURNING ${LABOUR_SELECT.replace(/l\./g, '')}`,
      [
        dates,
        b.employeeId,
        b.projectId,
        b.hours,
        b.labourTime,
        b.labourType,
        b.objectiveEvidence,
        notes,
      ]
    )
    const entries = inserted.rows.map(toLabourEntry)
    return res.status(201).json({ created: entries.length, entries })
  } catch (err) {
    return next(err)
  }
})

router.patch('/:id', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Not found' })
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Body must be an object' })
    }
    const b = req.body as Record<string, unknown>

    // Build SET clause from the provided fields, validating each.
    const sets: string[] = []
    const params: unknown[] = []
    const push = (sql: string, value: unknown) => {
      params.push(value)
      sets.push(`${sql} = $${params.length}`)
    }

    if ('date' in b) {
      if (!isIsoDate(b.date)) return res.status(400).json({ error: 'Invalid `date`' })
      push('date', b.date)
    }
    if ('employeeId' in b) {
      if (!isUuid(b.employeeId)) return res.status(400).json({ error: 'Invalid `employeeId`' })
      push('employee_id', b.employeeId)
    }
    if ('projectId' in b) {
      if (!isUuid(b.projectId)) return res.status(400).json({ error: 'Invalid `projectId`' })
      push('project_id', b.projectId)
    }
    if ('hours' in b) {
      if (!isValidHours(b.hours)) return res.status(400).json({ error: '`hours` must be a number > 0 and <= 24' })
      push('hours', b.hours)
    }
    if ('labourTime' in b) {
      if (typeof b.labourTime !== 'string' || !LABOUR_TIMES.has(b.labourTime as LabourTime)) {
        return res.status(400).json({ error: 'Invalid `labourTime`' })
      }
      push('labour_time', b.labourTime)
    }
    if ('labourType' in b) {
      if (typeof b.labourType !== 'string' || !LABOUR_TYPES.has(b.labourType as LabourType)) {
        return res.status(400).json({ error: 'Invalid `labourType`' })
      }
      push('labour_type', b.labourType)
    }
    if ('objectiveEvidence' in b) {
      if (typeof b.objectiveEvidence !== 'string' || !OBJECTIVE_EVIDENCE_VALUES.has(b.objectiveEvidence as ObjectiveEvidence)) {
        return res.status(400).json({ error: 'Invalid `objectiveEvidence`' })
      }
      push('objective_evidence', b.objectiveEvidence)
    }
    if ('notes' in b) {
      if (b.notes !== null && typeof b.notes !== 'string') {
        return res.status(400).json({ error: 'Invalid `notes`' })
      }
      push('notes', b.notes ?? null)
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided' })
    }

    // Look up the current row + caller's company id in one trip. The JOIN
    // gates company scope: if the entry's project isn't in caller's company,
    // no row comes back and we return 404 — same shape as expenses.
    const current = await query<{
      employee_id: string
      project_id: string
      company_id: string
    }>(
      `SELECT l.employee_id, l.project_id, me.company_id
       FROM labour_entries l
       JOIN projects p ON p.id = l.project_id
       JOIN users me   ON me.id = $1
       WHERE l.id = $2 AND p.company_id = me.company_id`,
      [req.user!.userId, req.params.id]
    )
    const currentRow = current.rows[0]
    if (!currentRow) return res.status(404).json({ error: 'Not found' })

    // Standard users can only edit their own labour entries — and can't
    // reassign an entry to someone else either.
    if (req.user!.accessLevel === 'standard') {
      if (currentRow.employee_id !== req.user!.userId) {
        return res
          .status(403)
          .json({ error: 'You can only edit your own labour entries.' })
      }
      if ('employeeId' in b && b.employeeId !== req.user!.userId) {
        return res
          .status(403)
          .json({ error: 'You can only log labour for yourself.' })
      }
    }

    // If FK columns changed, verify the new references stay inside caller's company.
    if ('employeeId' in b || 'projectId' in b) {
      const fkErr = await verifyForeignKeysInCompany(
        (b.employeeId as string | undefined) ?? currentRow.employee_id,
        (b.projectId as string | undefined) ?? currentRow.project_id,
        currentRow.company_id
      )
      if (fkErr) return res.status(400).json({ error: fkErr })
    }

    sets.push(`updated_at = now()`)
    params.push(req.params.id)
    const result = await query<LabourRow>(
      `UPDATE labour_entries
       SET ${sets.join(', ')}
       WHERE id = $${params.length}
       RETURNING ${LABOUR_SELECT.replace(/l\./g, '')}`,
      params
    )
    const row = result.rows[0]
    if (!row) return res.status(404).json({ error: 'Not found' })
    return res.json({ entry: toLabourEntry(row) })
  } catch (err) {
    return next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Not found' })
    // Company-scope via USING: delete only if the entry's project is in
    // caller's company. Cross-tenant attempts hit 0 rows → 404. Standard
    // users are further restricted to their own entries via the extra
    // `me.access_level = 'admin' OR l.employee_id = me.id` clause — a no-op
    // for admins.
    const result = await query(
      `DELETE FROM labour_entries l
       USING projects p, users me
       WHERE l.id = $1
         AND p.id = l.project_id
         AND me.id = $2
         AND p.company_id = me.company_id
         AND (me.access_level = 'admin' OR l.employee_id = me.id)`,
      [req.params.id, req.user!.userId]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' })
    return res.json({ ok: true })
  } catch (err) {
    return next(err)
  }
})

export default router
