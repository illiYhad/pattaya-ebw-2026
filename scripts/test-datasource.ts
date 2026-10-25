// ทดสอบแหล่งข้อมูล (ใบ K-P4): ชุดกติกาเดียวรันกับ mock และ Supabase (ฐานข้อมูลจำลองในหน่วยความจำ ไม่ต่อเน็ต/ไม่ใช้คีย์จริง)
// + ตรวจว่าเขียนกลับเฉพาะแถวที่เปลี่ยน · RLS ปฏิเสธ → ข้อความไทย · รูป · index.ts เลือก supabase เมื่อมี env
// รัน: npm run test:datasource
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { DEFAULT_CATEGORIES } from "../lib/data/defaults.ts";
import { mockSource } from "../lib/data/mock.ts";
import { createSupabaseSource, supabaseSource } from "../lib/data/supabase.ts";
import type { DataSource } from "../lib/data/source.ts";

// ---------- โหมดตรวจ index.ts ในโพรเซสลูก (env ถูกอ่านตอนโหลดโมดูล จึงต้องแยกโพรเซส) ----------
if (process.argv.includes("--probe")) {
  const { data } = await import("../lib/data/index.ts");
  console.log(data === supabaseSource ? "SUPABASE" : data === mockSource ? "MOCK" : "OTHER");
  process.exit(0);
}

// ---------- ฐานข้อมูลจำลอง (เฉพาะส่วนของ supabase-js ที่ lib/data/supabase.ts เรียกใช้) ----------
type Row = Record<string, unknown>;
type Log = { op: string; table: string; n: number };
function fakeDb(deny: (op: string, table: string) => boolean = () => false) {
  const tables = new Map<string, Row[]>();
  const files = new Map<string, Uint8Array>();
  const log: Log[] = [];
  const rows = (n: string) => tables.get(n) ?? (tables.set(n, []), tables.get(n)!);
  const pk = (n: string) => (n === "result_states" ? "category_id" : "id");
  const denied = { data: null, error: { code: "42501", message: "new row violates row-level security policy" } };

  const from = (table: string) => {
    const f: [string, unknown][] = [];
    let inF: [string, unknown[]] | null = null, order = "", range: [number, number] | null = null, mode = "select", single = false;
    const run = () => {
      if (mode === "delete") {
        if (deny("delete", table)) return denied;
        const keep: Row[] = [], gone: Row[] = [];
        for (const r of rows(table)) (inF && inF[1].includes(r[inF[0]]) ? gone : keep).push(r);
        tables.set(table, keep);
        log.push({ op: "delete", table, n: gone.length });
        return { data: gone, error: null };
      }
      let out = rows(table).filter((r) => f.every(([c, v]) => r[c] === v));
      if (order) out = [...out].sort((a, b) => String(a[order] ?? "").localeCompare(String(b[order] ?? "")));
      if (range) out = out.slice(range[0], range[1] + 1);
      return { data: single ? (out[0] ?? null) : out, error: null };
    };
    const b: Record<string, unknown> = {
      select: () => b, eq: (c: string, v: unknown) => (f.push([c, v]), b), in: (c: string, v: unknown[]) => ((inF = [c, v]), b),
      order: (c: string) => ((order = c), b), range: (a: number, z: number) => ((range = [a, z]), b),
      maybeSingle: () => ((single = true), b), delete: () => ((mode = "delete"), b),
      upsert: (vals: Row | Row[], opt: { onConflict: string }) => {
        const list = Array.isArray(vals) ? vals : [vals];
        if (deny("upsert", table)) return Promise.resolve(denied);
        for (const v of list) {
          const i = rows(table).findIndex((r) => r[opt.onConflict] === v[opt.onConflict]);
          if (i >= 0) rows(table)[i] = { ...v }; else rows(table).push({ ...v });
        }
        log.push({ op: "upsert", table, n: list.length });
        return Promise.resolve({ data: null, error: null });
      },
      insert: (vals: Row[]) => {
        if (deny("insert", table)) return Promise.resolve(denied);
        rows(table).push(...vals.map((v) => ({ ...v })));
        log.push({ op: "insert", table, n: vals.length });
        return Promise.resolve({ data: null, error: null });
      },
      then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej),
    };
    return b;
  };
  const db = {
    from,
    rpc: async (name: string, args: { p_category: string }) => {
      assert.equal(name, "public_published_results");
      const st = rows("result_states").find((r) => r.category_id === args.p_category && r.published === true);
      if (!st) return { data: null, error: null };
      return { data: { state: st, sheets: rows("score_sheets").filter((s) => s.category_id === args.p_category) }, error: null };
    },
    storage: {
      from: () => ({
        upload: async (path: string, bytes: Uint8Array) => (files.set(path, bytes), { error: null }),
        remove: async (paths: string[]) => (paths.forEach((p) => files.delete(p)), { error: null }),
        download: async (path: string) => {
          const b = files.get(path);
          return b ? { data: { arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), type: "image/png" }, error: null } : { data: null, error: { message: "not found" } };
        },
      }),
    },
  };
  // ตั้งต้นเหมือนไฟล์ 005_seed.sql
  const now = new Date().toISOString();
  for (const c of DEFAULT_CATEGORIES) rows("categories").push({ ...c, start_time: c.start_time ?? null, end_time: c.end_time ?? null, duration_min: c.duration_min ?? null, medium: c.medium ?? null, updated_at: now });
  rows("event_config").push({ id: 1, days: ["2026-10-30"], announcement: "", logo_url: null, theme: null, updated_at: now });
  return { db, tables, files, log, rows };
}

