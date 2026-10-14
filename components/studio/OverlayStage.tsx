"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { AthletePhoto, Category, Competitor, Entry, Scene, Sponsor } from "@/lib/types";
import { sponsorsAt, timeRangeOf } from "@/lib/view";
import { EVENTS, entryChannelName, openBus, type BugCorner, type HubEventMap, type HudTone } from "@/lib/realtime";
import { publicPhoto } from "@/lib/people";
import { EVENT } from "@/lib/event";
import { Avatar } from "@/components/profile/Avatar";
import { BRAND, EventLogo, OfficialBug, OfficialHeader, Seal, Watermark } from "@/components/brand/Brand";
import { SponsorLogo } from "./SponsorLogo";
import { Stinger } from "./Stinger";

const BAR_ROTATE_MS = 8000;
const TONE: Record<HudTone, string> = { info: "bg-accent text-black", warn: "bg-amber-400 text-black", alert: "bg-live text-white" };
const SPONSOR_H = 44;
const BUG_MARGIN = 18;
const LT_LEFT = 96;
const LT_BOTTOM = 110;

type Props = {
  channelKey: string;
  category: Category;
  entry: Entry;
  competitor: Competitor;
  /** จำนวนผู้แข่งทั้งประเภท (โชว์บนฉาก STARTING) */
  inCategory: number;
  sponsors: Sponsor[];
  photos: AthletePhoto[];
  stingerVideo?: string;
};

/** ป้ายชื่อผู้แข่ง (lower third): ชื่อไทย/อังกฤษ + ประเภท + รหัส · แถบโรสโกลด์ซ้าย */
function LowerThird({ competitor, category, show }: { competitor: Competitor; category: Category; show: boolean }) {
  return (
    <div
      className="absolute flex items-stretch transition-all duration-500"
      style={{ left: LT_LEFT, bottom: LT_BOTTOM, opacity: show ? 1 : 0, transform: show ? "translateX(0)" : "translateX(-40px)" }}
    >
      <div className="w-3 rounded-l-md" style={{ background: "var(--accent-2)" }} />
      <div className="min-w-[640px] max-w-[1100px] rounded-r-xl bg-bg/90 px-8 py-5">
        <div className="text-[56px] font-black leading-none">{competitor.name_th}</div>
        <div className="mt-2 text-[30px] leading-none text-muted">{competitor.name_en}</div>
        <div className="mt-4 flex items-center gap-4 text-[26px] leading-none">
          <span className="rounded px-3 py-1.5 font-bold tracking-widest text-black" style={{ background: "var(--accent-2)" }}>{competitor.code}</span>
          <span>{category.name}</span>
          {competitor.shop && <span className="text-muted">· {competitor.shop}</span>}
        </div>
      </div>
    </div>
  );
}

