import { useId } from "react";
import { violinIconSvg } from "@/lib/violin-svg";

// The Violi mark: a violin resting at an angle on a polished metal tile. In the app it inverts with
// the theme — graphite tile on light, silver tile on dark — with the violin cut out in the page colour.
export function ViolinMark({ size = 28, className }: { size?: number; className?: string }) {
  const id = `vt${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const svg = violinIconSvg({
    colors: { tile: "var(--text)", wood: "var(--bg)", ink: "var(--text)", tileGradient: ["var(--logo-a)", "var(--logo-b)"], id },
    strings: size >= 40,
  }).replace("<svg ", `<svg width="${size}" height="${size}" aria-hidden="true" `);
  return <span className={className} style={{ display: "inline-flex", width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function Wordmark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <ViolinMark size={size} />
      <span className="font-bold leading-none tracking-[-0.04em]" style={{ fontSize: size * 0.74 }}>
        violi
      </span>
    </span>
  );
}
