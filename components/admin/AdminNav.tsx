import { getStaff } from "@/lib/auth";
import { rolesForPath } from "@/lib/roles";
import { AdminNavClient, type AdminTab } from "@/components/admin/AdminNavClient";

const TABS: AdminTab[] = [
  { href: "/admin", label: "ภาพรวม" },
  { href: "/admin/categories", label: "ประเภท / เกณฑ์" },
  { href: "/admin/score", label: "กรอกคะแนน" },
  { href: "/admin/results", label: "ผล / เปิดผล" },
  { href: "/admin/import", label: "นำเข้ารายชื่อ" },
  { href: "/admin/photos", label: "ถ่ายรูป" },
  { href: "/admin/run-of-show", label: "คิวงาน" },
  { href: "/admin/ad-cards", label: "บัตรห้อยคอ" },
  { href: "/admin/sponsors", label: "สปอนเซอร์" },
  { href: "/admin/settings", label: "ตั้งค่างาน" },
  { href: "/checkin", label: "เช็กอิน" },
];

/** เมนูสตาฟ: แสดงเฉพาะแท็บที่บทบาทของผู้ใช้เข้าได้ (ใช้ตารางสิทธิ์เดียวกับ proxy.ts) — call site เดิม <AdminNav /> ไม่ต้องแก้ */
export async function AdminNav() {
  const staff = await getStaff();
  const tabs = staff ? TABS.filter((t) => rolesForPath(t.href)?.includes(staff.role)) : [];
  return <AdminNavClient tabs={tabs} />;
}
