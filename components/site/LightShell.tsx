import React from "react";

/** พื้นสว่างเต็มความกว้างจอ สำหรับเนื้อหาสาธารณะ (หน้าแรก/รายชื่อ/โปรไฟล์) · ตัวแปรสีถูกทับเฉพาะภายใน (ดู .light-shell) */
export function LightShell({ children, className = "", pull = 16 }: { children: React.ReactNode; className?: string; pull?: number }) {
  return (
    <div className={`light-shell relative left-1/2 -mb-4 w-screen -translate-x-1/2 px-4 py-8 ${className}`} style={{ marginTop: -pull }}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </div>
  );
}