let n = 0;
const ok = async (name: string, fn: () => Promise<void> | void) => { await fn(); n++; console.log(`ok  ${name}`); };

// ---------- ชุดกติกาเดียว (รันกับทั้ง mock และ supabase) ----------
async function suite(label: string, src: DataSource) {
  const tag = (s: string) => `[${label}] ${s}`;
  const inbox = (await src.getCategories()).find((c) => c.code === "inbox")!;
  const lip = (await src.getCategories()).find((c) => c.code === "lip")!;
  const hair = (await src.getCategories()).find((c) => c.code === "hairstroke")!;
  const lash = (await src.getCategories()).find((c) => c.code === "lash")!;
  const name = `ผู้ทดสอบ ${label}`;
  let competitorId = "";
  let entryId = "";

  await ok(tag("สร้างผู้แข่ง 2 ประเภท · ลงเกิน 2 ประเภท → throw · ชื่อซ้ำ → throw"), async () => {
    const c = await src.createCompetitor({ name_th: name, name_en: `Tester ${label}` }, [lip.id, hair.id]);
    competitorId = c.id;
    const mine = (await src.getEntries()).filter((e) => e.competitor_id === c.id);
    assert.equal(mine.length, 2);
    await assert.rejects(() => src.addEntry(c.id, lash.id), /ครบ 2 ประเภทแล้ว/);
    await assert.rejects(() => src.createCompetitor({ name_th: name, name_en: `Tester ${label}` }), /มีผู้แข่งชื่อนี้อยู่แล้ว/);
    entryId = mine.find((e) => e.category_id === lip.id)!.id;
  });

  await ok(tag("เช็กอินแล้วอ่านกลับได้"), async () => {
    await src.setEntryCheckIn(entryId, true);
    assert.equal((await src.getEntries(lip.id)).find((e) => e.id === entryId)!.is_checked_in, true);
    await src.setEntryCheckIn(entryId, false);
    assert.equal((await src.getEntries(lip.id)).find((e) => e.id === entryId)!.is_checked_in, false);
  });

  await ok(tag("ผลยังไม่ประกาศ = pending ไม่มีตัวเลข → กรอกครบ → ประกาศ → แก้คะแนนไม่ได้ → ซ่อน → pending"), async () => {
    // inbox ไม่มีเกณฑ์รายข้อ = กรอกคะแนนรวม · ลงทุกรายการของประเภทให้ครบ 3 กรรมการ
    await src.createCompetitor({ name_th: `${name} สอง`, name_en: `Tester ${label} 2` }, [inbox.id]);
    // คะแนนไม่ซ้ำกันทุกรายการ (กันติดกติกาคะแนนเท่ากัน)
    for (const [i, e] of (await src.getEntries(inbox.id)).entries()) for (let j = 1; j <= inbox.judge_count; j++) await src.saveScoreSheet(e.id, j, { total: 40 + i }, `admin-${label}@test`);
    assert.deepEqual(await src.getPublicResults(inbox.id), { status: "pending" });
    await src.publishResults(inbox.id, `admin-${label}@test`);
    const pub = await src.getPublicResults(inbox.id);
    assert.equal(pub.status, "published");
    const first = (await src.getEntries(inbox.id))[0];
    await assert.rejects(() => src.saveScoreSheet(first.id, 1, { total: 50 }), /ประกาศผลแล้ว/);
    const audit = await src.getScoreAudit(inbox.id);
    assert.ok(audit.some((a) => a.action === "publish" && a.by === `admin-${label}@test`), "audit ต้องมี publish พร้อมผู้ทำรายการ");
    await src.hideResults(inbox.id, `admin-${label}@test`);
    assert.deepEqual(await src.getPublicResults(inbox.id), { status: "pending" });
  });

  await ok(tag("ลบผู้แข่งที่มีคะแนนไม่ได้ · ล้างคะแนนไม่มีใบ → throw"), async () => {
    const withScore = (await src.getEntries(inbox.id))[0];
    await assert.rejects(() => src.deleteCompetitor(withScore.competitor_id), /มีคะแนนแล้ว/);
    await assert.rejects(() => src.clearScoreSheet(entryId, 1), /ไม่พบใบคะแนน/);
  });

  await ok(tag("ตั้งค่างาน: วันผิดรูปแบบ → throw · วันถูกต้อง → อ่านกลับได้"), async () => {
    await assert.rejects(() => src.saveEventConfig({ days: ["30/10/2026"] }), /YYYY-MM-DD/);
    await src.saveEventConfig({ days: ["2026-10-30", "2026-10-31"], announcement: "ทดสอบ" });
    const cfg = await src.getEventConfig();
    assert.deepEqual(cfg.days, ["2026-10-30", "2026-10-31"]);
    assert.equal(cfg.announcement, "ทดสอบ");
  });

  await ok(tag("สปอนเซอร์: สร้าง/แก้/ลบ · ไม่มีชื่อ → throw"), async () => {
    await assert.rejects(() => src.createSponsor({ name: " ", level: "main", position: "corner", sequence: 1, logo_url: "", is_active: true }), /ต้องใส่ชื่อสปอนเซอร์/);
    const s = await src.createSponsor({ name: `สปอนเซอร์ ${label}`, level: "co", position: "bottom_ticker", sequence: 1, logo_url: "", is_active: true });
    await src.updateSponsor(s.id, { is_active: false });
    assert.equal((await src.getSponsors()).find((x) => x.id === s.id)!.is_active, false);
    await src.deleteSponsor(s.id);
    assert.equal((await src.getSponsors()).some((x) => x.id === s.id), false);
  });
}

