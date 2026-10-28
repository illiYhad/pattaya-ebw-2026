import { RUN_TIMES } from "@/lib/schedule";
import type { AthletePhoto, Category, Competitor, Entry, Session } from "@/lib/types";

// บัตรห้อยคอ (AD card) ใบ K-P5 — ตรรกะล้วน ไม่ import ฝั่ง server (ใช้ได้ทั้ง client component และสคริปต์ทดสอบ)
// ข้อความคงที่ทุกบรรทัดคัดจากใบงาน K-P5 (ซึ่งมาจากสคริปต์พิธีกร RUNOFSHOW_EBW2026) · ข้อมูลคนและประเภทมาจากระบบเท่านั้น ห้ามแต่งเพิ่ม

export type CardRoleKey = "competitor" | "judge" | "organizer" | "vip" | "speaker" | "sponsor";

export type CardRole = {
  en: string;
  th: string;
  /** สีแถบด้านล่างหน้าบัตร / ช่องบทบาทด้านหลัง */
  bg: string;
  fg: string;
  /** ป้ายช่องรอง "อังกฤษ · ไทย" */
  secondLabel: string;
};

export const CARD_ROLE_ORDER: CardRoleKey[] = ["competitor", "judge", "organizer", "vip", "speaker", "sponsor"];

export const CARD_ROLES: Record<CardRoleKey, CardRole> = {
  competitor: { en: "COMPETITOR", th: "ผู้เข้าร่วมแข่งขัน", bg: "#1C8A94", fg: "#FFFFFF", secondLabel: "CATEGORY · ประเภทที่แข่ง" },
  judge: { en: "JUDGE", th: "คณะกรรมการตัดสิน", bg: "#F2CC2E", fg: "#1E1A08", secondLabel: "CATEGORY · ประเภทที่ตัดสิน" },
  organizer: { en: "ORGANIZER", th: "คณะผู้จัดงาน", bg: "#8A5A3C", fg: "#FFFFFF", secondLabel: "POSITION · ตำแหน่ง" },
  vip: { en: "VIP", th: "ผู้ทรงคุณวุฒิ / แขกผู้มีเกียรติ", bg: "#4B2A7B", fg: "#FFFFFF", secondLabel: "ORGANIZATION · หน่วยงาน / ประเทศ" },
  speaker: { en: "PRIME SPEAKER", th: "ผู้สาธิตบนเวที", bg: "#C4553A", fg: "#FFFFFF", secondLabel: "TECHNIQUE · เทคนิคที่สาธิต" },
  sponsor: { en: "SPONSOR", th: "ผู้ให้การสนับสนุน", bg: "#2E6FB7", fg: "#FFFFFF", secondLabel: "COMPANY · บริษัท / แบรนด์" },
};

/** บัตร 1 ใบ — ผู้แข่ง (จากระบบ) หรือบุคคลอื่น (กรอกชั่วคราว) */
export type CardData = {
  id: string;
  role: CardRoleKey;
  name_th: string;
  name_en: string;
  /** ช่องรอง: ผู้แข่ง = ชื่อประเภทไทยที่ลง (1–2 บรรทัด) · บทบาทอื่น = ข้อความที่กรอก */
  second: string[];
  shop?: string;
  /** รหัสผู้แข่ง = Competitor.code (รหัสเดียวกับไลฟ์) · บุคคลอื่นไม่มี */
  code?: string;
  /** URL รูป (cutout ของผู้แข่ง / object URL ของบุคคลอื่น) · ว่าง = ช่องรอรูป */
  photo?: string;
};

/** ประเภทบนหน้าหลังบัตร: เรียง sort_order · ช่วงจาก session · ชื่อไทยจากระบบ */
export type BackCategory = { id: string; session: Session; sessionLabel: string; name: string };

const SESSION_SHORT: Record<Session, string> = { morning: "เช้า", afternoon: "บ่าย", submit: "ส่งล่วงหน้า" };

export function backCategories(categories: Category[]): BackCategory[] {
  return [...categories]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => ({ id: c.id, session: c.session, sessionLabel: SESSION_SHORT[c.session], name: c.name }));
}

/** ผู้แข่งทุกคนในระบบ → บัตร (เรียงตามรหัส) · รูปใช้ cutout ถ้ามี (แอดมินพิมพ์บัตรของตัวเอง ไม่ใช่การแสดงสาธารณะ จึงไม่ดู consent) */
export function competitorCards(categories: Category[], competitors: Competitor[], entries: Entry[], photos: AthletePhoto[]): CardData[] {
  const catName = new Map(categories.map((c) => [c.id, c]));
  return [...competitors]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((c) => {
      const second = entries
        .filter((e) => e.competitor_id === c.id)
        .map((e) => catName.get(e.category_id))
        .filter((x): x is Category => !!x)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((x) => x.name);
      return {
        id: c.id,
        role: "competitor" as const,
        name_th: c.name_th,
        name_en: c.name_en,
        second,
        shop: c.shop || undefined,
        code: c.code,
        photo: photos.find((p) => p.person_key === c.person_key)?.cutout_url || undefined,
      };
    });
}

const EN_MONTH = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
const TH_MONTH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/** "2026-10-30" → { en: "30 OCTOBER 2026", th: "30 ต.ค. 2026" } (ปี ค.ศ. ตามแบบบัตร) · รูปแบบผิด = ว่าง */
export function eventDateLabels(ymd: string | undefined): { en: string; th: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd ?? "");
  if (!m) return { en: "", th: "" };
  const month = Number(m[2]) - 1;
  if (month < 0 || month > 11) return { en: "", th: "" };
  const day = Number(m[3]);
  return { en: `${day} ${EN_MONTH[month]} ${m[1]}`, th: `${day} ${TH_MONTH[month]} ${m[1]}` };
}

