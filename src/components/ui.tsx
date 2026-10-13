import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export const cn = clsx;

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("card", className)} {...props} />;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between px-1">
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted">{children}</h2>
      {action}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-fg hover:brightness-110 active:brightness-95",
  secondary: "bg-surface-2 text-text hover:bg-surface-3",
  outline: "border border-border text-text hover:bg-surface-2",
  ghost: "text-muted hover:text-text hover:bg-surface-2",
  danger: "bg-bad/10 text-bad hover:bg-bad/15",
};
const sizes = { sm: "h-8 px-3 text-[13px] rounded-lg", md: "h-11 px-4 text-[15px] rounded-xl", lg: "h-13 px-5 text-base rounded-2xl" };

export function buttonClass(variant: ButtonVariant = "primary", size: keyof typeof sizes = "md", className?: string) {
  return cn(
    "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold transition disabled:pointer-events-none disabled:opacity-50",
    variants[variant], sizes[size], className,
  );
}

export function Button({ variant, size, className, ...props }: ComponentProps<"button"> & { variant?: ButtonVariant; size?: keyof typeof sizes }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({ variant, size, className, ...props }: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: keyof typeof sizes }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export const inputClass =
  "h-11 w-full rounded-xl border border-border bg-surface-2 px-3.5 text-[15px] text-text outline-none transition placeholder:text-faint focus:border-accent focus:bg-surface";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClass, "h-auto min-h-24 py-3 leading-relaxed", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(inputClass, "appearance-none pr-8", className)} {...props} />;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-faint">{hint}</span>}
    </label>
  );
}

export function Badge({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", className)}
      style={color ? { color, background: `${color}22` } : undefined}
    >
      {children}
    </span>
  );
}

export function Bar({ value, max, color, className, over }: { value: number; max: number; color: string; className?: string; over?: boolean }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)}>
      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, background: over ? "var(--bad)" : color }} />
    </div>
  );
}

/** Circular progress ring. */
export function Ring({
  value, max, size = 180, stroke = 14, color = "var(--accent)", children, track = "var(--ring-track)",
}: { value: number; max: number; size?: number; stroke?: number; color?: string; children?: ReactNode; track?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function Avatar({ name, color, url, size = 40, className }: { name: string; color?: string; url?: string | null; size?: number; className?: string }) {
  const initials = name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} width={size} height={size} className={cn("shrink-0 rounded-full object-cover", className)} style={{ width: size, height: size }} />;
  }
  return (
    <div
      className={cn("grid shrink-0 place-items-center rounded-full font-semibold text-white", className)}
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${color ?? "#8B5CF6"}, ${color ?? "#8B5CF6"}aa)`, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  );
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      {icon && <div className="text-3xl">{icon}</div>}
      <p className="text-[15px] font-medium text-muted">{title}</p>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, action, back }: { title: string; subtitle?: ReactNode; action?: ReactNode; back?: string }) {
  return (
    <header className="flex items-end justify-between gap-3 pb-4 pt-2">
      <div className="min-w-0">
        {back && (
          <Link href={back} aria-label="Back" className="-ml-1 mb-1 inline-grid size-8 place-items-center rounded-full text-xl text-muted hover:bg-surface-2 hover:text-text">
            ‹
          </Link>
        )}
        <h1 className="truncate text-[28px] font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[14px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function fmt(n: number, digits = 0) {
  return n.toLocaleString("el-GR", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}
