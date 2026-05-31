import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

// ── Photo storage ───────────────────────────────────────────────
// LOCAL DEV: photos are written to backend/uploads/ and served statically.
// PRODUCTION: replace savePhoto with an upload to S3 / Cloud Storage and
// return the object URL instead of a local path. Nothing else needs to
// change — callers only care about the returned string.

const UPLOAD_DIR = join(process.cwd(), 'uploads');

// Accepts a data URL like "data:image/jpeg;base64,/9j/4AAQ..." and writes
// it to disk, returning the public path the frontend can load.
export async function savePhoto(
  dataUrl: string,
  prefix: string
): Promise<string> {
  const match = /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new Error('Invalid image data');
  }
  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  const buffer = Buffer.from(match[2], 'base64');

  // Guard against oversized uploads (~5MB ceiling).
  if (buffer.byteLength > 5 * 1024 * 1024) {
    throw new Error('Image is too large');
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${prefix}-${Date.now()}-${randomBytes(4).toString(
    'hex'
  )}.${ext}`;
  await writeFile(join(UPLOAD_DIR, filename), buffer);

  // Served by express.static at /uploads (see index.ts).
  return `/uploads/${filename}`;
}
