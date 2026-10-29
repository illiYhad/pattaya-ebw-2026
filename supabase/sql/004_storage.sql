-- 004_storage.sql · K-P4 · bucket รูปผู้แข่ง (private) · รันซ้ำได้ · รันหลัง 002 (ใช้ฟังก์ชัน ebw_current_staff_role)
-- ไฟล์อยู่ที่ <photo id>/original และ <photo id>/cutout · คนทั่วไปเข้าผ่านเซิร์ฟเวอร์ (service role เซ็น URL หลังตรวจ consent) · สตาฟอ่าน/เขียนตามนโยบายด้านล่าง
insert into storage.buckets (id, name, public)
values ('athlete-photos', 'athlete-photos', false)
on conflict (id) do update set public = false;

drop policy if exists "ebw athlete photos staff read" on storage.objects;
create policy "ebw athlete photos staff read" on storage.objects for select to authenticated
  using (bucket_id = 'athlete-photos' and public.ebw_current_staff_role() in ('admin', 'result_staff'));
drop policy if exists "ebw athlete photos staff insert" on storage.objects;
create policy "ebw athlete photos staff insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'athlete-photos' and public.ebw_current_staff_role() in ('admin', 'result_staff'));
drop policy if exists "ebw athlete photos staff update" on storage.objects;
create policy "ebw athlete photos staff update" on storage.objects for update to authenticated
  using (bucket_id = 'athlete-photos' and public.ebw_current_staff_role() in ('admin', 'result_staff'))
  with check (bucket_id = 'athlete-photos' and public.ebw_current_staff_role() in ('admin', 'result_staff'));
drop policy if exists "ebw athlete photos staff delete" on storage.objects;
create policy "ebw athlete photos staff delete" on storage.objects for delete to authenticated
  using (bucket_id = 'athlete-photos' and public.ebw_current_staff_role() in ('admin', 'result_staff'));
