import type { DataSource } from "./source";
import { subscribeDataChanges } from "./live";
import { db } from "./store";
import { Engine, type Ctx } from "./engine";
import { photoIdFor } from "@/lib/people";

// แหล่งข้อมูลจำลองในหน่วยความจำ — กติกาทั้งหมดอยู่ใน Engine
const NOW = () => new Date().toISOString();
let seq = 0;
const ctx: Ctx = { now: NOW, newId: (prefix) => `${prefix}-${Date.now().toString(36)}-${(++seq).toString(36)}` };
const engine = (actor?: string) => new Engine(db, actor ? { ...ctx, staffId: actor } : ctx);

export const mockSource: DataSource = {
  async getCategories() { return [...db.categories].sort((a, b) => a.sort_order - b.sort_order); },
  async getCompetitors() { return db.competitors; },
  async getEntries(categoryId) { return categoryId ? db.entries.filter((e) => e.category_id === categoryId) : db.entries; },
  async getSponsors() { return db.sponsors; },
  async getEventConfig() { return db.eventConfig; },
  async getPhotos() { return db.photos; },

  async saveCategory(categoryId, patch) { return engine().saveCategory(categoryId, patch); },

  async createCompetitor(input, categoryIds) { return engine().createCompetitor(input, categoryIds); },
  async updateCompetitor(competitorId, patch) { return engine().updateCompetitor(competitorId, patch); },
  async deleteCompetitor(competitorId) { engine().deleteCompetitor(competitorId); },
  async addEntry(competitorId, categoryId) { return engine().addEntry(competitorId, categoryId); },
  async removeEntry(entryId) { engine().removeEntry(entryId); },
  async setEntryCheckIn(entryId, checkedIn) { return engine().setEntryCheckIn(entryId, checkedIn); },

  async previewImport(text) { return engine().previewImport(text); },
  async applyImport(text) { return engine().applyImport(text); },

  async createSponsor(input) { return engine().createSponsor(input); },
  async updateSponsor(sponsorId, patch) { return engine().updateSponsor(sponsorId, patch); },
  async deleteSponsor(sponsorId) { engine().deleteSponsor(sponsorId); },

  async saveEventConfig(patch) { return engine().saveEventConfig(patch); },

  async savePhoto(personKey, upload) {
    if (!upload.cutout.length || !upload.original.length) throw new Error("ไม่มีข้อมูลรูป");
    const id = photoIdFor(personKey);
    db.photoFiles.set(id, { original: upload.original, originalMime: upload.originalMime || "image/jpeg", cutout: upload.cutout });
    const v = Date.now().toString(36);
    return engine().savePhotoRow(personKey, { original_url: `/api/photos/${id}/original?v=${v}`, cutout_url: `/api/photos/${id}/cutout?v=${v}` }, upload.consent);
  },
  async setPhotoConsent(photoId, consent) { return engine().setPhotoConsent(photoId, consent); },
  async deletePhoto(photoId) {
    engine().deletePhotoRow(photoId);
    db.photoFiles.delete(photoId);
  },
  async getPhotoFile(photoId, kind) {
    const f = db.photoFiles.get(photoId);
    if (!f) return null;
    return kind === "original" ? { bytes: f.original, mime: f.originalMime } : { bytes: f.cutout, mime: "image/png" };
  },

  async getScoreSheets(categoryId) { return engine().getScoreSheets(categoryId); },
  async saveScoreSheet(entryId, judgeNo, input, actor) { return engine(actor).saveScoreSheet(entryId, judgeNo, input); },
  async clearScoreSheet(entryId, judgeNo, actor) { engine(actor).clearScoreSheet(entryId, judgeNo); },
  async setScoreMethod(categoryId, method, actor) { return engine(actor).setScoreMethod(categoryId, method); },
  async setTieDecision(categoryId, orderedEntryIds, actor) { return engine(actor).setTieDecision(categoryId, orderedEntryIds); },
  async getResultBoard(categoryId) { return engine().getResultBoard(categoryId); },
  async getPublicResults(categoryId) { return engine().getPublicResults(categoryId); },
  async publishResults(categoryId, actor) { return engine(actor).publishResults(categoryId); },
  async hideResults(categoryId, actor) { return engine(actor).hideResults(categoryId); },
  async getScoreAudit(categoryId) { return engine().getScoreAudit(categoryId); },

  subscribe: subscribeDataChanges,
};
