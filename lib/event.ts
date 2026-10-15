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

export const SCHEDULE: ScheduleItem[] = [
  { start: "08:00", time: "08.00–08.30", label: "ลงทะเบียน", art: "01-shell.png" },
  { start: "08:30", time: "08.30–09.00", label: "พิธีเปิดงาน", art: "02-mic.png" },
  { start: "09:00", time: "09.00–10.00", label: "มอบโล่กรรมการ", art: "03-plaque.png" },
  { start: "10:00", time: "10.00", label: "เริ่มการแข่งขันทุกประเภท", art: "04-cosmetics.png" },
  { start: "12:00", time: "12.00–13.00", label: "รับประทานอาหารบุฟเฟต์", art: "05-buffet.png" },
  { start: "13:00", time: "13.00–15.00", label: "ชมโชว์ Prime Speaker", art: "06-chair.png" },
  { start: "15:00", time: "15.00–15.30", label: "รับประทานอาหารว่าง", art: "07-teacup.png" },
  {
    start: "15:30",
    time: "15.30–17.00",
    label: "ประกาศผลรางวัลและมอบถ้วย พร้อมถ่ายรูปร่วมกัน และพิธีปิดงาน",
    lines: [["ประกาศผลรางวัล", "และมอบถ้วย"], ["พร้อมถ่ายรูปร่วมกัน ", "และพิธีปิดงาน"]],
  },
];

export const STATION_COUNT: Record<string, number> = { ebw: 1 };
