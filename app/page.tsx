import Link from "next/link";
import { data } from "@/lib/data";
import { EVENT, SCHEDULE } from "@/lib/event";
import { EventLogo, Seal, Watermark } from "@/components/brand/Brand";
import { MEDIUM_LABEL, SESSION_LABEL, SESSION_ORDER, thaiDate, timeRangeOf } from "@/lib/view";

// หน้าสาธารณะ: ไม่ subscribe Realtime — ใช้ revalidate แทน
export const revalidate = 20;

export default async function Home() {
  const [categories, entries, config] = await Promise.all([data.getCategories(), data.getEntries(), data.getEventConfig()]);
  const countOf = (id: string) => entries.filter((e) => e.category_id === id).length;
  const day = config.days[0] ?? EVENT.days[0];

  return (
    <div className="space-y-8">
      <section className="relative space-y-3 overflow-hidden rounded-xl bg-surface p-5">
        <Watermark height={420} opacity={0.05} />
        <div className="relative flex flex-wrap items-center gap-6">
          <span className="hidden sm:block"><EventLogo variant="white" width={420} priority /></span>
          <span className="sm:hidden"><EventLogo variant="white" width={260} priority /></span>
          <span className="hidden sm:block"><Seal size={120} priority /></span>
          <span className="sm:hidden"><Seal size={80} priority /></span>
        </div>
        <h1 className="relative text-3xl font-black text-accent">{EVENT.titleLine2}</h1>
        <div className="relative text-base text-text/90">{EVENT.titleLine1}</div>
        <div className="relative flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <span>📅 {thaiDate(day)}</span>
          <span>📍 {EVENT.venue} ({EVENT.venueEn})</span>
          <span>จัดโดย {EVENT.organizer} · {EVENT.organizerEn}</span>
        </div>
        {config.announcement && <div className="relative rounded bg-accent-2/15 p-3 text-sm text-text whitespace-pre-line">📢 {config.announcement}</div>}
        <div className="relative flex flex-wrap gap-2 pt-1 text-sm">
          <Link href="/athletes" className="rounded bg-bg px-3 py-1 hover:text-accent">ผู้แข่งทั้งหมด</Link>
          <Link href="/checkin" className="rounded bg-bg px-3 py-1 hover:text-accent">เช็กอิน</Link>
          <Link href="/admin" className="rounded bg-bg px-3 py-1 hover:text-accent">แอดมิน</Link>
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-bold text-accent-2">กำหนดการ · {thaiDate(day)}</h2>
        <div className="overflow-x-auto rounded-xl bg-surface/60">
          <table className="w-full text-sm">
            <tbody>
              {SCHEDULE.map((s) => (
                <tr key={s.time + s.label} className="border-b border-white/5 last:border-0">
                  <td className="w-32 py-2 pl-4 pr-2 font-bold text-accent">{s.time}</td>
                  <td className="py-2 pr-4">{s.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-bold text-accent-2">ประเภทการแข่งขัน {categories.length} ประเภท</h2>
        {SESSION_ORDER.map((s) => {
          const cats = categories.filter((c) => c.session === s);
          if (!cats.length) return null;
          return (
            <div key={s}>
              <div className="mb-2 text-sm text-muted">{SESSION_LABEL[s]}</div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cats.map((c) => (
                  <Link key={c.id} href={`/athletes?cat=${c.code}`} className="relative rounded-xl border border-white/5 bg-surface p-4 hover:border-accent/60">
                    <div className="text-lg font-bold leading-tight">{c.name}</div>
                    <div className="text-xs text-muted">{c.name_en}</div>
                    <div className="mt-2 text-sm text-accent">{timeRangeOf(c)}</div>
                    <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
                      {c.medium && <span>{MEDIUM_LABEL[c.medium]}</span>}
                      <span>ผู้แข่ง {countOf(c.id)} คน</span>
                      <span>กรรมการ {c.judge_count} คน</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </section>
      <p className="text-xs text-muted">ข้อมูลอัปเดตทุก 20 วินาที · ผลคะแนนและอันดับจะแสดงเมื่อระบบให้คะแนนเปิดใช้</p>
    </div>
  );
}
