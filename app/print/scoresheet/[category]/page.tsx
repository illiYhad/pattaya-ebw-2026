import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { data } from "@/lib/data";
import { EVENT } from "@/lib/event";
import { isCriteriaMode, maxTotal } from "@/lib/data/scoring";
import { thaiDate } from "@/lib/view";
import { PrintButton } from "@/components/ui/PrintButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ใบคะแนนกรรมการ" };

// ใบคะแนนกระดาษ A4 (ใบ K-P2b ข้อ 2.3): 1 หน้าต่อกรรมการ 1 คน · รหัส EBW-xxx × เกณฑ์ · ช่องลายเซ็น + วันที่
const CSS = `
@page { size: A4 portrait; margin: 12mm; }
.sheets { color: #111; font-family: var(--font-sarabun), Sarabun, system-ui, sans-serif; }
.sheet { background: #fff; color: #111; width: 190mm; min-height: 270mm; margin: 0 auto 16px; padding: 10mm 8mm; box-sizing: border-box; border: 1px solid #ccc; display: flex; flex-direction: column; gap: 6mm; }
.sheet h1 { font-size: 15pt; margin: 0; line-height: 1.3; }
.sheet .sub { font-size: 11pt; margin: 0; }
.sheet table { width: 100%; border-collapse: collapse; font-size: 10.5pt; }
.sheet th, .sheet td { border: 1px solid #333; padding: 3mm 2mm; text-align: center; vertical-align: middle; }
.sheet th { background: #eee; font-weight: 600; line-height: 1.25; }
.sheet td.code { font-weight: 700; white-space: nowrap; text-align: left; }
.sheet td.fill { height: 11mm; }
.sheet .sign { margin-top: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 12mm; font-size: 11pt; }
.sheet .sign div { border-top: 1px solid #333; padding-top: 2mm; text-align: center; }
@media print {
  body { background: #fff !important; }
  main { max-width: none !important; padding: 0 !important; margin: 0 !important; }
  .sheet { border: 0; margin: 0; padding: 0; width: auto; min-height: 265mm; break-after: page; page-break-after: always; }
  .sheet:last-child { break-after: auto; page-break-after: auto; }
}
`;

export default async function ScoresheetPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: code } = await params;
  const category = (await data.getCategories()).find((c) => c.code === code);
  if (!category) notFound();
  const [entries, competitors, config] = await Promise.all([data.getEntries(category.id), data.getCompetitors(), data.getEventConfig()]);
  const codes = entries
    .map((e) => competitors.find((c) => c.id === e.competitor_id)?.code)
    .filter((x): x is string => !!x)
    .sort();
  const criteriaMode = isCriteriaMode(category);
  const day = thaiDate(config.days[0] ?? EVENT.days[0]);
  const judges = Array.from({ length: category.judge_count }, (_, i) => i + 1);

  return (
    <div className="sheets">
      <style>{CSS}</style>
      <div className="no-print mb-4 flex flex-wrap items-center gap-3 text-sm">
        <PrintButton label="พิมพ์ใบคะแนน (A4)" />
        <span>{category.name} · กรรมการ {category.judge_count} คน = {category.judge_count} หน้า</span>
        <Link className="underline" href="/admin/score">กลับหน้ากรอกคะแนน</Link>
      </div>
      {judges.map((n) => (
        <section key={n} className="sheet">
          <div>
            <h1>{EVENT.titleLine2}</h1>
            <p className="sub">ใบคะแนนกรรมการ · {category.name} ({category.name_en}) · {day}</p>
            <p className="sub"><b>กรรมการคนที่ {n}</b> ชื่อ ........................................................</p>
          </div>
          <table>
            <thead>
              <tr>
                <th style={{ width: "28mm" }}>รหัสผู้แข่ง</th>
                {criteriaMode ? category.criteria.map((c, i) => <th key={i}>{c.name}<br />(เต็ม {c.max})</th>) : <th>คะแนนรวม<br />(เต็ม 100)</th>}
                {criteriaMode && <th style={{ width: "24mm" }}>รวม<br />(เต็ม {maxTotal(category)})</th>}
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c}>
                  <td className="code fill">{c}</td>
                  {criteriaMode ? category.criteria.map((_, i) => <td key={i} className="fill" />) : <td className="fill" />}
                  {criteriaMode && <td className="fill" />}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="sign">
            <div>ลายมือชื่อกรรมการ</div>
            <div>วันที่ ........ / ........ / ............</div>
          </div>
        </section>
      ))}
    </div>
  );
}
