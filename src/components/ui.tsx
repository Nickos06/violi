import clsx from "clsx";
import Link from "next/link";
import { useId, type ComponentProps, type ReactNode } from "react";

export const cn = clsx;

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("card", className)} {...props} />;
}

export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-2.5 mt-8 flex items-end justify-between px-1", className)}>
      <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted">{children}</h2>
      {action}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
const variants: Record<ButtonVariant, string> = {
  primary: "varnish hover:opacity-90",
  secondary: "bg-surface-2 text-text hover:bg-surface-3",
  outline: "border border-border-strong text-text hover:bg-surface-2",
  ghost: "text-muted hover:bg-surface-2 hover:text-text",
  danger: "bg-bad/10 text-bad hover:bg-bad/15",
};
const sizes = {
  sm: "h-9 px-3.5 text-[13px] rounded-xl",
  md: "h-12 px-5 text-[15px] rounded-2xl",
  lg: "h-14 px-6 text-[16px] rounded-2xl",
};

export function buttonClass(variant: ButtonVariant = "primary", size: keyof typeof sizes = "md", className?: string) {
  return cn(
    "press inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold tracking-[-0.01em] disabled:pointer-events-none disabled:opacity-45",
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
  "h-12 w-full rounded-2xl border border-border bg-surface-2 px-4 text-[16px] font-medium text-text outline-none transition-[border-color,background-color,box-shadow] duration-150 placeholder:font-normal placeholder:text-faint focus:border-accent/60 focus:bg-surface focus:shadow-[0_0_0_4px_var(--accent-soft)]";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClass, "h-auto min-h-24 py-3 leading-relaxed", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(inputClass, "appearance-none bg-[length:16px] bg-[right_14px_center] bg-no-repeat pr-10", className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...props} />;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-[12px] font-semibold text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block px-1 text-[12px] leading-snug text-faint">{hint}</span>}
    </label>
  );
}

export function Badge({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", className)}
      style={color ? { color, background: `color-mix(in oklab, ${color} 14%, transparent)` } : undefined}
    >
      {children}
    </span>
  );
}

export function Bar({ value, max, color, className, over }: { value: number; max: number; color: string; className?: string; over?: boolean }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={cn("h-[7px] w-full overflow-hidden rounded-full bg-surface-3", className)}>
      <div
        className="h-full origin-left rounded-full transition-[width] duration-700 ease-[var(--ease-out)]"
        style={{ width: `${Math.max(pct, value > 0 ? 3 : 0)}%`, background: over ? "var(--bad)" : color }}
      />
    </div>
  );
}

/** Circular progress ring with a varnish gradient stroke. */
export function Ring({
  value, max, size = 180, stroke = 14, color, children, track = "var(--ring-track)", gradient = true,
}: { value: number; max: number; size?: number; stroke?: number; color?: string; children?: ReactNode; track?: string; gradient?: boolean }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const stroked = color ?? (gradient ? `url(#g${id})` : "var(--accent)");
  return (
    <div className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--accent-2)" />
            <stop offset="1" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        {pct > 0 && (
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={stroked} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className="ring-progress"
            style={{ ["--ring-c" as string]: `${c}` }}
          />
        )}
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
      className={cn("grid shrink-0 place-items-center rounded-full bg-surface-3 font-bold text-text", className)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      {icon && <div className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-muted">{icon}</div>}
      <p className="max-w-xs text-[15px] font-medium text-muted">{title}</p>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, action, back }: { title: string; subtitle?: ReactNode; action?: ReactNode; back?: string }) {
  return (
    <header className="flex items-end justify-between gap-3 pb-5 pt-3">
      <div className="min-w-0">
        {back && (
          <Link href={back} aria-label="Back" className="press -ml-2 mb-1 inline-grid size-9 place-items-center rounded-full text-2xl leading-none text-muted hover:bg-surface-2 hover:text-text">
            ‹
          </Link>
        )}
        <h1 className="font-display text-balance text-[34px] font-semibold leading-[1.05] [overflow-wrap:anywhere]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[14px] text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 pb-1">{action}</div>}
    </header>
  );
}

export function IconTile({ children, tone = "accent", size = 40, className }: { children: ReactNode; tone?: string; size?: number; className?: string }) {
  const color = tone === "accent" ? "var(--accent)" : tone;
  return (
    <div
      className={cn("grid shrink-0 place-items-center rounded-[14px]", className)}
      style={{ width: size, height: size, color, background: `color-mix(in oklab, ${color} 13%, transparent)` }}
    >
      {children}
    </div>
  );
}

export function fmt(n: number, digits = 0) {
  return n.toLocaleString("el-GR", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}
