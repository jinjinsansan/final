/*
  # 同期機能の修正と拡張

  1. 変更内容
    - 同期ログテーブルの作成
    - 同期操作を記録する関数の作成
    - 日記エントリーテーブルのインデックス追加
    - RLSポリシーの修正

  2. 目的
    - 同期操作の追跡と監視
    - 同期の問題のトラブルシューティング
    - 同期パフォーマンスの向上
*/

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

-- 日記エントリーテーブルのインデックス追加
CREATE INDEX IF NOT EXISTS idx_diary_entries_user_id_date ON diary_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_diary_entries_emotion_user_id ON diary_entries(emotion, user_id);

-- コメント
COMMENT ON TABLE sync_logs IS '同期操作のログを記録するテーブル';
COMMENT ON COLUMN sync_logs.user_id IS '同期対象のユーザーID';
COMMENT ON COLUMN sync_logs.sync_type IS '同期の種類（auto: 自動同期, manual: 手動同期, force: 強制同期）';
COMMENT ON COLUMN sync_logs.entries_count IS '同期されたエントリー数';
COMMENT ON COLUMN sync_logs.success IS '同期が成功したかどうか';
COMMENT ON COLUMN sync_logs.error_message IS 'エラーメッセージ（失敗時）';
COMMENT ON FUNCTION log_sync_operation IS '同期操作をログに記録する関数';