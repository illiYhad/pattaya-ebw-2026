import { RUN_TIMES, startHHMM } from "@/lib/schedule";

// ข้อมูลงานจริง — หน้าอื่นอ่านจากที่นี่ที่เดียว (ที่มา: DATA_EasternBeautyWellness_2026.md)
export const EVENT = {
  /** บรรทัดรอง */
  titleLine1: "การแข่งขันชิงแชมป์ภาคตะวันออก แข่งขันสักคิ้ว สุขภาพความงาม",
  /** ชื่องาน (เด่นสุด) */
  titleLine2: "EASTERN BEAUTY & WELLNESS CHAMPIONSHIP 2026",
  /** ชื่อสั้นบนจอ/แท็บ */
  shortTitle: "EBW Championship 2026",
  organizer: "สมาคม PMAT",
  organizerEn: "Permanent Make Up Association (Thailand)",
  venue: "โรงแรมเอเชียพัทยา",
  venueEn: "Asia Pattaya Hotel",
  provider: "Balehm Tech Studio",
  /** วันแข่ง (วันเดียว) — แก้ได้จากตั้งค่างาน */
  days: ["2026-10-30"],
  timezone: "Asia/Bangkok",
} as const;

/** วันแข่งวันแรก */
export const FIRST_DAY = EVENT.days[0];

/** กำหนดการทั้งวัน (จากโปสเตอร์) */
export type ScheduleItem = {
  /** เวลาเริ่ม HH:MM (ใช้หมุนเข็มนาฬิกาและ <time>) */
  start: string;
  time: string;
  label: string;
  /** ข้อความหลายบรรทัดแบบโปสเตอร์ (แต่ละวลีย่อยห้ามขาดกลางคำ) */
  lines?: string[][];
  /** รูปประกอบท้ายแถว (public/schedule/) */
  art?: string;
};

// K-P5a: เวลาที่มีใน Run of Show ดึงจาก lib/schedule.ts (แหล่งเดียวกับบัตรห้อยคอ) — ห้ามพิมพ์เวลาซ้ำ · แถวที่ run-of-show ไม่มี (เริ่มแข่ง 10.00 · ของว่าง) คงค่าเดิมจากโปสเตอร์
const row = (time: string) => ({ start: startHHMM(time), time });

export const SCHEDULE: ScheduleItem[] = [
  { ...row(RUN_TIMES.registration), label: "ลงทะเบียน", art: "01-shell.png" },
  { ...row(RUN_TIMES.opening), label: "พิธีเปิดงาน", art: "02-mic.png" },
  { start: "10:00", time: "10.00", label: "เริ่มการแข่งขันทุกประเภท", art: "04-cosmetics.png" },
  { ...row(RUN_TIMES.plaque), label: "มอบโล่กรรมการ", art: "03-plaque.png" },
  { ...row(RUN_TIMES.lunch), label: "รับประทานอาหารบุฟเฟต์", art: "05-buffet.png" },
  { ...row(RUN_TIMES.speaker), label: "ชมโชว์ Prime Speaker", art: "06-chair.png" },
  { start: "15:00", time: "15.00–15.30", label: "รับประทานอาหารว่าง", art: "07-teacup.png" },
  {
    ...row(RUN_TIMES.results),
    label: "ประกาศผลรางวัลและมอบถ้วย พร้อมถ่ายรูปร่วมกัน และพิธีปิดงาน",
    lines: [["ประกาศผลรางวัล", "และมอบถ้วย"], ["พร้อมถ่ายรูปร่วมกัน ", "และพิธีปิดงาน"]],
  },
];

export const STATION_COUNT: Record<string, number> = { ebw: 1 };
