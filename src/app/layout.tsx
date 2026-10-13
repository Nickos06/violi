import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { getUser } from "@/lib/auth";
import { I18nProvider } from "@/components/i18n-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "greek"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Violi", template: "%s · Violi" },
  description: "Calorie & macro tracking with AI photos, Garmin & Strava sync, levels and friends.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Violi" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#08080a" },
    { media: "(prefers-color-scheme: light)", color: "#f6f6f8" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  const jar = await cookies();
  const locale = (user?.locale ?? jar.get("violi_locale")?.value) === "en" ? "en" : "el";
  const theme = user?.theme ?? jar.get("violi_theme")?.value ?? "dark";
  return (
    <html lang={locale} data-theme={theme === "light" ? "light" : "dark"} className={inter.variable}>
      <body className="min-h-dvh font-sans">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