await suite("mock", mockSource);
const f = fakeDb();
await suite("supabase", createSupabaseSource(async () => f.db as never, async () => null));

// ---------- เฉพาะ Supabase ----------
await ok("เขียนกลับเฉพาะแถวที่เปลี่ยน: เช็กอิน 1 รายการ = upsert entries 1 แถว ไม่มีอย่างอื่น", async () => {
  const g = fakeDb();
  const src = createSupabaseSource(async () => g.db as never, async () => null);
  const c = await src.createCompetitor({ name_th: "คนเดียว" }, [(await src.getCategories())[0].id]);
  g.log.length = 0;
  const e = (await src.getEntries()).find((x) => x.competitor_id === c.id)!;
  await src.setEntryCheckIn(e.id, true);
  assert.deepEqual(g.log, [{ op: "upsert", table: "entries", n: 1 }]);
});

await ok("ผิดกติกา (Engine throw) → ไม่เขียนอะไรลงฐานข้อมูลเลย", async () => {
  const g = fakeDb();
  const src = createSupabaseSource(async () => g.db as never, async () => null);
  const cat = (await src.getCategories())[0];
  g.log.length = 0;
  await assert.rejects(() => src.createCompetitor({ name_th: " " }, [cat.id]), /ต้องใส่ชื่อไทย/);
  assert.equal(g.log.length, 0);
});

await ok("RLS ปฏิเสธการเขียน → ข้อความไทย 'ไม่มีสิทธิ์ทำรายการนี้' และไม่มีอะไรถูกเขียน", async () => {
  const g = fakeDb((op, table) => op === "upsert" && table === "categories");
  const src = createSupabaseSource(async () => g.db as never, async () => null);
  const cat = (await src.getCategories())[0];
  await assert.rejects(() => src.saveCategory(cat.id, { name: "แก้ชื่อ" }), /ไม่มีสิทธิ์ทำรายการนี้/);
  assert.equal(g.rows("categories").find((r) => r.id === cat.id)!.name, cat.name);
});

