import React from "react";
import Link from "next/link";
import type { Plate } from "@/lib/artwork";
import { PosterText } from "./PosterText";
import styles from "./PosterPage.module.css";

/** ชื่อคลาสจาก CSS module (คงชื่อเดิมของ artwork.css ไว้ทั้งหมด) */
export const s = (name: string) => styles[name] ?? name;
/** รวมหลายคลาส · ค่าว่าง/false ข้าม */
export const cx = (...names: (string | false | undefined | null)[]) => names.filter((n): n is string => !!n).map(s).join(" ");

export const HEAD_ALT = "EASTERN BEAUTY & WELLNESS CHAMPIONSHIP 2026 · 30 OCTOBER 2026 · PATTAYA, THAILAND";

/**
 * กรอบหน้าแบบโปสเตอร์ (K-P1.10): แถบพื้นหลังเบลอ · คอลัมน์ 1024 · ภาพหัว head.jpg + ป้ายชื่อ · กระดาษ · ภาพท้าย
 * ห่อเต็มความกว้างจอและชดเชย p-4 ของ <main> บน/ล่าง · ป้ายชื่อ: จอกว้างวางทับป้ายในภาพ · มือถือใช้ป้าย CSS
 */
export function PosterPage({ plate, children }: { plate: Plate; children: React.ReactNode }) {
  return (
    <div className="relative left-1/2 -my-4 w-screen -translate-x-1/2">
      <section className={s("pp")}>
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
          <defs>
            <linearGradient id="pp-ck" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#F6E2D3" />
              <stop offset=".45" stopColor="#C79A82" />
              <stop offset="1" stopColor="#F1D3C1" />
            </linearGradient>
          </defs>
        </svg>
        <div className={s("pp-col")}>
          <div className={s("pp-hw")}>
            <div className={s("pp-head")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={s("pp-top")} src="/artwork/head.jpg" width={1024} height={518} alt={HEAD_ALT} />
            </div>
            <div className={cx("pp-plate", plate.long && "is-long")}>
              {plate.kicker && <span className={s("pp-kicker")}><PosterText text={plate.kicker} /></span>}
              <h1 className={s("pp-title")}><PosterText text={plate.title} /></h1>
              {plate.sub && <span className={s("pp-sub")}><PosterText text={plate.sub} /></span>}
            </div>
          </div>
          <div className={s("pp-mid")}>{children}</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={s("pp-bot")} src="/schedule/bottom.jpg" width={1024} height={318} alt="" loading="lazy" />
        </div>
      </section>
    </div>
  );
}

/** ไอคอนนาฬิกาในป้ายเวลา (gradient อ้าง #pp-ck ที่ประกาศครั้งเดียวใน PosterPage) */
function ClockIcon() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill="url(#pp-ck)" />
      <circle cx="20" cy="20" r="15.6" fill="#FBF5F1" />
      <g stroke="#6B4A39" strokeLinecap="round">
        <path d="M20 6.8v2.6M20 30.6v2.6M6.8 20h2.6M30.6 20h2.6" strokeWidth="1.6" />
        <path d="M20 20.6V11.6" strokeWidth="2.2" />
        <path d="M20 20.6l6.2 3.4" strokeWidth="2" />
      </g>
      <circle cx="20" cy="20.4" r="1.7" fill="#3A2A20" />
    </svg>
  );
}

/** ป้ายเวลาแข่งขัน: "เวลาแข่งขัน N นาที" · ส่งล่วงหน้า = "ส่ง IN BOX" */
export function DurBadge({ minutes, inbox }: { minutes?: number; inbox?: boolean }) {
  if (!inbox && !minutes) return null;
  return (
    <span className={s("pp-dur")}>
      <ClockIcon />
      {inbox ? (
        <span>ส่ง <b>IN BOX</b></span>
      ) : (
        <span>เวลาแข่งขัน <b>{minutes}</b> นาที</span>
      )}
    </span>
  );
}

export function Chip({ children }: { children: React.ReactNode }) {
  return <span className={s("pp-chip")}>{children}</span>;
}

/** หัวข้อส่วนแบบป้ายเม็ดยา */
export function SectionH2({ text }: { text: string }) {
  return (
    <div className={s("pp-h2")}>
      <h2><PosterText text={text} /></h2>
    </div>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cx("pp-card", className)}>{children}</div>;
}

export function Actions({ children }: { children: React.ReactNode }) {
  return <div className={s("pp-actions")}>{children}</div>;
}

export function Btn({ href, ghost, children }: { href: string; ghost?: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={cx("pp-btn", ghost && "ghost")}>
      {children}
    </Link>
  );
}

/** ลูกศรท้ายแถว (จอกว้าง) */
export function GoIcon() {
  return (
    <svg className={s("go")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}
