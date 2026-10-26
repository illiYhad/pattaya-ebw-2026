// ทดสอบตรรกะบัตรห้อยคอ (ใบ K-P5) — ข้อมูลบนบัตรต้องมาจากระบบเท่านั้น ไม่แต่งเอง
// รัน: node --experimental-transform-types --import ./scripts/register-alias.mjs scripts/test-adcard.ts
import assert from "node:assert/strict";
import { CARD_PROGRAM, CARD_TEXT, backCategories, competitorCards, eventDateLabels, nameFontPx, CARD_ROLES, CARD_ROLE_ORDER } from "../lib/adcard.ts";
import fs from "node:fs";
import { buildSeedStore } from "../lib/data/seed.ts";
import { DEFAULT_CATEGORIES } from "../lib/data/defaults.ts";
import { SCHEDULE } from "../lib/event.ts";
import { RUN_TIMES, normTime, startHHMM } from "../lib/schedule.ts";
import { RUNOFSHOW_CUES } from "../lib/data/runofshow.ts";

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


// ---------- K-P5a: เวลาบนบัตร = เวลาบนเว็บ = Run of Show (แหล่งเดียว lib/data/runofshow.ts) ----------
const webTime = (label: string) => SCHEDULE.find((r) => r.label === label)?.time;
const cardTime = (text: string) => CARD_PROGRAM.find((p) => p.text === text)?.time;

ok("เวลาบนบัตรตรงต้นฉบับ Run of Show (ล็อกค่าที่พี่หยัดเคาะ — ห้ามเปลี่ยน)", () => {
  assert.equal(cardTime("พิธีเปิดการแข่งขัน"), "08.00–09.00");
  assert.equal(cardTime("มอบโล่ผู้จัดงาน ผู้สนับสนุน และกรรมการ"), "10.30–11.30");
  assert.equal(cardTime("ประกาศผลและมอบถ้วยรางวัลทุกประเภท"), "15.30–17.00");
  assert.equal(cardTime("พิธีปิดการแข่งขัน"), "17.30");
  assert.equal(cardTime("สาธิตจาก Prime Speaker"), undefined);
  assert.ok(CARD_TEXT.register.startsWith("ลงทะเบียน 07.30–08.30 น."));
  assert.equal(CARD_TEXT.venueLine, "08.00–17.30 น.");
});

ok("เวลาบนเว็บ (SCHEDULE) ตรง Run of Show: ลงทะเบียน 07.30–08.30 · พิธีเปิด 08.00–09.00 · มอบโล่ 10.30–11.30", () => {
  assert.equal(webTime("ลงทะเบียน"), "07.30–08.30");
  assert.equal(webTime("พิธีเปิดงาน"), "08.00–09.00");
  assert.equal(webTime("มอบโล่กรรมการ"), "10.30–11.30");
});

ok("K-P5b: เวลาเริ่มแข่งช่วงเช้าบนเว็บ = Run of Show คิว 6 (09.00–10.30) ไม่ใช่ 10.00", () => {
  assert.equal(webTime("เริ่มการแข่งขันทุกประเภท"), "09.00–10.30");
  assert.equal(RUN_TIMES.competition, normTime(RUNOFSHOW_CUES.find((c) => c.cue === 6)!.time as string));
  assert.equal(SCHEDULE.find((r) => r.label === "เริ่มการแข่งขันทุกประเภท")?.start, "09:00");
});

ok("K-P5b: แถวของว่าง 15.00–15.30 คงไว้ (มาจากใบ K-P1.6 / โปสเตอร์ PMAT)", () => {
  assert.equal(webTime("รับประทานอาหารว่าง"), "15.00–15.30");
});

ok("เวลาที่บัตรกับเว็บมีร่วมกัน ต้องเท่ากันทุกรายการ", () => {
  assert.equal(webTime("ลงทะเบียน"), /\d\d\.\d\d–\d\d\.\d\d/.exec(CARD_TEXT.register)![0]);
  assert.equal(webTime("พิธีเปิดงาน"), cardTime("พิธีเปิดการแข่งขัน"));
  assert.equal(webTime("มอบโล่กรรมการ"), cardTime("มอบโล่ผู้จัดงาน ผู้สนับสนุน และกรรมการ"));
  assert.equal(SCHEDULE.find((r) => r.lines)?.time, cardTime("ประกาศผลและมอบถ้วยรางวัลทุกประเภท"));
});

ok("RUN_TIMES ทุกค่ามาจากคิวใน run-of-show จริง", () => {
  const cue = (n: number) => normTime(RUNOFSHOW_CUES.find((c) => c.cue === n)!.time as string);
  assert.equal(RUN_TIMES.plaque, cue(7));
  assert.equal(RUN_TIMES.lunch, cue(8));
  assert.equal(RUN_TIMES.speaker, cue(10));
  assert.equal(RUN_TIMES.results, cue(11));
  assert.equal(RUN_TIMES.closing, cue(12));
  assert.equal(RUN_TIMES.opening, `${cue(1).split("–")[0]}–${cue(5).split("–")[1]}`);
});

