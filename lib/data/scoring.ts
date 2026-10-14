import type { Category, CategoryResultState, Competitor, Entry, PublicResults, ResultBoard, ScoreMethod, ScoreSheet, Standing } from "@/lib/types";

// ตัวคำนวณคะแนนกรรมการ (ใบ K-P2a) — pure function ล้วน: ไม่อ่าน store ไม่เรียก Date
// คะแนนที่กรอกเก็บเป็นหน่วย 0.1 (จำนวนเต็ม) · ค่าเฉลี่ยปัดเป็นหน่วย 0.01 แบบปัดครึ่งขึ้น กันทศนิยมเพี้ยน

export const FULL_TOTAL = 100;
/** ตัดสูงสุด-ต่ำสุดได้เมื่อกรรมการตั้งแต่ 5 คน */
export const TRIM_MIN_JUDGES = 5;
export const DEFAULT_METHOD: ScoreMethod = "mean";

const toTenths = (v: number) => Math.round(v * 10);

/** โหมดรายเกณฑ์ = มีเกณฑ์ และทุกข้อมี max · นอกนั้นกรอกคะแนนรวมช่องเดียว เต็ม 100 */
export function isCriteriaMode(category: Pick<Category, "criteria">): boolean {
  return category.criteria.length > 0 && category.criteria.every((c) => c.max !== undefined);
}

/** คะแนนเต็มของประเภท (หน่วยคะแนนจริง) */
export function maxTotal(category: Pick<Category, "criteria">): number {
  return isCriteriaMode(category) ? category.criteria.reduce((sum, c) => sum + toTenths(c.max ?? 0), 0) / 10 : FULL_TOTAL;
}

