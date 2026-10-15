import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { data } from "@/lib/data";
import { MEDIUM_LABEL, SESSION_LABEL } from "@/lib/view";
import { ARTWORK_DIR, JUDGE_NOTE, RULES, type ArtPhoto, type PrepItem, type RulesContent, type ScoredCriterion } from "@/lib/artwork";
import { PosterText } from "@/components/site/PosterText";
import { Actions, Btn, Card, Chip, DurBadge, PosterPage, SectionH2, cx, s } from "@/components/site/PosterPage";
import type { Category } from "@/lib/types";

export const revalidate = 20;

type Params = { params: Promise<{ code: string }> };

async function findCategory(code: string): Promise<{ category: Category; all: Category[] } | null> {
  const all = (await data.getCategories()).slice().sort((a, b) => a.sort_order - b.sort_order);
  const category = all.find((c) => c.code === code);
  return category ? { category, all } : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { code } = await params;
  const found = await findCategory(code);
  if (!found) return { title: "ไม่พบประเภท" };
  return { title: found.category.name, description: `กติกาการแข่งขัน ${found.category.name}` };
}

/** "ช่วงเช้า · 10.00–11.30 น." · ส่งล่วงหน้า = "ส่งผลงานล่วงหน้าก่อนวันแข่ง" (ตามโปสเตอร์ IN BOX) */
function sessionChip(c: Category): string {
  if (c.session === "submit") return "ส่งผลงานล่วงหน้าก่อนวันแข่ง";
  const t = c.start_time && c.end_time ? `${c.start_time}–${c.end_time} น.` : c.start_time ? `${c.start_time} น.` : "";
  return t ? `${SESSION_LABEL[c.session]} · ${t}` : SESSION_LABEL[c.session];
}

