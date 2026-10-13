import { readFile } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/uploads";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[a-f0-9]{24}\.(jpg|png|webp|gif)$/.test(name)) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(path.join(UPLOAD_DIR, name));
    return new Response(data, { headers: { "Content-Type": TYPES[name.split(".")[1]], "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
