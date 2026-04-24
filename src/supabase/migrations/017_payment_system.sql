-- 017: 결제 시스템 (Toss Payments 일반결제)
-- 2026-04-24

-- ═══ 결제 주문 테이블 ═══
CREATE TABLE payment_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL UNIQUE,            -- Toss orderId (saemul_yyyyMMddHHmmss_uuid8)
  tier TEXT NOT NULL CHECK (tier IN ('premium', 'premium_plus', 'pastor', 'church')),
  amount INT NOT NULL,                       -- 결제 금액 (원)
  months INT NOT NULL DEFAULT 1,             -- 구독 개월 수
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  payment_key TEXT,                          -- Toss paymentKey (승인 후)
  toss_order_id TEXT,                        -- Toss 내부 orderId
  method TEXT,                               -- 카드, 가상계좌 등
  receipt_url TEXT,                           -- 영수증 URL
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  fail_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_payment_orders_user ON payment_orders(user_id, created_at DESC);
CREATE INDEX idx_payment_orders_status ON payment_orders(status);

-- RLS
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;

-- 본인 주문만 조회
CREATE POLICY "Users read own orders"
  ON payment_orders FOR SELECT
  USING (auth.uid() = user_id);

-- 주문 생성은 본인만 (서버에서 INSERT)
CREATE POLICY "Users insert own orders"
  ON payment_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 업데이트는 service_role만 (결제 승인 시 서버에서)
-- RLS 기본이 deny이므로 UPDATE 정책 없음 = 일반 사용자 UPDATE 불가

-- ═══ profiles 테이블에 premium_plus 티어 추가 (CHECK 제약 수정) ═══
-- 참고: 이미 premium_plus가 추가되어 있을 수 있음 (015에서 처리)
-- 안전하게 DO NOTHING으로 처리
DO $$
BEGIN
  -- subscription_expires_at가 없으면 추가 (이미 001에서 있음 — 방어적)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscription_expires_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_expires_at TIMESTAMPTZ;
  END IF;
END $$;

-- ═══ 구독 만료 자동 다운그레이드 함수 ═══
CREATE OR REPLACE FUNCTION check_subscription_expiry(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_tier TEXT;
  v_expires TIMESTAMPTZ;
BEGIN
  SELECT subscription_tier, subscription_expires_at
    INTO v_tier, v_expires
    FROM profiles
    WHERE id = p_user_id;

  -- free이거나 만료일 미설정이면 그대로
  IF v_tier = 'free' OR v_expires IS NULL THEN
    RETURN v_tier;
  END IF;

  -- 만료됐으면 free로 다운그레이드
  IF v_expires < now() THEN
    UPDATE profiles
      SET subscription_tier = 'free',
          subscription_expires_at = NULL,
          updated_at = now()
      WHERE id = p_user_id;
    RETURN 'free';
  END IF;

  RETURN v_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
