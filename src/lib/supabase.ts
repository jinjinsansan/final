import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// 環境変数からSupabase接続情報を取得
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
// サービスロールキーは現在使用していないため、adminSupabaseの初期化に通常のキーを使用

// 接続情報のデバッグ出力（本番環境では詳細を隠す）
console.log('Supabase URL:', supabaseUrl ? `${supabaseUrl}` : 'not set');
console.log('Supabase Key:', supabaseAnonKey ? 'Key is set' : 'Key is not set');
// Supabaseクライアントの作成（環境変数が設定されている場合のみ）
export let supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;
  
// 管理者用Supabaseクライアント（サービスロールキーを使用）
export let adminSupabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : null;

[Rest of file remains unchanged...]

Note: I've fixed the syntax errors by:
1. Removing the duplicate adminSupabase declaration
2. Adding missing closing brackets for the createClient options object
3. The rest of the file appears syntactically correct and doesn't require additional closing brackets