"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdCardBack, AdCardFront, type AdEventInfo } from "@/components/admin/AdCard";
import { CARD_ROLES, CARD_ROLE_ORDER, MAX_PHOTO_BYTES, matchPhotoKey, parseOthersTable, type BackCategory, type CardData, type CardRoleKey, type ImportedCard } from "@/lib/adcard";

// หน้า /admin/ad-cards (ใบ K-P5) · พิมพ์ด้วย print CSS ของเบราว์เซอร์ (Save as PDF ได้) · ไม่บันทึกอะไรลงฐานข้อมูล
const CARD_W = 397;
const CARD_H = 559;
const PREVIEW_SCALE = 0.72;

const PRINT_CSS = `
@page { size: 105mm 148mm; margin: 0; }
.ad-print { display: none; }
@media print {
  html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
  main { max-width: none !important; padding: 0 !important; margin: 0 !important; }
  .ad-screen { display: none !important; }
  .ad-print { display: block; }
  .ad-face { width: 105mm; height: 148mm; overflow: hidden; break-after: page; page-break-after: always; }
  .ad-face:last-child { break-after: auto; page-break-after: auto; }
}
`;

const field = "min-w-0 rounded bg-bg p-2 text-sm";
const btnCls = "rounded bg-accent px-3 py-2 text-sm font-bold text-bg disabled:opacity-40";
const btn2Cls = "rounded bg-surface-2 px-3 py-2 text-sm font-semibold disabled:opacity-40";

function Scaled({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: CARD_W * PREVIEW_SCALE, height: CARD_H * PREVIEW_SCALE }} className="shrink-0 overflow-hidden rounded shadow-lg">
      <div style={{ width: CARD_W, height: CARD_H, transform: `scale(${PREVIEW_SCALE})`, transformOrigin: "0 0" }}>{children}</div>
    </div>
  );
}

function Preview({ card, categories, event }: { card: CardData | undefined; categories: BackCategory[]; event: AdEventInfo }) {
  const blank: CardData = { id: "preview", role: "competitor", name_th: "", name_en: "", second: [] };
  const c = card ?? blank;
  return (
    <div className="flex flex-wrap gap-4">
      <div>
        <div className="mb-1 text-xs text-muted">ด้านหน้า</div>
        <Scaled><AdCardFront card={c} event={event} /></Scaled>
      </div>
      <div>
        <div className="mb-1 text-xs text-muted">ด้านหลัง</div>
        <Scaled><AdCardBack categories={categories} event={event} /></Scaled>
      </div>
    </div>
  );
}

type Tab = "competitors" | "others";
type Draft = { role: CardRoleKey; name_th: string; name_en: string; second: string; photo?: string };
const emptyDraft = (): Draft => ({ role: "judge", name_th: "", name_en: "", second: "" });

