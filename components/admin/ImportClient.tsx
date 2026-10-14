"use client";

import React, { useState } from "react";
import type { ImportPreview, ImportRow } from "@/lib/types";
import { btn } from "@/components/ui/ConfirmButton";
import { MsgLine, useAct } from "@/components/ui/useAct";
import { applyImportAction, previewImportAction } from "@/app/admin/actions";

// ตัวอย่างคั่นด้วยแท็บ (รูปแบบที่ได้จากการคัดลอกจาก Excel / Google Sheets)
const EXAMPLE = [
  ["ชื่อไทย", "ชื่ออังกฤษ", "ประเภท 1", "ประเภท 2", "ร้าน"],
  ["ผู้แข่งตัวอย่าง 90", "Sample Competitor 90", "นวดหน้าคนจริง", "", "ร้านตัวอย่าง Z"],
  ["ผู้แข่งตัวอย่าง 91", "Sample Competitor 91", "hairstroke", "inbox", ""],
].map((r) => r.join("\t")).join("\n");

const STATUS: Record<ImportRow["status"], { label: string; cls: string }> = {
  new: { label: "ใหม่", cls: "text-emerald-400" },
  existing: { label: "มีอยู่แล้ว", cls: "text-muted" },
  error: { label: "ผิดพลาด", cls: "text-live" },
};

function Summary({ p, applied }: { p: ImportPreview; applied: boolean }) {
  const bad = p.rows.filter((r) => r.status === "error").length;
  return (
    <div className="space-y-2 rounded bg-surface/60 p-3 text-sm">
      <div className="font-bold text-accent-2">{applied ? "นำเข้าแล้ว" : "พรีวิว (ยังไม่บันทึก)"}</div>
      <div>ผู้แข่ง: ใหม่ {p.newCompetitors} · มีอยู่แล้ว {p.existingCompetitors}</div>
      <div>รายการลงแข่ง: ใหม่ {p.newEntries} · ซ้ำ (ข้าม) {p.existingEntries}</div>
      {bad > 0 && <div className="text-live">แถวที่ผิดพลาด {bad} แถว — จะถูกข้าม แก้ในตารางแล้วพรีวิวใหม่</div>}
      {p.errors.map((e) => <div key={e} className="text-live">{e}</div>)}
      {p.rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-xs">
            <thead className="text-muted">
              <tr><th className="py-1 text-left">แถว</th><th className="text-left">ชื่อไทย</th><th className="text-left">ชื่ออังกฤษ</th><th className="text-left">ประเภท</th><th className="text-left">ร้าน</th><th className="text-left">สถานะ</th></tr>
            </thead>
            <tbody>
              {p.rows.map((r) => (
                <tr key={r.row} className="border-t border-white/5 align-top">
                  <td className="py-1 pr-2 text-muted">{r.row}</td>
                  <td className="pr-2">{r.name_th || <span className="text-live">(ว่าง)</span>}</td>
                  <td className="pr-2 text-muted">{r.name_en}</td>
                  <td className="pr-2">{r.categories.join(" · ") || "-"}</td>
                  <td className="pr-2 text-muted">{r.shop ?? ""}</td>
                  <td className={STATUS[r.status].cls}>
                    {STATUS[r.status].label}
                    {r.errors.map((e) => <div key={e}>{e}</div>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ImportClient() {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [applied, setApplied] = useState<ImportPreview | null>(null);
  const { busy, msg, act } = useAct();

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        คัดลอกตารางจาก Excel / Google Sheets มาวาง (คอลัมน์ <b>ชื่อไทย · ชื่ออังกฤษ · ประเภท 1 · ประเภท 2 · ร้าน</b> — มีหัวตารางหรือไม่มีก็ได้) ·
        ประเภทพิมพ์เป็นชื่อไทย ชื่ออังกฤษ หรือรหัส (เช่น <code>facial</code>) · ชื่อซ้ำกับที่มีอยู่ = ใช้คนเดิม เพิ่มเฉพาะประเภทใหม่ · คนละไม่เกิน 2 ประเภท
      </p>
      <textarea
        className="h-56 w-full rounded bg-surface p-2 font-mono text-xs"
        placeholder={EXAMPLE}
        value={text}
        onChange={(e) => { setText(e.target.value); setPreview(null); setApplied(null); }}
      />
      <div className="flex flex-wrap gap-2">
        <button className={btn} disabled={busy || !text.trim()} onClick={async () => {
          setApplied(null);
          const r = await act(() => previewImportAction(text), "พรีวิวแล้ว — ตรวจตารางก่อนยืนยัน");
          setPreview(r.ok ? r.data ?? null : null);
        }}>พรีวิว</button>
        <button className={`${btn} text-accent`} disabled={busy || !preview || (preview.newCompetitors + preview.newEntries === 0)} onClick={async () => {
          const r = await act(() => applyImportAction(text), (d) => `นำเข้าแล้ว: ผู้แข่งใหม่ ${d?.newCompetitors ?? 0} · รายการใหม่ ${d?.newEntries ?? 0}`);
          if (r.ok) { setApplied(r.data ?? null); setPreview(null); setText(""); }
        }}>ยืนยันนำเข้า</button>
        <button className={btn} onClick={() => { setText(EXAMPLE); setPreview(null); setApplied(null); }}>ใส่ตัวอย่าง</button>
      </div>
      <MsgLine msg={msg} />
      {preview && <Summary p={preview} applied={false} />}
      {applied && <Summary p={applied} applied />}
    </div>
  );
}
