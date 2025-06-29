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
          loadDataInfo();
  const [backupInProgress, setBackupInProgress] = useState(false);

  // 全体のデータ数を保持する状態
  const [totalLocalDataCount, setTotalLocalDataCount] = useState(0);
  const [totalSupabaseDataCount, setTotalSupabaseDataCount] = useState(0);

  const { isConnected, currentUser, initializeUser } = useSupabase();

  useEffect(() => {
          loadDataInfo();
    loadDataInfo();
    // 自動同期設定を読み込み
    const autoSyncSetting = localStorage.getItem('auto_sync_enabled');
    setAutoSyncEnabled(autoSyncSetting !== 'false'); // デフォルトはtrue

    // カウンセラーとしてログインしているかチェック
    const counselorName = localStorage.getItem('current_counselor');
    if (counselorName) {
      setIsAdminMode(true);
          loadDataInfo();
    }
  }, []);

  const loadDataInfo = async () => {
    try {
      if (isAdminMode) {
        // 管理者モードの場合は全体のデータ数を取得
        await loadTotalData();
      } else {
          loadDataInfo();
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
            {/* バックアップボタン */}
              console.error('Supabase日記データ数取得エラー:', error);
            <div className="mt-6 pt-4 border-t border-blue-200">
              setSupabaseDataCount(0);
                  
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
              <div className="flex items-start space-x-3 mb-4">
            });
                <Save className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        }
                <div>
      }
                  <h4 className="font-jp-bold text-gray-900 mb-2">データのバックアップ</h4>
    } catch (error) {
                  <p className="text-sm text-gray-700 font-jp-normal">
      console.error('データ読み込みエラー:', error);
                    現在のデータをファイルとして保存できます。端末変更時や万が一の時に復元できます。
    }
                  </p>
  };
                </div>
  // ... (rest of the component code)
              </div>
  // バックアップデータの作成
              
  const handleCreateBackup = () => {
              <button
    setBackupInProgress(true);
                onClick={handleCreateBackup}
    setMigrationStatus(null);
                disabled={backupInProgress}
    
                className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-jp-medium transition-colors w-full"
    try {
              >
      // ローカルストレージからデータを収集
                {backupInProgress ? (
      const backupObject = {
                  <RefreshCw className="w-5 h-5 animate-spin" />
        journalEntries: localStorage.getItem('journalEntries') ? JSON.parse(localStorage.getItem('journalEntries')!) : [],
                ) : (
        initialScores: localStorage.getItem('initialScores') ? JSON.parse(localStorage.getItem('initialScores')!) : null,
                  <Download className="w-5 h-5" />
        consentHistories: localStorage.getItem('consent_histories') ? JSON.parse(localStorage.getItem('consent_histories')!) : [],
                )}
        lineUsername: localStorage.getItem('line-username'),
                <span>バックアップを作成</span>
        privacyConsentGiven: localStorage.getItem('privacyConsentGiven'),
              </button>
        privacyConsentDate: localStorage.getItem('privacyConsentDate'),
            </div>
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
      {/* ... (rest of the JSX) */}
    </div>
  );
};

export default DataMigration;
            onClick={loadDataInfo}