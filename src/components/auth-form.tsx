"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup, type AuthState } from "@/app/actions/auth";
import { Button, Field, Input } from "./ui";
import { useT } from "./i18n-provider";
import { Logo } from "./nav";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { t } = useT();
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? login : signup, undefined);
  const err = state?.error === "invalid" ? t.auth.invalid : state?.error === "taken" ? t.auth.taken : state?.error === "validation" ? t.common.error : null;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 py-12">
      <Link href="/" className="mb-10 flex items-center gap-2 self-start">
        <Logo size={30} />
        <span className="text-xl font-bold tracking-tight">Violi</span>
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">{mode === "login" ? t.auth.welcomeBack : t.auth.createTitle}</h1>
      <p className="mt-2 text-muted">{t.app.tagline}</p>

      <form action={action} className="mt-8 space-y-4">
        {mode === "signup" && (
          <>
            <Field label={t.auth.name}>
              <Input name="name" required autoComplete="name" defaultValue={state?.fields?.name} />
            </Field>
            <Field label={t.auth.username} hint={t.auth.usernameHint}>
              <Input name="username" required autoComplete="username" pattern="[A-Za-z0-9_.]{3,24}" defaultValue={state?.fields?.username} />
            </Field>
          </>
        )}
        <Field label={mode === "login" ? `${t.auth.email} / ${t.auth.username}` : t.auth.email}>
          <Input name="email" type={mode === "login" ? "text" : "email"} required autoComplete="email" defaultValue={state?.fields?.email} />
        </Field>
        <Field label={t.auth.password} hint={mode === "signup" ? t.auth.passwordHint : undefined}>
          <Input name="password" type="password" required minLength={mode === "signup" ? 8 : 1} autoComplete={mode === "login" ? "current-password" : "new-password"} />
        </Field>
        {err && <p className="rounded-xl bg-bad/10 px-3 py-2.5 text-sm text-bad">{err}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? t.common.loading : mode === "login" ? t.auth.login : t.auth.signup}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {mode === "login" ? t.auth.noAccount : t.auth.haveAccount}{" "}
        <Link href={mode === "login" ? "/signup" : "/login"} className="font-semibold text-accent">
          {mode === "login" ? t.auth.signup : t.auth.login}
        </Link>
      </p>
    </div>
  );
}
