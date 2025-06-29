import React, { useState, useEffect } from 'react';
import { Database, Upload, Download, RefreshCw, CheckCircle, AlertTriangle, Shield, Info, Save } from 'lucide-react';
import { supabase, userService, syncService } from '../lib/supabase';
import { useSupabase } from '../hooks/useSupabase';
import { getCurrentUser } from '../lib/deviceAuth';

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
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(true);
  const [backupInProgress, setBackupInProgress] = useState(false);

  // 全体のデータ数を保持する状態
  const [totalLocalDataCount, setTotalLocalDataCount] = useState(0);
  const [totalSupabaseDataCount, setTotalSupabaseDataCount] = useState(0);

  const { isConnected, currentUser, initializeUser } = useSupabase();

  useEffect(() => {
    loadDataInfo();
    // 自動同期設定を読み込み
    const autoSyncSetting = localStorage.getItem('auto_sync_enabled');
    setAutoSyncEnabled(autoSyncSetting !== 'false'); // デフォルトはtrue

    // カウンセラーとしてログインしているかチェック
    const counselorName = localStorage.getItem('current_counselor');
    if (counselorName) {
      setIsAdminMode(true);
    }
  }, []);

  const loadDataInfo = async () => {
    try {
      if (isAdminMode) {
        // 管理者モードの場合は全体のデータ数を取得
        await loadTotalData();
      } else {
        // 通常モードの場合は現在のユーザーのデータ数を取得
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
      }
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    }
  };

  // 自動同期の有効/無効を切り替える
  const toggleAutoSync = (enabled: boolean) => {
    localStorage.setItem('auto_sync_enabled', enabled.toString());
    setAutoSyncEnabled(enabled);
    
    try {
      const user = getCurrentUser();
      console.log(`自動同期が${enabled ? '有効' : '無効'}になりました - ユーザー: ${user?.lineUsername || 'unknown'}`);
    } catch (error) {
      console.error('ログ記録エラー:', error);
    }
    
    setMigrationStatus(`自動同期が${enabled ? '有効' : '無効'}になりました`);
  };

  // 全体のデータ数を取得する関数
  const loadTotalData = async () => {
    try {
      // ローカルストレージから全ユーザーのデータを取得
      const allLocalData = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('journalEntries_')) {
          const data = localStorage.getItem(key);
          if (data) {
            const entries = JSON.parse(data);
            allLocalData.push(...entries);
          }
        }
      }
      setTotalLocalDataCount(allLocalData.length);

      // Supabaseから全データ数を取得
      const { count, error } = await supabase
        .from('diary_entries')
        .select('id', { count: 'exact' });
      
      if (error) {
        console.error('Supabase全データ数取得エラー:', error);
        setTotalSupabaseDataCount(0);
      } else {
        setTotalSupabaseDataCount(count || 0);
      }
    } catch (error) {
      console.error('全体データ読み込みエラー:', error);
    }
  };

  // バックアップデータの作成
  const handleCreateBackup = () => {
    setBackupInProgress(true);
    setMigrationStatus(null);
    
    try {
      // ローカルストレージからデータを収集
      const backupObject = {
        journalEntries: localStorage.getItem('journalEntries') ? JSON.parse(localStorage.getItem('journalEntries')!) : [],
        initialScores: localStorage.getItem('initialScores') ? JSON.parse(localStorage.getItem('initialScores')!) : null,
        consentHistories: localStorage.getItem('consent_histories') ? JSON.parse(localStorage.getItem('consent_histories')!) : [],
        lineUsername: localStorage.getItem('line-username'),
        privacyConsentGiven: localStorage.getItem('privacyConsentGiven'),
        privacyConsentDate: localStorage.getItem('privacyConsentDate'),
        backupDate: new Date().toISOString(),
        version: '1.0'
      };
      
      // JSONに変換してダウンロード
      const dataStr = JSON.stringify(backupObject, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      // ファイル名にユーザー名と日付を含める
      const user = getCurrentUser();
      const username = user?.lineUsername || localStorage.getItem('line-username') || 'user';
      const date = new Date().toISOString().split('T')[0];
      const fileName = `kanjou-nikki-backup-${username}-${date}.json`;
      
      // ダウンロードリンクを作成して自動クリック
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(dataBlob);
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      setMigrationStatus('バックアップが正常に作成されました！');
    } catch (error) {
      console.error('バックアップ作成エラー:', error);
      setMigrationStatus('バックアップの作成に失敗しました。');
    } finally {
      setBackupInProgress(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Database className="w-8 h-8 text-blue-600" />
            <h2 className="text-2xl font-jp-bold text-gray-900">データ管理</h2>
          </div>
          <button
            onClick={loadDataInfo}
            className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-jp-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>更新</span>
          </button>
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
            <h3 className="font-jp-bold text-gray-900 mb-2">
              {isAdminMode ? '全体のローカルデータ' : 'ローカルデータ'}
            </h3>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-jp-normal">
                {isAdminMode ? '総日記数:' : '日記数:'}
              </span>
              <span className="text-2xl font-jp-bold text-blue-600">{localDataCount}</span>
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <h3 className="font-jp-bold text-gray-900 mb-2">
              {isAdminMode ? '全体のSupabaseデータ' : 'Supabaseデータ'}
            </h3>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-jp-normal">
                {isAdminMode ? '総日記数:' : '日記数:'}
              </span>
              <span className="text-2xl font-jp-bold text-green-600">{supabaseDataCount}</span>
            </div>
          </div>
        </div>

        {/* 一般ユーザー向け自動同期設定 */}
        {!isAdminMode && (
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 mb-6">
            <div className="flex items-start space-x-3 mb-4">
              <RefreshCw className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-jp-bold text-gray-900 mb-2">自動同期設定</h3>
                <p className="text-gray-700 font-jp-normal mb-4">
                  自動同期機能は5分ごとにデータをクラウドに保存します。端末を変更する際にもデータが引き継がれます。
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${autoSyncEnabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span className="font-jp-medium text-gray-900">自動同期</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={autoSyncEnabled} 
                  onChange={(e) => toggleAutoSync(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="mt-4 bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-green-800 font-jp-normal">
                  <p className="font-jp-medium mb-1">自動同期のメリット</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>端末変更時にデータが引き継がれます</li>
                    <li>ブラウザのキャッシュクリアでデータが失われません</li>
                    <li>カウンセラーがあなたの日記を確認できます</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* データバックアップセクション */}
            <div className="mt-6 pt-4 border-t border-blue-200">
              <div className="flex items-start space-x-3 mb-4">
                <Save className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-jp-bold text-gray-900 mb-2">データのバックアップ</h4>
                  <p className="text-sm text-gray-700 font-jp-normal">
                    現在のデータをファイルとして保存できます。端末変更時や万が一の時に復元できます。
                  </p>
                </div>
              </div>
              <button
                onClick={handleCreateBackup}
                disabled={backupInProgress}
                className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-jp-medium transition-colors w-full mb-3"
              >
                {backupInProgress ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                <span>バックアップを作成</span>
              </button>
            </div>
          </div>
        )}
        
        {/* 管理者向けデータ移行セクション */}
        {isAdminMode && (
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
            <div className="mb-4 bg-white rounded-lg p-4 border border-gray-200">
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

            {/* 管理者向けバックアップセクション */}
            <div className="mt-6 pt-4 border-t border-indigo-200">
              <div className="flex items-start space-x-3 mb-4">
                <Save className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-jp-bold text-gray-900 mb-2">データのバックアップ</h4>
                  <p className="text-sm text-gray-700 font-jp-normal">
                    現在のデータをファイルとして保存できます。管理者用バックアップを作成します。
                  </p>
                </div>
              </div>
              <button
                onClick={handleCreateBackup}
                disabled={backupInProgress}
                className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-jp-medium transition-colors w-full mb-3"
              >
                {backupInProgress ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                <span>管理者バックアップを作成</span>
              </button>
            </div>
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
        <div className={`mt-6 ${isAdminMode ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'} rounded-lg p-4 border`}>
          <div className="flex items-start space-x-3">
            <Info className={`w-5 h-5 ${isAdminMode ? 'text-green-600' : 'text-blue-600'} mt-0.5 flex-shrink-0`} />
            <div className={`text-sm ${isAdminMode ? 'text-green-800' : 'text-blue-800'} font-jp-normal`}>
              <p className="font-jp-medium mb-2">{isAdminMode ? 'データ管理について' : '自動同期について'}</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                {isAdminMode ? (
                  <>
                    <li>ローカルデータはブラウザに保存されています</li>
                    <li>Supabaseデータはクラウドに保存されます</li>
                    <li>管理者モードでは全体のデータ数が表示されます</li>
                    <li>ブラウザのキャッシュをクリアするとローカルデータは失われます</li>
                    <li>端末を変更する場合は、先にデータをSupabaseに移行してください</li>
                  </>
                ) : (
                  <>
                    <li>自動同期は5分ごとにバックグラウンドで実行されます</li>
                    <li>ブラウザのキャッシュをクリアしても、データは安全に保存されます</li>
                    <li>端末を変更する場合も、自動的にデータが引き継がれます</li>
                    <li>自動同期を無効にすると、データが失われる可能性があります</li>
                  </>
                )}
                {isAdminMode && <li className="font-jp-bold text-green-700">管理者モードでは、すべてのユーザーのデータを管理できます</li>}
              </ul>
            </div>
          </div>
        </div>
        
        {/* 最終同期時間表示 */}
        {!isAdminMode && (
          <div className="mt-4 text-center text-sm text-gray-500">
            <p>
              {localStorage.getItem('last_sync_time') 
                ? `最終同期: ${new Date(localStorage.getItem('last_sync_time') || '').toLocaleString('ja-JP')}` 
                : '同期履歴はまだありません'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataMigration;