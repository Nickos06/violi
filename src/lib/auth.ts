import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";
import { getMessages } from "./i18n";

const COOKIE = "violi_session";
const MAX_AGE_DAYS = 30;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + MAX_AGE_DAYS * 86_400_000);
  await db.session.create({ data: { id: hash(token), userId, expiresAt } });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: hash(token) } });
  jar.delete(COOKIE);
}

export const getUser = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { id: hash(token) }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getUser>>>;

/** For pages: redirects to login, and to onboarding until the plan is set up. */
export async function requireUser(opts: { allowUnonboarded?: boolean } = {}) {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!user.onboarded && !opts.allowUnonboarded) redirect("/onboarding");
  return user;
}

/** For server actions and route handlers: throws instead of redirecting. */
export async function requireUserApi() {
  const user = await getUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function getT() {
  const user = await getUser();
  const jar = await cookies();
  const locale = user?.locale ?? jar.get("violi_locale")?.value ?? "el";
  return { t: getMessages(locale), locale: locale === "en" ? "en" : "el" } as const;
}
