// ทดสอบตารางสิทธิ์ตามเส้นทาง (ใบ K-P2d ข้อ 5) — ตรวจ rolesForPath จาก lib/roles.ts (ไม่ดึงโค้ดฝั่ง server)
// รัน: node --experimental-transform-types --import ./scripts/register-alias.mjs scripts/test-roles.ts
import assert from "node:assert/strict";
import { rolesForPath } from "../lib/roles.ts";
import type { StaffRole } from "../lib/types.ts";

let n = 0;
const same = (path: string, want: StaffRole[]) => {
  const got = rolesForPath(path);
  assert.deepEqual(got && [...got].sort(), [...want].sort(), `${path}: ได้ ${JSON.stringify(got)} ต้องเป็น ${JSON.stringify(want)}`);
  n++;
  console.log(`ok  ${path.padEnd(28)} → ${want.join(" + ")}`);
};

// สตาฟกรอกผลเข้าหน้ากรอกคะแนนได้ (พร้อมแอดมิน)
same("/admin/score", ["admin", "result_staff"]);
same("/admin/score/lip", ["admin", "result_staff"]);

// ส่วนที่มีผลต่อผลประกาศ / ตั้งค่า = แอดมินคนเดียว
for (const p of ["/admin", "/admin/results", "/admin/categories", "/admin/settings", "/admin/import", "/admin/sponsors"]) same(p, ["admin"]);

// กันจับ prefix ผิด: /admin/scoreboard ไม่ใช่ /admin/score
same("/admin/scoreboard", ["admin"]);

// หน้าที่สตาฟกรอกผลเข้าได้อยู่แล้ว
same("/admin/photos", ["admin", "result_staff"]);
same("/checkin", ["admin", "result_staff"]);
same("/print/scoresheet/lip", ["admin", "result_staff"]);

// ห้องคุม
same("/stream-hub", ["admin", "stream_operator"]);

// K-P3a: คิวงาน+สคริปต์ MC — สตาฟทั้ง 3 บทบาทอ่านได้ (อยู่ก่อนแถว /admin ในตาราง)
same("/admin/run-of-show", ["admin", "result_staff", "stream_operator"]);

// หน้าสาธารณะไม่มีข้อกำหนดสิทธิ์
assert.equal(rolesForPath("/"), undefined);
n++;
console.log(`ok  ${"/".padEnd(28)} → (สาธารณะ)`);

console.log(`\nผ่านทั้งหมด ${n} ข้อ`);
