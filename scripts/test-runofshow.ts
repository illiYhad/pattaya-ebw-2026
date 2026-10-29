// ทดสอบข้อมูล + ตรรกะหน้า Run-of-Show (ใบ K-P3a) — รัน: npm run test:runofshow
import assert from "node:assert/strict";
import fs from "node:fs";
import { RUNOFSHOW_CUES, RUNOFSHOW_CATEGORIES, groupBySection, showField, startMinutes, sectionOf, PENDING_TEXT } from "../lib/data/runofshow.ts";
import { rolesForPath } from "../lib/roles.ts";

let n = 0;
const ok = (name: string, fn: () => void) => { fn(); n++; console.log(`ok  ${name}`); };

ok("มี 12 คิวครบ ลำดับ 1–12", () => {
  assert.equal(RUNOFSHOW_CUES.length, 12);
  assert.deepEqual(RUNOFSHOW_CUES.map((c) => c.cue), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
});

ok("คิว 4: เวลา/นาที/remark เป็น null → แสดง 'รอผู้จัดยืนยัน' (ไม่เติมเอง)", () => {
  const c = RUNOFSHOW_CUES[3];
  assert.equal(c.time, null); assert.equal(c.min, null); assert.equal(c.remark, null);
  assert.equal(showField(c.time), PENDING_TEXT); assert.equal(showField(c.min, " นาที"), PENDING_TEXT); assert.equal(showField(c.remark), PENDING_TEXT);
});

ok("ช่องที่ต้นฉบับเว้นว่าง (คิว 8 remark · คิว 12 นาที) แสดง '—' ไม่ใช่ 'รอผู้จัดยืนยัน'", () => {
  assert.equal(showField(RUNOFSHOW_CUES[7].remark), "—");
  assert.equal(showField(RUNOFSHOW_CUES[11].min, " นาที"), "—");
});

ok("ค่าที่ดูผิดคงตามต้นฉบับ: คิว 8 = 12:00–13.00 แต่ MIN 120 · คิว 9 MIN 90 แต่ remark 120 นาที", () => {
  assert.equal(RUNOFSHOW_CUES[7].time, "12:00–13.00"); assert.equal(RUNOFSHOW_CUES[7].min, 120);
  assert.equal(RUNOFSHOW_CUES[8].min, 90); assert.match(String(RUNOFSHOW_CUES[8].remark), /120 นาที/);
});

ok("ทุกคิวที่มีสคริปต์มีข้อความ · คิว 8 ไม่มีสคริปต์", () => {
  for (const c of RUNOFSHOW_CUES) if (c.cue !== 8) assert.ok(c.script && c.script.length > 0, `คิว ${c.cue} ไม่มีสคริปต์`);
  assert.equal(RUNOFSHOW_CUES[7].script, null);
});

ok("ประเภทแข่ง: เช้า 4 · บ่าย 2", () => {
  assert.equal(RUNOFSHOW_CATEGORIES.morning.length, 4); assert.equal(RUNOFSHOW_CATEGORIES.afternoon.length, 2);
});

ok("อ่านเวลาเริ่ม + ช่วงของวัน (คำนวณจากข้อมูล)", () => {
  assert.equal(startMinutes("8.00–8.10"), 480); assert.equal(startMinutes("12:00–13.00"), 720); assert.equal(startMinutes("17:30"), 1050);
  assert.equal(startMinutes(null), null); assert.equal(startMinutes(""), null);
  assert.equal(sectionOf(719), "morning"); assert.equal(sectionOf(720), "lunch"); assert.equal(sectionOf(779), "lunch"); assert.equal(sectionOf(780), "afternoon");
});

ok("แบ่งเป็น เช้า(1–7 รวมคิว 4 ที่ไม่มีเวลา) / พักเที่ยง(8) / บ่าย(9–12)", () => {
  const g = groupBySection();
  assert.deepEqual(g.map((x) => x.section), ["morning", "lunch", "afternoon"]);
  assert.deepEqual(g.map((x) => x.cues.map((c) => c.cue)), [[1, 2, 3, 4, 5, 6, 7], [8], [9, 10, 11, 12]]);
});

ok("สิทธิ์: /admin/run-of-show = admin + result_staff + stream_operator เท่านั้น (ไม่ล็อกอิน/บทบาทอื่นเข้าไม่ได้)", () => {
  assert.deepEqual([...(rolesForPath("/admin/run-of-show") ?? [])].sort(), ["admin", "result_staff", "stream_operator"]);
  assert.equal(rolesForPath("/admin/run-of-show")?.includes("viewer" as never), false);
});

ok("proxy.ts ยังคุม /admin/:path* (หน้านี้ไม่เป็นหน้าสาธารณะ · ไม่ต้องแก้ proxy.ts)", () => {
  assert.match(fs.readFileSync(new URL("../proxy.ts", import.meta.url), "utf8"), /matcher:\s*\[[^\]]*"\/admin\/:path\*"/);
});

ok("ไม่มีชื่องานเก่า (แพรกษา/กระสา/praksa/krasa) ในไฟล์ของใบนี้", () => {
  for (const f of ["../lib/data/runofshow.ts", "../app/admin/run-of-show/page.tsx"]) {
    assert.doesNotMatch(fs.readFileSync(new URL(f, import.meta.url), "utf8"), /แพรกษา|กระสา|praksa|krasa/i, f);
  }
});

console.log(`\nผ่านทั้งหมด ${n} ข้อ`);
