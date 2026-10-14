import { data } from "@/lib/data";
import { AthletesBrowser, type AthleteItem } from "@/components/profile/AthletesBrowser";
import { publicPhoto } from "@/lib/people";
import { Watermark } from "@/components/brand/Brand";

export const revalidate = 30;

export default async function AthletesPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const [{ cat }, categories, competitors, entries, photos] = await Promise.all([
    searchParams,
    data.getCategories(),
    data.getCompetitors(),
    data.getEntries(),
    data.getPhotos(),
  ]);
  const items: AthleteItem[] = competitors
    .map((c) => {
      const cats = entries
        .filter((e) => e.competitor_id === c.id)
        .map((e) => categories.find((x) => x.id === e.category_id))
        .filter((x): x is NonNullable<typeof x> => !!x)
        .sort((a, b) => a.sort_order - b.sort_order);
      return { competitor: c, photo: publicPhoto(photos, c)?.cutout_url, categoryIds: cats.map((x) => x.id), categoryLabel: cats.map((x) => x.name).join(" · ") };
    })
    .sort((a, b) => a.competitor.code.localeCompare(b.competitor.code));
  const initial = categories.find((c) => c.code === cat)?.id ?? "all";
  return (
    <div className="relative space-y-4 overflow-hidden">
      <Watermark height={520} opacity={0.04} />
      <h1 className="relative text-xl font-bold">ผู้แข่งขัน</h1>
      <div className="relative"><AthletesBrowser items={items} categories={categories} initialCategory={initial} /></div>
    </div>
  );
}
