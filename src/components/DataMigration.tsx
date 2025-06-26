import React, { useState } from 'react';
import { Database, Upload, Download, RefreshCw, CheckCircle, AlertTriangle, Users, Info, Settings, BarChart3, TrendingUp, Shield } from 'lucide-react';
import { useSupabase } from '../hooks/useSupabase';
import { syncService, userService, consentService, diaryService, supabase } from '../lib/supabase';
import AutoSyncSettings from './AutoSyncSettings';
import DataBackupRecovery from './DataBackupRecovery';

const DataMigration: React.FC = () => {
  const { isConnected, currentUser, loading, error, retryConnection, initializeUser } = useSupabase();
  const [migrating, setMigrating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string>('');
  const [showUserCreationButton, setShowUserCreationButton] = useState(false);
  const [localDataCount, setLocalDataCount] = useState(0);
  const [supabaseDataCount, setSupabaseDataCount] = useState(0);
  const [localConsentCount, setLocalConsentCount] = useState(0);
  const [supabaseConsentCount, setSupabaseConsentCount] = useState(0);
  const [userExists, setUserExists] = useState(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'auto' | 'backup'>('auto');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userCreationError, setUserCreationError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    userStats: { total: number; today: number; thisWeek: number } | null;
    diaryStats: { total: number; today: number; thisWeek: number; byEmotion: Record<string, number> } | null;
  }>({
    userStats: null,
    diaryStats: null
  });
  const [migrationProgress, setMigrationProgress] = useState(0);

  React.useEffect(() => {
    checkDataCounts();
    if (isConnected) {
      loadStats();
    }
  }, [isConnected, currentUser]);

  const loadStats = async () => {
    if (!isConnected) return;
    
    try {
      const [userStats, diaryStats] = await Promise.all([
        userService.getUserStats(),
        diaryService.getDiaryStats()
      ]);
      
      setStats({ userStats, diaryStats });
    } catch (error) {
      console.error('統計データ読み込みエラー:', error);
    }
  };

  const checkDataCounts = () => {
    // ローカルデータ数をチェック
    const lineUsername = localStorage.getItem('line-username');
    if (lineUsername && isConnected) {
      console.log('ユーザー存在確認を開始:', lineUsername);
      // ユーザーの存在確認
      userService.getUserByUsername(lineUsername).then(user => {
        console.log('ユーザー存在確認結果:', user ? 'ユーザーが見つかりました' : 'ユーザーが見つかりませんでした');
        setUserExists(!!user);
        if (user && user.id) {
          localStorage.setItem('supabase_user_id', user.id);
          console.log('ユーザーIDをローカルストレージに保存:', user.id);
        }
      }).catch(() => {
        console.log('ユーザー存在確認エラー');
        setUserExists(false);
      });
    }
    
    const localEntries = localStorage.getItem('journalEntries');
    if (localEntries) {
      const entries = JSON.parse(localEntries);
      setLocalDataCount(entries.length);
    } else {
      setLocalDataCount(0);
    }
    
    // ローカル同意履歴数をチェック
    const localConsents = localStorage.getItem('consent_histories');
    if (localConsents) {
      const consents = JSON.parse(localConsents);
      setLocalConsentCount(consents.length);
    } else {
      setLocalConsentCount(0);
    }

    // Supabaseデータ数をチェック
    setSupabaseDataCount(0);
    setSupabaseConsentCount(0);
    
    if (isConnected && currentUser) {
      console.log('Supabaseデータ数を確認中...');
      // Supabaseの同意履歴数を取得
      consentService.getAllConsentHistories().then(histories => {
        console.log('Supabase同意履歴数:', histories.length);
        setSupabaseConsentCount(histories.length);
      }).catch(() => {
        console.error('Supabase同意履歴数取得エラー');
        setSupabaseConsentCount(0);
      });
      
      // Supabaseの日記データ数を取得
      console.log('Supabase日記データ数を確認中...', currentUser.id);
      supabase?.from('diary_entries')
        .select('id', { count: 'exact' })
        .eq('user_id', currentUser.id)
        .then(({ count }) => {
          console.log('Supabase日記データ数:', count || 0);
          setSupabaseDataCount(count || 0);
        })
        .catch((error) => {
          console.error('Supabase日記データ数取得エラー:', error);
          setSupabaseDataCount(0);
        });
    }
  };

  const handleCreateUser = async () => {
    const lineUsername = localStorage.getItem('line-username');
    if (!lineUsername) {
      setMigrationStatus('エラー: ユーザー名が設定されていません。トップページに戻り、プライバシーポリシーに同意してください。');
      return;
    }

    try {
      setIsCreatingUser(true);
      setMigrationStatus(`ユーザー作成中... (${lineUsername})`);
      setUserCreationError(null);
      setMigrating(true);
      console.log(`ユーザー作成開始: ${lineUsername}`);

      // まず既存ユーザーをチェック
      const existingUser = await userService.getUserByUsername(lineUsername);
      if (existingUser) {
        console.log('既存ユーザーが見つかりました:', existingUser);
        setMigrationStatus('ユーザーは既に存在します！ページを再読み込みします...');
        localStorage.setItem('supabase_user_id', existingUser.id);
        setUserExists(true);
        
        // 現在のユーザーを設定
        if (isConnected) {
          await initializeUser(lineUsername);
        }
        
        
        // 既存ユーザーの場合は、現在のユーザー状態を更新
        if (isConnected) {
          try {
            if (initializeUser) {
              const user = await initializeUser(lineUsername);
              setMigrationStatus('ユーザー情報を更新しました。ページを再読み込みします...');
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            } else {
              setMigrationStatus('ユーザー初期化関数が利用できません。ページを再読み込みしてください。');
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            }
          } catch (initError) {
            console.error('ユーザー初期化エラー:', initError);
            setMigrationStatus('ユーザー情報の更新に失敗しました。ページを再読み込みしてください。');
          }
        }
        return;
      }
      
      // 新規ユーザー作成
      console.log('新規ユーザーを作成します:', lineUsername);
      const user = await userService.createUser(lineUsername);
      
      if (!user || !user.id) {
        console.error('ユーザー作成に失敗しました - nullが返されました');
        throw new Error('ユーザー作成に失敗しました。');
      }
      
      console.log('ユーザー作成成功:', user);
      localStorage.setItem('supabase_user_id', user.id);
      // 成功メッセージを表示
      setMigrationStatus('ユーザーが作成されました！ページを再読み込みします...');
      setUserExists(true);
      
      // 現在のユーザーを設定
      if (isConnected) {
        await initializeUser(lineUsername);
      }
      
      // 少し待ってからリロード
      setTimeout(() => {
        window.location.reload(); // ページをリロードして状態を更新
      }, 2000);
    } catch (error) {
      console.error('ユーザー作成エラー:', error);
      let errorMessage = 'ユーザー作成中にエラーが発生しました。';
      
      // エラーメッセージを詳細に表示
      if (error instanceof Error) {
        setUserCreationError(error.message);
        errorMessage += ` ${error.message}`;
        console.log('エラーメッセージ:', error.message);
        
        // 重複キーエラーの場合
        if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
          console.log('重複エラーを検出しました - 既存ユーザーを使用します');
          setMigrationStatus('このユーザー名は既に登録されています。ページを再読み込みします...');
          setUserExists(true);
          
          // 現在のユーザーを設定
          if (isConnected) {
            await initializeUser(lineUsername);
          }
          
          setTimeout(() => {
            window.location.reload();
          }, 2000);
          return;
        }
      }
      
      // エラーメッセージを表示
      setMigrationStatus(`エラー: ${errorMessage}`);
      setUserCreationError(errorMessage);
    } finally {
      setMigrating(false);
      setIsCreatingUser(false);
    }
  };

  const handleMigrateToSupabase = async () => {
    // ユーザーが設定されていない場合は処理を中止
    const userId = currentUser?.id || localStorage.getItem('supabase_user_id');
    console.log('データ移行開始 - ユーザーID:', userId);
    
    // ユーザーIDが見つからない場合、ユーザー名から再取得を試みる
    if (!userId) {
      const lineUsername = localStorage.getItem('line-username');
      if (lineUsername && isConnected) {
        try {
          const user = await userService.getUserByUsername(lineUsername);
          if (user && user.id) {
            userId = user.id;
            localStorage.setItem('supabase_user_id', user.id);
            console.log('ユーザーIDを再取得しました:', user.id);
          }
        } catch (error) {
          console.error('ユーザーID再取得エラー:', error);
        }
      }
    }
    
    if (!userId) {
      setMigrationStatus('エラー: ユーザーIDが見つかりません。ユーザーを作成してください。');
      setShowUserCreationButton(true);
      return;
    }

    setMigrating(true);
    setMigrationStatus(`ローカルデータをSupabaseに移行中... (ユーザーID: ${userId.substring(0, 8)}...)`);
    setMigrationProgress(0);

    try {
      const shortUserId = typeof userId === 'string' ? userId.substring(0, 8) : 'unknown';
      console.log(`ローカルデータをSupabaseに移行中... (${shortUserId}...)`);
      setMigrationStatus(`ローカルデータをSupabaseに移行中... (${shortUserId}...)`);
      
      // 大量データ対応の移行処理
      const success = await syncService.bulkMigrateLocalData(userId, (progress) => {
        setMigrationProgress(progress);
        setMigrationStatus(`ローカルデータをSupabaseに移行中... (${progress}%)`);
      });
      
      if (success) {
        console.log('日記データの移行が完了しました！');
        setMigrationStatus('日記データの移行が完了しました！ページを再読み込みしてください。');
        checkDataCounts();
        loadStats();
        
        // 移行成功後に再読み込み
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        console.log('移行に失敗しました。');
        setMigrationStatus('移行に失敗しました。');
      }
    } catch (error) {
      console.error('移行エラー:', error);
      setMigrationStatus('移行中にエラーが発生しました。');
    } finally {
      setMigrating(false);
      setMigrationProgress(0);
    }
  };

  // 保存されたユーザーIDを使用して移行する
  const handleMigrateWithSavedUserId = async (userId: string) => {
    setMigrating(true);
    setMigrationStatus(`保存されたユーザーID(${userId.substring(0, 8)}...)を使用してデータを移行中...`);
    setMigrationProgress(0);

    try {
      const success = await syncService.bulkMigrateLocalData(userId, (progress) => {
        setMigrationProgress(progress);
        setMigrationStatus(`ローカルデータをSupabaseに移行中... (${progress}%)`);
      });
      
      if (success) {
        setMigrationStatus('日記データの移行が完了しました！');
        checkDataCounts();
        loadStats();
      } else {
        setMigrationStatus('移行に失敗しました。ページを再読み込みして再試行してください。');
      }
    } catch (error) {
      console.error('移行エラー:', error);
      setMigrationStatus('移行中にエラーが発生しました。ユーザー情報を更新してください。');
      setShowUserCreationButton(true);
    } finally {
      setMigrating(false);
      setMigrationProgress(0);
    }
  };

  // ユーザーセッションを復元する
  const handleRecoverUserSession = async () => {
    const lineUsername = localStorage.getItem('line-username');
    if (!lineUsername || !isConnected || !initializeUser) {
      setMigrationStatus('ユーザーセッションを復元できません。ユーザー名が見つからないか、接続が確立されていません。');
      setShowUserCreationButton(true);
      return;
    }
    
    setMigrationStatus(`ユーザーセッションを復元中... (${lineUsername})`);
    
    try {
      const user = await initializeUser(lineUsername);
      if (user && user.id) {
        localStorage.setItem('supabase_user_id', user.id);
        setMigrationStatus('ユーザーセッションを復元しました。ページを再読み込みします...');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setMigrationStatus('ユーザーセッションの復元に失敗しました。ユーザーを作成してください。');
        setShowUserCreationButton(true);
      }
    } catch (error) {
      console.error('ユーザーセッション復元エラー:', error);
      setMigrationStatus('ユーザーセッションの復元に失敗しました。ユーザーを作成してください。');
      setShowUserCreationButton(true);
    }
  };

  const handleMigrateConsentsToSupabase = async () => {
    // ユーザーが設定されていない場合は処理を中止
    const userId = currentUser?.id || localStorage.getItem('supabase_user_id');
    console.log('同意履歴移行開始 - ユーザーID:', userId);
    
    // ユーザーIDが見つからない場合、ユーザー名から再取得を試みる
    if (!userId) {
      const lineUsername = localStorage.getItem('line-username');
      if (lineUsername && isConnected) {
        try {
          const user = await userService.getUserByUsername(lineUsername);
          if (user && user.id) {
            userId = user.id;
            localStorage.setItem('supabase_user_id', user.id);
            console.log('ユーザーIDを再取得しました:', user.id);
          }
        } catch (error) {
          console.error('ユーザーID再取得エラー:', error);
        }
      }
    }
    
    if (!userId) {
      setMigrationStatus('エラー: ユーザーIDが見つかりません。ユーザーを作成してください。');
      setShowUserCreationButton(true);
      return;
    }

    setMigrating(true);
    setMigrationStatus('同意履歴をSupabaseに移行中... しばらくお待ちください');

    try {
      console.log('同意履歴の同期を開始します');
      const success = await syncService.syncConsentHistories();
      console.log('同意履歴の同期結果:', success ? '成功' : '失敗');
      
      if (success) {
        console.log('同意履歴の移行が完了しました！');
        setMigrationStatus('同意履歴の移行が完了しました！ページを再読み込みしてください。');
        checkDataCounts();

        // 移行成功後に再読み込み
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        console.log('同意履歴の移行に失敗しました。');
        setMigrationStatus('同意履歴の移行に失敗しました。');
      }
    } catch (error) {
      console.error('同意履歴移行エラー:', error);
      setMigrationStatus('同意履歴移行中にエラーが発生しました。');
    } finally {
      setMigrating(false);
    }
  };

  const handleSyncFromSupabase = async () => {
    // ユーザーが設定されていない場合は処理を中止
    const userId = currentUser?.id || localStorage.getItem('supabase_user_id');
    if (!userId) {
      setMigrationStatus('エラー: ユーザーIDが見つかりません。ユーザーを作成してください。');
      setShowUserCreationButton(true);
      return;
    }

    setSyncing(true);
    setMigrationStatus('Supabaseからローカルに同期中... しばらくお待ちください');

    try {
      // 同期前にユーザーIDを確認
      console.log('Supabaseからローカルへの同期を開始:', userId);
      const success = await syncService.syncToLocal(userId);
      
      if (success) {
        setMigrationStatus('Supabaseからの同期が完了しました！ページを再読み込みしてください。');
        checkDataCounts();
        
        // 同期成功後に再読み込み
        setTimeout(() => {
          window.location.reload();
        }, 3000);
        loadStats();
      } else {
        setMigrationStatus('同期に失敗しました。');
      }
    } catch (error) {
      console.error('同期エラー:', error);
      setMigrationStatus('同期中にエラーが発生しました。');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncConsentsFromSupabase = async () => {
    // ユーザーが設定されていない場合は処理を中止
    const userId = currentUser?.id || localStorage.getItem('supabase_user_id');
    if (!userId) {
      setMigrationStatus('エラー: ユーザーIDが見つかりません。ユーザーを作成してください。');
      setShowUserCreationButton(true);
      return;
    }

    setSyncing(true);
    setMigrationStatus('Supabaseから同意履歴を同期中... しばらくお待ちください');

    try {
      const success = await syncService.syncConsentHistoriesToLocal();
      
      if (success) {
        setMigrationStatus('同意履歴の同期が完了しました！ページを再読み込みしてください。');
        checkDataCounts();
        
        // 同期成功後に再読み込み
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        setMigrationStatus('同意履歴の同期に失敗しました。');
      }
    } catch (error) {
      console.error('同意履歴同期エラー:', error);
      setMigrationStatus('同意履歴同期中にエラーが発生しました。');
    } finally {
      setSyncing(false);
    }
  };

  // 移行状態表示
  const renderMigrationStatus = () => {
    if (!migrationStatus) return null;
    
    const isError = migrationStatus.includes('エラー');
    const isSuccess = migrationStatus.includes('完了') || migrationStatus.includes('成功');
    const isProgress = migrationStatus.includes('移行中') || migrationStatus.includes('同期中');
    
    return (
      <div className={`rounded-lg p-4 border ${
        isError ? 'bg-red-50 border-red-200' : 
        isSuccess ? 'bg-green-50 border-green-200' : 
        'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-start space-x-2 mb-2">
          {(migrating || syncing) ? (
            <RefreshCw className="w-4 h-4 flex-shrink-0 animate-spin text-blue-600" />
          ) : isError ? (
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600 mt-0.5" />
          ) : isSuccess ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0 text-green-600" />
          ) : (
            <Info className="w-4 h-4 flex-shrink-0 text-blue-600" />
          )}
          <span className={`text-sm font-jp-medium ${
            isError ? 'text-red-700' : 
            isSuccess ? 'text-green-700' : 
            'text-gray-700'
          }`}>
            {migrationStatus}
          </span>
        </div>
       
        {/* 進捗バー */}
        {isProgress && migrationProgress > 0 && (
          <div className="mt-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-jp-medium text-gray-600">移行進捗</span>
              <span className="text-xs font-jp-bold text-blue-600">{migrationProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${migrationProgress}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {/* ユーザー作成ボタン */}
        {showUserCreationButton && !currentUser && isConnected && (
          <div className="mt-4 pt-4 border-t border-red-200">
            <button
              onClick={handleCreateUser}
              disabled={isCreatingUser || migrating}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-jp-medium text-sm transition-colors"
            >
              {isCreatingUser || migrating ? (
                <div className="flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  <span>ユーザー作成中...</span>
                </div>
              ) : (
                'Supabaseユーザーを作成'
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 px-4">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Database className="w-8 h-8 text-blue-600" /> 
          <h1 className="text-2xl font-jp-bold text-gray-900">データ管理</h1>
        </div>

        {/* タブナビゲーション */}
        <div className="border-b border-gray-200 mb-6" key="tab-navigation">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('auto')}
              className={`py-2 px-1 border-b-2 font-jp-medium text-sm ${
                activeTab === 'auto'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              自動同期（推奨）
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`py-2 px-1 border-b-2 font-jp-medium text-sm ${
                activeTab === 'manual'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              手動操作
            </button>
            <button
              onClick={() => setActiveTab('backup')}
              className={`py-2 px-1 border-b-2 font-jp-medium text-sm ${
                activeTab === 'backup'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              バックアップ
            </button>
          </nav>
        </div>

        {/* タブコンテンツ */}
        {activeTab === 'auto' ? ( 
          <AutoSyncSettings />
        ) : activeTab === 'backup' ? (
          <DataBackupRecovery />
        ) : (
          <div className="space-y-6">
            {/* 本番環境統計（Supabase接続時のみ表示） */}
            {isConnected && (stats.userStats || stats.diaryStats) && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                <div className="flex items-center space-x-3 mb-4" key="stats-header">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-jp-bold text-gray-900">本番環境統計</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {stats.userStats && (
                    <>
                      <div className="bg-white rounded-lg p-4 border border-blue-200" key="total-users">
                        <div className="flex items-center space-x-2 mb-2">
                          <Users className="w-5 h-5 text-blue-600" />
                          <span className="text-sm font-jp-medium text-gray-700">総ユーザー数</span>
                        </div>
                        <p className="text-2xl font-jp-bold text-blue-600">{stats.userStats.total.toLocaleString()}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-green-200" key="today-users">
                        <div className="flex items-center space-x-2 mb-2">
                          <TrendingUp className="w-5 h-5 text-green-600" />
                          <span className="text-sm font-jp-medium text-gray-700">今日の新規</span>
                        </div>
                        <p className="text-2xl font-jp-bold text-green-600">{stats.userStats.today.toLocaleString()}</p>
                      </div>
                    </>
                  )}
                  
                  {stats.diaryStats && (
                    <>
                      <div className="bg-white rounded-lg p-4 border border-purple-200" key="total-diaries">
                        <div className="flex items-center space-x-2 mb-2">
                          <Database className="w-5 h-5 text-purple-600" />
                          <span className="text-sm font-jp-medium text-gray-700">総日記数</span>
                        </div>
                        <p className="text-2xl font-jp-bold text-purple-600">{stats.diaryStats.total.toLocaleString()}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-orange-200" key="today-diaries">
                        <div className="flex items-center space-x-2 mb-2">
                          <TrendingUp className="w-5 h-5 text-orange-600" />
                          <span className="text-sm font-jp-medium text-gray-700">今日の日記</span>
                        </div>
                        <p className="text-2xl font-jp-bold text-orange-600">{stats.diaryStats.today.toLocaleString()}</p>
                      </div>
                    </>
                  )}
                </div>
                
                {/* 人気の感情トップ3 */}
                {stats.diaryStats && Object.keys(stats.diaryStats.byEmotion).length > 0 && (
                  <div className="bg-white rounded-lg p-4 border border-gray-200" key="top-emotions">
                    <h4 className="font-jp-bold text-gray-900 mb-3">人気の感情 TOP3</h4>
                    <div className="grid grid-cols-3 gap-4">
                      {Object.entries(stats.diaryStats.byEmotion)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 3)
                        .map(([emotion, count], index) => (
                          <div key={emotion} className="text-center">
                            <div className="text-lg font-jp-bold text-gray-900" key={`rank-${index}`}>#{index + 1}</div>
                            <div className="text-sm font-jp-medium text-gray-700">{emotion}</div>
                            <div className="text-xs text-gray-500">{count.toLocaleString()}件</div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 接続状態 */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3 mb-4" key="connection-status">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} mr-3 flex-shrink-0`}></div>
                  <span className="font-jp-medium text-gray-900">
                    Supabase接続状態: {isConnected ? '接続済み' : '未接続'}
                  </span>
                </div>
                {!isConnected && (
                  <button key="retry-button"
                    onClick={retryConnection}
                    disabled={loading}
                    className="ml-auto px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-jp-medium"
                  >
                    {loading ? (
                      <div className="flex items-center space-x-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>接続中...</span>
                      </div>
                    ) : (
                      '接続を再試行'
                    )}
                  </button>
                )}
              </div>
              
              {error && (
                <div className="mt-2 bg-red-50 rounded-lg p-3 border border-red-200" key="connection-error">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-sm text-red-800 font-jp-medium">{error}</span>
                      <p className="text-xs text-red-600 mt-1">
                        環境変数の設定を確認してください。.envファイルに正しいSupabase URLとAPIキーが設定されていることを確認してください。
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {loading && (
                <div className="flex items-center space-x-2 text-blue-600" key="loading-indicator">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-jp-normal">接続確認中...</span>
                </div>
              )}

              {!isConnected && !loading && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3" key="local-mode-warning">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                    <span className="text-sm font-jp-medium text-yellow-800">
                      Supabaseに接続できません。ローカルモードで動作中です。
                    </span>
                  </div>
                  <p className="text-xs text-yellow-700 mt-2 ml-6">
                    ローカルモードではデータはブラウザ内に保存され、クラウドと同期されません。
                  </p>
                  <div className="mt-3 text-center" key="retry-connection-button">
                    <button 
                      onClick={retryConnection}
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-jp-medium text-sm transition-colors"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center space-x-2">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>接続中...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-2">
                          <RefreshCw className="w-4 h-4" />
                          <span>接続を再試行</span>
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ユーザー情報 */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h3 className="font-jp-semibold text-gray-900 mb-3 flex items-center space-x-2" key="user-info-header">
                <Users className="w-5 h-5" />
                <span>ユーザー情報</span>
              </h3>
              
              {currentUser || userExists ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" key="user-id-check" />
                    <span className="text-sm font-jp-normal text-gray-700">
                      ユーザーID: {currentUser?.id || 'Supabaseに存在'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2" key="username-check">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-jp-normal text-gray-700">
                      ユーザー名: {currentUser?.line_username || localStorage.getItem('line-username')}
                    </span>
                  </div>
                  {userExists && !currentUser && (
                    <div className="bg-blue-100 rounded-lg p-3 border border-blue-200 mt-3">
                      <div className="flex items-center space-x-2" key="user-exists-info">
                        <Info className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-jp-medium text-blue-800">
                          Supabaseにユーザーが存在します。データ移行が可能です。
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2" key="user-not-found">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                    <span className="text-sm font-jp-medium text-red-700">{userCreationError}</span>
                    <span className="text-sm font-jp-medium text-gray-700">
                      Supabaseユーザーが未作成
                    </span>
                  </div>
                  {isConnected && (
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200" key="create-user-section">
                      <p className="text-sm text-blue-800 mb-3" key="create-user-info">
                        Supabaseユーザーを作成すると、データをクラウドに同期できるようになります。
                      </p> 
                      <button
                        onClick={handleCreateUser}
                        disabled={isCreatingUser || migrating}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-jp-medium text-sm transition-colors w-full"
                      >
                        {isCreatingUser || migrating ? (
                          <div className="flex items-center justify-center">
                            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                            <span>作成中...</span>
                          </div>
                        ) : (
                          'Supabaseユーザーを作成'
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* データ統計 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {/* ローカル日記 */} 
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center space-x-3 mb-2">
                  <Database className="w-6 h-6 text-green-600" />
                  <h3 className="font-jp-semibold text-gray-900">ローカル日記</h3>
                </div>
                <p className="text-2xl font-jp-bold text-green-600">{localDataCount}件</p>
                <p className="text-sm text-gray-600 font-jp-normal">ブラウザに保存された日記</p>
              </div>

              {/* Supabase日記 */} 
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center space-x-3 mb-2">
                  <Database className="w-6 h-6 text-blue-600" />
                  <h3 className="font-jp-semibold text-gray-900">Supabase日記</h3>
                </div>
                <p className="text-2xl font-jp-bold text-blue-600">{supabaseDataCount}件</p>
                <p className="text-sm text-gray-600 font-jp-normal">クラウドに保存された日記</p>
              </div>
              
              {/* ローカル同意 */} 
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center space-x-3 mb-2">
                  <Users className="w-6 h-6 text-purple-600" />
                  <h3 className="font-jp-semibold text-gray-900">ローカル同意</h3>
                </div>
                <p className="text-2xl font-jp-bold text-purple-600">{localConsentCount}件</p>
                <p className="text-sm text-gray-600 font-jp-normal">ブラウザに保存された同意履歴</p>
              </div>
              
              {/* Supabase同意 */} 
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="flex items-center space-x-3 mb-2">
                  <Users className="w-6 h-6 text-orange-600" />
                  <h3 className="font-jp-semibold text-gray-900">Supabase同意</h3>
                </div>
                <p className="text-2xl font-jp-bold text-orange-600">{supabaseConsentCount}件</p>
                <p className="text-sm text-gray-600 font-jp-normal">クラウドに保存された同意履歴</p>
              </div>
            </div>

            {/* 操作ボタン */}
            <div className="space-y-6" key="operation-buttons">
              <h3 className="text-lg font-jp-bold text-gray-900">日記データの移行</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <button
                  onClick={handleMigrateToSupabase}
                  disabled={migrating || !isConnected || (!currentUser && !userExists) || localDataCount === 0}
                  className={`flex items-center justify-center space-x-2 ${
                    migrating ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
                  } disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-jp-medium transition-colors`}
                >
                  {migrating && !isCreatingUser ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                  <span>日記: ローカル → Supabase</span>
                </button>

                <button
                  onClick={handleSyncFromSupabase}
                  disabled={syncing || !isConnected || (!currentUser && !userExists)}
                  className={`flex items-center justify-center space-x-2 ${
                    syncing ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                  } disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-jp-medium transition-colors`}
                >
                  {syncing && !isCreatingUser ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                  <span>日記: Supabase → ローカル</span>
                </button>
              </div>
              
              <h3 className="text-lg font-jp-bold text-gray-900">同意履歴の移行</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={handleMigrateConsentsToSupabase}
                  disabled={migrating || !isConnected || (!currentUser && !userExists) || localConsentCount === 0}
                  className={`flex items-center justify-center space-x-2 ${
                    migrating ? 'bg-gray-400' : 'bg-purple-600 hover:bg-purple-700'
                  } disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-jp-medium transition-colors`}
                >
                  {migrating && !isCreatingUser ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                  <span>同意: ローカル → Supabase</span>
                </button>

                <button
                  onClick={handleSyncConsentsFromSupabase}
                  disabled={syncing || !isConnected || (!currentUser && !userExists)}
                  className={`flex items-center justify-center space-x-2 ${
                    syncing ? 'bg-gray-400' : 'bg-orange-600 hover:bg-orange-700'
                  } disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-jp-medium transition-colors`}
                >
                  {syncing && !isCreatingUser ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                  <span>同意: Supabase → ローカル</span>
                </button>
              </div>

              {/* ステータス表示 */}
              {renderMigrationStatus()}
            </div>

            {/* 注意事項 */}
            <div className="mt-6 bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800 font-jp-normal space-y-1">
                  <p className="font-jp-medium">重要な注意事項:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>データ移行は一方向のコピーです。既存データは上書きされません。</li>
                    <li>移行前に重要なデータのバックアップを取ることをお勧めします。</li>
                    <li>大量データの移行には時間がかかる場合があります。</li>
                    <li>同意履歴は法的要件のため、削除されることはありません。</li>
                    <li>Supabase接続が必要な操作は、接続が確立されている場合のみ実行できます。</li>
                    <li>ローカルデータは常にブラウザに保存され、アプリの動作に影響しません。</li>
                    <li>本番環境では1000人以上のユーザーに対応した最適化が適用されます。</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
    </div>
  );
};

export default DataMigration;