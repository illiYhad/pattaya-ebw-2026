import type { Category } from "@/lib/types";
import { DEFAULT_CATEGORIES, emptyStore, type Store } from "./defaults";
import { normalizeKey } from "./import-parse";

// ข้อมูลจำลอง (ใบ K-P1 ข้อ 4): ≥ 20 ผู้แข่ง กระจาย 7 ประเภท · ≥ 3 คนลง 2 ประเภท · ไม่มีชื่อ/รูปคนจริง
const NOW = () => new Date().toISOString();
const COMPETITOR_COUNT = 22;
/** ผู้แข่งลำดับเหล่านี้ลง 2 ประเภท (5 คน) */
const TWO_CATEGORY = new Set([1, 5, 9, 13, 17]);

export function buildSeedStore(): Store {
  const s = emptyStore();
  const cats: Category[] = DEFAULT_CATEGORIES.map((c) => ({ ...c, criteria: c.criteria.map((x) => ({ ...x })), pending_notes: [...c.pending_notes], updated_at: NOW() }));
  s.categories.push(...cats);

  for (let i = 1; i <= COMPETITOR_COUNT; i++) {
    const n = String(i).padStart(2, "0");
    const name_th = `ผู้แข่งตัวอย่าง ${n}`;
    const name_en = `Sample Competitor ${n}`;
    const id = `c-${n}`;
    s.competitors.push({
      id,
      code: `EBW-${String(i).padStart(3, "0")}`,
      name_th,
      name_en,
      shop: i % 2 === 0 ? `ร้านตัวอย่าง ${String.fromCharCode(64 + ((i / 2) % 6) + 1)}` : undefined,
      person_key: normalizeKey(name_th, name_en),
      updated_at: NOW(),
    });
    const first = cats[(i - 1) % cats.length];
    const chosen = [first];
    if (TWO_CATEGORY.has(i)) chosen.push(cats[(i + 2) % cats.length]);
    for (const c of chosen) {
      s.entries.push({ id: `e-${n}-${c.code}`, competitor_id: id, category_id: c.id, is_checked_in: i % 4 !== 0, updated_at: NOW() });
    }
  }
  return s;
}
