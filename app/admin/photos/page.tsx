import { data } from "@/lib/data";
import { AdminNav } from "@/components/admin/AdminNav";
import { PhotoStudioClient } from "@/components/admin/PhotoStudioClient";

export const dynamic = "force-dynamic";

export default async function PhotosPage() {
  const [categories, competitors, entries, photos] = await Promise.all([
    data.getCategories(),
    data.getCompetitors(),
    data.getEntries(),
    data.getPhotos(),
  ]);
  // 1 คน = 1 แถว (รูปผูกกับ person_key ใช้ได้ทุกประเภทที่ลง)
  const persons = competitors.map((c) => ({
    key: c.person_key,
    name: `${c.name_th} (${c.code})`,
    ign: c.name_en,
    teams: c.shop ?? "",
    categories: entries
      .filter((e) => e.competitor_id === c.id)
      .map((e) => categories.find((x) => x.id === e.category_id)?.name ?? "")
      .filter(Boolean)
      .join(" · "),
  }));
  return (
    <div className="space-y-4">
      <AdminNav />
      <h1 className="text-xl font-bold">ถ่ายรูปผู้แข่ง (กรีนสกรีน)</h1>
      <PhotoStudioClient persons={persons} photos={photos} />
    </div>
  );
}
