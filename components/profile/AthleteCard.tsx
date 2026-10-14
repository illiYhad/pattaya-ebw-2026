import React from "react";
import Link from "next/link";
import type { Competitor } from "@/lib/types";
import { Avatar } from "./Avatar";

export function AthleteCard({ competitor, photo, category }: { competitor: Competitor; photo?: string; category?: string }) {
  return (
    <Link href={`/athletes/${competitor.id}`} className="flex flex-col gap-2 rounded-xl bg-surface p-3 hover:ring-1 hover:ring-accent">
      <Avatar src={photo} name={competitor.name_th} size="fill" className="aspect-[4/5] w-full" mark={18} />
      <div className="min-w-0">
        <div className="text-[11px] font-bold tracking-wider text-accent-2">{competitor.code}</div>
        <div className="truncate text-lg font-black">{competitor.name_th}</div>
        <div className="truncate text-xs text-muted">{competitor.name_en}</div>
        {category && <div className="truncate text-xs text-accent">{category}</div>}
        {competitor.shop && <div className="truncate text-xs text-muted">{competitor.shop}</div>}
      </div>
    </Link>
  );
}
