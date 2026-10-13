"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChartSpline, Dumbbell, House, Plus, Settings, UserRound, Users, ChefHat } from "lucide-react";
import { cn } from "./ui";
import { useT } from "./i18n-provider";
import { ViolinMark, Wordmark } from "./logo";

export function Nav({ username, unread }: { username: string; unread: number }) {
  const path = usePathname();
  const { t } = useT();
  const items = [
    { href: "/today", label: t.nav.today, icon: House },
    { href: "/progress", label: t.nav.progress, icon: ChartSpline },
    { href: "/log", label: t.nav.log, icon: Plus, primary: true },
    { href: "/social", label: t.nav.social, icon: Users },
    { href: `/u/${username}`, label: t.nav.profile, icon: UserRound },
  ];
  const isActive = (href: string) => path === href || path.startsWith(href + "/");

  return (
    <>
      {/* Phone: floating glass tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom,0px),12px)] md:hidden" aria-label="Main">
        <ul className="mx-auto grid max-w-md grid-cols-5 items-center rounded-[26px] border border-border bg-surface/85 px-1.5 py-1.5 shadow-[0_8px_30px_-12px_rgb(0_0_0/0.25)] backdrop-blur-2xl backdrop-saturate-150">
          {items.map(({ href, label, icon: Icon, primary }) => {
            const active = isActive(href);
            return (
              <li key={href} className="flex justify-center">
                {primary ? (
                  <Link href={href} aria-label={label} className="press varnish grid size-[52px] place-items-center rounded-[18px]">
                    <Icon className="size-6" strokeWidth={2.6} />
                  </Link>
                ) : (
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn("press relative flex h-[52px] w-full flex-col items-center justify-center gap-1 rounded-[18px] text-[10.5px] font-semibold transition-colors", active ? "text-text" : "text-faint")}
                  >
                    <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 1.9} />
                    <span>{label}</span>
                    <span className={cn("absolute bottom-1 size-1 rounded-full bg-accent transition-opacity duration-200", active ? "opacity-100" : "opacity-0")} />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-bg/60 px-4 py-7 backdrop-blur-xl md:flex">
        <Link href="/today" className="mb-9 px-2"><Wordmark size={34} /></Link>
        <ul className="space-y-1">
          {[
            ...items.filter((i) => !i.primary),
            { href: "/meals", label: t.saved.title, icon: ChefHat },
            { href: "/workouts", label: t.nav.workouts, icon: Dumbbell },
          ].map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <SideLink href={href} active={isActive(href)} icon={<Icon className="size-[19px]" strokeWidth={isActive(href) ? 2.3 : 1.9} />}>{label}</SideLink>
            </li>
          ))}
          <li>
            <SideLink href="/notifications" active={isActive("/notifications")} icon={<Bell className="size-[19px]" />}>
              {t.nav.notifications}
              {unread > 0 && <span className="varnish ml-auto rounded-full px-1.5 text-[11px] font-bold">{unread}</span>}
            </SideLink>
          </li>
          <li>
            <SideLink href="/settings" active={isActive("/settings")} icon={<Settings className="size-[19px]" />}>{t.nav.settings}</SideLink>
          </li>
        </ul>
        <Link href="/log" className="press varnish mt-7 flex h-12 items-center justify-center gap-2 rounded-2xl font-bold">
          <Plus className="size-5" strokeWidth={2.6} /> {t.today.addFood}
        </Link>
      </aside>
    </>
  );
}

function SideLink({ href, active, icon, children }: { href: string; active: boolean; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn("press flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] font-semibold transition-colors", active ? "bg-surface-2 text-text" : "text-muted hover:bg-surface-2/60 hover:text-text")}
    >
      <span>{icon}</span>
      {children}
    </Link>
  );
}

export function TopBar({ unread }: { unread: number }) {
  return (
    <div className="flex items-center justify-between pt-[max(env(safe-area-inset-top,0px),12px)] md:hidden">
      <Link href="/today" className="press"><Wordmark size={30} /></Link>
      <div className="flex items-center gap-1">
        <Link href="/meals" className="press grid size-10 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text" aria-label="Meals">
          <ChefHat className="size-[21px]" />
        </Link>
        <Link href="/notifications" className="press relative grid size-10 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text" aria-label="Notifications">
          <Bell className="size-[21px]" />
          {unread > 0 && <span className="absolute right-2 top-2 size-2.5 rounded-full border-2 border-bg bg-accent" />}
        </Link>
        <Link href="/settings" className="press grid size-10 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text" aria-label="Settings">
          <Settings className="size-[21px]" />
        </Link>
      </div>
    </div>
  );
}

/** Kept for places that only need the bare mark. */
export function Logo({ size = 28 }: { size?: number }) {
  return <ViolinMark size={size} />;
}
