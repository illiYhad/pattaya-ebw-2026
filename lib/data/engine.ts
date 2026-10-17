import type { Store } from "./defaults";
import type { CategoryPatch, CompetitorInput } from "./source";
import { normalizeKey, parseImportTable } from "./import-parse";
import { photoIdFor } from "@/lib/people";
import { checkScoreInput, computeBoard, DEFAULT_METHOD, TRIM_MIN_JUDGES, toPublicResults } from "./scoring";
import type { AthletePhoto, Category, CategoryResultState, Competitor, Criterion, Entry, EventConfig, ImportPreview, ImportRow, PublicResults, ResultBoard, ScoreAudit, ScoreMethod, ScoreSheet, Sponsor } from "@/lib/types";

// กติกาการเขียนทั้งหมดของระบบ ทำงานบน Store ในหน่วยความจำ · ผิดกติกา throw Error ข้อความไทย
export type Ctx = { now: () => string; newId: (prefix: string) => string; staffId?: string };

export const MAX_ENTRIES_PER_COMPETITOR = 2;

const must = <T,>(row: T | undefined, what: string): T => {
  if (!row) throw new Error(`ไม่พบ${what}`);
  return row;
};
const squash = (s: string) => s.replace(/\s+/g, "").toLowerCase();

export class Engine {
  constructor(readonly s: Store, readonly ctx: Ctx) {}

  private categoryOf(id: string) { return must(this.s.categories.find((c) => c.id === id), "ประเภท"); }
  private competitorOf(id: string) { return must(this.s.competitors.find((c) => c.id === id), "ผู้แข่ง"); }
  private entriesOf(competitorId: string) { return this.s.entries.filter((e) => e.competitor_id === competitorId); }
  private sheetsOfCategory(categoryId: string) { return this.s.scoreSheets.filter((x) => x.category_id === categoryId); }
  private hasSheets(entryId: string) { return this.s.scoreSheets.some((x) => x.entry_id === entryId); }

  /** รหัสผู้แข่งถัดไป EBW-### (ต่อจากเลขสูงสุดที่มี) */
  private nextCode(): string {
    const nums = this.s.competitors.map((c) => Number(/^EBW-(\d+)$/.exec(c.code)?.[1] ?? 0));
    return `EBW-${String(Math.max(0, ...nums) + 1).padStart(3, "0")}`;
  }

  /** หาประเภทจากข้อความ: รหัส · ชื่อไทย · ชื่ออังกฤษ · หรือมีคำนั้นอยู่ในชื่อ (กำกวม = คืน "ambiguous") */
  findCategory(label: string): Category | "ambiguous" | undefined {
    const q = squash(label);
    if (!q) return undefined;
    const exact = this.s.categories.find((c) => squash(c.code) === q || squash(c.name) === q || squash(c.name_en) === q);
    if (exact) return exact;
    const partial = this.s.categories.filter((c) => squash(c.name).includes(q) || squash(c.name_en).includes(q) || q.includes(squash(c.name)));
    if (partial.length === 1) return partial[0];
    return partial.length > 1 ? "ambiguous" : undefined;
  }

  // ---------- ประเภท ----------

