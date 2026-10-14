// ชนิดข้อมูลงาน EBW 2026 — ผู้แข่งรายบุคคล ไม่มีทีม ไม่มีแมตช์ (ใบ K-P1) · ที่มา DATA_EasternBeautyWellness_2026.md

export type Session = "morning" | "afternoon" | "submit";
export type Medium = "live_model" | "mannequin" | "skin_sheet";

/** เกณฑ์ให้คะแนน 1 ข้อ · max ว่าง = ไม่มีคะแนนต่อข้อ (กรรมการให้คะแนนรวมเต็ม 100) */
export type Criterion = { name: string; max?: number };

export type Category = {
  id: string;
  code: string;
  name: string;
  name_en: string;
  session: Session;
  /** เวลาเริ่ม–จบ เช่น "10.00" (ว่าง = ประเภทส่งล่วงหน้า) */
  start_time?: string;
  end_time?: string;
  duration_min?: number;
  /** ใช้อะไรแข่ง (ว่าง = โปสเตอร์ไม่ระบุ) */
  medium?: Medium;
  criteria: Criterion[];
  /** จำนวนกรรมการ (ตั้งค่าได้ · ค่าเริ่ม 3) */
  judge_count: number;
  /** หมายเหตุภายในของประเภท — แสดงเฉพาะแอดมิน (ไม่แสดงหน้าสาธารณะ) */
  pending_notes: string[];
  sort_order: number;
  updated_at: string;
};

export type Competitor = {
  id: string;
  /** รหัสผู้แข่ง EBW-001 … */
  code: string;
  name_th: string;
  name_en: string;
  /** ร้าน/สังกัด (ไม่บังคับ) */
  shop?: string;
  /** คนเดียวกันข้ามประเภท (ผูกรูป) = ชื่อไทย|ชื่ออังกฤษ แบบ normalize */
  person_key: string;
  updated_at: string;
};

/** ผู้แข่ง 1 คน ลง 1 ประเภท = 1 แถว · คนเดียวลงได้ไม่เกิน 2 ประเภท */
export type Entry = {
  id: string;
  competitor_id: string;
  category_id: string;
  is_checked_in: boolean;
  updated_at: string;
};

/** รูปผู้แข่ง 1 แถวต่อคน — URL ชี้ไป /api/photos/… */
export type AthletePhoto = {
  id: string;
  person_key: string;
  original_url: string;
  cutout_url: string;
  /** ได้รับความยินยอมให้ใช้รูป — false = ไม่แสดงบนหน้าสาธารณะ */
  consent: boolean;
  updated_at: string;
};

/** ตั้งค่างาน (แถวเดียว) */
export type EventConfig = {
  /** วันแข่ง (YYYY-MM-DD) */
  days: string[];
  /** ข้อความประกาศหน้าแรก (ว่าง = ไม่แสดง) */
  announcement: string;
  logo_url?: string;
  theme?: { accent?: string; accent2?: string; bg?: string };
  updated_at: string;
};

export type ImportRowStatus = "new" | "existing" | "error";
/** 1 แถวจากตารางที่วางในหน้านำเข้า */
export type ImportRow = {
  row: number;
  name_th: string;
  name_en: string;
  shop?: string;
  /** ชื่อประเภทที่จับคู่ได้ */
  categories: string[];
  status: ImportRowStatus;
  errors: string[];
};

export type ImportPreview = {
  rows: ImportRow[];
  newCompetitors: number;
  existingCompetitors: number;
  newEntries: number;
  existingEntries: number;
  /** ข้อผิดพลาดระดับตาราง (ไม่ใช่รายแถว) */
  errors: string[];
};

export type SponsorLevel = "main" | "co" | "support";
export type SponsorPosition = "bottom_ticker" | "corner" | "stinger" | "full_screen";

export type Sponsor = {
  id: string;
  name: string;
  level: SponsorLevel;
  position: SponsorPosition;
  sequence: number;
  logo_url: string;
  is_active: boolean;
};

export type StaffRole = "admin" | "result_staff" | "stream_operator";

/** ฉากบน overlay (ไม่มี BRACKET แล้ว) */
export type Scene = "STARTING" | "LIVE" | "BREAK" | "RESULT" | "SPONSOR";

// ---------- ระบบคะแนนกรรมการ (ใบ K-P2a) ----------

export type ScoreMethod = "mean" | "trimmed_mean";

/** ใบคะแนนกรรมการ 1 คน × 1 รายการ */
export type ScoreSheet = {
  id: string;
  entry_id: string;
  category_id: string;
  /** 1 … judge_count ของประเภท */
  judge_no: number;
  /** โหมดรายเกณฑ์: เรียงตาม category.criteria */
  criteria_scores?: number[];
  total: number;
  updated_at: string;
  updated_by?: string;
};

export type TieDecision = { entry_ids: string[]; decided_at: string; decided_by?: string };

/** สถานะผลของประเภท — 1 แถวต่อประเภท */
export type CategoryResultState = {
  category_id: string;
  method: ScoreMethod;
  published: boolean;
  published_at?: string;
  published_by?: string;
  tie_decisions: TieDecision[];
};

export type ScoreAuditAction = "save" | "clear" | "method" | "tie_decision" | "tie_reset" | "publish" | "hide";

/** บันทึกการเปลี่ยนคะแนน — เขียนต่อท้ายอย่างเดียว ห้ามแก้/ลบ */
export type ScoreAudit = {
  id: string;
  at: string;
  by?: string;
  category_id: string;
  entry_id?: string;
  judge_no?: number;
  action: ScoreAuditAction;
  before?: string;
  after?: string;
};

export type StandingStatus = "complete" | "incomplete" | "no_scores";

/** ผล 1 รายการ */
export type Standing = {
  entry_id: string;
  competitor_id: string;
  sheets_done: number;
  status: StandingStatus;
  judge_totals: number[];
  criteria_avg?: number[];
  score?: number;
  tiebreak_score?: number;
  rank?: number;
  place?: 1 | 2 | 3;
  tie_unresolved: boolean;
};

export type ResultBoard = {
  category_id: string;
  method: ScoreMethod;
  published: boolean;
  /** เรียงอันดับแล้ว */
  standings: Standing[];
  /** ข้อความไทย */
  warnings: string[];
  can_publish: boolean;
};

/** ผลที่คนทั่วไปเห็น — ยังไม่ประกาศ = ไม่มีตัวเลขใด ๆ ติดไปเลย */
export type PublicResults = { status: "pending" } | { status: "published"; standings: Standing[] };
