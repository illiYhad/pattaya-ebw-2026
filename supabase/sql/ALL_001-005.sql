-- ALL_001-005.sql · K-P4 · รวม 001–005 เรียงลำดับ · รันซ้ำได้ · วางไฟล์นี้ไฟล์เดียวใน SQL Editor ได้เลย (ไม่รวม 006 เพราะต้องเติมอีเมลก่อน)

-- ======================= 001_schema.sql =======================
-- 001_schema.sql · K-P4 · EBW 2026 (พัทยา) · รันซ้ำได้ (if not exists) · ⛔ โคลท์เขียนให้เท่านั้น ไม่ได้รัน — พี่หยัดวางใน SQL Editor
-- ลำดับรัน: 001 → 002 → 003 → 004 → 005 (หรือรัน ALL_001-005.sql ไฟล์เดียว) → ใส่อีเมลสตาฟใน 006 แล้วรัน
-- id ของตารางหลักเป็น text (โค้ดสร้าง id เอง เช่น c-xxxx / e-xxxx) · เวลาเป็น timestamptz

-- ---------- บทบาท ----------
create table if not exists public.staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'result_staff', 'stream_operator')),
  created_at timestamptz not null default now()
);

-- ---------- ประเภทแข่ง ----------
create table if not exists public.categories (
  id text primary key,
  code text not null unique,
  name text not null,
  name_en text not null default '',
  session text not null check (session in ('morning', 'afternoon', 'submit')),
  start_time text,
  end_time text,
  duration_min integer check (duration_min is null or duration_min > 0),
  medium text check (medium is null or medium in ('live_model', 'mannequin', 'skin_sheet')),
  criteria jsonb not null default '[]'::jsonb,
  judge_count integer not null default 3 check (judge_count between 1 and 9),
  pending_notes jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------- ผู้แข่ง / รายการที่ลง ----------
create table if not exists public.competitors (
  id text primary key,
  code text not null unique,
  name_th text not null,
  name_en text not null default '',
  shop text,
  person_key text not null unique,
  updated_at timestamptz not null default now()
);

create table if not exists public.entries (
  id text primary key,
  competitor_id text not null references public.competitors(id) on delete cascade,
  category_id text not null references public.categories(id) on delete restrict,
  is_checked_in boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (competitor_id, category_id)
);
create index if not exists entries_category_idx on public.entries (category_id);

-- คนละไม่เกิน 2 ประเภท (บังคับที่ DB)
create or replace function public.enforce_max_two_entries() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.entries where competitor_id = new.competitor_id and id <> new.id) >= 2 then
    raise exception 'ผู้แข่งลงได้ไม่เกิน 2 ประเภท';
  end if;
  return new;
end $$;
drop trigger if exists entries_max_two on public.entries;
create trigger entries_max_two before insert or update of competitor_id on public.entries
  for each row execute function public.enforce_max_two_entries();

