import { data } from "@/lib/data";
import { AdminNav } from "@/components/admin/AdminNav";
import { CategoriesClient } from "@/components/admin/CategoriesClient";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const [categories, entries] = await Promise.all([data.getCategories(), data.getEntries()]);
  const counts: Record<string, number> = {};
  for (const e of entries) counts[e.category_id] = (counts[e.category_id] ?? 0) + 1;
  return (
    <div className="space-y-4">
      <AdminNav />
      <h1 className="text-xl font-bold">ประเภท / เกณฑ์ให้คะแนน</h1>
      <p className="text-sm text-muted">
        แก้ชื่อ เวลา สิ่งที่ใช้แข่ง เกณฑ์ + คะแนนเต็มต่อข้อ (เว้นว่างได้) และจำนวนกรรมการ · ข้อที่ติดป้าย <b className="text-amber-300">รอยืนยัน</b> คือค่าตั้งต้นจากโปสเตอร์ที่ครูหนึ่งยังไม่ได้ตอบ — อย่าถือเป็นข้อสรุป
      </p>
      <CategoriesClient categories={categories} counts={counts} />
    </div>
  );
}
