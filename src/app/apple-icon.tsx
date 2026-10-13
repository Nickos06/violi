import { ImageResponse } from "next/og";
import { appIconSvg } from "@/lib/brand-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS home-screen icon: full-bleed square (iOS applies its own corner mask).
export default function AppleIcon() {
  const src = `data:image/svg+xml;base64,${Buffer.from(appIconSvg({ rounded: 0 })).toString("base64")}`;
  return new ImageResponse(
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img src={src} width={180} height={180} />,
    size,
  );
}
