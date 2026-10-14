import type { AthletePhoto, Category, Competitor, Criterion, Entry, EventConfig, ImportPreview, Medium, Session, Sponsor } from "@/lib/types";

/** แก้ประเภท: ช่องที่ส่ง null = ล้างค่า · ไม่ส่ง = ไม่เปลี่ยน */
export type CategoryPatch = {
  name?: string;
  name_en?: string;
  session?: Session;
  start_time?: string | null;
  end_time?: string | null;
  duration_min?: number | null;
  medium?: Medium | null;
  criteria?: Criterion[];
  judge_count?: number;
  pending_notes?: string[];
};
export type CompetitorInput = { name_th: string; name_en?: string; shop?: string };
export type PhotoUpload = { original: Uint8Array; originalMime: string; cutout: Uint8Array; consent: boolean };
export type PhotoKind = "original" | "cutout";

export interface DataSource {
  // อ่าน
  getCategories(): Promise<Category[]>;
  getCompetitors(): Promise<Competitor[]>;
  getEntries(categoryId?: string): Promise<Entry[]>;
  getSponsors(): Promise<Sponsor[]>;
  getEventConfig(): Promise<EventConfig>;
  getPhotos(): Promise<AthletePhoto[]>;

  // ประเภท (แอดมิน) — ผิดกติกาให้ throw Error ข้อความไทย
  saveCategory(categoryId: string, patch: CategoryPatch): Promise<Category>;

  // ผู้แข่ง (แอดมิน)
  createCompetitor(input: CompetitorInput, categoryIds?: string[]): Promise<Competitor>;
  updateCompetitor(competitorId: string, patch: Partial<CompetitorInput>): Promise<Competitor>;
  /** ลบผู้แข่งพร้อมรายการที่ลง */
  deleteCompetitor(competitorId: string): Promise<void>;
  /** ลงประเภท (คนละไม่เกิน 2) */
  addEntry(competitorId: string, categoryId: string): Promise<Entry>;
  removeEntry(entryId: string): Promise<void>;
  setEntryCheckIn(entryId: string, checkedIn: boolean): Promise<Entry>;

  // นำเข้ารายชื่อจากตารางที่วาง — ซ้ำไม่สร้างซ้ำ
  previewImport(text: string): Promise<ImportPreview>;
  applyImport(text: string): Promise<ImportPreview>;

  // สปอนเซอร์
  createSponsor(input: Omit<Sponsor, "id">): Promise<Sponsor>;
  updateSponsor(sponsorId: string, patch: Partial<Omit<Sponsor, "id">>): Promise<Sponsor>;
  deleteSponsor(sponsorId: string): Promise<void>;

  // ตั้งค่างาน
  saveEventConfig(patch: Partial<Omit<EventConfig, "updated_at">>): Promise<EventConfig>;

  // รูปผู้แข่ง (ผูกกับ person_key ใช้ได้ทุกประเภท)
  savePhoto(personKey: string, upload: PhotoUpload): Promise<AthletePhoto>;
  setPhotoConsent(photoId: string, consent: boolean): Promise<AthletePhoto>;
  deletePhoto(photoId: string): Promise<void>;
  getPhotoFile(photoId: string, kind: PhotoKind): Promise<{ bytes: Uint8Array; mime: string } | { redirect: string } | null>;

  /** ฟังการเปลี่ยนของข้อมูล — mock: BroadcastChannel */
  subscribe(onChange: () => void): () => void;
}
