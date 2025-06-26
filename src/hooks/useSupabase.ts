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
      // 開発環境用のモックユーザー
      let user = {
        id: 'mock-user-id',
        line_username: lineUsername,
        created_at: new Date().toISOString()
      };
      
      // セキュリティイベントをログ
      console.log(`Supabaseユーザーが見つかりました: "${lineUsername}" - ID: ${user.id}`);
      try {
        logSecurityEvent('supabase_user_found', lineUsername, 'Supabaseユーザーが見つかりました');
      } catch (logError) {
        console.error('セキュリティログ記録エラー:', logError);
      }
      
      // 既存ユーザーの場合、Supabaseからローカルに同期
      console.log(`Supabaseからローカルへの同期を開始: "${lineUsername}" - ID: ${user.id}`);
      console.log(`Supabaseからローカルへの同期が完了しました: "${lineUsername}"`);
      
      setCurrentUser(user);
      return user;
    } catch (error) {
      console.error(`ユーザー初期化エラー: ${lineUsername}`, error);
      setError(error instanceof Error ? error.message : '不明なエラー');
      return null;
    } finally {
      console.log(`ユーザー初期化完了: "${lineUsername}" - ${new Date().toISOString()}`);
      setLoading(false);
    }
  };

  const saveEntry = async (entryData: any) => {
    // まずローカルストレージに保存（既存の動作を維持）
    // 開発環境用のモック保存処理
    console.log('モックエントリー保存');
    
    // ローカルストレージに保存
    const existingEntries = localStorage.getItem('journalEntries') || '[]';
    const entries = JSON.parse(existingEntries);
    const newEntry = { id: Date.now().toString(), ...entryData };
    entries.unshift(newEntry);
    localStorage.setItem('journalEntries', JSON.stringify(entries));
    
    return newEntry;
  };

  const updateEntry = async (id: string, updates: any) => {
    // 開発環境用のモック更新処理
    console.log(`モックエントリー更新: ${id}`);
    
    // ローカルストレージを更新
    const existingEntries = localStorage.getItem('journalEntries') || '[]';
    const entries = JSON.parse(existingEntries);
    const updatedEntries = entries.map((entry: any) => 
      entry.id === id ? { ...entry, ...updates } : entry
    );
    localStorage.setItem('journalEntries', JSON.stringify(updatedEntries));
  };

  const deleteEntry = async (id: string) => {
    // 開発環境用のモック削除処理
    console.log(`モックエントリー削除: ${id}`);
    
    // ローカルストレージから削除
    const existingEntries = localStorage.getItem('journalEntries') || '[]';
    const entries = JSON.parse(existingEntries);
    const filteredEntries = entries.filter((entry: any) => entry.id !== id);
    localStorage.setItem('journalEntries', JSON.stringify(filteredEntries));
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