import { data } from "@/lib/data";
import { AthletesBrowser, type AthleteItem } from "@/components/profile/AthletesBrowser";
import { publicPhoto } from "@/lib/people";
import { LightShell } from "@/components/site/LightShell";

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
    <LightShell pull={40} className="min-h-[70vh] pt-14">
      <div className="space-y-4">
        <h1 className="text-[2rem] font-semibold">ผู้แข่งขัน</h1>
        <AthletesBrowser items={items} categories={categories} initialCategory={initial} />
      </div>
    </LightShell>
  );
}
