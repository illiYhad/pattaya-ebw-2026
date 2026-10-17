import Link from "next/link";
import { getStaff } from "@/lib/auth";

/** ลิงก์ "แอดมิน" บนหัวเว็บ: ปลายทางตามบทบาท (กด /admin แล้วสตาฟกรอกผลจะโดนปฏิเสธ) · getStaff() แคชต่อ request เดียวกับ UserBadge จึงไม่ดึงข้อมูลเพิ่ม */
const HOME: Record<string, string> = { admin: "/admin", result_staff: "/admin/score", stream_operator: "/stream-hub" };

export async function AdminLink() {
  const staff = await getStaff();
  const href = (staff && HOME[staff.role]) || "/admin"; // ยังไม่ล็อกอิน → /admin ให้ proxy พาไปหน้าล็อกอิน
  return <Link href={href} className="flex min-h-11 items-center px-3 text-muted">แอดมิน</Link>;
}
