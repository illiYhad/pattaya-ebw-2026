"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type AdminTab = { href: string; label: string };

// ส่วนแสดงผล (client) — รายการแท็บมาจาก AdminNav (server) ที่กรองตามบทบาทแล้ว · ห้าม import lib/auth ที่นี่
export function AdminNavClient({ tabs }: { tabs: AdminTab[] }) {
  const path = usePathname();
  return (
    <nav className="no-print mb-4 flex flex-wrap gap-2 border-b border-white/10 pb-2 text-sm">
      {tabs.map((t) => {
        const active = t.href === "/admin" ? path === "/admin" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={`rounded px-3 py-1 ${active ? "bg-accent text-black" : "bg-surface text-muted hover:text-text"}`}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
