"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { Map as LMap, Polyline, CircleMarker, Marker, TileLayer } from "leaflet";
import { LocateFixed } from "lucide-react";
import { segments, type Route } from "@/lib/route";
import { cn } from "../ui";

// Monochrome basemaps (Esri Light / Dark Gray Canvas, no API key) that follow the app theme.
const tiles = (dark: boolean) => `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_${dark ? "Dark" : "Light"}_Gray_Base/MapServer/tile/{z}/{y}/{x}`;
const ATTRIBUTION = 'Tiles &copy; <a href="https://www.esri.com">Esri</a> &mdash; Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const isDark = () => document.documentElement.dataset.theme === "dark";

/**
 * Route map. `follow` keeps the current position centred (recording); otherwise it fits the whole route.
 * Dragging while following pauses the follow until the recenter button is pressed.
 */
export function RouteMap({ route, current, follow = false, interactive = true, className, recenterLabel = "Recenter" }: {
  route: Route | null; current?: [number, number] | null; follow?: boolean; interactive?: boolean; className?: string; recenterLabel?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const L = useRef<typeof import("leaflet") | null>(null);
  const map = useRef<LMap | null>(null);
  const layers = useRef<{ tile?: TileLayer; halo?: Polyline; line?: Polyline; start?: CircleMarker; end?: CircleMarker; me?: Marker }>({});
  const [ready, setReady] = useState(false);
  const [following, setFollowing] = useState(follow);

  useEffect(() => {
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    import("leaflet").then((mod) => {
      if (cancelled || !el.current || map.current) return;
      const Lf = mod.default ?? mod;
      L.current = Lf;
      const m = Lf.map(el.current, {
        zoomControl: false, attributionControl: true, dragging: interactive, scrollWheelZoom: interactive, touchZoom: interactive,
        doubleClickZoom: interactive, boxZoom: false, keyboard: false, zoomSnap: 0.25,
      }).setView([37.9838, 23.7275], 13);
      m.attributionControl.setPrefix(false);
      layers.current.tile = Lf.tileLayer(tiles(isDark()), { maxNativeZoom: 16, maxZoom: 19, attribution: ATTRIBUTION }).addTo(m);
      m.on("dragstart", () => setFollowing(false));
      map.current = m;
      // Keep tiles filling the box when the layout around the map changes size.
      ro = new ResizeObserver(() => m.invalidateSize({ animate: false }));
      ro.observe(el.current);
      setReady(true);
    });
    // Swap basemap and line colours when the theme changes.
    const obs = new MutationObserver(() => {
      layers.current.tile?.setUrl(tiles(isDark()));
      paint();
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { cancelled = true; obs.disconnect(); ro?.disconnect(); map.current?.remove(); map.current = null; layers.current = {}; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function paint() {
    const ink = isDark() ? "#fafafa" : "#0a0a0a", bg = isDark() ? "#000000" : "#ffffff";
    layers.current.halo?.setStyle({ color: bg });
    layers.current.line?.setStyle({ color: ink });
    layers.current.start?.setStyle({ color: ink, fillColor: bg });
    layers.current.end?.setStyle({ color: bg, fillColor: ink });
  }

  // Route + markers
  useEffect(() => {
    const Lf = L.current, m = map.current;
    if (!ready || !Lf || !m) return;
    const segs = route ? segments(route) : [];
    const ly = layers.current;
    if (!ly.line) {
      ly.halo = Lf.polyline([], { weight: 8, opacity: 0.7, lineCap: "round", lineJoin: "round", interactive: false }).addTo(m);
      ly.line = Lf.polyline([], { weight: 4, opacity: 1, lineCap: "round", lineJoin: "round", interactive: false }).addTo(m);
    }
    ly.halo!.setLatLngs(segs);
    ly.line!.setLatLngs(segs);
    const first = segs[0]?.[0], lastSeg = segs.at(-1), last = lastSeg?.at(-1);
    if (first) {
      ly.start ??= Lf.circleMarker(first, { radius: 6, weight: 3, fillOpacity: 1, interactive: false }).addTo(m);
      ly.start.setLatLng(first);
    }
    if (last && !follow) {
      ly.end ??= Lf.circleMarker(last, { radius: 6, weight: 3, fillOpacity: 1, interactive: false }).addTo(m);
      ly.end.setLatLng(last);
    }
    paint();
    if (!follow && segs.length) m.fitBounds(Lf.latLngBounds(segs.flat()), { padding: [28, 28], animate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, route, follow]);

  // Live position
  useEffect(() => {
    const Lf = L.current, m = map.current;
    if (!ready || !Lf || !m || !current) return;
    const ly = layers.current;
    if (!ly.me) {
      ly.me = Lf.marker(current, { icon: Lf.divIcon({ className: "map-me", html: "<span></span>", iconSize: [22, 22] }), interactive: false, keyboard: false }).addTo(m);
      m.setView(current, 16, { animate: false });
    } else ly.me.setLatLng(current);
    if (follow && following) m.panTo(current, { animate: true, duration: 0.5 });
  }, [ready, current, follow, following]);

  return (
    <div className={cn(!/\b(absolute|fixed)\b/.test(className ?? "") && "relative", "isolate overflow-hidden bg-surface-2", className)}>
      <div ref={el} className="absolute inset-0" />
      {follow && !following && current && (
        <button
          onClick={() => { setFollowing(true); map.current?.setView(current, Math.max(map.current.getZoom(), 15)); }}
          className="press edge-strong absolute right-3 top-3 z-[500] grid size-11 place-items-center rounded-full bg-surface text-text shadow-lg"
          aria-label={recenterLabel}
        >
          <LocateFixed className="size-5" />
        </button>
      )}
    </div>
  );
}
