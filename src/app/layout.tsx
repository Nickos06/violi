import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { cookies } from "next/headers";
import { getUser } from "@/lib/auth";
import { I18nProvider } from "@/components/i18n-provider";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin", "greek"], variable: "--font-manrope", display: "swap" });

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
  // theme-color is set in <head> from the user's chosen theme (the app themes by setting, not by OS).
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  const jar = await cookies();
  const locale = (user?.locale ?? jar.get("violi_locale")?.value) === "en" ? "en" : "el";
  const theme = user?.theme ?? jar.get("violi_theme")?.value ?? "dark";
  return (
    <html lang={locale} data-theme={theme === "light" ? "light" : "dark"} className={manrope.variable}>
      <head>
        <meta name="theme-color" content={theme === "light" ? "#ffffff" : "#000000"} />
      </head>
      <body className="min-h-dvh font-sans">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
