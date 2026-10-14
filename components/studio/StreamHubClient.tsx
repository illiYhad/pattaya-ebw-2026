"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Zap } from "lucide-react";
import type { Category, Competitor, Entry, Scene } from "@/lib/types";
import { EVENTS, entryChannelName, openBus, type BugCorner, type Bus, type HudTone } from "@/lib/realtime";
import { timeRangeOf } from "@/lib/view";
import { DEFAULT_HOTKEYS, HOTKEY_ACTIONS, SCENE_ACTIONS, comboFromEvent, useStreamHubHotkeys } from "./hotkeys";
import { HotkeySettingsModal } from "./HotkeySettingsModal";
import { NetworkStat } from "./NetworkStat";

const QUICK_HUD: { text: string; tone: HudTone }[] = [
  { text: "พักการแข่งขัน", tone: "info" },
  { text: "เหลือเวลา 10 นาที", tone: "warn" },
  { text: "ปัญหาทางเทคนิค", tone: "alert" },
];
const HEARTBEAT_MS = 5000;
const BUG_CORNERS: { v: BugCorner; label: string }[] = [
  { v: "tl", label: "ซ้ายบน" },
  { v: "tr", label: "ขวาบน" },
  { v: "bl", label: "ซ้ายล่าง" },
  { v: "br", label: "ขวาล่าง" },
  { v: "hidden", label: "ซ่อน" },
];