await ok("ลบแล้ว DB ไม่ลบจริง (RLS กรองเงียบ) → throw ไม่ใช่สำเร็จเงียบ ๆ", async () => {
  const g = fakeDb((op, table) => op === "delete" && table === "sponsors");
  const src = createSupabaseSource(async () => g.db as never, async () => null);
  const s = await src.createSponsor({ name: "ก", level: "main", position: "corner", sequence: 1, logo_url: "", is_active: true });
  await assert.rejects(() => src.deleteSponsor(s.id), /ไม่มีสิทธิ์ทำรายการนี้/);
});

await ok("ผลสาธารณะ: คนทั่วไปไม่เห็นคะแนนดิบ (ไม่มี total/judge_totals ในผลที่ยังไม่ประกาศ)", async () => {
  const g = fakeDb();
  const src = createSupabaseSource(async () => g.db as never, async () => null);
  const cat = (await src.getCategories()).find((c) => c.code === "inbox")!;
  const c = await src.createCompetitor({ name_th: "ผู้ซ่อนคะแนน" }, [cat.id]);
  const e = (await src.getEntries(cat.id)).find((x) => x.competitor_id === c.id)!;
  for (let j = 1; j <= cat.judge_count; j++) await src.saveScoreSheet(e.id, j, { total: 88 });
  const text = JSON.stringify(await src.getPublicResults(cat.id));
  assert.equal(text, '{"status":"pending"}');
});

await ok("รูป: อัปโหลด 2 ไฟล์ + แถวรูป · ไม่มี service key → อ่านไฟล์ผ่าน session · มี → redirect · ลบแล้วไฟล์หาย", async () => {
  const g = fakeDb();
  const src = createSupabaseSource(async () => g.db as never, async () => null);
  const p = await src.savePhoto("คนนี้|this", { original: new Uint8Array([1, 2]), originalMime: "image/jpeg", cutout: new Uint8Array([3, 4, 5]), consent: true });
  assert.ok(g.files.has(`${p.id}/original`) && g.files.has(`${p.id}/cutout`));
  assert.match(p.original_url, new RegExp(`^/api/photos/${p.id}/original\\?v=`));
  const f1 = await src.getPhotoFile(p.id, "cutout");
  assert.ok(f1 && "bytes" in f1 && f1.bytes.length === 3);
  const signed = createSupabaseSource(async () => g.db as never, async (path) => `https://signed.example/${path}`);
  assert.deepEqual(await signed.getPhotoFile(p.id, "original"), { redirect: `https://signed.example/${p.id}/original` });
  await src.deletePhoto(p.id);
  assert.equal(g.files.size, 0);
  assert.equal((await src.getPhotos()).length, 0);
});

await ok("ข้อมูลเกิน 1,000 แถว: อ่านครบทุกหน้า (แบ่งหน้า)", async () => {
  const g = fakeDb();
  for (let i = 0; i < 1500; i++) g.rows("sponsors").push({ id: `sp-${String(i).padStart(4, "0")}`, name: "ก", level: "support", position: "corner", sequence: i, logo_url: "", is_active: true });
  const src = createSupabaseSource(async () => g.db as never, async () => null);
  assert.equal((await src.getSponsors()).length, 1500);
});

// ---------- index.ts เลือกแหล่งข้อมูลตาม env ----------
const probe = (env: Record<string, string>) => {
  const clean = { ...process.env } as Record<string, string | undefined>;
  delete clean.NEXT_PUBLIC_SUPABASE_URL; delete clean.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const r = spawnSync(process.execPath, [...process.execArgv, process.argv[1], "--probe"], { env: { ...clean, ...env }, encoding: "utf8" });
  return (r.stdout ?? "").trim().split("\n").pop();
};
await ok("index.ts: ไม่มี env → mock · มี env ครบ (ค่าปลอม) → supabase", () => {
  assert.equal(probe({}), "MOCK");
  assert.equal(probe({ NEXT_PUBLIC_SUPABASE_URL: "https://example.invalid", NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key" }), "SUPABASE");
});

console.log(`\nผ่านทั้งหมด ${n} ข้อ`);
