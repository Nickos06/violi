import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { lookupBarcode } from "@/lib/foods";

export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!(await getUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { code } = await params;
  if (!/^\d{6,14}$/.test(code)) return NextResponse.json({ item: null }, { status: 400 });
  return NextResponse.json({ item: await lookupBarcode(code) });
}
