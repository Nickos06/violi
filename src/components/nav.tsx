"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChartLine, House, Plus, Settings, Users, UserRound, Dumbbell } from "lucide-react";
import { cn } from "./ui";
import { useT } from "./i18n-provider";

export function Nav({ username, unread }: { username: string; unread: number }) {
  const path = usePathname();
  const { t } = useT();
  const items = [
    { href: "/today", label: t.nav.today, icon: House },
    { href: "/progress", label: t.nav.progress, icon: ChartLine },
    { href: "/log", label: t.nav.log, icon: Plus, primary: true },
    { href: "/social", label: t.nav.social, icon: Users },
    { href: `/u/${username}`, label: t.nav.profile, icon: UserRound },
  ];
  const isActive = (href: string) => path === href || (href !== "/" && path.startsWith(href + "/")) || path === href;

  return (
    <>
      {/* Mobile bottom bar */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/85 backdrop-blur-xl md:hidden">
        <ul className="mx-auto grid max-w-lg grid-cols-5 px-2 pt-1.5">
          {items.map(({ href, label, icon: Icon, primary }) => (
            <li key={href} className="flex justify-center">
              {primary ? (
                <Link href={href} aria-label={label} className="grid size-12 place-items-center rounded-2xl bg-accent text-accent-fg shadow-lg shadow-accent/25 transition active:scale-95">
                  <Icon className="size-6" strokeWidth={2.5} />
                </Link>
              ) : (
                <Link href={href} className={cn("flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium transition", isActive(href) ? "text-text" : "text-faint")}>
                  <Icon className="size-[22px]" strokeWidth={isActive(href) ? 2.4 : 1.8} />
                  {label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-bg px-3 py-6 md:flex">
        <Link href="/today" className="mb-8 flex items-center gap-2 px-3">
          <Logo />
          <span className="text-lg font-bold tracking-tight">Violi</span>
        </Link>
        <ul className="space-y-1">
          {[...items.filter((i) => !i.primary), { href: "/workouts", label: t.nav.workouts, icon: Dumbbell }].map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition", isActive(href) ? "bg-surface-2 text-text" : "text-muted hover:text-text")}>
                <Icon className="size-5" strokeWidth={isActive(href) ? 2.3 : 1.8} />
                {label}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/notifications" className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition", isActive("/notifications") ? "bg-surface-2 text-text" : "text-muted hover:text-text")}>
              <Bell className="size-5" />
              {t.nav.notifications}
              {unread > 0 && <span className="ml-auto rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-fg">{unread}</span>}
            </Link>
          </li>
          <li>
            <Link href="/settings" className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition", isActive("/settings") ? "bg-surface-2 text-text" : "text-muted hover:text-text")}>
              <Settings className="size-5" />
              {t.nav.settings}
            </Link>
          </li>
        </ul>
        <Link href="/log" className="mt-6 flex h-11 items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-accent-fg transition hover:brightness-110">
          <Plus className="size-5" strokeWidth={2.5} /> {t.today.addFood}
        </Link>
      </aside>
    </>
  );
}

export function TopBar({ unread }: { unread: number }) {
  return (
    <div className="flex items-center justify-between pt-3 md:hidden">
      <Link href="/today" className="flex items-center gap-2">
        <Logo />
        <span className="text-[17px] font-bold tracking-tight">Violi</span>
      </Link>
      <div className="flex items-center gap-1">
        <Link href="/notifications" className="relative grid size-10 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text" aria-label="Notifications">
          <Bell className="size-5" />
          {unread > 0 && <span className="absolute right-2 top-2 size-2 rounded-full bg-accent" />}
        </Link>
        <Link href="/settings" className="grid size-10 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text" aria-label="Settings">
          <Settings className="size-5" />
        </Link>
      </div>
    </div>
  );
}

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <path d="M9 10.5 16 23l7-12.5" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="8.5" r="2" fill="#fff" />
    </svg>
  );
}
