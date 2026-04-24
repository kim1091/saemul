-- 019: 문자(SMS) 발송 시스템
-- 2026-04-24

CREATE TABLE sms_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  recipient_type TEXT NOT NULL DEFAULT 'individual'
    CHECK (recipient_type IN ('all', 'department', 'individual')),
  recipient_filter TEXT,                    -- 부서명 또는 null
  recipients JSONB NOT NULL DEFAULT '[]',   -- [{name, phone}]
  recipient_count INT NOT NULL DEFAULT 0,
  message TEXT NOT NULL,
  msg_type TEXT NOT NULL DEFAULT 'SMS'
    CHECK (msg_type IN ('SMS', 'LMS')),     -- 80byte 이하=SMS, 초과=LMS
  status TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'failed', 'partial')),
  api_response JSONB,                       -- Solapi 응답 저장
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sms_messages_church ON sms_messages(church_id, created_at DESC);

ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_select" ON sms_messages
  FOR SELECT TO authenticated
  USING (
    church_id IN (SELECT id FROM churches WHERE pastor_id = auth.uid())
    OR sender_id = auth.uid()
  );

CREATE POLICY "sms_insert" ON sms_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    church_id IN (SELECT id FROM churches WHERE pastor_id = auth.uid())
    OR sender_id = auth.uid()
  );
