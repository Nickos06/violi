import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { get, put } from "@vercel/blob";

// Photo storage. On Vercel (BLOB_READ_WRITE_TOKEN set) images go to Vercel Blob; locally they go to ./uploads.
// Either way the app links to /api/files/<name>, so stored URLs don't depend on where the bytes live.
export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
const useBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;
const access = () => (process.env.BLOB_ACCESS === "public" ? "public" : "private") as "public" | "private";

export async function saveImage(data: Buffer, mime: string) {
  const ext = EXT[mime];
  if (!ext) throw new Error("UNSUPPORTED_IMAGE");
  if (data.length > 8 * 1024 * 1024) throw new Error("IMAGE_TOO_LARGE");
  const name = `${randomBytes(12).toString("hex")}.${ext}`;
  if (useBlob()) {
    await put(`uploads/${name}`, data, { access: access(), contentType: mime, addRandomSuffix: false, cacheControlMaxAge: 31536000 });
  } else {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, name), data);
  }
  return `/api/files/${name}`;
}

/** Reads a stored image by name; null when missing. */
export async function readImage(name: string): Promise<BodyInit | null> {
  if (useBlob()) {
    const r = await get(`uploads/${name}`, { access: access() }).catch(() => null);
    return r && r.statusCode === 200 ? r.stream : null;
  }
  return readFile(path.join(UPLOAD_DIR, name)).then((b) => new Uint8Array(b)).catch(() => null);
}
