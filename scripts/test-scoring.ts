// ทดสอบตัวคำนวณคะแนน + Engine (ใบ K-P2a ข้อ 5 · S1–S12) — ใช้ชุดข้อมูลของตัวเอง ไม่ใช้ seed
// รัน: node --experimental-transform-types --import ./scripts/register-alias.mjs scripts/test-scoring.ts
import assert from "node:assert/strict";
import { Engine } from "../lib/data/engine.ts";
import { emptyStore } from "../lib/data/defaults.ts";
import type { Category } from "../lib/types.ts";

let t = 0;
const ctx = () => ({ now: () => new Date(Date.UTC(2026, 9, 14, 8, 0, 0, ++t * 1000)).toISOString(), newId: (p: string) => `${p}-${++t}`, staffId: "staff-1" });

const THAI_CRITERIA = [
  { name: "บุคลิกภาพและมารยาท", max: 10 }, { name: "เตรียมสถานที่", max: 10 }, { name: "ต้อนรับ ซักประวัติ ความปลอดภัย", max: 10 },
  { name: "เทคนิคการนวด", max: 40 }, { name: "แนะนำหลังนวด", max: 10 }, { name: "ลำดับขั้นตอน", max: 10 }, { name: "รักษาเวลา", max: 10 },
];
const mkCat = (id: string, criteria: Category["criteria"], judge_count = 3): Category => ({
  id, code: id, name: `ประเภท ${id}`, name_en: id, session: "morning", criteria, judge_count, pending_notes: [], sort_order: 1, updated_at: "",
});

/** โลกจำลอง: thai (รายเกณฑ์) · lip (โหมดรวม) · five (โหมดรวม กรรมการ 5) · ผู้แข่ง A–F ลงทุกประเภท */
function world() {
  const s = emptyStore();
  s.categories.push(mkCat("thai", THAI_CRITERIA), mkCat("lip", []), mkCat("five", [], 5));
  "ABCDEF".split("").forEach((n, i) => {
    s.competitors.push({ id: `c${n}`, code: `EBW-00${i + 1}`, name_th: n, name_en: n, person_key: n, updated_at: "" });
    for (const c of s.categories) s.entries.push({ id: `e${n}-${c.id}`, competitor_id: `c${n}`, category_id: c.id, is_checked_in: true, updated_at: "" });
  });
  return { s, e: new Engine(s, ctx()) };
}
type W = ReturnType<typeof world>;

/** สร้าง criteria_scores ของนวดไทย: เทคนิคการนวด = tech · ที่เหลือแบ่งให้ครบ total (เต็มข้อละ 10) */
function thaiScores(total: number, tech: number): number[] {
  let rest = total - tech;
  const others = [0, 1, 2, 4, 5, 6].map(() => { const v = Math.min(10, rest); rest -= v; return v; });
  assert.equal(rest, 0, "แบ่งคะแนนไม่ลงตัว");
  return [others[0], others[1], others[2], tech, others[3], others[4], others[5]];
}
const eid = (n: string, cat: string) => `e${n}-${cat}`;
const putThai = (w: W, n: string, totals: number[], techs: number[]) => totals.forEach((tot, j) => w.e.saveScoreSheet(eid(n, "thai"), j + 1, { criteria_scores: thaiScores(tot, techs[j]) }));
const putTotals = (w: W, n: string, cat: string, totals: number[]) => totals.forEach((tot, j) => w.e.saveScoreSheet(eid(n, cat), j + 1, { total: tot }));
const stand = (w: W, cat: string, n: string) => w.e.getResultBoard(cat).standings.find((x) => x.entry_id === eid(n, cat))!;

const results: string[] = [];
const pending: Promise<void>[] = [];
function test(id: string, name: string, fn: () => void | Promise<void>) {
  pending.push((async () => {
    try { await fn(); results.push(`PASS ${id} ${name}`); } catch (err) { results.push(`FAIL ${id} ${name}\n     ${(err as Error).message}`); process.exitCode = 1; }
  })());
}
const throwsTh = (fn: () => unknown, re?: RegExp) => assert.throws(fn, (e: Error) => /[฀-๿]/.test(e.message) && (!re || re.test(e.message)));

test("S1", "นวดไทย 85·90·88 → 87.67", () => {
  const w = world();
  putThai(w, "A", [85, 90, 88], [30, 32, 31]);
  assert.equal(stand(w, "thai", "A").score, 87.67);
});

