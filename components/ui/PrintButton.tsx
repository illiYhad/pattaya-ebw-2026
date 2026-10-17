"use client";

export function PrintButton({ label = "พิมพ์" }: { label?: string }) {
  return (
    <button className="no-print rounded bg-[#123F4B] px-4 py-2 text-sm font-bold text-white" onClick={() => window.print()}>
      🖨 {label}
    </button>
  );
}
