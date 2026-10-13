import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { asRoute, type Split } from "@/lib/route";
import { ActivityDetail } from "./activity-detail";

export const metadata = { title: "Activity" };

// Activities are owner-only (Strava data in particular may only be shown to its athlete). Friends see shared posts.
export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const a = await db.activity.findFirst({ where: { id, userId: user.id } });
  if (!a) notFound();
  return (
    <ActivityDetail
      canShare={user.shareWorkouts}
      defaultVisibility={user.defaultVisibility}
      a={{
        id: a.id, type: a.type, name: a.name, description: a.description, source: a.source, startAt: a.startAt.toISOString(), durationSec: a.durationSec,
        elapsedSec: a.elapsedSec, distanceM: a.distanceM, kcal: a.kcal, avgHr: a.avgHr, elevationM: a.elevationM, maxSpeed: a.maxSpeed, effort: a.effort,
        photoUrl: a.photoUrl, route: asRoute(a.route), splits: Array.isArray(a.splits) ? (a.splits as Split[]) : [],
      }}
    />
  );
}
