import { buildSeedStore } from "./seed";
import type { Store } from "./defaults";

export type { Store } from "./defaults";

// แหล่งข้อมูลจำลองในหน่วยความจำ — ใบ K-P1 ใช้ mock เท่านั้น (ห้ามต่อ Supabase)
// เก็บไว้ที่ globalThis กันโมดูลถูกโหลดซ้ำแยกกันระหว่างหน้า
const g = globalThis as unknown as { __ebwMock?: Store };
export const db: Store = (g.__ebwMock ??= buildSeedStore());
