"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, Gauge, Loader2, Map as MapIcon, MapPinOff, Pause, Play, Settings2, Square, X } from "lucide-react";
import { saveRecorded } from "@/app/actions/workouts";
import { useT } from "@/components/i18n-provider";
import { Sheet } from "@/components/sheet";
import { Button, cn, Field, Input, Textarea } from "@/components/ui";
import { WorkoutIcon } from "@/components/icons";
import { VisibilityPicker } from "@/components/meal-section";
import { PhotoPicker, type PickedPhoto } from "@/components/photo-picker";
import { RouteMap } from "@/components/activity/route-map";
import { EffortSlider, SportPicker } from "@/components/activity/sport-picker";
import { SwitchRow } from "@/components/activity/switch-row";
import { uploadImage } from "@/lib/image-client";
import {
  addFix, DEFAULT_PREFS, loadPrefs, loadRecording, MAX_ACCURACY, movingMs, pause, resume, savePrefs, saveRecording, startRecording, summary,
  type RecPrefs, type RecState,
} from "@/lib/recorder";
import { autoTitle, clock, estimateKcal, isSport, km, SPORT, sportName, speedOf, type Sport } from "@/lib/sports";
import type { Route } from "@/lib/route";

type Phase = "setup" | "countdown" | "live" | "save";
type Gps = { state: "off" | "searching" | "fix" | "denied" | "unavailable"; acc?: number };

