import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/api/"];
const STATIC_PREFIXES = ["/_next/", "/favicon.ico", "/sitemap.xml", "/robots.txt", "/manifest.json", "/icons/"];

function isPublic(pathname: string) {
  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (pathname === "/" || pathname === "/login") return true;
  if (pathname.startsWith("/api/")) return true;
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 공개 경로는 세션 리프레시만 수행
  if (isPublic(pathname)) {
    return NextResponse.next({ request });
  }

  // Supabase 세션 리프레시 + 인증 확인
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 미인증 → 로그인 페이지
  if (!user) {
    const hasSessionCookie = request.cookies
      .getAll()
      .some((c) => c.name.startsWith("sb-"));
    const loginUrl = new URL("/login", request.url);
    if (hasSessionCookie) {
      loginUrl.searchParams.set("reason", "session-expired");
    }
    return NextResponse.redirect(loginUrl);
  }

  // 인증됨 + 온보딩 페이지 접근 → 통과
  if (pathname === "/onboarding") {
    return supabaseResponse;
  }

  // 온보딩 완료 여부 + 역할 확인
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded, role, church_id")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.onboarded) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  // /platform 경로: is_admin만 접근 가능
  if (pathname.startsWith("/platform")) {
    const { data: adminCheck } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.redirect(new URL("/home", request.url));
    }
  }

  // /admin 경로: 목회자/admin만 1차 통과 (파트너는 layout에서 DB 확인)
  if (pathname.startsWith("/admin")) {
    if (profile.role !== "pastor" && profile.role !== "admin") {
      // 파트너 여부는 church_members 조회 필요 → 여기서는 church_id 유무만 확인
      if (!profile.church_id) {
        return NextResponse.redirect(new URL("/home", request.url));
      }
      // church_id가 있으면 layout의 requireAdminAccess()가 정밀 검사
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
