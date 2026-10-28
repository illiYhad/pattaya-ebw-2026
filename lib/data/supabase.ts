import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AthletePhoto, Category, CategoryResultState, Competitor, Entry, EventConfig, ScoreAudit, ScoreSheet, Sponsor,
} from "@/lib/types";
import { PHOTO_BUCKET } from "@/lib/supabase/env";
import { photoIdFor } from "@/lib/people";
import { emptyStore, defaultEventConfig, type Store } from "./defaults";
import { Engine, type Ctx } from "./engine";
import { subscribeDataChanges } from "./live";
import type { DataSource } from "./source";

// แหล่งข้อมูล Supabase (K-P4) · กติกาทั้งหมดอยู่ใน Engine เดิม (พฤติกรรม/ข้อความ error เหมือน mock)
// วิธีทำงาน: โหลดข้อมูลจากฐานข้อมูลเป็น Store → ให้ Engine ทำงานบน Store → เขียนกลับ "เฉพาะแถวที่เปลี่ยน"
// เขียนด้วย session ของผู้ใช้ (anon key + RLS) ไม่ใช้ service role ยกเว้นเซ็น URL รูป · ไม่รับ user id จาก body (actor มาจาก requireRole ฝั่ง action)

type Row = Record<string, unknown>;

// ---------- แปลงแถวฐานข้อมูล <-> ชนิดในแอป ----------
const iso = (v: unknown): string => (v == null || v === "" ? "" : new Date(String(v)).toISOString());
const str = (v: unknown): string | undefined => (v == null ? undefined : String(v));

const toCategory = (r: Row): Category => ({
  id: String(r.id), code: String(r.code), name: String(r.name), name_en: String(r.name_en ?? ""),
  session: r.session as Category["session"],
  start_time: str(r.start_time), end_time: str(r.end_time),
  duration_min: r.duration_min == null ? undefined : Number(r.duration_min),
  medium: (r.medium ?? undefined) as Category["medium"],
  criteria: (r.criteria ?? []) as Category["criteria"],
  judge_count: Number(r.judge_count), pending_notes: (r.pending_notes ?? []) as string[],
  sort_order: Number(r.sort_order), updated_at: iso(r.updated_at),
});
const fromCategory = (c: Category): Row => ({
  id: c.id, code: c.code, name: c.name, name_en: c.name_en, session: c.session,
  start_time: c.start_time ?? null, end_time: c.end_time ?? null, duration_min: c.duration_min ?? null, medium: c.medium ?? null,
  criteria: c.criteria, judge_count: c.judge_count, pending_notes: c.pending_notes, sort_order: c.sort_order,
  updated_at: c.updated_at || new Date().toISOString(),
});

const toCompetitor = (r: Row): Competitor => ({
  id: String(r.id), code: String(r.code), name_th: String(r.name_th), name_en: String(r.name_en ?? ""),
  shop: str(r.shop), person_key: String(r.person_key), updated_at: iso(r.updated_at),
});
const fromCompetitor = (c: Competitor): Row => ({
  id: c.id, code: c.code, name_th: c.name_th, name_en: c.name_en, shop: c.shop ?? null, person_key: c.person_key,
  updated_at: c.updated_at || new Date().toISOString(),
});

const toEntry = (r: Row): Entry => ({
  id: String(r.id), competitor_id: String(r.competitor_id), category_id: String(r.category_id),
  is_checked_in: Boolean(r.is_checked_in), updated_at: iso(r.updated_at),
});
const fromEntry = (e: Entry): Row => ({ ...e, updated_at: e.updated_at || new Date().toISOString() });

const toSponsor = (r: Row): Sponsor => ({
  id: String(r.id), name: String(r.name), level: r.level as Sponsor["level"], position: r.position as Sponsor["position"],
  sequence: Number(r.sequence), logo_url: String(r.logo_url ?? ""), is_active: Boolean(r.is_active),
});
const fromSponsor = (s: Sponsor): Row => ({ ...s });

const toPhoto = (r: Row): AthletePhoto => ({
  id: String(r.id), person_key: String(r.person_key), original_url: String(r.original_url), cutout_url: String(r.cutout_url),
  consent: Boolean(r.consent), updated_at: iso(r.updated_at),
});
const fromPhoto = (p: AthletePhoto): Row => ({ ...p, updated_at: p.updated_at || new Date().toISOString() });

