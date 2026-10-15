import Link from "next/link";
import { data } from "@/lib/data";
import { AdminNav } from "@/components/admin/AdminNav";
import { criteriaSummary, sessionTimeLabel } from "@/lib/view";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [categories, competitors, entries, sponsors] = await Promise.all([
    data.getCategories(),
    data.getCompetitors(),
    data.getEntries(),
    data.getSponsors(),
  ]);
  const perPerson = new Map<string, number>();
  for (const e of entries) perPerson.set(e.competitor_id, (perPerson.get(e.competitor_id) ?? 0) + 1);
  const twoCats = [...perPerson.values()].filter((n) => n >= 2).length;
  const pendingTotal = categories.reduce((a, c) => a + c.pending_notes.length, 0);

  return (
    <div className="space-y-5">
      <AdminNav />
      <h1 className="text-xl font-bold">ภาพรวม</h1>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["ผู้แข่ง", competitors.length],
          ["รายการที่ลง", entries.length],
          ["ลง 2 ประเภท", twoCats],
          ["เช็กอินแล้ว", entries.filter((e) => e.is_checked_in).length],
        ].map(([l, v]) => (
          <div key={l} className="rounded bg-surface p-3 text-center">
            <div className="text-3xl font-black text-accent">{v}</div>
            <div className="text-xs text-muted">{l}</div>
          </div>
        ))}
      </section>

      {pendingTotal > 0 && (
        <p className="rounded bg-amber-500/15 p-3 text-sm text-amber-200">
          ⏸ มี {pendingTotal} ข้อที่ยัง<b>รอครูหนึ่งยืนยัน</b> (ดูในแต่ละประเภท) — ค่าที่ตั้งไว้เป็นค่าตั้งต้นจากโปสเตอร์ ยังไม่ใช่ข้อสรุป
        </p>
      )}

      <section>
        <h2 className="mb-1 font-bold text-accent-2">ประเภทการแข่งขัน {categories.length} ประเภท</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-1 text-left">ประเภท</th>
                <th className="text-left">ช่วง / เวลา</th>
                <th className="text-center">ผู้แข่ง</th>
                <th className="text-center">เช็กอิน</th>
                <th className="text-left">เกณฑ์</th>
                <th className="text-center">กรรมการ</th>
                <th className="text-left">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => {
                const es = entries.filter((e) => e.category_id === c.id);
                const sum = criteriaSummary(c);
                return (
                  <tr key={c.id} className="border-t border-white/5 align-top">
                    <td className="py-1 pr-2">
                      <Link href={`/admin/categories#${c.code}`} className="text-accent">{c.name}</Link>
                      <div className="text-xs text-muted">{c.name_en}</div>
                    </td>
                    <td className="pr-2 text-muted">{sessionTimeLabel(c)}</td>
                    <td className="text-center">{es.length}</td>
                    <td className="text-center">{es.filter((e) => e.is_checked_in).length}</td>
                    <td className="pr-2 text-muted">
                      {c.criteria.length ? `${c.criteria.length} ข้อ · รวม ${sum.total}${sum.blank ? ` · ว่าง ${sum.blank} ข้อ` : ""}` : "ยังไม่มี"}
                    </td>
                    <td className="text-center">{c.judge_count}</td>
                    <td>{c.pending_notes.length > 0 && <span className="rounded bg-amber-500/20 px-1 text-xs text-amber-300">⏸ {c.pending_notes.length} ข้อ</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-1 font-bold text-accent-2">สปอนเซอร์</h2>
        {sponsors.length === 0 ? (
          <p className="text-sm text-muted">ยังไม่มี — เพิ่มได้ที่เมนูสปอนเซอร์</p>
        ) : (
          <ul className="text-sm">
            {sponsors.map((s) => <li key={s.id}>{s.name} · {s.level} · {s.position} · ลำดับ {s.sequence}</li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
