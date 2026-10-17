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

// ใบคะแนนกระดาษ A4 (ใบ K-P2b ข้อ 2.3 · K-P2e ข้อ 1): กรรมการแต่ละคนเริ่มหน้าใหม่ · รายการยาวเกิน 1 หน้าแบ่งเป็นหลายหน้า
// แบ่งหน้าฝั่งเซิร์ฟเวอร์ (รู้ "หน้า x/y" ต่อกรรมการ · แถวไม่ถูกตัดครึ่ง · หัวตารางซ้ำทุกหน้า · ลายเซ็นอยู่หน้าสุดท้าย)
// แถวละ ~10mm · เนื้อที่ A4 หลังขอบ 12mm = 273mm → หน้าเต็ม 20 แถว · หน้าสุดท้ายเผื่อช่องลายเซ็น 18 แถว
const ROWS_FULL = 20;
const ROWS_LAST = 18;

/** คืนช่วง [เริ่ม, จบ) ของแถวในแต่ละหน้า — หน้าสุดท้ายมีอย่างน้อย 1 แถวเสมอ */
function paginate(n: number): [number, number][] {
  const pages: [number, number][] = [];
  let i = 0;
  while (n - i > ROWS_LAST) {
    const take = Math.min(ROWS_FULL, n - i - 1);
    pages.push([i, i + take]);
    i += take;
  }
  pages.push([i, n]);
  return pages;
}

const CSS = `
@page { size: A4 portrait; margin: 12mm; }
.sheets { color: #111; font-family: var(--font-sarabun), Sarabun, system-ui, sans-serif; }
.sheet { background: #fff; color: #111; width: 190mm; min-height: 265mm; margin: 0 auto 16px; padding: 8mm; box-sizing: border-box; border: 1px solid #ccc; display: flex; flex-direction: column; gap: 4mm; }
.sheet h1 { font-size: 15pt; margin: 0; line-height: 1.3; }
.sheet .sub { font-size: 11pt; margin: 0; line-height: 1.35; }
.sheet table { width: 100%; border-collapse: collapse; font-size: 10.5pt; }
.sheet thead { display: table-header-group; }
.sheet tr { break-inside: avoid; page-break-inside: avoid; }
.sheet th, .sheet td { border: 1px solid #333; padding: 1mm 2mm; text-align: center; vertical-align: middle; }
.sheet th { background: #eee; font-weight: 600; line-height: 1.25; padding: 2mm; }
.sheet td.code { font-weight: 700; white-space: nowrap; text-align: left; }
.sheet td.fill { height: 8mm; }
.sheet .sign { margin-top: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 12mm; font-size: 11pt; padding-top: 8mm; }
.sheet .sign div { border-top: 1px solid #333; padding-top: 2mm; text-align: center; }
@media print {
  body { background: #fff !important; }
  main { max-width: none !important; padding: 0 !important; margin: 0 !important; }
  .sheet { border: 0; margin: 0; padding: 0; width: auto; break-after: page; page-break-after: always; }
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
  const pages = paginate(codes.length);

  return (
    <div className="sheets">
      <style>{CSS}</style>
      <div className="no-print mb-4 flex flex-wrap items-center gap-3 text-sm text-white">
        <PrintButton label="พิมพ์ใบคะแนน (A4)" />
        <span>{category.name} · กรรมการ {category.judge_count} คน = {category.judge_count * pages.length} หน้า{pages.length > 1 ? ` (${pages.length} หน้าต่อกรรมการ)` : ""}</span>
        <Link className="underline" href="/admin/score">กลับหน้ากรอกคะแนน</Link>
      </div>
      {judges.flatMap((n) =>
        pages.map(([from, to], pi) => (
          <section key={`${n}-${pi}`} className="sheet">
            <div>
              <h1>{EVENT.titleLine2}</h1>
              <p className="sub">ใบคะแนนกรรมการ · {category.name} ({category.name_en}) · {day}</p>
              <p className="sub"><b>กรรมการคนที่ {n}</b> · หน้า {pi + 1}/{pages.length} · ชื่อ ........................................................</p>
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
                {codes.slice(from, to).map((c) => (
                  <tr key={c}>
                    <td className="code fill">{c}</td>
                    {criteriaMode ? category.criteria.map((_, i) => <td key={i} className="fill" />) : <td className="fill" />}
                    {criteriaMode && <td className="fill" />}
                  </tr>
                ))}
              </tbody>
            </table>
            {pi === pages.length - 1 && (
              <div className="sign">
                <div>ลายมือชื่อกรรมการ</div>
                <div>วันที่ ........ / ........ / ............</div>
              </div>
            )}
          </section>
        )),
      )}
    </div>
  );
}
