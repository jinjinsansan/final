/*
  # 同意履歴テーブルの修正

  1. 変更内容
    - 同意履歴テーブルの構造を確認し、必要なフィールドを追加
    - 既存のデータを保持しながら構造を修正
    - 適切なコメントを追加

  2. 目的
    - 同意履歴の同期エラーを解決する
    - データの整合性を確保する
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

-- コメント
COMMENT ON TABLE consent_histories IS '同意履歴を管理するテーブル';
COMMENT ON COLUMN consent_histories.line_username IS 'ユーザー名';
COMMENT ON COLUMN consent_histories.consent_given IS '同意が与えられたかどうか';
COMMENT ON COLUMN consent_histories.consent_date IS '同意日時';
COMMENT ON COLUMN consent_histories.ip_address IS 'IPアドレス';
COMMENT ON COLUMN consent_histories.user_agent IS 'ユーザーエージェント';