test("S2", "รวมเท่ากัน 80 → ตัดสินด้วยเทคนิคการนวด B 35.00 > C 33.33 ไม่ tie_unresolved", () => {
  const w = world();
  putThai(w, "B", [80, 80, 80], [35, 35, 35]);
  putThai(w, "C", [80, 80, 80], [34, 33, 33]);
  const b = w.e.getResultBoard("thai");
  const [first, second] = b.standings;
  assert.equal(first.entry_id, eid("B", "thai"));
  assert.equal(second.entry_id, eid("C", "thai"));
  assert.equal(first.tiebreak_score, 35);
  assert.equal(second.tiebreak_score, 33.33);
  assert.equal(first.rank, 1);
  assert.equal(second.rank, 2);
  assert.ok(!first.tie_unresolved && !second.tie_unresolved);
});

test("S3", "D·E ใบเหมือนกัน → อันดับร่วม 1 · publish ไม่ได้ → ตัดสิน [E,D] → E=1 D=2 · publish ได้", () => {
  const w = world();
  putThai(w, "D", [84, 84, 84], [34, 34, 34]);
  putThai(w, "E", [84, 84, 84], [34, 34, 34]);
  let b = w.e.getResultBoard("thai");
  assert.equal(stand(w, "thai", "D").rank, 1);
  assert.equal(stand(w, "thai", "E").rank, 1);
  assert.ok(stand(w, "thai", "D").tie_unresolved && stand(w, "thai", "E").tie_unresolved);
  assert.equal(b.can_publish, false);
  assert.ok(b.warnings.some((x) => x.includes("คะแนนเท่ากัน") && x.includes("EBW-004") && x.includes("EBW-005")));
  w.e.setTieDecision("thai", [eid("E", "thai"), eid("D", "thai")]);
  b = w.e.getResultBoard("thai");
  assert.equal(stand(w, "thai", "E").rank, 1);
  assert.equal(stand(w, "thai", "D").rank, 2);
  assert.equal(b.standings[0].entry_id, eid("E", "thai"));
  assert.ok(!stand(w, "thai", "E").tie_unresolved && !stand(w, "thai", "D").tie_unresolved);
  assert.equal(b.can_publish, true);
  // ตัดสินกลุ่มที่ไม่ได้เสมออยู่ / ไม่ครบกลุ่ม → throw
  throwsTh(() => w.e.setTieDecision("thai", [eid("E", "thai"), eid("D", "thai")]));
  const w2 = world();
  putTotals(w2, "A", "lip", [80, 80, 80]); putTotals(w2, "B", "lip", [80, 80, 80]); putTotals(w2, "C", "lip", [80, 80, 80]);
  throwsTh(() => w2.e.setTieDecision("lip", [eid("A", "lip"), eid("B", "lip")]));
});

test("S4", "สักปาก (โหมดรวม) 70·75·77 → 74.00", () => {
  const w = world();
  putTotals(w, "A", "lip", [70, 75, 77]);
  assert.equal(stand(w, "lip", "A").score, 74);
});

test("S5", "กรรมการ 5 คน 50·70·80·90·95 → mean 77.00 · trimmed_mean 80.00", () => {
  const w = world();
  putTotals(w, "A", "five", [50, 70, 80, 90, 95]);
  assert.equal(stand(w, "five", "A").score, 77);
  w.e.setScoreMethod("five", "trimmed_mean");
  assert.equal(stand(w, "five", "A").score, 80);
  assert.equal(w.e.getResultBoard("five").method, "trimmed_mean");
});

test("S6", "setScoreMethod trimmed_mean เมื่อ judge_count = 3 → throw ข้อความไทย", () => {
  const w = world();
  throwsTh(() => w.e.setScoreMethod("lip", "trimmed_mean"), /5 คน/);
});

test("S7", "เทคนิคการนวด 41 · ติดลบ · 7.25 → throw · 7.5 ผ่าน", () => {
  const w = world();
  const base = thaiScores(80, 35);
  const withTech = (v: number) => { const x = [...base]; x[3] = v; return x; };
  throwsTh(() => w.e.saveScoreSheet(eid("A", "thai"), 1, { criteria_scores: withTech(41) }), /เทคนิคการนวด เต็ม 40 กรอก 41 ไม่ได้/);
  throwsTh(() => w.e.saveScoreSheet(eid("A", "thai"), 1, { criteria_scores: withTech(-1) }));
  throwsTh(() => w.e.saveScoreSheet(eid("A", "thai"), 1, { criteria_scores: withTech(7.25) }), /ทศนิยม/);
  const ok = w.e.saveScoreSheet(eid("A", "thai"), 1, { criteria_scores: withTech(7.5) });
  assert.equal(ok.criteria_scores![3], 7.5);
  assert.equal(w.s.scoreSheets.length, 1);
  // โหมดรวม: เกิน 100 / ไม่ครบข้อ / กรรมการเกินจำนวน
  throwsTh(() => w.e.saveScoreSheet(eid("A", "lip"), 1, { total: 100.5 }));
  throwsTh(() => w.e.saveScoreSheet(eid("A", "thai"), 1, { criteria_scores: [1, 2, 3] }));
  throwsTh(() => w.e.saveScoreSheet(eid("A", "lip"), 4, { total: 50 }));
});