/** กำหนดการหลังบัตร (คัดจากใบ K-P5 ตามสคริปต์พิธีกร) · time ว่าง = บรรทัดไม่มีเวลา */
export const CARD_PROGRAM: { time?: string; text: string }[] = [
  { time: RUN_TIMES.opening, text: "พิธีเปิดการแข่งขัน" },
  { text: "ภาคเช้า แข่งขัน 4 ประเภท" },
  { time: RUN_TIMES.plaque, text: "มอบโล่ผู้จัดงาน ผู้สนับสนุน และกรรมการ" },
  { text: "ภาคบ่าย แข่งขัน 2 ประเภท" },
  { text: "สาธิตจาก Prime Speaker" },
  { time: RUN_TIMES.results, text: "ประกาศผลและมอบถ้วยรางวัลทุกประเภท" },
  { time: RUN_TIMES.closing, text: "พิธีปิดการแข่งขัน" },
];

export const CARD_TEXT = {
  titleTh: "การแข่งขันชิงแชมป์ภาคตะวันออก · แข่งขันสักคิ้ว สุขภาพความงาม",
  venueLine: `${RUN_TIMES.venueHours} น.`,
  organizerLine: "จัดโดย สมาคมนักออกแบบตกแต่งคิ้วประเทศไทย (PMAT)",
  notice: "บัตรนี้ใช้เฉพาะบุคคล ห้ามโอนสิทธิ์ · โปรดติดบัตรตลอดเวลาในงาน",
  systemBy: "ระบบโดย Balehm Tech Studio",
  register: `ลงทะเบียน ${RUN_TIMES.registration} น. · @Asia Pattaya Hotel, Pattaya Thailand`,
  systemLive: "ระบบและไลฟ์โดย Balehm Tech Studio",
} as const;

/** จำกัดความยาวไฟล์รูปที่เลือกเองในแท็บ "บุคคลอื่น" */
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

/** ขนาดฟอนต์ชื่อไทยตามความยาว — ชื่อยาวหดลง ไม่ล้นกล่อง */
export function nameFontPx(name: string): number {
  const n = Array.from(name).length;
  if (n <= 16) return 21;
  if (n <= 26) return 17;
  if (n <= 36) return 14;
  return 12;
}

// ---------- K-P5c: นำเข้าไฟล์รายชื่อบุคคลอื่น (.tsv/.txt) · อ่านในเบราว์เซอร์อย่างเดียว ----------

export type ImportedCard = CardData & {
  /** กุญแจจับคู่รูป: คอลัมน์ photo ถ้ามี ไม่งั้นชื่อไฟล์ท้ายสุดของ poster_file */
  photoKey?: string;
};
export type ImportResult = { cards: ImportedCard[]; skipped: { row: number; reason: string }[] };

const ROLE_KEYS = new Set<string>(CARD_ROLE_ORDER);
/** ชื่อไฟล์ท้ายสุดของ path (รองรับทั้ง \ และ /) */
export const baseName = (p: string) => p.trim().split(/[\/]/).pop() ?? "";

/** อ่านหัวคอลัมน์ตามชื่อ (ไม่ผูกลำดับ) · ตัด BOM · คอลัมน์ที่ไม่รู้จักข้าม · row = เลขบรรทัดในไฟล์ (หัว = 1) */
export function parseOthersTable(text: string): ImportResult {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const out: ImportResult = { cards: [], skipped: [] };
  const head = (lines[0] ?? "").split("\t").map((h) => h.trim().toLowerCase());
  const col = (k: string) => head.indexOf(k);
  const [iRole, iSecond, iTh, iEn, iPoster, iPhoto] = ["role", "second", "name_th", "name_en", "poster_file", "photo"].map(col);
  if (iRole < 0 || (iTh < 0 && iEn < 0)) {
    out.skipped.push({ row: 1, reason: "ไม่พบหัวคอลัมน์ role และ name_th/name_en" });
    return out;
  }
  const cell = (cells: string[], i: number) => (i < 0 ? "" : (cells[i] ?? "").trim());
  lines.slice(1).forEach((line, idx) => {
    if (!line.trim()) return;
    const row = idx + 2;
    const cells = line.split("\t");
    const role = cell(cells, iRole).toLowerCase();
    if (!ROLE_KEYS.has(role)) {
      out.skipped.push({ row, reason: `role ไม่รู้จัก "${cell(cells, iRole)}"` });
      return;
    }
    const name_th = cell(cells, iTh);
    const name_en = cell(cells, iEn);
    if (!name_th && !name_en) {
      out.skipped.push({ row, reason: "ไม่มีชื่อ" });
      return;
    }
    const key = cell(cells, iPhoto) || baseName(cell(cells, iPoster));
    out.cards.push({
      id: `i-${row}`,
      role: role as CardRoleKey,
      name_th,
      name_en,
      second: cell(cells, iSecond).split(" | ").map((s) => s.trim()).filter(Boolean),
      photoKey: key || undefined,
    });
  });
  return out;
}

/** จับคู่ชื่อไฟล์รูปกับ photoKey — เทียบชื่อเต็มก่อน (ไม่สนตัวพิมพ์) แล้วเทียบชื่อไม่รวมนามสกุล */
export function matchPhotoKey(fileName: string, key: string | undefined): boolean {
  if (!key) return false;
  const f = baseName(fileName).normalize("NFC").toLowerCase();
  const k = baseName(key).normalize("NFC").toLowerCase();
  if (f === k) return true;
  const stem = (s: string) => s.replace(/\.[a-z0-9]{2,5}$/i, "");
  return stem(f) === stem(k);
}
