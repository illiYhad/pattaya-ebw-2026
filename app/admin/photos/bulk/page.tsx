import { redirect } from "next/navigation";
import { data } from "@/lib/data";
import { AdminNav } from "@/components/admin/AdminNav";
import { BulkPhotoUploadClient } from "@/components/admin/BulkPhotoUploadClient";
import { getStaff, mockBlocked, BLOCKED_MESSAGE } from "@/lib/auth";
import { rolesForPath } from "@/lib/roles";

export const dynamic = "force-dynamic";

const PATH = "/admin/photos/bulk";

// K-EBW-PHOTO-UP: อัปโหลดรูปผู้แข่งหลายไฟล์ (จับคู่จากชื่อไฟล์ EBW-###) · แอดมินเท่านั้น (PATH_ROLES · proxy.ts กั้นอีกชั้น)
// ตรวจบทบาททั้งโหมดจริงและโหมด mock (DEV_ROLE) เพื่อให้ทดสอบสิทธิ์ในเครื่องได้
export default async function BulkPhotosPage() {
  if (mockBlocked) return <p className="text-live">{BLOCKED_MESSAGE}</p>;
  const staff = await getStaff();
  if (!staff) redirect(`/login?next=${PATH}`);
  if (!rolesForPath(PATH)?.includes(staff.role)) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">อัปโหลดรูปจากไฟล์หลายรูป</h1>
        <p className="text-live">ไม่มีสิทธิ์ — หน้านี้สำหรับแอดมินเท่านั้น</p>
      </div>
    );
  }
  const [competitors, photos] = await Promise.all([data.getCompetitors(), data.getPhotos()]);
  const people = competitors.map((c) => ({ code: c.code, key: c.person_key, name: c.name_th }));
  const withPhoto = [...new Set(photos.map((p) => p.person_key))];
  return (
    <div className="space-y-4">
      <AdminNav />
      <h1 className="text-xl font-bold">อัปโหลดรูปจากไฟล์หลายรูป</h1>
      <BulkPhotoUploadClient people={people} withPhoto={withPhoto} />
    </div>
  );
}
