/*
  # 同期機能の問題を修正

  1. 変更内容
    - 同意履歴テーブルの構造を修正
    - RLSポリシーの修正
    - 同期ログテーブルの作成

  2. 目的
    - 同期機能の正常化
    - 同意履歴の適切な管理
    - 同期操作の追跡
*/

-- 同意履歴テーブルの構造を確認し、必要なフィールドを追加
DO $$ 
BEGIN
  -- consent_given フィールドの確認と追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'consent_histories' AND column_name = 'consent_given'
  ) THEN
    ALTER TABLE consent_histories ADD COLUMN consent_given boolean NOT NULL DEFAULT true;
  END IF;

  -- ip_address フィールドの確認と追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'consent_histories' AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE consent_histories ADD COLUMN ip_address text NOT NULL DEFAULT 'unknown';
  END IF;

  -- user_agent フィールドの確認と追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'consent_histories' AND column_name = 'user_agent'
  ) THEN
    ALTER TABLE consent_histories ADD COLUMN user_agent text NOT NULL DEFAULT 'unknown';
  END IF;
END $$;

-- RLSポリシーの修正
DROP POLICY IF EXISTS "Users can insert their own consent histories" ON consent_histories;
DROP POLICY IF EXISTS "Counselors can read consent histories" ON consent_histories;
DROP POLICY IF EXISTS "Counselors can access all consent histories" ON consent_histories;
DROP POLICY IF EXISTS "Users can read their own consent histories" ON consent_histories;
DROP POLICY IF EXISTS "Users can insert consent histories" ON consent_histories;

-- 新しいポリシーを作成
CREATE POLICY "Users can insert consent histories"
  ON consent_histories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read their own consent histories"
  ON consent_histories
  FOR SELECT
  TO authenticated
  USING (line_username = auth.uid()::text);

CREATE POLICY "Counselors can access all consent histories"
  ON consent_histories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM counselors 
      WHERE email = auth.email() AND is_active = true
    )
  );

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_consent_histories_line_username ON consent_histories(line_username);
CREATE INDEX IF NOT EXISTS idx_consent_histories_consent_date ON consent_histories(consent_date);
CREATE INDEX IF NOT EXISTS idx_consent_histories_consent_given ON consent_histories(consent_given);

-- 同期ログテーブル
CREATE TABLE IF NOT EXISTS sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  sync_type text NOT NULL CHECK (sync_type IN ('auto', 'manual', 'force')),
  entries_count integer NOT NULL DEFAULT 0,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_sync_logs_user_id ON sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_type ON sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_logs_success ON sync_logs(success);

-- RLS有効化
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- RLSポリシー設定
CREATE POLICY "Users can view their own sync logs"
  ON sync_logs
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (SELECT id FROM users WHERE line_username = auth.uid()::text)
  );

CREATE POLICY "Counselors can view all sync logs"
  ON sync_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM counselors 
      WHERE email = auth.email() AND is_active = true
    )
  );

-- 同期ログを記録する関数
CREATE OR REPLACE FUNCTION log_sync_operation(
  p_user_id uuid,
  p_sync_type text,
  p_entries_count integer,
  p_success boolean,
  p_error_message text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO sync_logs (
    user_id,
    sync_type,
    entries_count,
    success,
    error_message
  ) VALUES (
    p_user_id,
    p_sync_type,
    p_entries_count,
    p_success,
    p_error_message
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- コメント
COMMENT ON TABLE consent_histories IS '同意履歴を管理するテーブル';
COMMENT ON COLUMN consent_histories.line_username IS 'ユーザー名';
COMMENT ON COLUMN consent_histories.consent_given IS '同意が与えられたかどうか';
COMMENT ON COLUMN consent_histories.consent_date IS '同意日時';
COMMENT ON COLUMN consent_histories.ip_address IS 'IPアドレス';
COMMENT ON COLUMN consent_histories.user_agent IS 'ユーザーエージェント';

COMMENT ON TABLE sync_logs IS '同期操作のログを記録するテーブル';
COMMENT ON COLUMN sync_logs.user_id IS '同期対象のユーザーID';
COMMENT ON COLUMN sync_logs.sync_type IS '同期の種類（auto: 自動同期, manual: 手動同期, force: 強制同期）';
COMMENT ON COLUMN sync_logs.entries_count IS '同期されたエントリー数';
COMMENT ON COLUMN sync_logs.success IS '同期が成功したかどうか';
COMMENT ON COLUMN sync_logs.error_message IS 'エラーメッセージ（失敗時）';
COMMENT ON FUNCTION log_sync_operation IS '同期操作をログに記録する関数';