export function RecordClient({ weightKg, recent, initialSport, canShare, defaultVisibility }: {
  weightKg: number; recent: string[]; initialSport?: string; canShare: boolean; defaultVisibility: string;
}) {
  const { t, locale } = useT();
  const router = useRouter();
  const [sport, setSport] = useState<Sport>(isSport(initialSport) ? initialSport : (recent.find(isSport) as Sport | undefined) ?? "run");
  const [phase, setPhase] = useState<Phase>("setup");
  const [rec, setRecState] = useState<RecState | null>(null);
  const recRef = useRef<RecState | null>(null);
  const [prefs, setPrefsState] = useState<RecPrefs>(DEFAULT_PREFS);
  const prefsRef = useRef(prefs);
  const [gps, setGps] = useState<Gps>({ state: "off" });
  const [here, setHere] = useState<[number, number] | null>(null);
  const [now, setNow] = useState(0);
  const [view, setView] = useState<"stats" | "map">("stats");
  const [picking, setPicking] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [count, setCount] = useState(3);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const lastPersist = useRef(0);

  const say = useCallback((text: string) => {
    if (!prefsRef.current.audio || typeof speechSynthesis === "undefined") return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = locale === "el" ? "el-GR" : "en-GB";
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch {}
  }, [locale]);

  const setRec = useCallback((s: RecState | null, persist = false) => {
    recRef.current = s;
    setRecState(s);
    if (persist || !s || Date.now() - lastPersist.current > 4000) { saveRecording(s); lastPersist.current = Date.now(); }
  }, []);

  // Restore preferences and any unfinished recording (reload, crash, closed tab).
  useEffect(() => {
    const p = loadPrefs();
    prefsRef.current = p;
    setPrefsState(p);
    setNow(Date.now());
    const s = loadRecording();
    if (s) { setSport(s.sport); setRec(s); setPhase("live"); }
    const persist = () => saveRecording(recRef.current);
    window.addEventListener("pagehide", persist);
    return () => window.removeEventListener("pagehide", persist);
  }, [setRec]);

  const updatePrefs = (p: Partial<RecPrefs>) => {
    const next = { ...prefsRef.current, ...p };
    prefsRef.current = next;
    setPrefsState(next);
    savePrefs(next);
  };

  // GPS: watch while setting up (to get a lock early) and while recording a GPS sport.
  const wantGps = SPORT[sport].gps && phase !== "save";
  useEffect(() => {
    if (!wantGps) { setGps({ state: "off" }); return; }
    if (!("geolocation" in navigator)) { setGps({ state: "unavailable" }); return; }
    setGps((g) => (g.state === "fix" ? g : { state: "searching" }));
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const c = pos.coords;
        const t = Date.now();
        setHere([c.latitude, c.longitude]);
        setGps({ state: "fix", acc: c.accuracy });
        const s = recRef.current;
        if (!s || s.status === "paused") return;
        const { state, split } = addFix(s, { lat: c.latitude, lng: c.longitude, acc: c.accuracy, alt: c.altitude, speed: c.speed, t }, prefsRef.current);
        if (state === s) return;
        setRec(state, !!split || state.status !== s.status);
        if (state.status !== s.status) say(state.status === "autopaused" ? cue(locale).autopaused : cue(locale).resumed);
        if (split) say(splitCue(locale, state.sport, split.km, movingMs(state, t) / 1000, split.sec));
      },
      (err) => setGps({ state: err.code === err.PERMISSION_DENIED ? "denied" : "searching" }),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [wantGps, setRec, say, locale]);

  // Clock
  useEffect(() => {
    if (phase !== "live" && phase !== "countdown") return;
    const i = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(i);
  }, [phase]);

  // Keep the screen on while recording (the browser suspends GPS when the phone locks).
  useEffect(() => {
    if (phase !== "live" || !prefs.keepAwake || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null, dead = false;
    const req = async () => { try { lock = await navigator.wakeLock.request("screen"); } catch {} };
    void req();
    const onVis = () => { if (document.visibilityState === "visible" && !dead) void req(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { dead = true; document.removeEventListener("visibilitychange", onVis); lock?.release().catch(() => {}); };
  }, [phase, prefs.keepAwake]);

  const begin = useCallback(() => {
    setRec(startRecording(sport), true);
    setFinishedAt(null);
    setPhase("live");
    setNow(Date.now());
    say(cue(locale).started);
  }, [sport, setRec, say, locale]);

  // 3-2-1 countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    if (count === 0) { begin(); return; }
    const id = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, count, begin]);

  const onStart = () => {
    if (prefs.countdown) { setCount(3); setPhase("countdown"); } else begin();
  };
  const onPause = () => { if (recRef.current) { setRec(pause(recRef.current), true); say(cue(locale).paused); } };
  const onResume = () => { if (recRef.current) { setRec(resume(recRef.current), true); setPhase("live"); setFinishedAt(null); say(cue(locale).resumed); } };
  const onFinish = () => {
    if (!recRef.current) return;
    const at = Date.now();
    setRec(pause(recRef.current, at), true);
    setFinishedAt(at);
    setPhase("save");
  };

  if (phase === "save" && rec) {
    return (
      <SaveScreen
        rec={rec} finishedAt={finishedAt ?? Date.now()} weightKg={weightKg} recent={recent} canShare={canShare} defaultVisibility={defaultVisibility}
        onResume={onResume}
        onDiscard={() => { setRec(null, true); router.replace("/workouts"); }}
        onSaved={(id) => { setRec(null, true); router.replace(`/workouts/${id}`); router.refresh(); }}
      />
    );
  }

  const gpsSport = SPORT[sport].gps;
  const live = phase === "live" && rec;

  return (
    <div className="fixed inset-0 flex flex-col bg-bg text-text">
      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between gap-2 px-3 pb-2 pt-[max(env(safe-area-inset-top,0px),10px)]">
        {live ? (
          <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
            {(["stats", "map"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} disabled={v === "map" && !gpsSport}
                className={cn("press flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-bold disabled:opacity-30", view === v ? "bg-surface text-text shadow" : "text-muted")}>
                {v === "map" ? <MapIcon className="size-4" /> : <Gauge className="size-4" />}{v === "map" ? t.record.map : t.record.stats}
              </button>
            ))}
          </div>
        ) : (
          <Link href="/workouts" className="press grid size-10 place-items-center rounded-full bg-surface-2" aria-label={t.common.cancel}><X className="size-5" /></Link>
        )}
        {!live && <h1 className="font-display text-[17px] font-bold">{t.record.title}</h1>}
        <button onClick={() => setSettingsOpen(true)} className="press grid size-10 place-items-center rounded-full bg-surface-2" aria-label={t.record.settings}>
          <Settings2 className="size-5" />
        </button>
      </header>

      {/* Body */}
      <div className="relative min-h-0 flex-1">
        {live ? (
          view === "map" && gpsSport ? (
            <>
              <RouteMap route={{ pts: rec.pts, breaks: rec.breaks }} current={here} follow className="absolute inset-0" recenterLabel={t.record.recenter} />
              <div className="absolute inset-x-3 bottom-3 z-[500]">
                <StatusPill rec={rec} gps={gps} />
                <div className="card mt-2 grid grid-cols-3 divide-x divide-border py-3 text-center">
                  <Stat label={t.record.time} value={clock(movingMs(rec, now) / 1000)} />
                  <Stat label={`${t.record.distance}`} value={km(rec.distM)} unit="km" />
                  <AvgStat rec={rec} now={now} />
                </div>
              </div>
            </>
          ) : (
            <LiveStats rec={rec} now={now} gps={gps} weightKg={weightKg} />
          )
        ) : gpsSport ? (
          <>
            <RouteMap route={null} current={here} follow className="absolute inset-0" recenterLabel={t.record.recenter} />
            <div className="pointer-events-none absolute inset-x-0 top-3 z-[500] flex justify-center"><GpsPill gps={gps} /></div>
          </>
        ) : (
          <div className="grid h-full place-items-center px-8 text-center">
            <div>
              <div className="edge-strong mx-auto grid size-28 place-items-center rounded-full"><WorkoutIcon type={sport} className="size-11" /></div>
              <p className="mt-5 text-[14px] font-semibold text-muted">{t.record.indoor}</p>
            </div>
          </div>
        )}

        {phase === "countdown" && (
          <div className="absolute inset-0 z-[600] grid place-items-center bg-bg/80 backdrop-blur-md">
            <span key={count} className="countdown-num tabular font-display text-[140px] font-semibold leading-none">{count || ""}</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <footer className="relative z-10 border-t border-border bg-surface px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-4">
        {!live ? (
          <div className="flex items-center gap-4">
            <button onClick={() => setPicking(true)} disabled={phase === "countdown"} className="press edge flex h-14 min-w-0 flex-1 items-center gap-3 rounded-2xl px-4 text-left">
              <WorkoutIcon type={sport} className="size-5 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-[15px] font-bold">{sportName(sport, locale)}</span>
              <ChevronDown className="size-4 shrink-0 text-muted" />
            </button>
            <button
              onClick={phase === "countdown" ? () => setPhase("setup") : onStart}
              className="press varnish grid size-[76px] shrink-0 place-items-center rounded-full text-[15px] font-black uppercase tracking-wide shadow-xl"
              aria-label={t.record.start}
            >
              {phase === "countdown" ? <X className="size-7" /> : t.record.start}
            </button>
          </div>
        ) : rec.status === "paused" ? (
          <div className="flex items-center justify-center gap-6">
            <RoundButton onClick={onResume} label={t.record.resume} primary><Play className="size-7 translate-x-0.5" fill="currentColor" /></RoundButton>
            <RoundButton onClick={onFinish} label={t.record.finish}><Square className="size-6" fill="currentColor" /></RoundButton>
          </div>
        ) : (
          <div className="flex justify-center">
            <RoundButton onClick={onPause} label={t.record.pause} primary><Pause className="size-7" fill="currentColor" /></RoundButton>
          </div>
        )}
        {!live && gpsSport && (gps.state === "denied" || gps.state === "unavailable") && (
          <p className="mt-3 flex items-start gap-2 text-[12.5px] font-semibold text-bad"><MapPinOff className="mt-0.5 size-4 shrink-0" />{gps.state === "denied" ? t.record.gpsDenied : t.record.gpsUnavailable}</p>
        )}
        {!live && gpsSport && gps.state !== "denied" && gps.state !== "unavailable" && <p className="mt-3 text-center text-[12px] font-medium text-faint">{t.record.gpsTip}</p>}
      </footer>

      <SportPicker open={picking} onClose={() => setPicking(false)} value={sport} onPick={setSport} recent={recent} />

      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title={t.record.settings}>
        <div className="divide-y divide-border">
          <SwitchRow label={t.record.autoPause} desc={t.record.autoPauseD} checked={prefs.autoPause} onChange={(v) => updatePrefs({ autoPause: v })} />
          <SwitchRow label={t.record.audio} desc={t.record.audioD} checked={prefs.audio} onChange={(v) => updatePrefs({ audio: v })} />
          <SwitchRow label={t.record.countdown} desc={t.record.countdownD} checked={prefs.countdown} onChange={(v) => updatePrefs({ countdown: v })} />
          <SwitchRow label={t.record.keepAwake} desc={t.record.keepAwakeD} checked={prefs.keepAwake} onChange={(v) => updatePrefs({ keepAwake: v })} />
        </div>
      </Sheet>
    </div>
  );
}

// ── Live pieces ─────────────────────────────────────────────────────────────

function LiveStats({ rec, now, gps, weightKg }: { rec: RecState; now: number; gps: Gps; weightKg: number }) {
  const { t } = useT();
  const sport = SPORT[rec.sport];
  const mv = movingMs(rec, now) / 1000;
  const speedSport = sport.metric === "speed" || sport.metric === "none";
  const cur = currentSpeed(rec, now);
  const lastSplit = rec.splits.at(-1);
  return (
    <div className="flex h-full flex-col overflow-y-auto px-5 pb-4">
      <div className="flex justify-center pt-1"><StatusPill rec={rec} gps={gps} /></div>
      <div className="flex flex-1 flex-col justify-center py-4">
        <div className="text-center">
          <div className="text-[11px] font-black uppercase tracking-[0.14em] text-faint">{t.record.time}</div>
          <div className={cn("tabular font-display text-[clamp(64px,22vw,112px)] font-semibold leading-none tracking-tight transition-opacity", rec.status !== "recording" && "opacity-40")}>{clock(mv)}</div>
        </div>
        {sport.gps ? (
          <div className="mt-8 grid grid-cols-2 gap-y-7">
            <Big label={t.record.distance} value={km(rec.distM)} unit="km" />
            <Big label={speedSport ? t.record.avgSpeed : t.record.avgPace} {...splitUnit(speedOf(rec.sport, rec.distM, mv))} />
            <Big label={speedSport ? t.record.speed : t.record.pace} {...splitUnit(rec.status === "recording" && cur ? speedOf(rec.sport, cur.d, cur.s) : speedOf(rec.sport, 0, 0))} />
            <Big label={t.record.elevation} value={String(Math.round(rec.gain))} unit="m" />
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-y-7">
            <Big label={t.record.elapsed} value={clock((now - rec.startedAt) / 1000)} />
            <Big label={t.record.calories} value={String(estimateKcal(rec.sport, mv, weightKg))} unit="kcal" />
          </div>
        )}
      </div>
      {lastSplit && (
        <div className="card flex items-center justify-between px-4 py-3 text-[13px] font-bold">
          <span className="text-muted">{t.record.km} {rec.splits.length}</span>
          <span className="tabular">{speedSport ? `${((1000 / lastSplit.sec) * 3.6).toFixed(1)} km/h` : `${clock(lastSplit.sec)} /km`}</span>
          <span className="tabular text-muted">{lastSplit.elev >= 0 ? "+" : ""}{lastSplit.elev} m</span>
        </div>
      )}
      <span className="sr-only" aria-live="polite">{rec.status === "autopaused" ? t.record.autopaused : rec.status === "paused" ? t.record.paused : ""}</span>
    </div>
  );
}

/** Speed over roughly the last 20 s of route (current pace), or null when standing still. */
function currentSpeed(rec: RecState, now: number) {
  const pts = rec.pts;
  if (pts.length < 2) return null;
  const last = pts.at(-1)!;
  const tNow = (now - rec.startedAt) / 1000;
  if (tNow - last[3] > 15) return null;
  let i = pts.length - 1;
  while (i > 0 && last[3] - pts[i - 1][3] <= 20) i--;
  const a = pts[i];
  const d = last[4] - a[4], s = last[3] - a[3];
  return s > 2 && d > 0 ? { d, s } : null;
}

const splitUnit = (x: { v: string; unit: string }) => ({ value: x.v, unit: x.unit });

function Big({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="text-center">
      <div className="text-[11px] font-black uppercase tracking-[0.14em] text-faint">{label}</div>
      <div className="mt-1 tabular font-display text-[40px] font-semibold leading-none">
        {value}{unit && <span className="ml-1 text-[14px] font-bold text-muted">{unit}</span>}
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <div className="tabular text-[22px] font-extrabold leading-none">{value}{unit && <span className="ml-0.5 text-[11px] font-bold text-muted">{unit}</span>}</div>
      <div className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.1em] text-faint">{label}</div>
    </div>
  );
}

function AvgStat({ rec, now }: { rec: RecState; now: number }) {
  const { t } = useT();
  const m = SPORT[rec.sport].metric;
  const x = speedOf(rec.sport, rec.distM, movingMs(rec, now) / 1000);
  return <Stat label={m === "speed" || m === "none" ? t.record.avgSpeed : t.record.avgPace} value={x.v} unit={x.unit} />;
}

function StatusPill({ rec, gps }: { rec: RecState; gps: Gps }) {
  const { t } = useT();
  if (rec.status === "recording") return SPORT[rec.sport].gps ? <GpsPill gps={gps} /> : null;
  return (
    <span className="varnish inline-flex h-8 items-center gap-2 rounded-full px-3.5 text-[12.5px] font-extrabold uppercase tracking-wide">
      <span className="size-2 animate-pulse rounded-full bg-current" />
      {rec.status === "autopaused" ? t.record.autopaused : t.record.paused}
    </span>
  );
}

function GpsPill({ gps }: { gps: Gps }) {
  const { t } = useT();
  if (gps.state === "off") return null;
  const bars = gps.state !== "fix" || gps.acc == null ? 0 : gps.acc <= 10 ? 3 : gps.acc <= 20 ? 2 : gps.acc <= MAX_ACCURACY ? 1 : 0;
  const label = gps.state === "searching" ? t.record.gpsSearching : gps.state === "fix" ? (bars >= 2 ? t.record.gpsReady : t.record.gpsWeak) : gps.state === "denied" ? t.record.gpsDenied.split(".")[0] : t.record.gpsUnavailable;
  return (
    <span className="edge inline-flex h-8 items-center gap-2 rounded-full bg-surface/90 px-3 text-[12.5px] font-bold shadow-sm backdrop-blur" role="status">
      <span className="flex items-end gap-[2px]" aria-hidden>
        {[1, 2, 3].map((b) => <span key={b} className={cn("w-[3px] rounded-full", b <= bars ? "bg-text" : "bg-surface-3", gps.state === "searching" && "animate-pulse")} style={{ height: 4 + b * 3 }} />)}
      </span>
      {label}
    </span>
  );
}

function RoundButton({ children, onClick, label, primary }: { children: React.ReactNode; onClick: () => void; label: string; primary?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button onClick={onClick} aria-label={label} className={cn("press grid size-[76px] place-items-center rounded-full shadow-xl", primary ? "varnish" : "edge-strong bg-surface")}>
        {children}
      </button>
      <span className="text-[12px] font-bold text-muted">{label}</span>
    </div>
  );
}

// ── Save ────────────────────────────────────────────────────────────────────

function SaveScreen({ rec, finishedAt, weightKg, recent, canShare, defaultVisibility, onResume, onDiscard, onSaved }: {
  rec: RecState; finishedAt: number; weightKg: number; recent: string[]; canShare: boolean; defaultVisibility: string;
  onResume: () => void; onDiscard: () => void; onSaved: (id: string) => void;
}) {
  const { t, locale } = useT();
  const sum = useMemo(() => summary(rec, finishedAt), [rec, finishedAt]);
  const [sport, setSport] = useState<Sport>(rec.sport);
  const [title, setTitle] = useState<string | null>(null);
  const [desc, setDesc] = useState("");
  const [effort, setEffort] = useState<number | null>(null);
  const [photo, setPhoto] = useState<PickedPhoto>(null);
  const [share, setShare] = useState(canShare);
  const [vis, setVis] = useState(defaultVisibility);
  const [showMap, setShowMap] = useState(true);
  const [picking, setPicking] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const name = title ?? autoTitle(sport, new Date(rec.startedAt), locale);
  const gpsSport = SPORT[sport].gps;
  const hasRoute = gpsSport && sum.route.pts.length > 1;
  const speedSport = SPORT[sport].metric === "speed" || SPORT[sport].metric === "none";
  const avg = speedOf(sport, sum.distM, sum.movingSec);
  const tooShort = sum.elapsedSec < 10;

  const save = () => start(async () => {
    setError(null);
    try {
      const photoUrl = photo ? await uploadImage(photo.blob) : null;
      const id = await saveRecorded({
        type: sport, name: name.trim() || sportName(sport, locale), description: desc.trim() || undefined, startedAt: sum.startedAt,
        elapsedSec: Math.max(1, sum.elapsedSec), movingSec: sum.movingSec, distM: gpsSport ? sum.distM : 0, elevGainM: gpsSport ? sum.elevGainM : 0,
        maxSpeed: gpsSport ? sum.maxSpeed : 0, effort: effort ?? undefined, route: gpsSport ? sum.route : { pts: [], breaks: [] }, splits: gpsSport ? sum.splits : [],
        photoUrl, share: canShare && share ? { visibility: vis, showMap } : null,
      });
      onSaved(id);
    } catch {
      setError(t.common.error);
    }
  });

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-border bg-bg/85 px-3 pb-2 pt-[max(env(safe-area-inset-top,0px),10px)] backdrop-blur-xl">
        <button onClick={onResume} className="press flex h-10 items-center gap-1 rounded-full px-2 text-[14px] font-bold"><ChevronLeft className="size-5" />{t.record.resumeRecording}</button>
        <h1 className="sr-only">{t.record.saveTitle}</h1>
      </header>
      <div className="mx-auto max-w-lg space-y-5 px-4 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] pt-4">
        <h2 className="font-display text-[26px] font-semibold">{t.record.saveTitle}</h2>

        <div className="space-y-3">
          <Input value={name} onChange={(e) => setTitle(e.target.value)} maxLength={80} aria-label={t.workouts.name} className="text-[17px] font-bold" />
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t.record.howWasIt} maxLength={2000} className="min-h-24" />
        </div>

        <button onClick={() => setPicking(true)} className="press edge flex h-14 w-full items-center gap-3 rounded-2xl px-4 text-left">
          <WorkoutIcon type={sport} className="size-5" />
          <span className="flex-1 text-[15px] font-bold">{sportName(sport, locale)}</span>
          <ChevronDown className="size-4 text-muted" />
        </button>

        {hasRoute && (
          <RouteMap route={sum.route as Route} interactive={false} className="h-48 rounded-3xl border border-border" />
        )}

        <div className="card grid grid-cols-3 gap-y-4 px-2 py-4 text-center">
          {gpsSport && <Stat label={t.record.distance} value={km(sum.distM)} unit="km" />}
          <Stat label={t.record.movingTime} value={clock(sum.movingSec)} />
          {gpsSport && <Stat label={speedSport ? t.record.avgSpeed : t.record.avgPace} value={avg.v} unit={avg.unit} />}
          {gpsSport && <Stat label={t.record.elevation} value={String(sum.elevGainM)} unit="m" />}
          <Stat label={t.record.elapsed} value={clock(sum.elapsedSec)} />
          <Stat label={t.record.calories} value={String(estimateKcal(sport, sum.movingSec, weightKg))} unit="kcal" />
        </div>

        <EffortSlider value={effort} onChange={setEffort} />

        <Field label={t.record.photo}><PhotoPicker value={photo} onChange={setPhoto} compact /></Field>

        {canShare && (
          <div className="card px-4 py-1">
            <SwitchRow label={t.record.shareToFeed} checked={share} onChange={setShare} />
            {share && (
              <div className="space-y-3 border-t border-border pb-3 pt-3">
                <VisibilityPicker value={vis} onChange={setVis} />
                {hasRoute && <SwitchRow label={t.record.showMap} desc={t.record.showMapD} checked={showMap} onChange={setShowMap} className="pb-0" />}
              </div>
            )}
          </div>
        )}

        {tooShort && <p className="text-[13px] font-semibold text-bad">{t.record.tooShort}</p>}
        {error && <p className="text-[13px] font-semibold text-bad">{error}</p>}

        <div className="flex gap-2">
          <Button variant="secondary" size="lg" className="shrink-0" onClick={() => setDiscarding(true)}>{t.record.discard}</Button>
          <Button size="lg" className="flex-1" disabled={pending || tooShort} onClick={save}>
            {pending ? <Loader2 className="size-5 animate-spin" /> : t.record.save}
          </Button>
        </div>
      </div>

      <SportPicker open={picking} onClose={() => setPicking(false)} value={sport} onPick={setSport} recent={recent} gpsOnly={SPORT[rec.sport].gps && sum.route.pts.length > 1} />

      <Sheet open={discarding} onClose={() => setDiscarding(false)} title={t.record.discard}>
        <p className="text-[15px] text-muted">{t.record.discardConfirm}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setDiscarding(false)}>{t.common.cancel}</Button>
          <Button variant="danger" onClick={onDiscard}>{t.record.discard}</Button>
        </div>
      </Sheet>
    </div>
  );
}

