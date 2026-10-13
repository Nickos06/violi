import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

// Local file storage for meal photos. For production, swap for object storage (S3, R2, Vercel Blob…).
export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

export async function saveImage(data: Buffer, mime: string) {
  const ext = EXT[mime];
  if (!ext) throw new Error("UNSUPPORTED_IMAGE");
  if (data.length > 8 * 1024 * 1024) throw new Error("IMAGE_TOO_LARGE");
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${randomBytes(12).toString("hex")}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, name), data);
  return `/api/files/${name}`;
}
