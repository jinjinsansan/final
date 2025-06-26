import React, { useState } from 'react';
import { Database, Upload, Download, RefreshCw, CheckCircle, AlertTriangle, Users, Info, Settings, BarChart3, TrendingUp, Shield } from 'lucide-react';
import { useSupabase } from '../hooks/useSupabase';
import { syncService, userService, consentService, diaryService, supabase } from '../lib/supabase';
import AutoSyncSettings from './AutoSyncSettings';
import DataBackupRecovery from './DataBackupRecovery';

const DataMigration: React.FC = () => {
  const { isConnected, currentUser, loading, error, retryConnection } = useSupabase();
  const [migrating, setMigrating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string>('');
  const [localDataCount, setLocalDataCount] = useState(0);
  const [supabaseDataCount, setSupabaseDataCount] = useState(0);
  const [localConsentCount, setLocalConsentCount] = useState(0);
  const [supabaseConsentCount, setSupabaseConsentCount] = useState(0);
  const [userExists, setUserExists] = useState(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'auto' | 'backup'>('auto');
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
      // ユーザーの存在確認
      userService.getUserByUsername(lineUsername).then(user => {
        setUserExists(!!user);
      }).catch(() => {
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
    
    if (isConnected) {
      // Supabaseの同意履歴数を取得
      consentService.getAllConsentHistories().then(histories => {
        setSupabaseConsentCount(histories.length);
      }).catch(() => {
        setSupabaseConsentCount(0);
      });
      
      // Supabaseの日記データ数を取得
      if (currentUser) {
        supabase?.from('diary_entries')
          .select('id', { count: 'exact' })
          .eq('user_id', currentUser.id)
          .then(({ count }) => setSupabaseDataCount(count || 0))
          .catch(() => setSupabaseDataCount(0));
      }
    }
  };

  const handleMigrateToSupabase = async () => {
    if (!currentUser) {
      alert('ユーザーが設定されていません。');
      return;
    }

    setMigrating(true);
    setMigrationStatus('ローカルデータをSupabaseに移行中...');
    setMigrationProgress(0);

    try {
      // 大量データ対応の移行処理
      const success = await syncService.bulkMigrateLocalData(
        currentUser.id,
        (progress) => setMigrationProgress(progress)
      );
      
      if (success) {
        setMigrationStatus('移行が完了しました！');
        checkDataCounts();
        loadStats();
      } else {
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

  const handleMigrateConsentsToSupabase = async () => {
    if (!currentUser) {
      alert('ユーザーが設定されていません。');
      return;
    }

    setMigrating(true);
    setMigrationStatus('同意履歴をSupabaseに移行中...');

    try {
      const success = await syncService.syncConsentHistories();
      
      if (success) {
        setMigrationStatus('同意履歴の移行が完了しました！');
        checkDataCounts();
      } else {
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
    if (!currentUser) {
      alert('ユーザーが設定されていません。');
      return;
    }

    setSyncing(true);
    setMigrationStatus('Supabaseからローカルに同期中...');

    try {
      const success = await syncService.syncToLocal(currentUser.id);
      
      if (success) {
        setMigrationStatus('同期が完了しました！');
        checkDataCounts();
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
    if (!currentUser) {
      alert('ユーザーが設定されていません。');
      return;
    }

    setSyncing(true);
    setMigrationStatus('Supabaseから同意履歴を同期中...');

    try {
      const success = await syncService.syncConsentHistoriesToLocal();
      
      if (success) {
        setMigrationStatus('同意履歴の同期が完了しました！');
        checkDataCounts();
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

  const handleCreateUser = async () => {
    const lineUsername = localStorage.getItem('line-username');
    if (!lineUsername) {
      alert('ユーザー名が設定されていません。');
      return;
    }

    try {
      setMigrationStatus('ユーザー作成中...');
      setMigrating(true);
      
      // まず既存ユーザーをチェック
      const existingUser = await userService.getUserByUsername(lineUsername);
      if (existingUser) {
        setMigrationStatus('ユーザーは既に存在します。データ移行が可能になりました。');
        window.location.reload();
        return;
      }
      
      // 新規ユーザー作成
      const user = await userService.createUser(lineUsername);
      
      if (!user) {
        throw new Error('ユーザー作成に失敗しました。');
      }
      
      // 成功メッセージを表示
      setMigrationStatus('ユーザーが作成されました！データ移行が可能になりました。');
      
      // 少し待ってからリロード
      setTimeout(() => {
        setMigrationStatus('ユーザーが作成されました！データ移行が可能になりました。');
        window.location.reload(); // ページをリロードして状態を更新
      }, 1500);
    } catch (error) {
      console.error('ユーザー作成エラー:', error);
      
      // エラーメッセージを詳細に表示
      if (error instanceof Error) {
        if (error.message.includes('duplicate key')) {
          setMigrationStatus('このユーザー名は既に登録されています。既存のユーザーを使用します。');
          window.location.reload();
        } else {
          alert(`ユーザー作成中にエラーが発生しました: ${error.message}`);
        }
      } else {
        alert('ユーザー作成中に不明なエラーが発生しました。');
      }
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 px-4">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Database className="w-8 h-8 text-blue-600" /> 
          <h1 className="text-2xl font-jp-bold text-gray-900">データ管理</h1>
        </div>

        {/* タブナビゲーション */}
        <div className="border-b border-gray-200 mb-6">
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
                <div className="flex items-center space-x-3 mb-4">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-jp-bold text-gray-900">本番環境統計</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {stats.userStats && (
                    <>
                      <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <Users className="w-5 h-5 text-blue-600" />
                          <span className="text-sm font-jp-medium text-gray-700">総ユーザー数</span>
                        </div>
                        <p className="text-2xl font-jp-bold text-blue-600">{stats.userStats.total.toLocaleString()}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-green-200">
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
                      <div className="bg-white rounded-lg p-4 border border-purple-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <Database className="w-5 h-5 text-purple-600" />
                          <span className="text-sm font-jp-medium text-gray-700">総日記数</span>
                        </div>
                        <p className="text-2xl font-jp-bold text-purple-600">{stats.diaryStats.total.toLocaleString()}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-orange-200">
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
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-jp-bold text-gray-900 mb-3">人気の感情 TOP3</h4>
                    <div className="grid grid-cols-3 gap-4">
                      {Object.entries(stats.diaryStats.byEmotion)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 3)
                        .map(([emotion, count], index) => (
                          <div key={emotion} className="text-center">
                            <div className="text-lg font-jp-bold text-gray-900">#{index + 1}</div>
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
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} mr-3`}></div>
                  <span className="font-jp-medium text-gray-900">
                    Supabase接続状態: {isConnected ? '接続済み' : '未接続'}
                  </span>
                </div>
                {!isConnected && (
                  <button 
                    onClick={retryConnection}
                    className="ml-auto px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-jp-medium"
                  >
                    接続を再試行
                  </button>
                )}
              </div>
              
              {error && (
                <div className="mt-2 bg-red-50 rounded-lg p-3 border border-red-200 animate-pulse">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-sm text-red-800 font-jp-medium">{error}</span>
                      <p className="text-xs text-red-600 mt-1">
                        環境変数の設定を確認してください。正しいAPIキーが設定されていることを確認してください。
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {loading && (
                <div className="flex items-center space-x-2 text-blue-600">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-jp-normal">接続確認中...</span>
                </div>
              )}

              {!isConnected && !loading && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-jp-medium text-yellow-800">Supabaseに接続できません。ローカルモードで動作中です。</p>
                      <p className="text-xs text-yellow-700 mt-1">
                        ローカルモードではデータはブラウザ内に保存され、クラウドと同期されません。
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 text-center">
                    <button 
                      onClick={retryConnection}
                      className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-xs"
                    >
                      接続を再試行
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ユーザー情報 */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h3 className="font-jp-semibold text-gray-900 mb-3 flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Supabaseユーザー情報</span>
              </h3>
              
              {currentUser || userExists ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-jp-normal text-gray-700">
                      ユーザーID: {currentUser?.id || 'Supabaseに存在'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-jp-normal text-gray-700">
                      ユーザー名: {currentUser?.line_username || localStorage.getItem('line-username')}
                    </span>
                  </div>
                  {userExists && !currentUser && (
                    <div className="bg-blue-100 rounded-lg p-3 border border-blue-200 mt-3">
                      <div className="flex items-center space-x-2">
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
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm font-jp-medium text-gray-700">
                      Supabaseユーザーが未作成
                    </span>
                  </div>
                  {isConnected && (
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <p className="text-sm text-blue-800 mb-2">
                        Supabaseユーザーを作成すると、データをクラウドに同期できるようになります。
                      </p>
                      <button
                        onClick={handleCreateUser}
                        disabled={migrating}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-jp-medium text-sm transition-colors w-full"
                      >
                        {migrating ? (
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
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center space-x-3 mb-2">
                  <Database className="w-6 h-6 text-green-600" />
                  <h3 className="font-jp-semibold text-gray-900">ローカル日記</h3>
                </div>
                <p className="text-2xl font-jp-bold text-green-600">{localDataCount}件</p>
                <p className="text-sm text-gray-600 font-jp-normal">ブラウザに保存された日記</p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center space-x-3 mb-2">
                  <Database className="w-6 h-6 text-blue-600" />
                  <h3 className="font-jp-semibold text-gray-900">Supabase日記</h3>
                </div>
                <p className="text-2xl font-jp-bold text-blue-600">{supabaseDataCount}件</p>
                <p className="text-sm text-gray-600 font-jp-normal">クラウドに保存された日記</p>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center space-x-3 mb-2">
                  <Users className="w-6 h-6 text-purple-600" />
                  <h3 className="font-jp-semibold text-gray-900">ローカル同意</h3>
                </div>
                <p className="text-2xl font-jp-bold text-purple-600">{localConsentCount}件</p>
                <p className="text-sm text-gray-600 font-jp-normal">ブラウザに保存された同意履歴</p>
              </div>
              
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
            <div className="space-y-4">
              <h3 className="text-lg font-jp-bold text-gray-900">日記データの移行</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <button
                  onClick={handleMigrateToSupabase}
                  disabled={migrating || !isConnected || (!currentUser && !userExists) || localDataCount === 0}
                  className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-jp-medium transition-colors"
                >
                  {migrating ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                  <span>日記: ローカル → Supabase</span>
                </button>

                <button
                  onClick={handleSyncFromSupabase}
                  disabled={syncing || !isConnected || (!currentUser && !userExists)}
                  className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-jp-medium transition-colors"
                >
                  {syncing ? (
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
                  className="flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-jp-medium transition-colors"
                >
                  {migrating ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                  <span>同意: ローカル → Supabase</span>
                </button>

                <button
                  onClick={handleSyncConsentsFromSupabase}
                  disabled={syncing || !isConnected || (!currentUser && !userExists)}
                  className="flex items-center justify-center space-x-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-jp-medium transition-colors"
                >
                  {syncing ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                  <span>同意: Supabase → ローカル</span>
                </button>
              </div>

              {/* ステータス表示 */}
              {migrationStatus && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <RefreshCw className={`w-4 h-4 ${(migrating || syncing) ? 'animate-spin text-blue-600' : 'text-green-600'} flex-shrink-0`} />
                    <span className="text-sm font-jp-medium text-gray-700">{migrationStatus}</span>
                  </div>
                 
                 {/* 進捗バー */}
                 {migrating && migrationProgress > 0 && (
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
                </div>
              )}
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