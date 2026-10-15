import React from "react";

/**
 * ตัวอย่างอ้างอิง (K-P1.10) — ตัดบรรทัดข้อความแบบโปสเตอร์ · กติกาเดียวกับ build.py (ฟังก์ชัน ph)
 * - แยกวลีด้วยช่องว่าง · ตัวเลขติดคำถัดไป (NBSP) · วลี ≤ 22 ตัว = nowrap · "|" = <wbr> · **x** = <b> · "\n" = <br>
 * โคลท์ปรับได้ตามโค้ดเบส (เช่นใช้ class whitespace-nowrap ของ Tailwind) แต่ผลการตัดบรรทัดต้องเท่าเดิม
 */
const NUM = /^\d[\d,.\-–]*$/;
const MAX = 22;

function bold(s: string, key: string): React.ReactNode {
  const parts = s.split(/\*\*(.+?)\*\*/g);
  return parts.map((p, i) => (i % 2 ? <b key={`${key}-${i}`}>{p}</b> : <React.Fragment key={`${key}-${i}`}>{p}</React.Fragment>));
}

export function PosterText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, li) => {
        const merged: string[] = [];
        for (const w of line.split(" ").filter(Boolean)) {
          const prev = merged[merged.length - 1];
          if (prev !== undefined && NUM.test(prev.replace(/\*/g, "")) && !prev.endsWith(" ")) merged[merged.length - 1] = `${prev} ${w}`;
          else merged.push(w);
        }
        return (
          <React.Fragment key={li}>
            {li > 0 && <br />}
            {merged.map((w, wi) => {
              const segs = w.split("|");
              return (
                <React.Fragment key={wi}>
                  {wi > 0 && " "}
                  {segs.map((sg, si) => {
                    const nowrap = segs.length > 1 || sg.replace(/\*\*/g, "").length <= MAX;
                    const node = bold(sg, `${li}-${wi}-${si}`);
                    return (
                      <React.Fragment key={si}>
                        {si > 0 && <wbr />}
                        {nowrap ? <span style={{ whiteSpace: "nowrap" }}>{node}</span> : node}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </React.Fragment>
        );
      })}
    </>
  );
}