  saveCategory(categoryId: string, patch: CategoryPatch): Category {
    const c = this.categoryOf(categoryId);
    if (this.sheetsOfCategory(c.id).length) {
      const critChanged = patch.criteria !== undefined && (patch.criteria.length !== c.criteria.length || patch.criteria.some((x, i) => x.max !== c.criteria[i].max));
      if (critChanged || (patch.judge_count !== undefined && patch.judge_count !== c.judge_count)) {
        throw new Error("ประเภทนี้มีคะแนนแล้ว ล้างคะแนนก่อนจึงแก้เกณฑ์/จำนวนกรรมการได้");
      }
    }
    if (patch.name !== undefined) {
      const name = patch.name.trim();
      if (!name) throw new Error("ต้องใส่ชื่อประเภท (ไทย)");
      c.name = name;
    }
    if (patch.name_en !== undefined) c.name_en = patch.name_en.trim();
    if (patch.session !== undefined) c.session = patch.session;
    if (patch.start_time !== undefined) c.start_time = patch.start_time?.trim() || undefined;
    if (patch.end_time !== undefined) c.end_time = patch.end_time?.trim() || undefined;
    if (patch.duration_min !== undefined) {
      if (patch.duration_min !== null && (!Number.isFinite(patch.duration_min) || patch.duration_min <= 0)) throw new Error("เวลาแข่ง (นาที) ต้องมากกว่า 0");
      c.duration_min = patch.duration_min ?? undefined;
    }
    if (patch.medium !== undefined) c.medium = patch.medium ?? undefined;
    if (patch.judge_count !== undefined) {
      if (!Number.isInteger(patch.judge_count) || patch.judge_count < 1) throw new Error("จำนวนกรรมการต้องเป็นจำนวนเต็มอย่างน้อย 1");
      c.judge_count = patch.judge_count;
    }
    if (patch.criteria !== undefined) {
      const crit: Criterion[] = [];
      for (const [i, x] of patch.criteria.entries()) {
        const name = x.name.trim();
        if (!name) throw new Error(`เกณฑ์ข้อ ${i + 1} ไม่มีชื่อ`);
        if (x.max !== undefined && (!Number.isFinite(x.max) || x.max <= 0)) throw new Error(`คะแนนเต็มของ "${name}" ต้องมากกว่า 0 (หรือเว้นว่าง)`);
        crit.push(x.max === undefined ? { name } : { name, max: x.max });
      }
      c.criteria = crit;
    }
    if (patch.pending_notes !== undefined) c.pending_notes = patch.pending_notes.map((n) => n.trim()).filter(Boolean);
    c.updated_at = this.ctx.now();
    return c;
  }

  // ---------- ผู้แข่ง ----------

  private createCompetitorRow(input: CompetitorInput): Competitor {
    const name_th = input.name_th.trim().replace(/\s+/g, " ");
    const name_en = (input.name_en ?? "").trim().replace(/\s+/g, " ");
    if (!name_th) throw new Error("ต้องใส่ชื่อไทย");
    const person_key = normalizeKey(name_th, name_en);
    const dup = this.s.competitors.find((c) => c.person_key === person_key);
    if (dup) throw new Error(`มีผู้แข่งชื่อนี้อยู่แล้ว (${dup.code})`);
    const c: Competitor = { id: this.ctx.newId("c"), code: this.nextCode(), name_th, name_en, shop: input.shop?.trim() || undefined, person_key, updated_at: this.ctx.now() };
    this.s.competitors.push(c);
    return c;
  }

  createCompetitor(input: CompetitorInput, categoryIds: string[] = []): Competitor {
    const ids = [...new Set(categoryIds)];
    if (ids.length > MAX_ENTRIES_PER_COMPETITOR) throw new Error(`ผู้แข่ง 1 คนลงได้ไม่เกิน ${MAX_ENTRIES_PER_COMPETITOR} ประเภท`);
    for (const id of ids) this.categoryOf(id);
    const c = this.createCompetitorRow(input);
    for (const id of ids) this.addEntryRow(c.id, id);
    return c;
  }

  updateCompetitor(competitorId: string, patch: Partial<CompetitorInput>): Competitor {
    const c = this.competitorOf(competitorId);
    const name_th = patch.name_th !== undefined ? patch.name_th.trim().replace(/\s+/g, " ") : c.name_th;
    const name_en = patch.name_en !== undefined ? patch.name_en.trim().replace(/\s+/g, " ") : c.name_en;
    if (!name_th) throw new Error("ต้องใส่ชื่อไทย");
    const key = normalizeKey(name_th, name_en);
    const dup = this.s.competitors.find((x) => x.id !== c.id && x.person_key === key);
    if (dup) throw new Error(`ชื่อซ้ำกับผู้แข่ง ${dup.code}`);
    if (key !== c.person_key) {
      // ย้ายรูปตามคน
      for (const ph of this.s.photos) if (ph.person_key === c.person_key) ph.person_key = key;
    }
    c.name_th = name_th;
    c.name_en = name_en;
    c.person_key = key;
    if (patch.shop !== undefined) c.shop = patch.shop.trim() || undefined;
    c.updated_at = this.ctx.now();
    return c;
  }

