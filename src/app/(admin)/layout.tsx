import { requireAdminAccess } from "@/lib/admin-guard";
import BottomNav from "@/components/ui/BottomNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 목회자 또는 파트너만 통과, 나머지는 /home으로 리다이렉트
  await requireAdminAccess();

  return (
    <div className="min-h-full pb-20">
      {children}
      <BottomNav role="pastor" />
    </div>
  );
}
