import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// 環境変数からSupabase接続情報を取得
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

// 接続情報のデバッグ出力（本番環境では詳細を隠す）
console.log('Supabase URL:', supabaseUrl ? `${supabaseUrl}` : 'not set');
console.log('Supabase Key:', supabaseAnonKey ? 'Key is set' : 'Key is not set');
console.log('Supabase Service Role Key:', supabaseServiceRoleKey ? 'Service Role Key is set' : 'Service Role Key is not set');

// 環境変数が設定されているかチェック
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase環境変数が設定されていません。ローカルモードで動作します。');
}

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
  
// 管理者用Supabaseクライアント（同じキーを使用）
export let adminSupabase = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : null;

// Supabase接続テスト関数
export const testSupabaseConnection = async () => {
  console.log('Supabase接続をテスト中...', new Date().toISOString());
  try {
    if (!supabase) {
      console.log('Supabase設定が見つかりません');
      return {
        success: false,
        error: 'Supabase設定が見つかりません',
        details: '環境変数が設定されていないか、無効です'
      };
    }

    // オフラインモードの場合は早期リターン
    if (!navigator.onLine) {
      console.log('オフラインモードです');
      console.warn('ネットワーク接続がありません。オフラインモードで動作します。');
      return { 
        success: false,
        error: 'オフラインモードです',
        details: 'インターネット接続を確認してください'
      };
    }

    // 接続エラーを防ぐためのフォールバック
    try {
      // 軽量な接続テスト
      console.log('Supabase API接続テスト中...', new Date().toISOString()); 
      
      const response = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseAnonKey}`, {
        method: 'HEAD',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey
        }
      });
      
      if (!response.ok) {
        console.log('Supabase API接続エラー:', response.status);
        return {
          success: false,
          error: `Supabase API接続エラー: ${response.status}`,
          details: '接続に失敗しました。環境変数を確認してください。'
        };
      }
    } catch (fetchError) {
      console.log('Supabase接続テスト(fetch)エラー:', fetchError);
      // fetchエラーが発生した場合はローカルモードで動作
      return {
        success: false,
        error: 'ローカルモードで動作します',
        details: 'Supabaseへの接続に失敗しました。ローカルデータのみ使用します。'
      };
    }

    // オフラインモードの場合は早期リターン
    if (!navigator.onLine) {
      return {
        success: false, 
        error: 'オフラインモードです', 
        details: 'インターネット接続を確認してください' 
      };
    }

    // 接続テスト（軽量なクエリを実行）
    try {
      const { error } = await supabase.from('users').select('id', { count: 'exact', head: true });
      
      console.log('Supabaseクエリテスト結果:', error ? `エラー: ${error.message}` : '成功');
      
      if (error) {
        if (error.message.includes('JWT')) {
          return {
            success: false,
            error: 'APIキーが無効です',
            details: error.message
          };
        }
        
        return {
          success: false,
          error: `接続エラー: ${error.message}`,
          details: error.details || error.hint || ''
        };
      }
    } catch (queryError) {
      console.log('Supabase接続テスト(query)エラー:', queryError);
      return {
        success: false,
        error: 'クエリ実行エラー',
        details: queryError instanceof Error ? queryError.message : '不明なエラー'
      };
    }

    console.log('Supabase接続成功');
    return {
      success: true,
      error: null,
      details: 'Supabase接続成功'
    };
  } catch (error) {
    console.error('Supabase接続テストエラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
      details: '予期しないエラーが発生しました'
    };
  }
};

// ユーザーサービス
export const userService = {
  // 全ユーザーを取得
  getAllUsers: async () => {
    try {
      if (!supabase) return [];
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('全ユーザー取得エラー:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('全ユーザー取得エラー:', error);
      return [];
    }
  },
  
  // ユーザー名からユーザーを取得
  getUserByUsername: async (lineUsername: string) => {
    try {
      if (!supabase) return null;
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('line_username', lineUsername)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // ユーザーが見つからない場合
          return null;
        }
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('ユーザー取得エラー:', error);
      return null;
    }
  },
  
  // 新規ユーザーを作成
  createUser: async (lineUsername: string) => {
    try {
      if (!supabase) return null;
      
      const { data, error } = await supabase
        .from('users')
        .insert([{ line_username: lineUsername }])
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('ユーザー作成エラー:', error);
      return null;
    }
  }
};

// 日記サービス
export const diaryService = {
  // 全ユーザーの日記エントリーを取得
  getAllEntries: async () => {
    try {
      if (!supabase) return [];
      
      const { data, error } = await supabase
        .from('diary_entries')
        .select(`
          *,
          users(line_username)
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('全日記エントリー取得エラー:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('全日記エントリー取得エラー:', error);
      return [];
    }
  },
  
  // 日記エントリーを作成
  createEntry: async (entryData: any) => { 
    try {
      if (!adminSupabase) return null;
      
      // 既存のエントリーをチェック
      const { data: existingEntry, error: checkError } = await adminSupabase
        .from('diary_entries')
        .select('id')
        .eq('id', entryData.id)
        .maybeSingle();
      
      if (checkError) {
        console.error('日記エントリー確認エラー:', checkError);
        throw checkError;
      }
      
      let data;
      let error;
      
      if (existingEntry) {
        // 既存のエントリーを更新
        console.log('既存の日記エントリーを更新:', entryData.id, entryData);
        const result = await adminSupabase
          .from('diary_entries')
          .update({
            user_id: entryData.user_id,
            date: entryData.date,
            emotion: entryData.emotion,
            event: entryData.event,
            realization: entryData.realization,
            self_esteem_score: entryData.self_esteem_score,
            worthlessness_score: entryData.worthlessness_score
          })
          .eq('id', entryData.id)
          .select()
          .single();
          
        data = result.data;
        error = result.error;
      } else {
        // 新規エントリーを作成
        console.log('新規日記エントリーを作成:', entryData.id, entryData);
        const result = await adminSupabase
          .from('diary_entries')
          .insert([entryData])
          .select()
          .single();
          
        data = result.data;
        error = result.error;
      }
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('日記作成エラー:', error);
      return null;
    }
  },
  
  // 日記エントリーを更新
  updateEntry: async (id: string, updates: any) => {
    try {
      if (!adminSupabase) return null;
      
      const { data, error } = await adminSupabase
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
  
  // 日記エントリーを削除
  deleteEntry: async (id: string) => {
    try {
      if (!adminSupabase) return null;
      
      const { error } = await adminSupabase
        .from('diary_entries')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('日記削除エラー:', error);
      return null;
    }
  },
  
  // ユーザーの日記エントリーを取得
  getUserEntries: async (userId: string) => {
    try {
      if (!adminSupabase) return [];
      
      const { data, error } = await adminSupabase
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
  }
};

// チャットサービス
export const chatService = {
  // チャットメッセージを取得
  getChatMessages: async (chatRoomId: string) => {
    try {
      if (!supabase) return [];
      
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
  },
  
  // メッセージを送信
  sendMessage: async (chatRoomId: string, content: string, senderId?: string, counselorId?: string) => {
    try {
      if (!supabase) return null;
      
      const messageData: any = {
        chat_room_id: chatRoomId,
        content,
        is_counselor: !!counselorId
      };
      
      if (senderId) messageData.sender_id = senderId;
      if (counselorId) messageData.counselor_id = counselorId;
      
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
  }
};

// 同意履歴サービス
export const consentService = {
  // 全同意履歴を取得
  getAllConsentHistories: async () => { 
    try {
      console.log('全同意履歴を取得中...', supabase ? 'supabase利用可能' : 'supabase利用不可');
      if (!supabase) return [];
      
      const { data, error } = await supabase
        .from('consent_histories')
        .select('*')
        .order('consent_date', { ascending: false });
      
      if (error) {
        console.error('全同意履歴取得エラー:', error);
        console.log('同意履歴取得エラー詳細:', error.message, error.details);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('全同意履歴取得エラー:', error);
      return [];
    }
  },
  
  // 同意履歴を取得
  getUserConsentHistories: async (lineUsername: string) => {
    try {
      console.log(`ユーザー ${lineUsername} の同意履歴を取得中...`, supabase ? 'supabase利用可能' : 'supabase利用不可');
      if (!supabase) return [];
      
      const { data, error } = await supabase
        .from('consent_histories')
        .select('*')
        .eq('line_username', lineUsername)
        .order('consent_date', { ascending: false });
      
      if (error) {
        console.error('ユーザー同意履歴取得エラー:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('ユーザー同意履歴取得エラー:', error);
      return [];
    }
  }
};

// カウンセラーサービス
export const counselorService = {
  // カウンセラー情報を取得
  getCounselors: async () => {
    try {
      if (!supabase) return [];
      
      const { data, error } = await supabase
        .from('counselors')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        console.error('カウンセラー情報取得エラー:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('カウンセラー情報取得エラー:', error);
      return [];
    }
  }
};

// 同期サービス
export const syncService = {
  // 管理者モードでの同期
  adminSync: async () => { 
    try {
      console.log('管理者同期を開始します - スマートフォンのデータも含めて同期します', new Date().toISOString());
      
      // Supabaseクライアントの確認
      if (!supabase) {
        console.log('Supabaseクライアントが利用できないため、同期をスキップします', new Date().toISOString());
        
        // オフラインの場合はローカルデータのみを使用
        if (!navigator.onLine) {
          console.log('オフラインモードのため、ローカルデータのみを使用します', new Date().toISOString());
          
          // ローカルデータを取得
          const savedEntries = localStorage.getItem('journalEntries');
          if (savedEntries) {
            try {
              const entries = JSON.parse(savedEntries);
              const lineUsername = localStorage.getItem('line-username') || 'ゲスト';
              
              // 管理者用データ形式に変換
              const adminEntries = entries.map((entry: any) => ({
                ...entry,
                user: { line_username: lineUsername },
                created_at: entry.created_at || new Date().toISOString()
              }));
              
              // 管理者用データとして保存
              localStorage.setItem('admin_journalEntries', JSON.stringify(adminEntries));
              console.log(`ローカルユーザー ${lineUsername} の ${entries.length} 件のデータを管理者用データとして保存しました`);
              return true;
            } catch (error) {
              console.error('ローカルデータの解析エラー:', error);
            }
          }
        }
        
        return false;
      }
      
      console.log('管理者同期: Supabaseからデータを取得中...', new Date().toISOString());
      
      // 接続テスト
      try {
        const testResult = await testSupabaseConnection();
        if (!testResult.success) {
          console.error('Supabase接続テスト失敗:', testResult.error);
          return false;
        }
      } catch (testError) {
        console.error('Supabase接続テストエラー:', testError);
        return false;
      }
      
      // 全ユーザーを取得
      let { data: users, error: usersError } = await supabase
        .from('users')
        .select('*');
      
      if (usersError) {
        console.error('ユーザー取得エラー:', usersError);
        return false;
      }
      
      if (!users || users.length === 0) {
        console.log('Supabaseにユーザーが見つかりませんでした。ローカルユーザーを作成します。', new Date().toISOString());
        
        // 再試行: 接続が不安定な場合に備えて再度ユーザー取得を試みる
        try {
          console.log('ユーザー取得を再試行します...', new Date().toISOString());
          const { data: retryUsers, error: retryError } = await supabase
            .from('users')
            .select('*');
            
          if (!retryError && retryUsers && retryUsers.length > 0) {
            console.log(`再試行成功: ${retryUsers.length}人のユーザーを取得しました`, new Date().toISOString());
            users = retryUsers;
          } else {
            console.log('再試行失敗: ユーザーが見つかりませんでした', new Date().toISOString());
          }
        } catch (retryError) {
          console.error('ユーザー取得再試行エラー:', retryError);
        }
        
        // 再試行後もユーザーが見つからない場合はローカルユーザーを使用
        if (!users || users.length === 0) {
          // ローカルユーザーを作成
          const lineUsername = localStorage.getItem('line-username') || 'ゲスト';
          const localUser = {
            id: 'local-user-' + Date.now(),
            line_username: lineUsername,
            created_at: new Date().toISOString()
          };
          
          // ローカルデータを取得
          const savedEntries = localStorage.getItem('journalEntries');
          if (savedEntries) {
            try {
              const entries = JSON.parse(savedEntries);
              
              // 管理者用データ形式に変換
              const adminEntries = entries.map((entry: any) => ({
                ...entry,
                user: { line_username: lineUsername },
                created_at: entry.created_at || new Date().toISOString()
              }));
              
              // 管理者用データとして保存
              localStorage.setItem('admin_journalEntries', JSON.stringify(adminEntries));
              console.log(`ローカルユーザー ${lineUsername} の ${entries.length} 件のデータを管理者用データとして保存しました`, new Date().toISOString());
              return true;
            } catch (error) {
              console.error('ローカルデータの解析エラー:', error);
              return false;
            }
          } else {
            console.log('ローカルデータが見つかりませんでした');
            return false;
          }
        }
      }
      
      console.log(`管理者同期: ${users.length}人のユーザーを同期します`, new Date().toISOString());
      
      // 各ユーザーのデータを同期
      const allEntries = [];
      for (const user of users) {
        try {
          // ユーザーの日記データを取得
          const { data: entries, error } = await supabase
            .from('diary_entries')
            .select('*, users(line_username)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          
          if (error) {
            console.error(`ユーザー ${user.id} (${user.line_username}) の日記データ取得エラー:`, error);
            continue;
          }
          
          console.log(`ユーザー ${user.id} (${user.line_username}) の日記データを取得: ${entries?.length || 0}件`, new Date().toISOString());
          
          // 全エントリーに追加
          if (entries && entries.length > 0) {
            entries.forEach((entry: any) => {
              // ユーザー名を取得（ネストされたユーザーオブジェクトから）
              const userName = entry.users?.line_username || user.line_username || 'ゲスト';
              
              allEntries.push({
                id: entry.id,
                date: entry.date,
                emotion: entry.emotion,
                event: entry.event || '',
                realization: entry.realization || '',
                selfEsteemScore: entry.self_esteem_score,
                worthlessnessScore: entry.worthlessness_score,
                counselor_memo: entry.counselor_memo || '',
                is_visible_to_user: entry.is_visible_to_user || false,
                counselor_name: entry.counselor_name || '',
                assigned_counselor: entry.assigned_counselor || '',
                urgency_level: entry.urgency_level || '',
                created_at: entry.created_at || new Date().toISOString(),
                user: {
                  line_username: userName
                }
              });
            });
          }
        } catch (userError) {
          console.error(`ユーザー ${user.id} (${user.line_username}) の同期エラー:`, userError);
        }
      }
      
      // 全エントリーを管理者用のキーに保存
      if (allEntries.length > 0) {
        console.log(`合計 ${allEntries.length} 件の日記エントリーを管理者用ストレージに保存します`, new Date().toISOString());
        
        // 日付順にソート（新しい順）
        allEntries.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        localStorage.setItem('admin_journalEntries', JSON.stringify(allEntries));
        return true;
      } else {
        console.log('保存するエントリーがありませんでした', new Date().toISOString());
        return false;
      }
    } catch (error) {
      console.error('管理者同期エラー:', error);
      return false;
    }
  },
  
  // ローカルデータをSupabaseに移行
  migrateLocalData: async (userId: string) => {
    try {
      if (!supabase || !userId) {
        console.log('Supabase接続がないため、データ移行をスキップします', new Date().toISOString());
        return false;
      }
      
      // ローカルストレージから日記データを取得
      const savedEntries = localStorage.getItem('journalEntries');
      if (!savedEntries) {
        console.log('ローカルストレージに日記データがないため、データ移行をスキップします');
        return false;
      }
      
      const entries = JSON.parse(savedEntries);
      if (!entries || entries.length === 0) {
        console.log('日記エントリーが空のため、データ移行をスキップします');
        return false;
      }
      
      console.log(`${entries.length}件の日記エントリーを同期します - ユーザーID: ${userId}`);
      
      // 各エントリーをSupabaseに保存
      let successCount = 0;
      let errorCount = 0;
      console.log(`${entries.length}件のエントリーを同期開始 - ユーザーID: ${userId}`, new Date().toISOString());
      
      for (const entry of entries) {
        // 既存のエントリーをチェック
        try {
          const { data: existingEntry, error: checkError } = await supabase
            .from('diary_entries')
            .select('id')
            .eq('id', entry.id)
            .maybeSingle();
          
          if (checkError) {
            console.error(`エントリー ${entry.id} の確認エラー:`, checkError);
            errorCount++;
            continue;
          }
          
          if (existingEntry) {
            // 既存のエントリーを更新
            const { error: updateError } = await supabase
              .from('diary_entries')
              .update({
                date: entry.date,
                emotion: entry.emotion,
                event: entry.event,
                realization: entry.realization,
                self_esteem_score: entry.selfEsteemScore || 0,
                worthlessness_score: entry.worthlessnessScore || 0,
                counselor_memo: entry.counselor_memo,
                is_visible_to_user: entry.is_visible_to_user,
                counselor_name: entry.counselor_name
              })
              .eq('id', entry.id);
              
            if (updateError) {
              console.error(`エントリー ${entry.id} の更新エラー:`, updateError, new Date().toISOString());
              errorCount++;
            } else {
              successCount++;
            }
          } else {
            // 新しいエントリーを作成
            console.log(`エントリー ${entry.id} を新規作成します`, new Date().toISOString());
            const { error: insertError } = await supabase
              .from('diary_entries')
              .insert([{
                id: entry.id,
                user_id: userId,
                date: entry.date,
                emotion: entry.emotion,
                event: entry.event || '',
                realization: entry.realization || '',
                self_esteem_score: entry.selfEsteemScore || 0,
                worthlessness_score: entry.worthlessnessScore || 0,
                counselor_memo: entry.counselor_memo,
                is_visible_to_user: entry.is_visible_to_user,
                counselor_name: entry.counselor_name
              }]);
              
            if (insertError) {
              console.error(`エントリー ${entry.id} の作成エラー:`, insertError, new Date().toISOString());
              errorCount++;
            } else {
              successCount++;
            }
          }
        } catch (entryError) {
          console.error(`エントリー ${entry.id} の処理中にエラーが発生:`, entryError, new Date().toISOString());
          errorCount++;
        }
      }
      
      console.log(`同期完了: 成功=${successCount}, 失敗=${errorCount}`);
      
      // 最終同期時間を更新
      localStorage.setItem('last_sync_time', new Date().toISOString());
      
      return true;
    } catch (error) {
      console.error('データ移行エラー:', error);
      return false;
    }
  },

  // 最新の日記エントリーのみを同期する関数
  syncRecentEntries: async (userId: string) => {
    try {
      if (!supabase || !userId) {
        console.log('Supabase接続がないため、最新エントリー同期をスキップします');
        return false;
      }

      const localEntries = localStorage.getItem('journalEntries');
      if (!localEntries) {
        console.log('ローカルエントリーがないため、最新エントリー同期をスキップします');
        return false;
      }

      const entries = JSON.parse(localEntries);
      // 最新の5件のエントリーを取得
      const recentEntries = entries && entries.length > 0 ? entries.slice(0, 5) : [];
      
      if (recentEntries.length === 0) {
        console.log('同期する最新エントリーがありません');
        return false;
      }

      console.log(`最新の${recentEntries.length}件のエントリーを同期します`);
      
      let successCount = 0;
      for (const entry of recentEntries) {
        try {
          // 既存のエントリーをチェック
          const { data: existingEntry, error: checkError } = await supabase
            .from('diary_entries')
            .select('id')
            .eq('id', entry.id)
            .maybeSingle();
          
          if (checkError) {
            console.error(`エントリー ${entry.id} の確認エラー:`, checkError);
            continue;
          }
          
          if (existingEntry) {
            // 既存のエントリーを更新
            const { error: updateError } = await supabase
              .from('diary_entries')
              .update({
                date: entry.date,
                emotion: entry.emotion,
                event: entry.event,
                realization: entry.realization,
                self_esteem_score: entry.selfEsteemScore || 0,
                worthlessness_score: entry.worthlessnessScore || 0
              })
              .eq('id', entry.id);
              
            if (updateError) {
              console.error(`エントリー ${entry.id} の更新エラー:`, updateError);
            } else {
              successCount++;
            }
          } else {
            // 新規エントリーを作成
            const { error: insertError } = await supabase
              .from('diary_entries')
              .insert([{
                id: entry.id,
                user_id: userId,
                date: entry.date,
                emotion: entry.emotion,
                event: entry.event,
                realization: entry.realization,
                self_esteem_score: entry.selfEsteemScore || 0,
                worthlessness_score: entry.worthlessnessScore || 0
              }]);
              
            if (insertError) {
              console.error(`エントリー ${entry.id} の作成エラー:`, insertError);
            } else {
              successCount++;
            }
          }
        } catch (entryError) {
          console.error(`エントリー ${entry.id} の同期エラー:`, entryError);
        }
      }
      
      console.log(`最新エントリー同期完了: ${successCount}/${recentEntries.length}件成功`);
      return successCount > 0;
    } catch (error) {
      console.error('最新エントリー同期エラー:', error);
      return false;
    }
  },
  
  // Supabaseからローカルに同期
  syncToLocal: async (userId: string) => {
    try {
      if (!supabase) return false;
      
      // Supabaseから日記データを取得
      const { data, error } = await supabase
        .from('diary_entries')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      if (!data || data.length === 0) return false;
      
      // ローカルストレージのデータと統合
      const savedEntries = localStorage.getItem('journalEntries');
      const localEntries = savedEntries ? JSON.parse(savedEntries) : [];
      
      // IDをキーとしたマップを作成
      const entriesMap = new Map();
      
      // ローカルデータをマップに追加
      localEntries.forEach((entry: any) => {
        entriesMap.set(entry.id, entry);
      });
      
      // Supabaseデータをマップに追加（同じIDの場合は上書き）
      data.forEach((entry) => {
        entriesMap.set(entry.id, {
          id: entry.id,
          date: entry.date,
          emotion: entry.emotion,
          event: entry.event,
          realization: entry.realization,
          selfEsteemScore: entry.self_esteem_score,
          worthlessnessScore: entry.worthlessness_score,
          counselor_memo: entry.counselor_memo,
          is_visible_to_user: entry.is_visible_to_user,
          counselor_name: entry.counselor_name
        });
      });
      
      // マップから配列に変換
      const mergedEntries = Array.from(entriesMap.values());
      
      // ローカルストレージに保存
      localStorage.setItem('journalEntries', JSON.stringify(mergedEntries));
      
      return true;
    } catch (error) {
      console.error('同期エラー:', error);
      return false;
    }
  },
  
  // 同意履歴をSupabaseに同期
  syncConsentHistories: async () => {
    try {
      if (!supabase) return false;
      console.log('同意履歴をSupabaseに同期開始');
      
      // ローカルストレージから同意履歴を取得
      const savedHistories = localStorage.getItem('consent_histories');
      if (!savedHistories) {
        console.log('ローカルストレージに同意履歴がないため、同期をスキップします');
        return false;
      }
      
      const histories = JSON.parse(savedHistories);
      if (!histories || histories.length === 0) {
        console.log('同意履歴が空のため、同期をスキップします');
        return false;
      }
      
      console.log(`${histories.length}件の同意履歴を同期します`);
      
      // 各履歴をSupabaseに保存
      let successCount = 0;
      for (const history of histories) {
        try {
          // 既存の履歴をチェック
          const { data: existingHistory, error: checkError } = await supabase
            .from('consent_histories')
            .select('id')
            .eq('line_username', history.line_username)
            .eq('consent_date', history.consent_date)
            .maybeSingle();
          
          if (checkError && checkError.code !== 'PGRST116') {
            console.error(`同意履歴 ${history.line_username} の確認エラー:`, checkError);
            continue;
          }
          
          if (!existingHistory) {
            // 新しい履歴を作成
            const { error: insertError } = await supabase
              .from('consent_histories')
              .insert([{
                line_username: history.line_username,
                consent_date: history.consent_date,
                consent_given: history.consent_given,
                ip_address: history.ip_address || 'unknown',
                user_agent: history.user_agent || navigator.userAgent
                user_agent: history.user_agent || navigator.userAgent
              }]);
              
            if (insertError) {
              console.error(`同意履歴 ${history.line_username} の作成エラー:`, insertError);
            } else {
              successCount++;
            }
          }
        } catch (historyError) {
          console.error(`同意履歴 ${history.line_username} の同期エラー:`, historyError);
        }
      }
      
      console.log(`同意履歴同期完了: ${successCount}/${histories.length}件成功`);
      return successCount > 0;
    } catch (error) {
      console.error('同意履歴同期エラー:', error);
      return false;
    }
  },
  
  // Supabaseから同意履歴をローカルに同期
  syncConsentHistoriesToLocal: async () => {
    try {
      if (!supabase) return false;
      
      // Supabaseから同意履歴を取得
      const { data, error } = await supabase
        .from('consent_histories')
        .select('*')
        .order('consent_date', { ascending: false });
      
      if (error) throw error;
      
      if (!data || data.length === 0) return false;
      
      // ローカルストレージに保存
      localStorage.setItem('consent_histories', JSON.stringify(data));
      
      return true;
    } catch (error) {
      console.error('同意履歴同期エラー:', error);
      return false;
    }
  },
  
  // ユーザーの日記エントリー数を取得する関数
  getUserEntryCount: async (userId: string) => {
    try {
      if (!supabase) return { data: 0, error: new Error('Supabase接続がありません') };
      
      const { count, error } = await supabase
        .from('diary_entries')
        .select('id', { count: 'exact' })
        .eq('user_id', userId);
      
      return { data: count || 0, error };
    } catch (error) {
      console.error('エントリー数取得エラー:', error);
      return { data: 0, error };
    }
  },
  
  // 全ユーザーの日記エントリー数を取得する関数
  getTotalEntryCount: async () => {
    try {
      if (!supabase) return { data: 0, error: new Error('管理者接続がありません') };
      
      const { count, error } = await supabase
        .from('diary_entries')
        .select('id', { count: 'exact' });
      
      return { data: count || 0, error };
    } catch (error) {
      console.error('全エントリー数取得エラー:', error);
      return { data: 0, error };
    }
  },
  
  // 強制同期を実行する関数
  forceSync: async (userId: string) => {
    try {
      console.log(`強制同期を開始します - ユーザーID: ${userId} - スマートフォンのデータも含めて同期します`, new Date().toISOString());
      
      if (!supabase) {
        console.log('Supabase接続がないため、強制同期をスキップします', new Date().toISOString());
        return false;
      }
      
      if (!navigator.onLine) {
        console.log('オフラインモードのため、強制同期をスキップします', new Date().toISOString());
        return false;
      }
      
      // 接続テスト
      try {
        const testResult = await testSupabaseConnection();
        if (!testResult.success) {
          console.error('Supabase接続テスト失敗:', testResult.error);
          return false;
        }
      } catch (testError) {
        console.error('Supabase接続テストエラー:', testError);
        return false;
      }
      
      // ローカルストレージから日記データを取得
      const savedEntries = localStorage.getItem('journalEntries');
      if (!savedEntries) {
        console.log('ローカルデータがないため、強制同期をスキップします', new Date().toISOString());
        return false;
      }
      
      const entries = JSON.parse(savedEntries);
      if (!entries || entries.length === 0) {
        console.log('日記エントリーが空のため、強制同期をスキップします', new Date().toISOString());
        return false;
      }
      
      // ローカルデータをSupabaseに同期
      console.log(`強制同期: ${entries.length}件の日記エントリーを同期します - ユーザーID: ${userId}`, new Date().toISOString());
      
      // 各エントリーをSupabaseに保存
      let successCount = 0;
      let errorCount = 0;
      
      for (const entry of entries) {
        console.log(`エントリー ${entry.id} を同期中...`, new Date().toISOString());
        try {
          // 既存のエントリーをチェック
          const { data: existingEntry, error: checkError } = await supabase
            .from('diary_entries')
            .select('id')
            .eq('id', entry.id)
            .maybeSingle();
          
          if (checkError && checkError.code !== 'PGRST116') { // PGRST116はレコードが見つからないエラー
            console.error(`エントリー ${entry.id} の確認エラー:`, checkError, new Date().toISOString());
            errorCount++;
            continue;
          }
          
          if (existingEntry) {
            // 既存のエントリーを更新
            console.log(`エントリー ${entry.id} を更新します`, new Date().toISOString());
            const { error: updateError } = await supabase
              .from('diary_entries')
              .update({
                date: entry.date,
                emotion: entry.emotion,
                event: entry.event || '',
                realization: entry.realization || '',
                self_esteem_score: entry.selfEsteemScore || 0,
                worthlessness_score: entry.worthlessnessScore || 0,
                counselor_memo: entry.counselor_memo,
                is_visible_to_user: entry.is_visible_to_user,
                counselor_name: entry.counselor_name
              })
              .eq('id', entry.id);
              
            if (updateError) {
              console.error(`エントリー ${entry.id} の更新エラー:`, updateError, new Date().toISOString());
              errorCount++;
            } else {
              successCount++;
            }
          } else {
            // 新しいエントリーを作成
            console.log(`エントリー ${entry.id} を新規作成します`, new Date().toISOString());
            const { error: insertError } = await supabase
              .from('diary_entries')
              .insert([{
                id: entry.id,
                user_id: userId,
                date: entry.date,
                emotion: entry.emotion,
                event: entry.event || '',
                realization: entry.realization || '',
                self_esteem_score: entry.selfEsteemScore || 0,
                worthlessness_score: entry.worthlessnessScore || 0,
                counselor_memo: entry.counselor_memo,
                is_visible_to_user: entry.is_visible_to_user,
                counselor_name: entry.counselor_name
              }]);
              
            if (insertError) {
              console.error(`エントリー ${entry.id} の作成エラー:`, insertError, new Date().toISOString());
              errorCount++;
            } else {
              successCount++;
            }
          }
        } catch (entryError) {
          console.error(`エントリー ${entry.id} の処理中にエラーが発生:`, entryError, new Date().toISOString());
          errorCount++;
        }
      }
      
      // Supabaseからデータを取得して、ローカルに同期（スマートフォンのデータを取得するため）
      try {
        console.log('Supabaseからデータを取得して、ローカルに同期します', new Date().toISOString());
        const { data: supabaseEntries, error: fetchError } = await supabase
          .from('diary_entries')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
          
        if (fetchError) {
          console.error('Supabaseからのデータ取得エラー:', fetchError);
        } else if (supabaseEntries && supabaseEntries.length > 0) {
          console.log(`Supabaseから ${supabaseEntries.length} 件のデータを取得しました`, new Date().toISOString());
          
          // ローカルデータと統合
          await syncService.syncToLocal(userId);
          
          // 成功カウントを更新
          successCount += supabaseEntries.length;
        } else {
          console.log('Supabaseにデータがありませんでした', new Date().toISOString());
        }
      } catch (fetchError) {
        console.error('Supabaseからのデータ取得エラー:', fetchError);
      }
      
      // 同期ログを記録（可能な場合）
      try {
        await syncService.logSyncOperation(
          userId,
          'force',
          successCount,
          errorCount === 0,
          errorCount > 0 ? `${errorCount}件のエントリーで同期エラーが発生しました` : undefined
        );
      } catch (logError) {
        console.error('同期ログ記録エラー:', logError);
      }
      
      console.log(`強制同期完了: 成功=${successCount}, 失敗=${errorCount}`, new Date().toISOString());
      
      // 管理者同期も実行して、管理画面のデータを更新
      try {
        console.log('管理者同期も実行して管理画面のデータを更新します', new Date().toISOString());
        const adminSyncResult = await syncService.adminSync();
      } catch (adminSyncError) {
        console.error('管理者同期エラー:', adminSyncError);
      }
      
      return successCount > 0;
    } catch (error) {
      console.error('強制同期エラー:', error);
      return false;
    }
  }
};

export default syncService;