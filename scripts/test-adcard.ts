// ทดสอบตรรกะบัตรห้อยคอ (ใบ K-P5) — ข้อมูลบนบัตรต้องมาจากระบบเท่านั้น ไม่แต่งเอง
// รัน: node --experimental-transform-types --import ./scripts/register-alias.mjs scripts/test-adcard.ts
import assert from "node:assert/strict";
import { backCategories, competitorCards, eventDateLabels, nameFontPx, CARD_ROLES, CARD_ROLE_ORDER } from "../lib/adcard.ts";
import { buildSeedStore } from "../lib/data/seed.ts";

let n = 0;
const ok = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log(`ok  ${name}`);
};

const s = buildSeedStore();
const cards = competitorCards(s.categories, s.competitors, s.entries, s.photos);

ok("ผู้แข่งทุกคนในระบบได้บัตร และรหัสบนบัตร = Competitor.code เดียวกับไลฟ์", () => {
  assert.equal(cards.length, s.competitors.length);
  for (const c of cards) assert.equal(c.code, s.competitors.find((x) => x.id === c.id)?.code);
});

ok("ประเภทบนบัตรตรงกับรายการที่ลงจริง (1–2 ประเภท เรียงตาม sort_order)", () => {
  for (const c of cards) {
    const mine = s.entries.filter((e) => e.competitor_id === c.id);
    assert.equal(c.second.length, mine.length);
    assert.ok(c.second.length >= 1 && c.second.length <= 2);
    const want = mine.map((e) => s.categories.find((x) => x.id === e.category_id)!).sort((a, b) => a.sort_order - b.sort_order).map((x) => x.name);
    assert.deepEqual(c.second, want);
  }
});

ok("ผู้แข่งที่ลง 2 ประเภทมีอยู่ในข้อมูลทดสอบ (กันเทสต์ว่าง)", () => {
  assert.ok(cards.some((c) => c.second.length === 2));
});

ok("ไม่มีรูป = photo ว่าง (ไม่แต่งรูปให้)", () => {
  assert.ok(cards.every((c) => c.photo === undefined));
});

ok("หลังบัตร: ประเภทดึงจากระบบ เรียง sort_order พร้อมช่วงจาก session", () => {
  const b = backCategories(s.categories);
  assert.equal(b.length, s.categories.length);
  assert.deepEqual(b.map((x) => x.id), [...s.categories].sort((a, c) => a.sort_order - c.sort_order).map((x) => x.id));
  assert.deepEqual([...new Set(b.map((x) => x.sessionLabel))].sort(), ["ส่งล่วงหน้า", "เช้า", "บ่าย"].sort());
});

ok("วันงาน → ป้ายอังกฤษ/ไทย (ปี ค.ศ.) · รูปแบบผิด = ว่าง", () => {
  assert.deepEqual(eventDateLabels("2026-10-30"), { en: "30 OCTOBER 2026", th: "30 ต.ค. 2026" });
  assert.deepEqual(eventDateLabels(""), { en: "", th: "" });
  assert.deepEqual(eventDateLabels("2026-13-01"), { en: "", th: "" });
});

ok("ตารางบทบาทครบ 6 ตามสคริปต์พิธีกร", () => {
  assert.deepEqual(CARD_ROLE_ORDER, ["competitor", "judge", "organizer", "vip", "speaker", "sponsor"]);
  assert.equal(CARD_ROLES.judge.bg, "#F2CC2E");
  assert.equal(CARD_ROLES.judge.fg, "#1E1A08");
});

ok("ชื่อยาวหดฟอนต์ลงตามความยาว (ไทย 40 ตัวอักษร ≤ 12px)", () => {
  assert.equal(nameFontPx("ก".repeat(10)), 21);
  assert.equal(nameFontPx("ก".repeat(20)), 17);
  assert.equal(nameFontPx("ก".repeat(30)), 14);
  assert.equal(nameFontPx("ก".repeat(40)), 12);
});

console.log(`\nผ่านทั้งหมด ${n} ข้อ`);
