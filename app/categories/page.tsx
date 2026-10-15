import React from "react";
import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import type { Metadata } from "next";
import { data } from "@/lib/data";
import { SESSION_LABEL, SESSION_ORDER } from "@/lib/view";
import { PosterText } from "@/components/site/PosterText";
import { Actions, Btn, DurBadge, GoIcon, PosterPage, SectionH2, s } from "@/components/site/PosterPage";
import type { Category } from "@/lib/types";

export const revalidate = 20;
export const metadata: Metadata = { title: "ประเภทการแข่งขัน", description: "เวลาการแข่งขันของทุกประเภท" };

/** "10.00–11.30 น." · ส่งล่วงหน้า = "ส่งผลงานล่วงหน้า" */
function timeText(c: Category): string {
  if (c.session === "submit") return "ส่งผลงานล่วงหน้า";
  return c.start_time && c.end_time ? `${c.start_time}–${c.end_time} น.` : c.start_time ? `${c.start_time} น.` : "-";
}

/** รูปย่อ /artwork/thumb-<code>.jpg ถ้ามีไฟล์ */
function thumbOf(code: string): string | null {
  const rel = `thumb-${code}.jpg`;
  return fs.existsSync(path.join(process.cwd(), "public", "artwork", rel)) ? `/artwork/${rel}` : null;
}

/** หน้า /categories — จากโปสเตอร์ "เวลาการแข่งขันของทุกประเภท" · แถวจริงจาก data.getCategories() */
export default async function CategoriesPage() {
  const categories = (await data.getCategories()).slice().sort((a, b) => a.sort_order - b.sort_order);
  return (
    <PosterPage plate={{ title: "ประเภทการแข่งขัน", sub: "เวลาแข่งขันและกติกาของทุกประเภท" }}>
      {SESSION_ORDER.map((session) => {
        const cats = categories.filter((c) => c.session === session);
        if (!cats.length) return null;
        return (
          <React.Fragment key={session}>
            <SectionH2 text={SESSION_LABEL[session]} />
            <ul className={s("pp-rows")}>
              {cats.map((c) => {
                const thumb = thumbOf(c.code);
                return (
                  <li key={c.id}>
                    <Link className={s("pp-row")} href={`/categories/${c.code}`}>
                      {thumb && (
                        <span className={s("th")}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={thumb} width={240} height={200} alt="" loading="lazy" />
                        </span>
                      )}
                      <span className={s("tm")}>{timeText(c)}</span>
                      <span className={s("nm")}>
                        <PosterText text={c.name} />
                        <small>{c.name_en}</small>
                      </span>
                      <span className={s("du")}>
                        <DurBadge minutes={c.duration_min} inbox={c.session === "submit"} />
                      </span>
                      <GoIcon />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </React.Fragment>
        );
      })}
      <Actions>
        <Btn href="/register">ค่าสมัคร · วิธีสมัคร</Btn>
        <Btn href="/info" ghost>ข้อมูลงาน · Dress code</Btn>
      </Actions>
    </PosterPage>
  );
}

