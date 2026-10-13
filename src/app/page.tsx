import { redirect } from "next/navigation";
import { Camera, Flame, Trophy, Watch } from "lucide-react";
import { getT, getUser } from "@/lib/auth";
import { LinkButton, Ring } from "@/components/ui";
import { Logo } from "@/components/nav";
import { LocaleSwitch } from "@/components/locale-switch";

export default async function Landing() {
  const user = await getUser();
  if (user) redirect(user.onboarded ? "/today" : "/onboarding");
  const { t, locale } = await getT();
  const features = [
    { icon: Camera, title: t.landing.f1, text: t.landing.f1d },
    { icon: Flame, title: t.landing.f2, text: t.landing.f2d },
    { icon: Watch, title: t.landing.f3, text: t.landing.f3d },
    { icon: Trophy, title: t.landing.f4, text: t.landing.f4d },
  ];
  return (
    <div className="mx-auto max-w-5xl px-5">
      <header className="flex items-center justify-between py-5">
        <div className="flex items-center gap-2">
          <Logo size={30} />
          <span className="text-xl font-bold tracking-tight">Violi</span>
        </div>
        <div className="flex items-center gap-2">
          <LocaleSwitch locale={locale} />
          <LinkButton href="/login" variant="ghost" size="sm">{t.auth.login}</LinkButton>
        </div>
      </header>

      <section className="grid items-center gap-12 py-12 md:grid-cols-[1.1fr_1fr] md:py-20">
        <div className="animate-rise">
          <h1 className="text-[44px] font-bold leading-[1.05] tracking-tight md:text-6xl">{t.landing.title}</h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">{t.landing.subtitle}</p>
          <div className="mt-8 flex gap-3">
            <LinkButton href="/signup" size="lg">{t.landing.cta}</LinkButton>
            <LinkButton href="/login" size="lg" variant="secondary">{t.auth.login}</LinkButton>
          </div>
        </div>

        <div className="animate-rise mx-auto w-full max-w-[320px] [animation-delay:120ms]">
          <div className="card rounded-[2.2rem] p-5">
            <div className="flex items-center justify-between text-[13px] text-muted">
              <span className="font-semibold text-text">{t.common.today}</span>
              <span className="flex items-center gap-1 font-semibold text-warn">🔥 12</span>
            </div>
            <div className="mt-4 grid place-items-center">
              <Ring value={1460} max={2350} size={200} stroke={16}>
                <div>
                  <div className="tabular text-4xl font-bold">890</div>
                  <div className="text-[13px] text-muted">{t.today.remaining}</div>
                </div>
              </Ring>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                { l: t.macros.protein, v: "112/150", c: "var(--protein)", p: 75 },
                { l: t.macros.carbs, v: "140/240", c: "var(--carbs)", p: 58 },
                { l: t.macros.fat, v: "48/70", c: "var(--fat)", p: 68 },
              ].map((m) => (
                <div key={m.l}>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full" style={{ width: `${m.p}%`, background: m.c }} /></div>
                  <div className="mt-1.5 text-[11px] text-muted">{m.l}</div>
                  <div className="tabular text-[13px] font-semibold">{m.v}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
              <div className="grid size-10 place-items-center rounded-xl bg-accent-soft text-lg">🏃</div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold">Morning Run · Garmin</div>
                <div className="text-xs text-muted">8.2 km · 42m</div>
              </div>
              <div className="tabular text-[13px] font-semibold text-good">+520</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 pb-20 sm:grid-cols-2 md:grid-cols-4">
        {features.map(({ icon: Icon, title, text }) => (
          <div key={title} className="card p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent"><Icon className="size-5" /></div>
            <h3 className="mt-4 font-semibold">{title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
