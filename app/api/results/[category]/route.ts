import { NextResponse } from "next/server";
import { data } from "@/lib/data";

export const dynamic = "force-dynamic";

// ผลสาธารณะของประเภท (ใช้กับ overlay) — ผ่าน getPublicResults เท่านั้น: ยังไม่เปิดผล = {status:"pending"} ไม่มีตัวเลขใด ๆ
export async function GET(_req: Request, { params }: { params: Promise<{ category: string }> }) {
  const { category: code } = await params;
  const category = (await data.getCategories()).find((c) => c.code === code);
  if (!category) return NextResponse.json({ error: "ไม่พบประเภท" }, { status: 404 });
  const results = await data.getPublicResults(category.id);
  return NextResponse.json(results, { headers: { "Cache-Control": "no-store" } });
}
