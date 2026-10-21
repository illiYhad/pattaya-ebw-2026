import Image from "next/image";
import { EVENT } from "@/lib/event";
import { BRAND, EventMark, Seal } from "@/components/brand/Brand";

/** ท้ายเว็บทุกหน้า: นก 32 · ตรา 48 + จัดโดย · ระบบโดย */
export function SiteFooter() {
  return (
    <footer className="mt-8 bg-bg px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-4 text-xs text-muted">
        <EventMark variant="white" size={32} />
        <div className="flex items-center gap-2">
          <Seal size={48} />
          <span>จัดโดย {BRAND.organizer}</span>
        </div>
        <a
          href="https://balehmstudio.com"
          target="_blank"
          rel="noopener"
          className="flex w-full items-center justify-center gap-1.5 text-[11px] sm:w-auto"
        >
          <span>ระบบโดย {EVENT.provider}</span>
          <Image src="/brand/bts-badge.png" alt="Balehm Tech Studio" width={28} height={28} />
        </a>
      </div>
    </footer>
  );
}
