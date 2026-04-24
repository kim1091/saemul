import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";

/**
 * GET /api/church/household-heads?churchId=xxx&q=이름
 * 교회의 세대주(relation='본인') 목록 반환
 * service_role 사용 — 온보딩 중 아직 교회 미승인 상태에서도 검색 가능
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const churchId = searchParams.get("churchId");
  const query = searchParams.get("q") || "";

  if (!churchId) {
    return NextResponse.json({ error: "churchId 필수" }, { status: 400 });
  }

  const svc = createServiceRoleClient();

  let qb = svc
    .from("church_members")
    .select("id, name, phone, department")
    .eq("church_id", churchId)
    .eq("relation", "본인")
    .eq("is_active", true)
    .order("name");

  if (query.trim()) {
    qb = qb.ilike("name", `%${query.trim()}%`);
  }

  const { data, error } = await qb.limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