-- ---------- รูป / สปอนเซอร์ / ตั้งค่างาน ----------
create table if not exists public.photos (
  id text primary key,
  person_key text not null,
  original_url text not null,
  cutout_url text not null,
  consent boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.sponsors (
  id text primary key,
  name text not null,
  level text not null check (level in ('main', 'co', 'support')),
  position text not null check (position in ('bottom_ticker', 'corner', 'stinger', 'full_screen')),
  sequence integer not null default 0,
  logo_url text not null default '',
  is_active boolean not null default true
);

-- แถวเดียว (id = 1)
create table if not exists public.event_config (
  id integer primary key default 1 check (id = 1),
  days jsonb not null default '[]'::jsonb,
  announcement text not null default '',
  logo_url text,
  theme jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- คะแนนกรรมการ ----------
create table if not exists public.score_sheets (
  id text primary key,
  entry_id text not null references public.entries(id) on delete restrict,
  category_id text not null references public.categories(id) on delete restrict,
  judge_no integer not null check (judge_no >= 1),
  criteria_scores jsonb,
  total numeric not null check (total >= 0),
  updated_at timestamptz not null default now(),
  updated_by text,
  unique (entry_id, judge_no)
);
create index if not exists score_sheets_category_idx on public.score_sheets (category_id);

create table if not exists public.result_states (
  category_id text primary key references public.categories(id) on delete cascade,
  method text not null default 'mean' check (method in ('mean', 'trimmed_mean')),
  published boolean not null default false,
  published_at timestamptz,
  published_by text,
  tie_decisions jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- เขียนต่อท้ายอย่างเดียว (ไม่มี policy update/delete) · ไม่ผูก FK กับ entry เพื่อให้ประวัติอยู่ต่อแม้รายการถูกลบ
create table if not exists public.score_audit (
  id text primary key,
  at timestamptz not null default now(),
  actor text,
  category_id text not null,
  entry_id text,
  judge_no integer,
  action text not null check (action in ('save', 'clear', 'method', 'tie_decision', 'tie_reset', 'publish', 'hide')),
  before text,
  after text
);
create index if not exists score_audit_category_idx on public.score_audit (category_id, at);

-- ======================= 002_rls.sql =======================
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

-- กันที่ DB (ไม่พึ่งแค่โค้ดแอป): ประเภทที่ประกาศผลแล้วห้ามเพิ่ม/แก้/ล้างใบคะแนน · updated_by ใช้อีเมลจาก JWT เสมอ (ไม่เชื่อค่าที่ client ส่ง)
create or replace function public.guard_score_sheets() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- ใบคะแนนย้ายประเภท/ย้ายรายการไม่ได้ (กันเลี่ยงตัวเช็กด้านล่างด้วยการย้ายใบไปประเภทอื่น)
  if tg_op = 'UPDATE' and (new.category_id is distinct from old.category_id or new.entry_id is distinct from old.entry_id) then
    raise exception 'ย้ายใบคะแนนไปประเภท/รายการอื่นไม่ได้';
  end if;
  -- เช็กทั้งประเภทเดิมและประเภทใหม่ (INSERT ไม่มี old · DELETE ไม่มี new)
  if exists (
    select 1 from public.result_states
    where published and category_id in (
      case when tg_op = 'INSERT' then null else old.category_id end,
      case when tg_op = 'DELETE' then null else new.category_id end)
  ) then
    raise exception 'ประกาศผลแล้ว ต้องกดซ่อนผลก่อนแก้คะแนน';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  new.updated_by := coalesce(auth.jwt() ->> 'email', new.updated_by);
  return new;
end $$;
drop trigger if exists score_sheets_guard on public.score_sheets;
create trigger score_sheets_guard before insert or update or delete on public.score_sheets
  for each row execute function public.guard_score_sheets();

-- ===== สถานะผล: อ่าน/เพิ่ม/แก้ได้ทั้ง admin + result_staff (Engine สร้างแถว/ล้างคำตัดสินเสมอเมื่อคะแนนเปลี่ยน) · ลบได้เฉพาะแอดมิน
-- แต่ result_staff เปลี่ยน ประกาศผล / วิธีคิด / คำตัดสินคะแนนเท่ากัน ไม่ได้ (trigger) — ล้างคำตัดสินให้ว่างได้อย่างเดียว
drop policy if exists staff_all on public.result_states;
drop policy if exists staff_read on public.result_states;
create policy staff_read on public.result_states for select to authenticated
  using (public.current_staff_role() in ('admin', 'result_staff'));
drop policy if exists staff_insert on public.result_states;
create policy staff_insert on public.result_states for insert to authenticated
  with check (public.current_staff_role() in ('admin', 'result_staff'));
drop policy if exists staff_update on public.result_states;
create policy staff_update on public.result_states for update to authenticated
  using (public.current_staff_role() in ('admin', 'result_staff'))
  with check (public.current_staff_role() in ('admin', 'result_staff'));
drop policy if exists admin_delete on public.result_states;
create policy admin_delete on public.result_states for delete to authenticated
  using (public.current_staff_role() = 'admin');

create or replace function public.guard_result_states() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.current_staff_role() is distinct from 'admin' then
    if tg_op = 'INSERT' and (new.published or new.method <> 'mean' or new.tie_decisions <> '[]'::jsonb) then
      raise exception 'ไม่มีสิทธิ์ — เฉพาะแอดมินประกาศผล/เปลี่ยนวิธีคิดคะแนน';
    end if;
    if tg_op = 'UPDATE' and (new.category_id is distinct from old.category_id or new.published is distinct from old.published or new.method is distinct from old.method
       or new.published_at is distinct from old.published_at or new.published_by is distinct from old.published_by
       or (new.tie_decisions is distinct from old.tie_decisions and new.tie_decisions <> '[]'::jsonb)) then
      raise exception 'ไม่มีสิทธิ์ — เฉพาะแอดมินประกาศผล/เปลี่ยนวิธีคิดคะแนน/ตัดสินคะแนนเท่ากัน';
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
create or replace function public.guard_score_audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.actor := coalesce(auth.jwt() ->> 'email', new.actor);
  return new;
end $$;
drop trigger if exists score_audit_actor on public.score_audit;
create trigger score_audit_actor before insert on public.score_audit
  for each row execute function public.guard_score_audit();
drop policy if exists admin_read on public.score_audit;
create policy admin_read on public.score_audit for select to authenticated
  using (public.current_staff_role() = 'admin');

-- ===== ผลที่ "ประกาศแล้ว" สำหรับหน้าสาธารณะ/โอเวอร์เลย์: คืนเฉพาะประเภทที่ published เท่านั้น (ยังไม่ประกาศ = null · ไม่มีตัวเลขหลุด)
create or replace function public.public_published_results(p_category text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'state', jsonb_build_object('category_id', rs.category_id, 'method', rs.method, 'published', rs.published,
                                'published_at', rs.published_at, 'tie_decisions', rs.tie_decisions),
    'sheets', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'entry_id', s.entry_id, 'category_id', s.category_id, 'judge_no', s.judge_no,
                                          'criteria_scores', s.criteria_scores, 'total', s.total, 'updated_at', s.updated_at))
      from public.score_sheets s where s.category_id = rs.category_id), '[]'::jsonb)
  )
  from public.result_states rs
  where rs.category_id = p_category and rs.published = true
