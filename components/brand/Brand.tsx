import React from "react";
import Image from "next/image";

// คอมโพเนนต์แบรนด์กลาง — ทุกหน้าเรียกจากที่นี่ (ห้ามเขียนโลโก้กระจายเอง)
// ตอนนี้ยังไม่มีไฟล์โลโก้ → แสดงตัวอักษร "PMAT" + ชื่องาน · ใส่ไฟล์จริงที่ public/brand/ แล้วตั้งค่า BRAND.logoSrc / BRAND.sealSrc ที่นี่ที่เดียว

export const BRAND = {
  /** ไฟล์โลโก้งาน (เช่น "/brand/ebw-logo.png") — ว่าง = ใช้ตัวอักษร */
  logoSrc: undefined as string | undefined,
  /** ไฟล์ตราสมาคม PMAT (เช่น "/brand/pmat-seal.png") — ว่าง = ใช้ตัวอักษร */
  sealSrc: undefined as string | undefined,
  alt: "Eastern Beauty & Wellness Championship 2026",
  sealAlt: "สมาคม PMAT",
  organizer: "สมาคม PMAT",
  organizerEn: "Permanent Make Up Association (Thailand)",
} as const;

type Variant = "white" | "color";

const inkOf = (variant: Variant) => (variant === "white" ? "#F7F3EE" : "#0A3A5C");

/** โลโก้งานแบบตัวอักษร · width = ความกว้างโดยประมาณ (px) · src = ไฟล์แทน (จากตั้งค่างาน) */
export function EventLogo({ variant = "white", width, className = "", src, priority }: { variant?: Variant; width: number; className?: string; src?: string; priority?: boolean }) {
  const w = Math.max(120, Math.round(width));
  const file = src ?? BRAND.logoSrc;
  if (file) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={file} alt={BRAND.alt} style={{ height: Math.round(w * 0.45), width: "auto" }} className={className} />;
  }
  const ink = inkOf(variant);
  const accent = variant === "white" ? "#E0A890" : "#B9775C";
  return (
    <div role="img" aria-label={BRAND.alt} data-priority={priority ? "1" : undefined} className={`inline-flex flex-col leading-none ${className}`} style={{ width: w, color: ink }}>
      <span style={{ fontSize: w * 0.075, letterSpacing: "0.32em", color: accent, fontWeight: 700 }}>PMAT PRESENTS</span>
      <span style={{ fontSize: w * 0.13, fontWeight: 900, letterSpacing: "0.02em", marginTop: w * 0.025 }}>EASTERN BEAUTY</span>
      <span style={{ fontSize: w * 0.13, fontWeight: 900, letterSpacing: "0.02em" }}>&amp; WELLNESS</span>
      <span style={{ fontSize: w * 0.075, letterSpacing: "0.5em", fontWeight: 600, marginTop: w * 0.03 }}>CHAMPIONSHIP 2026</span>
    </div>
  );
}

/** เครื่องหมายเล็ก (ตัวอักษร EBW ในวงกลม) — ใช้ที่เล็กกว่า 120px · ลายน้ำ · ไอคอน */
export function EventMark({ variant = "white", size, className = "", style }: { variant?: Variant; size: number; className?: string; style?: React.CSSProperties }) {
  const s = Math.round(size);
  const ink = inkOf(variant);
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" aria-hidden className={className} style={{ width: s, height: s, ...style }}>
      <circle cx="50" cy="50" r="46" fill="none" stroke={ink} strokeWidth="4" />
      <circle cx="50" cy="50" r="38" fill="none" stroke={ink} strokeWidth="1.5" opacity=".6" />
      <text x="50" y="59" textAnchor="middle" fontSize="28" fontWeight="900" fill={ink} fontFamily="system-ui, sans-serif">EBW</text>
    </svg>
  );
}

/** ตราสมาคม PMAT · size ≥ 32 */
export function Seal({ size, className = "", priority }: { size: number; className?: string; priority?: boolean }) {
  const s = Math.max(32, Math.round(size));
  if (BRAND.sealSrc) {
    return <Image src={BRAND.sealSrc} alt={BRAND.sealAlt} title={BRAND.sealAlt} width={s} height={s} sizes={`${s}px`} priority={priority} className={`shrink-0 ${className}`} style={{ width: s, height: s }} />;
  }
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" role="img" aria-label={BRAND.sealAlt} className={`shrink-0 ${className}`} style={{ width: s, height: s }}>
      <circle cx="50" cy="50" r="47" fill="#0A3A5C" stroke="#E0A890" strokeWidth="3" />
      <circle cx="50" cy="50" r="39" fill="none" stroke="#E0A890" strokeWidth="1" opacity=".7" />
      <text x="50" y="58" textAnchor="middle" fontSize="24" fontWeight="900" fill="#F7F3EE" fontFamily="system-ui, sans-serif">PMAT</text>
    </svg>
  );
}

/** ตรา + เส้นคั่น + โลโก้งาน ในกล่องโปร่ง (มุมจอ overlay) · sm = ตรา 64 + โลโก้ 130 · md = ตรา 96 + โลโก้ 200 */
export function OfficialBug({ size = "sm", className = "", style }: { size?: "sm" | "md"; className?: string; style?: React.CSSProperties }) {
  const seal = size === "sm" ? 64 : 96;
  const logo = size === "sm" ? 130 : 200;
  return (
    <div className={`flex items-center gap-4 rounded-xl bg-bg/70 px-4 py-2 ${className}`} style={style}>
      <Seal size={seal} />
      <div className="h-12 w-px bg-white/30" />
      <EventLogo variant="white" width={logo} />
    </div>
  );
}

/** แถบบนของฉากเต็มจอ (overlay): ซ้าย = ตรา 96 + "จัดโดย / สมาคม PMAT" · ขวา = โลโก้งาน (ซ่อนได้เมื่อมีโลโก้ในฉากแล้ว) */
export function OfficialHeader({ showLogo = true }: { showLogo?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-x-16 top-12 z-20 flex items-start justify-between">
      <div className="flex items-center gap-4">
        <Seal size={96} />
        <div className="leading-tight">
          <div className="text-[20px] text-muted">จัดโดย</div>
          <div className="text-[30px] font-bold">{BRAND.organizer}</div>
        </div>
      </div>
      {showLogo && <EventLogo variant="white" width={240} />}
    </div>
  );
}

/** ลายน้ำเครื่องหมายงาน (ชิดขวา หลังเนื้อหา) — ใส่ใน container ที่เป็น relative + overflow-hidden */
export function Watermark({ height, opacity = 0.05, className = "" }: { height: number; opacity?: number; className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-y-0 right-0 z-0 flex items-center ${className}`} style={{ opacity }} aria-hidden>
      <EventMark variant="white" size={height} />
    </div>
  );
}
