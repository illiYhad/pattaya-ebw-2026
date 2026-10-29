-- 006_staff_profiles_DRAFT.sql · K-P4 · ⚠ ร่างแม่แบบ — พี่หยัดเติมอีเมลเองก่อนรัน (โคลท์ไม่ใส่อีเมลจริง) · รันซ้ำได้
-- ขั้นก่อนรัน: สร้างผู้ใช้ใน Supabase Dashboard → Authentication (การยืนยันตัวตน) → Users (ผู้ใช้) → Add user (เพิ่มผู้ใช้) → ใส่อีเมล + รหัสผ่านเอง → ติ๊ก Auto Confirm User
-- แล้วค่อยแก้ <...> ด้านล่างให้เป็นอีเมลเดียวกันกับที่สร้าง และรันไฟล์นี้ (อีเมลที่ยังไม่มีผู้ใช้จะถูกข้ามเงียบ ๆ — ดูผลตรวจท้ายไฟล์)
-- ต้องรัน 001 และ 002 ก่อน

insert into public.staff_profiles (id, email, role)
select u.id, u.email, v.role
from (values
  ('<อีเมลแอดมิน 1>',       'admin'),
  ('<อีเมลกรอกผล 1>',       'result_staff'),
  ('<อีเมลกรอกผล 2>',       'result_staff'),
  ('<อีเมลคุมจอ 1>',        'stream_operator')
) as v(email, role)
join auth.users u on lower(u.email) = lower(v.email)
on conflict (id) do update set role = excluded.role, email = excluded.email;

-- ตรวจหลังรัน: ต้องเห็นครบทุกอีเมลที่ใส่ (ขาด = ยังไม่ได้สร้างผู้ใช้ใน Authentication หรือพิมพ์อีเมลไม่ตรง)
select email, role, created_at from public.staff_profiles order by role, email;