// ── Audio cues ──────────────────────────────────────────────────────────────

const cue = (locale: string) =>
  locale === "el"
    ? { started: "Η καταγραφή ξεκίνησε", paused: "Παύση", resumed: "Συνέχεια", autopaused: "Αυτόματη παύση" }
    : { started: "Activity started", paused: "Activity paused", resumed: "Activity resumed", autopaused: "Auto paused" };

function spoken(sec: number, el: boolean) {
  const s = Math.round(sec), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const part = (n: number, one: string, many: string) => (n ? `${n} ${n === 1 ? one : many}` : "");
  return (el
    ? [part(h, "ώρα", "ώρες"), part(m, "λεπτό", "λεπτά"), part(r, "δευτερόλεπτο", "δευτερόλεπτα")]
    : [part(h, "hour", "hours"), part(m, "minute", "minutes"), part(r, "second", "seconds")]
  ).filter(Boolean).join(" ");
}

function splitCue(locale: string, sport: Sport, kmDone: number, movingSec: number, splitSec: number) {
  const el = locale === "el";
  const speed = SPORT[sport].metric === "speed" || SPORT[sport].metric === "none";
  const dist = el ? `${kmDone} ${kmDone === 1 ? "χιλιόμετρο" : "χιλιόμετρα"}` : `${kmDone} ${kmDone === 1 ? "kilometre" : "kilometres"}`;
  const time = el ? `Χρόνος ${spoken(movingSec, el)}` : `Time ${spoken(movingSec, el)}`;
  const rate = speed
    ? (el ? `Ταχύτητα ${((1000 / splitSec) * 3.6).toFixed(1).replace(".", ",")} χιλιόμετρα την ώρα` : `Speed ${((1000 / splitSec) * 3.6).toFixed(1)} kilometres per hour`)
    : (el ? `Ρυθμός ${spoken(splitSec, el)} ανά χιλιόμετρο` : `Split pace ${spoken(splitSec, el)} per kilometre`);
  return `${dist}. ${time}. ${rate}.`;
}