export function AdCardsClient({ competitors, categories, backCategories, event }: { competitors: (CardData & { categoryIds: string[] })[]; categories: { id: string; name: string }[]; backCategories: BackCategory[]; event: AdEventInfo }) {
  const [tab, setTab] = useState<Tab>("competitors");
  const [catFilter, setCatFilter] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [focusId, setFocusId] = useState<string | undefined>(competitors[0]?.id);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [others, setOthers] = useState<ImportedCard[]>([]);
  const [roleFilter, setRoleFilter] = useState<"" | CardRoleKey>("");
  const [focusOther, setFocusOther] = useState<string | undefined>();
  const [msg, setMsg] = useState("");
  const [printList, setPrintList] = useState<CardData[] | null>(null);
  const seq = useRef(0);
  const urls = useRef<Set<string>>(new Set());

  const shown = useMemo(() => (catFilter ? competitors.filter((c) => c.categoryIds.includes(catFilter)) : competitors), [competitors, catFilter]);
  const pickedShown = shown.filter((c) => picked.has(c.id));
  const focus = competitors.find((c) => c.id === focusId);

  // ---------- พิมพ์ ----------
  const startPrint = useCallback((list: CardData[]) => {
    if (!list.length) return setMsg("ยังไม่มีบัตรให้พิมพ์");
    setMsg("");
    setPrintList(list);
  }, []);

  useEffect(() => {
    if (!printList) return;
    let cancelled = false;
    const done = () => setPrintList(null);
    window.addEventListener("afterprint", done, { once: true });
    // รอรูปในพื้นที่พิมพ์โหลดครบ (สูงสุด 5 วินาที) ก่อนเปิดหน้าต่างพิมพ์
    const t0 = Date.now();
    const tick = () => {
      if (cancelled) return;
      const imgs = Array.from(document.querySelectorAll<HTMLImageElement>(".ad-print img"));
      if (imgs.every((i) => i.complete) || Date.now() - t0 > 5000) window.print();
      else setTimeout(tick, 100);
    };
    requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      window.removeEventListener("afterprint", done);
    };
  }, [printList]);

  // ---------- บุคคลอื่น ----------
  useEffect(() => {
    const all = urls.current;
    return () => all.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const toCard = (d: Draft, id: string): CardData => ({
    id,
    role: d.role,
    name_th: d.name_th,
    name_en: d.name_en,
    second: d.second.split("\n").map((s) => s.trim()).filter(Boolean),
    photo: d.photo,
  });

  const onPhoto = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setMsg("เลือกได้เฉพาะไฟล์รูปภาพ");
    if (file.size > MAX_PHOTO_BYTES) return setMsg("ไฟล์รูปใหญ่เกิน 8 MB");
    const u = URL.createObjectURL(file);
    urls.current.add(u);
    setMsg("");
    setDraft((d) => ({ ...d, photo: u }));
  };

  const addDraft = () => {
    if (!draft.name_th.trim() && !draft.name_en.trim()) return setMsg("กรอกชื่ออย่างน้อย 1 ช่องก่อนเพิ่ม");
    setMsg("");
    setOthers((o) => [...o, toCard(draft, `o-${++seq.current}`)]);
    setDraft((d) => ({ ...emptyDraft(), role: d.role }));
  };

  // ---------- K-P5c: นำเข้าไฟล์รายชื่อ + รูปหลายไฟล์ (อ่านในเบราว์เซอร์ ไม่ส่งขึ้นเซิร์ฟเวอร์) ----------
  const onImportFile = async (file: File | undefined) => {
    if (!file) return;
    const r = parseOthersTable(await file.text());
    const base = seq.current;
    seq.current += r.cards.length;
    setOthers((o) => [...o, ...r.cards.map((c, i) => ({ ...c, id: `o-${base + i + 1}` }))]);
    const rows = r.skipped.map((s) => `แถว ${s.row} (${s.reason})`).join(" · ");
    setMsg(`นำเข้า ${r.cards.length} ใบ · ข้าม ${r.skipped.length}${rows ? ` — ${rows}` : ""}`);
  };

  const onPhotos = (files: FileList | null) => {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith("image/") && f.size <= MAX_PHOTO_BYTES);
    if (!list.length) return setMsg("ไม่พบไฟล์รูปที่ใช้ได้ (ต้องเป็นรูป ≤ 8 MB)");
    const hit = new Map<string, string>();
    const matched = new Set<string>();
    for (const f of list) {
      const owners = others.filter((o) => matchPhotoKey(f.name, o.photoKey));
      if (!owners.length) continue;
      const u = URL.createObjectURL(f);
      urls.current.add(u);
      owners.forEach((o) => hit.set(o.id, u));
      matched.add(f.name);
    }
    setOthers((o) => o.map((c) => (hit.has(c.id) ? { ...c, photo: hit.get(c.id) } : c)));
    setMsg(`จับคู่รูปได้ ${hit.size} ใบ จาก ${list.length} ไฟล์ · ไฟล์ที่ไม่ตรงกับใคร ${list.length - matched.size}`);
  };

  const shownOthers = roleFilter ? others.filter((o) => o.role === roleFilter) : others;
  const draftCard = toCard(draft, "draft");
  const previewOther = others.find((o) => o.id === focusOther);
  const secondLabel = CARD_ROLES[draft.role].secondLabel;

  return (
    <div className="space-y-4">
      <style>{PRINT_CSS}</style>

      <div className="ad-screen space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button className={tab === "competitors" ? btnCls : btn2Cls} onClick={() => setTab("competitors")}>ผู้แข่ง ({competitors.length})</button>
          <button className={tab === "others" ? btnCls : btn2Cls} onClick={() => setTab("others")}>บุคคลอื่น ({others.length})</button>
          <span className="text-xs text-muted">หน้าละ 1 ใบ A6 · เรียง หน้า-หลัง-หน้า-หลัง · ในหน้าต่างพิมพ์เลือก “Save as PDF” (บันทึกเป็น PDF) ได้</span>
        </div>
        {msg && <p className="rounded bg-surface/70 p-2 text-sm text-accent-2" role="status">{msg}</p>}

        {tab === "competitors" && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <label className="flex items-center gap-2 text-xs text-muted">ประเภท
                  <select className={field} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                    <option value="">ทั้งหมด</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <button className={btn2Cls} onClick={() => setPicked(new Set([...picked, ...shown.map((c) => c.id)]))}>เลือกที่แสดงทั้งหมด</button>
                <button className={btn2Cls} onClick={() => setPicked(new Set())} disabled={!picked.size}>ล้างที่เลือก</button>
                <button className={btnCls} disabled={!pickedShown.length} onClick={() => startPrint(pickedShown)}>พิมพ์ที่เลือก ({pickedShown.length})</button>
                <button className={btnCls} disabled={!shown.length} onClick={() => startPrint(shown)}>พิมพ์ทั้งหมด ({shown.length})</button>
              </div>
              {competitors.length === 0 ? (
                <p className="rounded bg-surface/60 p-3 text-sm text-muted">ยังไม่มีผู้แข่งในระบบ — นำเข้ารายชื่อที่แท็บ “นำเข้ารายชื่อ” ก่อน</p>
              ) : (
                <ul className="max-h-[32rem] divide-y divide-white/5 overflow-auto rounded bg-surface/60 text-sm">
                  {shown.map((c) => (
                    <li key={c.id} className={`flex items-center gap-3 px-3 py-2 ${focusId === c.id ? "bg-surface-2/60" : ""}`}>
                      <input type="checkbox" aria-label={`เลือก ${c.name_th}`} checked={picked.has(c.id)} onChange={(e) => {
                        const n = new Set(picked);
                        if (e.target.checked) n.add(c.id); else n.delete(c.id);
                        setPicked(n);
                      }} />
                      <button className="min-w-0 flex-1 text-left" onClick={() => setFocusId(c.id)}>
                        <span className="font-semibold">{c.code}</span> · {c.name_th}
                        <span className="block truncate text-xs text-muted">{c.second.join(" · ") || "ยังไม่ลงประเภท"}{c.shop ? ` · ${c.shop}` : ""}</span>
                      </button>
                      <span className={`shrink-0 text-xs ${c.photo ? "text-accent" : "text-muted"}`}>{c.photo ? "มีรูป" : "ไม่มีรูป"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Preview card={focus} categories={backCategories} event={event} />
          </div>
        )}

        {tab === "others" && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="space-y-3">
              <p className="text-xs text-muted">กรอกชั่วคราวเพื่อพิมพ์เท่านั้น — ไม่บันทึกลงฐานข้อมูล ปิดหรือรีเฟรชหน้าแล้วหาย</p>
              <div className="grid gap-2 rounded bg-surface/60 p-3 text-sm sm:grid-cols-2">
                <label className="flex flex-col text-xs text-muted">บทบาท
                  <select className={field} value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as CardRoleKey })}>
                    {CARD_ROLE_ORDER.map((k) => <option key={k} value={k}>{CARD_ROLES[k].en} · {CARD_ROLES[k].th}</option>)}
                  </select>
                </label>
                <label className="flex flex-col text-xs text-muted">รูป (เลือกไฟล์ในเครื่อง · ≤ 8 MB)
                  <input type="file" accept="image/*" className="text-xs" onChange={(e) => { onPhoto(e.target.files?.[0]); e.target.value = ""; }} />
                </label>
                <label className="flex flex-col text-xs text-muted">ชื่อ (ไทย)
                  <input className={field} value={draft.name_th} onChange={(e) => setDraft({ ...draft, name_th: e.target.value })} />
                </label>
                <label className="flex flex-col text-xs text-muted">ชื่อ (อังกฤษ)
                  <input className={field} value={draft.name_en} onChange={(e) => setDraft({ ...draft, name_en: e.target.value })} />
                </label>
                <label className="flex flex-col text-xs text-muted sm:col-span-2">{secondLabel} (ขึ้นบรรทัดใหม่ได้)
                  <textarea className={field} rows={2} value={draft.second} onChange={(e) => setDraft({ ...draft, second: e.target.value })} />
                </label>
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <button className={btnCls} onClick={() => startPrint([draftCard])}>พิมพ์ใบนี้</button>
                  <button className={btn2Cls} onClick={addDraft}>เพิ่มลงรายการ</button>
                  {draft.photo && <button className={btn2Cls} onClick={() => setDraft({ ...draft, photo: undefined })}>เอารูปออก</button>}
                </div>
              </div>
              <div className="grid gap-2 rounded bg-surface/60 p-3 text-sm sm:grid-cols-2">
                <label className="flex flex-col text-xs text-muted">นำเข้าไฟล์รายชื่อ (.tsv/.txt) · อ่านในเบราว์เซอร์เท่านั้น
                  <input type="file" accept=".tsv,.txt,text/tab-separated-values,text/plain" className="text-xs" onChange={(e) => { void onImportFile(e.target.files?.[0]); e.target.value = ""; }} />
                </label>
                <label className="flex flex-col text-xs text-muted">เลือกรูปหลายไฟล์ (จับคู่ด้วยชื่อไฟล์)
                  <input type="file" accept="image/*" multiple className="text-xs" onChange={(e) => { onPhotos(e.target.files); e.target.value = ""; }} />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <label className="flex items-center gap-2 text-xs text-muted">กรองบทบาท
                  <select className={field} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as "" | CardRoleKey)}>
                    <option value="">ทั้งหมด ({others.length})</option>
                    {CARD_ROLE_ORDER.map((k) => <option key={k} value={k}>{CARD_ROLES[k].en} ({others.filter((o) => o.role === k).length})</option>)}
                  </select>
                </label>
                <button className={btnCls} disabled={!shownOthers.length} onClick={() => startPrint(shownOthers)}>{roleFilter ? `พิมพ์ทั้งหมดของบทบาทนี้ (${shownOthers.length})` : `พิมพ์ทั้งรายการ (${others.length})`}</button>
                <button className={btn2Cls} disabled={!others.length} onClick={() => { setOthers([]); setRoleFilter(""); setFocusOther(undefined); }}>ล้างรายการ</button>
              </div>
              {others.length > 0 && (
                <ul className="divide-y divide-white/5 rounded bg-surface/60 text-sm">
                  {shownOthers.map((o) => (
                    <li key={o.id} className="flex items-center gap-3 px-3 py-2">
                      <span className="shrink-0 rounded bg-surface-2 px-2 py-0.5 text-xs">{CARD_ROLES[o.role].en}</span>
                      <button className="min-w-0 flex-1 truncate text-left" onClick={() => setFocusOther(o.id)} aria-label={`ดูตัวอย่าง ${o.name_th || o.name_en}`}>{o.name_th || o.name_en}</button>
                      <span className={`shrink-0 text-xs ${o.photo ? "text-accent" : "text-muted"}`}>{o.photo ? "มีรูป" : "ไม่มีรูป"}</span>
                      <button className="text-xs underline" onClick={() => startPrint([o])}>พิมพ์</button>
                      <button className="text-xs underline" onClick={() => setOthers(others.filter((x) => x.id !== o.id))}>เอาออก</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="space-y-2">
              {previewOther && <button className={btn2Cls} onClick={() => setFocusOther(undefined)}>กลับไปดูใบที่กรอก</button>}
              <Preview card={previewOther ?? draftCard} categories={backCategories} event={event} />
            </div>
          </div>
        )}
      </div>

      {/* พื้นที่พิมพ์: มีเฉพาะตอนสั่งพิมพ์ · ซ่อนบนจอ */}
      <div className="ad-print" aria-hidden>
        {printList?.flatMap((c) => [
          <div className="ad-face" key={`${c.id}-f`}><AdCardFront card={c} event={event} /></div>,
          <div className="ad-face" key={`${c.id}-b`}><AdCardBack categories={backCategories} event={event} /></div>,
        ])}
      </div>
    </div>
  );
}