export function OverlayStage({ channelKey, category, entry, competitor, inCategory, sponsors, photos, stingerVideo }: Props) {
  const [scene, setScene] = useState<Scene>("STARTING");
  const [hud, setHud] = useState<{ text: string; tone: HudTone } | null>(null);
  const [bug, setBug] = useState<BugCorner>("bl");
  const [lowerThird, setLowerThird] = useState(true);
  const [stingerId, setStingerId] = useState(0);
  const pending = useRef<Scene | undefined>(undefined);
  const [barIdx, setBarIdx] = useState(0);

  const bars = sponsorsAt(sponsors, "bottom_ticker");
  const corner = sponsorsAt(sponsors, "corner")[0];
  const stingerSponsor = sponsorsAt(sponsors, "stinger")[0];
  const fullScreenSponsors = sponsorsAt(sponsors, "full_screen");
  const photo = publicPhoto(photos, competitor)?.cutout_url;

  useEffect(() => {
    const bus = openBus(entryChannelName(channelKey, entry.id));
    const off = bus.on((event, raw) => {
      switch (event) {
        case EVENTS.sceneChange: setScene((raw as HubEventMap["scene_change"]).scene); break;
        case EVENTS.hudNotification: setHud(raw as HubEventMap["hud_notification"]); break;
        case EVENTS.hudNotificationClear: setHud(null); break;
        case EVENTS.stingerPlay:
          pending.current = (raw as HubEventMap["stinger_play"]).then_scene;
          setStingerId((n) => n + 1);
          break;
        case EVENTS.brandBug: setBug((raw as HubEventMap["brand_bug"]).corner); break;
        case EVENTS.lowerThird: setLowerThird((raw as HubEventMap["lower_third"]).show); break;
      }
    });
    return () => { off(); bus.close(); };
  }, [channelKey, entry.id]);

  useEffect(() => {
    if (bars.length < 2) return;
    const t = setInterval(() => setBarIdx((i) => i + 1), BAR_ROTATE_MS);
    return () => clearInterval(t);
  }, [bars.length]);

  const onCovered = useCallback(() => {
    if (pending.current) setScene(pending.current);
    pending.current = undefined;
  }, []);

  const barSponsor = bars.length ? bars[barIdx % bars.length] : undefined;
  const fullScreen = scene !== "LIVE";
  const sponsorBarShown = scene === "LIVE" && !!barSponsor;
  const sponsorH = sponsorBarShown ? SPONSOR_H : 0;
  const bugBottom = sponsorH + BUG_MARGIN;
  const bugStyle: React.CSSProperties =
    bug === "tl" ? { left: 32, top: 32 } : bug === "tr" ? { right: 32, top: 32 } : bug === "bl" ? { left: 32, bottom: bugBottom } : { right: 32, bottom: bugBottom };
  // ป้ายชื่ออยู่ซ้ายล่าง → ถ้าตราอยู่ซ้ายล่างด้วย ย้ายตราไปขวาล่างอัตโนมัติ
  const bugFixed: React.CSSProperties = bug === "bl" && lowerThird ? { right: 32, bottom: bugBottom } : bugStyle;

  return (
    <div className="relative h-[1080px] w-[1920px] overflow-hidden text-text" style={{ background: "transparent" }}>
      {scene === "STARTING" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 overflow-hidden bg-bg/90">
          <Watermark height={820} />
          <OfficialHeader showLogo={false} />
          <EventLogo variant="white" width={480} priority />
          <div className="relative text-5xl font-black">เริ่มเร็ว ๆ นี้</div>
          <div className="relative flex items-center gap-12">
            <Avatar src={photo} name={competitor.name_th} size="xl" />
            <div className="max-w-[900px] space-y-3">
              <div className="text-[30px] font-bold tracking-widest" style={{ color: "var(--accent-2)" }}>{competitor.code}</div>
              <div className="text-6xl font-black leading-tight">{competitor.name_th}</div>
              <div className="text-4xl text-muted">{competitor.name_en}</div>
              {competitor.shop && <div className="text-3xl text-muted">{competitor.shop}</div>}
            </div>
          </div>
          <div className="relative text-3xl text-muted">{category.name} · {timeRangeOf(category)} · ผู้แข่ง {inCategory} คน</div>
        </div>
      )}

      {scene === "LIVE" && (
        <>
          <LowerThird competitor={competitor} category={category} show={lowerThird} />
          {bug !== "hidden" && <OfficialBug size="sm" className="absolute" style={bugFixed} />}
        </>
      )}

      {scene === "BREAK" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 overflow-hidden bg-bg/90">
          <Watermark height={820} />
          <OfficialHeader showLogo={false} />
          <EventLogo variant="white" width={640} priority />
          <div className="relative text-8xl font-black">พักการแข่งขัน</div>
          <div className="relative flex items-center gap-4 text-3xl text-muted"><Seal size={110} /><span>จัดโดย {BRAND.organizer}</span></div>
        </div>
      )}

      {scene === "RESULT" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 overflow-hidden bg-bg/90">
          <Watermark height={820} />
          <OfficialHeader />
          <div className="relative text-4xl text-accent">{category.name}</div>
          <div className="relative text-6xl font-black">{competitor.name_th}</div>
          <div className="relative text-3xl text-muted">{competitor.name_en} · {competitor.code}</div>
          <div className="relative mt-4 rounded-2xl border-2 border-dashed border-white/20 px-16 py-8 text-center">
            <div className="text-7xl font-black text-muted">รอผล</div>
            <div className="mt-2 text-2xl text-muted">ผลคะแนนและอันดับจะแสดงเมื่อระบบให้คะแนนเปิดใช้</div>
          </div>
        </div>
      )}

      {scene === "SPONSOR" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-10 overflow-hidden bg-bg/95">
          <Watermark height={820} />
          {fullScreenSponsors.length === 0 ? (
            <>
              <EventLogo variant="white" width={760} priority />
              <div className="relative flex items-center gap-5 text-4xl"><Seal size={120} /><span>จัดโดย {BRAND.organizer}</span></div>
            </>
          ) : (
            <>
              <div className="relative text-4xl text-muted">ขอบคุณผู้สนับสนุน</div>
              {fullScreenSponsors.map((s) => (
                <div key={s.id} className="relative"><SponsorLogo sponsor={s} className={s.level === "main" ? "h-40" : "h-24"} /></div>
              ))}
              <div className="absolute bottom-12 left-1/2 flex -translate-x-1/2 items-center gap-6"><EventLogo variant="white" width={260} /><Seal size={96} /></div>
            </>
          )}
        </div>
      )}

      {scene !== "SPONSOR" && corner && (
        <div className={`absolute rounded-lg bg-bg/80 px-4 py-2 text-2xl ${fullScreen ? "bottom-10 right-10" : bug === "tr" ? "left-10 top-10" : "right-10 top-10"}`}>
          <SponsorLogo sponsor={corner} />
        </div>
      )}
      {sponsorBarShown && barSponsor && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 bg-bg/85 text-xl text-muted" style={{ height: SPONSOR_H }}>
          <span className="text-base">สนับสนุนโดย</span>
          <SponsorLogo sponsor={barSponsor} className="h-7" />
        </div>
      )}

      {hud && (
        <div className={`absolute inset-x-0 z-30 mx-auto w-fit rounded-xl px-12 py-4 text-5xl font-black shadow-2xl ${TONE[hud.tone]}`} style={{ top: 48 }}>
          {hud.text}
        </div>
      )}

      <Stinger playId={stingerId} onCovered={onCovered} title={EVENT.shortTitle} sponsor={stingerSponsor} videoSrc={stingerVideo} />
    </div>
  );
}
