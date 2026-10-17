"use server";

import { data } from "@/lib/data";
import { requireRole } from "@/lib/auth";
import { run, type ActionResult } from "@/lib/actions";
import type { ScoreInput } from "@/lib/data/source";
import type { ScoreMethod } from "@/lib/types";

// กรอก/ลบคะแนน = admin + สตาฟกรอกผล (กรอกจากใบคะแนนกระดาษ) · วิธีรวม / ตัดสินเสมอ / เปิด-ซ่อนผล = admin เท่านั้น
// ตรวจฝั่ง server ทุกครั้ง · ข้อผิดกติกาจาก engine เป็นข้อความไทยตรงถึงหน้าเว็บ · ทุก action ส่งอีเมลผู้กรอกจริงลง audit (actor)
export async function saveScoreAction(entryId: string, judgeNo: number, input: ScoreInput): Promise<ActionResult> {
  return run(async () => {
    const staff = await requireRole("admin", "result_staff");
    await data.saveScoreSheet(entryId, judgeNo, input, staff.email);
  });
}

export async function clearScoreAction(entryId: string, judgeNo: number): Promise<ActionResult> {
  return run(async () => {
    const staff = await requireRole("admin", "result_staff");
    await data.clearScoreSheet(entryId, judgeNo, staff.email);
  });
}

export async function setScoreMethodAction(categoryId: string, method: ScoreMethod): Promise<ActionResult> {
  return run(async () => {
    const staff = await requireRole("admin");
    await data.setScoreMethod(categoryId, method, staff.email);
  });
}

export async function setTieDecisionAction(categoryId: string, orderedEntryIds: string[]): Promise<ActionResult> {
  return run(async () => {
    const staff = await requireRole("admin");
    await data.setTieDecision(categoryId, orderedEntryIds, staff.email);
  });
}

export async function publishResultsAction(categoryId: string): Promise<ActionResult> {
  return run(async () => {
    const staff = await requireRole("admin");
    await data.publishResults(categoryId, staff.email);
  });
}

export async function hideResultsAction(categoryId: string): Promise<ActionResult> {
  return run(async () => {
    const staff = await requireRole("admin");
    await data.hideResults(categoryId, staff.email);
  });
}
