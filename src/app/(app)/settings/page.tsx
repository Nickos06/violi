import { getT, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { garminConfigured } from "@/lib/integrations/garmin";
import { stravaConfigured } from "@/lib/integrations/strava";
import { PageHeader } from "@/components/ui";
import { SettingsClient } from "./settings-client";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ connected?: string; error?: string }> }) {
  const user = await requireUser();
  const { t } = await getT();
  const sp = await searchParams;
  const integrations = await db.integration.findMany({ where: { userId: user.id } });
  const find = (p: string) => integrations.find((i) => i.provider === p);
  return (
    <div className="animate-rise">
      <PageHeader title={t.settings.title} />
      <SettingsClient
        flash={sp.connected ? { ok: true, msg: `✓ ${sp.connected === "garmin" ? "Garmin" : "Strava"} ${t.settings.connected.toLowerCase()}` } : sp.error ? { ok: false, msg: sp.error.endsWith("not_configured") ? t.settings.notConfigured : t.common.error } : null}
        user={{
          name: user.name, bio: user.bio ?? "", email: user.email, locale: user.locale, theme: user.theme,
          profilePublic: user.profilePublic, shareMeals: user.shareMeals, shareWorkouts: user.shareWorkouts, shareWeight: user.shareWeight,
          defaultVisibility: user.defaultVisibility, goalType: user.goalType ?? "maintain", goalRatePct: user.goalRatePct, sex: user.sex ?? "male",
          birthYear: user.birthYear ?? 1995, heightCm: user.heightCm ?? 175, activityLevel: user.activityLevel ?? "light", dietType: user.dietType,
          targetWeightKg: user.targetWeightKg, exerciseCreditPct: user.exerciseCreditPct, checkInWeekday: user.checkInWeekday,
          targetKcal: user.targetKcal ?? 2000, targetProtein: user.targetProtein ?? 140, targetCarbs: user.targetCarbs ?? 200, targetFat: user.targetFat ?? 65,
        }}
        garmin={{ configured: garminConfigured(), connected: !!find("garmin"), lastSync: find("garmin")?.lastSyncAt?.toISOString() ?? null }}
        strava={{ configured: stravaConfigured(), connected: !!find("strava"), lastSync: find("strava")?.lastSyncAt?.toISOString() ?? null }}
      />
    </div>
  );
}