$$;
revoke all on function public.public_published_results(text) from public;
grant execute on function public.public_published_results(text) to anon, authenticated;

-- ======================= 003_realtime.sql =======================
-- 003_realtime.sql · K-P4 · เพิ่มตารางที่หน้าจอผล/โอเวอร์เลย์ฟัง (lib/data/live.ts: entries · competitors · sponsors) เข้า supabase_realtime · รันซ้ำได้
do $$
declare t text;
begin
  foreach t in array array['entries', 'competitors', 'sponsors'] loop
    if not exists (
      select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ======================= 004_storage.sql =======================
-- 004_storage.sql · K-P4 · bucket รูปผู้แข่ง (private) · รันซ้ำได้ · รันหลัง 002 (ใช้ฟังก์ชัน current_staff_role)
-- ไฟล์อยู่ที่ <photo id>/original และ <photo id>/cutout · คนทั่วไปเข้าผ่านเซิร์ฟเวอร์ (service role เซ็น URL หลังตรวจ consent) · สตาฟอ่าน/เขียนตามนโยบายด้านล่าง
insert into storage.buckets (id, name, public)
values ('athlete-photos', 'athlete-photos', false)
on conflict (id) do update set public = false;

drop policy if exists "athlete photos staff read" on storage.objects;
create policy "athlete photos staff read" on storage.objects for select to authenticated
  using (bucket_id = 'athlete-photos' and public.current_staff_role() in ('admin', 'result_staff'));
drop policy if exists "athlete photos staff insert" on storage.objects;
create policy "athlete photos staff insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'athlete-photos' and public.current_staff_role() in ('admin', 'result_staff'));
drop policy if exists "athlete photos staff update" on storage.objects;
create policy "athlete photos staff update" on storage.objects for update to authenticated
  using (bucket_id = 'athlete-photos' and public.current_staff_role() in ('admin', 'result_staff'))
  with check (bucket_id = 'athlete-photos' and public.current_staff_role() in ('admin', 'result_staff'));
drop policy if exists "athlete photos staff delete" on storage.objects;
create policy "athlete photos staff delete" on storage.objects for delete to authenticated
  using (bucket_id = 'athlete-photos' and public.current_staff_role() in ('admin', 'result_staff'));

-- ======================= 005_seed.sql =======================
-- 005_seed.sql · K-P4 · 7 ประเภทตั้งต้น + ตั้งค่างานตั้งต้น (สร้างจาก lib/data/defaults.ts) · รันซ้ำได้: มีแล้วไม่เขียนทับ (on conflict do nothing)
-- ไม่มีชื่อ/รูปคนจริง · ไม่มีผู้แข่งตัวอย่าง — ข้อมูลจริงนำเข้าผ่านหน้าแอดมิน "นำเข้ารายชื่อ"
insert into public.categories (id, code, name, name_en, session, start_time, end_time, duration_min, medium, criteria, judge_count, pending_notes, sort_order) values
  ('cat-hairstroke', 'hairstroke', 'PMU สักคิ้วแฮร์สโตรก', 'PMU Hairstroke Eyebrow', 'morning', '10.00', '11.30', 90, null, '[]'::jsonb, 3, '[]'::jsonb, 1),
  ('cat-lip', 'lip', 'สักปากฝังสี บนแผ่นหนังนูน', 'Lip Blush (3D Skin Sheet)', 'morning', '10.00', '11.30', 90, 'skin_sheet', '[{"name":"ความสมดุลของการออกแบบรูปทรงปาก"},{"name":"โครงสร้างและการออกแบบรูปปากต้องเข้ากัน"},{"name":"ค่าน้ำหนักและความบอบช้ำของชั้นงาน"},{"name":"การสร้างมิติเลเยอร์ปาก"},{"name":"ความสะอาดของชั้นงาน"}]'::jsonb, 3, '[]'::jsonb, 2),
  ('cat-lash', 'lash', 'ต่อขนตาหัวหุ่น (เส้นต่อเส้น)', 'Classic Eyelash Extension (Mannequin)', 'morning', '10.00', '11.30', 90, 'mannequin', '[]'::jsonb, 3, '["เงื่อนไขแชมป์เก่าลงสมัครได้: โปสเตอร์ต่อขนตาเขียน 2 ปี ประเภทอื่น 1 ปี (ยังไม่ได้ปรับให้ตรงกัน)"]'::jsonb, 3),
  ('cat-facial', 'facial', 'นวดหน้าคนจริง', 'Facial Massage (Live Model)', 'morning', '10.00', '11.00', 60, 'live_model', '[{"name":"สุขลักษณะ","max":10},{"name":"การดูแลสื่อสาร","max":10},{"name":"ความต่อเนื่อง","max":10},{"name":"ความถูกต้องและปลอดภัย","max":20},{"name":"สรีระ","max":10},{"name":"ปฏิกิริยาผู้รับ","max":10},{"name":"บริหารเวลา","max":10},{"name":"เทคนิคพิเศษ","max":10},{"name":"ระยะเวลา","max":10}]'::jsonb, 3, '[]'::jsonb, 4),
  ('cat-shading', 'shading', 'PMU สักคิ้วสไลด์เฉดดิ้ง', 'PMU Shading Eyebrow', 'afternoon', '13.30', '14.30', 60, null, '[{"name":"ความสมดุลของทรงคิ้วทั้ง 2 ข้าง"},{"name":"การไล่เฉดสีที่เนียนเป็นธรรมชาติเท่ากันทั้ง 2 ข้าง"},{"name":"ความเป็นไปได้จริง ค่าน้ำหนักและความบอบช้ำของชั้นงาน"},{"name":"การสร้างมิติและเลเยอร์ที่เท่ากันของคิ้วทั้ง 2 ข้าง"}]'::jsonb, 3, '["เวลาแข่งตั้ง 60 นาทีตามตารางเวลา (กติกาในโปสเตอร์เขียน 90 นาที)"]'::jsonb, 5),
  ('cat-thai-massage', 'thai_massage', 'นวดไทยฟรีสไตล์ คนจริง', 'Thai Freestyle Massage (Live Model)', 'afternoon', '13.30', '14.30', 60, 'live_model', '[{"name":"บุคลิกภาพและมารยาท","max":10},{"name":"เตรียมสถานที่","max":10},{"name":"ต้อนรับ ซักประวัติ ความปลอดภัย","max":10},{"name":"เทคนิคการนวด","max":40},{"name":"แนะนำหลังนวด","max":10},{"name":"ลำดับขั้นตอน","max":10},{"name":"รักษาเวลา","max":10}]'::jsonb, 3, '[]'::jsonb, 6),
  ('cat-inbox', 'inbox', 'สักคิ้วลายเส้น บนแผ่นหนังหนู (IN BOX)', 'Hairstroke Eyebrow on Skin Sheet (IN BOX · pre-submitted)', 'submit', null, null, null, 'skin_sheet', '[{"name":"ความสมดุลของทรงคิ้วทั้ง 2 ข้าง"},{"name":"ลวดลายของคิ้วทั้ง 2 ข้าง"},{"name":"ความสะอาด ค่าน้ำหนักและความบอบช้ำของชั้นงาน"},{"name":"การสร้างมิติเท่ากันของทั้ง 2 ข้าง"}]'::jsonb, 3, '["ยังไม่กำหนดวันส่งผลงาน (วันที่ในโปสเตอร์เป็นข้อความเก่า) — ใช้ข้อความ \"ส่งผลงานล่วงหน้าก่อนวันแข่ง\""]'::jsonb, 7)
on conflict (id) do nothing;

insert into public.event_config (id, days, announcement) values (1, '["2026-10-30"]'::jsonb, '')
on conflict (id) do nothing;
