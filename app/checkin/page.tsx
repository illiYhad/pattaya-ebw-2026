import { data } from "@/lib/data";
import { CheckinClient } from "@/components/studio/CheckinClient";

export const dynamic = "force-dynamic";

export default async function CheckinPage() {
  const [categories, competitors, entries] = await Promise.all([data.getCategories(), data.getCompetitors(), data.getEntries()]);
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">เช็กอินผู้แข่ง</h1>
      <CheckinClient categories={categories} competitors={competitors} entries={entries} />
    </div>
  );
}
