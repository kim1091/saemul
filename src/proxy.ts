import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/api/"];
const STATIC_PREFIXES = ["/_next/", "/favicon.ico", "/sitemap.xml", "/robots.txt"];

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

  // 온보딩 완료 여부 확인
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.onboarded) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
