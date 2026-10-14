import { mockSource } from "./mock";
import type { DataSource } from "./source";

// ใบ K-P1: ใช้ mock ในหน่วยความจำเท่านั้น (ห้ามต่อ Supabase) — แหล่งข้อมูล Supabase สำหรับโมเดลใหม่
// (competitors / entries / categories) ยังไม่มี ต้องเขียนในใบถัดไปพร้อม schema · ล็อกอินยังใช้ lib/supabase/* ได้ถ้ามี env
export const data: DataSource = mockSource;
export type { DataSource };
