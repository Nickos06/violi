import { getT, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isValidDay, today } from "@/lib/dates";
import { latestWeight } from "@/lib/plan";
import { asRoute, routePath, simplify } from "@/lib/route";
import { PageHeader } from "@/components/ui";
import { WorkoutsClient } from "./workouts-client";

export const metadata = { title: "Workouts" };

export default async function WorkoutsPage({ searchParams }: { searchParams: Promise<{ add?: string; d?: string }> }) {
  const user = await requireUser();
  const { t } = await getT();
  const sp = await searchParams;
  const [activities, strava, weight] = await Promise.all([
    db.activity.findMany({ where: { userId: user.id }, orderBy: { startAt: "desc" }, take: 60 }),
    db.integration.findUnique({ where: { userId_provider: { userId: user.id, provider: "strava" } } }),
    latestWeight(user.id),
  ]);
  return (
    <div className="animate-rise">
      <PageHeader title={t.workouts.title} />
      <WorkoutsClient
        openAdd={sp.add === "1"}
        date={isValidDay(sp.d) ? sp.d : today()}
        weightKg={weight ?? 75}
        hasStrava={!!strava}
        canShare={user.shareWorkouts}
        defaultVisibility={user.defaultVisibility}
        recent={[...new Set(activities.filter((a) => a.source === "violi" || a.source === "manual").map((a) => a.type))]}
        activities={activities.map((a) => {
          const route = asRoute(a.route);
          return {
            id: a.id, type: a.type, name: a.name, source: a.source, date: a.date, durationSec: a.durationSec, distanceM: a.distanceM, kcal: a.kcal,
            elevationM: a.elevationM, thumb: route ? routePath(simplify(route, 80), 56, 56, 9) : null,
          };
        })}
      />
    </div>
  );
}
