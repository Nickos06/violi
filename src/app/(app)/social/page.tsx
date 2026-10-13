import Link from "next/link";
import { getT, requireUser } from "@/lib/auth";
import { feed, leaderboard, searchUsers } from "@/lib/social";
import { relationSets } from "@/lib/social";
import { levelFromXp, rankForLevel } from "@/lib/levels";
import { Avatar, Card, cn, Empty, fmt } from "@/components/ui";
import { PostCard } from "@/components/post-card";
import { Composer } from "@/components/composer";
import { FollowButton } from "@/components/follow-button";
import { UserSearch } from "@/components/user-search";

export const metadata = { title: "Social" };

type Tab = "feed" | "discover" | "leaderboard" | "people";

export default async function SocialPage({ searchParams }: { searchParams: Promise<{ tab?: string; scope?: string; m?: string; q?: string }> }) {
  const user = await requireUser();
  const { t } = await getT();
  const sp = await searchParams;
  const tab: Tab = (["feed", "discover", "leaderboard", "people"] as const).includes(sp.tab as Tab) ? (sp.tab as Tab) : "feed";

  const tabs: { k: Tab; l: string }[] = [
    { k: "feed", l: t.social.feed },
    { k: "discover", l: t.social.discover },
    { k: "leaderboard", l: t.social.leaderboard },
    { k: "people", l: t.social.findFriends },
  ];

  return (
    <div className="animate-rise">
      <h1 className="pb-3 pt-4 text-[28px] font-bold tracking-tight">{t.social.title}</h1>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {tabs.map((x) => (
          <Link key={x.k} href={`/social?tab=${x.k}`} className={cn("h-9 shrink-0 rounded-full px-4 text-[13px] font-semibold leading-9 transition", tab === x.k ? "bg-text text-bg" : "bg-surface-2 text-muted hover:text-text")}>
            {x.l}
          </Link>
        ))}
      </div>

      <div className="mt-4">
        {tab === "feed" && <FeedTab userId={user.id} name={user.name} color={user.avatarColor} url={user.avatarUrl} visibility={user.defaultVisibility} mode="following" />}
        {tab === "discover" && <FeedTab userId={user.id} mode="discover" />}
        {tab === "leaderboard" && <Leaderboard userId={user.id} scope={sp.scope === "global" ? "global" : "friends"} metric={(["week", "xp", "streak", "minutes"] as const).find((m) => m === sp.m) ?? "week"} />}
        {tab === "people" && <People userId={user.id} q={sp.q ?? ""} />}
      </div>
    </div>
  );
}

async function FeedTab({ userId, mode, name, color, url, visibility }: { userId: string; mode: "following" | "discover"; name?: string; color?: string; url?: string | null; visibility?: string }) {
  const { t } = await getT();
  const posts = await feed(userId, mode);
  return (
    <div className="space-y-3">
      {mode === "following" && name && <Composer name={name} color={color!} url={url ?? null} defaultVisibility={visibility!} />}
      {posts.length === 0 ? (
        <Empty icon="👋" title={t.social.noPosts}>
          <Link href="/social?tab=people" className="mt-2 text-[14px] font-semibold text-accent">{t.social.findFriends} →</Link>
        </Empty>
      ) : (
        posts.map((p) => <PostCard key={p.id} post={p} />)
      )}
    </div>
  );
}