test("S8", "รายการมีใบ 2 จาก 3 → incomplete · publish → throw ระบุ EBW-xxx", () => {
  const w = world();
  putTotals(w, "A", "lip", [80, 81, 82]);
  putTotals(w, "B", "lip", [70, 71]);
  assert.equal(stand(w, "lip", "B").status, "incomplete");
  assert.equal(stand(w, "lip", "B").rank, undefined);
  const b = w.e.getResultBoard("lip");
  assert.equal(b.can_publish, false);
  throwsTh(() => w.e.publishResults("lip"), /EBW-002/);
});

test("S9", "รายการไม่มีใบเลย → no_scores ไม่จัดอันดับ · publish ได้ (มี warning)", () => {
  const w = world();
  putTotals(w, "A", "lip", [80, 81, 82]);
  const s = stand(w, "lip", "C");
  assert.equal(s.status, "no_scores");
  assert.equal(s.rank, undefined);
  const b = w.e.getResultBoard("lip");
  assert.ok(b.warnings.some((x) => x.includes("EBW-003")));
  assert.equal(b.can_publish, true);
  w.e.publishResults("lip");
  assert.equal(w.e.getResultBoard("lip").published, true);
});

test("S10", "pending ไม่มีตัวเลข / publish เห็นอันดับ / save ตอนประกาศ throw / hide แล้ว save ผ่าน", () => {
  const w = world();
  putTotals(w, "A", "lip", [80, 81, 82]);
  putTotals(w, "B", "lip", [70, 71, 72]);
  const before = w.e.getPublicResults("lip");
  assert.deepEqual(before, { status: "pending" });
  assert.equal(JSON.stringify(before).match(/\d/g), null);
  w.e.publishResults("lip");
  const pub = w.e.getPublicResults("lip");
  assert.equal(pub.status, "published");
  if (pub.status === "published") {
    assert.equal(pub.standings[0].rank, 1);
    assert.equal(pub.standings[0].entry_id, eid("A", "lip"));
    assert.deepEqual(pub.standings[0].judge_totals, []);
  }
  throwsTh(() => w.e.saveScoreSheet(eid("A", "lip"), 1, { total: 90 }), /ประกาศผลแล้ว ต้องกดซ่อนผลก่อนแก้คะแนน/);
  throwsTh(() => w.e.clearScoreSheet(eid("A", "lip"), 1), /ประกาศผลแล้ว/);
  throwsTh(() => w.e.setScoreMethod("lip", "mean"), /ประกาศผลแล้ว/);
  w.e.hideResults("lip");
  assert.deepEqual(w.e.getPublicResults("lip"), { status: "pending" });
  w.e.saveScoreSheet(eid("A", "lip"), 1, { total: 90 });
  assert.equal(stand(w, "lip", "A").score, 84.33);
});

test("S11", "saveCategory แก้ criteria / judge_count เมื่อมีคะแนน → throw · แก้ชื่อผ่าน · ลบผู้แข่ง/รายการที่มีคะแนน → throw", () => {
  const w = world();
  putThai(w, "A", [85, 90, 88], [30, 32, 31]);
  throwsTh(() => w.e.saveCategory("thai", { judge_count: 5 }), /ล้างคะแนนก่อน/);
  throwsTh(() => w.e.saveCategory("thai", { criteria: THAI_CRITERIA.slice(0, 6) }), /ล้างคะแนนก่อน/);
  throwsTh(() => w.e.saveCategory("thai", { criteria: THAI_CRITERIA.map((c) => ({ ...c, max: c.max + 1 })) }), /ล้างคะแนนก่อน/);
  assert.equal(w.e.saveCategory("thai", { name: "ชื่อใหม่" }).name, "ชื่อใหม่");
  assert.equal(w.e.saveCategory("thai", { judge_count: 3 }).judge_count, 3);
  throwsTh(() => w.e.deleteCompetitor("cA"), /มีคะแนนแล้ว ล้างคะแนนก่อน/);
  throwsTh(() => w.e.removeEntry(eid("A", "thai")), /มีคะแนนแล้ว ล้างคะแนนก่อน/);
  // ประเภทที่ยังไม่มีคะแนนแก้ได้ · ล้างคะแนนแล้วแก้ได้
  assert.equal(w.e.saveCategory("lip", { judge_count: 5 }).judge_count, 5);
  [1, 2, 3].forEach((j) => w.e.clearScoreSheet(eid("A", "thai"), j));
  assert.equal(w.e.saveCategory("thai", { judge_count: 5 }).judge_count, 5);
  w.e.removeEntry(eid("A", "thai"));
});

