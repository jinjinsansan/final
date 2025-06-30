/*
  # Fix Sync Issues and Add Missing Fields

  1. Changes
    - Add missing fields to diary_entries table
    - Fix RLS policies for sync operations
    - Add indexes for better performance
    - Add counselor_memo field if missing

  2. Purpose
    - Fix synchronization issues between local storage and Supabase
    - Ensure proper data structure for all operations
    - Improve query performance
*/

-- Add missing fields to diary_entries table
DO $$ 
BEGIN
  -- Add counselor_memo field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'diary_entries' AND column_name = 'counselor_memo'
  ) THEN
    ALTER TABLE diary_entries ADD COLUMN counselor_memo text;
  END IF;

  -- Add assigned_counselor field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'diary_entries' AND column_name = 'assigned_counselor'
  ) THEN
    ALTER TABLE diary_entries ADD COLUMN assigned_counselor text;
  END IF;

  -- Add urgency_level field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'diary_entries' AND column_name = 'urgency_level'
  ) THEN
    ALTER TABLE diary_entries ADD COLUMN urgency_level text CHECK (urgency_level IN ('high', 'medium', 'low'));
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_diary_entries_user_id_date ON diary_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_diary_entries_emotion_user_id ON diary_entries(emotion, user_id);
CREATE INDEX IF NOT EXISTS idx_diary_entries_assigned_counselor ON diary_entries(assigned_counselor);
CREATE INDEX IF NOT EXISTS idx_diary_entries_urgency_level ON diary_entries(urgency_level);

-- Fix RLS policies for sync operations
DROP POLICY IF EXISTS "Users can manage own diary entries" ON diary_entries;
DROP POLICY IF EXISTS "Counselors can access all diary entries" ON diary_entries;

-- Create new policies with proper access control
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

-- Add comments
COMMENT ON COLUMN diary_entries.counselor_memo IS 'カウンセラーによるメモ';
COMMENT ON COLUMN diary_entries.assigned_counselor IS '担当カウンセラー';
COMMENT ON COLUMN diary_entries.urgency_level IS '緊急度（high, medium, low）';
COMMENT ON POLICY "Users can manage own diary entries" ON diary_entries IS 'ユーザーは自分の日記のみアクセス可能';
COMMENT ON POLICY "Counselors can access all diary entries" ON diary_entries IS 'カウンセラーは全ての日記にアクセス可能';