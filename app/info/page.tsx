import type { Metadata } from "next";
import { data } from "@/lib/data";
import { EVENT } from "@/lib/event";
import { thaiDate } from "@/lib/view";
import { ARTWORK_DIR, INFO } from "@/lib/artwork";
import { PosterText } from "@/components/site/PosterText";
import { Actions, Btn, PosterPage, SectionH2, s } from "@/components/site/PosterPage";

export const revalidate = 20;
export const metadata: Metadata = { title: "ข้อมูลงาน", description: "วันแข่งขัน สถานที่ หมวดการแข่งขัน และการแต่งกาย (Dress code)" };

const MAP_URL = "https://www.google.com/maps/search/?api=1&query=Asia+Pattaya+Hotel";

function FactIcon({ kind }: { kind: "date" | "place" | "org" }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="23" fill="#1F5866" stroke="#D9B39C" strokeWidth="2" />
      {kind === "date" && (
        <>
          <rect x="13" y="15" width="22" height="20" rx="3" fill="none" stroke="#F1D9C8" strokeWidth="2.2" />
          <path d="M13 21h22M19 12v6M29 12v6" stroke="#F1D9C8" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="24" cy="28" r="2.4" fill="#F1D9C8" />
        </>
      )}
      {kind === "place" && (
        <>
          <path d="M24 36s-9-8.6-9-15a9 9 0 0 1 18 0c0 6.4-9 15-9 15z" fill="none" stroke="#F1D9C8" strokeWidth="2.2" strokeLinejoin="round" />
          <circle cx="24" cy="21" r="3.2" fill="#F1D9C8" />
        </>
      )}
      {kind === "org" && (
        <>
          <circle cx="24" cy="21" r="7.5" fill="none" stroke="#F1D9C8" strokeWidth="2.2" />
          <path d="M19.5 27.5L17 36l7-3.2 7 3.2-2.5-8.5" fill="none" stroke="#F1D9C8" strokeWidth="2.2" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}

/** หน้า /info — โปสเตอร์หลัก + Dress code · วัน/สถานที่/ผู้จัดจากตั้งค่างานและ EVENT */
export default async function InfoPage() {
  const config = await data.getEventConfig();
  const day = config.days[0] ?? EVENT.days[0];
  return (
    <PosterPage plate={INFO.plate}>
      <ul className={s("pp-facts")}>
        <li>
          <FactIcon kind="date" />
          <div>
            <small>วันแข่งขัน</small>
            <b><PosterText text={thaiDate(day)} /></b>
          </div>
        </li>
        <li>
          <FactIcon kind="place" />
          <div>
            <small>สถานที่</small>
            <b><PosterText text={EVENT.venue} /></b>
            <a href={MAP_URL} target="_blank" rel="noopener">เปิดแผนที่</a>
          </div>
        </li>
        <li>
          <FactIcon kind="org" />
          <div>
            <small>จัดโดย</small>
            <b><PosterText text={EVENT.organizer} /></b>
          </div>
        </li>
      </ul>

      <SectionH2 text={INFO.pillarsTitle} />
      <ul className={s("pp-pillars")}>
        {INFO.pillars.map((p) => (
          <li key={p.en}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${ARTWORK_DIR}${p.ico}`} alt="" loading="lazy" />
            <b>{p.en}</b>
            <small>{p.en2}</small>
          </li>
        ))}
      </ul>

      <SectionH2 text={INFO.dressTitle} />
      <div className={s("pp-dress")}>
        <figure className={s("pp-photo")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${ARTWORK_DIR}dresscode.jpg`} width={928} height={800} loading="lazy" alt="การแต่งกาย: DIRECTOR ชุดสีชมพู · JUDGE ชุดสีน้ำเงิน · CONTESTANT เสื้อเชิ้ตขาว กางเกงดำ" />
        </figure>
        <ul className={s("pp-legend")}>
          {INFO.dress.map((d) => (
            <li key={d.role}>
              <i style={{ background: d.hex }} />
              <div>
                <b>{d.role} : {d.color_en}</b>
                <span><PosterText text={d.th} /></span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <Actions>
        <Btn href="/categories">ประเภทและกติกา</Btn>
        <Btn href="/register" ghost>สมัครแข่งขัน</Btn>
        <Btn href="/#schedule" ghost>กำหนดการ</Btn>
      </Actions>
    </PosterPage>
  );
}
