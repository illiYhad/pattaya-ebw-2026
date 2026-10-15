import React from "react";

/** แถบโค้งทอง+ชมพู+เส้นบางงาช้าง (ลายแนวริบบิ้นยิมนาสติกลีลา) · วางเป็นพื้นหลัง absolute ใน container relative+overflow-hidden */
export function Ribbons({ variant = "hero", className = "" }: { variant?: "hero" | "header" | "profile"; className?: string }) {
  if (variant === "header") {
    return (
      <svg className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
        <path d="M -80 110 C 300 40, 760 140, 1520 30" stroke="#D8B26A" strokeWidth="14" fill="none" opacity="0.9" />
        <path d="M -80 130 C 340 70, 820 160, 1520 60" stroke="#E8A0B4" strokeWidth="6" fill="none" opacity="0.9" />
      </svg>
    );
  }
  if (variant === "profile") {
    return (
      <svg className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} viewBox="0 0 390 330" preserveAspectRatio="none" aria-hidden="true">
        <path d="M -40 250 C 80 150, 230 300, 430 120" stroke="#D8B26A" strokeWidth="22" fill="none" />
        <path d="M -40 285 C 100 190, 250 330, 430 160" stroke="#E8A0B4" strokeWidth="10" fill="none" />
        <path d="M 200 -30 C 260 60, 340 70, 430 10" stroke="#E8A0B4" strokeWidth="14" fill="none" opacity="0.8" />
      </svg>
    );
  }
  return (
    <svg className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} viewBox="0 0 1440 640" preserveAspectRatio="none" aria-hidden="true">
      <path d="M -80 600 C 300 380, 760 700, 1520 260" stroke="#D8B26A" strokeWidth="46" fill="none" />
      <path d="M -80 660 C 340 450, 820 760, 1520 340" stroke="#E8A0B4" strokeWidth="20" fill="none" />
      <path d="M -80 700 C 380 510, 860 800, 1520 400" stroke="#FFF8F0" strokeWidth="2" fill="none" opacity="0.4" />
      <path d="M 900 -60 C 1060 120, 1260 110, 1520 -20" stroke="#E8A0B4" strokeWidth="30" fill="none" opacity="0.85" />
    </svg>
  );
}
