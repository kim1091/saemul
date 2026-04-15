import { createServerSupabaseClient } from "@/lib/supabase-server";
import BottomNav from "@/components/ui/BottomNav";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  let role = "member";
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (data?.role) role = data.role;
  }

  return (
    <div className="min-h-full pb-20">
      {children}
      <BottomNav role={role} />
    </div>
  );
}
