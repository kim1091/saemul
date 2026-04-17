import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import BottomNav from "@/components/ui/BottomNav";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  // proxy.ts가 1차 가드 — 여기는 서버 컴포넌트 레벨 2차 폴백
  if (!user) {
    redirect("/login");
  }

  let role = "member";
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (data?.role) role = data.role;

  return (
    <div className="min-h-full pb-20">
      {children}
      <BottomNav role={role} />
    </div>
  );
}
