import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // is_admin 체크
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "플랫폼 관리자만 접근 가능합니다." }, { status: 403 });
    }

    const svc = createServiceRoleClient();

    // 전체 통계 병렬 조회
    const [usersRes, churchesRes, sermonsRes, askRes] = await Promise.all([
      svc.from("profiles").select("id, name, role, subscription_tier, is_admin, church_name, created_at, onboarded", { count: "exact" }).order("created_at", { ascending: false }),
      svc.from("churches").select("id, name, address, pastor_id, created_at", { count: "exact" }),
      svc.from("sermons").select("id", { count: "exact", head: true }),
      svc.from("ask_conversations").select("id", { count: "exact", head: true }),
    ]);

    // 티어별 카운트
    const users = usersRes.data || [];
    const tierCounts: Record<string, number> = {};
    const roleCounts: Record<string, number> = {};
    for (const u of users) {
      const t = u.subscription_tier || "free";
      tierCounts[t] = (tierCounts[t] || 0) + 1;
      const r = u.role || "member";
      roleCounts[r] = (roleCounts[r] || 0) + 1;
    }

    return NextResponse.json({
      totalUsers: usersRes.count || 0,
      totalChurches: churchesRes.count || 0,
      totalSermons: sermonsRes.count || 0,
      totalAsks: askRes.count || 0,
      tierCounts,
      roleCounts,
      users: users.slice(0, 100),
      churches: (churchesRes.data || []).slice(0, 50),
    });
  } catch (error) {
    console.error("Platform stats error:", error);
    return NextResponse.json({ error: "통계 조회 실패" }, { status: 500 });
  }
}
