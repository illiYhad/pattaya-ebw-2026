import Link from "next/link";
import { EVENT } from "@/lib/event";
import { Seal } from "@/components/brand/Brand";
import { mockBlocked } from "@/lib/auth";
import { UserBadge } from "@/components/auth/UserBadge";
import { Ribbons } from "./Ribbons";

/** หัวเว็บทุกหน้า (ยกเว้น overlay ที่ซ่อนด้วย CSS): พื้นเข้มขอบล่างโค้ง + แถบทอง/ชมพู · ชื่อ EBW 2026 · เมนู · ผู้ใช้ + ตราสมาคม */
export function SiteHeader({ logoSrc }: { logoSrc?: string }) {
  void logoSrc;
  return (
    <header className="site-header relative z-10 overflow-hidden bg-bg px-4 pt-3 text-ivory">
      <div className="relative mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2">
        <Link href="/" className="num text-[22px] font-bold tracking-[0.22em]" aria-label={EVENT.shortTitle}>EBW 2026</Link>
        <nav className="flex flex-wrap gap-x-1 gap-y-1 text-base">
          <Link href="/" className="px-3 py-2">หน้าแรก</Link>
          <Link href="/athletes" className="px-3 py-2">ผู้แข่งขัน</Link>
          {!mockBlocked && (
            <>
              <Link href="/checkin" className="px-3 py-2 text-muted">เช็กอิน</Link>
              <Link href="/admin" className="px-3 py-2 text-muted">แอดมิน</Link>
              <Link href="/stream-hub" className="px-3 py-2 text-muted">ห้องคุม</Link>
            </>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <UserBadge />
          <Seal size={36} />
        </div>
      </div>
      <Ribbons variant="header" className="-mx-4 mt-3 w-[calc(100%+2rem)]" />
    </header>
  );
}
