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

  useEffect(() => {
    // カウンセラー名を取得
    const counselorName = localStorage.getItem('current_counselor');
    if (counselorName) {
      setCurrentCounselor(counselorName);
    }
    
    loadBackupLogs();
  }, []);

  const loadBackupLogs = async () => {
    try {
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
    } finally {
      setLoading(false);
    }
  };

  // バックアップファイルの選択
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setBackupFile(e.target.files[0]);
      setStatus(null);
    }
  };

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
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default BackupRestoreManager;