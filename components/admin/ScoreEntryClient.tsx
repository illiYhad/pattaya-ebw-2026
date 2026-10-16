"use client";

import React, { useEffect, useState } from "react";
import type { Category, ScoreSheet } from "@/lib/types";
import { isCriteriaMode, maxTotal } from "@/lib/data/scoring";
import { ConfirmButton, btn } from "@/components/ui/ConfirmButton";
import { MsgLine, useAct } from "@/components/ui/useAct";
import { clearScoreAction, saveScoreAction } from "@/app/admin/score/actions";

export type EntryRow = { entryId: string; code: string; name: string; shop?: string };
export type AuditRow = { id: string; at: string; by: string; entry: string; judge?: number; action: string; before?: string; after?: string };

const inp = "w-full min-w-0 rounded bg-bg p-1.5 text-right text-sm tabular-nums disabled:opacity-50";

/** ค่าที่กรอก (ข้อความ) ของใบเดียว: โหมดรายเกณฑ์ = 1 ช่องต่อข้อ · โหมดรวม = 1 ช่อง */
const initial = (category: Category, sheet?: ScoreSheet): string[] => {
  const n = isCriteriaMode(category) ? category.criteria.length : 1;
  if (!sheet) return Array.from({ length: n }, () => "");
  const vals = isCriteriaMode(category) ? sheet.criteria_scores ?? [] : [sheet.total];
  return Array.from({ length: n }, (_, i) => (vals[i] === undefined ? "" : String(vals[i])));
};

const sumOf = (vals: string[]) => vals.reduce((a, v) => a + (Number(v) || 0), 0);

/** 1 ช่อง = กรรมการ 1 คน × 1 รายการ · บันทึกด้วยปุ่ม หรืออัตโนมัติเมื่อกรอกครบทุกช่องแล้วออกจากช่อง */
function ScoreCell({ category, row, judgeNo, sheet, locked }: { category: Category; row: EntryRow; judgeNo: number; sheet?: ScoreSheet; locked: boolean }) {
  const criteriaMode = isCriteriaMode(category);
  const saved = initial(category, sheet);
  const [vals, setVals] = useState<string[]>(saved);
  const { busy, msg, setMsg, act } = useAct();
  // ข้อมูลจากเซิร์ฟเวอร์เปลี่ยน (บันทึก/ล้าง/แท็บอื่นแก้) → ตั้งช่องกรอกตามใบล่าสุด โดยไม่ล้างข้อความผลบันทึก
  const version = sheet?.updated_at ?? "";
  useEffect(() => { setVals(initial(category, sheet)); }, [version]); // eslint-disable-line react-hooks/exhaustive-deps
  const full = vals.every((v) => v.trim() !== "");
  const dirty = vals.join("|") !== saved.join("|");
  const max = maxTotal(category);

  const save = async () => {
    const nums = vals.map((v) => Number(v));
    const res = await act(
      () => saveScoreAction(row.entryId, judgeNo, criteriaMode ? { criteria_scores: nums } : { total: nums[0] }),
      `บันทึกแล้ว · ${row.code} กรรมการ ${judgeNo}`,
    );
    return res;
  };
  const onBlur = () => {
    if (!locked && !busy && full && dirty) void save();
  };

  return (
    <div className="space-y-1" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onBlur(); }}>
      {vals.map((v, i) => (
        <label key={i} className="flex items-center gap-1.5 text-xs">
          {criteriaMode && <span className="min-w-0 flex-1 truncate text-muted" title={category.criteria[i].name}>{category.criteria[i].name} <span className="whitespace-nowrap">/{category.criteria[i].max}</span></span>}
          <input
            className={`${inp} ${criteriaMode ? "w-16 flex-none" : ""}`}
            type="number" inputMode="decimal" step="0.1" min="0" max={criteriaMode ? category.criteria[i].max : max}
            value={v} disabled={locked || busy}
            aria-label={`${row.code} กรรมการ ${judgeNo}${criteriaMode ? ` ${category.criteria[i].name}` : " คะแนนรวม"}`}
            onChange={(e) => { setVals((p) => p.map((x, j) => (j === i ? e.target.value : x))); setMsg(null); }}
          />
        </label>
      ))}
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={dirty ? "text-amber-300" : sheet ? "text-emerald-400" : "text-muted"}>
          รวม {Math.round(sumOf(vals) * 10) / 10}/{max}{sheet && !dirty ? " ✓" : ""}
        </span>
        {!locked && (
          <span className="flex gap-1">
            <button className={`${btn} !px-2 !py-1 !text-xs`} disabled={busy || !full || !dirty} onClick={() => void save()}>บันทึก</button>
            {sheet && (
              <ConfirmButton
                label="ล้าง" danger disabled={busy}
                question={`ล้างใบ ${row.code} กรรมการ ${judgeNo}?`}
                onConfirm={() => act(() => clearScoreAction(row.entryId, judgeNo), `ล้างใบแล้ว · ${row.code} กรรมการ ${judgeNo}`)}
              />
            )}
          </span>
        )}
      </div>
      <MsgLine msg={msg} />
    </div>
  );
}

