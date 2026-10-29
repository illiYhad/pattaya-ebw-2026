import type { AthletePhoto, Category, CategoryResultState, Competitor, Entry, EventConfig, ScoreAudit, ScoreSheet, Sponsor } from "@/lib/types";
import { EVENT } from "@/lib/event";
import { RUN_TIMES, slotFrom, startOfRange } from "@/lib/schedule";

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
  scoreSheets: ScoreSheet[];
  resultStates: CategoryResultState[];
  /** เขียนต่อท้ายอย่างเดียว */
  scoreAudit: ScoreAudit[];
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
  scoreSheets: [],
  resultStates: [],
  scoreAudit: [],
});

/** หัวข้อเกณฑ์ที่โปสเตอร์ไม่ให้คะแนนต่อข้อ (ไม่ใส่ max) → กรรมการให้คะแนนรวมเต็ม 100 ช่องเดียว */
const topics = (...names: string[]) => names.map((name) => ({ name }));

// K-P4b: เวลาเริ่มของช่วงเช้า/บ่ายมาจาก Run of Show (คิว 6 = เช้า 09.00 · คิว 9 = บ่าย 13.00) ผ่าน lib/schedule.ts · จบ = เริ่ม + ระยะเวลา
const MORNING = startOfRange(RUN_TIMES.competition);
const AFTERNOON = startOfRange(RUN_TIMES.afternoon);

/** หมายเหตุรอผู้จัดยืนยัน (ใบ K-P4b) — ห้ามเดาเกินที่ตารางผู้จัดบอก */
const NOTE_MORNING = "ตารางผู้จัดมีช่องแข่งเช้า 09.00–10.30 ช่องเดียว แต่มี 4 ประเภท (90/90/90/60) · รอผู้จัดยืนยันว่าจัดพร้อมกันหรือเหลื่อมกัน";
const NOTE_AFTERNOON = "คิว 9 ในตารางผู้จัดเขียน 90 นาที แต่หมายเหตุให้ตั้งเวลาถอยหลัง 120 นาที · และซ้อนกับคิว 10 (สาธิต) 13.00–15.00 · รอผู้จัดยืนยัน";

/**
 * 7 ประเภทตั้งต้น ตาม DATA หมวด "ประเภทการแข่งขันและเวลา" + "เกณฑ์ให้คะแนน" (นวดสปอร์ตยกเลิกแล้ว ไม่ใส่)
 * ชื่ออังกฤษเป็นคำแปลร่างของโคลท์ (โปสเตอร์ให้แค่ Hairstroke / IN BOX) · ค่าที่พี่หยัดตัดสิน 14 ต.ค. 11:20 (กรรมการ 3 คน · หมายเหตุว่าง = ไม่มีอะไรค้าง) — แอดมินแก้ได้
 */
export const DEFAULT_CATEGORIES: Omit<Category, "updated_at">[] = [
  {
    id: "cat-hairstroke", code: "hairstroke", sort_order: 1,
    name: "PMU สักคิ้วแฮร์สโตรก", name_en: "PMU Hairstroke Eyebrow",
    session: "morning", ...slotFrom(MORNING, 90),
    criteria: [], judge_count: 3,
    pending_notes: [NOTE_MORNING],
  },
  {
    id: "cat-lip", code: "lip", sort_order: 2,
    name: "สักปากฝังสี บนแผ่นหนังนูน", name_en: "Lip Blush (3D Skin Sheet)",
    session: "morning", ...slotFrom(MORNING, 90), medium: "skin_sheet",
    criteria: topics("ความสมดุลของการออกแบบรูปทรงปาก", "โครงสร้างและการออกแบบรูปปากต้องเข้ากัน", "ค่าน้ำหนักและความบอบช้ำของชั้นงาน", "การสร้างมิติเลเยอร์ปาก", "ความสะอาดของชั้นงาน"),
    judge_count: 3,
    pending_notes: [NOTE_MORNING],
  },
  {
    id: "cat-lash", code: "lash", sort_order: 3,
    name: "ต่อขนตาหัวหุ่น (เส้นต่อเส้น)", name_en: "Classic Eyelash Extension (Mannequin)",
    session: "morning", ...slotFrom(MORNING, 90), medium: "mannequin",
    criteria: [], judge_count: 3,
    pending_notes: ["เงื่อนไขแชมป์เก่าลงสมัครได้: โปสเตอร์ต่อขนตาเขียน 2 ปี ประเภทอื่น 1 ปี (ยังไม่ได้ปรับให้ตรงกัน)", NOTE_MORNING],
  },
  {
    id: "cat-facial", code: "facial", sort_order: 4,
    name: "นวดหน้าคนจริง", name_en: "Facial Massage (Live Model)",
    session: "morning", ...slotFrom(MORNING, 60), medium: "live_model",
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
    pending_notes: [NOTE_MORNING],
  },
  {
    id: "cat-shading", code: "shading", sort_order: 5,
    name: "PMU สักคิ้วสไลด์เฉดดิ้ง", name_en: "PMU Shading Eyebrow",
    session: "afternoon", ...slotFrom(AFTERNOON, 90),
    criteria: topics("ความสมดุลของทรงคิ้วทั้ง 2 ข้าง", "การไล่เฉดสีที่เนียนเป็นธรรมชาติเท่ากันทั้ง 2 ข้าง", "ความเป็นไปได้จริง ค่าน้ำหนักและความบอบช้ำของชั้นงาน", "การสร้างมิติและเลเยอร์ที่เท่ากันของคิ้วทั้ง 2 ข้าง"),
    judge_count: 3,
    pending_notes: [NOTE_AFTERNOON],
  },
  {
    id: "cat-thai-massage", code: "thai_massage", sort_order: 6,
    name: "นวดไทยฟรีสไตล์ คนจริง", name_en: "Thai Freestyle Massage (Live Model)",
    session: "afternoon", ...slotFrom(AFTERNOON, 60), medium: "live_model",
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
    pending_notes: [NOTE_AFTERNOON],
  },
  {
    id: "cat-inbox", code: "inbox", sort_order: 7,
    name: "สักคิ้วลายเส้น บนแผ่นหนังหนู (IN BOX)", name_en: "Hairstroke Eyebrow on Skin Sheet (IN BOX · pre-submitted)",
    session: "submit", medium: "skin_sheet",
    criteria: topics("ความสมดุลของทรงคิ้วทั้ง 2 ข้าง", "ลวดลายของคิ้วทั้ง 2 ข้าง", "ความสะอาด ค่าน้ำหนักและความบอบช้ำของชั้นงาน", "การสร้างมิติเท่ากันของทั้ง 2 ข้าง"),
    judge_count: 3,
    pending_notes: ["ยังไม่กำหนดวันส่งผลงาน (วันที่ในโปสเตอร์เป็นข้อความเก่า) — ใช้ข้อความ \"ส่งผลงานล่วงหน้าก่อนวันแข่ง\""],
  },
];
