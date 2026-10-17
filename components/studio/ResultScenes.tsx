"use client";

import React, { useEffect, useState } from "react";
import type { AthletePhoto, Category, Competitor, Entry, PublicResults, Standing } from "@/lib/types";
import { subscribeDataChanges } from "@/lib/data/live";
import { publicPhoto } from "@/lib/people";
import { MEDAL_LABEL, PENDING_NOTE, PENDING_TEXT, fmtJudge, fmtScore, podiumOf } from "@/lib/results-view";
import { Avatar } from "@/components/profile/Avatar";
import base from "./LiveArtwork.module.css";
import extra from "./ResultScenes.module.css";

const s = (name: string) => extra[name] ?? base[name] ?? name;
const POLL_MS = 3000;

export type Directory = { categories: Category[]; competitors: Competitor[]; entries: Entry[] };

/**
 * ผลสาธารณะของประเภท (ฉาก RESULT/SCORE) — ดึงจาก /api/results เท่านั้น (getPublicResults)
 * ยังโหลดไม่เสร็จ/ยังไม่เปิดผล = pending ไม่มีตัวเลข · ดึงซ้ำทุก 3 วิ + เมื่อข้อมูลเปลี่ยน → เปิด/ซ่อนผลแล้วจอตามทัน
 */
export function usePublicResults(categoryCode: string | undefined, active: boolean): PublicResults {
  const [state, setState] = useState<{ code?: string; results: PublicResults }>({ results: { status: "pending" } });
  useEffect(() => {
    if (!active || !categoryCode) return;
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/results/${encodeURIComponent(categoryCode)}`, { cache: "no-store" });
        if (!res.ok) throw new Error("bad");
        const results = (await res.json()) as PublicResults;
        if (alive) setState({ code: categoryCode, results });
      } catch {
        // โหลดไม่ได้ → ไม่โชว์ตัวเลขเดิมค้างไว้
        if (alive) setState({ code: categoryCode, results: { status: "pending" } });
      }
    };
    void load();
    const t = setInterval(load, POLL_MS);
    const off = subscribeDataChanges(() => void load());
    return () => { alive = false; clearInterval(t); off(); };
  }, [categoryCode, active]);
  // ผลของประเภทอื่น (ยังไม่ทันโหลดใหม่) ห้ามนำมาใช้
  return state.code === categoryCode ? state.results : { status: "pending" };
}

function RoundAvatar({ src, name, size }: { src?: string; name: string; size: number }) {
  return (
    <div className={s("avatar")} style={{ width: size, height: size }}>
      <Avatar src={src} name={name} size="fill" />
    </div>
  );
}

/** ป้าย "กำลังให้คะแนน" (แผ่นเดิมจาก K-P1.11) */
function PendingBoard({ category }: { category: Category }) {
  return (
    <div className={`${s("card")} ${s("board")}`}>
      <div className={s("chipDark")}>{category.name}</div>
      <div className={`${s("pill")} ${s("pendingBig")} mt-2`}>{PENDING_TEXT}</div>
      <p className={s("note")}>{PENDING_NOTE}</p>
    </div>
  );
}

type Person = { competitor: Competitor; photo?: string };
const personOf = (dir: Directory, photos: AthletePhoto[], entryId: string): Person | undefined => {
  const entry = dir.entries.find((e) => e.id === entryId);
  const competitor = entry && dir.competitors.find((c) => c.id === entry.competitor_id);
  return competitor ? { competitor, photo: publicPhoto(photos, competitor)?.cutout_url } : undefined;
};

/** ฉาก RESULT: เปิดผลแล้ว = โพเดียม 1–3 (ชื่อ · ร้าน · คะแนนรวม) · ยังไม่เปิด = "กำลังให้คะแนน" */
export function ResultScene({ category, results, dir, photos }: { category: Category; results: PublicResults; dir: Directory; photos: AthletePhoto[] }) {
  if (results.status === "pending") return <div className={s("col")} style={{ top: 190, width: 1140 }}><PendingBoard category={category} /></div>;
  const podium = podiumOf(results.standings);
  return (
    <>
      <div className={s("col")} style={{ top: 120 }}>
        <div className={s("plate")} style={{ marginTop: 0 }}>
          <h1 className={s("plateTitle")}>ผลการแข่งขัน</h1>
          <span className={s("plateSub")}>{category.name}</span>
        </div>
      </div>
      <div className="absolute left-1/2 z-10 -translate-x-1/2" style={{ top: 360 }}>
        <div className={s("podRow")}>
          {podium.map((st) => {
            const p = personOf(dir, photos, st.entry_id);
            if (!p) return null;
            const place = st.place as 1 | 2 | 3;
            return (
              <div key={st.entry_id} className={`${s("card")} ${s("pod")} ${s(`pod${place}`)}`}>
                <div className={`num ${s("podRank")} ${s(`rank${place}`)}`} aria-label={MEDAL_LABEL[place]}>{st.rank}</div>
                <RoundAvatar src={p.photo} name={p.competitor.name_th} size={place === 1 ? 210 : 180} />
                <div className={`num ${s("podCode")}`}>{p.competitor.code}</div>
                <div className={s("podName")}>{p.competitor.name_th}</div>
                {p.competitor.shop && <div className={s("podShop")}>{p.competitor.shop}</div>}
                <div className={`num ${s("podScore")}`}>{fmtScore(st.score ?? 0)}</div>
                <div className={s("podScoreLabel")}>คะแนนรวม</div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

/** ฉาก SCORE: ผู้แข่ง 1 คน — ชื่อ · รหัส · คะแนนรายกรรมการ · คะแนนรวมตัวใหญ่ · ยังไม่เปิดผล/ไม่มีคะแนน = "กำลังให้คะแนน" */
export function ScoreScene({ category, entry, results, dir, photos }: { category: Category; entry: Entry; results: PublicResults; dir: Directory; photos: AthletePhoto[] }) {
  const p = personOf(dir, photos, entry.id);
  if (!p) return null;
  const standing: Standing | undefined = results.status === "published" ? results.standings.find((x) => x.entry_id === entry.id) : undefined;
  return (
    <div className={s("col")} style={{ top: 170 }}>
      <div className={s("chipDark")}>{category.name}</div>
      <div className={`${s("card")} ${s("scoreCard")} mt-6`}>
        <div className={s("scoreWho")}>
          <RoundAvatar src={p.photo} name={p.competitor.name_th} size={260} />
          <div className="space-y-1">
            <div className={`num ${s("scoreCode")}`}>{p.competitor.code}</div>
            <div className={s("scoreName")}>{p.competitor.name_th}</div>
            <div className={s("scoreEn")}>{p.competitor.name_en}</div>
            {p.competitor.shop && <div className={s("scoreShop")}>{p.competitor.shop}</div>}
          </div>
        </div>
        {standing ? (
          <div className={s("scoreRow")}>
            <div className={s("judges")}>
              {standing.judge_totals.map((t, i) => (
                <div key={i} className={s("judge")}><small>กรรมการ {i + 1}</small><b className="num">{fmtJudge(t)}</b></div>
              ))}
            </div>
            <div className={s("totalBox")}>
              <small>คะแนนรวม</small>
              <b className="num">{fmtScore(standing.score ?? 0)}</b>
              {standing.rank !== undefined && <span className={`${s("rankPill")} mt-2`}>อันดับ {standing.rank}</span>}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className={`${s("pill")} ${s("pendingBig")}`}>{PENDING_TEXT}</div>
            <p className={s("note")}>{PENDING_NOTE}</p>
          </div>
        )}
      </div>
    </div>
  );
}
