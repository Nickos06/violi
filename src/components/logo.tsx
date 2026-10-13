import { useId } from "react";
import { markInner, MARK_RATIO, MARK_VIEWBOX } from "@/lib/brand-mark";

// Violi mark "Παλμός" (brand/BRAND.md). Ink and accent come from --logo-a / --logo-b, so the mark
// follows light and dark mode with no hard-coded colours. Mask ids are unique per instance.
export function BrandMark({ height = 24, className, title }: { height?: number; className?: string; title?: string }) {
  const id = `vh${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const width = Math.round(height * MARK_RATIO * 100) / 100;
  const inner = markInner({ ink: "var(--logo-a)", accent: "var(--logo-b)" }, id, height < 20);
  return (
    <svg
      viewBox={MARK_VIEWBOX}
      width={width}
      height={height}
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}

/** Lockup: mark, then "violi" in DM Mono 500. Mark height ≈ 1.25× the font size, gap ≈ 0.32em. */
export function Wordmark({ size = 28, className }: { size?: number; className?: string }) {
  const fontSize = Math.round(size / 1.25);
  return (
    <span className={`inline-flex items-center text-text ${className ?? ""}`} style={{ gap: `${0.32 * fontSize}px` }}>
      <BrandMark height={size} />
      <span className="font-wordmark leading-none" style={{ fontSize, fontWeight: 500, letterSpacing: "-0.03em" }}>violi</span>
    </span>
  );
}
