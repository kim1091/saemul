import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

/**
 * 관리자 모드 접근 권한 확인 + 미인가 시 리다이렉트
 * 목회자(churches.pastor_id) 또는 파트너(church_members.is_partner) 만 통과
 * 반환: { userId, role, churchId }
 */
export async function requireAdminAccess() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, church_id")
    .eq("id", user.id)
    .single();

  if (!profile?.church_id) {
    redirect("/home");
  }

  // 1차: 목회자 역할 확인
  if (profile.role === "pastor" || profile.role === "admin") {
    return { userId: user.id, role: profile.role, churchId: profile.church_id };
  }

  // 2차: 파트너 여부 확인
  const { data: partner } = await supabase
    .from("church_members")
    .select("is_partner")
    .eq("profile_id", user.id)
    .eq("church_id", profile.church_id)
    .eq("is_partner", true)
    .eq("is_active", true)
    .maybeSingle();

  if (partner) {
    return { userId: user.id, role: "partner" as const, churchId: profile.church_id };
  }

  // 권한 없음 → 홈으로
  redirect("/home");
}
