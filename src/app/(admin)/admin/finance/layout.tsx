import { requireAdminAccess, canAccessFinance } from "@/lib/admin-guard";
import { redirect } from "next/navigation";

export default async function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role } = await requireAdminAccess();

  if (!canAccessFinance(role)) {
    redirect("/admin");
  }

  return <>{children}</>;
}
