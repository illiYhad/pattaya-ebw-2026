import React from "react";

/** แถบโค้งทอง+ชมพู+เส้นบางงาช้าง (ลายแนวริบบิ้นยิมนาสติกลีลา) · วางเป็นพื้นหลัง absolute ใน container relative+overflow-hidden */
export function Ribbons({ variant = "hero", className = "" }: { variant?: "hero" | "header" | "profile"; className?: string }) {
  if (variant === "header") {
    // บล็อกแยกใต้แถวเมนู (ไม่วางทับตัวอักษร)
    return (
      <svg className={`block h-7 w-full ${className}`} viewBox="0 0 1440 40" preserveAspectRatio="none" aria-hidden="true">
        <path d="M -80 36 C 300 0, 760 44, 1520 6" stroke="#D8B26A" strokeWidth="10" fill="none" />
        <path d="M -80 52 C 340 14, 820 60, 1520 24" stroke="#E8A0B4" strokeWidth="4" fill="none" />
      </svg>
    );
  }
  if (variant === "profile") {
    // บล็อกแยกใต้ชื่อผู้แข่ง (ไม่ทับตัวอักษร/รูป)
    return (
      <svg className={`block h-14 w-full ${className}`} viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
        <path d="M -80 70 C 320 6, 780 96, 1520 0" stroke="#D8B26A" strokeWidth="18" fill="none" />
        <path d="M -80 90 C 360 28, 820 116, 1520 24" stroke="#E8A0B4" strokeWidth="8" fill="none" />
        <path d="M -80 104 C 400 44, 860 130, 1520 40" stroke="#FFF8F0" strokeWidth="2" fill="none" opacity="0.4" />
      </svg>
    );
  }
  if (variant === "hero") {
    // บล็อกแยกท้าย hero หน้าแรก (ตามแบบ 4_Home v2)
    return (
      <svg className={`block h-[170px] w-full ${className}`} viewBox="0 0 1440 170" preserveAspectRatio="none" aria-hidden="true">
        <path d="M -80 150 C 320 20, 780 200, 1520 0" stroke="#D8B26A" strokeWidth="40" fill="none" />
        <path d="M -80 190 C 360 60, 820 240, 1520 44" stroke="#E8A0B4" strokeWidth="16" fill="none" />
        <path d="M -80 214 C 400 92, 860 268, 1520 74" stroke="#FFF8F0" strokeWidth="2" fill="none" opacity="0.4" />
      </svg>
    );
  }
  return null;
}