function checkValue(label: string, value: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${label} ต้องเป็นตัวเลข`);
  if (value < 0 || toTenths(value) > toTenths(max)) throw new Error(`${label} เต็ม ${max} กรอก ${value} ไม่ได้`);
  if (Math.abs(value * 10 - toTenths(value)) > 1e-6) throw new Error(`${label} ใส่ทศนิยมได้ไม่เกิน 1 ตำแหน่ง (กรอก ${value} ไม่ได้)`);
  return toTenths(value);
}

/** ตรวจค่าที่กรอก + หาคะแนนรวม · ผิด → throw ข้อความไทย */
export function checkScoreInput(category: Category, input: { criteria_scores?: number[]; total?: number }): { total: number; criteria_scores?: number[] } {
  if (isCriteriaMode(category)) {
    const given = input.criteria_scores;
    if (!given || given.length !== category.criteria.length) throw new Error(`ต้องกรอกคะแนนให้ครบ ${category.criteria.length} ข้อ`);
    const tenths = category.criteria.map((c, i) => checkValue(c.name, given[i], c.max ?? 0));
    return { total: tenths.reduce((a, b) => a + b, 0) / 10, criteria_scores: tenths.map((t) => t / 10) };
  }
  if (input.total === undefined) throw new Error("ต้องกรอกคะแนนรวม");
  return { total: checkValue("คะแนนรวม", input.total, FULL_TOTAL) / 10 };
}

/** รวมคะแนนกรรมการหลายคน (หน่วย 0.1) → หน่วย 0.01 */
function aggregate(tenths: number[], method: ScoreMethod): number {
  let v = [...tenths].sort((a, b) => a - b);
  if (method === "trimmed_mean" && v.length >= 3) v = v.slice(1, -1);
  const sum = v.reduce((a, b) => a + b, 0);
  const n = v.length;
  // เฉลี่ย = sum/n หน่วย 0.1 = sum*10/n หน่วย 0.01 · ปัดครึ่งขึ้นด้วยจำนวนเต็ม
  return Math.floor((sum * 20 + n) / (2 * n));
}

type Work = { standing: Standing; hundredths?: number; tie?: number };

/**
 * คำนวณกระดานผลของ 1 ประเภท · เห็นทุกอย่าง (ฝั่งแอดมิน)
 * competitors ใช้แค่หารหัส EBW-xxx ใส่ข้อความเตือน
 */
export function computeBoard(category: Category, entries: Entry[], sheets: ScoreSheet[], state: CategoryResultState, competitors: Competitor[]): ResultBoard {
  const codeOf = new Map(competitors.map((c) => [c.id, c.code]));
  const label = (competitorId: string) => codeOf.get(competitorId) ?? competitorId;
  const criteriaMode = isCriteriaMode(category);
  const method: ScoreMethod = state.method === "trimmed_mean" && category.judge_count >= TRIM_MIN_JUDGES ? "trimmed_mean" : "mean";
  // เกณฑ์ที่คะแนนเต็มมากที่สุด (เท่ากันหลายข้อ = ข้อแรก) ใช้ตัดสินเมื่อคะแนนรวมเท่ากัน
  let tieIdx = -1;
  if (criteriaMode) category.criteria.forEach((c, i) => { if (tieIdx < 0 || (c.max ?? 0) > (category.criteria[tieIdx].max ?? 0)) tieIdx = i; });

  const mine = entries.filter((e) => e.category_id === category.id);
  const work: Work[] = mine.map((e) => {
    const byJudge = new Map<number, ScoreSheet>();
    for (const s of sheets) {
      if (s.entry_id === e.id && s.category_id === category.id && s.judge_no >= 1 && s.judge_no <= category.judge_count) byJudge.set(s.judge_no, s);
    }
    const mineSheets = [...byJudge.values()].sort((a, b) => a.judge_no - b.judge_no);
    const done = mineSheets.length;
    const standing: Standing = {
      entry_id: e.id, competitor_id: e.competitor_id, sheets_done: done,
      status: done === 0 ? "no_scores" : done >= category.judge_count ? "complete" : "incomplete",
      judge_totals: mineSheets.map((s) => s.total), tie_unresolved: false,
    };
    if (standing.status !== "complete") return { standing };
    const hundredths = aggregate(mineSheets.map((s) => toTenths(s.total)), method);
    standing.score = hundredths / 100;
    const w: Work = { standing, hundredths };
    if (criteriaMode) {
      standing.criteria_avg = category.criteria.map((_, i) => aggregate(mineSheets.map((s) => toTenths(s.criteria_scores?.[i] ?? 0)), method) / 100);
      w.tie = aggregate(mineSheets.map((s) => toTenths(s.criteria_scores?.[tieIdx] ?? 0)), method);
      standing.tiebreak_score = w.tie / 100;
    }
    return w;
  });

  // ---- จัดอันดับ: คะแนนรวมมาก→น้อย แล้วค่าเฉลี่ยเกณฑ์ใหญ่สุด (เฉพาะโหมดรายเกณฑ์) ----
  const ranked = work.filter((w) => w.standing.status === "complete");
  ranked.sort((a, b) => (b.hundredths! - a.hundredths!) || ((b.tie ?? 0) - (a.tie ?? 0)));
  const sameGroup = (a: Work, b: Work) => a.hundredths === b.hundredths && (a.tie ?? 0) === (b.tie ?? 0);

  const ordered: Standing[] = [];
  for (let i = 0; i < ranked.length;) {
    let j = i + 1;
    while (j < ranked.length && sameGroup(ranked[i], ranked[j])) j++;
    const group = ranked.slice(i, j);
    if (group.length === 1) {
      group[0].standing.rank = i + 1;
      ordered.push(group[0].standing);
    } else {
      const ids = new Set(group.map((g) => g.standing.entry_id));
      const decision = state.tie_decisions.find((d) => d.entry_ids.length === ids.size && new Set(d.entry_ids).size === ids.size && d.entry_ids.every((id) => ids.has(id)));
      if (decision) {
        decision.entry_ids.forEach((id, k) => {
          const g = group.find((x) => x.standing.entry_id === id)!;
          g.standing.rank = i + 1 + k;
          ordered.push(g.standing);
        });
      } else {
        for (const g of group) { g.standing.rank = i + 1; g.standing.tie_unresolved = true; ordered.push(g.standing); }
      }
    }
    i = j;
  }
  for (const s of ordered) if (s.rank !== undefined && s.rank <= 3) s.place = s.rank as 1 | 2 | 3;

  const byCode = (a: Standing, b: Standing) => label(a.competitor_id).localeCompare(label(b.competitor_id));
  const incomplete = work.filter((w) => w.standing.status === "incomplete").map((w) => w.standing).sort(byCode);
  const noScores = work.filter((w) => w.standing.status === "no_scores").map((w) => w.standing).sort(byCode);

  // ---- คำเตือน + เงื่อนไขประกาศผล ----
  const warnings: string[] = [];
  for (const s of incomplete) warnings.push(`${label(s.competitor_id)} ยังกรอกคะแนนไม่ครบ (${s.sheets_done}/${category.judge_count} ใบ)`);
  const tieRanks = [...new Set(ordered.filter((s) => s.tie_unresolved).map((s) => s.rank!))];
  for (const r of tieRanks) {
    const codes = ordered.filter((s) => s.tie_unresolved && s.rank === r).map((s) => label(s.competitor_id));
    warnings.push(`คะแนนเท่ากัน ${codes.join(", ")} (อันดับ ${r}) ให้กรรมการตัดสิน`);
  }
  for (const s of noScores) warnings.push(`${label(s.competitor_id)} ไม่มีคะแนน (ไม่จัดอันดับ)`);
  const blockedByTie = ordered.some((s) => s.tie_unresolved && (s.rank ?? 99) <= 3);

  return {
    category_id: category.id, method, published: state.published,
    standings: [...ordered, ...incomplete, ...noScores],
    warnings, can_publish: incomplete.length === 0 && !blockedByTie,
  };
}

/** ผลสำหรับคนทั่วไป: ยังไม่ประกาศ = { status: "pending" } เท่านั้น · ประกาศแล้วเห็นเฉพาะรายการที่จัดอันดับ ไม่มีคะแนนรายกรรมการ */
export function toPublicResults(board: ResultBoard): PublicResults {
  if (!board.published) return { status: "pending" };
  const standings = board.standings
    .filter((s) => s.status === "complete")
    .map((s): Standing => ({ entry_id: s.entry_id, competitor_id: s.competitor_id, sheets_done: s.sheets_done, status: s.status, judge_totals: [], score: s.score, rank: s.rank, place: s.place, tie_unresolved: false }));
  return { status: "published", standings };
}
