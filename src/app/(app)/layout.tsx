import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Nav, TopBar } from "@/components/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const unread = await db.notification.count({ where: { userId: user.id, read: false } });
  return (
    <div className="md:pl-60">
      <Nav username={user.username} unread={unread} />
      <main className="mx-auto w-full max-w-2xl px-4 pb-28 md:px-8 md:pb-12 md:pt-6">
        <TopBar unread={unread} />
        {children}
      </main>
    </div>
  );
}
