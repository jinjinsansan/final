import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Calendar, Search, MessageCircle, Settings, Users, AlertTriangle, Edit3, Trash2, Save, X, CheckCircle, Eye, EyeOff, User, Clock, Filter, Shield, Database, RefreshCw, Download, HardDrive } from 'lucide-react';
import AdvancedSearchFilter from './AdvancedSearchFilter';
import CounselorManagement from './CounselorManagement';
import CounselorChat from './CounselorChat';
import MaintenanceController from './MaintenanceController';
import ConsentHistoryManagement from './ConsentHistoryManagement';
import BackupRestoreManager from './BackupRestoreManager';
import DeviceAuthManagement from './DeviceAuthManagement';
import SecurityDashboard from './SecurityDashboard';
import DataCleanup from './DataCleanup';
import { supabase, adminSupabase, diaryService, syncService } from '../lib/supabase';

interface JournalEntry {
  id: string;
  date: string;
  emotion: string;
  event: string;
  realization: string;
  self_esteem_score?: number;
  worthlessness_score?: number;
  created_at: string;
  user?: {
    line_username: string;
  };
  assigned_counselor?: string;
  urgency_level?: 'high' | 'medium' | 'low';
  counselor_memo?: string;
  is_visible_to_user?: boolean;
  counselor_name?: string;
}

