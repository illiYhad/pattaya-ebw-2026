import Link from "next/link";
import { EVENT } from "@/lib/event";
import { EventLogo, Seal } from "@/components/brand/Brand";
import { UserBadge } from "@/components/auth/UserBadge";

/** หัวเว็บทุกหน้า (ยกเว้น overlay ที่ซ่อนด้วย CSS): โลโก้งานซ้าย · เมนู · ผู้ใช้ + ตราสมาคมขวา */
export function SiteHeader({ logoSrc }: { logoSrc?: string }) {
  return (
    <header className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-white/10 bg-surface px-4 py-2">
      <Link href="/" className="flex items-center" aria-label={EVENT.shortTitle}>
        <span className="hidden sm:block"><EventLogo variant="white" width={170} src={logoSrc} priority /></span>
        <span className="sm:hidden"><EventLogo variant="white" width={130} src={logoSrc} priority /></span>
      </Link>
      <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <Link href="/athletes">ผู้แข่ง</Link>
        <Link href="/checkin">เช็กอิน</Link>
        <Link href="/admin">แอดมิน</Link>
        <Link href="/stream-hub">ห้องคุม</Link>
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <UserBadge />
        <Seal size={36} />
      </div>
    </header>
  );
}
