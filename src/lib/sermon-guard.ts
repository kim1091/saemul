/**
 * 설교 기능 접근 제어
 *
 * 요금 체계 (2026-04):
 * Free(₩0)       — 5분 설교 없음, AI 질문 3회/일
 * Premium(₩4,900) — 5분 설교 월4회, AI 질문 월30회
 * Premium+(₩9,900) — 5분 설교 월10회, AI 질문 무제한
 * Pastor(₩19,900) — 설교공방+무제한 (부목사/전도사)
 * Church(₩99,000) — 교회관리+담임목사 설교공방
 */

interface ProfileForGuard {
  role?: string;
  subscription_tier?: string;
  subscription_expires_at?: string | null;
  is_admin?: boolean;
}

/** 구독 만료 여부를 반영한 실제 티어 반환. 만료됐으면 "free" */
export function getEffectiveTier(profile: ProfileForGuard): string {
  const tier = profile.subscription_tier || "free";
  if (tier === "free" || profile.is_admin) return tier;

  // 만료일 미설정 = 수동 승인 (관리자가 직접 올린 경우) → 유효
  if (!profile.subscription_expires_at) return tier;

  const expires = new Date(profile.subscription_expires_at);
  if (expires < new Date()) return "free";

  return tier;
}

/** 설교공방·BigIdea·Analyze 접근 가능 여부 (담임목사/부목사/전도사) */
export function canAccessWorkshop(profile: ProfileForGuard): boolean {
  if (profile.is_admin) return true;
  if (profile.role === "pastor") return true;
  const tier = getEffectiveTier(profile);
  if (tier === "pastor" || tier === "church") return true;
  return false;
}

/** 5분 설교 월간 한도. -1 = 무제한, 0 = 이용 불가 */
export function getMonthlySermonLimit(profile: ProfileForGuard): number {
  if (profile.is_admin) return -1;
  if (profile.role === "pastor") return -1;
  const tier = getEffectiveTier(profile);
  switch (tier) {
    case "church":
    case "pastor":
      return -1;
    case "premium_plus":
      return 10;
    case "premium":
      return 4;
    default:
      return 0; // free — 5분 설교 없음
  }
}

/** AI 질문 월간 한도. -1 = 무제한, 0 = 일별 제한(기존 로직 사용) */
export function getMonthlyAskLimit(profile: ProfileForGuard): number {
  if (profile.is_admin) return -1;
  if (profile.role === "pastor") return -1;
  const tier = getEffectiveTier(profile);
  switch (tier) {
    case "church":
    case "pastor":
      return -1;
    case "premium_plus":
      return 50;
    case "premium":
      return 20;
    default:
      return 0; // free — 기존 일별 3회 로직 유지
  }
}

/** BigIdea 분석 월간 한도 */
export const MONTHLY_BIGIDEA_LIMIT = 10;
