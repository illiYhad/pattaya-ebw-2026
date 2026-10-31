"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { notifyDataChanged } from "@/lib/data/live";
import { btn } from "@/components/ui/ConfirmButton";

type Person = { code: string; key: string; name: string };
type Status = "ready" | "unknown" | "has-photo" | "uploading" | "done" | "failed";
type Row = { file: File; code: string | null; person: Person | null; status: Status; error?: string };

const FILE_RE = /^EBW-(\d{3})\.(jpe?g|png|webp)$/i;
const CONCURRENCY = 3;
const MAX_FILE_BYTES = 3_500_000;
const STATUS_LABEL: Record<Status, string> = {
  ready: "พร้อม",
  unknown: "ไม่พบรหัสในระบบ",
  "has-photo": "มีรูปอยู่แล้ว",
  uploading: "กำลังอัปโหลด…",
  done: "สำเร็จ",
  failed: "ล้มเหลว",
};
const STATUS_TONE: Record<Status, string> = {
  ready: "",
  unknown: "text-live",
  "has-photo": "opacity-70",
  uploading: "",
  done: "text-green-400",
  failed: "text-live",
};

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("อ่านไฟล์ไม่ได้"));
    r.readAsDataURL(file);
  });
}

/** อัปโหลดรูปหลายไฟล์ → POST /api/photos ทีละ 3 ไฟล์ · โปสเตอร์ไม่ใช่รูปตัดพื้น จึงส่งไฟล์เดียวกันเป็นทั้ง original และ cutout */
export function BulkPhotoUploadClient({ people, withPhoto }: { people: Person[]; withPhoto: string[] }) {
  const router = useRouter();
  const byCode = useMemo(() => new Map(people.map((p) => [p.code.toUpperCase(), p])), [people]);
  const [hasPhoto, setHasPhoto] = useState(() => new Set(withPhoto));
  const [rows, setRows] = useState<Row[]>([]);
  const [skipExisting, setSkipExisting] = useState(true);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  function pick(files: FileList | null) {
    if (!files) return;
    setRows(
      Array.from(files).map((file) => {
        const m = FILE_RE.exec(file.name);
        const code = m ? `EBW-${m[1]}` : null;
        const person = code ? byCode.get(code) ?? null : null;
        const status: Status = !person ? "unknown" : hasPhoto.has(person.key) ? "has-photo" : "ready";
        return { file, code, person, status };
      }),
    );
  }

  const count = (s: Status) => rows.filter((r) => r.status === s).length;
  const toSend = (r: Row) => r.status === "ready" || r.status === "failed" || (r.status === "has-photo" && !skipExisting);
  const pending = rows.filter(toSend).length;
  const finished = count("done") + count("failed");

  function patch(i: number, p: Partial<Row>) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...p } : r)));
  }

  async function uploadOne(i: number, row: Row) {
    patch(i, { status: "uploading", error: undefined });
    try {
      // ส่งไฟล์ซ้ำ 2 ช่อง (original + cutout) เป็น base64 → ไฟล์ใหญ่กว่านี้จะเกินเพดานขนาดคำขอ 10 MB ก่อนถึงด่าน 6 MB ของ API
      if (row.file.size > MAX_FILE_BYTES) throw new Error("ไฟล์ใหญ่เกิน 3.5 MB — ย่อรูปก่อนอัปโหลด");
      const url = await readDataUrl(row.file);
      const res = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person_key: row.person!.key, original: url, cutout: url, consent }),
      });
      const j = (await res.json().catch(() => ({ ok: false, error: `เซิร์ฟเวอร์ตอบ ${res.status}` }))) as { ok: boolean; error?: string };
      if (!j.ok) throw new Error(j.error ?? "บันทึกไม่สำเร็จ");
      patch(i, { status: "done" });
      setHasPhoto((s) => new Set(s).add(row.person!.key));
    } catch (e) {
      patch(i, { status: "failed", error: e instanceof Error ? e.message : "บันทึกไม่สำเร็จ" });
    }
  }

  async function uploadAll() {
    const queue = rows.map((r, i) => [i, r] as const).filter(([, r]) => toSend(r));
    setBusy(true);
    let next = 0;
    const worker = async () => {
      while (next < queue.length) {
        const [i, r] = queue[next++];
        await uploadOne(i, r);
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
    setBusy(false);
    notifyDataChanged();
    router.refresh();
  }

  const big = `${btn} min-h-11`;
  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded bg-surface/60 p-3 text-sm">
        <label className="block space-y-1">
          <span className="font-bold">เลือกไฟล์รูป (ชื่อไฟล์ต้องเป็น EBW-###.jpg / .png / .webp)</span>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(e) => pick(e.target.files)}
            className="block w-full rounded bg-surface p-2"
          />
        </label>
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" checked={skipExisting} disabled={busy} onChange={(e) => setSkipExisting(e.target.checked)} />
          ข้ามคนที่มีรูปอยู่แล้ว
        </label>
        <label className="flex min-h-11 items-start gap-2">
          <input type="checkbox" className="mt-1" checked={consent} disabled={busy} onChange={(e) => setConsent(e.target.checked)} />
          <span>
            ผู้แข่งยินยอมให้แสดงรูปบนหน้าเว็บ/จอไลฟ์
            <span className="block opacity-70">ถ้าไม่ติ๊ก รูปจะถูกเก็บแต่ยังไม่แสดงต่อสาธารณะ</span>
          </span>
        </label>
      </div>

      {rows.length > 0 && (
        <>
          <p className="text-sm font-bold">
            พร้อมอัปโหลด {count("ready")} รูป · ไม่พบรหัส {count("unknown")} · มีรูปแล้ว {count("has-photo")}
            {finished > 0 && ` · สำเร็จ ${count("done")} · ล้มเหลว ${count("failed")}`}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={big} disabled={busy || pending === 0} onClick={uploadAll}>
              {busy ? "กำลังอัปโหลด…" : count("failed") > 0 ? `ลองใหม่เฉพาะที่ล้มเหลว (${pending})` : `อัปโหลดทั้งหมด (${pending})`}
            </button>
            {(busy || finished > 0) && (
              <progress className="h-3 w-48" max={finished + pending + count("uploading")} value={finished} />
            )}
          </div>
          <div className="overflow-x-auto rounded bg-surface/60">
            <table className="w-full min-w-120 text-left text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="p-2">ชื่อไฟล์</th>
                  <th className="p-2">รหัส</th>
                  <th className="p-2">ชื่อผู้แข่ง</th>
                  <th className="p-2">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.file.name}-${i}`} className="border-b border-white/5">
                    <td className="p-2 break-all">{r.file.name}</td>
                    <td className="p-2">{r.code ?? "—"}</td>
                    <td className="p-2">{r.person?.name ?? "—"}</td>
                    <td className={`p-2 ${STATUS_TONE[r.status]}`}>
                      {STATUS_LABEL[r.status]}
                      {r.error && <span className="block text-xs">{r.error}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
