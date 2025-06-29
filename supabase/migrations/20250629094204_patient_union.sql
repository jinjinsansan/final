/*
  # RLSポリシーの修正と管理者アクセス権の強化

  1. 変更内容
    - カウンセラーが全ユーザーの日記データにアクセスできるようにRLSポリシーを修正
    - 管理者権限でのデータアクセスを強化
    - 同意履歴のアクセス権を修正

  2. 目的
    - 管理画面での日記データ表示の問題を解決
    - カウンセラーが適切にユーザーデータにアクセスできるようにする
    - 同期機能の正常化
*/

-- 既存のポリシーを削除して再作成
DROP POLICY IF EXISTS "Users can manage own diary entries" ON diary_entries;
DROP POLICY IF EXISTS "Counselors can access all diary entries" ON diary_entries;

-- 日記エントリーのポリシーを再作成
CREATE POLICY "Users can manage own diary entries"
  ON diary_entries
  FOR ALL
  TO authenticated
  USING (
    user_id IN (SELECT id FROM users WHERE line_username = auth.uid()::text)
  );

CREATE POLICY "Counselors can access all diary entries"
  ON diary_entries
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM counselors 
      WHERE email = auth.email() AND is_active = true
    )
  );

-- 同意履歴のポリシーを修正
DROP POLICY IF EXISTS "Counselors can read consent histories" ON consent_histories;

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

-- ユーザーテーブルのポリシーを修正
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Counselors can access all users" ON users;

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = line_username);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = line_username);

CREATE POLICY "Counselors can access all users"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM counselors 
      WHERE email = auth.email() AND is_active = true
    )
  );

-- コメント
COMMENT ON POLICY "Users can manage own diary entries" ON diary_entries IS 'ユーザーは自分の日記のみアクセス可能';
COMMENT ON POLICY "Counselors can access all diary entries" ON diary_entries IS 'カウンセラーは全ての日記にアクセス可能';
COMMENT ON POLICY "Counselors can access all consent histories" ON consent_histories IS 'カウンセラーは全ての同意履歴にアクセス可能';
COMMENT ON POLICY "Users can read own data" ON users IS 'ユーザーは自分の情報のみ閲覧可能';
COMMENT ON POLICY "Users can update own data" ON users IS 'ユーザーは自分の情報のみ更新可能';
COMMENT ON POLICY "Counselors can access all users" ON users IS 'カウンセラーは全てのユーザー情報にアクセス可能';