import { supabase, adminSupabase } from './supabase';

// 同期サービス
export const syncService = {
  // 同期ログを記録する関数
  logSyncOperation: async (userId: string, syncType: 'auto' | 'manual' | 'force', entriesCount: number, success: boolean, errorMessage?: string) => {
    try {
      if (!supabase) return null;
      
      const { data, error } = await supabase.rpc('log_sync_operation', {
        p_user_id: userId,
        p_sync_type: syncType,
        p_entries_count: entriesCount,
        p_success: success,
        p_error_message: errorMessage
      });
      
      if (error) {
        console.error('同期ログ記録エラー:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('同期ログ記録エラー:', error);
      return null;
    }
  },
  
  // 同期ログを取得する関数
  getSyncLogs: async (userId?: string, limit = 10) => {
    try {
      if (!supabase) return [];
      
      let query = supabase
        .from('sync_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('同期ログ取得エラー:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('同期ログ取得エラー:', error);
      return [];
    }
  },
  
  // 強制同期を実行する関数
  forceSync: async (userId: string) => {
    try {
      if (!supabase) return false;
      
      // ローカルストレージから日記データを取得
      const savedEntries = localStorage.getItem('journalEntries');
      if (!savedEntries) return false;
      
      const entries = JSON.parse(savedEntries);
      if (!entries || entries.length === 0) return false;
      
      console.log(`強制同期: ${entries.length}件の日記エントリーを同期します - ユーザーID: ${userId}`);
      
      // 各エントリーをSupabaseに保存
      let successCount = 0;
      let errorCount = 0;
      
      for (const entry of entries) {
        try {
          // 既存のエントリーをチェック
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
      
      // 同期ログを記録
      await syncService.logSyncOperation(
        userId,
        'force',
        successCount,
        errorCount === 0,
        errorCount > 0 ? `${errorCount}件のエントリーで同期エラーが発生しました` : undefined
      );
      
      console.log(`強制同期完了: 成功=${successCount}, 失敗=${errorCount}`);
      return successCount > 0;
    } catch (error) {
      console.error('強制同期エラー:', error);
      
      // 同期ログを記録
      await syncService.logSyncOperation(
        userId,
        'force',
        0,
        false,
        error instanceof Error ? error.message : String(error)
      );
      
      return false;
    }
  }

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
      if (!adminSupabase) return { data: 0, error: new Error('管理者接続がありません') };
      
      const { count, error } = await adminSupabase
        .from('diary_entries')
        .select('id', { count: 'exact' });
      
      return { data: count || 0, error };
    } catch (error) {
      console.error('全エントリー数取得エラー:', error);
      return { data: 0, error };
    }
  }
};

export default syncService;