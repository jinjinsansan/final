import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// 環境変数からSupabase接続情報を取得（デバッグ用にコンソール出力）
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

// 接続情報のデバッグ出力（本番環境では詳細を隠す）
console.log('Supabase URL:', supabaseUrl ? `${supabaseUrl.substring(0, 8)}...` : 'not set');
console.log('Supabase Key:', supabaseAnonKey ? 'Key is set' : 'Key is not set');
console.log('Supabase Service Role Key:', supabaseServiceRoleKey ? 'Service Role Key is set' : 'Service Role Key is not set');

// Supabaseクライアントの作成（環境変数が設定されている場合のみ）
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;
  
// 管理者用Supabaseクライアント（サービスロールキーを使用）
export const adminSupabase = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : null;

// Supabase接続テスト関数
export const testSupabaseConnection = async () => {
  console.log('Supabase接続をテスト中...');
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
      return {
        success: false,
        error: 'オフラインモードです',
        details: 'インターネット接続を確認してください'
      };
    }

    // 接続エラーを防ぐためのフォールバック
    try {
      // 軽量な接続テスト
      console.log('Supabase API接続テスト中...');
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

// 同期サービス
export const syncService = {
  // 管理者モードでの同期
  adminSync: async () => {
    try {
      // 管理者用Supabaseクライアントの確認
      if (!supabase) {
        console.log('Supabaseクライアントが利用できないため、同期をスキップします');
        return false;
      }
      
      // 全ユーザーを取得
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*');
      
      if (usersError) {
        console.error('ユーザー取得エラー:', usersError);
        return false;
      }
      
      if (!users || users.length === 0) {
        console.log('ユーザーが見つかりませんでした');
        return false;
      }
      
      console.log(`管理者同期: ${users.length}人のユーザーを同期します`);
      
      // 各ユーザーのデータを同期
      const allEntries = [];
      for (const user of users) {
        try {
          // ユーザーの日記データを取得
          const { data: entries, error } = await supabase
            .from('diary_entries')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          
          if (error) {
            console.error(`ユーザー ${user.id} の日記データ取得エラー:`, error);
            continue;
          }
          
          console.log(`ユーザー ${user.id} の日記データを取得: ${entries?.length || 0}件`);
          
          // 全エントリーに追加
          if (entries && entries.length > 0) {
            entries.forEach(entry => {
              allEntries.push({
                id: entry.id,
                date: entry.date,
                emotion: entry.emotion,
                event: entry.event,
                realization: entry.realization,
                selfEsteemScore: entry.self_esteem_score,
                worthlessnessScore: entry.worthlessness_score,
                counselor_memo: entry.counselor_memo,
                is_visible_to_user: entry.is_visible_to_user,
                counselor_name: entry.counselor_name,
                assigned_counselor: entry.assigned_counselor,
                urgency_level: entry.urgency_level,
                created_at: entry.created_at,
                user: {
                  line_username: user.line_username
                }
              });
            });
          }
        } catch (userError) {
          console.error(`ユーザー ${user.id} の同期エラー:`, userError);
        }
      }
      
      // 全エントリーを管理者用のキーに保存
      if (allEntries.length > 0) {
        console.log(`合計 ${allEntries.length} 件の日記エントリーを管理者用ストレージに保存します`);
        localStorage.setItem('admin_journalEntries', JSON.stringify(allEntries));
      } else {
        console.log('保存するエントリーがありませんでした');
      }
      
      return true;
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
              console.error(`エントリー ${entry.id} の更新エラー:`, updateError);
              errorCount++;
            } else {
              successCount++;
            }
          } else {
            // 新しいエントリーを作成
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
                worthlessness_score: entry.worthlessnessScore || 0,
                counselor_memo: entry.counselor_memo,
                is_visible_to_user: entry.is_visible_to_user,
                counselor_name: entry.counselor_name
              }]);
              
            if (insertError) {
              console.error(`エントリー ${entry.id} の作成エラー:`, insertError);
              errorCount++;
            } else {
              successCount++;
            }
          }
        } catch (entryError) {
          console.error(`エントリー ${entry.id} の処理中にエラーが発生:`, entryError);
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
      if (!savedHistories) return false;
      
      const histories = JSON.parse(savedHistories);
      if (!histories || histories.length === 0) return false;
      
      // 各履歴をSupabaseに保存
      for (const history of histories) {
        // IDがUUID形式かチェック
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(history.id);
        
        // UUIDでない場合は新しいUUIDを生成
        const historyId = isUuid ? history.id : crypto.randomUUID();
        console.log(`同意履歴ID: ${history.id} -> ${historyId} (UUID形式: ${isUuid})`);
        
        // 既存の履歴をチェック
        let existingHistory = null;
        try { 
          const { data, error } = await supabase
            .from('consent_histories')
            .select('id')
            .eq('id', historyId)
            .maybeSingle();
          
          if (error) {
            console.error('同意履歴確認エラー:', error);
          } else {
            existingHistory = data;
          }
        } catch (checkError) {
          console.error('同意履歴確認中にエラーが発生:', checkError);
        }
        
        if (!existingHistory) {
          // 新しい履歴を作成
          try {
            const { error } = await supabase
              .from('consent_histories')
              .insert([{
                id: historyId,
                line_username: history.line_username,
                consent_given: history.consent_given,
                consent_date: history.consent_date,
                ip_address: history.ip_address || 'unknown',
                user_agent: history.user_agent || navigator.userAgent
              }]);
            
            if (error) {
              console.error('同意履歴作成エラー:', error);
            } else {
              console.log(`同意履歴を作成しました: ${historyId}`);
            }
          } catch (insertError) {
            console.error('同意履歴作成中にエラーが発生:', insertError);
          }
        }
      }
      
      return true;
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