// ห้องคุมไลฟ์: ซ้าย = ประเภท → ผู้แข่ง (1 channel ต่อรายการ) · กลาง = พรีวิว overlay จริง · ขวา = ฉาก/ป้ายชื่อ/ตรา/HUD
export function StreamHubClient({ channelKey, categories, competitors, entries }: { channelKey: string; categories: Category[]; competitors: Competitor[]; entries: Entry[] }) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const catEntries = useMemo(
    () => entries.filter((e) => e.category_id === categoryId).map((e) => ({ e, comp: competitors.find((c) => c.id === e.competitor_id) })).filter((x) => x.comp).sort((a, b) => a.comp!.code.localeCompare(b.comp!.code)),
    [entries, competitors, categoryId],
  );
  const [entryId, setEntryId] = useState(catEntries[0]?.e.id ?? "");
  const category = categories.find((c) => c.id === categoryId);
  const current = catEntries.find((x) => x.e.id === entryId);

  const [scene, setScene] = useState<Scene>("STARTING");
  const [withStinger, setWithStinger] = useState(true);
  const [lowerThird, setLowerThird] = useState(true);
  const [hudText, setHudText] = useState("");
  const [bug, setBug] = useState<BugCorner>("bl");
  const [showKeys, setShowKeys] = useState(false);
  const { hotkeys, save } = useStreamHubHotkeys(DEFAULT_HOTKEYS);
  const busRef = useRef<Bus | null>(null);

  // เปลี่ยนรายการ → เปิด channel ใหม่
  useEffect(() => {
    if (!current) return;
    setScene("STARTING");
    const bus = openBus(entryChannelName(channelKey, current.e.id));
    busRef.current = bus;
    return () => {
      bus.close();
      busRef.current = null;
    };
  }, [channelKey, current]);

  // ส่งสถานะซ้ำทุก 5 วินาที — overlay ที่เพิ่งเปิด/รีเฟรชใน OBS จะตามทัน
  useEffect(() => {
    const t = setInterval(() => {
      busRef.current?.send(EVENTS.sceneChange, { scene });
      busRef.current?.send(EVENTS.brandBug, { corner: bug });
      busRef.current?.send(EVENTS.lowerThird, { show: lowerThird });
    }, HEARTBEAT_MS);
    return () => clearInterval(t);
  }, [scene, bug, lowerThird]);

  const setBugCorner = (corner: BugCorner) => { setBug(corner); busRef.current?.send(EVENTS.brandBug, { corner }); };
  const setLT = (show: boolean) => { setLowerThird(show); busRef.current?.send(EVENTS.lowerThird, { show }); };
  const gotoScene = useCallback((next: Scene) => {
    setScene(next);
    if (withStinger) busRef.current?.send(EVENTS.stingerPlay, { then_scene: next });
    else busRef.current?.send(EVENTS.sceneChange, { scene: next });
  }, [withStinger]);
  const playStinger = useCallback(() => busRef.current?.send(EVENTS.stingerPlay, {}), []);
  const clearHud = useCallback(() => busRef.current?.send(EVENTS.hudNotificationClear, {}), []);
  const sendHud = (text: string, tone: HudTone) => text.trim() && busRef.current?.send(EVENTS.hudNotification, { text, tone });

  // คีย์ลัด
  useEffect(() => {
    if (showKeys) return;
    const onKey = (e: KeyboardEvent) => {
      const combo = comboFromEvent(e);
      if (!combo) return;
      const id = Object.keys(hotkeys).find((k) => hotkeys[k] === combo);
      if (!id) return;
      e.preventDefault();
      const s = SCENE_ACTIONS.find((x) => x.id === id);
      if (s) gotoScene(s.scene);
      else if (id === "stinger") playStinger();
      else if (id === "clearHud") clearHud();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hotkeys, showKeys, gotoScene, playStinger, clearHud]);

  // พรีวิว: iframe ของหน้า overlay จริง ย่อด้วย scale
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / 1920));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const previewSrc = useMemo(
    () => (category && current ? `/overlay/${category.code}/${current.e.id}?k=${encodeURIComponent(channelKey)}` : ""),
    [category, current, channelKey],
  );

  const btn = "rounded bg-surface px-3 py-2 text-sm font-bold hover:bg-white/10";

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr_300px]">
      <aside className="space-y-3">
        <select
          className="w-full rounded bg-surface p-2"
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setEntryId(entries.find((x) => x.category_id === e.target.value)?.id ?? "");
          }}
        >
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {category && <div className="text-xs text-muted">{timeRangeOf(category)} · {catEntries.length} คน</div>}
        <ul className="max-h-[70vh] space-y-1 overflow-y-auto">
          {catEntries.map(({ e, comp }) => (
            <li key={e.id}>
              <button onClick={() => setEntryId(e.id)} className={`w-full rounded p-2 text-left text-xs ${e.id === entryId ? "bg-accent text-black" : "bg-surface"}`}>
                <span className="font-bold">{comp!.code}</span> {e.is_checked_in ? "✅" : ""}
                <br />
                {comp!.name_th}
                <br />
                <span className={e.id === entryId ? "text-black/70" : "text-muted"}>{comp!.name_en}</span>
              </button>
            </li>
          ))}
          {catEntries.length === 0 && <li className="text-xs text-muted">ยังไม่มีผู้แข่งในประเภทนี้</li>}
        </ul>
      </aside>

      {/* min-w-0: iframe 1920px ข้างในต้องไม่ดันคอลัมน์กริดให้กว้างเกินจอ */}
      <section className="min-w-0">
        <div ref={boxRef} className="relative aspect-video w-full overflow-hidden rounded border border-white/10 bg-black">
          {previewSrc && (
            <iframe key={previewSrc} src={previewSrc} title="พรีวิว overlay" style={{ width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: "top left", border: 0 }} />
          )}
        </div>
        <p className="mt-2 text-xs text-muted">
          พรีวิว = หน้า overlay จริง · ฉากปัจจุบัน: <b className="text-accent">{scene}</b>
          {current && <> · {current.comp!.code} {current.comp!.name_th} · {category?.name}</>}
        </p>
        {previewSrc && <p className="text-xs text-muted">URL สำหรับ OBS (Browser Source 1920×1080): <code className="select-all break-all">{previewSrc}</code></p>}
      </section>

      <aside className="space-y-4">
        <div className="flex items-center justify-between">
          <NetworkStat />
          <button className={btn} onClick={() => setShowKeys(true)} aria-label="ตั้งค่า Hotkey"><Keyboard className="h-4 w-4" /></button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {SCENE_ACTIONS.map((s) => (
            <button key={s.id} onClick={() => gotoScene(s.scene)} className={`${btn} ${scene === s.scene ? "ring-2 ring-accent" : ""}`}>
              {s.scene}
              <span className="block text-[10px] font-normal text-muted">{hotkeys[s.id]}</span>
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={withStinger} onChange={(e) => setWithStinger(e.target.checked)} /> เล่นสติงเกอร์ก่อนเปลี่ยนฉาก
        </label>
        <button className={`${btn} flex w-full items-center justify-center gap-2`} onClick={playStinger}>
          <Zap className="h-4 w-4" /> สติงเกอร์ <span className="text-[10px] text-muted">{hotkeys.stinger}</span>
        </button>

        <div className="space-y-1 rounded bg-surface/60 p-2">
          <div className="text-xs text-accent-2">ป้ายชื่อผู้แข่ง (ฉาก LIVE)</div>
          <div className="flex gap-1">
            <button className={`${btn} ${lowerThird ? "ring-2 ring-accent" : ""}`} onClick={() => setLT(true)}>แสดง</button>
            <button className={`${btn} ${!lowerThird ? "ring-2 ring-accent" : ""}`} onClick={() => setLT(false)}>ซ่อน</button>
          </div>
        </div>

        <div className="space-y-1 rounded bg-surface/60 p-2">
          <div className="text-xs text-accent-2">ตรามุมจอ (ฉาก LIVE)</div>
          <div className="flex flex-wrap gap-1">
            {BUG_CORNERS.map((c) => <button key={c.v} className={`${btn} ${bug === c.v ? "ring-2 ring-accent" : ""}`} onClick={() => setBugCorner(c.v)}>{c.label}</button>)}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs text-accent-2">ป้ายแจ้งเตือน</div>
          <input className="w-full rounded bg-surface p-2 text-sm" placeholder="พิมพ์ข้อความ" value={hudText} onChange={(e) => setHudText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendHud(hudText, "info")} />
          <button className={`${btn} w-full`} onClick={() => sendHud(hudText, "info")}>ส่งป้าย</button>
          <div className="flex flex-wrap gap-1">
            {QUICK_HUD.map((q) => <button key={q.text} className={btn} onClick={() => sendHud(q.text, q.tone)}>{q.text}</button>)}
          </div>
          <button className={`${btn} w-full`} onClick={clearHud}>ล้างป้าย <span className="text-[10px] text-muted">{hotkeys.clearHud}</span></button>
        </div>
      </aside>

      {showKeys && <HotkeySettingsModal actions={HOTKEY_ACTIONS} hotkeys={hotkeys} defaults={DEFAULT_HOTKEYS} onSave={save} onClose={() => setShowKeys(false)} />}
    </div>
  );
}