const AdminPanel: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [showEntryDetails, setShowEntryDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentCounselor, setCurrentCounselor] = useState<string | null>(null);
  const [memoText, setMemoText] = useState('');
  const [isVisibleToUser, setIsVisibleToUser] = useState(false);
  const [urgencyLevel, setUrgencyLevel] = useState<'high' | 'medium' | 'low' | ''>('');
  const [assignedCounselor, setAssignedCounselor] = useState('');
  const [savingMemo, setSavingMemo] = useState(false);
  const [activeTab, setActiveTab] = useState('search');
  const [deleting, setDeleting] = useState(false);
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [syncInProgress, setIsSyncInProgress] = useState(false);

  useEffect(() => {
    // カウンセラー名を取得
    const counselorName = localStorage.getItem('current_counselor');
    if (counselorName) {
      console.log('カウンセラー名を取得:', counselorName);
      setCurrentCounselor(counselorName);
    }
    
    loadEntries();
  }, []);

  const loadEntries = async () => {
    console.log('日記データを読み込み中...');
    setLoading(true);
    
    const lineUsername = localStorage.getItem('line-username') || 'ゲスト';
    
    
    const lineUsername = localStorage.getItem('line-username') || 'ゲスト';
    
    try {
      // 管理者モードでは、まず管理者用のデータを同期
      await handleSyncAdminData();

      // 管理者用のデータを読み込み
      const adminEntries = localStorage.getItem('admin_journalEntries');
      if (adminEntries) {
        const parsedEntries = JSON.parse(adminEntries);
        console.log('管理者用データを読み込み:', parsedEntries.length, '件');

        // ユーザー名とタイムスタンプを修正
        const fixedEntries = parsedEntries.map((entry: any) => {
          // ユーザー名が設定されていない場合は現在のユーザー名を使用
          if (!entry.user || !entry.user.line_username) {
            entry.user = { line_username: lineUsername };
          }
          
          // タイムスタンプが無効な場合は現在の時刻を使用
          if (!entry.created_at || entry.created_at === 'Invalid Date') {
            entry.created_at = new Date().toISOString();
          }
          
          return entry;
        });

        // ユーザー名とタイムスタンプを修正
        const fixedEntries = parsedEntries.map((entry: any) => {
          // ユーザー名が設定されていない場合は現在のユーザー名を使用
          if (!entry.user || !entry.user.line_username) {
            entry.user = { line_username: lineUsername };
          }
          
          // タイムスタンプが無効な場合は現在の時刻を使用
          if (!entry.created_at || entry.created_at === 'Invalid Date') {
            entry.created_at = new Date().toISOString();
          }
          
          return entry;
        });
        
        // 日付順でソート（新しい順）
        fixedEntries.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setEntries(fixedEntries);
        setFilteredEntries(fixedEntries);
      } else {
        console.log('管理者用データが見つかりません');
        setEntries([]);
        setFilteredEntries([]);
      }
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // 管理者用データを同期する関数
  const handleSyncAdminData = async () => {
    console.log('管理者用データを同期中...');
    setIsSyncInProgress(true);
    setStatus({
      message: '管理者データを同期中...（スマートフォンのデータも含めて同期します）',
      type: 'info'
    });
      message: '管理者データを同期中...（スマートフォンのデータも含めて同期します）',
      type: 'info'
    });
    
    try {
      // 管理者モードでの同期を実行
      let success = await syncService.adminSync();
      
      // 同期に失敗した場合は再試行
      if (!success) {
        console.log('管理者同期に失敗しました。再試行します...');
        setStatus({
          message: '管理者データの同期に失敗しました。再試行しています...',
          type: 'info'
        });
        
        // 少し待機してから再試行
        await new Promise(resolve => setTimeout(resolve, 1000));
        success = await syncService.adminSync();
      }
      
      // 同期に失敗した場合は再試行
      if (!success) {
        console.log('管理者同期に失敗しました。再試行します...');
        setStatus({
          message: '管理者データの同期に失敗しました。再試行しています...',
          type: 'info'
        });
        
        // 少し待機してから再試行
        await new Promise(resolve => setTimeout(resolve, 1000));
        success = await syncService.adminSync();
      }
      
      if (success) {
        console.log('管理者用データの同期が完了しました');
        setStatus({
          message: '管理者データの同期が完了しました。すべてのデバイスからのデータが表示されます。',
          type: 'success'
        });
          message: '管理者データの同期が完了しました。すべてのデバイスからのデータが表示されます。',
          type: 'success'
        });
        
        // 管理者用のデータを読み込み
        const adminEntries = localStorage.getItem('admin_journalEntries');
        if (adminEntries) {
          const parsedEntries = JSON.parse(adminEntries);
          console.log('管理者用データを読み込み:', parsedEntries.length, '件');
          
          // 日付順でソート（新しい順）
          parsedEntries.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          setEntries(parsedEntries);
          setFilteredEntries(parsedEntries);
        }
      } else {
        console.log('管理者用データの同期に最終的に失敗しました');
        setStatus({message: '管理者データの同期に失敗しました', type: 'error'});
      }
    } catch (error) {
      console.error('管理者用データ同期エラー:', error);
      setStatus({message: '管理者データの同期中にエラーが発生しました', type: 'error'});
    } finally {
      setIsSyncInProgress(false);
    }
  };
  
  // ステータス表示用の状態
  const [status, setStatus] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  const handleViewEntry = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setMemoText(entry.counselor_memo || '');
    setIsVisibleToUser(entry.is_visible_to_user || false);
    setUrgencyLevel(entry.urgency_level || '');
    setAssignedCounselor(entry.assigned_counselor || '');
    setShowEntryDetails(true);
  };

  const handleSaveMemo = async () => {
    if (!selectedEntry) return;
    
    setSavingMemo(true);
    
    try {
      // ローカルストレージの更新
      const savedEntries = localStorage.getItem('journalEntries');
      if (savedEntries) {
        const entries = JSON.parse(savedEntries);
        const updatedEntries = entries.map((entry: any) => {
          if (entry.id === selectedEntry.id) {
            return {
              ...entry,
              counselor_memo: memoText,
              is_visible_to_user: isVisibleToUser,
              urgency_level: urgencyLevel || undefined,
              assigned_counselor: assignedCounselor || undefined,
              counselor_name: isVisibleToUser ? currentCounselor : undefined
            };
          }
          return entry;
        });
        
        localStorage.setItem('journalEntries', JSON.stringify(updatedEntries));
      }
      
      // Supabaseの更新（接続されている場合）
      if (supabase && selectedEntry.id) {
        console.log('Supabaseでメモを更新:', selectedEntry.id);
        try { 
          const { error } = await supabase
            .from('diary_entries')
            .update({
              counselor_memo: memoText,
              is_visible_to_user: isVisibleToUser,
              urgency_level: urgencyLevel || null,
              assigned_counselor: assignedCounselor || null,
              counselor_name: isVisibleToUser ? currentCounselor : null
            })
            .eq('id', selectedEntry.id);
          
          if (error) {
            console.error('Supabaseメモ更新エラー:', error);
          }
        } catch (supabaseError) {
          console.error('Supabase接続エラー:', supabaseError);
        }
      }
      
      // エントリーリストの更新
      setEntries(prevEntries => 
        prevEntries.map(entry => {
          if (entry.id === selectedEntry.id) {
            return {
              ...entry,
              counselor_memo: memoText,
              is_visible_to_user: isVisibleToUser,
              urgency_level: urgencyLevel as any || undefined,
              assigned_counselor: assignedCounselor || undefined,
              counselor_name: isVisibleToUser ? currentCounselor : undefined
            };
          }
          return entry;
        })
      );
      
      setFilteredEntries(prevEntries => 
        prevEntries.map(entry => {
          if (entry.id === selectedEntry.id) {
            return {
              ...entry,
              counselor_memo: memoText,
              is_visible_to_user: isVisibleToUser,
              urgency_level: urgencyLevel as any || undefined,
              assigned_counselor: assignedCounselor || undefined,
              counselor_name: isVisibleToUser ? currentCounselor : undefined
            };
          }
          return entry;
        })
      );
      
      alert('メモを保存しました！');
      setShowEntryDetails(false);
    } catch (error) {
      console.error('メモ保存エラー:', error);
      alert('メモの保存に失敗しました。もう一度お試しください。');
    } finally {
      setSavingMemo(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!window.confirm('この日記を削除してもよろしいですか？この操作は元に戻せません。')) {
      return;
    }
    
    setDeleting(true);
    
    try {
      // ローカルストレージの更新
      const savedEntries = localStorage.getItem('journalEntries');
      if (savedEntries) {
        const entries = JSON.parse(savedEntries);
        const updatedEntries = entries.filter((entry: any) => entry.id !== entryId);
        localStorage.setItem('journalEntries', JSON.stringify(updatedEntries));
      }
      
      // Supabaseの更新（接続されている場合）
      if (supabase) {
        console.log('Supabaseから日記を削除:', entryId);
        try {
          const { error } = await supabase
            .from('diary_entries')
            .delete()
            .eq('id', entryId);
          
          if (error) {
            console.error('Supabase削除エラー:', error);
            throw new Error('Supabaseからの削除に失敗しました');
          }
        } catch (supabaseError) {
          console.error('Supabase接続エラー:', supabaseError);
          throw new Error('Supabaseとの接続に失敗しました');
        }
      }
      
      // エントリーリストの更新
      setEntries(prevEntries => prevEntries.filter(entry => entry.id !== entryId));
      setFilteredEntries(prevEntries => prevEntries.filter(entry => entry.id !== entryId));
      
      alert('日記を削除しました！');
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました。もう一度お試しください。');
    } finally {
      setDeleting(false);
    }
  };

  // アプリ全体のバックアップを作成する関数
  const handleCreateFullBackup = async () => {
    if (!window.confirm('アプリ全体のバックアップを作成しますか？このプロセスには時間がかかる場合があります。')) {
      return;
    }
    
    setBackupInProgress(true);
    
    try {
      // ローカルストレージからすべてのデータを収集
      const backupObject: Record<string, any> = {
        metadata: {
          version: '1.0',
          createdAt: new Date().toISOString(),
          createdBy: localStorage.getItem('current_counselor') || 'unknown',
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
      
      // Supabaseからのデータ取得（接続されている場合のみ）
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
      
      alert('アプリ全体のバックアップが正常に作成されました！');
    } catch (error) {
      console.error('バックアップ作成エラー:', error);
      alert('バックアップの作成中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setBackupInProgress(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    // 無効な日付の場合は現在の日付を使用
    if (isNaN(date.getTime())) {
      return new Date().toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
    // 無効な日付の場合は現在の日付を使用
    if (isNaN(date.getTime())) {
      return new Date().toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderEntryDetailsModal = () => {
    if (!selectedEntry || !showEntryDetails) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-jp-bold text-gray-900">日記詳細</h2>
              <button
                onClick={() => setShowEntryDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* ユーザー情報と日付 */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-jp-semibold text-gray-900">
                      {selectedEntry.user?.line_username || 'ゲスト'}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      {formatDate(selectedEntry.date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-jp-medium ${
                    selectedEntry.emotion === '恐怖' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                    selectedEntry.emotion === '悲しみ' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                    selectedEntry.emotion === '怒り' ? 'bg-red-100 text-red-800 border border-red-200' :
                    selectedEntry.emotion === '悔しい' ? 'bg-green-100 text-green-800 border border-green-200' :
                    selectedEntry.emotion === '無価値感' ? 'bg-gray-100 text-gray-800 border border-gray-300' :
                    selectedEntry.emotion === '罪悪感' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                    selectedEntry.emotion === '寂しさ' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                    selectedEntry.emotion === '恥ずかしさ' ? 'bg-pink-100 text-pink-800 border border-pink-200' :
                    'bg-gray-100 text-gray-800 border border-gray-200'
                  }`}>
                    {selectedEntry.emotion}
                  </span>
                </div>
              </div>

              {/* 日記内容 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="font-jp-semibold text-gray-700 mb-2">出来事</h4>
                  <p className="text-gray-600 font-jp-normal leading-relaxed whitespace-pre-wrap break-words">
                    {selectedEntry.event}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="font-jp-semibold text-gray-700 mb-2">気づき</h4>
                  <p className="text-gray-600 font-jp-normal leading-relaxed whitespace-pre-wrap break-words">
                    {selectedEntry.realization}
                  </p>
                </div>
              </div>

              {/* 無価値感スコア（無価値感の場合のみ） */}
              {selectedEntry.emotion === '無価値感' && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="font-jp-semibold text-gray-700 mb-2">無価値感スコア</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500 font-jp-medium">自己肯定感:</span>
                      <span className="font-jp-bold text-blue-600">
                        {selectedEntry.self_esteem_score || 0}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500 font-jp-medium">無価値感:</span>
                      <span className="font-jp-bold text-red-600">
                        {selectedEntry.worthlessness_score || 0}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* カウンセラーメモ入力 */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-jp-semibold text-blue-900">カウンセラーメモ</h4>
                  <div className="flex items-center space-x-2">
                    <label className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={isVisibleToUser}
                        onChange={(e) => setIsVisibleToUser(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-blue-800 font-jp-medium">ユーザーに表示</span>
                    </label>
                    {isVisibleToUser && (
                      <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                        {currentCounselor}として表示
                      </span>
                    )}
                  </div>
                </div>
                <textarea
                  value={memoText}
                  onChange={(e) => setMemoText(e.target.value)}
                  className="w-full h-32 p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-jp-normal resize-none bg-white"
                  placeholder="カウンセラーメモを入力..."
                />
              </div>

              {/* 緊急度と担当者 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-jp-medium text-gray-700 mb-2">
                    緊急度
                  </label>
                  <select
                    value={urgencyLevel}
                    onChange={(e) => setUrgencyLevel(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-jp-normal"
                  >
                    <option value="">未設定</option>
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-jp-medium text-gray-700 mb-2">
                    担当カウンセラー
                  </label>
                  <select
                    value={assignedCounselor}
                    onChange={(e) => setAssignedCounselor(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-jp-normal"
                  >
                    <option value="">未割り当て</option>
                    <option value="心理カウンセラー仁">心理カウンセラー仁</option>
                    <option value="心理カウンセラーAOI">心理カウンセラーAOI</option>
                    <option value="心理カウンセラーあさみ">心理カウンセラーあさみ</option>
                    <option value="心理カウンセラーSHU">心理カウンセラーSHU</option>
                    <option value="心理カウンセラーゆーちゃ">心理カウンセラーゆーちゃ</option>
                    <option value="心理カウンセラーSammy">心理カウンセラーSammy</option>
                  </select>
                </div>
              </div>

              {/* 保存ボタン */}
              <div className="flex space-x-4">
                <button
                  onClick={handleSaveMemo}
                  disabled={savingMemo}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-jp-medium transition-colors flex items-center justify-center space-x-2"
                >
                  {savingMemo ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>保存中...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>保存</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowEntryDetails(false)}
                  disabled={savingMemo}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-jp-medium transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Shield className="w-8 h-8 text-green-600" />
          <h1 className="text-2xl font-jp-bold text-gray-900">管理画面</h1>
          <button
            onClick={handleSyncAdminData}
            disabled={syncInProgress || loading || !navigator.onLine}
            className="ml-auto flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-jp-medium transition-colors text-sm whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 ${syncInProgress ? 'animate-spin' : ''}`} />
            <span>{syncInProgress ? '同期中...' : 'すべてのデータを同期'}</span>
          </button>
        </div>
        
        {!navigator.onLine && (
          <div className="mb-4 rounded-lg p-3 border bg-yellow-50 border-yellow-200 text-yellow-800">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">オフラインモードです。インターネットに接続するとデータを同期できます。</span>
            </div>
          </div>
        )}
        
        {!navigator.onLine && (
          <div className="mb-4 rounded-lg p-3 border bg-yellow-50 border-yellow-200 text-yellow-800">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">オフラインモードです。インターネットに接続するとデータを同期できます。</span>
            </div>
          </div>
        )}
        
        {/* ステータス表示 */}
        {status && (
          <div className={`mb-4 rounded-lg p-3 border ${
            status.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 
            status.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center space-x-2">
              {status.type === 'success' ? (
                <CheckCircle className="w-4 h-4" />
              ) : status.type === 'error' ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="text-sm">{status.message}</span>
            </div>
          </div>
        )}

        <Tabs defaultValue="search" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-7 gap-1 mb-6 overflow-x-auto">
            <TabsTrigger value="search" className="flex items-center justify-center px-2 py-1.5">
              <Search className="w-4 h-4" />
              <span className="hidden md:inline">日記</span>
            </TabsTrigger>
            <TabsTrigger value="advanced-search" className="flex items-center justify-center px-2 py-1.5">
              <Filter className="w-4 h-4" />
              <span className="hidden md:inline">検索</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center justify-center px-2 py-1.5">
              <MessageCircle className="w-4 h-4" />
              <span className="hidden md:inline">チャット</span>
            </TabsTrigger>
            <TabsTrigger value="counselors" className="flex items-center justify-center px-2 py-1.5">
              <Users className="w-4 h-4" />
              <span className="hidden md:inline">カウンセラー</span>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center justify-center px-2 py-1.5">
              <Settings className="w-4 h-4" />
              <span className="hidden md:inline">設定</span>
            </TabsTrigger>
            <TabsTrigger value="backup" className="flex items-center justify-center px-2 py-1.5">
              <HardDrive className="w-4 h-4" />
              <span className="hidden md:inline">バックアップ</span>
            </TabsTrigger>
            <TabsTrigger value="device-auth" className="flex items-center justify-center px-2 py-1.5">
              <Shield className="w-4 h-4" />
              <span className="hidden md:inline">認証</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center justify-center px-2 py-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden md:inline">安全</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-jp-normal">読み込み中...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-jp-bold text-gray-900 mb-6">日記一覧</h2>
                  
                  {entries.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-jp-medium text-gray-500 mb-2">
                        日記がありません
                      </h3>
                      <p className="text-gray-400 font-jp-normal">
                        まだ日記が登録されていません
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {entries.map((entry) => (
                        <div key={entry.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center space-x-3 flex-wrap">
                              <span className={`px-3 py-1 rounded-full text-sm font-jp-medium ${
                                entry.emotion === '恐怖' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                                entry.emotion === '悲しみ' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                entry.emotion === '怒り' ? 'bg-red-100 text-red-800 border border-red-200' :
                                entry.emotion === '悔しい' ? 'bg-green-100 text-green-800 border border-green-200' :
                                entry.emotion === '無価値感' ? 'bg-gray-100 text-gray-800 border border-gray-300' :
                                entry.emotion === '罪悪感' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                                entry.emotion === '寂しさ' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                                entry.emotion === '恥ずかしさ' ? 'bg-pink-100 text-pink-800 border border-pink-200' :
                                'bg-gray-100 text-gray-800 border border-gray-200'
                              }`}>
                                {entry.emotion}
                              </span>
                              <span className="text-gray-900 font-jp-medium">
                                {entry.user?.line_username || 'ゲスト'}
                              </span>
                              <span className="text-gray-500 text-sm">
                                {formatDate(entry.date)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {entry.urgency_level && (
                                <span className={`text-sm font-jp-medium ${
                                  entry.urgency_level === 'high' ? 'text-red-600' :
                                  entry.urgency_level === 'medium' ? 'text-yellow-600' :
                                  'text-green-600'
                                }`}>
                                  緊急度: {
                                    entry.urgency_level === 'high' ? '高' :
                                    entry.urgency_level === 'medium' ? '中' : '低'
                                  }
                                </span>
                              )}
                              <button
                                onClick={() => handleViewEntry(entry)}
                                className="text-blue-600 hover:text-blue-700 p-1"
                                title="詳細"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteEntry(entry.id)}
                                disabled={deleting}
                                className="text-red-600 hover:text-red-700 p-1"
                                title="削除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            <div>
                              <h4 className="font-jp-semibold text-gray-700 mb-1 text-sm">出来事</h4>
                              <p className="text-gray-600 text-sm font-jp-normal leading-relaxed break-words whitespace-pre-wrap">
                                {entry.event}
                              </p>
                            </div>
                            <div>
                              <h4 className="font-jp-semibold text-gray-700 mb-1 text-sm">気づき</h4>
                              <p className="text-gray-600 text-sm font-jp-normal leading-relaxed break-words whitespace-pre-wrap">
                                {entry.realization}
                              </p>
                            </div>
                          </div>

                          {entry.counselor_memo && (
                            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 mb-3">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="font-jp-semibold text-blue-900 text-sm">カウンセラーメモ</h4>
                                {entry.is_visible_to_user ? (
                                  <div className="flex items-center space-x-1 text-green-600 text-xs">
                                    <Eye className="w-3 h-3" />
                                    <span>ユーザーに表示</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center space-x-1 text-gray-500 text-xs">
                                    <EyeOff className="w-3 h-3" />
                                    <span>非表示</span>
                                  </div>
                                )}
                              </div>
                              <p className="text-blue-800 text-sm font-jp-normal leading-relaxed break-words whitespace-pre-wrap">
                                {entry.counselor_memo}
                              </p>
                            </div>
                          )}

                          <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center space-x-2 text-gray-500">
                              <Clock className="w-4 h-4" />
                              <span>{new Date(entry.created_at).toLocaleString('ja-JP')}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {entry.assigned_counselor && (
                                <span className="text-gray-600 font-jp-medium">
                                  担当: {entry.assigned_counselor}
                                </span>
                              )}
                              <span className="text-xs text-gray-400">
                                {entry.source === 'supabase' ? 'Supabase' : 'ローカル'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="advanced-search">
            <AdvancedSearchFilter 
              entries={entries} 
              onFilteredResults={setFilteredEntries} 
              onViewEntry={handleViewEntry} 
              onDeleteEntry={handleDeleteEntry}
            />
          </TabsContent>

          <TabsContent value="chat">
            <CounselorChat />
          </TabsContent>

          <TabsContent value="counselors">
            <div className="grid grid-cols-1 gap-6">
              <CounselorManagement />
              <ConsentHistoryManagement />
            </div>
          </TabsContent>
          
          <TabsContent value="backup">
            <div className="grid grid-cols-1 gap-6">
              <BackupRestoreManager />
            </div>
          </TabsContent>

          <TabsContent value="maintenance">
            <div className="grid grid-cols-1 gap-6">
              <MaintenanceController />
              <DataCleanup />
            </div>
          </TabsContent>

          <TabsContent value="device-auth">
            <DeviceAuthManagement />
          </TabsContent>

          <TabsContent value="security">
            <SecurityDashboard />
          </TabsContent>
        </Tabs>
      </div>

      {/* 詳細モーダル */}
      {renderEntryDetailsModal()}
    </div>
  );
};

export default AdminPanel;