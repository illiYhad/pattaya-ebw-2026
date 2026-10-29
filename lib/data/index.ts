import { hasSupabaseEnv } from "@/lib/supabase/env";
import { mockSource } from "./mock";
import { supabaseSource } from "./supabase";
import type { DataSource } from "./source";

// K-P4: มี Supabase env ครบ → ใช้ฐานข้อมูลจริง (lib/data/supabase.ts) · ไม่มี → mock ในหน่วยความจำเหมือนเดิม (dev / เทสต์ รันได้โดยไม่มี env)
// ตัวเลือกเดียวกับที่ lib/auth.ts ใช้ตัดสินโหมดล็อกอิน (hasSupabaseEnv) จึงไม่เกิดกรณี "ล็อกอินจริงแต่ข้อมูล mock"
export const data: DataSource = hasSupabaseEnv ? supabaseSource : mockSource;
export type { DataSource };
