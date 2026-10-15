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
        <Link href="/" className="num order-1 text-[22px] font-bold tracking-[0.22em]" aria-label={EVENT.shortTitle}>EBW 2026</Link>
        <nav className="no-scrollbar order-3 -mx-4 flex w-[calc(100%+2rem)] flex-nowrap overflow-x-auto px-4 text-base whitespace-nowrap lg:order-2 lg:mx-0 lg:w-auto lg:px-0">
          <Link href="/" className="flex min-h-11 items-center px-3">หน้าแรก</Link>
          <Link href="/categories" className="flex min-h-11 items-center px-3">ประเภท/กติกา</Link>
          <Link href="/register" className="flex min-h-11 items-center px-3">สมัครแข่งขัน</Link>
          <Link href="/info" className="flex min-h-11 items-center px-3">ข้อมูลงาน</Link>
          <Link href="/athletes" className="flex min-h-11 items-center px-3">ผู้แข่งขัน</Link>
          {!mockBlocked && (
            <>
              <Link href="/checkin" className="flex min-h-11 items-center px-3 text-muted">เช็กอิน</Link>
              <Link href="/admin" className="flex min-h-11 items-center px-3 text-muted">แอดมิน</Link>
              <Link href="/stream-hub" className="flex min-h-11 items-center px-3 text-muted">ห้องคุม</Link>
            </>
          )}
        </nav>
        <div className="order-2 ml-auto flex items-center gap-3 lg:order-3">
          <UserBadge />
          <Seal size={36} />
        </div>
      </div>
      <Ribbons variant="header" className="-mx-4 mt-3 w-[calc(100%+2rem)]" />
    </header>
  );
}