  deleteCompetitor(competitorId: string) {
    this.competitorOf(competitorId);
    if (this.entriesOf(competitorId).some((e) => this.hasSheets(e.id))) throw new Error("รายการนี้มีคะแนนแล้ว ล้างคะแนนก่อน");
    this.s.entries = this.s.entries.filter((e) => e.competitor_id !== competitorId);
    this.s.competitors = this.s.competitors.filter((c) => c.id !== competitorId);
  }

  private addEntryRow(competitorId: string, categoryId: string): Entry {
    const e: Entry = { id: this.ctx.newId("e"), competitor_id: competitorId, category_id: categoryId, is_checked_in: false, updated_at: this.ctx.now() };
    this.s.entries.push(e);
    return e;
  }

  addEntry(competitorId: string, categoryId: string): Entry {
    const c = this.competitorOf(competitorId);
    const cat = this.categoryOf(categoryId);
    const mine = this.entriesOf(c.id);
    if (mine.some((e) => e.category_id === cat.id)) throw new Error(`${c.name_th} ลง ${cat.name} อยู่แล้ว`);
    if (mine.length >= MAX_ENTRIES_PER_COMPETITOR) throw new Error(`${c.name_th} ลงครบ ${MAX_ENTRIES_PER_COMPETITOR} ประเภทแล้ว`);
    return this.addEntryRow(c.id, cat.id);
  }

  removeEntry(entryId: string) {
    must(this.s.entries.find((e) => e.id === entryId), "รายการที่ลงแข่ง");
    if (this.hasSheets(entryId)) throw new Error("รายการนี้มีคะแนนแล้ว ล้างคะแนนก่อน");
    this.s.entries = this.s.entries.filter((e) => e.id !== entryId);
  }

  setEntryCheckIn(entryId: string, checkedIn: boolean): Entry {
    const e = must(this.s.entries.find((x) => x.id === entryId), "รายการที่ลงแข่ง");
    e.is_checked_in = checkedIn;
    e.updated_at = this.ctx.now();
    return e;
  }

  // ---------- นำเข้า ----------

  previewImport(text: string): ImportPreview { return this.runImport(text, false); }
  applyImport(text: string): ImportPreview { return this.runImport(text, true); }

  private runImport(text: string, apply: boolean): ImportPreview {
    const parsed = parseImportTable(text);
    const out: ImportPreview = { rows: [], newCompetitors: 0, existingCompetitors: 0, newEntries: 0, existingEntries: 0, errors: [...parsed.errors] };
    if (out.errors.length) return out;
    const seen = new Map<string, number>();

    for (const r of parsed.rows) {
      const errors: string[] = [];
      const name_th = r.name_th.trim().replace(/\s+/g, " ");
      const name_en = r.name_en.trim().replace(/\s+/g, " ");
      if (!name_th) errors.push("ไม่มีชื่อไทย");
      const key = normalizeKey(name_th, name_en);
      if (name_th) {
        const prev = seen.get(key);
        if (prev !== undefined) errors.push(`ซ้ำกับแถว ${prev} ในตารางที่วาง`);
        else seen.set(key, r.row);
      }
      const catIds: string[] = [];
      for (const [i, label] of [r.cat1, r.cat2].entries()) {
        if (!label) continue;
        const c = this.findCategory(label);
        if (!c) errors.push(`ไม่รู้จักประเภท "${label}" (ช่องประเภท ${i + 1})`);
        else if (c === "ambiguous") errors.push(`ประเภท "${label}" ตรงได้หลายประเภท — พิมพ์ชื่อให้เจาะจงกว่านี้`);
        else if (catIds.includes(c.id)) errors.push(`ประเภท 1 และ 2 ซ้ำกัน (${c.name})`);
        else catIds.push(c.id);
      }
      if (!catIds.length && !errors.length) errors.push("ไม่ได้ระบุประเภท");

      const existing = name_th ? this.s.competitors.find((c) => c.person_key === key) : undefined;
      const row: ImportRow = {
        row: r.row, name_th, name_en, shop: r.shop.trim() || undefined,
        categories: catIds.map((id) => this.categoryOf(id).name),
        status: errors.length ? "error" : existing ? "existing" : "new",
        errors,
      };
      out.rows.push(row);
      if (errors.length) continue;

      let comp = existing;
      if (comp) out.existingCompetitors++;
      else {
        out.newCompetitors++;
        if (apply) comp = this.createCompetitorRow({ name_th, name_en, shop: row.shop });
      }
      let count = comp ? this.entriesOf(comp.id).length : 0;
      for (const cid of catIds) {
        if (comp && this.s.entries.some((e) => e.competitor_id === comp!.id && e.category_id === cid)) { out.existingEntries++; continue; }
        if (count >= MAX_ENTRIES_PER_COMPETITOR) {
          row.errors.push(`ลงครบ ${MAX_ENTRIES_PER_COMPETITOR} ประเภทแล้ว — ไม่เพิ่ม ${this.categoryOf(cid).name}`);
          row.status = "error";
          continue;
        }
        count++;
        out.newEntries++;
        if (apply && comp) this.addEntryRow(comp.id, cid);
      }
    }
    return out;
  }

