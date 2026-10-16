import Link from "next/link";
import { data } from "@/lib/data";
import { AdminNav } from "@/components/admin/AdminNav";
import { maxTotal } from "@/lib/data/scoring";

export const dynamic = "force-dynamic";

// รายการประเภทให้เลือกกรอกคะแนน · สถานะอ่านจากกระดานผล (ฝั่งแอดมิน)
export default async function ScoreIndexPage() {
  const [categories, entries] = await Promise.all([data.getCategories(), data.getEntries()]);
  const boards = await Promise.all(categories.map((c) => data.getResultBoard(c.id)));
  return (
    <div className="space-y-4">
      <AdminNav />
      <h1 className="text-xl font-bold">กรอกคะแนนกรรมการ</h1>
      <p className="text-sm text-muted">กรอกจากใบคะแนนกระดาษของกรรมการ · เลือกประเภทด้านล่าง · พิมพ์ใบคะแนนเปล่าได้จากปุ่ม &quot;พิมพ์ใบคะแนน&quot;</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {categories.map((c, i) => {
          const b = boards[i];
          const total = entries.filter((e) => e.category_id === c.id).length;
          const full = b.standings.filter((s) => s.status === "complete").length;
          return (
            <li key={c.id} className="space-y-2 rounded-xl bg-surface p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-bold">{c.name}</h2>
                {b.published && <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">ประกาศผลแล้ว</span>}
              </div>
              <div className="text-xs text-muted">กรอกครบ {full}/{total} รายการ · กรรมการ {c.judge_count} คน · เต็ม {maxTotal(c)}</div>
              <div className="flex flex-wrap gap-2 text-sm">
                <Link className="rounded bg-accent px-3 py-1.5 font-bold text-black" href={`/admin/score/${c.code}`}>กรอกคะแนน</Link>
                <Link className="rounded bg-bg px-3 py-1.5" href="/admin/results">ผล / เปิดผล</Link>
                <Link className="rounded bg-bg px-3 py-1.5" href={`/print/scoresheet/${c.code}`} target="_blank">พิมพ์ใบคะแนน</Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
