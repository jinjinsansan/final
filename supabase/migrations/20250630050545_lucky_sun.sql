/*
  # 同意履歴機能の修正と拡張

  1. 変更内容
    - 同意履歴テーブルに必要なフィールドを追加
      - `consent_given` (boolean) - 同意が与えられたかどうか
      - `ip_address` (text) - IPアドレス
      - `user_agent` (text) - ユーザーエージェント
    - RLSポリシーの修正
      - 匿名ユーザーを含む全てのユーザーが同意履歴を挿入できるように
      - ユーザーは自分の同意履歴のみ閲覧可能
      - カウンセラーは全ての同意履歴にアクセス可能
    - インデックスの追加
      - パフォーマンス向上のため

  2. 目的
    - 同意履歴機能の安定性向上
    - 匿名ユーザーからの同意履歴登録を可能に
    - 検索パフォーマンスの向上
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
-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can insert their own consent histories" ON consent_histories;
DROP POLICY IF EXISTS "Counselors can read consent histories" ON consent_histories;
DROP POLICY IF EXISTS "Counselors can access all consent histories" ON consent_histories;
DROP POLICY IF EXISTS "Users can read their own consent histories" ON consent_histories;
DROP POLICY IF EXISTS "Users can insert consent histories" ON consent_histories;
DROP POLICY IF EXISTS "Anyone can insert consent histories" ON consent_histories;

-- 新しいポリシーを作成
-- 匿名ユーザーを含む全てのユーザーが同意履歴を挿入できるようにする
CREATE POLICY "Anyone can insert consent histories"
  ON consent_histories
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- ユーザーは自分の同意履歴のみ閲覧可能
CREATE POLICY "Users can read their own consent histories"
  ON consent_histories
  FOR SELECT
  TO authenticated
  USING (line_username = auth.uid()::text);

-- カウンセラーは全ての同意履歴にアクセス可能
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

-- コメント
COMMENT ON TABLE consent_histories IS '同意履歴を管理するテーブル';
COMMENT ON COLUMN consent_histories.line_username IS 'ユーザー名';
COMMENT ON COLUMN consent_histories.consent_given IS '同意が与えられたかどうか';
COMMENT ON COLUMN consent_histories.consent_date IS '同意日時';
COMMENT ON COLUMN consent_histories.ip_address IS 'IPアドレス';
COMMENT ON COLUMN consent_histories.user_agent IS 'ユーザーエージェント';