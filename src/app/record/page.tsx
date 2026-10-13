import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { latestWeight } from "@/lib/plan";
import { RecordClient } from "./record-client";

export const metadata = { title: "Record" };

export default async function RecordPage({ searchParams }: { searchParams: Promise<{ sport?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const [weight, recent] = await Promise.all([
    latestWeight(user.id),
    db.activity.findMany({ where: { userId: user.id, source: { in: ["violi", "manual"] } }, orderBy: { startAt: "desc" }, take: 30, select: { type: true } }),
  ]);
  return (
    <RecordClient
      weightKg={weight ?? 75}
      recent={[...new Set(recent.map((r) => r.type))]}
      initialSport={sp.sport}
      canShare={user.shareWorkouts}
      defaultVisibility={user.defaultVisibility}
    />
  );
}
