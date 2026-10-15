import Link from "next/link";
import { data } from "@/lib/data";
import { EVENT } from "@/lib/event";
import { Phrases, Keep } from "@/components/site/Keep";
import { LightShell } from "@/components/site/LightShell";
import { PosterSchedule } from "@/components/site/PosterSchedule";
import { Ribbons } from "@/components/site/Ribbons";
import { mockBlocked } from "@/lib/auth";
import { MEDIUM_LABEL, SESSION_LABEL, SESSION_ORDER, thaiDate, timeRangeOf } from "@/lib/view";
import type { Session } from "@/lib/types";

// หน้าสาธารณะ: ไม่ subscribe Realtime — ใช้ revalidate แทน
export const revalidate = 20;

const CHIP: Record<Session, string> = {
  morning: "bg-[#FBEFD9] text-[#6A4B12]",
  afternoon: "bg-[#EFE6F7] text-[#4A3478]",
  submit: "bg-[#FCE4EC] text-[#7A2A44]",
};

export default async function Home() {
  const [categories, entries, config] = await Promise.all([data.getCategories(), data.getEntries(), data.getEventConfig()]);
  const countOf = (id: string) => entries.filter((e) => e.category_id === id).length;
  const day = config.days[0] ?? EVENT.days[0];
  const inField = categories.filter((c) => c.session !== "submit").length;
  const submit = categories.length - inField;

  return (
    <>
      <div className="relative left-1/2 -mt-4 w-screen -translate-x-1/2 bg-[#FBF7F2]">
      <section className="hero relative overflow-hidden rounded-b-[50%_80px] bg-bg text-ivory">
        <div className="relative mx-auto flex max-w-6xl flex-col gap-3.5 px-6 pb-9 pt-12 sm:pt-16">
          <div className="num text-lg font-semibold tracking-[0.34em] text-pink sm:text-xl">PMAT PRESENTS</div>
          <h1 className="num max-w-[820px] text-[clamp(2.6rem,9vw,5.2rem)] font-bold leading-[0.92]">{EVENT.titleLine2}</h1>
          <div className="max-w-[720px] text-lg font-light text-[#E9E3FF] sm:text-[1.35rem]"><Phrases text={EVENT.titleLine1} /></div>
          <div className="mt-1.5 flex flex-wrap gap-2.5 text-base">
            <span className="rounded-full bg-ivory/10 px-4 py-2">{thaiDate(day)}</span>
            <span className="rounded-full bg-ivory/10 px-4 py-2">{EVENT.venue}</span>
            <span className="rounded-full bg-ivory/10 px-4 py-2">จัดโดย {EVENT.organizer}</span>
          </div>
          {config.announcement && <div className="max-w-[720px] whitespace-pre-line rounded-2xl bg-ivory/10 p-4 text-base">{config.announcement}</div>}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link href="/athletes" className="rounded-full bg-gold px-8 py-3.5 text-lg font-semibold text-bg">รายชื่อผู้แข่งขัน</Link>
            {!mockBlocked && <Link href="/checkin" className="rounded-full border-2 border-ivory px-7 py-3 text-lg font-medium text-ivory">เช็กอินหน้างาน</Link>}
          </div>
        </div>
        <Ribbons variant="hero" />
      </section>
      </div>

      <LightShell pull={0} className="pb-16 pt-16">
        <div className="space-y-16">
        <section className="space-y-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[2rem] font-semibold">ประเภทการแข่งขัน</h2>
            <div className="text-base text-muted">{inField} ประเภทในสนาม{submit > 0 ? ` · ${submit} ประเภทส่งผลงาน` : ""}</div>
          </div>
          {SESSION_ORDER.map((s) => {
            const cats = categories.filter((c) => c.session === s);
            if (!cats.length) return null;
            return (
              <div key={s} className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
                {cats.map((c) => (
                  <Link key={c.id} href={`/athletes?cat=${c.code}`} className="flex flex-col gap-2.5 rounded-[28px] border border-[#E6DDEF] bg-white px-[22px] pb-5 pt-[22px]">
                    <div className="flex items-center justify-between">
                      <span className={`rounded-full px-3.5 py-1 text-sm font-medium ${CHIP[s]}`}>{SESSION_LABEL[s]}</span>
                      <span className="num text-lg font-semibold text-muted">ผู้แข่ง {countOf(c.id)} คน</span>
                    </div>
                    <div className="text-xl font-semibold leading-snug"><Keep text={c.name} /></div>
                    <div className="text-xs text-muted">{c.name_en}</div>
                    <div className="num text-[1.4rem] font-semibold text-accent"><Phrases text={timeRangeOf(c)} /></div>
                    <div className="flex flex-wrap gap-x-3 text-xs text-muted">
                      {c.medium && <span>{MEDIUM_LABEL[c.medium]}</span>}
                      <span>กรรมการ {c.judge_count} คน</span>
                    </div>
                  </Link>
                ))}
              </div>
            );
          })}
        </section>

        </div>
      </LightShell>

      <div className="relative left-1/2 w-screen -translate-x-1/2 bg-[#FBF7F2]">
        <PosterSchedule day={day} />
      </div>

      <LightShell pull={0} className="!pb-16 !pt-8">
        <p className="text-xs text-muted">ข้อมูลอัปเดตทุก 20 วินาที · ผลคะแนนและอันดับจะแสดงเมื่อประกาศผลแล้ว</p>
      </LightShell>
    </>
  );
}
