import React from "react";
import Link from "next/link";
import type { Competitor } from "@/lib/types";
import { Avatar } from "./Avatar";

/** การ์ดขาวมุมโค้ง · รูปวงกลมขอบทอง · เลข EBW ฟอนต์ Barlow */
export function AthleteCard({ competitor, photo, category }: { competitor: Competitor; photo?: string; category?: string }) {
  return (
    <Link href={`/athletes/${competitor.id}`} className="flex flex-col items-center gap-2 rounded-[28px] border border-[#E6DDEF] bg-surface p-4 text-center hover:border-accent">
      <Avatar src={photo} name={competitor.name_th} size="lg" round className="!h-32 !w-32 !text-3xl" />
      <div className="min-w-0 max-w-full">
        <div className="num text-base font-semibold tracking-[0.2em] text-accent">{competitor.code}</div>
        <div className="truncate text-lg font-semibold">{competitor.name_th}</div>
        <div className="truncate text-xs text-muted">{competitor.name_en}</div>
        {category && <div className="mt-1 truncate rounded-full bg-surface-2 px-3 py-0.5 text-xs text-[#4A3478]">{category}</div>}
        {competitor.shop && <div className="truncate pt-1 text-xs text-muted">{competitor.shop}</div>}
      </div>
    </Link>
  );
}
