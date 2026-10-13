import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Nav, TopBar } from "@/components/nav";
import { LiveWorkoutBanner } from "@/components/gym/live-banner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const unread = await db.notification.count({ where: { userId: user.id, read: false } });
  return (
    <div className="md:pl-64">
      <Nav username={user.username} unread={unread} />
      <LiveWorkoutBanner />
      <main className="mx-auto w-full max-w-2xl px-4 pb-36 md:px-10 md:pb-16 md:pt-8">
        <TopBar unread={unread} />
        {children}
      </main>
    </div>
  );
}
