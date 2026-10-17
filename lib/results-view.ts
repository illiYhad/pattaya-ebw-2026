import type { Standing } from "@/lib/types";

// ตัวช่วยแสดงผลคะแนนฝั่งคนดู (หน้าเว็บ + overlay) — ใช้ข้อมูลจาก getPublicResults เท่านั้น
export const fmtScore = (n: number) => n.toFixed(2);
export const fmtJudge = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : String(n));
export const PENDING_TEXT = "กำลังให้คะแนน";
export const PENDING_NOTE = "ผลคะแนนและอันดับจะแสดงเมื่อประกาศผลแล้ว";

/** รายการอันดับ 1–3 เรียงตามอันดับ (ต้องตัดสินเสมอก่อนเปิดผล จึงไม่ซ้ำ) */
export const podiumOf = (standings: Standing[]): Standing[] =>
  standings.filter((s) => s.place !== undefined).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));

export const MEDAL_LABEL: Record<1 | 2 | 3, string> = { 1: "ที่ 1", 2: "ที่ 2", 3: "ที่ 3" };
