"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { AthletePhoto, Category, Competitor, Entry, Scene, Sponsor } from "@/lib/types";
import { sponsorsAt, timeRangeOf } from "@/lib/view";
import { EVENTS, entryChannelName, openBus, type BugCorner, type HubEventMap, type HudTone } from "@/lib/realtime";
import { publicPhoto } from "@/lib/people";
import { EVENT } from "@/lib/event";
import { Avatar } from "@/components/profile/Avatar";
import { BRAND, EventLogo, OfficialBug, OfficialHeader, Seal } from "@/components/brand/Brand";
import { SponsorLogo } from "./SponsorLogo";
import { Stinger } from "./Stinger";
import styles from "./LiveArtwork.module.css";

const s = (name: string) => styles[name] ?? name;

const BAR_ROTATE_MS = 8000;
/** สีป้ายแจ้งเตือนชุดโปสเตอร์ (K-P1.12): info เขียวหัวเป็ด · warn กระดาษครีม · alert โรสโกลด์เข้ม */
const TONE: Record<HudTone, string> = { info: s("hudInfo"), warn: s("hudWarn"), alert: s("hudAlert") };
const SPONSOR_H = 44;
const BUG_MARGIN = 64;
const LT_LEFT = 64;
const LT_BOTTOM = 120;
/** ภาพหัวโปสเตอร์ PMAT (public/artwork/head.jpg 1024×518) — แสดงส่วนบนเหนือป้าย ขนาดจริง */
const HEAD_SRC = "/artwork/head.jpg";
const HEAD_ALT = "EASTERN BEAUTY & WELLNESS CHAMPIONSHIP 2026 · 30 OCTOBER 2026 · PATTAYA, THAILAND";
/** ตรามุมจอบนฉาก LIVE: พื้นเขียวหัวเป็ด ขอบโรสโกลด์ (ทับ bg-bg/70 ของ OfficialBug) */
const BUG_SKIN: React.CSSProperties = { background: "rgba(13,53,64,.88)", border: "2px solid #D9B39C", boxShadow: "inset 0 0 0 3px #0D3540" };

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

/** แถบโค้งโรสโกลด์/ครีมด้านล่างจอ (โครงเดิมจาก 2_LiveScore · เปลี่ยนสีเข้าชุดโปสเตอร์) — พื้นโปร่ง */
function LiveRibbons() {
  return (
    <svg width="1920" height="1080" viewBox="0 0 1920 1080" aria-hidden="true" className="pointer-events-none absolute left-0 top-0">
      <path d="M -100 1120 C 300 820, 900 1010, 2020 700" stroke="#C9A48F" strokeWidth="54" fill="none" />
      <path d="M -100 1190 C 360 900, 960 1080, 2020 790" stroke="#F1D9C8" strokeWidth="26" fill="none" />
      <path d="M -100 1236 C 400 960, 1000 1130, 2020 850" stroke="#FFF6EF" strokeWidth="3" fill="none" opacity="0.6" />
    </svg>
  );
}

/** ป้าย "EBW 2026 · LIVE" มุมซ้ายบน */
function LiveBadge() {
  return (
    <div className={s("badge")}>
      <div className={s("badgeDot")} />
      <div className={`num ${s("badgeText")}`}>EBW 2026 · LIVE</div>
    </div>
  );
}

/** รูปผู้แข่งวงกลมขอบโรสโกลด์ (ไม่มีรูป = เงา) */
function RoundAvatar({ src, name, size }: { src?: string; name: string; size: number }) {
  return (
    <div className={s("avatar")} style={{ width: size, height: size }}>
      <Avatar src={src} name={name} size="fill" />
    </div>
  );
}