const toEventConfig = (r: Row | undefined): EventConfig =>
  !r ? defaultEventConfig() : {
    days: (r.days ?? []) as string[], announcement: String(r.announcement ?? ""),
    logo_url: str(r.logo_url), theme: (r.theme ?? undefined) as EventConfig["theme"], updated_at: iso(r.updated_at),
  };
const fromEventConfig = (c: EventConfig): Row => ({
  id: 1, days: c.days, announcement: c.announcement, logo_url: c.logo_url ?? null, theme: c.theme ?? null,
  updated_at: c.updated_at || new Date().toISOString(),
});

const toSheet = (r: Row): ScoreSheet => ({
  id: String(r.id), entry_id: String(r.entry_id), category_id: String(r.category_id), judge_no: Number(r.judge_no),
  criteria_scores: (r.criteria_scores ?? undefined) as number[] | undefined, total: Number(r.total),
  updated_at: iso(r.updated_at), updated_by: str(r.updated_by),
});
const fromSheet = (s: ScoreSheet): Row => ({
  id: s.id, entry_id: s.entry_id, category_id: s.category_id, judge_no: s.judge_no, criteria_scores: s.criteria_scores ?? null,
  total: s.total, updated_at: s.updated_at || new Date().toISOString(), updated_by: s.updated_by ?? null,
});

const toState = (r: Row): CategoryResultState => ({
  category_id: String(r.category_id), method: r.method as CategoryResultState["method"], published: Boolean(r.published),
  published_at: r.published_at ? iso(r.published_at) : undefined, published_by: str(r.published_by),
  tie_decisions: (r.tie_decisions ?? []) as CategoryResultState["tie_decisions"],
});
const fromState = (s: CategoryResultState): Row => ({
  category_id: s.category_id, method: s.method, published: s.published, published_at: s.published_at ?? null,
  published_by: s.published_by ?? null, tie_decisions: s.tie_decisions, updated_at: new Date().toISOString(),
});

const toAudit = (r: Row): ScoreAudit => ({
  id: String(r.id), at: iso(r.at), by: str(r.actor), category_id: String(r.category_id), entry_id: str(r.entry_id),
  judge_no: r.judge_no == null ? undefined : Number(r.judge_no), action: r.action as ScoreAudit["action"],
  before: str(r.before), after: str(r.after),
});
const fromAudit = (a: ScoreAudit): Row => ({
  id: a.id, at: a.at, actor: a.by ?? null, category_id: a.category_id, entry_id: a.entry_id ?? null,
  judge_no: a.judge_no ?? null, action: a.action, before: a.before ?? null, after: a.after ?? null,
});

// ---------- ข้อผิดพลาด ----------
type DbError = { code?: string; message: string } | null;
/** ข้อความไทย: RLS ไม่ให้ผ่าน / ข้อมูลซ้ำ / trigger ของ DB (ข้อความไทยอยู่ใน SQL แล้ว) / อื่น ๆ ส่งต่อข้อความเดิม */
function check(error: DbError): void {
  if (!error) return;
  if (error.code === "42501" || /row-level security|permission denied/i.test(error.message)) throw new Error("ไม่มีสิทธิ์ทำรายการนี้");
  if (error.code === "23505") throw new Error("ข้อมูลซ้ำ — มีรายการนี้อยู่แล้ว");
  if (error.code === "23503") throw new Error("ทำรายการไม่ได้ — ข้อมูลนี้ถูกใช้งานอยู่");
  throw new Error(error.message);
}

// ---------- โหลด / เขียนกลับ ----------
const PAGE = 1000;
async function fetchAll(db: SupabaseClient, table: string, order: string, eq?: [string, string]): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = db.from(table).select("*");
    if (eq) q = q.eq(eq[0], eq[1]);
    const { data, error } = await q.order(order).range(from, from + PAGE - 1);
    check(error);
    const rows = (data ?? []) as Row[];
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

