/*
  # 管理者アクセス権限の追加

  1. 変更内容
    - カウンセラーが全ユーザーの日記データにアクセスできるようにRLSポリシーを更新
    - カウンセラーが全ユーザーの同意履歴にアクセスできるようにRLSポリシーを更新
    - カウンセラーが全ユーザー情報にアクセスできるようにRLSポリシーを更新

  2. セキュリティ
    - カウンセラーのみが全データにアクセス可能
    - 一般ユーザーは自分のデータのみアクセス可能
*/

-- カウンセラーが全ユーザーの日記データにアクセスできるようにRLSポリシーを更新
CREATE POLICY IF NOT EXISTS "Counselors can access all diary entries"
  ON diary_entries
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM counselors 
      WHERE email = auth.email() AND is_active = true
    )
  );

-- カウンセラーが全ユーザー情報にアクセスできるようにRLSポリシーを更新
CREATE POLICY IF NOT EXISTS "Counselors can access all users"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM counselors 
      WHERE email = auth.email() AND is_active = true
    )
  );

-- カウンセラーが全ユーザーの同意履歴にアクセスできるようにRLSポリシーを更新
CREATE POLICY IF NOT EXISTS "Counselors can access all consent histories"
  ON consent_histories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM counselors 
      WHERE email = auth.email() AND is_active = true
    )
  );

-- コメント
COMMENT ON POLICY "Counselors can access all diary entries" ON diary_entries IS 'カウンセラーは全ユーザーの日記データにアクセスできる';
COMMENT ON POLICY "Counselors can access all users" ON users IS 'カウンセラーは全ユーザー情報にアクセスできる';
COMMENT ON POLICY "Counselors can access all consent histories" ON consent_histories IS 'カウンセラーは全ユーザーの同意履歴にアクセスできる';