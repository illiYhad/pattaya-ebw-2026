import React from "react";
import type { Category, Competitor, PublicResults, Standing } from "@/lib/types";
import { Avatar } from "@/components/profile/Avatar";
import { Card, SectionH2 } from "@/components/site/PosterPage";
import { MEDAL_LABEL, PENDING_NOTE, PENDING_TEXT, fmtJudge, fmtScore, podiumOf } from "@/lib/results-view";
import styles from "./Results.module.css";

const c = (n: string) => styles[n] ?? n;

export type ResultPerson = { competitor: Competitor; photo?: string };

/** กรอบ "กำลังให้คะแนน" — ไม่มีตัวเลขใด ๆ (กฎเหล็ก K-P2c) */
export function PendingNotice() {
  return (
    <Card>
      <div className={c("pending")} role="status">
        <b>{PENDING_TEXT}</b>
        <div className={c("dots")} aria-hidden="true"><span /><span /><span /></div>
        <p>{PENDING_NOTE}</p>
      </div>
    </Card>
  );
}

function Detail({ category, s }: { category: Category; s: Standing }) {
  return (
    <div className={c("detail")}>
      <h3>คะแนนรายกรรมการ</h3>
      <div className={c("chips")}>{s.judge_totals.map((t, i) => <span key={i}>กรรมการ {i + 1}: {fmtJudge(t)}</span>)}</div>
      {s.criteria_avg && (
        <>
          <h3>คะแนนเฉลี่ยรายเกณฑ์</h3>
          <ul className={c("crit")}>
            {category.criteria.map((k, i) => (
              <li key={i}><span>{k.name}{k.max !== undefined ? ` (เต็ม ${k.max})` : ""}</span><b>{fmtScore(s.criteria_avg?.[i] ?? 0)}</b></li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/**
 * ผลของ 1 ประเภท (ฝั่งคนดู) — ยังไม่เปิดผล = "กำลังให้คะแนน" เท่านั้น
 * เปิดผลแล้ว: โพเดียม 1–3 · อันดับทั้งหมดพร้อมแตกคะแนน · รายการที่ยังไม่มีคะแนนท้ายสุดไม่มีอันดับ
 */
export function ResultsBoard({ category, results, people, unscored }: { category: Category; results: PublicResults; people: Record<string, ResultPerson>; unscored: Competitor[] }) {
  if (results.status === "pending") return <PendingNotice />;
  const standings = results.standings;
  const podium = podiumOf(standings);
  return (
    <>
      <SectionH2 text="ผู้ได้รับรางวัล" />
      <ol className={c("podium")} aria-label="อันดับ 1–3">
        {podium.map((s) => {
          const p = people[s.entry_id];
          if (!p) return null;
          return (
            <li key={s.entry_id} className={`${c("pod")} ${c(`m${s.place}`)}`}>
              <span className={c("rk")} aria-label={MEDAL_LABEL[s.place!]}>{s.rank}</span>
              <div className={c("av")}><Avatar src={p.photo} name={p.competitor.name_th} size="fill" /></div>
              <span className={`num ${c("cd")}`}>{p.competitor.code}</span>
              <span className={c("nm")}>{p.competitor.name_th}</span>
              {p.competitor.shop && <span className={c("sh")}>{p.competitor.shop}</span>}
              <span className={`num ${c("sc")}`}>{fmtScore(s.score ?? 0)}<small>คะแนนรวม</small></span>
            </li>
          );
        })}
      </ol>

      <SectionH2 text="อันดับทั้งหมด" />
      <ul className={c("list")}>
        {standings.map((s) => {
          const p = people[s.entry_id];
          if (!p) return null;
          return (
            <li key={s.entry_id}>
              <details className={c("row")}>
                <summary>
                  <span className={`num ${c("no")} ${s.rank === 1 ? c("g1") : s.rank === 3 ? c("g3") : ""}`}>{s.rank}</span>
                  <span className={c("pic")}><Avatar src={p.photo} name={p.competitor.name_th} size="fill" /></span>
                  <span className={c("who")}><b>{p.competitor.name_th}</b><small><span className="num">{p.competitor.code}</span>{p.competitor.shop ? ` · ${p.competitor.shop}` : ""}</small></span>
                  <span className={`num ${c("tot")}`}>{fmtScore(s.score ?? 0)}</span>
                </summary>
                <Detail category={category} s={s} />
              </details>
            </li>
          );
        })}
      </ul>

      {unscored.length > 0 && (
        <>
          <SectionH2 text="ยังไม่มีคะแนน" />
          <p className={c("none")}>{unscored.map((u) => `${u.code} ${u.name_th}`).join(" · ")}</p>
        </>
      )}
    </>
  );
}