async function Leaderboard({ userId, scope, metric }: { userId: string; scope: "friends" | "global"; metric: "week" | "xp" | "streak" | "minutes" }) {
  const { t } = await getT();
  const rows = await leaderboard(userId, scope, metric);
  const metrics = [
    { k: "week", l: t.social.weekly, u: "XP" },
    { k: "xp", l: t.social.allTime, u: "XP" },
    { k: "streak", l: t.social.streaks, u: "🔥" },
    { k: "minutes", l: t.social.workoutsMinutes, u: t.common.min },
  ] as const;
  const unit = metrics.find((m) => m.k === metric)!.u;
  const podium = rows.slice(0, 3);
  const medal = ["🥇", "🥈", "🥉"];
  return (
    <>
      <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
        {(["friends", "global"] as const).map((s) => (
          <Link key={s} href={`/social?tab=leaderboard&scope=${s}&m=${metric}`} className={cn("flex-1 rounded-lg py-1.5 text-center text-[13px] font-semibold", scope === s ? "bg-surface shadow" : "text-muted")}>
            {s === "friends" ? `👥 ${t.social.friends}` : "🌍 Global"}
          </Link>
        ))}
      </div>
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
        {metrics.map((m) => (
          <Link key={m.k} href={`/social?tab=leaderboard&scope=${scope}&m=${m.k}`} className={cn("h-8 shrink-0 rounded-full border px-3 text-[12px] font-semibold leading-[30px]", metric === m.k ? "border-accent bg-accent-soft text-accent" : "border-border text-muted")}>
            {m.l}
          </Link>
        ))}
      </div>

      {podium.length > 0 && (
        <div className="mt-5 grid grid-cols-3 items-end gap-2">
          {[podium[1], podium[0], podium[2]].map((u, i) =>
            u ? (
              <Link key={u.id} href={`/u/${u.username}`} className={cn("card flex flex-col items-center px-2 pb-4 text-center", i === 1 ? "pt-6" : "pt-4")}>
                <div className="relative">
                  <Avatar name={u.name} color={u.avatarColor} url={u.avatarUrl} size={i === 1 ? 64 : 52} />
                  <span className="absolute -bottom-1 -right-1 text-xl">{medal[i === 1 ? 0 : i === 0 ? 1 : 2]}</span>
                </div>
                <div className="mt-2 w-full truncate text-[13px] font-semibold">{u.me ? t.social.you : u.name.split(" ")[0]}</div>
                <div className="tabular text-[15px] font-bold" style={{ color: rankForLevel(u.level).color }}>{fmt(u.value)} <span className="text-[11px] text-muted">{unit}</span></div>
              </Link>
            ) : <div key={i} />,
          )}
        </div>
      )}

      <Card className="mt-3 divide-y divide-border overflow-hidden">
        {rows.slice(3).map((u, i) => (
          <Link key={u.id} href={`/u/${u.username}`} className={cn("flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2", u.me && "bg-accent-soft")}>
            <span className="tabular w-6 text-center text-[13px] font-semibold text-muted">{i + 4}</span>
            <Avatar name={u.name} color={u.avatarColor} url={u.avatarUrl} size={36} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-semibold">{u.me ? `${u.name} (${t.social.you})` : u.name}</div>
              <div className="text-[12px] text-muted">Lv {u.level}</div>
            </div>
            <span className="tabular text-[14px] font-bold">{fmt(u.value)} <span className="text-[11px] font-normal text-muted">{unit}</span></span>
          </Link>
        ))}
        {rows.length <= 1 && scope === "friends" && (
          <Link href="/social?tab=people" className="block px-4 py-4 text-center text-[14px] font-semibold text-accent">{t.social.findFriends} →</Link>
        )}
      </Card>
    </>
  );
}

async function People({ userId, q }: { userId: string; q: string }) {
  const { t } = await getT();
  const [users, rel] = await Promise.all([searchUsers(userId, q), relationSets(userId)]);
  return (
    <>
      <UserSearch initial={q} placeholder={t.social.searchUsers} />
      <Card className="mt-3 divide-y divide-border overflow-hidden">
        {users.length === 0 && <p className="px-4 py-6 text-center text-[14px] text-faint">—</p>}
        {users.map((u) => {
          const lv = levelFromXp(u.xp).level;
          return (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3">
              <Link href={`/u/${u.username}`}><Avatar name={u.name} color={u.avatarColor} url={u.avatarUrl} size={42} /></Link>
              <Link href={`/u/${u.username}`} className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold">{u.name}</div>
                <div className="truncate text-[12px] text-muted">@{u.username} · Lv {lv}</div>
              </Link>
              <FollowButton userId={u.id} following={rel.following.has(u.id)} />
            </div>
          );
        })}
      </Card>
    </>
  );
}
