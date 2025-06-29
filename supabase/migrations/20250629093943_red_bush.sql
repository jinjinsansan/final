/*
  # Fix RLS Policies for Admin Access

  1. Changes
    - Add explicit RLS policies for counselors to access all diary entries
    - Ensure counselors can view and modify all user data
    - Fix policy conflicts that might prevent data access

  2. Purpose
    - Enable counselors to properly view all user diary entries in the admin panel
    - Fix synchronization issues between local storage and Supabase
*/

-- Drop potentially conflicting policies
DROP POLICY IF EXISTS "Users can manage own diary entries" ON diary_entries;

-- Create new policies with proper access control
CREATE POLICY "Users can manage own diary entries"
  ON diary_entries
  FOR ALL
  TO authenticated
  USING (
    user_id IN (SELECT id FROM users WHERE line_username = auth.uid()::text)
    OR EXISTS (
      SELECT 1 FROM counselors 
      WHERE email = auth.email() AND is_active = true
    )
  );

-- Ensure counselors can access all diary entries
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

-- Ensure counselors can access all users
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

-- Add assigned_counselor and urgency_level columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'diary_entries' AND column_name = 'assigned_counselor'
  ) THEN
    ALTER TABLE diary_entries ADD COLUMN assigned_counselor text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'diary_entries' AND column_name = 'urgency_level'
  ) THEN
    ALTER TABLE diary_entries ADD COLUMN urgency_level text CHECK (urgency_level IN ('high', 'medium', 'low'));
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_diary_entries_assigned_counselor ON diary_entries(assigned_counselor);
CREATE INDEX IF NOT EXISTS idx_diary_entries_urgency_level ON diary_entries(urgency_level);

-- Comments
COMMENT ON POLICY "Users can manage own diary entries" ON diary_entries IS 'ユーザーは自分の日記のみアクセス可能、カウンセラーは全ての日記にアクセス可能';
COMMENT ON POLICY "Counselors can access all diary entries" ON diary_entries IS 'カウンセラーは全ての日記にアクセス可能';
COMMENT ON POLICY "Counselors can access all users" ON users IS 'カウンセラーは全てのユーザー情報にアクセス可能';