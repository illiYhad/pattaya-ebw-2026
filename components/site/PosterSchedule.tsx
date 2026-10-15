import React from "react";
import { SCHEDULE } from "@/lib/event";
import { handAngles, thaiDate } from "@/lib/view";
import styles from "./PosterSchedule.module.css";

const s = (name: string) => styles[name] ?? name;

/** นาฬิกาเข็มชี้ตรงเวลาเริ่ม · ขอบโรสโกลด์ หน้าปัดครีม 12 ขีด · gradient อ้างจาก <defs> ชุดเดียวของส่วนนี้ */
function Clock({ start }: { start: string }) {
  const { hour, minute } = handAngles(start);
  return (
    <svg className={s("ps-clock")} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="48.5" fill="url(#ps-ring)" />
      <circle cx="50" cy="50" r="43.6" fill="#8E6450" opacity=".55" />
      <circle cx="50" cy="50" r="42.4" fill="url(#ps-face)" />
      <circle cx="50" cy="50" r="40.2" fill="none" stroke="#C9A48F" strokeWidth=".8" />
      {Array.from({ length: 12 }, (_, i) => {
        const major = i % 3 === 0;
        return (
          <line
            key={i}
            x1="50"
            y1={major ? 12.5 : 13.5}
            x2="50"
            y2={major ? 19 : 17.5}
            stroke="#6B4A39"
            strokeWidth={major ? 2.4 : 1.5}
            strokeLinecap="round"
            transform={`rotate(${i * 30} 50 50)`}
          />
        );
      })}
      <g className={s("hd")} style={{ "--a": `${hour}deg` } as React.CSSProperties}>
        <line x1="50" y1="55" x2="50" y2="28.5" stroke="#3A2A20" strokeWidth="4.2" strokeLinecap="round" />
      </g>
      <g className={s("hd")} style={{ "--a": `${minute}deg` } as React.CSSProperties}>
        <line x1="50" y1="57" x2="50" y2="17.5" stroke="#3A2A20" strokeWidth="2.6" strokeLinecap="round" />
      </g>
      <circle cx="50" cy="50" r="3.4" fill="url(#ps-ring)" stroke="#3A2A20" strokeWidth=".9" />
    </svg>
  );
}

/** "08.00–08.30" → "08.00 – 08.30 น." · "10.00" → "10.00 น." (แบบโปสเตอร์) */
const timeText = (t: string) => `${t.replace("–", " – ")} น.`;

/** กำหนดการแบบโปสเตอร์ PMAT: ภาพหัว/ท้ายจากโปสเตอร์ + แถวจริง (ตัวอักษร นาฬิกา รูปประกอบ) */
export function PosterSchedule({ day }: { day: string }) {
  return (
    <section className={s("ps")} aria-labelledby="ps-h">
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <linearGradient id="ps-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F6E2D3" />
            <stop offset=".3" stopColor="#D9B39C" />
            <stop offset=".55" stopColor="#B5866D" />
            <stop offset=".78" stopColor="#EBD0BE" />
            <stop offset="1" stopColor="#9E7058" />
          </linearGradient>
          <radialGradient id="ps-face" cx=".45" cy=".4" r=".65">
            <stop offset="0" stopColor="#FCF6F2" />
            <stop offset=".75" stopColor="#F1E4DC" />
            <stop offset="1" stopColor="#E2CFC4" />
          </radialGradient>
        </defs>
      </svg>
      <div className={s("ps-col")}>
        <h2 id="ps-h" className={s("sr")}>กำหนดการแข่งขันที่พัทยา · <span style={{ whiteSpace: "nowrap" }}>{thaiDate(day)}</span></h2>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={s("ps-top")} src="/schedule/top.jpg" width={1024} height={518} alt="Eastern Beauty & Wellness Championship 2026 · 30 October 2026 · Pattaya, Thailand · กำหนดการแข่งขันที่พัทยา" />
        <div className={s("ps-mid")}>
          <ol className={s("ps-list")}>
            {SCHEDULE.map((row, i) => (
              <li key={row.start} className={`${s("ps-row")} ${i === 0 ? s("is-first") : ""} ${i === SCHEDULE.length - 1 ? s("is-last") : ""}`}>
                <Clock start={row.start} />
                <span className={s("ps-dot")} aria-hidden="true" />
                <time className={s("ps-time")} dateTime={`${day}T${row.start}+07:00`}>{timeText(row.time)}</time>
                <span className={s("ps-act")}>
                  {row.lines ? (
                    row.lines.map((phrases, li) => (
                      <React.Fragment key={li}>
                        {li > 0 ? " " : null}
                        <span className={s("l")}>
                          {phrases.map((w, wi) => (
                            <React.Fragment key={wi}>
                              {wi > 0 && !phrases[wi - 1].endsWith(" ") ? " " : null}
                              <span className={s("w")}>{w.trim()}</span>
                              {w.endsWith(" ") ? " " : null}
                            </React.Fragment>
                          ))}
                        </span>
                      </React.Fragment>
                    ))
                  ) : (
                    <span className={s("l")}><span className={s("w")}>{row.label}</span></span>
                  )}
                </span>
                {row.art && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className={s("ps-ico")} src={`/schedule/${row.art}`} alt="" width={165} height={165} loading="lazy" />
                )}
              </li>
            ))}
          </ol>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={s("ps-bot")} src="/schedule/bottom.jpg" width={1024} height={318} alt="" loading="lazy" />
      </div>
    </section>
  );
}
