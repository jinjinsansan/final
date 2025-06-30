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
  user_id: string;
  title: string;
  content: string;
  mood: number;
  created_at: string;
  updated_at: string;
  counselor_memo?: string;
  is_visible_to_user?: boolean;
  urgency_level?: 'high' | 'medium' | 'low';
  assigned_counselor?: string;
  user_email?: string;
  user_name?: string;
}

interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
  last_login?: string;
  is_active: boolean;
}

const AdminPanel: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEntryDetails, setShowEntryDetails] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);
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

  // ステータス表示用の状態
  const [status, setStatus] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  useEffect(() => {
    // カウンセラー名を取得
    const counselorName = localStorage.getItem('current_counselor');
    setCurrentCounselor(counselorName);
    
    loadEntries();
  }, []);

  const loadEntries = async () => {
    console.log('日記データを読み込み中...');
    setLoading(true);
    try {
      // 管理者モードでは、まず管理者用のデータを同期
      await handleSyncAdminData();

      // 管理者用のデータを読み込み
      const adminEntries = localStorage.getItem('admin_journalEntries');
      if (adminEntries) {
        const parsedEntries = JSON.parse(adminEntries);
        console.log('管理者用データを読み込み:', parsedEntries.length, '件');
        
        // 日付順でソート（新しい順）
        parsedEntries.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setEntries(parsedEntries);
        setFilteredEntries(parsedEntries);
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

  const handleSyncAdminData = async () => {
    console.log('管理者用データを同期中...');
    setIsSyncInProgress(true);
    setStatus({message: '管理者データを同期中...', type: 'info'});
    
    try {
      // 管理者モードでの同期を実行
      const success = await syncService.adminSync();
      
      if (success) {
        console.log('管理者用データの同期が完了しました');
        setStatus({message: '管理者データの同期が完了しました', type: 'success'}); 
        
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
        console.log('管理者用データの同期に失敗しました');
        setStatus({message: '管理者データの同期に失敗しました', type: 'error'}); 
      }
    } catch (error) {
      console.error('管理者用データ同期エラー:', error);
      setStatus({message: '管理者データの同期中にエラーが発生しました', type: 'error'}); 
    } finally {
      setIsSyncInProgress(false);
    }
  };

  const handleViewEntry = (entry: JournalEntry) => { 
    setSelectedEntry(entry); 
    setMemoText(entry.counselor_memo || '');
    setIsVisibleToUser(!!entry.is_visible_to_user);
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

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  const getMoodEmoji = (mood: number) => {
    const moodEmojis = ['😢', '😔', '😐', '😊', '😄'];
    return moodEmojis[mood - 1] || '😐';
  };

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">管理者パネル</h1>
                {currentCounselor && (
                  <p className="text-sm text-gray-600">カウンセラー: {currentCounselor}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSyncAdminData}
                disabled={syncInProgress}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${syncInProgress ? 'animate-spin' : ''}`} />
                <span>{syncInProgress ? '同期中...' : 'データ同期'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {status && (
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4`}>
          <div className={`p-4 rounded-lg ${
            status.type === 'success' ? 'bg-green-50 text-green-800' :
            status.type === 'error' ? 'bg-red-50 text-red-800' :
            'bg-blue-50 text-blue-800'
          }`}>
            {status.message}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-9 gap-1">
            <TabsTrigger value="search" className="flex items-center space-x-2">
              <Search className="h-4 w-4" />
              <span>検索・閲覧</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>ユーザー管理</span>
            </TabsTrigger>
            <TabsTrigger value="counselors" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>カウンセラー</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center space-x-2">
              <MessageCircle className="h-4 w-4" />
              <span>チャット</span>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>メンテナンス</span>
            </TabsTrigger>
            <TabsTrigger value="consent" className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4" />
              <span>同意履歴</span>
            </TabsTrigger>
            <TabsTrigger value="backup" className="flex items-center space-x-2">
              <HardDrive className="h-4 w-4" />
              <span>バックアップ</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>セキュリティ</span>
            </TabsTrigger>
            <TabsTrigger value="cleanup" className="flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span>データ整理</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-6">
            <AdvancedSearchFilter 
              entries={entries}
              onViewEntry={handleViewEntry}
            />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">ユーザー一覧</h2>
                <p className="text-sm text-gray-600">登録ユーザーの管理</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ユーザー
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        登録日
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        最終ログイン
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ステータス
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.name || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.last_login ? formatDate(user.last_login) : '未ログイン'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.is_active ? 'アクティブ' : '無効'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleViewUser(user)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            詳細
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="counselors">
            <CounselorManagement />
          </TabsContent>

          <TabsContent value="chat">
            <CounselorChat />
          </TabsContent>

          <TabsContent value="maintenance">
            <MaintenanceController />
          </TabsContent>

          <TabsContent value="consent">
            <ConsentHistoryManagement />
          </TabsContent>

          <TabsContent value="backup">
            <BackupRestoreManager />
          </TabsContent>

          <TabsContent value="security">
            <div className="space-y-6">
              <SecurityDashboard />
              <DeviceAuthManagement />
            </div>
          </TabsContent>

          <TabsContent value="cleanup">
            <DataCleanup />
          </TabsContent>
        </Tabs>
      </div>

      {/* エントリー詳細モーダル */}
      {showEntryDetails && selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">日記エントリー詳細</h2>
              <button
                onClick={() => setShowEntryDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* エントリー情報 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">エントリー情報</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">タイトル</label>
                      <p className="text-sm text-gray-900">{selectedEntry.title}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">ユーザー</label>
                      <p className="text-sm text-gray-900">
                        {selectedEntry.user_name || selectedEntry.user_email}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">気分</label>
                      <p className="text-sm text-gray-900">
                        {getMoodEmoji(selectedEntry.mood)} ({selectedEntry.mood}/5)
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">作成日時</label>
                      <p className="text-sm text-gray-900">{formatDate(selectedEntry.created_at)}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">カウンセラー設定</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        緊急度
                      </label>
                      <select
                        value={urgencyLevel}
                        onChange={(e) => setUrgencyLevel(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">選択してください</option>
                        <option value="high">高</option>
                        <option value="medium">中</option>
                        <option value="low">低</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        担当カウンセラー
                      </label>
                      <input
                        type="text"
                        value={assignedCounselor}
                        onChange={(e) => setAssignedCounselor(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="カウンセラー名を入力"
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="visibleToUser"
                        checked={isVisibleToUser}
                        onChange={(e) => setIsVisibleToUser(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="visibleToUser" className="ml-2 text-sm text-gray-700">
                        メモをユーザーに表示する
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* エントリー内容 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">エントリー内容</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedEntry.content}</p>
                </div>
              </div>

              {/* カウンセラーメモ */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">カウンセラーメモ</h3>
                <textarea
                  value={memoText}
                  onChange={(e) => setMemoText(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="カウンセラーメモを入力してください..."
                />
              </div>

              {/* アクションボタン */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleDeleteEntry(selectedEntry.id)}
                  disabled={deleting}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>{deleting ? '削除中...' : 'エントリーを削除'}</span>
                </button>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowEntryDetails(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSaveMemo}
                    disabled={savingMemo}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{savingMemo ? '保存中...' : 'メモを保存'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ユーザー詳細モーダル */}
      {showUserDetails && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">ユーザー詳細</h2>
              <button
                onClick={() => setShowUserDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">基本情報</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">名前</label>
                      <p className="text-sm text-gray-900">{selectedUser.name || '未設定'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">メールアドレス</label>
                      <p className="text-sm text-gray-900">{selectedUser.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">ユーザーID</label>
                      <p className="text-sm text-gray-900 font-mono">{selectedUser.id}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">アクティビティ</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">登録日</label>
                      <p className="text-sm text-gray-900">{formatDate(selectedUser.created_at)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">最終ログイン</label>
                      <p className="text-sm text-gray-900">
                        {selectedUser.last_login ? formatDate(selectedUser.last_login) : '未ログイン'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">ステータス</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedUser.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedUser.is_active ? 'アクティブ' : '無効'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ユーザーの日記エントリー統計 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">日記エントリー統計</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {entries.filter(e => e.user_id === selectedUser.id).length}
                      </div>
                      <div className="text-sm text-gray-600">総エントリー数</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {entries.filter(e => e.user_id === selectedUser.id && e.urgency_level === 'high').length}
                      </div>
                      <div className="text-sm text-gray-600">高緊急度</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {entries.filter(e => e.user_id === selectedUser.id && e.counselor_memo).length}
                      </div>
                      <div className="text-sm text-gray-600">メモ付き</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {entries.filter(e => e.user_id === selectedUser.id && e.assigned_counselor).length}
                      </div>
                      <div className="text-sm text-gray-600">担当者割当済</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowUserDetails(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;