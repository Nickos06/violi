import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { saveImage } from "@/lib/uploads";

/** Image upload for posts. Clients compress to JPEG before sending (see lib/image-client.ts). */
export async function POST(req: Request) {
  if (!(await getUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "no_file" }, { status: 400 });
  try {
    const url = await saveImage(Buffer.from(await file.arrayBuffer()), file.type);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "bad_image" }, { status: 400 });
  }
}
