"use server";

import { data } from "@/lib/data";
import { requireRole } from "@/lib/auth";
import { run, type ActionResult } from "@/lib/actions";
import type { ScoreInput } from "@/lib/data/source";
import type { ScoreMethod } from "@/lib/types";

// คะแนนกรรมการ = admin เท่านั้น (ตรวจฝั่ง server ทุกครั้ง) · ข้อผิดกติกาจาก engine เป็นข้อความไทยตรงถึงหน้าเว็บ
export async function saveScoreAction(entryId: string, judgeNo: number, input: ScoreInput): Promise<ActionResult> {
  return run(async () => {
    await requireRole("admin");
    await data.saveScoreSheet(entryId, judgeNo, input);
  });
}

export async function clearScoreAction(entryId: string, judgeNo: number): Promise<ActionResult> {
  return run(async () => {
    await requireRole("admin");
    await data.clearScoreSheet(entryId, judgeNo);
  });
}

export async function setScoreMethodAction(categoryId: string, method: ScoreMethod): Promise<ActionResult> {
  return run(async () => {
    await requireRole("admin");
    await data.setScoreMethod(categoryId, method);
  });
}

export async function setTieDecisionAction(categoryId: string, orderedEntryIds: string[]): Promise<ActionResult> {
  return run(async () => {
    await requireRole("admin");
    await data.setTieDecision(categoryId, orderedEntryIds);
  });
}

export async function publishResultsAction(categoryId: string): Promise<ActionResult> {
  return run(async () => {
    await requireRole("admin");
    await data.publishResults(categoryId);
  });
}

export async function hideResultsAction(categoryId: string): Promise<ActionResult> {
  return run(async () => {
    await requireRole("admin");
    await data.hideResults(categoryId);
  });
}
