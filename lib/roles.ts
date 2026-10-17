import type { StaffRole } from "@/lib/types";

// ไฟล์นี้ import ได้แค่ type — ห้าม import อะไรฝั่ง server (ใช้ได้ทั้ง client component และสคริปต์ทดสอบ)

/** สิทธิ์ตามเส้นทาง (ใช้ทั้ง proxy.ts และหน้าเว็บ) · find ใช้แถวแรกที่ตรง → แถวเจาะจงต้องอยู่ก่อน `/admin` */
export const PATH_ROLES: { prefix: string; roles: StaffRole[] }[] = [
  { prefix: "/admin/photos", roles: ["admin", "result_staff"] },
  { prefix: "/admin/score", roles: ["admin", "result_staff"] },
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/checkin", roles: ["admin", "result_staff"] },
  { prefix: "/print/scoresheet", roles: ["admin", "result_staff"] },
  { prefix: "/stream-hub", roles: ["admin", "stream_operator"] },
];

export function rolesForPath(path: string): StaffRole[] | undefined {
  return PATH_ROLES.find((r) => path === r.prefix || path.startsWith(`${r.prefix}/`))?.roles;
}
