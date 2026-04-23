import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "플랫폼 관리자만 접근 가능합니다." }, { status: 403 });
    }

    const body = await request.json();
    const { userId, subscription_tier, role } = body as {
      userId: string;
      subscription_tier?: string;
      role?: string;
    };

    if (!userId) {
      return NextResponse.json({ error: "userId 필수" }, { status: 400 });
    }

    const VALID_TIERS = ["free", "premium", "premium_plus", "pastor", "church"];
    const VALID_ROLES = ["member", "pastor", "admin"];

    const updates: Record<string, string> = {};
    if (subscription_tier && VALID_TIERS.includes(subscription_tier)) {
      updates.subscription_tier = subscription_tier;
    }
    if (role && VALID_ROLES.includes(role)) {
      updates.role = role;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "변경할 항목이 없습니다." }, { status: 400 });
    }

    const svc = createServiceRoleClient();
    const { error } = await svc.from("profiles").update(updates).eq("id", userId);

    if (error) {
      return NextResponse.json({ error: "업데이트 실패: " + error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, updates });
  } catch (error) {
    console.error("Platform update error:", error);
    return NextResponse.json({ error: "업데이트 실패" }, { status: 500 });
  }
}
