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
  seedScores(s);
  return s;
}

/**
 * ใบคะแนนจำลอง (ใบ K-P2a ข้อ 4) — ให้ K-P2b/K-P2c และแอนดี้มีของเทส · ทุกประเภทยังไม่ประกาศผล
 * - thai_massage: ทุกรายการมีใบครบ ไม่มีคะแนนเท่ากัน
 * - lip: 1 รายการมี 2 ใบ (incomplete) · 2 รายการคะแนนรวมเท่ากันในอันดับ ≤ 3 (โหมดรวม ตัดสินเองไม่ได้)
 */
function seedScores(s: Store) {
  const at = NOW();
  const codeOf = (competitorId: string) => s.competitors.find((c) => c.id === competitorId)?.code ?? "";
  const entriesOf = (code: string) => {
    const cat = s.categories.find((c) => c.code === code)!;
    return { cat, entries: s.entries.filter((e) => e.category_id === cat.id).sort((a, b) => codeOf(a.competitor_id).localeCompare(codeOf(b.competitor_id))) };
  };

  const thai = entriesOf("thai_massage");
  thai.entries.forEach((e, k) => {
    for (let j = 1; j <= thai.cat.judge_count; j++) {
      // หักคะแนนทีละ 0.5 ตามตำแหน่ง · หักเพิ่มตาม k² ให้ยอดรวมของแต่ละรายการไม่ซ้ำกัน
      const scores = thai.cat.criteria.map((c, i) => (c.max ?? 0) - ((i + j) % 3) * 0.5 - k * k * 0.5);
      s.scoreSheets.push({ id: `ss-${e.id}-${j}`, entry_id: e.id, category_id: thai.cat.id, judge_no: j, criteria_scores: scores, total: scores.reduce((a, b) => a + Math.round(b * 10), 0) / 10, updated_at: at });
    }
  });

  const lip = entriesOf("lip");
  const lipTotals: number[][] = [[80, 82], [85, 86, 84], [86, 84, 85], [70, 72, 71]];
  lip.entries.forEach((e, k) => {
    (lipTotals[k] ?? []).forEach((total, idx) => {
      s.scoreSheets.push({ id: `ss-${e.id}-${idx + 1}`, entry_id: e.id, category_id: lip.cat.id, judge_no: idx + 1, total, updated_at: at });
    });
  });
}
