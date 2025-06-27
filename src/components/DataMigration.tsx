import React, { useState, useEffect } from 'react';
import { Database, Upload, Download, RefreshCw, CheckCircle, AlertTriangle, Shield, Info } from 'lucide-react';
import { supabase, userService, syncService } from '../lib/supabase';
import { useSupabase } from '../hooks/useSupabase';

const DataMigration: React.FC = () => {
  const [localDataCount, setLocalDataCount] = useState(0);
  const [supabaseDataCount, setSupabaseDataCount] = useState(0);
  const [migrating, setMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string>('');
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userExists, setUserExists] = useState(false);
  const [userCreationError, setUserCreationError] = useState<string | null>(null);
  const [syncDirection, setSyncDirection] = useState<'local-to-supabase' | 'supabase-to-local'>('local-to-supabase');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  
  const { isConnected, currentUser, initializeUser } = useSupabase();

  useEffect(() => {
    loadData();
    
    // カウンセラーとしてログインしているかチェック
    const counselorName = localStorage.getItem('current_counselor');
    if (counselorName) {
      setIsAdminMode(true);
      console.log('管理者モードで動作中:', counselorName);
    }
  }, []);

  const loadData = async () => {
    try {
      // ローカルデータ数を取得
      const localEntries = localStorage.getItem('journalEntries');
      if (localEntries) {
        const entries = JSON.parse(localEntries);
        setLocalDataCount(entries.length);
      }

      // Supabaseデータ数を取得（接続されている場合のみ）
      if (isConnected && currentUser) {
        supabase.from('diary_entries')
          .select('id', { count: 'exact' }) 
          .eq('user_id', currentUser.id)
          .then(({ count, error }) => {
            console.log('Supabase日記データ数:', count || 0);
            setSupabaseDataCount(count || 0);
          })
          .catch((error) => {
            console.error('Supabase日記データ数取得エラー:', error);
            setSupabaseDataCount(0);
          });
      }
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    }
  };

  const handleCreateUser = async () => {
    const lineUsername = localStorage.getItem('line-username');
    if (!lineUsername || !isConnected) {
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
        
        setMigrationStatus('ユーザー初期化関数が利用できません。ページを再読み込みしてください。');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
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
      await initializeUser(lineUsername);
      
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
        
        // 重複キーエラーの場合
        if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
          console.log('重複エラーを検出しました - 既存ユーザーを使用します');
          setMigrationStatus('このユーザー名は既に登録されています。ページを再読み込みします...');
          setUserExists(true);
          
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

  const handleMigrateData = async () => {
    if (!isConnected || !currentUser) {
      setMigrationStatus('エラー: Supabaseに接続されていないか、ユーザーが設定されていません。');
      return;
    }

    setMigrating(true);
    setMigrationStatus('データ移行を開始します...');
    setMigrationProgress(0);

    try {
      if (syncDirection === 'local-to-supabase') {
        // ローカルからSupabaseへ
        setMigrationStatus('ローカルデータをSupabaseに移行中...');
        
        const success = await syncService.migrateLocalData(
          currentUser.id,
          (progress) => setMigrationProgress(progress)
        );
        
        if (success) {
          setMigrationStatus('データ移行が完了しました！');
          // データ数を更新
          loadData();
        } else {
          setMigrationStatus('データ移行に失敗しました。もう一度お試しください。');
        }
      } else {
        // Supabaseからローカルへ
        setMigrationStatus('Supabaseデータをローカルに移行中...');
        
        const success = await syncService.syncToLocal(currentUser.id);
        
        if (success) {
          setMigrationStatus('データ移行が完了しました！');
          // データ数を更新
          loadData();
        } else {
          setMigrationStatus('データ移行に失敗しました。もう一度お試しください。');
        }
      }
    } catch (error) {
      console.error('データ移行エラー:', error);
      setMigrationStatus(`エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setMigrating(false);
    }
  };

  const handleBulkMigration = async () => {
    if (!isConnected || !currentUser) {
      setMigrationStatus('エラー: Supabaseに接続されていないか、ユーザーが設定されていません。');
      return;
    }

    if (!window.confirm('大量データの移行を開始します。この処理には時間がかかる場合があります。続行しますか？')) {
      return;
    }

    setMigrating(true);
    setMigrationStatus('大量データの移行を開始します...');
    setMigrationProgress(0);

    try {
      if (syncDirection === 'local-to-supabase') {
        // ローカルからSupabaseへ
        setMigrationStatus('ローカルデータをSupabaseに移行中（バルク処理）...');
        
        const success = await syncService.bulkMigrateLocalData(
          currentUser.id,
          (progress) => setMigrationProgress(progress)
        );
        
        if (success) {
          setMigrationStatus('大量データの移行が完了しました！');
          // データ数を更新
          loadData();
        } else {
          setMigrationStatus('データ移行に失敗しました。もう一度お試しください。');
        }
      } else {
        // Supabaseからローカルへ
        setMigrationStatus('Supabaseデータをローカルに移行中...');
        
        const success = await syncService.syncToLocal(currentUser.id);
        
        if (success) {
          setMigrationStatus('データ移行が完了しました！');
          // データ数を更新
          loadData();
        } else {
          setMigrationStatus('データ移行に失敗しました。もう一度お試しください。');
        }
      }
    } catch (error) {
      console.error('大量データ移行エラー:', error);
      setMigrationStatus(`エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setMigrating(false);
    }
  };

  const handleSyncConsentHistories = async () => {
    if (!isConnected) {
      setMigrationStatus('エラー: Supabaseに接続されていません。');
      return;
    }

    setMigrating(true);
    setMigrationStatus('同意履歴の同期を開始します...');

    try {
      const success = await syncService.syncConsentHistories();
      
      if (success) {
        setMigrationStatus('同意履歴の同期が完了しました！');
      } else {
        setMigrationStatus('同意履歴の同期に失敗しました。もう一度お試しください。');
      }
    } catch (error) {
      console.error('同意履歴同期エラー:', error);
      setMigrationStatus(`エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Database className="w-8 h-8 text-blue-600" />
          <h2 className="text-2xl font-jp-bold text-gray-900">データ管理</h2>
        </div>

        {/* 接続状態表示 */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="font-jp-medium text-gray-900">
                Supabase: {isConnected ? '接続中' : '未接続'}
              </span>
            </div>
            <div>
              {isAdminMode && (
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-jp-medium border border-green-200">
                  管理者モード
                </span>
              )}
              {currentUser && (
                <span className="ml-2 text-sm text-gray-500">
                  {currentUser.line_username}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* データ数表示 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="font-jp-bold text-gray-900 mb-2">ローカルデータ</h3>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-jp-normal">日記数:</span>
              <span className="text-2xl font-jp-bold text-blue-600">{localDataCount}</span>
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <h3 className="font-jp-bold text-gray-900 mb-2">Supabaseデータ</h3>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-jp-normal">日記数:</span>
              <span className="text-2xl font-jp-bold text-green-600">{supabaseDataCount}</span>
            </div>
          </div>
        </div>

        {/* ユーザー作成セクション */}
        {!currentUser && isConnected && !userExists && (
          <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200 mb-6">
            <div className="flex items-start space-x-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-jp-bold text-gray-900 mb-2">Supabaseユーザーが見つかりません</h3>
                <p className="text-gray-700 font-jp-normal mb-4">
                  Supabaseにユーザーが存在しないため、データの同期ができません。ユーザーを作成してください。
                </p>
              </div>
            </div>
            <button
              onClick={handleCreateUser}
              disabled={isCreatingUser}
              className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-jp-medium transition-colors w-full"
            >
              {isCreatingUser ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Shield className="w-5 h-5" />
              )}
              <span>Supabaseユーザーを作成</span>
            </button>
            {userCreationError && (
              <div className="mt-4 bg-red-50 rounded-lg p-4 border border-red-200">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <p className="text-red-800 font-jp-normal">{userCreationError}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* データ移行セクション */}
        {isConnected && currentUser && (
          <div className="bg-indigo-50 rounded-lg p-6 border border-indigo-200 mb-6">
            <div className="flex items-start space-x-3 mb-4">
              <Database className="w-6 h-6 text-indigo-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-jp-bold text-gray-900 mb-2">データ移行</h3>
                <p className="text-gray-700 font-jp-normal mb-4">
                  ローカルデータとSupabaseデータを同期します。
                </p>
              </div>
            </div>

            {/* 同期方向選択 */}
            <div className="mb-4">
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={syncDirection === 'local-to-supabase'}
                    onChange={() => setSyncDirection('local-to-supabase')}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-gray-700 font-jp-normal">ローカル → Supabase</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={syncDirection === 'supabase-to-local'}
                    onChange={() => setSyncDirection('supabase-to-local')}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-gray-700 font-jp-normal">Supabase → ローカル</span>
                </label>
              </div>
            </div>

            {/* 移行ボタン */}
            <button
              onClick={handleMigrateData}
              disabled={migrating}
              className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-jp-medium transition-colors w-full mb-4"
            >
              {migrating ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : syncDirection === 'local-to-supabase' ? (
                <Upload className="w-5 h-5" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              <span>
                {syncDirection === 'local-to-supabase'
                  ? 'ローカルデータをSupabaseに移行'
                  : 'Supabaseデータをローカルに移行'}
              </span>
            </button>

            {/* 同意履歴同期ボタン */}
            <button
              onClick={handleSyncConsentHistories}
              disabled={migrating}
              className="flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-jp-medium transition-colors w-full"
            >
              {migrating ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Upload className="w-5 h-5" />
              )}
              <span>同意履歴をSupabaseに同期</span>
            </button>

            {/* 詳細設定 */}
            <div className="mt-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-indigo-600 hover:text-indigo-800 text-sm font-jp-medium"
              >
                {showAdvanced ? '詳細設定を隠す' : '詳細設定を表示'}
              </button>
            </div>

            {showAdvanced && (
              <div className="mt-4 bg-white rounded-lg p-4 border border-indigo-200">
                <h4 className="font-jp-bold text-gray-900 mb-3">詳細設定</h4>
                <button
                  onClick={handleBulkMigration}
                  disabled={migrating}
                  className="flex items-center justify-center space-x-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-jp-medium transition-colors w-full"
                >
                  {migrating ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Database className="w-5 h-5" />
                  )}
                  <span>大量データ移行（高度な処理）</span>
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  大量のデータを効率的に処理します。通常の移行で問題がある場合のみ使用してください。
                </p>
              </div>
            )}
          </div>
        )}

        {/* 進捗表示 */}
        {migrationStatus && (
          <div className={`rounded-lg p-4 border ${
            migrationStatus.includes('エラー') 
              ? 'bg-red-50 border-red-200 text-red-800' 
              : migrationStatus.includes('完了') 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center space-x-2 mb-2">
              {migrationStatus.includes('エラー') ? (
                <AlertTriangle className="w-5 h-5" />
              ) : migrationStatus.includes('完了') ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <RefreshCw className={`w-5 h-5 ${migrating ? 'animate-spin' : ''}`} />
              )}
              <span className="font-jp-medium">{migrationStatus}</span>
            </div>
            {migrating && migrationProgress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${migrationProgress}%` }}
                ></div>
              </div>
            )}
          </div>
        )}

        {/* 説明セクション */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 font-jp-normal">
              <p className="font-jp-medium mb-2">データ管理について</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>ローカルデータはブラウザに保存されています</li>
                <li>Supabaseデータはクラウドに保存されます</li>
                <li>データの同期は手動で行う必要があります</li>
                <li>ブラウザのキャッシュをクリアするとローカルデータは失われます</li>
                <li>端末を変更する場合は、先にデータをSupabaseに移行してください</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataMigration;