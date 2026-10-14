import type { Category, Medium, Session, Sponsor, SponsorPosition } from "@/lib/types";

export const SESSION_LABEL: Record<Session, string> = { morning: "ช่วงเช้า", afternoon: "ช่วงบ่าย", submit: "ส่งผลงานล่วงหน้า" };
export const SESSION_ORDER: Session[] = ["morning", "afternoon", "submit"];
export const MEDIUM_LABEL: Record<Medium, string> = { live_model: "คนจริง", mannequin: "หัวหุ่น", skin_sheet: "แผ่นหนัง" };

/** "10.00–11.30 (90 นาที)" · ส่งล่วงหน้า = "ส่งผลงาน" */
export function timeRangeOf(c: Pick<Category, "session" | "start_time" | "end_time" | "duration_min">): string {
  if (c.session === "submit") return "ส่งผลงาน";
  const range = c.start_time && c.end_time ? `${c.start_time}–${c.end_time}` : c.start_time ?? "";
  const dur = c.duration_min ? `${c.duration_min} นาที` : "";
  return [range, dur && (range ? `(${dur})` : dur)].filter(Boolean).join(" ") || "-";
}

/** คะแนนเต็มรวมของเกณฑ์ที่มีตัวเลข + จำนวนข้อที่ยังว่าง */
export function criteriaSummary(c: Pick<Category, "criteria">): { total: number; blank: number } {
  return { total: c.criteria.reduce((a, x) => a + (x.max ?? 0), 0), blank: c.criteria.filter((x) => x.max === undefined).length };
}

/** วันที่ภาษาไทยแบบสั้น เช่น "ศุกร์ 30 ต.ค. 2569" (พ.ศ.) */
export function thaiDate(ymd: string): string {
  if (!ymd) return "-";
  const d = new Date(`${ymd}T00:00:00+07:00`);
  const part = (opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", ...opts });
  const weekday = part({ weekday: "long" }).replace(/^วัน/, "");
  const year = part({ year: "numeric" }).replace(/^พ\.ศ\.\s*/, "");
  return `${weekday} ${part({ day: "numeric" })} ${part({ month: "short" })} ${year}`;
}

/** สปอนเซอร์ที่เปิดใช้ในตำแหน่งนั้น เรียงตาม sequence */
export const sponsorsAt = (sponsors: Sponsor[], position: SponsorPosition) =>
  sponsors.filter((s) => s.is_active && s.position === position).sort((a, b) => a.sequence - b.sequence);
