-- 002_rls.sql · K-P4 · RLS ตามบทบาท · รันซ้ำได้ · รันหลัง 001
-- สิทธิ์ตรงกับ requireRole ในโค้ด: admin = ทุกอย่าง · result_staff = กรอก/ล้างคะแนน + เช็กอิน + รูป · stream_operator = อ่านข้อมูลสาธารณะเท่านั้น
-- คะแนนรายกรรมการ / audit / ผลที่ยังไม่ประกาศ: คนไม่ล็อกอินอ่านไม่ได้ (ผลที่ประกาศแล้วอ่านผ่านฟังก์ชัน public_published_results เท่านั้น)

create or replace function public.current_staff_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.staff_profiles where id = auth.uid()
$$;
revoke all on function public.current_staff_role() from public;
grant execute on function public.current_staff_role() to anon, authenticated;

alter table public.staff_profiles enable row level security;
alter table public.categories enable row level security;
alter table public.competitors enable row level security;
alter table public.entries enable row level security;
alter table public.photos enable row level security;
alter table public.sponsors enable row level security;
alter table public.event_config enable row level security;
alter table public.score_sheets enable row level security;
alter table public.result_states enable row level security;
alter table public.score_audit enable row level security;

-- ===== staff_profiles: อ่านของตัวเอง / แอดมินอ่านทั้งหมด · ไม่มีใครเขียนผ่านเว็บ (พี่หยัดเพิ่มด้วย SQL ใน 006)
drop policy if exists staff_read on public.staff_profiles;
create policy staff_read on public.staff_profiles for select to authenticated
  using (id = auth.uid() or public.current_staff_role() = 'admin');

-- ===== อ่านสาธารณะ (หน้าเว็บ)
drop policy if exists public_read on public.categories;
create policy public_read on public.categories for select using (true);
drop policy if exists public_read on public.competitors;
create policy public_read on public.competitors for select using (true);
drop policy if exists public_read on public.entries;
create policy public_read on public.entries for select using (true);
drop policy if exists public_read on public.sponsors;
create policy public_read on public.sponsors for select using (true);
drop policy if exists public_read on public.event_config;
create policy public_read on public.event_config for select using (true);

-- ===== แอดมินจัดการข้อมูลหลัก
drop policy if exists admin_write on public.categories;
create policy admin_write on public.categories for all to authenticated
  using (public.current_staff_role() = 'admin') with check (public.current_staff_role() = 'admin');
drop policy if exists admin_write on public.competitors;
create policy admin_write on public.competitors for all to authenticated
  using (public.current_staff_role() = 'admin') with check (public.current_staff_role() = 'admin');
drop policy if exists admin_write on public.sponsors;
create policy admin_write on public.sponsors for all to authenticated
  using (public.current_staff_role() = 'admin') with check (public.current_staff_role() = 'admin');
drop policy if exists admin_write on public.event_config;
create policy admin_write on public.event_config for all to authenticated
  using (public.current_staff_role() = 'admin') with check (public.current_staff_role() = 'admin');

-- ===== entries: แอดมินเพิ่ม/ลบ/แก้ · result_staff แก้ได้เฉพาะ "เช็กอิน" (ตัวกันอยู่ที่ trigger ด้านล่าง)
drop policy if exists admin_write on public.entries;
create policy admin_write on public.entries for all to authenticated
  using (public.current_staff_role() = 'admin') with check (public.current_staff_role() = 'admin');
drop policy if exists staff_checkin on public.entries;
create policy staff_checkin on public.entries for update to authenticated
  using (public.current_staff_role() = 'result_staff') with check (public.current_staff_role() = 'result_staff');

create or replace function public.guard_entries_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.current_staff_role() = 'result_staff'
     and (new.competitor_id is distinct from old.competitor_id or new.category_id is distinct from old.category_id) then
    raise exception 'ไม่มีสิทธิ์ — สตาฟกรอกผลแก้ได้เฉพาะเช็กอิน';
  end if;
  return new;
end $$;
drop trigger if exists entries_guard_update on public.entries;
create trigger entries_guard_update before update on public.entries
  for each row execute function public.guard_entries_update();

-- ===== รูป: คนทั่วไปเห็นเฉพาะรายที่ยินยอม · admin/result_staff เห็นและจัดการทั้งหมด
drop policy if exists public_read_consented on public.photos;
create policy public_read_consented on public.photos for select using (consent = true);
drop policy if exists staff_all on public.photos;
create policy staff_all on public.photos for all to authenticated
  using (public.current_staff_role() in ('admin', 'result_staff'))
  with check (public.current_staff_role() in ('admin', 'result_staff'));

-- ===== คะแนนรายกรรมการ: เฉพาะ admin + result_staff (อ่าน/กรอก/ล้าง)
drop policy if exists staff_all on public.score_sheets;
create policy staff_all on public.score_sheets for all to authenticated
  using (public.current_staff_role() in ('admin', 'result_staff'))
  with check (public.current_staff_role() in ('admin', 'result_staff'));

-- ===== สถานะผล: admin + result_staff อ่าน/เขียน แต่เปลี่ยน "ประกาศผล/วิธีคิด" ได้เฉพาะแอดมิน (trigger)
drop policy if exists staff_all on public.result_states;
create policy staff_all on public.result_states for all to authenticated
  using (public.current_staff_role() in ('admin', 'result_staff'))
  with check (public.current_staff_role() in ('admin', 'result_staff'));

create or replace function public.guard_result_states() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.current_staff_role() is distinct from 'admin' then
    if tg_op = 'INSERT' and (new.published or new.method <> 'mean') then
      raise exception 'ไม่มีสิทธิ์ — เฉพาะแอดมินประกาศผล/เปลี่ยนวิธีคิดคะแนน';
    end if;
    if tg_op = 'UPDATE' and (new.published is distinct from old.published or new.method is distinct from old.method
       or new.published_at is distinct from old.published_at or new.published_by is distinct from old.published_by) then
      raise exception 'ไม่มีสิทธิ์ — เฉพาะแอดมินประกาศผล/เปลี่ยนวิธีคิดคะแนน';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists result_states_guard on public.result_states;
create trigger result_states_guard before insert or update on public.result_states
  for each row execute function public.guard_result_states();

-- ===== audit: เขียนต่อท้ายได้ (admin + result_staff) · แอดมินอ่านได้ · ไม่มี update/delete
drop policy if exists staff_insert on public.score_audit;
create policy staff_insert on public.score_audit for insert to authenticated
  with check (public.current_staff_role() in ('admin', 'result_staff'));
drop policy if exists admin_read on public.score_audit;
create policy admin_read on public.score_audit for select to authenticated
  using (public.current_staff_role() = 'admin');

-- ===== ผลที่ "ประกาศแล้ว" สำหรับหน้าสาธารณะ/โอเวอร์เลย์: คืนเฉพาะประเภทที่ published เท่านั้น (ยังไม่ประกาศ = null · ไม่มีตัวเลขหลุด)
create or replace function public.public_published_results(p_category text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'state', to_jsonb(rs.*),
    'sheets', coalesce((select jsonb_agg(to_jsonb(s.*)) from public.score_sheets s where s.category_id = rs.category_id), '[]'::jsonb)
  )
  from public.result_states rs
  where rs.category_id = p_category and rs.published = true
$$;
revoke all on function public.public_published_results(text) from public;
grant execute on function public.public_published_results(text) to anon, authenticated;
