import type { Metadata } from "next";
import { data } from "@/lib/data";
import { EVENT } from "@/lib/event";
import { backCategories, competitorCards, eventDateLabels } from "@/lib/adcard";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdCardsClient } from "@/components/admin/AdCardsClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "บัตรห้อยคอ (AD card)" };

// ใบ K-P5: บัตรห้อยคอ A6 หน้า+หลัง · อ่านข้อมูลผ่าน DataSource เดิมอย่างเดียว (ไม่เขียน/ไม่แก้ schema) · สิทธิ์ admin ตาม PATH_ROLES
export default async function AdCardsPage() {
  const [categories, competitors, entries, photos, config] = await Promise.all([
    data.getCategories(),
    data.getCompetitors(),
    data.getEntries(),
    data.getPhotos(),
    data.getEventConfig(),
  ]);
  const cards = competitorCards(categories, competitors, entries, photos).map((c) => ({
    ...c,
    categoryIds: entries.filter((e) => e.competitor_id === c.id).map((e) => e.category_id),
  }));
  const dates = eventDateLabels(config.days[0] ?? EVENT.days[0]);
  return (
    <div className="space-y-4">
      <AdminNav />
      <h1 className="no-print text-xl font-bold">บัตรห้อยคอ (AD card)</h1>
      <AdCardsClient
        competitors={cards}
        categories={[...categories].sort((a, b) => a.sort_order - b.sort_order).map((c) => ({ id: c.id, name: c.name }))}
        backCategories={backCategories(categories)}
        event={{ dateEn: dates.en, dateTh: dates.th, venueEn: EVENT.venueEn }}
      />
    </div>
  );
}
