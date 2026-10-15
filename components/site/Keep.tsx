import React from "react";

/** กันข้อความขาดกลางวลี: ตัดบรรทัดได้เฉพาะระหว่างวลี (คั่นด้วยช่องว่าง) · วงเล็บทั้งก้อนห้ามแยก เช่น "(IN BOX)" */
export function Keep({ text }: { text: string }) {
  const parts = text.split(/(\([^)]*\))/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("(") ? <span key={i} className="whitespace-nowrap">{p}</span> : <React.Fragment key={i}>{p}</React.Fragment>,
      )}
    </>
  );
}

/** แต่ละวลี (แยกด้วยช่องว่าง) เป็นก้อนเดียว ไม่ขาดกลางคำ */
export function Phrases({ text }: { text: string }) {
  const words = text.split(" ").filter(Boolean);
  return (
    <>
      {words.map((w, i) => (
        <React.Fragment key={i}>
          <span className="whitespace-nowrap">{w}</span>
          {i < words.length - 1 ? " " : null}
        </React.Fragment>
      ))}
    </>
  );
}
