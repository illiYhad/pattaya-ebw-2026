import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { data } from "@/lib/data";
import { publicPhoto } from "@/lib/people";
import { LiveRefresh } from "@/components/studio/LiveRefresh";
import { Actions, Btn, Chip, PosterPage, s } from "@/components/site/PosterPage";
import { ResultsBoard, type ResultPerson } from "@/components/results/ResultsBoard";

// ผลเปลี่ยนทันทีเมื่อแอดมินเปิด/ซ่อนผล → ห้ามแคช (ซ่อนผลแล้วต้องไม่มีตัวเลขค้างในหน้า)
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category: code } = await params;
  const c = (await data.getCategories()).find((x) => x.code === code);
  return { title: c ? `ผลการแข่งขัน ${c.name}` : "ไม่พบประเภท" };
}

// ผลคะแนนของประเภท (ใบ K-P2c 3.1): ใช้ getPublicResults เท่านั้น · ยังไม่เปิดผล = "กำลังให้คะแนน" ไม่มีตัวเลข
export default async function ResultsPage({ params }: Params) {
  const { category: code } = await params;
  const categories = (await data.getCategories()).slice().sort((a, b) => a.sort_order - b.sort_order);
  const category = categories.find((c) => c.code === code);
  if (!category) notFound();
  const [results, entries, competitors, photos] = await Promise.all([data.getPublicResults(category.id), data.getEntries(category.id), data.getCompetitors(), data.getPhotos()]);

  const people: Record<string, ResultPerson> = {};
  for (const e of entries) {
    const competitor = competitors.find((x) => x.id === e.competitor_id);
    if (competitor) people[e.id] = { competitor, photo: publicPhoto(photos, competitor)?.cutout_url };
  }
  const scored = new Set(results.status === "published" ? results.standings.map((x) => x.entry_id) : []);
  const unscored = results.status === "published"
    ? entries.filter((e) => !scored.has(e.id)).map((e) => people[e.id]?.competitor).filter((x): x is NonNullable<typeof x> => !!x).sort((a, b) => a.code.localeCompare(b.code))
    : [];

  return (
    <PosterPage plate={{ kicker: "ผลการแข่งขัน", title: category.name, sub: category.name_en }}>
      <LiveRefresh />
      <div className={s("pp-meta")}>
        <Chip>กรรมการ {category.judge_count} ท่าน</Chip>
      </div>
      <ResultsBoard category={category} results={results} people={people} unscored={unscored} />
      <Actions>
        <Btn href={`/categories/${category.code}`}>กติกาประเภทนี้</Btn>
        <Btn href={`/athletes?cat=${category.code}`} ghost>ผู้แข่งขันประเภทนี้</Btn>
      </Actions>
      <nav className={s("pp-catnav")} aria-label="ผลประเภทอื่น">
        <p>ผลประเภทอื่น</p>
        <ul>
          {categories.map((x) => (
            <li key={x.id}>
              <Link href={`/results/${x.code}`} aria-current={x.id === category.id ? "page" : undefined}><span>{x.name}</span></Link>
            </li>
          ))}
        </ul>
      </nav>
    </PosterPage>
  );
}
