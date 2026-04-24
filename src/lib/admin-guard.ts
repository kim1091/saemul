import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

/**
 * 관리자 모드 접근 권한 확인 + 미인가 시 리다이렉트
 *
 * 반환 역할:
 * - "senior_pastor": 담임목사 (churches.pastor_id) → 모든 메뉴
 * - "associate_pastor": 부교역자 (role=pastor, 담임 아님) → 재정 제외
 * - "partner": 파트너/재정관리자 (is_partner=true) → 재정만
 * - "admin": 플랫폼 관리자 → 모든 메뉴
 */
export type AdminRole = "senior_pastor" | "associate_pastor" | "partner" | "admin";

export async function requireAdminAccess(): Promise<{
  userId: string;
  role: AdminRole;
  churchId: string;
}> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, church_id, is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.church_id) {
    redirect("/home");
  }

  // 플랫폼 관리자
  if (profile.is_admin) {
    return { userId: user.id, role: "admin", churchId: profile.church_id };
  }

  // 목회자 역할 → 담임 vs 부교역자 구분
  if (profile.role === "pastor") {
    const { data: church } = await supabase
      .from("churches")
      .select("pastor_id")
      .eq("id", profile.church_id)
      .single();

    if (church?.pastor_id === user.id) {
      return { userId: user.id, role: "senior_pastor", churchId: profile.church_id };
    }
    return { userId: user.id, role: "associate_pastor", churchId: profile.church_id };
  }

  // 파트너 여부 확인
  try {
    const { data: partner } = await supabase
      .from("church_members")
      .select("is_partner")
      .eq("profile_id", user.id)
      .eq("church_id", profile.church_id)
      .eq("is_partner", true)
      .eq("is_active", true)
      .maybeSingle();

    if (partner) {
      return { userId: user.id, role: "partner", churchId: profile.church_id };
    }
  } catch {
    // is_partner 컬럼 미존재 시 안전하게 스킵
  }

  redirect("/home");
}

/** 재정 관련 페이지 접근 가능 여부 */
export function canAccessFinance(role: AdminRole): boolean {
  return role === "senior_pastor" || role === "admin" || role === "partner";
}

/** 재정 외 관리 페이지 접근 가능 여부 */
export function canAccessNonFinance(role: AdminRole): boolean {
  return role !== "partner";
}
