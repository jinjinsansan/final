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
    if (!isConnected) {
      console.log('Supabaseに接続されていないため、ユーザー初期化をスキップします');
      return null;
    }

    console.log(`ユーザー初期化開始: "${lineUsername}" - ${new Date().toISOString()}`);
    
    // 既に初期化中の場合は処理をスキップ
    if (loading) {
      console.log('別の初期化処理が進行中のため、スキップします');
      return null;
    }
    
    setLoading(true);
    
    try {
      // 既存ユーザーを検索
      let user = await userService.getUserByUsername(lineUsername);
      console.log('ユーザー検索結果:', user ? 'ユーザーが見つかりました' : 'ユーザーが見つかりませんでした');
      
      // 明示的にローディング状態を設定
      setLoading(true);
      
      // セキュリティイベントをログ
      if (user) {
        console.log(`Supabaseユーザーが見つかりました: "${lineUsername}" - ID: ${user.id}`);
        try {
          logSecurityEvent('supabase_user_found', lineUsername, 'Supabaseユーザーが見つかりました');
        } catch (logError) {
          console.error('セキュリティログ記録エラー:', logError);
        }
      } else {
        console.log(`Supabaseユーザーが見つかりません: "${lineUsername}" - 新規作成を試みます`);
        try {
          logSecurityEvent('supabase_user_not_found', lineUsername, 'Supabaseユーザーが見つかりません');
        } catch (logError) {
          console.error('セキュリティログ記録エラー:', logError);
        }
      }
      
      if (!user) {
        // 新規ユーザー作成
        console.log(`新規ユーザー作成を試みます: "${lineUsername}" - ${new Date().toISOString()}`);
        try {
          user = await userService.createUser(lineUsername);
        } catch (createError) {
          console.error('ユーザー作成エラー (initializeUser):', createError);
          
          // 作成エラーの場合、もう一度ユーザー検索を試みる
          // (同時作成などで競合が発生した可能性がある)
          try {
            console.log('ユーザー作成エラー後に再検索を試みます');
            user = await userService.getUserByUsername(lineUsername);
            console.log('再検索結果:', user ? 'ユーザーが見つかりました' : 'ユーザーが見つかりませんでした');
          } catch (searchError) {
            console.error('ユーザー再検索エラー:', searchError);
            throw new Error('ユーザーの作成と検索に失敗しました');
          }
        }
        
        if (user) {
          console.log(`ユーザー作成成功: "${lineUsername}" - ID: ${user.id}`);
          try {
            logSecurityEvent('supabase_user_created', lineUsername, 'Supabaseユーザーを作成しました');
          } catch (logError) {
            console.error('セキュリティログ記録エラー:', logError);
          }
          
          // ローカルデータを移行
          try {
            console.log(`ローカルデータの移行を開始: "${lineUsername}" - ID: ${user.id}`);
            await syncService.migrateLocalData(user.id);
            console.log(`ローカルデータの移行が完了しました: "${lineUsername}"`);
          } catch (syncError) {
            console.error('データ移行エラー:', syncError);
          }
        }
      } else {
        // 既存ユーザーの場合、Supabaseからローカルに同期
        try {
          if (user.id) {
            console.log(`Supabaseからローカルへの同期を開始: "${lineUsername}" - ID: ${user.id}`);
            await syncService.syncToLocal(user.id);
            console.log(`Supabaseからローカルへの同期が完了しました: "${lineUsername}"`);
          } else {
            console.error('ユーザーIDが不明です:', user);
          }
        } catch (syncError) {
          console.error('データ同期エラー:', syncError);
        }
      }
      
      // 明示的にユーザー情報を更新
      if (user) {
        setCurrentUser(user);
        setError(null);
        console.log('currentUserを更新しました:', user);
      } else {
        console.error('ユーザー情報が取得できませんでした');
      }
      
      return user;
    } catch (error) {
      console.error(`ユーザー初期化エラー: ${lineUsername}`, error);
      setError(error instanceof Error ? error.message : '不明なエラー');
      return null;
    } finally {
      console.log(`ユーザー初期化完了: "${lineUsername}" - ${new Date().toISOString()}`);
      setTimeout(() => {
        setLoading(false);
        console.log('ローディング状態を解除しました');
      }, 500); // 少し遅延させてUI更新を確実にする
    }
  };

  const saveEntry = async (entryData: any) => {
    // まずローカルストレージに保存（既存の動作を維持）
    const existingEntries = localStorage.getItem('journalEntries') || '[]';
    const entries = JSON.parse(existingEntries);
    const newEntry = { id: Date.now().toString(), ...entryData };
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
    const existingEntries = localStorage.getItem('journalEntries') || '[]';
    const entries = JSON.parse(existingEntries);
    const updatedEntries = entries.map((entry: any) => 
      entry.id === id ? { ...entry, ...updates } : entry
    );
    localStorage.setItem('journalEntries', JSON.stringify(updatedEntries));

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
    const existingEntries = localStorage.getItem('journalEntries') || '[]';
    const entries = JSON.parse(existingEntries);
    const filteredEntries = entries.filter((entry: any) => entry.id !== id);
    localStorage.setItem('journalEntries', JSON.stringify(filteredEntries));

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