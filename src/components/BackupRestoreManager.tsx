import React, { useState, useEffect } from 'react';
import { HardDrive, Upload, Download, RefreshCw, CheckCircle, AlertTriangle, Shield, Info, Calendar, FileText, Database } from 'lucide-react';
import { useSupabase } from '../hooks/useSupabase';

interface BackupLog {
  id: string;
  counselor_name: string;
  backup_type: string;
  file_name: string;
  file_size: number;
  created_at: string;
}

const BackupRestoreManager: React.FC = () => {
  const [backupLogs, setBackupLogs] = useState<BackupLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [restoreInProgress, setRestoreInProgress] = useState(false);
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [status, setStatus] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [currentCounselor, setCurrentCounselor] = useState<string | null>(null);
  const { isConnected, supabase } = useSupabase();
  const [currentCounselor, setCurrentCounselor] = useState<string | null>(null);

  useEffect(() => {
    // カウンセラー名を取得
    const counselorName = localStorage.getItem('current_counselor');
    if (counselorName) {
      setCurrentCounselor(counselorName);
    }
    
    loadBackupLogs();
  }, []);

  const loadBackupLogs = async () => {
      setLoading(true);
      if (!isConnected || !supabase) {
        console.log('Supabase接続がないため、バックアップログの読み込みをスキップします');
        setStatus({
          message: 'ローカルモードで動作中のため、バックアップログは利用できません',
          type: 'info'
        });
        return;
      }
      
      setLoading(true);
      const { data, error } = await supabase
        .from('backup_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('バックアップログ取得エラー:', error);
        setStatus({
          message: 'バックアップ履歴の取得に失敗しました: ' + error.message,
          type: 'error'
        });
      } else if (data) {
        setBackupLogs(data);
      }
    } catch (error) {
      console.error('バックアップログ読み込みエラー:', error);
      setStatus({
        message: 'バックアップログの読み込みに失敗しました',
        type: 'error'
      });
      setStatus({
        message: 'バックアップログの読み込みに失敗しました',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // アプリ全体のバックアップを作成する関数
  const handleCreateFullBackup = async () => {
    if (!window.confirm('アプリ全体のバックアップを作成しますか？このプロセスには時間がかかる場合があります。')) {
      return;
    }
    
    setBackupInProgress(true);
    setStatus({
      message: 'バックアップを作成中...',
      type: 'info'
    });
    
    try {
      // ローカルストレージからすべてのデータを収集
      const backupObject: Record<string, any> = {
        metadata: {
          version: '1.0',
          createdAt: new Date().toISOString(),
          createdBy: currentCounselor || 'unknown',
          appName: 'かんじょうにっき',
          type: 'full_backup'
        },
        data: {}
      };
      
      // ローカルストレージのすべてのキーを取得
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              // JSONデータの場合はパースして保存
              try {
                backupObject.data[key] = JSON.parse(value);
              } catch {
                // JSONでない場合は文字列として保存
                backupObject.data[key] = value;
              }
            }
          } catch (error) {
            console.error(`キー "${key}" の読み込みエラー:`, error);
          }
        }
      }
      
      // Supabaseからのデータ取得（接続されている場合）
      if (supabase) {
        try {
          backupObject.supabaseData = {};
          
          // ユーザーデータの取得
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select('*');
          
          if (!usersError && users) {
            backupObject.supabaseData.users = users;
          }
          
          // 日記データの取得
          const { data: diaries, error: diariesError } = await supabase
            .from('diary_entries')
            .select('*');
          
          if (!diariesError && diaries) {
            backupObject.supabaseData.diary_entries = diaries;
          }
          
          // 同意履歴の取得
          const { data: consents, error: consentsError } = await supabase
            .from('consent_histories')
            .select('*');
          
          if (!consentsError && consents) {
            backupObject.supabaseData.consent_histories = consents;
          }
          
          // カウンセラーデータの取得
          const { data: counselors, error: counselorsError } = await supabase
            .from('counselors')
            .select('*');
          
          if (!counselorsError && counselors) {
            backupObject.supabaseData.counselors = counselors;
          }
        } catch (supabaseError) {
          console.error('Supabaseデータ取得エラー:', supabaseError);
          backupObject.supabaseError = String(supabaseError);
        }
      }
      
      // JSONに変換してダウンロード
      const dataStr = JSON.stringify(backupObject, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      // 現在の日時を含むファイル名を生成
      const date = new Date().toISOString().split('T')[0];
      const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '.');
      const fileName = `kanjou-nikki-full-backup-${date}-${time}.json`;
      
      // ダウンロードリンクを作成して自動クリック
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(dataBlob);
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // バックアップ時間を記録
      localStorage.setItem('last_full_backup_time', new Date().toLocaleString('ja-JP'));
      
      // バックアップログをSupabaseに記録
      if (isConnected && supabase && currentCounselor) {
        try {
          await supabase
            .from('backup_logs')
            .insert([{
              counselor_name: currentCounselor,
              backup_type: 'full',
              file_name: fileName,
              file_size: dataBlob.size,
              metadata: {
                userCount: backupObject.supabaseData?.users?.length || 0,
                entryCount: backupObject.supabaseData?.diary_entries?.length || 0,
                localStorageKeys: Object.keys(backupObject.data).length
              }
            }]);
          
          // バックアップログを再読み込み
          loadBackupLogs();
        } catch (logError) {
          console.error('バックアップログ記録エラー:', logError);
        }
      } else {
        console.log('Supabase接続がないか、カウンセラー名が不明なため、バックアップログの記録をスキップします');
      }
      
      setStatus({
        message: 'アプリ全体のバックアップが正常に作成されました！',
        type: 'success'
      });
    } catch (error) {
      console.error('バックアップ作成エラー:', error);
      setStatus({
        message: 'バックアップの作成中にエラーが発生しました。',
        type: 'error'
      });
    } finally {
      setBackupInProgress(false);
    }
  };

  // バックアップファイルの選択
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setBackupFile(e.target.files[0]);
      setStatus(null);
    }
  };

  // バックアップからの復元
  const handleRestoreBackup = async () => {
    if (!backupFile) {
      setStatus({
        message: 'バックアップファイルを選択してください。',
        type: 'error'
      });
      return;
    }
    
    if (!window.confirm('バックアップからデータを復元しますか？現在のデータは上書きされます。')) {
      return;
    }
    
    setRestoreInProgress(true);
    setStatus({
      message: '復元中...',
      type: 'info'
    });
    
    try {
      // ファイルを読み込み
      const fileReader = new FileReader();
      
      fileReader.onload = async (event) => {
        try {
          if (!event.target || typeof event.target.result !== 'string') {
            throw new Error('ファイルの読み込みに失敗しました。');
          }
          
          const backupObject = JSON.parse(event.target.result);
          
          // バージョンチェック
          if (!backupObject.metadata || !backupObject.metadata.version) {
            throw new Error('無効なバックアップファイルです。');
          }
          
          // ローカルストレージのデータを復元
          if (backupObject.data) {
            Object.entries(backupObject.data).forEach(([key, value]) => {
              try {
                localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
              } catch (error) {
                console.error(`キー "${key}" の復元エラー:`, error);
              }
            });
          }
          
          // Supabaseデータの復元（接続されている場合）
          if (isConnected && supabase && backupObject.supabaseData) {
            // 注意: 実際の実装では、データの整合性を保つために
            // トランザクションやバッチ処理を使用することをお勧めします
            
            // ユーザーデータの復元
            if (backupObject.supabaseData.users) {
              for (const user of backupObject.supabaseData.users) {
                try {
                  // 既存ユーザーをチェック
                  const { data: existingUser } = await supabase
                    .from('users')
                    .select('id')
                    .eq('id', user.id)
                    .maybeSingle();
                  
                  if (existingUser) {
                    // 既存ユーザーを更新
                    await supabase
                      .from('users')
                      .update({
                        line_username: user.line_username
                      })
                      .eq('id', user.id);
                  } else {
                    // 新規ユーザーを作成
                    await supabase
                      .from('users')
                      .insert([{
                        id: user.id,
                        line_username: user.line_username,
                        created_at: user.created_at
                      }]);
                  }
                } catch (error) {
                  console.error('ユーザー復元エラー:', error);
                }
              }
            }
            
            // 日記データの復元
            if (backupObject.supabaseData.diary_entries) {
              for (const entry of backupObject.supabaseData.diary_entries) {
                try {
                  // 既存エントリーをチェック
                  const { data: existingEntry } = await supabase
                    .from('diary_entries')
                    .select('id')
                    .eq('id', entry.id)
                    .maybeSingle();
                  
                  if (existingEntry) {
                    // 既存エントリーを更新
                    await supabase
                      .from('diary_entries')
                      .update({
                        user_id: entry.user_id,
                        date: entry.date,
                        emotion: entry.emotion,
                        event: entry.event,
                        realization: entry.realization,
                        self_esteem_score: entry.self_esteem_score,
                        worthlessness_score: entry.worthlessness_score,
                        counselor_memo: entry.counselor_memo,
                        is_visible_to_user: entry.is_visible_to_user,
                        counselor_name: entry.counselor_name,
                        assigned_counselor: entry.assigned_counselor,
                        urgency_level: entry.urgency_level
                      })
                      .eq('id', entry.id);
                  } else {
                    // 新規エントリーを作成
                    await supabase
                      .from('diary_entries')
                      .insert([{
                        id: entry.id,
                        user_id: entry.user_id,
                        date: entry.date,
                        emotion: entry.emotion,
                        event: entry.event || '',
                        realization: entry.realization || '',
                        self_esteem_score: entry.self_esteem_score,
                        worthlessness_score: entry.worthlessness_score,
                        created_at: entry.created_at,
                        counselor_memo: entry.counselor_memo || '',
                        is_visible_to_user: entry.is_visible_to_user || false,
                        counselor_name: entry.counselor_name || '',
                        assigned_counselor: entry.assigned_counselor || '',
                        urgency_level: entry.urgency_level || ''
                      }]);
                  }
                } catch (error) {
                  console.error('日記エントリー復元エラー:', error);
                }
              }
            }
          }
          
          // 復元ログをSupabaseに記録
          if (isConnected && supabase && currentCounselor) {
            try {
              await supabase
                .from('backup_logs')
                .insert([{
                  counselor_name: currentCounselor,
                  backup_type: 'restore',
                  file_name: backupFile.name,
                  file_size: backupFile.size,
                  metadata: {
                    userCount: backupObject.supabaseData?.users?.length || 0,
                    entryCount: backupObject.supabaseData?.diary_entries?.length || 0,
                    localStorageKeys: Object.keys(backupObject.data || {}).length
                  }
                }]);
              
              // バックアップログを再読み込み
              loadBackupLogs();
            } catch (logError) {
              console.error('復元ログ記録エラー:', logError);
            }
          }
          
          setStatus({
            message: 'データが正常に復元されました！ページを再読み込みしてください。',
            type: 'success'
          });
          
          // 5秒後に自動的にページを再読み込み
          setTimeout(() => {
            window.location.reload();
          }, 5000);
          
        } catch (logError) {
          console.error('バックアップログ記録エラー:', logError);
        }
      }
      
      setStatus({
        message: 'アプリ全体のバックアップが正常に作成されました！',
        type: 'success'
      });
    } catch (error) {
      console.error('バックアップ作成エラー:', error);
      setStatus({
        message: 'バックアップの作成中にエラーが発生しました。',
        type: 'error'
      });
    } finally {
      setBackupInProgress(false);
    }
  };

  // バックアップファイルの選択
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setBackupFile(e.target.files[0]);
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <HardDrive className="w-8 h-8 text-purple-600" />
          <h2 className="text-xl font-jp-bold text-gray-900">
            アプリ全体のバックアップと復元
            {!isConnected && <span className="ml-2 text-sm text-yellow-600">(ローカルモード)</span>}
          </h2>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-6 border border-purple-200 mb-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-purple-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-jp-bold text-purple-900 mb-3">重要な注意事項</h3>
              <p className="text-purple-800 font-jp-normal mb-4">
                このバックアップ機能は、アプリ全体のデータを包括的にバックアップします。ローカルストレージとSupabaseの両方のデータが含まれます。
              </p>
              <ul className="list-disc list-inside space-y-1 text-purple-800 font-jp-normal">
                <li>すべてのユーザーの日記データ</li>
                <li>すべての同意履歴</li>
                <li>すべてのカウンセラー情報</li>
                <li>システム設定情報</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* バックアップ作成 */}
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <div className="flex items-center space-x-3 mb-4 flex-wrap">
              <Download className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-jp-bold text-gray-900">バックアップ作成</h3>
            </div>
            <p className="text-gray-700 font-jp-normal mb-4">
              アプリ全体のデータをバックアップファイルとして保存します。定期的なバックアップをお勧めします。
            </p>
            <button
              onClick={handleCreateFullBackup}
              disabled={backupInProgress}
              className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-jp-medium transition-colors w-full"
            >
              {backupInProgress ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>バックアップ作成中...</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-5 h-5" />
                  <span>アプリ全体のバックアップを作成</span>
                </>
              )}
            </button>
          </div>
          
          {/* バックアップ復元 */}
          <div className={`${isConnected ? 'bg-green-50' : 'bg-gray-50'} rounded-lg p-6 border ${isConnected ? 'border-green-200' : 'border-gray-200'}`}>
            <div className="flex items-center space-x-3 mb-4 flex-wrap">
              <Upload className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-jp-bold text-gray-900">バックアップ復元</h3>
              {!isConnected && (
                <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">ローカルモードでは制限あり</span>
              )}
            </div>
            <p className="text-gray-700 font-jp-normal mb-4">
              以前作成したバックアップファイルからデータを復元します。現在のデータは上書きされます。
            </p>
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-jp-medium
                    file:bg-green-100 file:text-green-700
                    hover:file:bg-green-200
                    cursor-pointer"
                />
              </div>
              
              <button
                onClick={handleRestoreBackup}
                disabled={restoreInProgress || !backupFile}
                className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-jp-medium transition-colors w-full"
              >
                {restoreInProgress ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>復元中...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    <span>バックアップから復元</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* ステータス表示 */}
        {status && status.message && (
          <div className={`rounded-lg p-4 border mb-6 ${
            status.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 
            status.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center space-x-2">
              {status.type === 'success' ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              ) : status.type === 'error' ? (
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <Info className="w-5 h-5 flex-shrink-0" />
              )}
              <span className="font-jp-medium">{status.message}</span>
            </div>
          </div>
        )}
        
        {/* バックアップ履歴 */}
        <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${!isConnected ? 'opacity-50' : ''}`}>
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-jp-bold text-gray-900">バックアップ履歴</h3>
              <button
                onClick={loadBackupLogs}
                disabled={loading}
                className="text-blue-600 hover:text-blue-700 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {!isConnected && (
            <div className="p-6 text-center">
              <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-jp-medium text-gray-500 mb-2">
                ローカルモードで動作中
              </h3>
              <p className="text-gray-400 font-jp-normal">
                Supabase接続時にバックアップ履歴が表示されます
              </p>
            </div>
          )}
          
          {isConnected && loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 font-jp-normal">読み込み中...</p>
            </div>
          ) : isConnected && backupLogs.length === 0 ? (
            <div className="p-6 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-jp-medium text-gray-500 mb-2">
                バックアップ履歴がありません
              </h3>
              <p className="text-gray-400 font-jp-normal">
                バックアップを作成すると履歴が表示されます
              </p>
            </div>
          ) : isConnected && backupLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-jp-medium text-gray-500 uppercase tracking-wider">
                      日時
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-jp-medium text-gray-500 uppercase tracking-wider">
                      カウンセラー
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-jp-medium text-gray-500 uppercase tracking-wider">
                      種類
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-jp-medium text-gray-500 uppercase tracking-wider">
                      ファイル名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-jp-medium text-gray-500 uppercase tracking-wider">
                      サイズ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {backupLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{formatDate(log.created_at)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.counselor_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-jp-medium rounded-full ${
                          log.backup_type === 'full' ? 'bg-purple-100 text-purple-800' :
                          log.backup_type === 'restore' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {log.backup_type === 'full' ? 'フルバックアップ' :
                           log.backup_type === 'restore' ? '復元' :
                           log.backup_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {log.file_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatFileSize(log.file_size)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null
          )}
        </div>
      </div>
    </div>
  );
};

export default BackupRestoreManager;