test("S12", "save 1 · clear 1 · publish 1 → audit 3 แถวเรียงตามเวลา action ถูก", () => {
  const w = world();
  putTotals(w, "A", "lip", [80, 81, 82]);
  w.e.clearScoreSheet(eid("A", "lip"), 3);
  w.e.saveScoreSheet(eid("A", "lip"), 3, { total: 82 }); // ใบกลับมาครบเพื่อ publish ได้
  w.e.publishResults("lip");
  const a = w.e.getScoreAudit("lip");
  assert.deepEqual(a.map((x) => x.action), ["save", "save", "save", "clear", "save", "publish"]);
  const w2 = world();
  w2.e.saveScoreSheet(eid("A", "lip"), 1, { total: 80 });
  w2.e.clearScoreSheet(eid("A", "lip"), 1);
  w2.e.publishResults("lip");
  const a2 = w2.e.getScoreAudit("lip");
  assert.deepEqual(a2.map((x) => x.action), ["save", "clear", "publish"]);
  assert.ok(a2[0].at < a2[1].at && a2[1].at < a2[2].at);
  assert.equal(a2[0].by, "staff-1");
  assert.equal(a2[0].after, "80");
  assert.equal(a2[1].before, "80");
});

// ---- เพิ่มเติม: ล้างคำตัดสินเสมอเมื่อคะแนนเปลี่ยน · ปัดครึ่งขึ้น · seed ตามใบ ----
test("X1", "คะแนนเปลี่ยนหลังตัดสินเสมอ → tie_decisions ถูกล้าง + audit tie_reset", () => {
  const w = world();
  putTotals(w, "A", "lip", [80, 80, 80]); putTotals(w, "B", "lip", [80, 80, 80]);
  w.e.setTieDecision("lip", [eid("B", "lip"), eid("A", "lip")]);
  assert.equal(stand(w, "lip", "B").rank, 1);
  w.e.saveScoreSheet(eid("A", "lip"), 1, { total: 80.1 });
  assert.equal(w.s.resultStates[0].tie_decisions.length, 0);
  assert.ok(w.e.getScoreAudit("lip").some((x) => x.action === "tie_reset"));
});

test("X2", "ปัดครึ่งขึ้นหน่วย 0.01 (80.1·80.1·80 → 80.07 · 0.5·0.5·0.5+... ไม่เพี้ยน)", () => {
  const w = world();
  putTotals(w, "A", "lip", [80.1, 80.1, 80]);
  assert.equal(stand(w, "lip", "A").score, 80.07);
  putTotals(w, "B", "lip", [0.1, 0.2, 0.2]); // 0.5/3 = 0.1667 → 0.17
  assert.equal(stand(w, "lip", "B").score, 0.17);
  putTotals(w, "C", "lip", [0.1, 0.1, 0.1]);
  assert.equal(stand(w, "lip", "C").score, 0.1);
});

test("X3", "seed: thai_massage ครบ ไม่เสมอ · lip มี incomplete + เสมออันดับ ≤ 3 · ไม่มีประเภทไหนประกาศ", async () => {
  const { buildSeedStore } = await import("../lib/data/seed.ts");
  const s = buildSeedStore();
  const e = new Engine(s, ctx());
  const thai = e.getResultBoard("cat-thai-massage");
  assert.ok(thai.standings.length >= 3 && thai.standings.every((x) => x.status === "complete" && !x.tie_unresolved));
  assert.equal(new Set(thai.standings.map((x) => x.score)).size, thai.standings.length);
  assert.equal(thai.can_publish, true);
  const lip = e.getResultBoard("cat-lip");
  assert.equal(lip.standings.filter((x) => x.status === "incomplete").length, 1);
  assert.equal(lip.standings.filter((x) => x.tie_unresolved && (x.rank ?? 9) <= 3).length, 2);
  assert.equal(lip.can_publish, false);
  assert.ok(s.categories.every((c) => !e.getResultBoard(c.id).published));
  for (const c of s.categories) if (c.id !== "cat-thai-massage" && c.id !== "cat-lip") assert.ok(e.getResultBoard(c.id).standings.every((x) => x.status === "no_scores"));
});

await Promise.all(pending);
results.sort();
console.log(results.join("\n"));
console.log(`\n${results.filter((r) => r.startsWith("PASS")).length}/${results.length} passed`);
