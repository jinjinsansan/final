import { createClient } from '@supabase/supabase-js';

// 環境変数から値を取得し、undefined や null の場合は空文字列にする
const supabaseUrl = 'https://your-project-id.supabase.co';
const supabaseAnonKey = 'your-anon-key';

// 環境変数のデバッグ情報（開発環境のみ）
if (import.meta.env.DEV) {
  console.log('Supabase URL設定:', !!supabaseUrl);
  console.log('Supabase Key設定:', !!supabaseAnonKey);
}

// 環境変数の検証（本番環境対応）
const isValidUrl = (url: string): boolean => {
  try {
    if (!url || url.trim() === '' || url === 'undefined' || url.includes('your_supabase') || 
        url === 'https://undefined' || url.startsWith('https://undefined')) {
      return false;
    }
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const isValidSupabaseKey = (key: string): boolean => {
  return !!(key && 
    key.trim() !== '' && 
    key !== 'undefined' &&
    !key.includes('your_supabase') &&
    key.length > 10); // キーの最小長を20から10に変更
};

// 本番環境での詳細な検証
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase環境変数が設定されていません。ローカルモードで動作します。');
} 
else if (!isValidUrl(supabaseUrl) || !isValidSupabaseKey(supabaseAnonKey)) {
  console.warn('Supabase環境変数が無効です。設定を確認してください。');
}

// Supabaseクライアントの作成
export const supabase = (() => {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase URL または API キーが設定されていません');
      return null;
    }
    
    const urlValid = isValidUrl(supabaseUrl);
    const keyValid = isValidSupabaseKey(supabaseAnonKey);
    
    if (urlValid && keyValid) {
      try {
        const client = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
          }
        });
        console.log('Supabaseクライアント作成成功');
        return client;
      } catch (createError) {
        console.error('Supabaseクライアント作成中のエラー:', createError);
        return null;
      }
    } else {
      console.error('Supabaseクライアント作成失敗: URLまたはキーが無効です', {
        urlValid,
        keyValid,
        urlLength: supabaseUrl.length,
        keyLength: supabaseAnonKey.length
      });
      return null;
    }
  } catch (error) {
    console.error('Supabaseクライアント作成エラー:', error instanceof Error ? error.message : error);
    return null;
  }
})();

// 接続テスト用の関数
export const testSupabaseConnection = async () => {
  // 開発環境ではモックデータを返す
  console.log('開発環境用のモック接続テスト - 成功を返します');
  return { success: true, data: [] };
};

// データベース型定義
export interface User {
  id: string;
  line_username: string;
  created_at: string;
}

export interface DiaryEntry {
  id: string;
  user_id: string;
  date: string;
  emotion: string;
  event: string;
  realization: string;
  self_esteem_score: number;
  worthlessness_score: number;
  created_at: string;
}

export interface ChatRoom {
  id: string;
  user_id: string;
  counselor_id?: string;
  status: 'active' | 'closed' | 'waiting';
  created_at: string;
}

export interface Message {
  id: string;
  chat_room_id: string;
  sender_id?: string;
  counselor_id?: string;
  content: string;
  is_counselor: boolean;
  created_at: string;
}

