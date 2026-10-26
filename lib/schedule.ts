import { RUNOFSHOW_CUES, RUNOFSHOW_HEADER } from "@/lib/data/runofshow";

// K-P5a: เวลาสำคัญของวันงานที่ "เว็บ" (lib/event.ts SCHEDULE) และ "บัตรห้อยคอ" (lib/adcard.ts) ใช้ร่วมกัน
// แหล่งความจริงเดียว = lib/data/runofshow.ts (ถอดจาก RUNOFSHOW_EBW2026_ถอดจากแคปแชท.md) — ห้ามพิมพ์เวลาซ้ำที่อื่น
// ไม่ import ฝั่ง server (ใช้ได้ทั้งหน้าเว็บและสคริปต์ทดสอบ)

const RANGE = /(\d{1,2})[.:](\d{2})\s*(?:[–-]\s*(\d{1,2})[.:](\d{2}))?/;

/** "8.00–8.10" | "12:00–13.00" | "17:30" → "08.00–08.10" | "12.00–13.00" | "17.30" (จุดคั่น · เติมศูนย์ · ขีดกลางแบบ en-dash) */
export function normTime(raw: string): string {
  const m = RANGE.exec(raw);
  if (!m) throw new Error(`อ่านเวลาไม่ได้: "${raw}"`);
  const hm = (h: string, mm: string) => `${h.padStart(2, "0")}.${mm}`;
  return m[3] ? `${hm(m[1], m[2])}–${hm(m[3], m[4])}` : hm(m[1], m[2]);
}

/** เวลาเริ่มแบบ HH:MM สำหรับนาฬิกาและ <time> เช่น "08.30–09.00" → "08:30" */
export function startHHMM(norm: string): string {
  return norm.slice(0, 5).replace(".", ":");
}

function cueTime(n: number): string {
  const t = RUNOFSHOW_CUES.find((c) => c.cue === n)?.time;
  if (!t) throw new Error(`คิว ${n} ไม่มีเวลาใน run-of-show`);
  return normTime(t);
}

/** ต้นเวลาของคิวแรก ถึง ปลายเวลาของคิวสุดท้ายในช่วง (เช่น พิธีเปิด = คิว 1–5) */
function span(first: number, last: number): string {
  const a = cueTime(first).split("–")[0];
  const b = cueTime(last).split("–").pop()!;
  return `${a}–${b}`;
}

function headerTime(text: string): string {
  return normTime(text);
}

export const RUN_TIMES = {
  /** ลงทะเบียน — จากหัวเอกสาร run-of-show */
  registration: headerTime(RUNOFSHOW_HEADER.registration),
  /** พิธีเปิด = คิว 1–5 (8.00–9.00) */
  opening: span(1, 5),
  /** มอบโล่ = คิว 7 */
  plaque: cueTime(7),
  /** พักกลางวัน = คิว 8 */
  lunch: cueTime(8),
  /** สาธิต Prime Speaker = คิว 10 */
  speaker: cueTime(10),
  /** ประกาศผลและมอบถ้วย = คิว 11 */
  results: cueTime(11),
  /** พิธีปิด = คิว 12 */
  closing: cueTime(12),
  /** เวลางานทั้งวัน (หัวเอกสาร) */
  venueHours: headerTime(RUNOFSHOW_HEADER.timing),
} as const;