/** โหลดข้อมูลเป็น Store · categoryId = เฉพาะรายการ/คะแนน/สถานะของประเภทนั้น (ลดจำนวนที่โหลด) · ไม่โหลด audit (เขียนต่อท้ายอย่างเดียว) */
async function loadStore(db: SupabaseClient, categoryId?: string): Promise<Store> {
  const eq = categoryId ? (["category_id", categoryId] as [string, string]) : undefined;
  const [cats, comps, entries, sponsors, photos, sheets, states, cfg] = await Promise.all([
    fetchAll(db, "categories", "sort_order"),
    fetchAll(db, "competitors", "code"),
    fetchAll(db, "entries", "id", eq),
    fetchAll(db, "sponsors", "sequence"),
    fetchAll(db, "ebw_photos", "id"),
    fetchAll(db, "score_sheets", "id", eq),
    fetchAll(db, "result_states", "category_id", eq),
    db.from("event_config").select("*").eq("id", 1).maybeSingle(),
  ]);
  check(cfg.error);
  const s = emptyStore();
  s.categories = cats.map(toCategory);
  s.competitors = comps.map(toCompetitor);
  s.entries = entries.map(toEntry);
  s.sponsors = sponsors.map(toSponsor);
  s.photos = photos.map(toPhoto);
  s.scoreSheets = sheets.map(toSheet);
  s.resultStates = states.map(toState);
  s.eventConfig = toEventConfig((cfg.data ?? undefined) as Row | undefined);
  return s;
}

type Plan = { key: keyof Store; table: string; pk: string; from: (x: never) => Row };
const PLANS: Record<string, Plan> = {
  categories: { key: "categories", table: "categories", pk: "id", from: fromCategory as Plan["from"] },
  competitors: { key: "competitors", table: "competitors", pk: "id", from: fromCompetitor as Plan["from"] },
  entries: { key: "entries", table: "entries", pk: "id", from: fromEntry as Plan["from"] },
  sponsors: { key: "sponsors", table: "sponsors", pk: "id", from: fromSponsor as Plan["from"] },
  photos: { key: "photos", table: "ebw_photos", pk: "id", from: fromPhoto as Plan["from"] },
  resultStates: { key: "resultStates", table: "result_states", pk: "category_id", from: fromState as Plan["from"] },
  scoreSheets: { key: "scoreSheets", table: "score_sheets", pk: "id", from: fromSheet as Plan["from"] },
};
// ลบลูกก่อนแม่ (FK) · เพิ่ม/แก้แม่ก่อนลูก
const DELETE_ORDER = ["scoreSheets", "entries", "competitors", "sponsors", "photos", "categories"];
const UPSERT_ORDER = ["categories", "competitors", "entries", "sponsors", "photos", "resultStates", "scoreSheets"];

type Snapshot = Record<string, Map<string, string>> & { eventConfig?: never };
const rowKey = (plan: Plan, x: unknown) => String((x as Record<string, unknown>)[plan.pk]);

function snapshot(s: Store): { rows: Snapshot; cfg: string; auditIds: Set<string> } {
  const rows: Snapshot = {};
  for (const [name, plan] of Object.entries(PLANS)) {
    const m = new Map<string, string>();
    for (const x of s[plan.key] as unknown[]) m.set(rowKey(plan, x), JSON.stringify(x));
    rows[name] = m;
  }
  return { rows, cfg: JSON.stringify(s.eventConfig), auditIds: new Set(s.scoreAudit.map((a) => a.id)) };
}

/** เขียนกลับเฉพาะแถวที่ Engine เปลี่ยนจากสแน็ปช็อตก่อนทำงาน */
async function persist(db: SupabaseClient, s: Store, before: ReturnType<typeof snapshot>): Promise<void> {
  for (const name of DELETE_ORDER) {
    const plan = PLANS[name];
    const now = new Set((s[plan.key] as unknown[]).map((x) => rowKey(plan, x)));
    const gone = [...before.rows[name].keys()].filter((id) => !now.has(id));
    if (!gone.length) continue;
    const { data, error } = await db.from(plan.table).delete().in(plan.pk, gone).select(plan.pk);
    check(error);
    if ((data ?? []).length !== gone.length) throw new Error("ไม่มีสิทธิ์ทำรายการนี้");
  }
  for (const name of UPSERT_ORDER) {
    const plan = PLANS[name];
    const changed = (s[plan.key] as unknown[]).filter((x) => before.rows[name].get(rowKey(plan, x)) !== JSON.stringify(x));
    if (!changed.length) continue;
    const { error } = await db.from(plan.table).upsert(changed.map((x) => plan.from(x as never)), { onConflict: plan.pk });
    check(error);
  }
  if (JSON.stringify(s.eventConfig) !== before.cfg) {
    const { error } = await db.from("event_config").upsert(fromEventConfig(s.eventConfig), { onConflict: "id" });
    check(error);
  }
  const newAudit = s.scoreAudit.filter((a) => !before.auditIds.has(a.id));
  if (newAudit.length) {
    const { error } = await db.from("score_audit").insert(newAudit.map(fromAudit));
    check(error);
  }
}

