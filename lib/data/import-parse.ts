// แปลงตารางที่วางจาก Excel/Google Sheets/Markdown (คั่นด้วย แท็บ · | · ,) เป็นแถวดิบ
// คอลัมน์: ชื่อไทย · ชื่ออังกฤษ · ประเภท 1 · ประเภท 2 · ร้าน (มีหัวตารางหรือไม่มีก็ได้ · ไม่มี = ลำดับนี้)

export type RawRow = { row: number; name_th: string; name_en: string; cat1: string; cat2: string; shop: string };
type Col = keyof Omit<RawRow, "row">;

const HEAD: Record<Col, RegExp[]> = {
  name_th: [/ชื่อ\s*ไทย/, /ชื่อ\s*-\s*นามสกุล/, /^ชื่อ$/, /name_th/i, /thai/i],
  name_en: [/อังกฤษ/, /name_en/i, /english/i],
  cat1: [/ประเภท\s*(1|๑|ที่\s*1)/, /^ประเภท$/, /category\s*1/i, /^category$/i],
  cat2: [/ประเภท\s*(2|๒|ที่\s*2)/, /category\s*2/i],
  shop: [/ร้าน/, /สังกัด/, /shop/i, /salon/i],
};

export function parseImportTable(text: string): { rows: RawRow[]; errors: string[] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/ /g, " "))
    .filter((l) => l.trim() && !/^\s*\|?\s*[-:| ]+\|?\s*$/.test(l)); // ข้ามเส้นคั่น markdown |---|
  if (!lines.length) return { rows: [], errors: ["ไม่มีข้อมูล"] };

  const delim = lines[0].includes("\t") ? "\t" : lines[0].includes("|") ? "|" : ",";
  const split = (l: string) => {
    const cells = l.split(delim).map((c) => c.trim());
    if (delim === "|") {
      if (cells[0] === "") cells.shift();
      if (cells.length && cells[cells.length - 1] === "") cells.pop();
    }
    return cells;
  };

  const first = split(lines[0]);
  const allHead = Object.values(HEAD).flat();
  const isHeader = first.some((c) => allHead.some((re) => re.test(c)));
  const errors: string[] = [];
  let map: Partial<Record<Col, number>> = { name_th: 0, name_en: 1, cat1: 2, cat2: 3, shop: 4 };
  let start = 0;
  if (isHeader) {
    map = {};
    first.forEach((c, i) => {
      for (const [k, res] of Object.entries(HEAD) as [Col, RegExp[]][]) {
        if (map[k] === undefined && res.some((re) => re.test(c))) { map[k] = i; break; }
      }
    });
    if (map.name_th === undefined) errors.push("หัวตารางไม่มีคอลัมน์ \"ชื่อไทย\"");
    if (map.cat1 === undefined) errors.push("หัวตารางไม่มีคอลัมน์ \"ประเภท 1\"");
    start = 1;
  }

  const rows = lines.slice(start).map((l, i) => {
    const cells = split(l);
    const get = (k: Col) => (map[k] === undefined ? "" : (cells[map[k]!] ?? "").trim());
    return { row: start + i + 1, name_th: get("name_th"), name_en: get("name_en"), cat1: get("cat1"), cat2: get("cat2"), shop: get("shop") };
  }).filter((r) => r.name_th || r.name_en || r.cat1);
  if (!rows.length && !errors.length) errors.push("ไม่พบแถวข้อมูล (มีแต่หัวตาราง)");
  return { rows, errors };
}

/** กุญแจคนเดียวกันข้ามประเภท: ชื่อไทย (ตัดช่องว่างซ้ำ) | ชื่ออังกฤษ (ตัวพิมพ์เล็ก) */
export const normalizeKey = (nameTh: string, nameEn: string) =>
  `${nameTh.trim().replace(/\s+/g, " ")}|${nameEn.trim().replace(/\s+/g, " ").toLowerCase()}`;
