"use client";

import React, { useState } from "react";
import type { Category, Criterion, Medium, Session } from "@/lib/types";
import { MEDIUM_LABEL, SESSION_LABEL, SESSION_ORDER, criteriaSummary, timeRangeOf } from "@/lib/view";
import { btn } from "@/components/ui/ConfirmButton";
import { MsgLine, useAct } from "@/components/ui/useAct";
import { saveCategoryAction } from "@/app/admin/categories/actions";

type Form = {
  name: string;
  name_en: string;
  session: Session;
  start_time: string;
  end_time: string;
  duration_min: string;
  medium: Medium | "";
  judge_count: string;
  criteria: { name: string; max: string }[];
  pending_notes: string;
};

const toForm = (c: Category): Form => ({
  name: c.name,
  name_en: c.name_en,
  session: c.session,
  start_time: c.start_time ?? "",
  end_time: c.end_time ?? "",
  duration_min: c.duration_min?.toString() ?? "",
  medium: c.medium ?? "",
  judge_count: String(c.judge_count),
  criteria: c.criteria.map((x) => ({ name: x.name, max: x.max?.toString() ?? "" })),
  pending_notes: c.pending_notes.join("\n"),
});

const inp = "min-w-0 rounded bg-bg p-2 text-sm";

function CategoryCard({ c, count }: { c: Category; count: number }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Form>(() => toForm(c));
  const { busy, msg, act } = useAct();
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));
  const setCrit = (i: number, patch: Partial<{ name: string; max: string }>) =>
    setF((p) => ({ ...p, criteria: p.criteria.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  const sum = f.criteria.reduce((a, x) => a + (Number(x.max) || 0), 0);
  const blank = f.criteria.filter((x) => x.max.trim() === "").length;
  const live = criteriaSummary(c);

  const save = () =>
    act(async () => {
      const criteria: Criterion[] = f.criteria.map((x) => {
        const m = x.max.trim();
        if (m === "") return { name: x.name };
        const n = Number(m);
        return { name: x.name, max: Number.isFinite(n) ? n : -1 };
      });
      const dur = f.duration_min.trim();
      return saveCategoryAction(c.id, {
        name: f.name,
        name_en: f.name_en,
        session: f.session,
        start_time: f.start_time.trim() || null,
        end_time: f.end_time.trim() || null,
        duration_min: dur === "" ? null : Number(dur),
        medium: f.medium || null,
        judge_count: Number(f.judge_count),
        criteria,
        pending_notes: f.pending_notes.split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
      });
    }, `บันทึก ${f.name} แล้ว`);

  return (
    <section id={c.code} className="rounded-xl bg-surface p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold">{c.name} <span className="text-sm font-normal text-muted">{c.name_en}</span></h2>
          <div className="text-sm text-muted">
            {SESSION_LABEL[c.session]} · {timeRangeOf(c)} · {c.medium ? MEDIUM_LABEL[c.medium] : "ไม่ระบุสิ่งที่ใช้แข่ง"} · ผู้แข่ง {count} คน · กรรมการ {c.judge_count} คน ·{" "}
            เกณฑ์ {c.criteria.length ? `${c.criteria.length} ข้อ รวม ${live.total}${live.blank ? ` (ว่าง ${live.blank})` : ""}` : "ยังไม่มี"}
          </div>
          {c.pending_notes.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-muted">
              {c.pending_notes.map((n) => <li key={n}>📝 {n}</li>)}
            </ul>
          )}
        </div>
        <button className={btn} onClick={() => setOpen((o) => !o)}>{open ? "ปิด" : "แก้ไข"}</button>
      </div>

      {open && (
        <div className="mt-4 space-y-3 border-t border-white/10 pt-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex flex-col text-xs text-muted">ชื่อไทย<input className={inp} value={f.name} onChange={(e) => set("name", e.target.value)} /></label>
            <label className="flex flex-col text-xs text-muted">ชื่ออังกฤษ<input className={inp} value={f.name_en} onChange={(e) => set("name_en", e.target.value)} /></label>
            <label className="flex flex-col text-xs text-muted">ช่วง
              <select className={inp} value={f.session} onChange={(e) => set("session", e.target.value as Session)}>
                {SESSION_ORDER.map((s) => <option key={s} value={s}>{SESSION_LABEL[s]}</option>)}
              </select>
            </label>
            <label className="flex flex-col text-xs text-muted">ใช้อะไรแข่ง
              <select className={inp} value={f.medium} onChange={(e) => set("medium", e.target.value as Medium | "")}>
                <option value="">ไม่ระบุ</option>
                {(Object.keys(MEDIUM_LABEL) as Medium[]).map((m) => <option key={m} value={m}>{MEDIUM_LABEL[m]}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-3 gap-2 sm:col-span-2">
              <label className="flex flex-col text-xs text-muted">เริ่ม (เช่น 10.00)<input className={inp} value={f.start_time} onChange={(e) => set("start_time", e.target.value)} /></label>
              <label className="flex flex-col text-xs text-muted">จบ<input className={inp} value={f.end_time} onChange={(e) => set("end_time", e.target.value)} /></label>
              <label className="flex flex-col text-xs text-muted">เวลาแข่ง (นาที)<input className={inp} inputMode="numeric" value={f.duration_min} onChange={(e) => set("duration_min", e.target.value)} /></label>
            </div>
            <label className="flex flex-col text-xs text-muted">จำนวนกรรมการ<input className={inp} inputMode="numeric" value={f.judge_count} onChange={(e) => set("judge_count", e.target.value)} /></label>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-muted">
              <span>เกณฑ์ให้คะแนน (คะแนนเต็มต่อข้อ เว้นว่างได้ = ไม่มีคะแนนต่อข้อ ใช้คะแนนรวมเต็ม 100)</span>
              <span className={sum === 100 ? "text-emerald-400" : "text-amber-300"}>รวม {sum}{blank ? ` · ว่าง ${blank} ข้อ` : ""}{f.criteria.length && sum !== 100 && !blank ? " (ไม่ใช่ 100)" : ""}</span>
            </div>
            <div className="space-y-1">
              {f.criteria.map((x, i) => (
                <div key={i} className="flex gap-2">
                  <span className="w-6 pt-2 text-right text-xs text-muted">{i + 1}.</span>
                  <input className={`${inp} flex-1`} placeholder="ชื่อเกณฑ์" value={x.name} onChange={(e) => setCrit(i, { name: e.target.value })} />
                  <input className={`${inp} w-20`} placeholder="เต็ม" inputMode="numeric" value={x.max} onChange={(e) => setCrit(i, { max: e.target.value })} />
                  <button className={btn} aria-label="ลบเกณฑ์" onClick={() => set("criteria", f.criteria.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
            </div>
            <button className={`${btn} mt-2`} onClick={() => set("criteria", [...f.criteria, { name: "", max: "" }])}>+ เพิ่มเกณฑ์</button>
          </div>

          <label className="flex flex-col text-xs text-muted">
            หมายเหตุ (บรรทัดละ 1 ข้อ · ว่าง = ไม่มี · แสดงเฉพาะในแอดมิน)
            <textarea className={`${inp} h-24`} value={f.pending_notes} onChange={(e) => set("pending_notes", e.target.value)} />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <button className={`${btn} text-accent`} disabled={busy} onClick={save}>บันทึก</button>
            <button className={btn} disabled={busy} onClick={() => setF(toForm(c))}>คืนค่าเดิม</button>
            <MsgLine msg={msg} />
          </div>
        </div>
      )}
    </section>
  );
}

export function CategoriesClient({ categories, counts }: { categories: Category[]; counts: Record<string, number> }) {
  return (
    <div className="space-y-3">
      {categories.map((c) => <CategoryCard key={`${c.id}-${c.updated_at}`} c={c} count={counts[c.id] ?? 0} />)}
    </div>
  );
}
