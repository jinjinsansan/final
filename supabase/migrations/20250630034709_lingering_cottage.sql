/*
  # バックアップログテーブルの作成

  1. 新しいテーブル
    - `backup_logs` - バックアップログ
      - `id` (uuid, primary key)
      - `counselor_name` (text)
      - `backup_type` (text)
      - `file_name` (text)
      - `file_size` (integer)
      - `created_at` (timestamp)
      - `metadata` (jsonb)

  2. セキュリティ
    - RLSを有効化
    - カウンセラーのみアクセス可能
*/

-- バックアップログテーブル
CREATE TABLE IF NOT EXISTS backup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_name text NOT NULL,
  backup_type text NOT NULL,
  file_name text NOT NULL,
  file_size integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  metadata jsonb
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_backup_logs_counselor_name ON backup_logs(counselor_name);
CREATE INDEX IF NOT EXISTS idx_backup_logs_created_at ON backup_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_backup_logs_backup_type ON backup_logs(backup_type);

-- RLS有効化
ALTER TABLE backup_logs ENABLE ROW LEVEL SECURITY;

-- RLSポリシー設定
CREATE POLICY "Counselors can manage backup logs"
  ON backup_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM counselors 
      WHERE email = auth.email() AND is_active = true
    )
  );

-- コメント
COMMENT ON TABLE backup_logs IS 'バックアップ操作のログを記録するテーブル';
COMMENT ON COLUMN backup_logs.counselor_name IS 'バックアップを実行したカウンセラーの名前';
COMMENT ON COLUMN backup_logs.backup_type IS 'バックアップの種類（full, user, etc.）';
COMMENT ON COLUMN backup_logs.file_name IS 'バックアップファイルの名前';
COMMENT ON COLUMN backup_logs.file_size IS 'バックアップファイルのサイズ（バイト）';
COMMENT ON COLUMN backup_logs.metadata IS 'バックアップに関する追加情報（JSON形式）';