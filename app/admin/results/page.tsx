import { data } from "@/lib/data";
import { AdminNav } from "@/components/admin/AdminNav";
import { ResultsAdminClient, type CategoryResultCard } from "@/components/admin/ResultsAdminClient";

export const dynamic = "force-dynamic";

// สถานะผลต่อประเภท + เปิด/ซ่อนผล + ตัดสินคะแนนเสมอ (ใบ K-P2b ข้อ 2.2)
export default async function ResultsAdminPage() {
  const [categories, competitors, entries] = await Promise.all([data.getCategories(), data.getCompetitors(), data.getEntries()]);
  const boards = await Promise.all(categories.map((c) => data.getResultBoard(c.id)));
  const compOf = new Map(competitors.map((c) => [c.id, c]));
  const cards: CategoryResultCard[] = categories.map((c, i) => {
    const board = boards[i];
    const mine = entries.filter((e) => e.category_id === c.id);
    const labels: CategoryResultCard["labels"] = {};
    for (const e of mine) {
      const comp = compOf.get(e.competitor_id);
      labels[e.id] = { code: comp?.code ?? e.competitor_id, name: comp?.name_th ?? "" };
    }
    return { id: c.id, code: c.code, name: c.name, judgeCount: c.judge_count, total: mine.length, board, labels };
  });
  return (
    <div className="space-y-4">
      <AdminNav />
      <h1 className="text-xl font-bold">ผลคะแนน / เปิดผล</h1>
      <p className="text-sm text-muted">คะแนนขึ้นจอและหน้าเว็บสาธารณะเฉพาะประเภทที่กด &quot;เปิดผล&quot; · ก่อนหน้านั้นทุกจอแสดง &quot;กำลังให้คะแนน&quot; · ซ่อนผลแล้วจึงแก้คะแนนได้</p>
      <ResultsAdminClient cards={cards} />
    </div>
  );
}
