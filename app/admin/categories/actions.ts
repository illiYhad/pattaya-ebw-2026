"use server";

import { data } from "@/lib/data";
import { requireRole } from "@/lib/auth";
import { run, type ActionResult } from "@/lib/actions";
import type { CategoryPatch } from "@/lib/data/source";

// แก้ประเภท/เกณฑ์/คะแนนเต็ม/จำนวนกรรมการ = admin เท่านั้น (ตรวจฝั่ง server ทุกครั้ง)
export async function saveCategoryAction(categoryId: string, patch: CategoryPatch): Promise<ActionResult> {
  return run(async () => {
    await requireRole("admin");
    await data.saveCategory(categoryId, patch);
  });
}
