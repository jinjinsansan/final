import { useState, useEffect } from 'react';
import { supabase, userService, diaryService, syncService, testSupabaseConnection } from '../lib/supabase';
import { getAuthSession, logSecurityEvent } from '../lib/deviceAuth';

export const useSupabase = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastAttemptTime, setLastAttemptTime] = useState(0);

  useEffect(() => {
    checkConnection(true);
  }, []);

  const checkConnection = async (isInitialCheck = false) => {
    const now = Date.now();
    // 最後の接続試行から3秒以上経過している場合のみ実行
    if (!isInitialCheck && now - lastAttemptTime < 3000) {
      console.log('接続チェックをスキップ: 前回の試行から3秒経過していません');
      return;
    }
    
    setLastAttemptTime(now);
    setLoading(true);
    
    if (isInitialCheck) {
      setError(null);
    }
    
    if (!supabase) {
      console.log('Supabase未設定 - ローカルモードで動作');
      setIsConnected(false);
      setError('Supabase接続エラー: 設定が見つかりません');
      setLoading(false);
      return;
    }
    
    try {
      // 新しい接続テスト関数を使用
      console.log(`Checking Supabase connection... (attempt: ${retryCount + 1})`);
      const result = await testSupabaseConnection();
      
      if (!result.success) {
        console.error('Supabase接続エラー:', result.error, result.details);
        setIsConnected(false);

        if (result.error === 'APIキーが無効です') {
          setError('接続エラー: APIキーが無効です');
        } else {
          setError(`${result.error}`);
        }
      } else {
        console.log('Supabase接続成功');
        setIsConnected(true);
        setError(null);
        
        // 既存ユーザーの確認
        const session = getAuthSession();
        if (session) {
          await initializeUser(session.lineUsername);
        }
      }
    } catch (error) {
      console.error('接続チェックエラー:', error);
      setError(error instanceof Error ? error.message : '不明なエラー');
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };
  
  // 接続を再試行する関数
  const retryConnection = () => {
    if (retryCount < 5) {
      console.log(`接続を再試行します... (${retryCount + 1}/5)`);
      setRetryCount(prev => prev + 1);
      setError(null);
      checkConnection(false);
    } else {
      setError('接続の再試行回数が上限に達しました。しばらく時間をおいてから再度お試しください。');
    }
  };

  const initializeUser = async (lineUsername: string) => {
    if (!isConnected) return null;

    setLoading(true);
    try {
      console.log('ユーザー初期化開始:', lineUsername);
      
      // 既存ユーザーを検索
      let user = await userService.getUserByUsername(lineUsername);
      
      // セキュリティイベントをログ
      if (user) {
        logSecurityEvent('supabase_user_found', lineUsername, 'Supabaseユーザーが見つかりました');
      } else {
        console.log('Supabaseユーザーが見つかりません。新規作成を試みます:', lineUsername);
        try {
          logSecurityEvent('supabase_user_not_found', lineUsername, 'Supabaseユーザーが見つかりません');
        } catch (logError) {
          console.error('セキュリティログ記録エラー:', logError);
        }
      }
      
      if (!user) {
        // 新規ユーザー作成
        console.log('新規ユーザー作成を試みます:', lineUsername);
        user = await userService.createUser(lineUsername);
        
        if (user) {
          console.log('ユーザー作成成功:', user);
          try {
            logSecurityEvent('supabase_user_created', lineUsername, 'Supabaseユーザーを作成しました');
          } catch (logError) {
            console.error('セキュリティログ記録エラー:', logError);
          }
          
          // ローカルデータを移行
          try {
            await syncService.migrateLocalData(user.id);
          } catch (syncError) {
            console.error('データ移行エラー:', syncError);
          }
        }
      } else {
        // 既存ユーザーの場合、Supabaseからローカルに同期
        try {
          await syncService.syncToLocal(user.id);
        } catch (syncError) {
          console.error('データ同期エラー:', syncError);
        }
      }
      
      setCurrentUser(user);
      return user;
    } catch (error) {
      console.error('ユーザー初期化エラー:', error);
      setError(error instanceof Error ? error.message : '不明なエラー');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const saveEntry = async (entryData: any) => {
    // まずローカルストレージに保存（既存の動作を維持）
    const existingEntries = localStorage.getItem('journalEntries');
    const entries = existingEntries ? JSON.parse(existingEntries) : [];
    
    const newEntry = {
      id: Date.now().toString(),
      ...entryData
    };
    
    entries.unshift(newEntry);
    localStorage.setItem('journalEntries', JSON.stringify(entries));

    // Supabaseにも保存（バックグラウンドで）
    if (isConnected && currentUser) {
      try {
        await diaryService.createEntry({
          user_id: currentUser.id,
          date: entryData.date,
          emotion: entryData.emotion,
          event: entryData.event,
          realization: entryData.realization,
          self_esteem_score: entryData.selfEsteemScore,
          worthlessness_score: entryData.worthlessnessScore
        });
        console.log('Supabaseにも保存しました');
      } catch (error) {
        console.error('Supabase保存エラー:', error);
        // エラーが発生してもローカル保存は成功しているので続行
      }
    }

    return newEntry;
  };

  const updateEntry = async (id: string, updates: any) => {
    // ローカルストレージを更新
    const existingEntries = localStorage.getItem('journalEntries');
    if (existingEntries) {
      const entries = JSON.parse(existingEntries);
      const updatedEntries = entries.map((entry: any) => 
        entry.id === id ? { ...entry, ...updates } : entry
      );
      localStorage.setItem('journalEntries', JSON.stringify(updatedEntries));
    }

    // Supabaseも更新
    if (isConnected && currentUser) {
      try {
        await diaryService.updateEntry(id, {
          date: updates.date,
          emotion: updates.emotion,
          event: updates.event,
          realization: updates.realization,
          self_esteem_score: updates.selfEsteemScore,
          worthlessness_score: updates.worthlessnessScore
        });
        console.log('Supabaseも更新しました');
      } catch (error) {
        console.error('Supabase更新エラー:', error);
      }
    }
  };

  const deleteEntry = async (id: string) => {
    // ローカルストレージから削除
    const existingEntries = localStorage.getItem('journalEntries');
    if (existingEntries) {
      const entries = JSON.parse(existingEntries);
      const filteredEntries = entries.filter((entry: any) => entry.id !== id);
      localStorage.setItem('journalEntries', JSON.stringify(filteredEntries));
    }

    // Supabaseからも削除
    if (isConnected && currentUser) {
      try {
        await diaryService.deleteEntry(id);
        console.log('Supabaseからも削除しました');
      } catch (error) {
        console.error('Supabase削除エラー:', error);
      }
    }
  };

  return {
    isConnected,
    currentUser,
    loading,
    error,
    retryConnection,
    retryCount,
    initializeUser,
    saveEntry,
    updateEntry,
    deleteEntry,
    checkConnection
  };
};