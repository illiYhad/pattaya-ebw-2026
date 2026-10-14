# Eastern Beauty & Wellness Championship 2026 — web

Next.js (App Router) + TypeScript + Tailwind v4 · ฐานยกมาจากโปรเจกต์อีสปอร์ต KS3 เดิม (K-P0) แล้วปรับเป็นผู้แข่งรายบุคคล (K-P1)
ชั้นข้อมูลเป็น interface (`lib/data/source.ts`) · ตอนนี้ใช้ mock ในหน่วยความจำ (ห้ามต่อ Supabase ตามใบ K-P1)

## รัน

```sh
npm install
cp .env.example .env.local   # ใส่ CHANNEL_KEY (สตริงสุ่ม) ถึงจะเปิด /stream-hub และ /overlay ได้
npm run dev                  # http://localhost:3300
npm run build
```

พอร์ตใช้ **3300** (ห้ามใช้ 3000 · 3001 · 3100 · 3200 · 3201 · 3999 · 60)

## หน้า

`/` กำหนดการ + 7 ประเภท · `/athletes` + `/athletes/[id]` โปรไฟล์ผู้แข่ง · `/checkin` · `/admin` (ภาพรวม · ประเภท/เกณฑ์ · นำเข้ารายชื่อ · ถ่ายรูป · สปอนเซอร์ · ตั้งค่างาน) · `/stream-hub` ห้องคุม · `/overlay/[category]/[entryId]?k=CHANNEL_KEY` สำหรับ OBS

## โมเดลข้อมูล (mock)

`Category` (7 ประเภท · เกณฑ์ + คะแนนเต็มต่อข้อ · จำนวนกรรมการ · `pending_notes` = รอครูหนึ่ง) → `Competitor` (EBW-001 · ชื่อไทย/อังกฤษ · ร้าน · `person_key` ผูกรูป) → `Entry` (คน × ประเภท · เช็กอิน · คนละไม่เกิน 2)
ระบบให้คะแนน/จัดอันดับยังไม่มี (ใบ K-P2) — หน้าเว็บแสดง "รอผล"

## แบรนด์

ยังไม่มีไฟล์โลโก้ → `components/brand/Brand.tsx` แสดงตัวอักษร · เมื่อได้ไฟล์ วางที่ `public/brand/` แล้วตั้ง `BRAND.logoSrc` / `BRAND.sealSrc`