ok("แถวเว็บเรียงตามเวลา และ start (HH:MM) ตรงต้นเวลาของแถว", () => {
  const starts = SCHEDULE.map((r) => r.start);
  assert.deepEqual(starts, [...starts].sort());
  for (const r of SCHEDULE) assert.equal(r.start, startHHMM(normTime(r.time)));
});

ok("normTime รับรูปแบบจากต้นฉบับ (8.00–8.10 · 12:00–13.00 · 17:30)", () => {
  assert.equal(normTime("8.00–8.10"), "08.00–08.10");
  assert.equal(normTime("12:00–13.00"), "12.00–13.00");
  assert.equal(normTime("17:30"), "17.30");
  assert.throws(() => normTime("ไม่มีเวลา"));
});


// ---------- K-P4b: เวลา 7 ประเภทใน seed = defaults.ts = Run of Show ----------
ok("K-P4b: เวลา/ระยะเวลา 7 ประเภทใน defaults.ts ตรง Run of Show (เช้าเริ่มคิว 6 · บ่ายเริ่มคิว 9 · จบ = เริ่ม + duration)", () => {
  const cueStart = (n: number) => normTime(RUNOFSHOW_CUES.find((c) => c.cue === n)!.time as string).split("–")[0];
  const want: Record<string, [string, string, number] | null> = {
    hairstroke: ["09.00", "10.30", 90], lip: ["09.00", "10.30", 90], lash: ["09.00", "10.30", 90], facial: ["09.00", "10.00", 60],
    shading: ["13.00", "14.30", 90], thai_massage: ["13.00", "14.00", 60], inbox: null,
  };
  assert.equal(DEFAULT_CATEGORIES.length, 7);
  for (const c of DEFAULT_CATEGORIES) {
    const w = want[c.code];
    if (!w) { assert.equal(c.start_time, undefined); assert.equal(c.duration_min, undefined); continue; }
    assert.deepEqual([c.start_time, c.end_time, c.duration_min], w, c.code);
    assert.equal(c.start_time, cueStart(c.session === "morning" ? 6 : 9), c.code);
    const [h, m] = c.start_time!.split(".").map(Number);
    const end = h * 60 + m + c.duration_min!;
    assert.equal(c.end_time, `${String(Math.floor(end / 60)).padStart(2, "0")}.${String(end % 60).padStart(2, "0")}`, c.code);
  }
});

ok("K-P4b: หมายเหตุรอผู้จัดยืนยัน — เช้า 4 ประเภท / บ่าย 2 ประเภท · หมายเหตุเก่า shading 60 นาทีถูกลบ", () => {
  const notes = (code: string) => DEFAULT_CATEGORIES.find((c) => c.code === code)!.pending_notes.join(" | ");
  for (const code of ["hairstroke", "lip", "lash", "facial"]) assert.match(notes(code), /ช่องแข่งเช้า 09\.00–10\.30 ช่องเดียว/, code);
  for (const code of ["shading", "thai_massage"]) assert.match(notes(code), /ถอยหลัง 120 นาที/, code);
  assert.doesNotMatch(notes("shading"), /ตั้ง 60 นาทีตามตาราง/);
  assert.match(notes("lash"), /เงื่อนไขแชมป์เก่า/); // หมายเหตุเดิมของ lash ยังอยู่
});

ok("K-P4b: 005_seed.sql และส่วน 005 ใน ALL_001-005.sql ตรงกัน และเวลา/หมายเหตุตรง defaults.ts", () => {
  const rowsOf = (f: string) => fs.readFileSync(new URL(`../supabase/sql/${f}`, import.meta.url), "utf8").split(/\r?\n/).filter((l) => l.startsWith("  ('cat-"));
  const seed = rowsOf("005_seed.sql");
  assert.equal(seed.length, 7);
  assert.deepEqual(rowsOf("ALL_001-005.sql").map((l) => l.replace(/,$/, "")), seed.map((l) => l.replace(/,$/, "")));
  for (const c of DEFAULT_CATEGORIES) {
    const row = seed.find((l) => l.startsWith(`  ('${c.id}',`))!;
    const time = c.start_time ? `'${c.session}', '${c.start_time}', '${c.end_time}', ${c.duration_min},` : `'${c.session}', null, null, null,`;
    assert.ok(row.includes(time), `${c.code}: ${time}`);
    assert.ok(row.includes(`${JSON.stringify(c.pending_notes).replace(/'/g, "''")}'::jsonb, ${c.sort_order})`), `${c.code}: pending_notes`);
  }
});

console.log(`\nผ่านทั้งหมด ${n} ข้อ`);
