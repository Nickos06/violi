"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { MessageCircle, MoreHorizontal, Trash2, Globe, Users, Lock } from "lucide-react";
import { addComment, deleteComment, deletePost, react } from "@/app/actions/social";
import type { PostView } from "@/lib/social";
import { WORKOUT_ICON, formatDuration } from "@/lib/workouts";
import { useT } from "./i18n-provider";
import { Avatar, cn, fmt } from "./ui";

function timeAgo(iso: string, locale: string) {
  const s = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 1000));
  const rtf = new Intl.RelativeTimeFormat(locale === "el" ? "el" : "en", { numeric: "auto", style: "short" });
  if (s < 60) return rtf.format(-s, "second");
  if (s < 3600) return rtf.format(-Math.round(s / 60), "minute");
  if (s < 86400) return rtf.format(-Math.round(s / 3600), "hour");
  if (s < 604800) return rtf.format(-Math.round(s / 86400), "day");
  return new Date(iso).toLocaleDateString(locale === "el" ? "el-GR" : "en-GB", { day: "numeric", month: "short" });
}

export function PostCard({ post, onDeleted }: { post: PostView; onDeleted?: () => void }) {
  const { t, locale } = useT();
  const [, start] = useTransition();
  const [deleted, setDeleted] = useState(false);
  const [menu, setMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(post.comments);
  const [draft, setDraft] = useState("");
  const [r, setR] = useOptimistic(
    { w: post.w, l: post.l, mine: post.myReaction },
    (s, kind: "W" | "L") => {
      const next = { ...s };
      if (s.mine === kind) { next.mine = null; if (kind === "W") next.w--; else next.l--; return next; }
      if (s.mine === "W") next.w--;
      if (s.mine === "L") next.l--;
      next.mine = kind;
      if (kind === "W") next.w++; else next.l++;
      return next;
    },
  );
  const [bump, setBump] = useState<"W" | "L" | null>(null);

  if (deleted) return null;
  const p = post.payload as Record<string, never>;
  const VisIcon = post.visibility === "public" ? Globe : post.visibility === "friends" ? Users : Lock;

  const doReact = (kind: "W" | "L") => {
    setBump(kind);
    setTimeout(() => setBump(null), 300);
    start(async () => { setR(kind); await react(post.id, kind); });
  };

  return (
    <article className="card animate-rise overflow-hidden">
      <header className="flex items-center gap-3 px-4 pt-4">
        <Link href={`/u/${post.author.username}`}><Avatar name={post.author.name} color={post.author.avatarColor} url={post.author.avatarUrl} size={40} /></Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[14px]">
            <Link href={`/u/${post.author.username}`} className="truncate font-semibold hover:underline">{post.author.name}</Link>
            <span className="rounded-md bg-surface-2 px-1.5 text-[10px] font-bold text-muted">Lv {post.author.level}</span>
          </div>
          <div className="flex items-center gap-1 text-[12px] text-muted">
            {timeAgo(post.createdAt, locale)} · <VisIcon className="size-3" />
          </div>
        </div>
        {post.mine && (
          <div className="relative">
            <button onClick={() => setMenu(!menu)} className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface-2" aria-label="More"><MoreHorizontal className="size-4" /></button>
            {menu && (
              <div className="absolute right-0 top-9 z-10 w-48 rounded-xl border border-border bg-surface p-1 shadow-xl">
                <button onClick={() => start(async () => { await deletePost(post.id); setDeleted(true); onDeleted?.(); })} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-bad hover:bg-surface-2">
                  <Trash2 className="size-4" /> {t.social.deletePost}
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      <div className="px-4 pt-3">
        {post.type === "meal" && (
          <p className="text-[13px] text-muted">🍽️ {t.social.ateMeal} <span className="font-semibold text-text">{t.meals[(p.meal as keyof typeof t.meals) ?? "lunch"]}</span></p>
        )}
        {post.type === "workout" && (
          <p className="text-[13px] text-muted">{WORKOUT_ICON[p.type as string] ?? "💪"} {t.social.didWorkout}</p>
        )}
        {post.type === "achievement" && p.kind === "level" && (
          <div className="flex items-center gap-3 rounded-2xl bg-accent-soft p-4">
            <div className="text-3xl">🏆</div>
            <div className="text-[15px]"><span className="font-semibold">{post.author.name}</span> {t.social.reachedLevel} <span className="font-bold text-accent">{p.level as number}</span></div>
          </div>
        )}
        {post.type === "progress" && (
          <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-4">
            <div className="text-3xl">📈</div>
            <div>
              <div className="tabular text-xl font-bold" style={{ color: "var(--good)" }}>{(p.change30 as number) > 0 ? "+" : ""}{fmt(p.change30 as number, 1)} kg</div>
              <div className="text-[12px] text-muted">30 {locale === "el" ? "ημέρες" : "days"} · 🔥 {p.streak as number}</div>
            </div>
          </div>
        )}
        {post.text && <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{post.text}</p>}
      </div>

      {post.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.photoUrl} alt="" className="mt-3 max-h-[480px] w-full object-cover" loading="lazy" />
      )}

      {post.type === "meal" && (
        <div className="mx-4 mt-3 rounded-2xl bg-surface-2 p-3">
          <div className="grid grid-cols-4 text-center">
            {[
              { l: "kcal", v: p.kcal as number, c: "var(--text)" },
              { l: "P", v: p.protein as number, c: "var(--protein)" },
              { l: "C", v: p.carbs as number, c: "var(--carbs)" },
              { l: "F", v: p.fat as number, c: "var(--fat)" },
            ].map((m) => (
              <div key={m.l}><div className="tabular font-bold" style={{ color: m.c }}>{fmt(m.v)}</div><div className="text-[11px] text-muted">{m.l}</div></div>
            ))}
          </div>
          {Array.isArray(p.items) && (
            <ul className="mt-2 space-y-0.5 border-t border-border pt-2 text-[12px] text-muted">
              {(p.items as { name: string; kcal: number }[]).slice(0, 6).map((it, i) => (
                <li key={i} className="flex justify-between gap-3"><span className="truncate">{it.name}</span><span className="tabular">{it.kcal}</span></li>
              ))}
            </ul>
          )}
        </div>
      )}

      {post.type === "workout" && (
        <div className="mx-4 mt-3 rounded-2xl bg-surface-2 p-3">
          <div className="text-[15px] font-semibold">{p.name as string}</div>
          <div className="mt-2 grid grid-cols-3 text-center">
            <div><div className="tabular font-bold">{formatDuration(p.durationSec as number)}</div><div className="text-[11px] text-muted">{t.workouts.duration.split(" ")[0]}</div></div>
            <div><div className="tabular font-bold">{p.distanceM ? ((p.distanceM as number) / 1000).toFixed(1) : "—"}</div><div className="text-[11px] text-muted">km</div></div>
            <div><div className="tabular font-bold text-good">{fmt(p.kcal as number)}</div><div className="text-[11px] text-muted">kcal</div></div>
          </div>
        </div>
      )}

      <footer className="mt-3 flex items-center gap-2 border-t border-border px-3 py-2">
        <button onClick={() => doReact("W")} className={cn("flex h-9 items-center gap-1.5 rounded-full px-3 text-[14px] font-bold transition", r.mine === "W" ? "bg-good/15 text-good" : "text-muted hover:bg-surface-2")}>
          <span className={cn(bump === "W" && "animate-pop")}>W</span> <span className="tabular text-[13px]">{r.w || ""}</span>
        </button>
        <button onClick={() => doReact("L")} className={cn("flex h-9 items-center gap-1.5 rounded-full px-3 text-[14px] font-bold transition", r.mine === "L" ? "bg-bad/15 text-bad" : "text-muted hover:bg-surface-2")}>
          <span className={cn(bump === "L" && "animate-pop")}>L</span> <span className="tabular text-[13px]">{r.l || ""}</span>
        </button>
        <button onClick={() => setShowComments(!showComments)} className="ml-auto flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-muted hover:bg-surface-2">
          <MessageCircle className="size-4" /> {comments.length || ""}
        </button>
      </footer>

      {showComments && (
        <div className="space-y-3 border-t border-border px-4 py-3">
          {comments.map((c) => (
            <div key={c.id} className="group flex gap-2.5">
              <Avatar name={c.user.name} color={c.user.avatarColor} url={c.user.avatarUrl} size={28} />
              <div className="min-w-0 flex-1 rounded-2xl bg-surface-2 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/u/${c.user.username}`} className="text-[13px] font-semibold">{c.user.name}</Link>
                  <span className="text-[11px] text-faint">{timeAgo(c.createdAt, locale)}</span>
                </div>
                <p className="whitespace-pre-wrap text-[14px]">{c.text}</p>
              </div>
              {(c.mine || post.mine) && (
                <button onClick={() => start(async () => { await deleteComment(c.id); setComments((x) => x.filter((y) => y.id !== c.id)); })} className="self-center text-faint opacity-0 transition group-hover:opacity-100 hover:text-bad" aria-label={t.common.delete}>
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          ))}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const text = draft.trim();
              if (!text) return;
              setDraft("");
              start(async () => { const c = await addComment(post.id, text); if (c) setComments((x) => [...x, c]); });
            }}
          >
            <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={500} placeholder={t.social.writeComment} className="h-10 flex-1 rounded-full bg-surface-2 px-4 text-[14px] outline-none focus:ring-2 focus:ring-accent" />
            <button type="submit" disabled={!draft.trim()} className="h-10 rounded-full bg-accent px-4 text-[13px] font-semibold text-accent-fg disabled:opacity-40">↑</button>
          </form>
        </div>
      )}
    </article>
  );
}
