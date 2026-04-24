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
    const [usersRes, churchesRes, sermonsRes, askRes, paymentsRes, featureRes] = await Promise.all([
      svc.from("profiles").select("id, name, role, subscription_tier, is_admin, church_name, created_at, onboarded", { count: "exact" }).order("created_at", { ascending: false }),
      svc.from("churches").select("id, name, address, pastor_id, created_at", { count: "exact" }),
      svc.from("sermons").select("id", { count: "exact", head: true }),
      svc.from("ask_conversations").select("id", { count: "exact", head: true }),
      svc.from("payment_orders").select("id, user_id, order_id, tier, amount, months, status, method, paid_at, created_at").order("created_at", { ascending: false }).limit(50),
      svc.from("feature_usage").select("feature, created_at").gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
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

    // 결제 데이터 집계
    const payments = (paymentsRes.data || []) as { id: string; user_id: string; order_id: string; tier: string; amount: number; months: number; status: string; method: string | null; paid_at: string | null; created_at: string }[];
    const paidOrders = payments.filter((p) => p.status === "paid");
    const totalRevenue = paidOrders.reduce((sum: number, p) => sum + (p.amount || 0), 0);

    // 월별 매출 (최근 6개월)
    const monthlyRevenue: { month: string; amount: number; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthOrders = paidOrders.filter((p) => (p.paid_at || p.created_at || "").startsWith(ym));
      monthlyRevenue.push({
        month: ym,
        amount: monthOrders.reduce((s: number, p) => s + (p.amount || 0), 0),
        count: monthOrders.length,
      });
    }

    // 이번 달 API 사용량
    const features = featureRes.data || [];
    const featureCounts: Record<string, number> = {};
    for (const f of features) {
      featureCounts[f.feature] = (featureCounts[f.feature] || 0) + 1;
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
      // 결제·매출
      totalRevenue,
      totalPaidOrders: paidOrders.length,
      monthlyRevenue,
      recentPayments: payments.slice(0, 20),
      // API 사용량 (이번 달)
      featureCounts,
    });
  } catch (error) {
    console.error("Platform stats error:", error);
    return NextResponse.json({ error: "통계 조회 실패" }, { status: 500 });
  }
}
