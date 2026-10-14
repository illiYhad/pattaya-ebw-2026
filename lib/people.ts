import type { AthletePhoto, Competitor } from "@/lib/types";

// ตัวตนผู้แข่งข้ามประเภท + รูป

/** กุญแจคน (ผูกรูป) */
export const personKeyOf = (c: Competitor) => c.person_key;

/** id รูปจาก person_key — ใช้เป็น path ได้ (djb2 hex) */
export function photoIdFor(personKey: string): string {
  let h = 5381;
  for (let i = 0; i < personKey.length; i++) h = ((h << 5) + h + personKey.charCodeAt(i)) >>> 0;
  return `ph${h.toString(16)}${personKey.length.toString(36)}`;
}

/** อักษรย่อจากชื่อ (ไทย/อังกฤษ): ตัวแรกของแต่ละคำ สูงสุด 2 คำ (สระหน้าไทยพ่วงพยัญชนะถัดไป) */
export function initialsOf(name?: string): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  return words
    .slice(0, 2)
    .map((w) => {
      const chars = Array.from(w);
      return /[เแโใไ]/.test(chars[0]) && chars[1] ? chars[0] + chars[1] : chars[0];
    })
    .join("");
}

/** รูปที่แสดงบนหน้าสาธารณะได้ (ต้องยินยอม) */
export function publicPhoto(photos: AthletePhoto[], c: Competitor): AthletePhoto | undefined {
  return photos.find((ph) => ph.person_key === c.person_key && ph.consent);
}
