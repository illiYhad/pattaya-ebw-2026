import Link from "next/link";
import { notFound } from "next/navigation";
import { data } from "@/lib/data";
import { AdminNav } from "@/components/admin/AdminNav";
import { getStaff } from "@/lib/auth";
import { ScoreEntryClient, type AuditRow, type EntryRow } from "@/components/admin/ScoreEntryClient";

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<string, string> = {
  save: "บันทึกคะแนน", clear: "ล้างใบคะแนน", method: "เปลี่ยนวิธีรวม", tie_decision: "ตัดสินคะแนนเสมอ", tie_reset: "ล้างคำตัดสินเสมอ", publish: "เปิดผล", hide: "ซ่อนผล",
};
const fmtTime = (iso: string) => new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });

// กรอกคะแนนกรรมการ 1 ประเภท: ตาราง รายการ × กรรมการ (ใบ K-P2b ข้อ 2.1)
export default async function ScoreCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: code } = await params;
  const category = (await data.getCategories()).find((c) => c.code === code);
  if (!category) notFound();
  const [entries, competitors, sheets, board, audit] = await Promise.all([
    data.getEntries(category.id), data.getCompetitors(), data.getScoreSheets(category.id), data.getResultBoard(category.id), data.getScoreAudit(category.id),
  ]);
  const isAdmin = (await getStaff())?.role === "admin"; // ลิงก์ "ผล / เปิดผล" เฉพาะแอดมิน
  const compOf = new Map(competitors.map((c) => [c.id, c]));
  const rows: EntryRow[] = entries
    .map((e) => ({ e, c: compOf.get(e.competitor_id) }))
    .filter((x): x is { e: typeof x.e; c: NonNullable<typeof x.c> } => !!x.c)
    .sort((a, b) => a.c.code.localeCompare(b.c.code))
    .map(({ e, c }) => ({ entryId: e.id, code: c.code, name: c.name_th, shop: c.shop }));
  const codeOfEntry = new Map(rows.map((r) => [r.entryId, r.code]));
  const auditRows: AuditRow[] = audit
    .slice()
    .sort((a, b) => b.at.localeCompare(a.at))
    .map((a) => ({
      id: a.id, at: fmtTime(a.at), by: a.by ?? "-", entry: a.entry_id ? codeOfEntry.get(a.entry_id) ?? a.entry_id : "-",
      judge: a.judge_no, action: ACTION_LABEL[a.action] ?? a.action, before: a.before, after: a.after,
    }));

  return (
    <div className="space-y-4">
      <AdminNav />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold">กรอกคะแนน · {category.name}</h1>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link className="rounded bg-surface px-3 py-1.5" href="/admin/score">ทุกประเภท</Link>
          {isAdmin && <Link className="rounded bg-surface px-3 py-1.5" href="/admin/results">ผล / เปิดผล</Link>}
          <Link className="rounded bg-surface px-3 py-1.5" href={`/print/scoresheet/${category.code}`} target="_blank">พิมพ์ใบคะแนน</Link>
        </div>
      </div>
      <ScoreEntryClient category={category} rows={rows} sheets={sheets} published={board.published} audit={auditRows} />
    </div>
  );
}
