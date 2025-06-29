import { useState, useEffect } from 'react';
import { supabase, userService, testSupabaseConnection } from '../lib/supabase';
import { getAuthSession } from '../lib/deviceAuth';

export const useSupabase = () => {
  // 管理者モードフラグ - カウンセラーとしてログインしている場合はtrue
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState(import.meta.env.VITE_LOCAL_MODE === 'true' ? false : true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastAttemptTime, setLastAttemptTime] = useState(0);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    checkConnection(true);
    
    // カウンセラーとしてログインしているかチェック
    const counselorName = localStorage.getItem('current_counselor');
    if (counselorName) {
      setIsAdminMode(true);
      console.log('管理者モードで動作中:', counselorName);
      
      // 管理者モードの場合は、特別なユーザーIDを設定
      setCurrentUser({ id: 'admin', line_username: 'admin' });
      setIsInitializing(false);
    }
    
  }, []);

  const checkConnection = async (isInitialCheck = false) => {
    // ローカルモードが有効な場合は接続チェックをスキップ
    if (import.meta.env.VITE_LOCAL_MODE === 'true') {
      console.log('ローカルモードが有効です - Supabase接続チェックをスキップします');
      setIsConnected(false);
      setIsInitializing(false);
      setLoading(false);
      return;
    }
    
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
      setIsInitializing(false);
      setError('Supabase接続エラー: 設定が見つかりません');
      setLoading(false);
      return;
    }
    
    try {
      // 新しい接続テスト関数を使用
      console.log(`Supabase接続確認中... (attempt: ${retryCount + 1})`);
      const result = await testSupabaseConnection();
      
      if (!result.success) {
        console.error('Supabase接続エラー:', result.error, result.details);
        setIsConnected(false);
        setIsInitializing(false);

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
        const session = !isAdminMode ? getAuthSession() : null;
        if (session) {
          console.log('既存セッションを検出:', session.lineUsername);
          await initializeUser(session.lineUsername);
        } else if (isAdminMode) {
          console.log('管理者モードで初期化');
          setCurrentUser({ id: 'admin', line_username: 'admin' });
          setIsInitializing(false);
        } else {
          setIsInitializing(false);
        }
      }
    } catch (error) {
      console.error('接続チェックエラー:', error);
      setError(error instanceof Error ? error.message : '不明なエラー');
      setIsConnected(false);
    } finally {
      setIsInitializing(false);
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
    // 管理者モードの場合は初期化をスキップ
    if (isAdminMode) {
      console.log('管理者モードのため、ユーザー初期化をスキップします - 管理者IDを返します');
      setCurrentUser({ id: 'admin', line_username: 'admin' });
      setIsInitializing(false);
      return { id: 'admin', line_username: 'admin' };
    }
    
    if (!isConnected) {
      console.log('Supabaseに接続されていないため、ユーザー初期化をスキップします');
      const trimmedUsername = lineUsername.trim();
      return { id: null, line_username: trimmedUsername };
    }
    setIsInitializing(true);

    const startTime = new Date().toISOString();
    const trimmedUsername = lineUsername.trim();
    console.log(`ユーザー初期化開始: "${trimmedUsername}" - ${startTime}`);

    // 既に初期化中の場合は処理をスキップ
    if (loading) {
      console.log(`別の初期化処理が進行中のため、現在のユーザーを返します: ${trimmedUsername}`);
      setIsInitializing(false);
      return currentUser || { id: null, line_username: trimmedUsername };
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('ユーザー初期化開始:', trimmedUsername);
      // 既存ユーザーを検索
      let user = await userService.getUserByUsername(trimmedUsername);
      console.log('ユーザー検索結果:', user ? `ユーザーが見つかりました: ${user.id}` : 'ユーザーが見つかりませんでした - 新規作成を試みます');
      
      if (!user) {
        try {
           // 新規ユーザー作成
           console.log(`新規ユーザー作成を試みます: "${trimmedUsername}"`);
           user = await userService.createUser(trimmedUsername);
           
           if (user) {
             setCurrentUser(user);
             console.log(`ユーザー作成成功: "${trimmedUsername}" - ID: ${user.id}`);
           }
           
           try {
             console.log('ユーザー作成後に再検索を試みます');
             user = await userService.getUserByUsername(trimmedUsername);
             console.log('再検索結果:', user ? 'ユーザーが見つかりました' : 'ユーザーが見つかりませんでした');
           } catch (searchError) {
             console.error('ユーザー再検索エラー:', searchError);
             throw new Error('ユーザーの作成と検索に失敗しました');
           }
         } catch (createError) {
           console.error(`ユーザー作成エラー: "${trimmedUsername}"`, createError);
           setError(createError instanceof Error ? createError.message : '不明なエラー');
         }
      }
      
      // 明示的にユーザー情報を更新
      if (user) {
        setCurrentUser(user);
        setIsInitializing(false);
        console.log('currentUserを更新しました:', user.id || 'ID不明', '- ユーザー名:', user.line_username || lineUsername.trim());
        setError(null);
        
        // ローカルストレージにユーザーIDを保存
        if (user.id) {
          localStorage.setItem('supabase_user_id', user.id);
          console.log('ユーザーIDをローカルストレージに保存しました:', user.id);
        }
        return user;
      } else {
        console.error('ユーザー情報が取得できませんでした');
        setIsInitializing(false);
        setError('ユーザー情報の取得に失敗しました。');
        return { id: null, line_username: lineUsername.trim() };
      }
    } catch (error) {
      console.error(`ユーザー初期化エラー: ${trimmedUsername}`, error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      setError(errorMessage);
      setIsInitializing(false);
      console.log(`ユーザー初期化エラー: ${errorMessage}`);
      return { id: null, line_username: trimmedUsername };
    } finally {
      const endTime = new Date().toISOString();
      console.log(`ユーザー初期化完了: "${trimmedUsername}"`);
      setTimeout(() => {
        setLoading(false);
        setIsInitializing(false);
      }, 100);
      console.log('ローディング状態を解除しました');
    }
  };

  return {
    isConnected,
    isAdminMode,
    currentUser,
    isInitializing,
    loading,
    error,
    retryConnection,
    retryCount,
    initializeUser
  };
};