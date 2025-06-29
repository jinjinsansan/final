import { useState, useEffect, useRef } from 'react';
import { useSupabase } from './useSupabase';
import { supabase, userService, syncService, diaryService, adminSupabase } from '../lib/supabase';
import { getCurrentUser, logSecurityEvent, getAuthSession } from '../lib/deviceAuth';

interface AutoSyncStatus {
  isAutoSyncEnabled: boolean;
  lastSyncTime: string | null;
  syncInProgress: boolean;
  syncError: string | null;
  userCreated: boolean;
}

export const useAutoSync = () => {
  const { isConnected, currentUser, initializeUser } = useSupabase();
  const [isFirstRun, setIsFirstRun] = useState(true);
  const [status, setStatus] = useState<AutoSyncStatus>({
    isAutoSyncEnabled: localStorage.getItem('auto_sync_enabled') !== 'false', // デフォルトで有効
    lastSyncTime: null,
    syncInProgress: false,
    syncError: null,
    userCreated: false
  });
  
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedRef = useRef(false);

  // 自動同期の設定を読み込み
  useEffect(() => {
    // 明示的に無効化されていない限り有効とする
    const autoSyncEnabled = localStorage.getItem('auto_sync_enabled') !== 'false'; 
    const lastSync = localStorage.getItem('last_sync_time');
    
    setStatus(prev => ({
      ...prev,
      isAutoSyncEnabled: autoSyncEnabled,
      lastSyncTime: lastSync,
      userCreated: !!currentUser
    }));
  }, [currentUser]);

  // 接続状態が変わった時の自動処理
  useEffect(() => {
    if (!hasInitializedRef.current && isConnected) {
      console.log('自動同期: 接続状態が変わりました - 自動初期化を開始します', new Date().toISOString()); 
      const lineUsername = localStorage.getItem('line-username');
      if (lineUsername) {
        const trimmedUsername = lineUsername.trim();
        console.log('自動同期: ユーザー名が見つかりました:', trimmedUsername, new Date().toISOString());
        // 少し遅延させて実行（他の初期化処理が完了するのを待つ）
        setTimeout(() => {
          handleAutoInitialization(trimmedUsername);
        }, 1000);
        hasInitializedRef.current = true;
      } else {
        console.log('自動同期: ユーザー名が見つかりません', new Date().toISOString());
        hasInitializedRef.current = true;
      }
    }
  }, [isConnected]);

  // 初回実行時に自動的にユーザー作成と同期を行う
  useEffect(() => {
    if (isFirstRun && isConnected && status.isAutoSyncEnabled) {
      const lineUsername = localStorage.getItem('line-username'); 
      const session = getAuthSession();
      
      if (lineUsername && !session) {
        console.log('初回実行: 自動ユーザー作成と同期を開始します', new Date().toISOString());
        setTimeout(() => {
          handleAutoInitialization(lineUsername);
          setIsFirstRun(false);
        }, 2000);
      } else {
        setIsFirstRun(false);
      }
    }
  }, [isFirstRun, isConnected, status.isAutoSyncEnabled]);

  // 自動初期化処理
  const handleAutoInitialization = async (lineUsername: string) => {
    try {
      const trimmedUsername = lineUsername.trim();
      console.log('自動同期: 自動初期化を開始します:', trimmedUsername, new Date().toISOString());
      setStatus(prev => ({ ...prev, syncInProgress: true, syncError: null }));
      
      let user = await userService.getUserByUsername(trimmedUsername);
      console.log('自動同期: ユーザー検索結果:', user ? 'ユーザーが見つかりました' : 'ユーザーが見つかりませんでした');

      if (!user) {
        if (import.meta.env.DEV) {
          console.log('ユーザーが存在しないため、自動作成します', new Date().toISOString());
        }
        
        try {
          logSecurityEvent('auto_sync_create_user', trimmedUsername, 'ユーザーが存在しないため、自動作成します');
        } catch (logError) {
          console.error('セキュリティログ記録エラー:', logError);
        }
        
        user = await userService.createUser(trimmedUsername);

        if (user) {
          console.log('自動同期: ユーザーを作成しました:', user.id, trimmedUsername, new Date().toISOString());
          setStatus(prev => ({ 
            ...prev, 
            userCreated: true, 
            syncError: null,
            syncInProgress: false
          }));
          
          // ユーザー作成後、アプリの状態を更新
          if (initializeUser) {
            await initializeUser(trimmedUsername); 
          }
        }
      } else {
        console.log('自動同期: ユーザーは既に存在します:', user.id, trimmedUsername, new Date().toISOString());
        setStatus(prev => ({ 
          ...prev, 
          userCreated: true, 
          syncError: null,
          syncInProgress: false
        }));
        
        // 既存ユーザーの場合も、アプリの状態を更新
        if (initializeUser) {
          console.log('自動同期: 既存ユーザーの状態を更新します', trimmedUsername, new Date().toISOString());
          await initializeUser(trimmedUsername);
        }
      }

      // 自動同期が有効な場合はデータ同期を実行
      if (user) {
        console.log('自動同期: データ同期を開始します', new Date().toISOString()); 
        await performAutoSync(user.id);
      }
    } catch (error) {
      console.error('自動初期化エラー:', error);
      setStatus(prev => ({ 
        ...prev,
        // エラーメッセージを詳細に表示
        syncError: error instanceof Error 
          ? `初期化エラー: ${error.message}` 
          : '初期化に失敗しました。ネットワーク接続を確認してください。',
        syncInProgress: false
      }));
    } finally {
      setStatus(prev => ({ ...prev, syncInProgress: false }));
    }
  };

  // 自動同期実行
  const performAutoSync = async (userId: string) => {
    try {
      if (!userId || typeof userId !== 'string') {
        console.error('自動同期エラー: 無効なユーザーID:', userId);
        setStatus(prev => ({ 
          ...prev, 
          syncInProgress: false,
          syncError: '無効なユーザーID'
        }));
        return;
      }
      
      console.log(`自動同期: データ同期を開始します - ユーザーID: ${userId}`, new Date().toISOString());
      console.log('自動同期ステータス:', status.isAutoSyncEnabled ? '有効' : '無効');
      setStatus(prev => ({ ...prev, syncInProgress: true, syncError: null }));
      
      // ローカルデータの存在確認
      const localEntries = localStorage.getItem('journalEntries');
      const localConsents = localStorage.getItem('consent_histories');
      
      let diarySync = false;
      let consentSync = false;

      // 日記データの同期
      if (localEntries) {
        const entries = JSON.parse(localEntries);
        if (entries && entries.length > 0) {
          console.log(`自動同期: ${entries.length}件の日記データを同期します - ユーザーID: ${userId}`, new Date().toISOString());
          await syncService.migrateLocalData(userId);
          diarySync = true;
          if (import.meta.env.DEV) {
            console.log('日記データを自動同期しました');
          }
        }
      }
      
      // 最新の日記エントリーを直接Supabaseに保存（バックアップとして）
      try {
        const localEntries = localStorage.getItem('journalEntries');
        if (localEntries && supabase) { 
          const entries = JSON.parse(localEntries);
          // 最新の5件のエントリーを取得
          const recentEntries = entries && entries.length > 0 ? entries.slice(0, 5) : [];
          
          for (const entry of recentEntries) {
            try {
              // 既存のエントリーをチェック
              const { data: existingEntry } = await supabase
                .from('diary_entries')
                .select('id')
                .eq('id', entry.id)
                .maybeSingle();
              
              if (existingEntry) {
                // 既存のエントリーを更新
                await supabase
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
              } else {
                // 新規エントリーを作成
                await supabase
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
              }
            } catch (entryError) {
              console.error(`エントリー ${entry.id} の同期エラー:`, entryError);
            }
          }
        }
      } catch (directSyncError) {
        console.error('直接同期エラー:', directSyncError);
      }

      // 同意履歴の同期
      if (localConsents) {
        const consents = JSON.parse(localConsents);
        if (consents && consents.length > 0) {
          console.log(`自動同期: ${consents.length}件の同意履歴を同期します`, new Date().toISOString());
          await syncService.syncConsentHistories();
          consentSync = true;
          if (import.meta.env.DEV) {
            console.log('同意履歴を自動同期しました');
          }
        }
      }

      if (true) { // 常に同期時間を更新
        const now = new Date().toISOString();
        localStorage.setItem('last_sync_time', now);
        console.log(`自動同期: 同期が完了しました - 日記: ${diarySync ? '成功' : '未実行'}, 同意履歴: ${consentSync ? '成功' : '未実行'} - ${now}`);
        
        try {
          logSecurityEvent('auto_sync_completed', userId, '自動同期が完了しました');
        } catch (error) {
          console.error('セキュリティログ記録エラー:', error);
        }
        
        setStatus(prev => ({ ...prev, lastSyncTime: now }));
      } else {
        console.log('自動同期: 同期するデータがありませんでした - ユーザーID: ' + userId, new Date().toISOString());
      }

    } catch (error) {
      console.error('自動同期エラー:', error);
      setStatus(prev => ({ 
        ...prev, 
        syncInProgress: false,
        syncError: error instanceof Error ? error.message : '同期に失敗しました'
      }));
    }
  };

  // 自動同期の有効/無効切り替え
  const toggleAutoSync = async (enabled: boolean) => {
    localStorage.setItem('auto_sync_enabled', enabled.toString());
    console.log('自動同期設定を変更:', enabled ? '有効' : '無効');
    try {
      const user = getCurrentUser();
      logSecurityEvent('auto_sync_toggled', user?.lineUsername || 'system', `自動同期が${enabled ? '有効' : '無効'}になりました`);
    } catch (error) {
      console.error('セキュリティログ記録エラー:', error);
    }

    setStatus(prev => ({ ...prev, isAutoSyncEnabled: enabled }));

    // 有効にした場合は即座に同期を実行
    if (enabled && isConnected && currentUser) {
      try {
        await performAutoSync(currentUser.id);
      } catch (error) {
        console.error('自動同期実行エラー:', error);
      }
    }
  };

  // 手動同期実行
  const triggerManualSync = async () => {
    setStatus(prev => ({ ...prev, syncInProgress: true, syncError: null }));
    console.log('手動同期を開始します', new Date().toISOString());

    try {
      if (!isConnected || !currentUser) {
        throw new Error('Supabaseに接続されていないか、ユーザーが設定されていません');
      }
      
      await performAutoSync(currentUser.id);
      console.log('手動同期が完了しました - ユーザーID: ' + currentUser.id, new Date().toISOString());
      
      try {
        const user = getCurrentUser();
        logSecurityEvent('manual_sync_triggered', user?.lineUsername || currentUser.id, '手動同期が実行されました');
      } catch (error) {
        console.error('セキュリティログ記録エラー:', error);
      }
    } finally {
      setStatus(prev => ({ ...prev, syncInProgress: false }));
    }
  };

  // 定期同期の設定（5分間隔）
  useEffect(() => { 
    if (status.isAutoSyncEnabled && isConnected && currentUser) {
      // 前回のタイマーをクリア
      if (syncTimeoutRef.current) {
        clearInterval(syncTimeoutRef.current);
      }
      
      syncTimeoutRef.current = setInterval(() => {
        performAutoSync(currentUser.id).catch(error => { 
          console.error('自動同期エラー:', error);
        });
      }, 5 * 60 * 1000); // 5分

      return () => {
        if (syncTimeoutRef.current) {
          clearInterval(syncTimeoutRef.current);
        }
      };
    } else if (syncTimeoutRef.current) {
      clearInterval(syncTimeoutRef.current);
    }
  }, [status.isAutoSyncEnabled, isConnected, currentUser]);

  // コンポーネントがアンマウントされる際にタイマーをクリア
  useEffect(() => { 
    return () => {
      if (syncTimeoutRef.current) {
        clearInterval(syncTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...status,
    toggleAutoSync,
    triggerManualSync,
    isConnected,
    currentUser,
    performAutoSync
  };
};