  // ---------- คะแนนกรรมการ (ใบ K-P2a) ----------

  /** สถานะผลของประเภท — อ่านอย่างเดียว (ยังไม่มีแถว = ค่าเริ่มต้น) */
  private peekState(categoryId: string): CategoryResultState {
    return this.s.resultStates.find((x) => x.category_id === categoryId)
      ?? { category_id: categoryId, method: DEFAULT_METHOD, published: false, tie_decisions: [] };
  }
  /** สถานะผลของประเภท — สร้างแถวถ้ายังไม่มี (ใช้ตอนเขียน) */
  private stateOf(categoryId: string): CategoryResultState {
    let st = this.s.resultStates.find((x) => x.category_id === categoryId);
    if (!st) {
      st = { category_id: categoryId, method: DEFAULT_METHOD, published: false, tie_decisions: [] };
      this.s.resultStates.push(st);
    }
    return st;
  }
  private entryRow(entryId: string) { return must(this.s.entries.find((e) => e.id === entryId), "รายการที่ลงแข่ง"); }
  private codeOfEntry(entryId: string) {
    const e = this.s.entries.find((x) => x.id === entryId);
    return this.s.competitors.find((c) => c.id === e?.competitor_id)?.code ?? entryId;
  }
  private audit(a: Omit<ScoreAudit, "id" | "at" | "by">) {
    this.s.scoreAudit.push({ id: this.ctx.newId("au"), at: this.ctx.now(), by: this.ctx.staffId, ...a });
  }
  private assertEditable(categoryId: string) {
    if (this.peekState(categoryId).published) throw new Error("ประกาศผลแล้ว ต้องกดซ่อนผลก่อนแก้คะแนน");
  }
  /** คะแนนเปลี่ยน → คำตัดสินเสมอเดิมใช้ไม่ได้แล้ว */
  private resetTies(categoryId: string) {
    const st = this.s.resultStates.find((x) => x.category_id === categoryId);
    if (!st?.tie_decisions.length) return;
    const before = st.tie_decisions.map((d) => d.entry_ids.map((id) => this.codeOfEntry(id)).join(" > ")).join(" | ");
    st.tie_decisions = [];
    this.audit({ category_id: categoryId, action: "tie_reset", before, after: "ล้างแล้ว" });
  }
  private describeSheet(x: ScoreSheet | undefined) {
    if (!x) return undefined;
    return x.criteria_scores ? `${x.total} (${x.criteria_scores.join(", ")})` : String(x.total);
  }
  private board(categoryId: string): ResultBoard {
    const c = this.categoryOf(categoryId);
    return computeBoard(c, this.s.entries, this.sheetsOfCategory(c.id), this.peekState(c.id), this.s.competitors);
  }

  getScoreSheets(categoryId: string): ScoreSheet[] {
    this.categoryOf(categoryId);
    return this.sheetsOfCategory(categoryId);
  }

