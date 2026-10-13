import type { Metadata, Viewport } from "next";
import { DM_Mono, Manrope } from "next/font/google";
import { cookies } from "next/headers";
import { getUser } from "@/lib/auth";
import { I18nProvider } from "@/components/i18n-provider";
import { asThemePref, THEME_COOKIE, themeScript } from "@/lib/theme";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin", "greek"], variable: "--font-manrope", display: "swap" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: "500", variable: "--font-dm-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Violi", template: "%s · Violi" },
  description: "Calorie & macro tracking with AI photos, Garmin & Strava sync, levels and friends.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Violi" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  // theme-color and data-theme are set by the inline theme script in <head> (see lib/theme.ts).
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  const jar = await cookies();
  const locale = (user?.locale ?? jar.get("violi_locale")?.value) === "en" ? "en" : "el";
  const theme = asThemePref(user?.theme ?? jar.get(THEME_COOKIE)?.value);
  return (
    <html lang={locale} suppressHydrationWarning className={`${manrope.variable} ${dmMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript(theme) }} />
      </head>
      <body className="min-h-dvh font-sans">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
