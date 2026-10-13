import { redirect } from "next/navigation";
import { Camera, ChefHat, Flame, Footprints, Trophy, Watch } from "lucide-react";
import { getT, getUser } from "@/lib/auth";
import { IconTile, LinkButton, Ring } from "@/components/ui";
import { BrandMark, Wordmark } from "@/components/logo";
import { LocaleSwitch } from "@/components/locale-switch";
import { ThemeSwitch } from "@/components/theme-switch";
import { asThemePref, THEME_COOKIE } from "@/lib/theme";
import { cookies } from "next/headers";

export default async function Landing() {
  const user = await getUser();
  if (user) redirect(user.onboarded ? "/today" : "/onboarding");
  const { t, locale } = await getT();
  const features = [
    { icon: Camera, title: t.landing.f1, text: t.landing.f1d, tone: "var(--accent)" },
    { icon: Flame, title: t.landing.f2, text: t.landing.f2d, tone: "var(--carbs)" },
    { icon: Watch, title: t.landing.f3, text: t.landing.f3d, tone: "var(--protein)" },
    { icon: Trophy, title: t.landing.f4, text: t.landing.f4d, tone: "var(--fat)" },
  ];
  const [lead, tail] = t.landing.title.split(/,\s*/);
  return (
    <div className="relative mx-auto max-w-6xl overflow-x-clip px-5">
      <header className="flex items-center justify-between pb-4 pt-[max(env(safe-area-inset-top,0px),20px)]">
        <Wordmark size={30} />
        <div className="flex items-center gap-1">
          <ThemeSwitch value={asThemePref((await cookies()).get(THEME_COOKIE)?.value)} signedIn={false} className="mr-1" />
          <LocaleSwitch locale={locale} />
          <LinkButton href="/login" variant="ghost" size="sm">{t.auth.login}</LinkButton>
        </div>
      </header>

      <section className="grid min-h-[calc(100svh-90px)] items-center gap-14 py-10 md:grid-cols-[1.1fr_1fr] md:py-16">
        <div className="stagger">
          <span className="inline-flex items-center gap-2 edge rounded-full px-3 py-1.5 text-[12px] font-bold text-muted">
            <span className="size-1.5 rounded-full bg-accent" /> Garmin · Strava · AI
          </span>
          <h1 className="font-display mt-6 text-[52px] font-semibold leading-[0.98] md:text-[76px]">
            {lead},<br />
            <span className="text-muted">{tail}</span>
          </h1>
          <p className="mt-6 max-w-md text-[17px] leading-relaxed text-muted">{t.landing.subtitle}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <LinkButton href="/signup" size="lg">{t.landing.cta}</LinkButton>
            <LinkButton href="/login" size="lg" variant="secondary">{t.auth.login}</LinkButton>
          </div>
        </div>

        {/* Product preview */}
        <div className="relative mx-auto w-full max-w-[340px]">
          <div className="absolute -left-10 -top-14 max-md:hidden">
            <BrandMark height={72} />
          </div>
          <div className="card animate-rise relative rounded-[36px] p-5 [animation-delay:150ms]">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold">{t.common.today}</span>
              <span className="flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-[12px] font-bold">
                <Flame className="size-3.5" fill="currentColor" /> 12
              </span>
            </div>
            <div className="mt-4 grid place-items-center">
              <Ring value={1460} max={2350} size={196} stroke={15}>
                <div>
                  <div className="font-display tabular text-[46px] font-semibold leading-none">890</div>
                  <div className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{t.today.remaining}</div>
                </div>
              </Ring>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                { l: t.macros.protein, v: "112", m: "150", c: "var(--protein)", p: 75 },
                { l: t.macros.carbs, v: "140", m: "240", c: "var(--carbs)", p: 58 },
                { l: t.macros.fat, v: "48", m: "70", c: "var(--fat)", p: 68 },
              ].map((m) => (
                <div key={m.l} className="rounded-2xl bg-surface-2/70 px-2.5 py-2">
                  <div className="truncate text-[10.5px] font-bold text-muted">{m.l}</div>
                  <div className="tabular text-[14px] font-extrabold">{m.v}<span className="text-[11px] text-faint">/{m.m}</span></div>
                  <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full" style={{ width: `${m.p}%`, background: m.c }} /></div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-surface-2/70 p-3">
              <IconTile size={38}><Footprints className="size-[18px]" /></IconTile>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold">Morning Run</div>
                <div className="text-[11.5px] font-semibold text-faint">8.2 km · 42m · Garmin</div>
              </div>
              <div className="tabular text-[14px] font-extrabold text-good">+520</div>
            </div>
            <div className="mt-2 flex items-center gap-3 rounded-2xl bg-surface-2/70 p-3">
              <IconTile size={38} tone="var(--carbs)"><ChefHat className="size-[18px]" /></IconTile>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold">{locale === "el" ? "Μουσακάς της μαμάς" : "Mum's moussaka"}</div>
                <div className="text-[11.5px] font-semibold text-faint">320 g</div>
              </div>
              <div className="tabular text-[14px] font-extrabold">512</div>
            </div>
          </div>
        </div>
      </section>

      <section className="stagger grid gap-3 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ icon: Icon, title, text, tone }) => (
          <div key={title} className="card p-6">
            <IconTile tone={tone} size={44}><Icon className="size-5" /></IconTile>
            <h3 className="mt-5 text-[16px] font-extrabold">{title}</h3>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