  saveScoreSheet(entryId: string, judgeNo: number, input: { criteria_scores?: number[]; total?: number }): ScoreSheet {
    const e = this.entryRow(entryId);
    const cat = this.categoryOf(e.category_id);
    if (!Number.isInteger(judgeNo) || judgeNo < 1 || judgeNo > cat.judge_count) throw new Error(`กรรมการคนที่ ${judgeNo} ไม่มีในประเภทนี้ (มี ${cat.judge_count} คน)`);
    this.assertEditable(cat.id);
    const checked = checkScoreInput(cat, input);
    const prev = this.s.scoreSheets.find((x) => x.entry_id === e.id && x.judge_no === judgeNo);
    const row: ScoreSheet = {
      id: prev?.id ?? this.ctx.newId("ss"), entry_id: e.id, category_id: cat.id, judge_no: judgeNo,
      ...(checked.criteria_scores ? { criteria_scores: checked.criteria_scores } : {}),
      total: checked.total, updated_at: this.ctx.now(), updated_by: this.ctx.staffId,
    };
    if (prev) this.s.scoreSheets[this.s.scoreSheets.indexOf(prev)] = row; else this.s.scoreSheets.push(row);
    this.resetTies(cat.id);
    this.audit({ category_id: cat.id, entry_id: e.id, judge_no: judgeNo, action: "save", before: this.describeSheet(prev), after: this.describeSheet(row) });
    return row;
  }

  clearScoreSheet(entryId: string, judgeNo: number) {
    const e = this.entryRow(entryId);
    this.assertEditable(e.category_id);
    const prev = this.s.scoreSheets.find((x) => x.entry_id === e.id && x.judge_no === judgeNo);
    if (!prev) throw new Error("ไม่พบใบคะแนนที่จะล้าง");
    this.s.scoreSheets = this.s.scoreSheets.filter((x) => x !== prev);
    this.resetTies(e.category_id);
    this.audit({ category_id: e.category_id, entry_id: e.id, judge_no: judgeNo, action: "clear", before: this.describeSheet(prev) });
  }

  setScoreMethod(categoryId: string, method: ScoreMethod): CategoryResultState {
    const cat = this.categoryOf(categoryId);
    if (method !== "mean" && method !== "trimmed_mean") throw new Error("วิธีรวมคะแนนไม่ถูกต้อง");
    if (method === "trimmed_mean" && cat.judge_count < TRIM_MIN_JUDGES) throw new Error("ตัดคะแนนสูงสุด-ต่ำสุดได้เมื่อกรรมการ 5 คนขึ้นไป");
    this.assertEditable(cat.id);
    const st = this.stateOf(cat.id);
    if (st.method !== method) {
      const before = st.method;
      st.method = method;
      this.audit({ category_id: cat.id, action: "method", before, after: method });
      this.resetTies(cat.id);
    }
    return st;
  }

  /** กรรมการตัดสินกลุ่มที่คะแนนเท่ากัน — orderedEntryIds เรียงจากอันดับดีสุด · ต้องตรงกับกลุ่มที่ยังเสมออยู่ทุกตัวพอดี */
  setTieDecision(categoryId: string, orderedEntryIds: string[]): CategoryResultState {
    this.categoryOf(categoryId);
    this.assertEditable(categoryId);
    const ids = new Set(orderedEntryIds);
    if (ids.size < 2 || ids.size !== orderedEntryIds.length) throw new Error("ต้องเลือกรายการที่คะแนนเท่ากันอย่างน้อย 2 รายการ และไม่ซ้ำกัน");
    const tied = this.board(categoryId).standings.filter((x) => x.tie_unresolved);
    const matches = [...new Set(tied.map((x) => x.rank))].some((r) => {
      const g = tied.filter((x) => x.rank === r);
      return g.length === ids.size && g.every((x) => ids.has(x.entry_id));
    });
    if (!matches) throw new Error("รายการที่เลือกไม่ตรงกับกลุ่มที่คะแนนเท่ากันอยู่ตอนนี้ (ต้องครบทุกรายการในกลุ่มพอดี)");
    const st = this.stateOf(categoryId);
    st.tie_decisions.push({ entry_ids: [...orderedEntryIds], decided_at: this.ctx.now(), decided_by: this.ctx.staffId });
    this.audit({ category_id: categoryId, action: "tie_decision", after: orderedEntryIds.map((id) => this.codeOfEntry(id)).join(" > ") });
    return st;
  }

