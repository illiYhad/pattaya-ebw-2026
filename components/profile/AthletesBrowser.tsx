"use client";

import React, { useState } from "react";
import type { Category, Competitor } from "@/lib/types";
import { AthleteCard } from "./AthleteCard";

export type AthleteItem = { competitor: Competitor; photo?: string; categoryIds: string[]; categoryLabel: string };

export function AthletesBrowser({ items, categories, initialCategory = "all" }: { items: AthleteItem[]; categories: Category[]; initialCategory?: string }) {
  const [cat, setCat] = useState(initialCategory);
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();

  const list = items.filter((it) => {
    if (cat !== "all" && !it.categoryIds.includes(cat)) return false;
    if (needle) {
      const c = it.competitor;
      const hay = `${c.name_th} ${c.name_en} ${c.code} ${c.shop ?? ""} ${it.categoryLabel}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
  const sel = "min-w-0 rounded bg-surface p-2 text-sm";

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <select className={`${sel} sm:col-span-2`} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="all">ทุกประเภท</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input className={sel} placeholder="ค้นชื่อ / รหัส / ร้าน" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <p className="text-xs text-muted">{list.length} คน</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {list.map((it) => <AthleteCard key={it.competitor.id} competitor={it.competitor} photo={it.photo} category={it.categoryLabel} />)}
      </div>
    </div>
  );
}
