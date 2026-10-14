"use server";

import { data } from "@/lib/data";
import { requireRole } from "@/lib/auth";
import { run, type ActionResult } from "@/lib/actions";
import type { CompetitorInput } from "@/lib/data/source";
import type { EventConfig, ImportPreview, Sponsor } from "@/lib/types";

// ทุก action ตรวจบทบาท admin ฝั่ง server ก่อนเสมอ (ไม่พึ่งหน้าเว็บ/proxy อย่างเดียว)
const admin = <T,>(fn: () => Promise<T>) => run(async () => { await requireRole("admin"); return fn(); });

export async function createCompetitorAction(input: CompetitorInput, categoryIds: string[] = []): Promise<ActionResult> {
  return admin(async () => void (await data.createCompetitor(input, categoryIds)));
}
export async function updateCompetitorAction(competitorId: string, patch: Partial<CompetitorInput>): Promise<ActionResult> {
  return admin(async () => void (await data.updateCompetitor(competitorId, patch)));
}
export async function deleteCompetitorAction(competitorId: string): Promise<ActionResult> {
  return admin(() => data.deleteCompetitor(competitorId));
}
export async function addEntryAction(competitorId: string, categoryId: string): Promise<ActionResult> {
  return admin(async () => void (await data.addEntry(competitorId, categoryId)));
}
export async function removeEntryAction(entryId: string): Promise<ActionResult> {
  return admin(() => data.removeEntry(entryId));
}

export async function previewImportAction(text: string): Promise<ActionResult<ImportPreview>> {
  return admin(() => data.previewImport(text));
}
export async function applyImportAction(text: string): Promise<ActionResult<ImportPreview>> {
  return admin(() => data.applyImport(text));
}

export async function createSponsorAction(input: Omit<Sponsor, "id">): Promise<ActionResult> {
  return admin(async () => void (await data.createSponsor(input)));
}
export async function updateSponsorAction(sponsorId: string, patch: Partial<Omit<Sponsor, "id">>): Promise<ActionResult> {
  return admin(async () => void (await data.updateSponsor(sponsorId, patch)));
}
export async function deleteSponsorAction(sponsorId: string): Promise<ActionResult> {
  return admin(() => data.deleteSponsor(sponsorId));
}

export async function saveEventConfigAction(patch: Partial<Omit<EventConfig, "updated_at">>): Promise<ActionResult> {
  return admin(async () => void (await data.saveEventConfig(patch)));
}
