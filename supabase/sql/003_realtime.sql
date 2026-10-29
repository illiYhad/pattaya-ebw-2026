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
