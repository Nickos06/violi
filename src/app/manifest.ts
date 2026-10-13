import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Violi",
    short_name: "Violi",
    description: "Calorie & macro tracking with AI photos, Garmin & Strava, levels and friends.",
    start_url: "/today",
    display: "standalone",
    background_color: "#08080a",
    theme_color: "#08080a",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
