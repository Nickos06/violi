import { notFound } from "next/navigation";
import { Flame, Lock, NotebookPen } from "lucide-react";
import { getT, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { relationSets, userPosts } from "@/lib/social";
import { liveStreak } from "@/lib/gamification";
import { ACHIEVEMENT_KEYS, levelFromXp, rankForLevel, RANKS } from "@/lib/levels";
import { ACHIEVEMENT_ICON, ACHIEVEMENT_TONE } from "@/components/icons";
import { Avatar, Bar, Card, cn, Empty, fmt, LinkButton, SectionTitle } from "@/components/ui";
import { PostCard } from "@/components/post-card";
import { FollowButton } from "@/components/follow-button";
import { ShareProgressButton } from "@/components/share-progress";
import { logout } from "@/app/actions/auth";

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const viewer = await requireUser();
  const { t } = await getT();
  const { username } = await params;
  const user = await db.user.findUnique({
    where: { username: decodeURIComponent(username).toLowerCase() },
    include: { achievements: true, _count: { select: { followers: true, following: true } } },
  });
  if (!user) notFound();
  const me = user.id === viewer.id;
  const rel = await relationSets(viewer.id);
  const isFriend = rel.mutual.has(user.id);
  const visible = me || user.profilePublic || isFriend;

  const lv = levelFromXp(user.xp);
  const rank = rankForLevel(lv.level);
  const nextRank = RANKS.find((r) => r.minLevel > lv.level);
  const unlocked = new Set(user.achievements.map((a) => a.key));
  const posts = visible ? await userPosts(viewer.id, user.id) : [];

  return (
    <div className="animate-rise">
      <div className="flex flex-col items-center pt-6 text-center">
        <div className="relative">
          <div className="rounded-full p-1" style={{ background: `conic-gradient(${rank.color} ${lv.progress * 360}deg, var(--surface-3) 0)` }}>
            <div className="rounded-full bg-bg p-1"><Avatar name={user.name} color={user.avatarColor} url={user.avatarUrl} size={92} /></div>
          </div>
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-[12px] font-bold text-white shadow" style={{ background: rank.color }}>
            Lv {lv.level}
          </span>
        </div>
        <h1 className="font-display mt-5 text-[30px] font-semibold leading-tight">{user.name}</h1>
        <p className="text-[14px] text-muted">@{user.username}</p>
        {user.bio && <p className="mt-2 max-w-sm text-[14px]">{user.bio}</p>}

        <div className="mt-4 flex gap-6 text-center">
          <div><div className="tabular text-lg font-bold">{fmt(user._count.followers)}</div><div className="text-[12px] text-muted">{t.social.followers}</div></div>
          <div><div className="tabular text-lg font-bold">{fmt(user._count.following)}</div><div className="text-[12px] text-muted">{t.social.followingCount}</div></div>
          <div><div className="tabular flex items-center justify-center gap-1 text-lg font-extrabold"><Flame className="size-4" fill="currentColor" />{liveStreak(user)}</div><div className="text-[12px] font-semibold text-muted">Streak</div></div>
        </div>

        <div className="mt-5 flex w-full max-w-xs gap-2">
          {me ? (
            <>
              <LinkButton href="/settings" variant="secondary" className="flex-1">{t.profile.editProfile}</LinkButton>
              {user.shareWeight && <ShareProgressButton />}
            </>
          ) : (
            <div className="flex-1 [&>button]:w-full"><FollowButton userId={user.id} following={rel.following.has(user.id)} size="md" /></div>
          )}
        </div>
      </div>

      {!visible ? (
        <Empty icon={<Lock className="size-8 text-muted" />} title={t.social.privateProfile} />
      ) : (
        <>
          <Card className="mt-6 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: rank.color }}>{t.ranks[rank.key]}</div>
                <div className="font-display text-[26px] font-semibold">{t.profile.level} {lv.level}</div>
              </div>
              <div className="text-right">
                <div className="tabular text-[13px] font-semibold">{fmt(lv.current)} / {fmt(lv.needed)} XP</div>
                <div className="text-[12px] text-muted">{t.profile.totalXp}: {fmt(user.xp)}</div>
              </div>
            </div>
            <Bar value={lv.current} max={lv.needed} color={rank.color} className="mt-3 h-2" />
            {nextRank && <p className="mt-2 text-[12px] text-faint">→ {t.ranks[nextRank.key]} · Lv {nextRank.minLevel}</p>}
          </Card>

          <SectionTitle>{t.profile.achievements} · {unlocked.size}/{ACHIEVEMENT_KEYS.length}</SectionTitle>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {ACHIEVEMENT_KEYS.map((k) => {
              const [title, desc] = t.achievements[k];
              const has = unlocked.has(k);
              const Icon = ACHIEVEMENT_ICON[k];
              const tone = ACHIEVEMENT_TONE[k];
              return (
                <div key={k} title={desc} className={cn("card flex flex-col items-center gap-2 px-1.5 py-3.5 text-center", !has && "opacity-40")}>
                  <span
                    className={cn("grid size-11 place-items-center rounded-full", has && "edge-strong")}
                    style={has ? { color: tone, ["--edge-fill" as string]: "var(--surface-2)" } : { color: "var(--faint)", background: "var(--surface-2)" }}
                  >
                    {has ? <Icon className="size-5" strokeWidth={2.2} /> : <Lock className="size-4" />}
                  </span>
                  <span className="line-clamp-2 text-[11px] font-bold leading-tight">{title}</span>
                </div>
              );
            })}
          </div>

          <SectionTitle>{t.profile.posts}</SectionTitle>
          <div className="space-y-3">
            {posts.length === 0 ? <Card><Empty icon={<NotebookPen className="size-6" />} title={t.social.noPosts} /></Card> : posts.map((p) => <PostCard key={p.id} post={p} />)}
          </div>
        </>
      )}

      {me && (
        <form action={logout} className="mt-8 md:hidden">
          <button className="w-full rounded-xl py-3 text-[14px] font-semibold text-bad hover:bg-bad/10">{t.auth.logout}</button>
        </form>
      )}
    </div>
  );
}