/** ภาพหัวโปสเตอร์ส่วนบน (ตรา PMAT + ชื่องาน + วันที่ เป็นอาร์ตของ PMAT เอง) */
function PosterHead() {
  return (
    <div className={s("head")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={HEAD_SRC} width={1024} height={518} alt={HEAD_ALT} />
    </div>
  );
}

/** ภาพท้ายโปสเตอร์ (หอย/ปะการัง/ถ้วย) ชิดขอบล่าง */
function PosterBottom() {
  return (
    <div className={s("bot")} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/schedule/bottom.jpg" width={1024} height={318} alt="" />
    </div>
  );
}

/** ป้ายชื่อผู้แข่ง (lower third): แผ่นเขียวหัวเป็ดขอบโรสโกลด์ มุมโค้งซ้าย · รูปวงกลม 196px + เลข EBW + ชื่อไทย/อังกฤษ + ประเภท */
function LowerThird({ competitor, category, show, photo }: { competitor: Competitor; category: Category; show: boolean; photo?: string }) {
  return (
    <div className={s("lt")} style={{ left: LT_LEFT, bottom: LT_BOTTOM, opacity: show ? 1 : 0, transform: show ? "translateX(0)" : "translateX(-40px)" }}>
      <RoundAvatar src={photo} name={competitor.name_th} size={196} />
      <div className={s("ltText")}>
        <div className={`num ${s("ltCode")}`}>{competitor.code}</div>
        <div className={s("ltName")}>{competitor.name_th}</div>
        <div className={s("ltEn")}>{competitor.name_en}</div>
        <div className={s("ltCat")}>{category.name}{competitor.shop ? ` · ${competitor.shop}` : ""}</div>
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
    bug === "tl" ? { left: 64, top: 64 } : bug === "tr" ? { right: 64, top: 64 } : bug === "bl" ? { left: 64, bottom: bugBottom } : { right: 64, bottom: bugBottom };
  // ป้ายชื่ออยู่ซ้ายล่าง → ถ้าตราอยู่ซ้ายล่างด้วย ย้ายตราไปขวาล่างอัตโนมัติ
  const bugFixed: React.CSSProperties = bug === "bl" && lowerThird ? { right: 64, bottom: bugBottom } : bugStyle;

  return (
    <div className={`relative h-[1080px] w-[1920px] overflow-hidden ${s("stage")}`} style={{ background: "transparent" }}>
      {scene === "STARTING" && (
        <div className={s("fs")}>
          <div className={s("col")} style={{ top: 150 }}>
            <PosterHead />
            <div className={s("plate")}>
              <h1 className={s("plateTitle")}>เริ่มเร็ว ๆ นี้</h1>
            </div>
            <div className={`${s("card")} mt-8 flex items-center gap-10`}>
              <RoundAvatar src={photo} name={competitor.name_th} size={200} />
              <div className="max-w-[720px] space-y-1">
                <div className="num text-[30px] font-semibold tracking-widest" style={{ color: "#8E6450" }}>{competitor.code}</div>
                <div className="text-[60px] font-bold leading-tight" style={{ color: "#1D4652" }}>{competitor.name_th}</div>
                <div className="text-[34px]" style={{ color: "#5B4A40" }}>{competitor.name_en}</div>
                {competitor.shop && <div className="text-[30px]" style={{ color: "#5B4A40" }}>{competitor.shop}</div>}
              </div>
            </div>
            <div className={`${s("chipDark")} mt-7`}>{category.name} · {timeRangeOf(category)} · ผู้แข่ง {inCategory} คน</div>
          </div>
        </div>
      )}

      {scene === "LIVE" && (
        <>
          <LiveRibbons />
          <LiveBadge />
          <LowerThird competitor={competitor} category={category} show={lowerThird} photo={photo} />
          {bug !== "hidden" && <OfficialBug size="sm" className="absolute" style={{ ...bugFixed, ...BUG_SKIN }} />}
        </>
      )}

      {scene === "BREAK" && (
        <div className={s("fs")}>
          <PosterBottom />
          <div className={s("col")} style={{ top: 170 }}>
            <PosterHead />
            <div className={s("plate")}>
              <h1 className={`${s("plateTitle")} ${s("xl")}`}>พักการแข่งขัน</h1>
            </div>
          </div>
        </div>
      )}

      {scene === "RESULT" && (
        <div className={s("fs")}>
          <OfficialHeader />
          <div className={s("col")} style={{ top: 190, width: 1140 }}>
            <div className={`${s("card")} ${s("board")}`}>
              <div className={s("chipDark")}>{category.name}</div>
              <h1 className={s("boardName")}>{competitor.name_th}</h1>
              <div className={s("boardEn")}>{competitor.name_en} · <span className="num">{competitor.code}</span></div>
              <div className={`${s("pill")} ${s("result")} mt-2`}>รอประกาศผล</div>
              <p className={s("note")}>ผลคะแนนและอันดับจะแสดงเมื่อประกาศผลแล้ว</p>
            </div>
          </div>
        </div>
      )}

      {scene === "SPONSOR" && (
        <div className={s("fs")}>
          <LiveBadge />
          <PosterBottom />
          {fullScreenSponsors.length === 0 ? (
            <div className={s("col")} style={{ top: 150 }}>
              <PosterHead />
              <div className={s("plate")}>
                <span className={s("plateTitle")} style={{ fontSize: 48 }}>จัดโดย {BRAND.organizer}</span>
              </div>
            </div>
          ) : (
            <>
              <div className={s("col")} style={{ top: 120 }}>
                <div className={s("plate")} style={{ marginTop: 0 }}>
                  <h1 className={s("plateTitle")}>ขอบคุณผู้สนับสนุน</h1>
                </div>
                <div className={`${s("card")} mt-8 flex flex-col items-center gap-8`}>
                  {fullScreenSponsors.map((sp) => (
                    <div key={sp.id} className="relative"><SponsorLogo sponsor={sp} className={sp.level === "main" ? "h-40" : "h-24"} /></div>
                  ))}
                </div>
              </div>
              <div className="absolute bottom-16 left-1/2 z-10 flex -translate-x-1/2 items-center gap-6"><EventLogo variant="white" width={260} /><Seal size={96} /></div>
            </>
          )}
        </div>
      )}

      {scene !== "SPONSOR" && corner && (
        <div className={`absolute rounded-lg px-4 py-2 text-2xl ${s("chipBox")} ${fullScreen ? "bottom-16 right-16" : bug === "tr" ? "left-16 top-16" : "right-16 top-16"}`}>
          <SponsorLogo sponsor={corner} />
        </div>
      )}
      {sponsorBarShown && barSponsor && (
        <div className={`absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 text-xl ${s("sponsorBar")}`} style={{ height: SPONSOR_H }}>
          <span className="text-base">สนับสนุนโดย</span>
          <SponsorLogo sponsor={barSponsor} className="h-7" />
        </div>
      )}

      {hud && (
        <div className={`absolute inset-x-0 z-30 mx-auto w-fit rounded-xl px-12 py-4 text-5xl font-black ${s("hud")} ${TONE[hud.tone]}`} style={{ top: 64 }}>
          {hud.text}
        </div>
      )}

      <Stinger playId={stingerId} onCovered={onCovered} title={EVENT.shortTitle} sponsor={stingerSponsor} videoSrc={stingerVideo} />
    </div>
  );
}
