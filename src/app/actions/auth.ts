"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";

export type AuthState = { error?: "invalid" | "taken" | "validation"; fields?: Record<string, string> } | undefined;

const COLORS = ["#8B7CFF", "#5AA9FF", "#FF7A6B", "#34D399", "#FFC24B", "#F472B6", "#22D3EE", "#A3E635"];

const SignupSchema = z.object({
  name: z.string().trim().min(1).max(60),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_.]{3,24}$/),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
});

export async function signup(_: AuthState, form: FormData): Promise<AuthState> {
  const raw = Object.fromEntries(form) as Record<string, string>;
  const parsed = SignupSchema.safeParse(raw);
  if (!parsed.success) return { error: "validation", fields: { name: raw.name, username: raw.username, email: raw.email } };
  const { name, username, email, password } = parsed.data;
  const exists = await db.user.findFirst({ where: { OR: [{ email }, { username }] } });
  if (exists) return { error: "taken", fields: { name, username, email } };
  const locale = (await cookies()).get("violi_locale")?.value === "en" ? "en" : "el";
  const user = await db.user.create({
    data: {
      name, username, email, locale,
      passwordHash: await bcrypt.hash(password, 11),
      avatarColor: COLORS[Math.floor(Math.random() * COLORS.length)],
    },
  });
  await createSession(user.id);
  redirect("/onboarding");
}

export async function login(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = await db.user.findFirst({ where: { OR: [{ email }, { username: email }] } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return { error: "invalid", fields: { email } };
  await createSession(user.id);
  redirect(user.onboarded ? "/today" : "/onboarding");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

export async function setGuestLocale(locale: "el" | "en") {
  (await cookies()).set("violi_locale", locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
}
