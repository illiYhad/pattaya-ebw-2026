"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import type { ResultBoard, ScoreMethod } from "@/lib/types";
import { TRIM_MIN_JUDGES } from "@/lib/data/scoring";
import { ConfirmButton, btn } from "@/components/ui/ConfirmButton";
import { MsgLine, useAct } from "@/components/ui/useAct";
import { hideResultsAction, publishResultsAction, setScoreMethodAction, setTieDecisionAction } from "@/app/admin/score/actions";

export type CategoryResultCard = {
  id: string; code: string; name: string; judgeCount: number; total: number; board: ResultBoard;
  labels: Record<string, { code: string; name: string }>;
};

/** จัดลำดับกลุ่มที่คะแนนเท่ากัน: เลื่อนขึ้น/ลง แล้วกดบันทึกคำตัดสิน */
function TieGroup({ card, rank, entryIds, locked }: { card: CategoryResultCard; rank: number; entryIds: string[]; locked: boolean }) {
  const [order, setOrder] = useState(entryIds);
  const { busy, msg, act } = useAct();
  const move = (i: number, d: -1 | 1) => setOrder((p) => { const n = [...p]; const j = i + d; if (j < 0 || j >= n.length) return p; [n[i], n[j]] = [n[j], n[i]]; return n; });
  return (
    <div className="space-y-2 rounded border border-amber-400/50 p-3">
      <div className="text-sm font-bold text-amber-200">คะแนนเท่ากัน (อันดับ {rank}) · ให้กรรมการตัดสิน แล้วเรียงจากดีที่สุดลงมา</div>
      <ol className="space-y-1">
        {order.map((id, i) => (
          <li key={id} className="flex items-center gap-2 rounded bg-bg p-2 text-sm">
            <span className="num w-6 text-center text-muted">{rank + i}</span>
            <span className="num font-bold text-accent">{card.labels[id]?.code}</span>
            <span className="min-w-0 flex-1 truncate">{card.labels[id]?.name}</span>
            <button className={`${btn} !px-2 !py-1`} disabled={locked || busy || i === 0} onClick={() => move(i, -1)} aria-label="เลื่อนขึ้น">↑</button>
            <button className={`${btn} !px-2 !py-1`} disabled={locked || busy || i === order.length - 1} onClick={() => move(i, 1)} aria-label="เลื่อนลง">↓</button>
          </li>
        ))}
      </ol>
      <button className={btn} disabled={locked || busy} onClick={() => act(() => setTieDecisionAction(card.id, order), "บันทึกคำตัดสินแล้ว")}>บันทึกคำตัดสิน</button>
      <MsgLine msg={msg} />
    </div>
  );
}

function ResultCard({ card }: { card: CategoryResultCard }) {
  const { board } = card;
  const { busy, msg, act } = useAct();
  const full = board.standings.filter((s) => s.status === "complete").length;
  const ties = useMemo(() => {
    const groups = new Map<number, string[]>();
    for (const s of board.standings) if (s.tie_unresolved && s.rank !== undefined) groups.set(s.rank, [...(groups.get(s.rank) ?? []), s.entry_id]);
    return [...groups.entries()].sort((a, b) => a[0] - b[0]);
  }, [board.standings]);
  const canTrim = card.judgeCount >= TRIM_MIN_JUDGES;
  const setMethod = (m: ScoreMethod) => act(() => setScoreMethodAction(card.id, m), m === "mean" ? "เปลี่ยนเป็นเฉลี่ยทุกคนแล้ว" : "เปลี่ยนเป็นตัดสูง-ต่ำแล้ว");
  const blockReason = board.can_publish ? "" : board.warnings.filter((w) => !w.includes("ไม่มีคะแนน")).join(" · ") || "ยังเปิดผลไม่ได้";

  return (
    <section id={card.code} className="space-y-3 rounded-xl bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{card.name}</h2>
        {board.published
          ? <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">เปิดผลแล้ว · ทุกจอเห็นคะแนน</span>
          : <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-muted">ยังไม่เปิดผล · ทุกจอแสดง &quot;กำลังให้คะแนน&quot;</span>}
      </div>
      <div className="text-sm text-muted">กรอกครบ <b className="text-text">{full}</b> จาก {card.total} รายการ · กรรมการ {card.judgeCount} คน</div>

      {board.warnings.length > 0 && (
        <ul className="space-y-1 rounded bg-amber-500/10 p-3 text-sm text-amber-200" aria-label="คำเตือน">
          {board.warnings.map((w, i) => <li key={i}>⚠ {w}</li>)}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-muted">วิธีรวมคะแนน:</span>
        <button className={`${btn} ${board.method === "mean" ? "ring-2 ring-accent" : ""}`} disabled={busy || board.published} onClick={() => setMethod("mean")}>เฉลี่ยทุกคน</button>
        <button className={`${btn} ${board.method === "trimmed_mean" ? "ring-2 ring-accent" : ""}`} disabled={busy || board.published || !canTrim} onClick={() => setMethod("trimmed_mean")}>ตัดสูง-ต่ำ</button>
        {!canTrim && <span className="text-xs text-muted">(ตัดสูง-ต่ำเลือกได้เมื่อกรรมการ {TRIM_MIN_JUDGES} คนขึ้นไป)</span>}
      </div>

      {ties.map(([rank, ids]) => <TieGroup key={`${rank}-${ids.join(",")}`} card={card} rank={rank} entryIds={ids} locked={board.published} />)}

      <div className="flex flex-wrap items-start gap-2">
        {board.published ? (
          <ConfirmButton label="ซ่อนผล" question={`ซ่อนผล ${card.name}? ทุกจอจะกลับเป็น "กำลังให้คะแนน"`} disabled={busy} onConfirm={() => act(() => hideResultsAction(card.id), "ซ่อนผลแล้ว")} />
        ) : (
          <div className="space-y-1">
            <ConfirmButton label="เปิดผล" question={`เปิดผล ${card.name}? คะแนนและอันดับจะขึ้นจอและหน้าเว็บสาธารณะทันที`} disabled={busy || !board.can_publish} onConfirm={() => act(() => publishResultsAction(card.id), "เปิดผลแล้ว")} />
            {!board.can_publish && <p className="max-w-md text-xs text-amber-200">กดไม่ได้: {blockReason}</p>}
          </div>
        )}
        <Link className={btn} href={`/admin/score/${card.code}`}>กรอกคะแนน</Link>
        <Link className={btn} href={`/print/scoresheet/${card.code}`} target="_blank">พิมพ์ใบคะแนน</Link>
        <Link className={btn} href={`/results/${card.code}`} target="_blank">ดูหน้าผล</Link>
      </div>
      <MsgLine msg={msg} />
    </section>
  );
}

export function ResultsAdminClient({ cards }: { cards: CategoryResultCard[] }) {
  return <div className="space-y-4">{cards.map((c) => <ResultCard key={c.id} card={c} />)}</div>;
}
