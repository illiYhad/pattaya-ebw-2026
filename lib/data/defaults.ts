import type { AthletePhoto, Category, Competitor, Entry, EventConfig, Sponsor } from "@/lib/types";
import { EVENT } from "@/lib/event";

export type PhotoFiles = { original: Uint8Array; originalMime: string; cutout: Uint8Array };

export type Store = {
  categories: Category[];
  competitors: Competitor[];
  entries: Entry[];
  sponsors: Sponsor[];
  eventConfig: EventConfig;
  photos: AthletePhoto[];
  /** ไฟล์รูปในหน่วยความจำ (mock) key = photo id */
  photoFiles: Map<string, PhotoFiles>;
};

export function defaultEventConfig(): EventConfig {
  return { days: [...EVENT.days], announcement: "", updated_at: "" };
}

export const emptyStore = (): Store => ({
  categories: [],
  competitors: [],
  entries: [],
  sponsors: [],
  eventConfig: defaultEventConfig(),
  photos: [],
  photoFiles: new Map(),
});

/** ข้อความ "รอยืนยัน" ที่ใช้ซ้ำหลายประเภท */
const NO_CRITERIA_IN_DATA = "ชื่อเกณฑ์ให้คะแนนยังไม่ได้ถอดจากโปสเตอร์ลง DATA (DATA ระบุว่ามีหัวข้อแต่ไม่มีคะแนนต่อข้อ) — รออลิส/ครูหนึ่ง";
const JUDGES_PENDING = "จำนวนกรรมการจริง (ค่าเริ่ม 3)";

/**
 * 7 ประเภทตั้งต้น ตาม DATA หมวด "ประเภทการแข่งขันและเวลา" + "เกณฑ์ให้คะแนน" (นวดสปอร์ตยกเลิกแล้ว ไม่ใส่)
 * ชื่ออังกฤษเป็นคำแปลร่างของโคลท์ (โปสเตอร์ให้แค่ Hairstroke / IN BOX) — แอดมินแก้ได้
 */
export const DEFAULT_CATEGORIES: Omit<Category, "updated_at">[] = [
  {
    id: "cat-hairstroke", code: "hairstroke", sort_order: 1,
    name: "PMU สักคิ้วแฮร์สโตรก", name_en: "PMU Hairstroke Eyebrow",
    session: "morning", start_time: "10.00", end_time: "11.30", duration_min: 90,
    criteria: [], judge_count: 3,
    pending_notes: [NO_CRITERIA_IN_DATA, "ใช้อะไรแข่ง (คนจริง/หุ่น/แผ่นหนัง) โปสเตอร์ไม่ระบุ", JUDGES_PENDING],
  },
  {
    id: "cat-lip", code: "lip", sort_order: 2,
    name: "สักปากฝังสี บนแผ่นหนังนูน", name_en: "Lip Blush (3D Skin Sheet)",
    session: "morning", start_time: "10.00", end_time: "11.30", duration_min: 90, medium: "skin_sheet",
    criteria: [], judge_count: 3,
    pending_notes: [NO_CRITERIA_IN_DATA, JUDGES_PENDING],
  },
  {
    id: "cat-lash", code: "lash", sort_order: 3,
    name: "ต่อขนตาหัวหุ่น (เส้นต่อเส้น)", name_en: "Classic Eyelash Extension (Mannequin)",
    session: "morning", start_time: "10.00", end_time: "11.30", duration_min: 90, medium: "mannequin",
    criteria: [], judge_count: 3,
    pending_notes: ["ยังไม่มีเกณฑ์ให้คะแนนใน DATA", "เงื่อนไขแชมป์เก่าลงสมัครได้ (2 ปี vs 1 ปี) รอยืนยัน", JUDGES_PENDING],
  },
  {
    id: "cat-facial", code: "facial", sort_order: 4,
    name: "นวดหน้าคนจริง", name_en: "Facial Massage (Live Model)",
    session: "morning", start_time: "10.00", end_time: "11.00", duration_min: 60, medium: "live_model",
    criteria: [
      { name: "สุขลักษณะ", max: 10 },
      { name: "การดูแลสื่อสาร", max: 10 },
      { name: "ความต่อเนื่อง", max: 10 },
      { name: "ความถูกต้องและปลอดภัย", max: 20 },
      { name: "สรีระ", max: 10 },
      { name: "ปฏิกิริยาผู้รับ", max: 10 },
      { name: "บริหารเวลา", max: 10 },
      { name: "เทคนิคพิเศษ", max: 10 },
      { name: "ระยะเวลา", max: 10 },
    ],
    judge_count: 3,
    pending_notes: [JUDGES_PENDING],
  },
  {
    id: "cat-shading", code: "shading", sort_order: 5,
    name: "PMU สักคิ้วสไลด์เฉดดิ้ง", name_en: "PMU Shading Eyebrow",
    session: "afternoon", start_time: "13.30", end_time: "14.30", duration_min: 60,
    criteria: [], judge_count: 3,
    pending_notes: ["เวลาแข่ง 60 นาที (ตารางเวลา) หรือ 90 นาที (กติกา) — ตั้ง 60 ตามตารางไว้ก่อน", NO_CRITERIA_IN_DATA, "ใช้อะไรแข่ง (คนจริง/หุ่น/แผ่นหนัง) โปสเตอร์ไม่ระบุ", JUDGES_PENDING],
  },
  {
    id: "cat-thai-massage", code: "thai_massage", sort_order: 6,
    name: "นวดไทยฟรีสไตล์ คนจริง", name_en: "Thai Freestyle Massage (Live Model)",
    session: "afternoon", start_time: "13.30", end_time: "14.30", duration_min: 60, medium: "live_model",
    criteria: [
      { name: "บุคลิกภาพและมารยาท", max: 10 },
      { name: "เตรียมสถานที่", max: 10 },
      { name: "ต้อนรับ ซักประวัติ ความปลอดภัย", max: 10 },
      { name: "เทคนิคการนวด", max: 40 },
      { name: "แนะนำหลังนวด", max: 10 },
      { name: "ลำดับขั้นตอน", max: 10 },
      { name: "รักษาเวลา", max: 10 },
    ],
    judge_count: 3,
    pending_notes: [JUDGES_PENDING],
  },
  {
    id: "cat-inbox", code: "inbox", sort_order: 7,
    name: "สักคิ้วลายเส้น บนแผ่นหนังหนู (IN BOX)", name_en: "Hairstroke Eyebrow on Skin Sheet (IN BOX · pre-submitted)",
    session: "submit", medium: "skin_sheet",
    criteria: [], judge_count: 3,
    pending_notes: ["วันส่งผลงาน (โปสเตอร์เขียน 25 มี.ค. 2569 ซึ่งผ่านไปแล้ว)", NO_CRITERIA_IN_DATA, JUDGES_PENDING],
  },
];