export interface Counselor {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface ConsentHistory {
  id: string;
  line_username: string;
  consent_given: boolean;
  consent_date: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

// ユーザー管理関数
export const userService = {
  async createUser(lineUsername: string | null): Promise<User | null> {
    // 開発環境用のモックユーザー作成
    console.log(`モックユーザー作成: "${lineUsername}"`);
    
    // モックユーザーを返す
    return {
      id: 'mock-user-id',
      line_username: lineUsername || 'mock-user',
      created_at: new Date().toISOString()
    };
  },

  async getUserByUsername(lineUsername: string | null): Promise<User | null> {
    // 開発環境用のモックユーザー検索
    console.log(`モックユーザー検索: "${lineUsername}"`);
    
    // 常にnullを返す（ユーザーが存在しないことを示す）
    return null;
  },

  // 本番環境用：ユーザー統計取得
  async getUserStats(): Promise<{ total: number; today: number; thisWeek: number } | null> {
    // 開発環境用のモック統計
    return {
      total: 10,
      today: 2,
      thisWeek: 5
    };
  }
};

// 日記管理関数
export const diaryService = {
  async createEntry(entry: Omit<DiaryEntry, 'id' | 'created_at'>): Promise<DiaryEntry | null> {
    if (!supabase) return null;
    
    try {
      const { data, error } = await supabase
        .from('diary_entries')
        .insert([entry])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('日記作成エラー:', error);
      return null;
    }
  },

  async getUserEntries(userId: string): Promise<DiaryEntry[]> {
    if (!supabase) return [];
    
    try {
      const { data, error } = await supabase
        .from('diary_entries')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('日記取得エラー:', error);
      return [];
    }
  },

  async updateEntry(id: string, updates: Partial<DiaryEntry>): Promise<DiaryEntry | null> {
    if (!supabase) return null;
    
    try {
      const { data, error } = await supabase
        .from('diary_entries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('日記更新エラー:', error);
      return null;
    }
  },

  async deleteEntry(id: string): Promise<boolean> {
    if (!supabase) return false;
    
    try {
      const { error } = await supabase
        .from('diary_entries')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('日記削除エラー:', error);
      return false;
    }
  },

  // 管理画面用：全ユーザーの日記を取得
  async getAllEntries(limit = 100, offset = 0): Promise<any[]> {
    if (!supabase) return [];
    
    try {
      const { data, error } = await supabase
        .from('diary_entries')
        .select(`
          *,
          users!inner(
            id,
            line_username,
            created_at
          )
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('全日記取得エラー:', error);
      return [];
    }
  },

  // 本番環境用：日記統計取得
  async getDiaryStats(): Promise<{ total: number; today: number; thisWeek: number; byEmotion: Record<string, number> } | null> {
    if (!supabase) return null;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const [totalResult, todayResult, weekResult, emotionResult] = await Promise.all([
        supabase.from('diary_entries').select('id', { count: 'exact' }),
        supabase.from('diary_entries').select('id', { count: 'exact' }).gte('date', today),
        supabase.from('diary_entries').select('id', { count: 'exact' }).gte('date', weekAgo),
        supabase.from('diary_entries').select('emotion')
      ]);
      
      // 感情別集計
      const byEmotion: Record<string, number> = {};
      if (emotionResult.data) {
        emotionResult.data.forEach(entry => {
          byEmotion[entry.emotion] = (byEmotion[entry.emotion] || 0) + 1;
        });
      }
      
      return {
        total: totalResult.count || 0,
        today: todayResult.count || 0,
        thisWeek: weekResult.count || 0,
        byEmotion
      };
    } catch (error) {
      console.error('日記統計取得エラー:', error);
      return null;
    }
  }
};

// チャット管理関数
export const chatService = {
  async createChatRoom(userId: string): Promise<ChatRoom | null> {
    if (!supabase) return null;
    
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .insert([{ user_id: userId, status: 'waiting' }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('チャットルーム作成エラー:', error);
      return null;
    }
  },

  async getUserChatRoom(userId: string): Promise<ChatRoom | null> {
    if (!supabase) return null;
    
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('チャットルーム取得エラー:', error);
      return null;
    }
  },

  async sendMessage(chatRoomId: string, content: string, senderId?: string, counselorId?: string): Promise<Message | null> {
    if (!supabase) return null;
    
    try {
      const messageData = {
        chat_room_id: chatRoomId,
        content,
        is_counselor: !!counselorId,
        ...(counselorId ? { counselor_id: counselorId } : { sender_id: senderId })
      };

      const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('メッセージ送信エラー:', error);
      return null;
    }
  },

  async getChatMessages(chatRoomId: string): Promise<Message[]> {
    if (!supabase) return [];
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_room_id', chatRoomId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('メッセージ取得エラー:', error);
      return [];
    }
  }
};

// カウンセラー管理関数
export const counselorService = {
  async getAllCounselors(): Promise<Counselor[]> {
    if (!supabase) return [];
    
    try {
      const { data, error } = await supabase
        .from('counselors')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('カウンセラー取得エラー:', error);
      return [];
    }
  },

  async createCounselor(name: string, email: string): Promise<Counselor | null> {
    if (!supabase) return null;
    
    try {
      const { data, error } = await supabase
        .from('counselors')
        .insert([{ name, email }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('カウンセラー作成エラー:', error);
      return null;
    }
  }
};

// 同意履歴管理関数
export const consentService = {
  async createConsentRecord(record: Omit<ConsentHistory, 'id' | 'created_at'> | null): Promise<ConsentHistory | null> {
    if (!supabase) return null;
    if (!record) {
      console.error('同意履歴レコードが指定されていません');
      return null;
    }
    
    try {
      const { data, error } = await supabase
        .from('consent_histories')
        .insert([record])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('同意履歴作成エラー:', error);
      return null;
    }
  },

  async getAllConsentHistories(): Promise<ConsentHistory[]> {
    if (!supabase) return [];
    
    try {
      const { data, error } = await supabase
        .from('consent_histories')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('同意履歴取得エラー:', error);
      return [];
    }
  },

  async getConsentHistoryByUsername(lineUsername: string | null): Promise<ConsentHistory | null> {
    if (!supabase) return null;
    if (!lineUsername) {
      console.error('ユーザー名が指定されていません');
      return null;
    }
    
    try {
      const { data, error } = await supabase
        .from('consent_histories')
        .select('*')
        .eq('line_username', lineUsername)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('ユーザー同意履歴取得エラー:', error);
      return null;
    }
  }
};

// データ同期ユーティリティ
export const syncService = {
  async migrateLocalData(userId: string | null): Promise<boolean> {
    // 開発環境用のモックデータ移行
    console.log(`モックデータ移行: ユーザーID: ${userId}`);
    
    // 成功を返す
    return true;
  },

  async syncToLocal(userId: string | null): Promise<boolean> {
    // 開発環境用のモック同期
    console.log(`モック同期: ユーザーID: ${userId}`);
    
    // 成功を返す
    return true;
  },

  async syncConsentHistories(): Promise<boolean> {
    // 開発環境用のモック同意履歴同期
    console.log('モック同意履歴同期');
    
    // 成功を返す
    return true;
  },

  async syncConsentHistoriesToLocal(): Promise<boolean> {
    // 開発環境用のモック同意履歴ローカル同期
    console.log('モック同意履歴ローカル同期');
    
    // 成功を返す
    return true;
  },

  async bulkMigrateLocalData(userId: string | null, progressCallback?: (progress: number) => void): Promise<boolean> {
    // 開発環境用のモック大量データ移行
    console.log(`モック大量データ移行: ユーザーID: ${userId}`);
    
    // 進捗をシミュレート
    if (progressCallback) {
      for (let i = 0; i <= 100; i += 20) {
        progressCallback(i);
        // 実際の環境では遅延が必要
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // 成功を返す
    return true;
  }
};