function Photos({ photos }: { photos: readonly ArtPhoto[] }) {
  if (!photos.length) return null;
  return (
    <div className={cx("pp-photos", photos.length === 3 && "n3")}>
      {photos.map((p) => (
        <figure key={p.src} className={cx("pp-photo", p.circle && "is-circle")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${ARTWORK_DIR}${p.src}`} width={p.w} height={p.h} alt={p.alt} loading="lazy" />
        </figure>
      ))}
    </div>
  );
}

function Criteria({ items, total }: { items: readonly ScoredCriterion[]; total?: number }) {
  const hasIco = items.some((x) => x.ico);
  return (
    <Card>
      <ol className={cx("pp-crit", hasIco && "has-ico")}>
        {items.map((x, i) => (
          <li key={i}>
            <span className={s("no")}>{i + 1}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {x.ico && <img className={s("ico")} src={`${ARTWORK_DIR}${x.ico}`} width={88} height={88} alt="" />}
            <div>
              <div className={s("nm")}><PosterText text={x.name} /></div>
              {x.ds && (
                <ul className={s("ds")}>
                  {x.ds.map((d, j) => (
                    <li key={j}><PosterText text={d} /></li>
                  ))}
                </ul>
              )}
            </div>
            <span className={s("pp-score")} aria-label={`${x.pts} คะแนน`}>
              <b>{x.pts}</b>
              <small>คะแนน</small>
            </span>
          </li>
        ))}
      </ol>
      {total !== undefined && (
        <div className={s("pp-total")}>
          <span>รวมคะแนนทั้งสิ้น <b>{total}</b> คะแนน</span>
        </div>
      )}
    </Card>
  );
}

function Prep({ items, cols }: { items: readonly PrepItem[]; cols?: 1 | 2 | 3 }) {
  const hasIco = items.some((x) => typeof x !== "string");
  return (
    <Card>
      <ul className={cx("pp-prep", hasIco && "has-ico", cols === 2 && "cols-2", cols === 3 && "cols-3")}>
        {items.map((x, i) =>
          typeof x === "string" ? (
            <li key={i}><PosterText text={x} /></li>
          ) : (
            <li key={i}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={s("ico")} src={`${ARTWORK_DIR}${x.ico}`} width={104} height={104} alt="" />
              <span><PosterText text={x.text} /></span>
            </li>
          ),
        )}
      </ul>
    </Card>
  );
}

/** ส่วนเนื้อหาตามชนิดของประเภท (ลำดับ/เลย์เอาต์ตามไฟล์อ้างอิง rules-<code>.html) */
function RulesBody({ r, c }: { r: RulesContent; c: Category }) {
  const notes = r.rulesNote && <p className={s("pp-note")}><PosterText text={r.rulesNote} /></p>;

  if (r.format) {
    // นวดไทย: (รูปแบบการแข่งขัน | รูปวงกลม) → เกณฑ์เต็มกว้าง → ความปลอดภัย
    return (
      <>
        <div className={cx("pp-split", "is-wide-aside")}>
          <div>
            <SectionH2 text="รูปแบบการแข่งขัน" />
            <Card>
              <ul className={s("pp-bul")}>
                {r.format.items.map((x, i) => (
                  <li key={i}><PosterText text={x} /></li>
                ))}
              </ul>
              <p className={s("pp-lead")}><PosterText text={r.format.stepsLead} /></p>
              <ol className={cx("pp-ol", "pp-steps")}>
                {r.format.steps.map((x, i) => (
                  <li key={i}><span><PosterText text={x} /></span></li>
                ))}
              </ol>
              <p className={s("pp-star")}>★ <PosterText text={r.format.star} /></p>
            </Card>
          </div>
          <aside className={s("pp-aside")}><Photos photos={r.photos} /></aside>
        </div>
        {r.criteria && (
          <>
            <SectionH2 text="เกณฑ์การให้คะแนน" />
            <Criteria items={r.criteria} total={r.total} />
          </>
        )}
      </>
    );
  }

  if (r.criteria) {
    // นวดหน้า: (เกณฑ์ | รูป) คลาส is-crit
    return (
      <div className={cx("pp-split", "is-crit")}>
        <div>
          <SectionH2 text="เกณฑ์การให้คะแนน" />
          <Criteria items={r.criteria} total={r.total} />
        </div>
        <aside className={s("pp-aside")}><Photos photos={r.photos} /></aside>
      </div>
    );
  }

  if (r.summary) {
    // แฮร์สโตรก: ไม่มีโปสเตอร์กติกา → สรุปเวลา + คะแนน
    const time = c.duration_min && c.start_time && c.end_time ? `เวลาแข่งขัน ${c.duration_min} นาที · ${c.start_time}–${c.end_time} น.` : null;
    return (
      <div className={s("pp-split")}>
        <div>
          <ul className={cx("pp-bul", "pp-card")}>
            {time && <li><PosterText text={time} /></li>}
            {r.summary.map((x, i) => (
              <li key={i}><PosterText text={x} /></li>
            ))}
          </ul>
        </div>
        <aside className={s("pp-aside")}><Photos photos={r.photos} /></aside>
      </div>
    );
  }

  // ที่เหลือ: (กติกาเลขข้อ | รูป)
  return (
    <div className={s("pp-split")}>
      <div>
        {r.rules && (
          <ol className={s("pp-ol")}>
            {r.rules.map((x, i) => (
              <li key={i}><span><PosterText text={x} /></span></li>
            ))}
          </ol>
        )}
        {notes}
      </div>
      <aside className={s("pp-aside")}><Photos photos={r.photos} /></aside>
    </div>
  );
}

/** หน้า /categories/[code] — กติกาจาก RULES[code] + แถบข้อมูลจาก category */
export default async function CategoryRulesPage({ params }: Params) {
  const { code } = await params;
  const found = await findCategory(code);
  if (!found) notFound();
  const { category: c, all } = found;
  const r: RulesContent | undefined = RULES[c.code];
  const plate = r?.plate ?? { title: c.name, sub: c.name_en };

  return (
    <PosterPage plate={plate}>
      <div className={s("pp-meta")}>
        <Chip>{sessionChip(c)}</Chip>
        {c.session !== "submit" && <DurBadge minutes={c.duration_min} />}
        {c.medium && <Chip>{MEDIUM_LABEL[c.medium]}</Chip>}
        <Chip>คะแนนเต็ม 100</Chip>
        <Chip>กรรมการ {c.judge_count} ท่าน</Chip>
      </div>

      {r && <RulesBody r={r} c={c} />}

      {r?.safety && (
        <>
          <SectionH2 text="ข้อกำหนดด้านความปลอดภัย" />
          <Card>
            <ul className={cx("pp-bul", "is-warn")}>
              {r.safety.map((x, i) => (
                <li key={i}><PosterText text={x} /></li>
              ))}
            </ul>
          </Card>
        </>
      )}

      {r?.prep && (
        <>
          <SectionH2 text="สิ่งที่ต้องเตรียม" />
          <Prep items={r.prep} cols={r.prepCols} />
          {r.prepNotes?.map((x, i) => (
            <p key={i} className={s("pp-note")}><PosterText text={x} /></p>
          ))}
        </>
      )}

      {r?.remark && (
        <div className={s("pp-remark")}>
          <span>( <PosterText text={r.remark} /> )</span>
        </div>
      )}

      <div className={s("pp-judge")}>
        <p>
          {JUDGE_NOTE.lines.map((line, i) => (
            <React.Fragment key={i}>
              {i > 0 && <br />}
              <PosterText text={line} />
            </React.Fragment>
          ))}
        </p>
        <strong><PosterText text={JUDGE_NOTE.final} /></strong>
      </div>

      <Actions>
        <Btn href={`/athletes?cat=${c.code}`}>ดูผู้แข่งขันประเภทนี้</Btn>
        <Btn href="/categories" ghost>ประเภททั้งหมด</Btn>
        <Btn href="/register" ghost>สมัครแข่งขัน</Btn>
      </Actions>

      <nav className={s("pp-catnav")} aria-label="ประเภทการแข่งขันอื่น">
        <p>ประเภทอื่น</p>
        <ul>
          {all.map((x) => (
            <li key={x.id}>
              <Link href={`/categories/${x.code}`} aria-current={x.id === c.id ? "page" : undefined}>
                <span><PosterText text={x.name} /></span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </PosterPage>
  );
}
