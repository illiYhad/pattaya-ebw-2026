"use client";

import React, { useState } from "react";
import type { Category, Competitor, Entry } from "@/lib/types";
import { timeRangeOf } from "@/lib/view";
import { MsgLine, useAct } from "@/components/ui/useAct";
import { setCheckInAction } from "@/app/checkin/actions";

type Props = { categories: Category[]; competitors: Competitor[]; entries: Entry[] };

// เช็กอินรายการ = ผู้แข่ง × ประเภท (คนที่ลง 2 ประเภท เช็กอินแยกกัน)
export function CheckinClient({ categories, competitors, entries }: Props) {
  const [q, setQ] = useState("");
  const [onlyCat, setOnlyCat] = useState("all");
  const { msg, act } = useAct();
  const needle = q.trim().toLowerCase();
  const compOf = (id: string) => competitors.find((c) => c.id === id);
  const hit = (c?: Competitor) =>
    !!c && (!needle || `${c.name_th} ${c.name_en} ${c.code} ${c.shop ?? ""}`.toLowerCase().includes(needle));

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="flex flex-wrap gap-2">
        <input className="min-w-0 flex-1 rounded bg-surface p-2" placeholder="ค้นชื่อ / รหัส EBW-001 / ร้าน" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="min-w-0 rounded bg-surface p-2" value={onlyCat} onChange={(e) => setOnlyCat(e.target.value)}>
          <option value="all">ทุกประเภท</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <MsgLine msg={msg} />
      {categories.filter((c) => onlyCat === "all" || c.id === onlyCat).map((c) => {
        const all = entries.filter((e) => e.category_id === c.id);
        const here = all.filter((e) => e.is_checked_in).length;
        const shown = all
          .map((e) => ({ e, comp: compOf(e.competitor_id) }))
          .filter((x) => hit(x.comp))
          .sort((a, b) => (a.comp?.code ?? "").localeCompare(b.comp?.code ?? ""));
        if (needle && shown.length === 0) return null;
        return (
          <section key={c.id}>
            <h2 className="mb-1 font-bold text-accent-2">
              {c.name} <span className="text-sm font-normal text-muted">{timeRangeOf(c)} · มาแล้ว {here} / ทั้งหมด {all.length}</span>
            </h2>
            {all.length === 0 && <p className="text-sm text-muted">ยังไม่มีผู้แข่งในประเภทนี้</p>}
            <ul className="space-y-1">
              {shown.map(({ e, comp }) => (
                <li key={e.id}>
                  <button
                    onClick={() => act(() => setCheckInAction(e.id, !e.is_checked_in), e.is_checked_in ? `ยกเลิกเช็กอิน ${comp?.name_th} แล้ว` : `เช็กอิน ${comp?.name_th} แล้ว`)}
                    className="flex w-full min-w-0 items-center gap-2 rounded bg-surface p-2 text-left text-sm"
                    aria-pressed={e.is_checked_in}
                  >
                    <span>{e.is_checked_in ? "✅" : "⬜"}</span>
                    <span className="w-20 shrink-0 text-xs text-accent-2">{comp?.code}</span>
                    <span className="truncate">{comp?.name_th}</span>
                    <span className="ml-auto truncate text-xs text-muted">{comp?.name_en}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
