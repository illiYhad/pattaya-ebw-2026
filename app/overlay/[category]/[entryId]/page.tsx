import { notFound } from "next/navigation";
import { data } from "@/lib/data";
import { OverlayStage } from "@/components/studio/OverlayStage";

export const dynamic = "force-dynamic";

// หน้า overlay สำหรับ OBS (Browser Source 1920×1080) — พื้นโปร่งใส ซ่อนหัว/ท้ายเว็บ
const CLEAR_STYLE = `
html, body { background: transparent !important; margin: 0; overflow: hidden; }
body > header, body > footer { display: none !important; }
body > main { max-width: none !important; padding: 0 !important; margin: 0 !important; }
`;

export default async function OverlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string; entryId: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  const [{ category: code, entryId }, q] = await Promise.all([params, searchParams]);
  const expected = process.env.CHANNEL_KEY;

  // ไม่มีรหัส หรือรหัสไม่ตรง → พื้นโปร่งใสเปล่า ไม่ subscribe
  if (!expected || q.k !== expected) return <style>{CLEAR_STYLE}</style>;

  const [categories, competitors, entries, sponsors, photos] = await Promise.all([
    data.getCategories(),
    data.getCompetitors(),
    data.getEntries(),
    data.getSponsors(),
    data.getPhotos(),
  ]);
  const category = categories.find((c) => c.code === code);
  if (!category) notFound();
  const entry = entries.find((e) => e.id === entryId && e.category_id === category.id);
  const competitor = entry && competitors.find((c) => c.id === entry.competitor_id);
  if (!entry || !competitor) notFound();
  const inCategory = entries.filter((e) => e.category_id === category.id).length;

  return (
    <>
      <style>{CLEAR_STYLE}</style>
      <OverlayStage channelKey={expected} category={category} entry={entry} competitor={competitor} inCategory={inCategory} sponsors={sponsors} photos={photos} directory={{ categories, competitors, entries }} />
    </>
  );
}
