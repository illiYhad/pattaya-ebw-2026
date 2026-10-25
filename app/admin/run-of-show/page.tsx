import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { getStaff, mockBlocked, BLOCKED_MESSAGE } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { rolesForPath } from "@/lib/roles";
import {
  RUNOFSHOW_CATEGORIES,
  RUNOFSHOW_CUES,
  RUNOFSHOW_GENERAL_FLAGS,
  RUNOFSHOW_HEADER,
  RUNOFSHOW_RED_NOTE,
  SECTION_LABEL,
  groupBySection,
  showField,
  type Cue,
} from "@/lib/data/runofshow";

export const dynamic = "force-dynamic";

const PATH = "/admin/run-of-show";
// ช่องคอลัมน์ร่วมกันของหัวตารางและแถว (เดสก์ท็อป) · มือถือเรียงเป็นการ์ดต่อคิว
const COLS = "md:grid md:grid-cols-[3rem_8rem_4.5rem_minmax(0,1fr)_minmax(0,1fr)] md:items-start md:gap-3";

// K-P3a: Run-of-Show + สคริปต์พิธีกรสำหรับสตาฟหน้างาน · อ่านอย่างเดียว · admin / result_staff / stream_operator เท่านั้น (ตาราง PATH_ROLES · proxy.ts กั้นอีกชั้น)
export default async function RunOfShowPage() {
  if (mockBlocked) return <p className="text-live">{BLOCKED_MESSAGE}</p>;
  if (hasSupabaseEnv) {
    const staff = await getStaff();
    if (!staff) redirect(`/login?next=${PATH}`);
    if (!rolesForPath(PATH)?.includes(staff.role)) redirect(`/login?denied=${PATH}`);
  }
  const groups = groupBySection();
  return (
    <div className="space-y-4">
      <AdminNav />
      <header className="space-y-1">
        <h1 className="text-xl font-bold">คิวงาน + สคริปต์พิธีกร</h1>
        <p className="font-bold text-accent-2">{RUNOFSHOW_HEADER.title}</p>
        <p className="text-sm text-muted">
          จัดโดย {RUNOFSHOW_HEADER.organizer} · {RUNOFSHOW_HEADER.eventDate} · {RUNOFSHOW_HEADER.timing}
        </p>
        <p className="text-sm text-muted">
          {RUNOFSHOW_HEADER.place} · {RUNOFSHOW_HEADER.registration}
        </p>
      </header>

      <p className="rounded-lg bg-surface p-3 text-sm text-live">{RUNOFSHOW_RED_NOTE} (หมายเหตุสีแดงของผู้จัด)</p>

      <section className="grid gap-3 sm:grid-cols-2">
        <CategoryList title="ประเภทแข่งภาคเช้า" items={RUNOFSHOW_CATEGORIES.morning} />
        <CategoryList title="ประเภทแข่งภาคบ่าย" items={RUNOFSHOW_CATEGORIES.afternoon} />
      </section>

      <section className="rounded-lg bg-surface p-3 text-sm">
        <h2 className="mb-1 font-bold">⚠️ รอผู้จัดยืนยัน (ระดับงาน)</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted">
          {RUNOFSHOW_GENERAL_FLAGS.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </section>

      <div className={`hidden rounded bg-surface-2 px-3 py-2 text-xs font-bold text-muted ${COLS}`}>
        <span>คิว</span>
        <span>เวลา</span>
        <span>นาที</span>
        <span>รายการ</span>
        <span>REMARK</span>
      </div>

      {groups.map((g) => (
        <section key={`${g.section}-${g.cues[0].cue}`} className="space-y-2">
          <h2 className="border-b border-white/10 pb-1 text-sm font-bold text-accent">{SECTION_LABEL[g.section]}</h2>
          {g.cues.map((c) => (
            <CueRow key={c.cue} c={c} />
          ))}
        </section>
      ))}
      <p className="text-xs text-muted">ถอดจากเอกสารของผู้จัด (PMAT) ตามต้นฉบับ ยังไม่ใช่ฉบับยืนยัน · {RUNOFSHOW_CUES.length} คิว</p>
    </div>
  );
}

function CategoryList({ title, items }: { title: string; items: readonly { name: string; min: number }[] }) {
  return (
    <div className="rounded-lg bg-surface p-3 text-sm">
      <h2 className="mb-1 font-bold">{title}</h2>
      <ol className="list-decimal space-y-0.5 pl-5">
        {items.map((i) => (
          <li key={i.name}>
            {i.name} ({i.min} นาที)
          </li>
        ))}
      </ol>
    </div>
  );
}

function CueRow({ c }: { c: Cue }) {
  const pending = (v: unknown) => v === null;
  return (
    <details className="group rounded-lg bg-surface">
      <summary className={`cursor-pointer list-none space-y-1 p-3 ${COLS}`}>
        <span className="flex items-center gap-2 md:block">
          <span className="rounded bg-accent px-2 py-0.5 text-xs font-bold text-black md:inline-block">คิว {c.cue}</span>
        </span>
        <span className={`block text-sm ${pending(c.time) ? "text-live" : ""}`}>{showField(c.time)}</span>
        <span className={`block text-sm ${pending(c.min) ? "text-live" : "text-muted"}`}>
          {showField(c.min, c.min === null || c.min === "" ? "" : " นาที")}
        </span>
        <span className="block whitespace-pre-line break-words font-medium">{c.description}</span>
        <span className={`block whitespace-pre-line break-words text-sm ${pending(c.remark) ? "text-live" : "text-muted"}`}>
          {showField(c.remark)}
        </span>
        {c.flags && c.flags.length > 0 && (
          <span className="flex flex-wrap gap-1 md:col-span-5">
            {c.flags.map((f) => (
              <span key={f} className="rounded bg-surface-2 px-2 py-0.5 text-xs text-accent-2">
                ⚠️ {f}
              </span>
            ))}
          </span>
        )}
        <span className="block text-xs text-muted md:col-span-5">
          {c.script ? "แตะเพื่อเปิด/ปิดสคริปต์พิธีกร" : "ไม่มีสคริปต์พิธีกร"}
        </span>
      </summary>
      {c.script && (
        <div className="space-y-2 border-t border-white/10 p-3 text-sm leading-relaxed">
          {c.script.map((line, i) => (
            <p key={i} className="whitespace-pre-wrap break-words">
              {line}
            </p>
          ))}
        </div>
      )}
    </details>
  );
}