// ---------- แหล่งข้อมูล ----------
export type GetClient = () => Promise<SupabaseClient>;
export type SignPhoto = (path: string) => Promise<string | null>;

async function defaultClient(): Promise<SupabaseClient> {
  const { createServerSupabase } = await import("@/lib/supabase/server");
  return createServerSupabase();
}
async function defaultSign(path: string): Promise<string | null> {
  const { createServiceSupabase } = await import("@/lib/supabase/service");
  const svc = createServiceSupabase();
  if (!svc) return null;
  const { data, error } = await svc.storage.from(PHOTO_BUCKET).createSignedUrl(path, 300);
  return error ? null : data?.signedUrl ?? null;
}

const newId = (prefix: string) => `${prefix}-${randomUUID().replace(/-/g, "").slice(0, 16)}`;
const mkCtx = (actor?: string): Ctx => ({ now: () => new Date().toISOString(), newId, ...(actor ? { staffId: actor } : {}) });

/** getClient / signPhoto ฉีดจากภายนอกได้ (เทสต์ใช้ฐานข้อมูลจำลอง) */
export function createSupabaseSource(getClient: GetClient = defaultClient, signPhoto: SignPhoto = defaultSign): DataSource {
  /** อ่านอย่างเดียว: โหลดแล้วให้ Engine ตอบ */
  async function view<T>(fn: (e: Engine) => T, categoryId?: string): Promise<T> {
    const db = await getClient();
    return fn(new Engine(await loadStore(db, categoryId), mkCtx()));
  }
  /** เขียน: โหลด → Engine ทำงาน (ผิดกติกา throw ก่อนเขียนอะไร) → เขียนกลับเฉพาะที่เปลี่ยน */
  async function mutate<T>(fn: (e: Engine) => T, actor?: string): Promise<T> {
    const db = await getClient();
    const store = await loadStore(db);
    const before = snapshot(store);
    const out = fn(new Engine(store, mkCtx(actor)));
    await persist(db, store, before);
    return out;
  }
  const read = async <R,>(table: string, order: string, map: (r: Row) => R, eq?: [string, string]) =>
    (await fetchAll(await getClient(), table, order, eq)).map(map);

  return {
    getCategories: () => read("categories", "sort_order", toCategory),
    getCompetitors: () => read("competitors", "code", toCompetitor),
    getEntries: (categoryId) => read("entries", "id", toEntry, categoryId ? ["category_id", categoryId] : undefined),
    getSponsors: () => read("sponsors", "sequence", toSponsor),
    async getEventConfig() {
      const { data, error } = await (await getClient()).from("event_config").select("*").eq("id", 1).maybeSingle();
      check(error);
      return toEventConfig((data ?? undefined) as Row | undefined);
    },
    getPhotos: () => read("ebw_photos", "id", toPhoto),

    saveCategory: (categoryId, patch) => mutate((e) => e.saveCategory(categoryId, patch)),

    createCompetitor: (input, categoryIds) => mutate((e) => e.createCompetitor(input, categoryIds)),
    updateCompetitor: (competitorId, patch) => mutate((e) => e.updateCompetitor(competitorId, patch)),
    deleteCompetitor: (competitorId) => mutate((e) => e.deleteCompetitor(competitorId)),
    addEntry: (competitorId, categoryId) => mutate((e) => e.addEntry(competitorId, categoryId)),
    removeEntry: (entryId) => mutate((e) => e.removeEntry(entryId)),
    setEntryCheckIn: (entryId, checkedIn) => mutate((e) => e.setEntryCheckIn(entryId, checkedIn)),

    previewImport: (text) => view((e) => e.previewImport(text)),
    applyImport: (text) => mutate((e) => e.applyImport(text)),

    createSponsor: (input) => mutate((e) => e.createSponsor(input)),
    updateSponsor: (sponsorId, patch) => mutate((e) => e.updateSponsor(sponsorId, patch)),
    deleteSponsor: (sponsorId) => mutate((e) => e.deleteSponsor(sponsorId)),

    saveEventConfig: (patch) => mutate((e) => e.saveEventConfig(patch)),

    async savePhoto(personKey, upload) {
      if (!upload.cutout.length || !upload.original.length) throw new Error("ไม่มีข้อมูลรูป");
      const db = await getClient();
      const id = photoIdFor(personKey);
      const bucket = db.storage.from(PHOTO_BUCKET);
      const up = await bucket.upload(`${id}/original`, upload.original, { contentType: upload.originalMime || "image/jpeg", upsert: true });
      check(up.error);
      const cut = await bucket.upload(`${id}/cutout`, upload.cutout, { contentType: "image/png", upsert: true });
      check(cut.error);
      const v = Date.now().toString(36);
      return mutate((e) => e.savePhotoRow(personKey, { original_url: `/api/photos/${id}/original?v=${v}`, cutout_url: `/api/photos/${id}/cutout?v=${v}` }, upload.consent));
    },
    setPhotoConsent: (photoId, consent) => mutate((e) => e.setPhotoConsent(photoId, consent)),
    async deletePhoto(photoId) {
      await mutate((e) => e.deletePhotoRow(photoId));
      const { error } = await (await getClient()).storage.from(PHOTO_BUCKET).remove([`${photoId}/original`, `${photoId}/cutout`]);
      check(error);
    },
    async getPhotoFile(photoId, kind) {
      if (kind !== "original" && kind !== "cutout") return null;
      // หาแถวรูปด้วย session ของผู้เรียกก่อน: RLS ซ่อนรูปที่ยังไม่ยินยอมจากคนทั่วไป (สตาฟเห็นทั้งหมด) → ไม่มีแถว = ไม่เซ็น URL ด้วย service role
      const db = await getClient();
      const { data: row, error: rowErr } = await db.from("ebw_photos").select("id").eq("id", photoId).maybeSingle();
      check(rowErr);
      if (!row) return null;
      const path = `${(row as Row).id}/${kind}`;
      const url = await signPhoto(path);
      if (url) return { redirect: url };
      const { data, error } = await db.storage.from(PHOTO_BUCKET).download(path);
      if (error || !data) return null;
      return { bytes: new Uint8Array(await data.arrayBuffer()), mime: kind === "cutout" ? "image/png" : data.type || "image/jpeg" };
    },

    getScoreSheets: (categoryId) => view((e) => e.getScoreSheets(categoryId), categoryId),
    saveScoreSheet: (entryId, judgeNo, input, actor) => mutate((e) => e.saveScoreSheet(entryId, judgeNo, input), actor),
    clearScoreSheet: (entryId, judgeNo, actor) => mutate((e) => e.clearScoreSheet(entryId, judgeNo), actor),
    setScoreMethod: (categoryId, method, actor) => mutate((e) => e.setScoreMethod(categoryId, method), actor),
    setTieDecision: (categoryId, orderedEntryIds, actor) => mutate((e) => e.setTieDecision(categoryId, orderedEntryIds), actor),
    getResultBoard: (categoryId) => view((e) => e.getResultBoard(categoryId), categoryId),
    async getPublicResults(categoryId) {
      // คนทั่วไปอ่านคะแนนดิบไม่ได้ (RLS) — ฟังก์ชัน ebw_public_published_results คืนข้อมูลเฉพาะประเภทที่ประกาศแล้ว · ยังไม่ประกาศ = ไม่มีตัวเลขใด ๆ
      const db = await getClient();
      const { data, error } = await db.rpc("ebw_public_published_results", { p_category: categoryId });
      check(error);
      if (!data) return { status: "pending" };
      const pub = data as { state: Row; sheets: Row[] };
      const s = emptyStore();
      s.categories = (await fetchAll(db, "categories", "sort_order")).map(toCategory);
      s.competitors = (await fetchAll(db, "competitors", "code")).map(toCompetitor);
      s.entries = (await fetchAll(db, "entries", "id", ["category_id", categoryId])).map(toEntry);
      s.scoreSheets = pub.sheets.map(toSheet);
      s.resultStates = [toState(pub.state)];
      return new Engine(s, mkCtx()).getPublicResults(categoryId);
    },
    publishResults: (categoryId, actor) => mutate((e) => e.publishResults(categoryId), actor),
    hideResults: (categoryId, actor) => mutate((e) => e.hideResults(categoryId), actor),
    async getScoreAudit(categoryId) {
      return (await fetchAll(await getClient(), "score_audit", "at", ["category_id", categoryId])).map(toAudit);
    },

    subscribe: subscribeDataChanges,
  };
}

export const supabaseSource: DataSource = createSupabaseSource();
