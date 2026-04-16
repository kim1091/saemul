-- ============================================
-- 샘물 보안 수정 (2026-04-17)
-- Supabase Dashboard > SQL Editor 에서 실행
-- ============================================

-- 1) 원자적 AI 질문 쿼터 체크+증가 (레이스 컨디션 방지)
-- 하루 3회 제한 체크 + 카운트 증가를 단일 트랜잭션으로 처리
-- 날짜 변경 시 자동 리셋 포함
CREATE OR REPLACE FUNCTION public.try_use_daily_ask(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_str text;
  p profiles%rowtype;
  new_count int;
BEGIN
  today_str := to_char(now() AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD');

  -- 행 잠금으로 동시 요청 차단
  SELECT * INTO p FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF p.id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'profile_not_found');
  END IF;

  -- 유료 사용자: 무제한 (카운트는 추적용으로 증가)
  IF p.subscription_tier IS NOT NULL AND p.subscription_tier != 'free' THEN
    UPDATE profiles
    SET daily_ask_count = CASE
      WHEN daily_ask_reset_at IS NULL OR daily_ask_reset_at != today_str THEN 1
      ELSE coalesce(daily_ask_count, 0) + 1
    END,
    daily_ask_reset_at = today_str
    WHERE id = p_user_id
    RETURNING daily_ask_count INTO new_count;

    RETURN jsonb_build_object('allowed', true, 'count', new_count, 'tier', p.subscription_tier);
  END IF;

  -- 무료 사용자: 날짜 변경 시 리셋
  IF p.daily_ask_reset_at IS NULL OR p.daily_ask_reset_at != today_str THEN
    UPDATE profiles
    SET daily_ask_count = 1, daily_ask_reset_at = today_str
    WHERE id = p_user_id
    RETURNING daily_ask_count INTO new_count;

    RETURN jsonb_build_object('allowed', true, 'count', new_count, 'tier', 'free');
  END IF;

  -- 같은 날: 3회 초과 시 차단
  IF coalesce(p.daily_ask_count, 0) >= 3 THEN
    RETURN jsonb_build_object('allowed', false, 'count', p.daily_ask_count, 'error', 'limit_exceeded');
  END IF;

  -- 3회 미만: 증가
  UPDATE profiles
  SET daily_ask_count = coalesce(daily_ask_count, 0) + 1
  WHERE id = p_user_id
  RETURNING daily_ask_count INTO new_count;

  RETURN jsonb_build_object('allowed', true, 'count', new_count, 'tier', 'free');
END;
$$;

-- authenticated만 호출 가능 (anon/public 차단)
REVOKE ALL ON FUNCTION public.try_use_daily_ask(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.try_use_daily_ask(uuid) TO authenticated, service_role;
