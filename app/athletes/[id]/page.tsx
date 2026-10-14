import Link from "next/link";
import { notFound } from "next/navigation";
import { data } from "@/lib/data";
import { Avatar } from "@/components/profile/Avatar";
import { EventMark, Seal } from "@/components/brand/Brand";
import { publicPhoto } from "@/lib/people";
import { MEDIUM_LABEL, SESSION_LABEL, timeRangeOf } from "@/lib/view";

export const revalidate = 30;

// โปรไฟล์ผู้แข่งแบบนักกีฬาโอลิมปิก: รูปใหญ่ · ชื่อไทย/อังกฤษ · รหัส · ประเภทที่ลง + เวลา · ช่องผล (รอผล — K-P2 เติม)
export default async function AthletePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [categories, competitors, entries, photos] = await Promise.all([data.getCategories(), data.getCompetitors(), data.getEntries(), data.getPhotos()]);
  const me = competitors.find((c) => c.id === id || c.code === id.toUpperCase());
  if (!me) notFound();
  const mine = entries
    .filter((e) => e.competitor_id === me.id)
    .map((e) => ({ entry: e, category: categories.find((c) => c.id === e.category_id) }))
    .filter((x): x is { entry: typeof x.entry; category: NonNullable<typeof x.category> } => !!x.category)
    .sort((a, b) => a.category.sort_order - b.category.sort_order);
  const photo = publicPhoto(photos, me);

  return (
    <div className="space-y-6">
      <Link href="/athletes" className="text-xs text-muted">← ผู้แข่งทั้งหมด</Link>

      <section className="relative flex flex-col gap-6 overflow-hidden rounded-xl bg-surface/40 p-4 sm:flex-row">
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center opacity-[.08]" aria-hidden><EventMark variant="white" size={320} /></div>
        <div className="absolute right-3 top-3"><Seal size={40} /></div>
        <Avatar src={photo?.cutout_url} name={me.name_th} size="xl" className="mx-auto sm:mx-0" mark={20} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="text-sm font-bold tracking-widest text-accent-2">{me.code}</div>
          <h1 className="text-4xl font-black">{me.name_th}</h1>
          <div className="text-xl text-muted">{me.name_en}</div>
          {me.shop && <div className="text-sm text-muted">ร้าน/สังกัด: {me.shop}</div>}
          <div className="flex flex-wrap gap-2 pt-1 text-sm">
            {mine.map(({ category }) => (
              <Link key={category.id} href={`/athletes?cat=${category.code}`} className="rounded bg-surface px-2 py-1 hover:text-accent">{category.name}</Link>
            ))}
          </div>
          <div className="text-sm text-muted">ลงแข่ง {mine.length} ประเภท</div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["ประเภทที่ลง", mine.length], ["เช็กอินแล้ว", mine.filter((x) => x.entry.is_checked_in).length], ["เหรียญ", "รอผล"], ["อันดับดีที่สุด", "รอผล"]].map(([l, v]) => (
          <div key={l} className="rounded bg-surface p-3 text-center">
            <div className={`text-3xl font-black ${v === "รอผล" ? "text-muted" : "text-accent"}`}>{v}</div>
            <div className="text-xs text-muted">{l}</div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-accent-2">ประเภทที่ลงแข่ง</h2>
        {mine.length === 0 && <p className="text-sm text-muted">ยังไม่ได้ลงประเภทใด</p>}
        {mine.map(({ entry, category: c }) => (
          <div key={entry.id} className="grid gap-3 rounded-xl bg-surface p-4 sm:grid-cols-[1fr_220px]">
            <div>
              <div className="text-lg font-bold">{c.name}</div>
              <div className="text-xs text-muted">{c.name_en}</div>
              <div className="mt-1 text-sm text-accent">{SESSION_LABEL[c.session]} · {timeRangeOf(c)}</div>
              <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
                {c.medium && <span>{MEDIUM_LABEL[c.medium]}</span>}
                <span>กรรมการ {c.judge_count} คน</span>
                <span>เกณฑ์ {c.criteria.length ? `${c.criteria.length} ข้อ` : "รอยืนยัน"}</span>
                <span>{entry.is_checked_in ? "✅ เช็กอินแล้ว" : "⬜ ยังไม่เช็กอิน"}</span>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/15 p-3 text-center">
              <div className="text-xs text-muted">ผลคะแนน / อันดับ</div>
              <div className="text-2xl font-black text-muted">รอผล</div>
              <div className="text-[11px] text-muted">แสดงเมื่อระบบให้คะแนนเปิดใช้</div>
            </div>
          </div>
        ))}
      </section>

      {mine.map(({ category: c }) => {
        const others = entries
          .filter((e) => e.category_id === c.id && e.competitor_id !== me.id)
          .map((e) => competitors.find((x) => x.id === e.competitor_id))
          .filter((x): x is NonNullable<typeof x> => !!x)
          .sort((a, b) => a.code.localeCompare(b.code));
        if (!others.length) return null;
        return (
          <section key={c.id}>
            <h2 className="mb-2 font-bold text-accent-2">ผู้แข่งร่วมประเภท · {c.name} ({others.length} คน)</h2>
            <div className="flex flex-wrap gap-2">
              {others.map((p) => (
                <Link key={p.id} href={`/athletes/${p.id}`} className="flex items-center gap-2 rounded bg-surface px-2 py-1 text-sm hover:text-accent">
                  <Avatar src={publicPhoto(photos, p)?.cutout_url} name={p.name_th} size="sm" />
                  <span className="text-xs text-accent-2">{p.code}</span>{p.name_th}
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
