import Link from "next/link";
import { notFound } from "next/navigation";
import { data } from "@/lib/data";
import { Avatar } from "@/components/profile/Avatar";
import { Keep, Phrases } from "@/components/site/Keep";
import { LightShell } from "@/components/site/LightShell";
import { Ribbons } from "@/components/site/Ribbons";
import { publicPhoto } from "@/lib/people";
import { MEDIUM_LABEL, scoringLabel, sessionTimeLabel } from "@/lib/view";
import { LiveRefresh } from "@/components/studio/LiveRefresh";
import { PENDING_TEXT, fmtScore } from "@/lib/results-view";

// คะแนน/อันดับเปลี่ยนทันทีเมื่อเปิด/ซ่อนผล → ไม่แคชหน้า (ซ่อนผลแล้วต้องไม่มีตัวเลขค้าง)
export const dynamic = "force-dynamic";

// โปรไฟล์ผู้แข่งแนวโอลิมปิก: หัวเข้มขอบโค้ง + แถบทอง/ชมพู · รูปวงกลมขอบทอง · เลข EBW · ชื่อไทย/อังกฤษ · ชิปประเภท
// ส่วนผลคะแนน/อันดับแสดงเฉพาะประเภทที่แอดมินกด "เปิดผล" แล้ว (K-P2c) · ยังไม่เปิด = "กำลังให้คะแนน" ไม่มีตัวเลข
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
  // ผลสาธารณะรายประเภท (getPublicResults เท่านั้น): ยังไม่เปิดผล = pending ไม่มีตัวเลข
  const resultOf = await Promise.all(mine.map(({ category }) => data.getPublicResults(category.id)));
  const standingOf = mine.map(({ entry }, i) => {
    const r = resultOf[i];
    return r.status === "published" ? r.standings.find((x) => x.entry_id === entry.id) : undefined;
  });
  const publishedCount = resultOf.filter((r) => r.status === "published").length;
  const bestRank = Math.min(...standingOf.map((s) => s?.rank ?? Infinity));

  return (
    <>
      <div className="relative left-1/2 -mt-4 w-screen -translate-x-1/2 bg-[#FBF7F2]">
      <section className="hero relative overflow-hidden rounded-b-[50%_64px] bg-bg pb-14 text-ivory">
        <div className="relative mx-auto max-w-6xl px-5 pt-3">
          <Link href="/athletes" className="inline-flex min-h-11 items-center gap-1.5 text-[15px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
            รายชื่อผู้แข่ง
          </Link>
          <div className="flex flex-col items-center gap-1 pt-2 text-center">
            <div className="num text-base font-semibold tracking-[0.24em] text-pink sm:text-lg">{me.code}</div>
            <h1 className="text-3xl font-bold leading-tight sm:text-5xl">{me.name_th}</h1>
            <div className="text-[15px] font-light text-[#C9C3E6] sm:text-xl">{me.name_en}</div>
            {me.shop && <div className="text-sm text-[#C9C3E6]">ร้าน/สังกัด: {me.shop}</div>}
          </div>
        </div>
        <Ribbons variant="profile" className="mt-5" />
      </section>
      </div>

      <LightShell pull={0} className="pb-12 !pt-0">
        <LiveRefresh />
        <div className="relative z-20 -mt-10 flex justify-center pb-4">
          <Avatar src={photo?.cutout_url} name={me.name_th} size="lg" round className="!h-40 !w-40 !text-4xl shadow-[0_10px_30px_rgba(18,15,46,0.3)] sm:!h-48 sm:!w-48" />
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {mine.map(({ category }) => (
            <Link key={category.id} href={`/athletes?cat=${category.code}`} className="rounded-full bg-surface-2 px-[18px] py-1.5 text-[15px] font-medium text-[#4A3478]">{category.name}</Link>
          ))}
        </div>

        <section className="mt-6 grid grid-cols-[1fr_1fr_1.5fr] gap-2">
          <div className="flex flex-col items-center rounded-[22px] border border-[#E6DDEF] bg-white px-1.5 py-3.5">
            <div className="num text-4xl font-bold leading-none">{mine.length}</div>
            <div className="mt-1 text-[13px] text-muted">ประเภทที่ลง</div>
          </div>
          <div className="flex flex-col items-center rounded-[22px] border border-[#E6DDEF] bg-white px-1.5 py-3.5">
            <div className="num text-4xl font-bold leading-none">{mine.filter((x) => x.entry.is_checked_in).length}</div>
            <div className="mt-1 text-[13px] text-muted">เช็กอินแล้ว</div>
          </div>
          <div className="flex flex-col items-center rounded-[22px] bg-[#120F2E] px-1.5 py-3.5 text-ivory">
            {Number.isFinite(bestRank) ? (
              <>
                <div className="num whitespace-nowrap text-4xl font-bold leading-none text-gold">อันดับ {bestRank}</div>
                <div className="mt-1 text-[13px] text-[#C9C3E6]">ผลที่ประกาศแล้ว {publishedCount} ประเภท</div>
              </>
            ) : (
              <>
                <div className="whitespace-nowrap text-xl font-semibold leading-tight text-gold sm:text-3xl">{publishedCount > 0 ? "ประกาศผลแล้ว" : PENDING_TEXT}</div>
                <div className="mt-1 text-[13px] text-[#C9C3E6]">คะแนน / อันดับ</div>
              </>
            )}
          </div>
        </section>

        <section className="mt-12 space-y-4">
          <h2 className="text-2xl font-semibold">ประเภทที่ลงแข่ง</h2>
          {mine.length === 0 && <p className="text-sm text-muted">ยังไม่ได้ลงประเภทใด</p>}
          {mine.map(({ entry, category: c }, i) => (
            <div key={entry.id} className="rounded-[28px] border border-[#E6DDEF] bg-white p-5">
              <div className="text-lg font-semibold"><Keep text={c.name} /></div>
              <div className="text-xs text-muted">{c.name_en}</div>
              <div className="num mt-2 text-xl font-semibold text-accent"><Phrases text={sessionTimeLabel(c)} /></div>
              <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
                {c.medium && <span>{MEDIUM_LABEL[c.medium]}</span>}
                <span>กรรมการ {c.judge_count} คน</span>
                <span>{scoringLabel(c)}</span>
                <span>{entry.is_checked_in ? "✅ เช็กอินแล้ว" : "⬜ ยังไม่เช็กอิน"}</span>
              </div>
              {resultOf[i].status === "published" ? (
                standingOf[i] ? (
                  <Link href={`/results/${c.code}`} className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-2xl bg-[#120F2E] px-4 py-3 text-ivory">
                    <span className="num text-2xl font-bold text-gold">อันดับ {standingOf[i]!.rank}</span>
                    <span className="num text-xl font-semibold">{fmtScore(standingOf[i]!.score ?? 0)} <small className="text-xs font-normal text-[#C9C3E6]">คะแนนรวม</small></span>
                    <span className="text-xs text-[#C9C3E6]">ดูผลทั้งประเภท</span>
                  </Link>
                ) : (
                  <div className="mt-3 rounded-2xl bg-surface-2 px-4 py-2 text-sm text-[#4A3478]">ประกาศผลแล้ว · ยังไม่มีคะแนนของรายการนี้</div>
                )
              ) : (
                <div className="mt-3 rounded-2xl bg-surface-2 px-4 py-2 text-sm text-[#4A3478]">{PENDING_TEXT}</div>
              )}
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
            <section key={c.id} className="mt-8 space-y-4">
              <h2 className="text-lg font-semibold">ผู้แข่งร่วมประเภท · <Keep text={c.name} /> <span className="whitespace-nowrap">({others.length} คน)</span></h2>
              <div className="flex flex-wrap gap-2">
                {others.map((p) => (
                  <Link key={p.id} href={`/athletes/${p.id}`} className="flex items-center gap-2 rounded-full border border-[#E6DDEF] bg-white py-1 pl-1 pr-3 text-sm">
                    <Avatar src={publicPhoto(photos, p)?.cutout_url} name={p.name_th} size="sm" round className="!border-2" />
                    <span className="num text-xs font-semibold text-accent">{p.code}</span>{p.name_th}
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </LightShell>
    </>
  );
}
