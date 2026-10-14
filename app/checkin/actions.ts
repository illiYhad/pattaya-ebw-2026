"use server";

import { data } from "@/lib/data";
import { requireRole } from "@/lib/auth";
import { run, type ActionResult } from "@/lib/actions";

// เช็กอิน = admin หรือ result_staff (ตรวจบทบาทฝั่ง server ทุกครั้ง) · 1 รายการ = ผู้แข่ง × ประเภท
export async function setCheckInAction(entryId: string, checkedIn: boolean): Promise<ActionResult> {
  return run(async () => {
    await requireRole("admin", "result_staff");
    await data.setEntryCheckIn(entryId, checkedIn);
  });
}