  getResultBoard(categoryId: string): ResultBoard { return this.board(categoryId); }

  getPublicResults(categoryId: string): PublicResults {
    this.categoryOf(categoryId);
    if (!this.peekState(categoryId).published) return { status: "pending" };
    return toPublicResults(this.board(categoryId));
  }

  publishResults(categoryId: string): CategoryResultState {
    this.categoryOf(categoryId);
    const st = this.stateOf(categoryId);
    if (st.published) return st;
    const b = this.board(categoryId);
    if (!b.can_publish) throw new Error(`ประกาศผลไม่ได้: ${b.warnings.join(" · ")}`);
    st.published = true;
    st.published_at = this.ctx.now();
    st.published_by = this.ctx.staffId;
    this.audit({ category_id: categoryId, action: "publish" });
    return st;
  }

  hideResults(categoryId: string): CategoryResultState {
    this.categoryOf(categoryId);
    const st = this.stateOf(categoryId);
    if (!st.published) return st;
    st.published = false;
    st.published_at = undefined;
    st.published_by = undefined;
    this.audit({ category_id: categoryId, action: "hide" });
    return st;
  }

  getScoreAudit(categoryId: string): ScoreAudit[] {
    this.categoryOf(categoryId);
    return this.s.scoreAudit.filter((x) => x.category_id === categoryId);
  }

  // ---------- สปอนเซอร์ ----------

  createSponsor(input: Omit<Sponsor, "id">): Sponsor {
    if (!input.name.trim()) throw new Error("ต้องใส่ชื่อสปอนเซอร์");
    const s: Sponsor = { ...input, id: this.ctx.newId("sp") };
    this.s.sponsors.push(s);
    return s;
  }
  updateSponsor(sponsorId: string, patch: Partial<Omit<Sponsor, "id">>): Sponsor {
    const s = must(this.s.sponsors.find((x) => x.id === sponsorId), "สปอนเซอร์");
    Object.assign(s, patch);
    return s;
  }
  deleteSponsor(sponsorId: string) {
    must(this.s.sponsors.find((x) => x.id === sponsorId), "สปอนเซอร์");
    this.s.sponsors = this.s.sponsors.filter((x) => x.id !== sponsorId);
  }

  // ---------- ตั้งค่างาน ----------

  saveEventConfig(patch: Partial<Omit<EventConfig, "updated_at">>): EventConfig {
    const days = patch.days?.map((d) => d.trim()).filter(Boolean);
    if (days && days.some((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d))) throw new Error("วันแข่งต้องเป็น YYYY-MM-DD");
    this.s.eventConfig = { ...this.s.eventConfig, ...patch, ...(days ? { days } : {}), updated_at: this.ctx.now() };
    return this.s.eventConfig;
  }

  // ---------- รูป ----------

  savePhotoRow(personKeyValue: string, urls: { original_url: string; cutout_url: string }, consent: boolean): AthletePhoto {
    const id = photoIdFor(personKeyValue);
    const row: AthletePhoto = { id, person_key: personKeyValue, ...urls, consent, updated_at: this.ctx.now() };
    const i = this.s.photos.findIndex((p) => p.id === id);
    if (i >= 0) this.s.photos[i] = row; else this.s.photos.push(row);
    return row;
  }
  setPhotoConsent(photoId: string, consent: boolean): AthletePhoto {
    const p = must(this.s.photos.find((x) => x.id === photoId), "รูป");
    p.consent = consent;
    p.updated_at = this.ctx.now();
    return p;
  }
  deletePhotoRow(photoId: string) {
    must(this.s.photos.find((x) => x.id === photoId), "รูป");
    this.s.photos = this.s.photos.filter((x) => x.id !== photoId);
  }
}
