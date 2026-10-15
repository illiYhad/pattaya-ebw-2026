"use client";
import { useEffect, useRef, useState } from "react";

/** ปุ่มคัดลอกข้อความ (เลขบัญชี) · ป้ายเปลี่ยนเป็น "คัดลอกแล้ว" 1.6 วิ · ประกาศผ่าน aria-live */
export function CopyButton({ value, className }: { value: string; className?: string }) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setDone(false), 1600);
    } catch {
      // เบราว์เซอร์ไม่ให้สิทธิ์คลิปบอร์ด — ผู้ใช้ยังคัดลอกเลขที่แสดงเองได้
    }
  }

  return (
    <button type="button" className={className} onClick={copy} data-copy={value}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15V5a2 2 0 0 1 2-2h10" />
      </svg>
      <span aria-live="polite">{done ? "คัดลอกแล้ว" : "คัดลอก"}</span>
    </button>
  );
}
