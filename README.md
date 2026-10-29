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

## ขึ้นระบบจริง (K-P4 · ต่อฐานข้อมูล Supabase)

1. สร้างโปรเจกต์ Supabase → SQL Editor → วาง `supabase/sql/ALL_001-005.sql` แล้วกด Run (รันซ้ำได้ ไม่พัง) — หรือรัน 001 → 005 ทีละไฟล์
2. Authentication → Users → Add user (ติ๊ก Auto Confirm) ให้สตาฟแต่ละคน → แก้อีเมลใน `006_staff_profiles_DRAFT.sql` ให้ตรง → Run
3. Vercel → Environment Variables ใส่ `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY` · `CHANNEL_KEY` (ชื่ออยู่ใน `.env.example`) → Redeploy
4. ไม่มี env = กลับเป็น mock เหมือนเดิม (`lib/data/index.ts` เลือกให้เอง) · เทสต์: `npm run test:datasource`

โค้ดแหล่งข้อมูลจริง: `lib/data/supabase.ts` (กติกาทั้งหมดใช้ Engine ตัวเดียวกับ mock · เขียนกลับเฉพาะแถวที่เปลี่ยน · ใช้ session ผู้ใช้ + RLS)

## แบรนด์

โลโก้สมาคม PMAT อยู่ที่ `public/brand/pmat-logo.png` (ตั้งค่าที่ `BRAND.sealSrc` ใน `components/brand/Brand.tsx` · ใช้ที่หัวเว็บ · favicon `app/icon.png` · overlay ไลฟ์) · ชื่องานเป็นตัวอักษร (`BRAND.logoSrc` ว่าง) · ถ้าได้โลโก้งานจริง วางที่ `public/brand/` แล้วตั้ง `BRAND.logoSrc`


## ตัวจับหัวตารางหน้านำเข้า (K-P1.1b)
`lib/data/import-parse.ts` นับแถวแรกเป็นหัวตารางเมื่อ **อย่างน้อย 2 ช่อง** ตรงชื่อหัวคอลัมน์ **ทั้งช่อง** (เช่น `ชื่อไทย` · `ประเภท 1` · `ร้าน`) ตัวอย่างที่ตรวจแล้ว:
1. มีหัวตาราง `ชื่อไทย⇥ชื่ออังกฤษ⇥ประเภท 1⇥ร้าน` → แถวแรกเป็นหัว ข้อมูลเริ่มแถว 2
2. ไม่มีหัวตาราง แถวแรก `ทดสอบ แอนดี้⇥thai_massage` → ไม่ใช่หัวตาราง แถวแรกถูกนับเป็นข้อมูล (ไม่เตือน "หัวตารางไม่มีคอลัมน์")
3. ไม่มีหัวตาราง คอลัมน์ร้าน `ร้านสวยใส` → ไม่ใช่หัวตาราง ข้อมูลแถวแรกไม่หาย คอลัมน์ไม่สลับ