export function ScoreEntryClient({ category, rows, sheets, published, audit }: { category: Category; rows: EntryRow[]; sheets: ScoreSheet[]; published: boolean; audit: AuditRow[] }) {
  const judges = Array.from({ length: category.judge_count }, (_, i) => i + 1);
  const criteriaMode = isCriteriaMode(category);
  const sheetOf = (entryId: string, judgeNo: number) => sheets.find((s) => s.entry_id === entryId && s.judge_no === judgeNo);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {criteriaMode ? `โหมดรายเกณฑ์ ${category.criteria.length} ข้อ (เต็ม ${maxTotal(category)})` : "โหมดคะแนนรวม ช่องเดียว (เต็ม 100)"} · กรรมการ {category.judge_count} คน · ทศนิยมได้ 1 ตำแหน่ง · กรอกครบทุกช่องของใบนั้นแล้วออกจากช่อง ระบบบันทึกให้เอง
      </p>
      {published && (
        <p className="rounded border border-amber-400/60 bg-amber-500/10 p-3 text-sm text-amber-200">🔒 ประกาศผลแล้ว ต้องซ่อนผลก่อนแก้คะแนน (ไปที่ &quot;ผล / เปิดผล&quot;)</p>
      )}

      <div className="max-w-full overflow-x-auto rounded-xl bg-surface">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="sticky left-0 z-10 min-w-[8.5rem] bg-surface p-2 text-left">ผู้แข่ง</th>
              {judges.map((j) => <th key={j} className={`p-2 text-left ${criteriaMode ? "min-w-[13rem]" : "min-w-[9rem]"}`}>กรรมการ {j}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const done = judges.filter((j) => sheetOf(r.entryId, j)).length;
              const status = done === 0 ? "ยังไม่มีคะแนน" : done >= category.judge_count ? "ครบ" : `ขาด ${category.judge_count - done} ใบ`;
              const tone = done === 0 ? "bg-white/10 text-muted" : done >= category.judge_count ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-200";
              return (
                <tr key={r.entryId} className="border-t border-white/10 align-top">
                  <td className="sticky left-0 z-10 bg-surface p-2">
                    <div className="num font-bold text-accent">{r.code}</div>
                    <div className="text-xs">{r.name}</div>
                    <span className={`mt-1 inline-block rounded px-2 py-0.5 text-[11px] ${tone}`}>{status}</span>
                  </td>
                  {judges.map((j) => (
                    <td key={j} className="p-2">
                      <ScoreCell key={`${r.entryId}-${j}`} category={category} row={r} judgeNo={j} sheet={sheetOf(r.entryId, j)} locked={published} />
                    </td>
                  ))}
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td className="p-4 text-muted" colSpan={judges.length + 1}>ยังไม่มีผู้แข่งในประเภทนี้</td></tr>}
          </tbody>
        </table>
      </div>

      <details className="rounded-xl bg-surface p-3">
        <summary className="cursor-pointer text-sm font-bold">ประวัติการแก้ ({audit.length})</summary>
        <div className="mt-2 max-w-full overflow-x-auto">
          <table className="w-full min-w-[34rem] text-xs">
            <thead className="text-muted"><tr><th className="p-1 text-left">เวลา</th><th className="p-1 text-left">ใคร</th><th className="p-1 text-left">รายการ</th><th className="p-1 text-left">กรรมการ</th><th className="p-1 text-left">ทำอะไร</th><th className="p-1 text-left">ก่อน → หลัง</th></tr></thead>
            <tbody>
              {audit.map((a) => (
                <tr key={a.id} className="border-t border-white/10">
                  <td className="whitespace-nowrap p-1">{a.at}</td><td className="p-1">{a.by}</td><td className="num p-1">{a.entry}</td><td className="p-1">{a.judge ?? "-"}</td><td className="p-1">{a.action}</td>
                  <td className="p-1">{a.before ?? "-"} → {a.after ?? "-"}</td>
                </tr>
              ))}
              {audit.length === 0 && <tr><td className="p-2 text-muted" colSpan={6}>ยังไม่มีประวัติ</td></tr>}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
