import { ImageResponse } from "next/og";

// ภาพแชร์ชั่วคราวแบบตัวอักษรอังกฤษล้วน (ยังไม่มีไฟล์โลโก้จริง) — เปลี่ยนเป็นภาพจริงเมื่อมีไฟล์
export const alt = "Eastern Beauty & Wellness Championship 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "linear-gradient(160deg,#06203A,#137A8C)", color: "#F7F3EE" }}>
        <div style={{ fontSize: 28, letterSpacing: 10, color: "#E0A890", fontWeight: 700 }}>PMAT PRESENTS</div>
        <div style={{ fontSize: 84, fontWeight: 900, marginTop: 24, lineHeight: 1.05 }}>EASTERN BEAUTY</div>
        <div style={{ fontSize: 84, fontWeight: 900, lineHeight: 1.05 }}>& WELLNESS</div>
        <div style={{ fontSize: 34, letterSpacing: 14, marginTop: 24 }}>CHAMPIONSHIP 2026</div>
        <div style={{ fontSize: 28, marginTop: 40, color: "#9CEDE4" }}>30 OCT 2026 · ASIA PATTAYA HOTEL</div>
      </div>
    ),
    size,
  );
}
