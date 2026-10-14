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
export const SCHEDULE: { time: string; label: string }[] = [
  { time: "08.00–08.30", label: "ลงทะเบียน" },
  { time: "08.30–09.00", label: "พิธีเปิดงาน" },
  { time: "09.00–10.00", label: "มอบโล่กรรมการ" },
  { time: "10.00", label: "เริ่มการแข่งขันทุกประเภท" },
  { time: "12.00–13.00", label: "อาหารบุฟเฟต์" },
  { time: "13.00–15.00", label: "ชมโชว์ Prime Speaker" },
  { time: "15.00–15.30", label: "อาหารว่าง" },
  { time: "15.30–17.00", label: "ประกาศผล มอบถ้วย ถ่ายรูปร่วม พิธีปิด" },
];

export const STATION_COUNT: Record<string, number> = { ebw: 1 };
