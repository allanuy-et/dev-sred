import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

export const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
])

export const ALLOWED_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}

export const MAX_FILES_PER_REQUEST = 10
export const MAX_FILE_BYTES = 5 * 1024 * 1024
export const MAX_TOTAL_ATTACHMENTS_PER_PARENT = 10

// Root upload directory. Resolved once at module load. The actual per-company
// subdir is created lazily on first use.
function uploadsRoot(): string {
  const configured = process.env.UPLOADS_DIR ?? './uploads'
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(process.cwd(), configured)
}

const UPLOADS_ROOT = uploadsRoot()

export async function companyUploadsDir(companyId: string): Promise<string> {
  const dir = path.join(UPLOADS_ROOT, companyId)
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })
  return dir
}

// Magic-byte sniff. The mime claimed by the upload form might be forged; this
// rejects any file whose bytes don't actually match the declared type. Cheap,
// catches the common renamed-extension case.
export function looksLike(buf: Buffer, mime: string): boolean {
  if (mime === 'application/pdf') return buf.slice(0, 4).toString() === '%PDF'
  if (mime === 'image/jpeg') return buf[0] === 0xff && buf[1] === 0xd8
  if (mime === 'image/png') {
    return (
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47
    )
  }
  return false
}

export interface SavedFile {
  /** Path relative to UPLOADS_ROOT, e.g. `<companyId>/<uuid>.pdf`. */
  relativePath: string
  sizeBytes: number
}

export async function saveBuffer(
  companyId: string,
  mime: string,
  buffer: Buffer,
): Promise<SavedFile> {
  const ext = ALLOWED_EXT[mime]
  if (!ext) throw new Error('Unsupported file type')
  const dir = await companyUploadsDir(companyId)
  const filename = `${randomUUID()}.${ext}`
  const absolutePath = path.join(dir, filename)
  await writeFile(absolutePath, buffer)
  return {
    relativePath: path.join(companyId, filename),
    sizeBytes: buffer.byteLength,
  }
}

// Safely resolve a relative path under the uploads root. Throws if the result
// would escape the root (defensive — relativePath always comes from the DB,
// but a corrupted row shouldn't yield arbitrary filesystem reads).
export function resolveAbsolute(relativePath: string): string {
  const absolute = path.resolve(UPLOADS_ROOT, relativePath)
  if (!absolute.startsWith(UPLOADS_ROOT + path.sep) && absolute !== UPLOADS_ROOT) {
    throw new Error('Path escapes uploads root')
  }
  return absolute
}

export async function unlinkRelative(relativePath: string): Promise<void> {
  try {
    await unlink(resolveAbsolute(relativePath))
  } catch (err: unknown) {
    const code = (err as { code?: string }).code
    if (code === 'ENOENT') return
    throw err
  }
}
