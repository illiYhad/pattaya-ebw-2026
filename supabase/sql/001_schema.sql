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
create or replace function public.ebw_enforce_max_two_entries() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.entries where competitor_id = new.competitor_id and id <> new.id) >= 2 then
    raise exception 'ผู้แข่งลงได้ไม่เกิน 2 ประเภท';
  end if;
  return new;
end $$;
drop trigger if exists entries_max_two on public.entries;
create trigger entries_max_two before insert or update of competitor_id on public.entries
  for each row execute function public.ebw_enforce_max_two_entries();

-- ---------- รูป / สปอนเซอร์ / ตั้งค่างาน ----------
create table if not exists public.ebw_photos (
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
