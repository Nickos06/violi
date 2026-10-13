import { ImageResponse } from "next/og";
import { appIconSvg } from "@/lib/brand-mark";

// PNG app icons for the web manifest: /pwa-icon/192, /pwa-icon/512 and /pwa-icon/maskable (512, full-bleed, safe-zone padded).
const VARIANTS = {
  "192": { size: 192, svg: () => appIconSvg({ rounded: 0 }) },
  "512": { size: 512, svg: () => appIconSvg({ rounded: 0 }) },
  maskable: { size: 512, svg: () => appIconSvg({ rounded: 0, scale: 0.78 }) },
} as const;

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((variant) => ({ variant }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ variant: string }> }) {
  const v = VARIANTS[(await params).variant as keyof typeof VARIANTS];
  if (!v) return new Response("Not found", { status: 404 });
  const src = `data:image/svg+xml;base64,${Buffer.from(v.svg()).toString("base64")}`;
  return new ImageResponse(
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img src={src} width={v.size} height={v.size} />,
    { width: v.size, height: v.size, headers: { "Cache-Control": "public, max-age=86400, immutable" } },
  );
}
