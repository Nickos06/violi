import Link from "next/link";
import { BellOff } from "lucide-react";
import { getT, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Avatar, Card, cn, Empty, PageHeader } from "@/components/ui";
import { MarkRead } from "@/components/mark-read";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const { t, locale } = await getT();
  const items = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: { actor: { select: { name: true, username: true, avatarColor: true, avatarUrl: true } } },
  });
  const verb = (type: string) =>
    type === "W" ? t.notifications.gaveW : type === "L" ? t.notifications.gaveL : type === "comment" ? t.notifications.commented : t.notifications.followed;

  return (
    <div className="animate-rise">
      <PageHeader title={t.notifications.title} />
      <MarkRead hasUnread={items.some((i) => !i.read)} />
      {items.length === 0 ? (
        <Card><Empty icon={<BellOff className="size-6" />} title={t.notifications.none} /></Card>
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {items.map((n) => (
            <Link
              key={n.id}
              href={n.type === "follow" ? `/u/${n.actor.username}` : `/u/${user.username}`}
              className={cn("flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2", !n.read && "bg-accent-soft")}
            >
              <Avatar name={n.actor.name} color={n.actor.avatarColor} url={n.actor.avatarUrl} size={40} />
              <div className="min-w-0 flex-1 text-[14px]">
                <span className="font-semibold">{n.actor.name}</span> {verb(n.type)}
                {n.text && <p className="truncate text-[13px] text-muted">“{n.text}”</p>}
                <div className="text-[12px] text-faint">{n.createdAt.toLocaleString(locale === "el" ? "el-GR" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
              </div>
              {(n.type === "W" || n.type === "L") && (
                <span className={cn("grid size-9 place-items-center rounded-full text-[14px] font-black", n.type === "W" ? "bg-good/15 text-good" : "bg-bad/15 text-bad")}>{n.type}</span>
              )}
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
