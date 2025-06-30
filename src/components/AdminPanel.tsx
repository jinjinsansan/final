Here's the fixed version with all missing closing brackets added:

```typescript
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
import { supabase, diaryService, syncService } from '../lib/supabase';

interface JournalEntry {
  id: string;
  date: string;
  event: string;
  emotion: string;
  realization: string;
  created_at: string;
  user?: {
    line_username?: string;
  };
  urgency_level?: 'low' | 'medium' | 'high';
  counselor_memo?: string;
  is_visible_to_user?: boolean;
  assigned_counselor?: string;
  source?: 'supabase' | 'local';
}

const AdminPanel: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [editingMemo, setEditingMemo] = useState<string | null>(null);
  const [memoText, setMemoText] = useState('');
  const [memoVisibility, setMemoVisibility] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [emotionFilter, setEmotionFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [currentCounselor, setCurrentCounselor] = useState<string>('');
  const [isSyncInProgress, setIsSyncInProgress] = useState(false);
  const [status, setStatus] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

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

  // 管理者用データを同期する関数
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

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('この日記を削除しますか？')) return;
    
    setDeleting(true);
    try {
      await diaryService.deleteEntry(entryId);
      await loadEntries();
    } catch (error) {
      console.error('削除エラー:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleViewEntry = (entry: JournalEntry) => {
    setSelectedEntry(entry);
  };

  const handleEditMemo = (entryId: string, currentMemo: string = '', isVisible: boolean = false) => {
    setEditingMemo(entryId);
    setMemoText(currentMemo);
    setMemoVisibility(isVisible);
  };

  const handleSaveMemo = async (entryId: string) => {
    try {
      await diaryService.updateCounselorMemo(entryId, memoText, memoVisibility, currentCounselor);
      setEditingMemo(null);
      setMemoText('');
      setMemoVisibility(false);
      await loadEntries();
    } catch (error) {
      console.error('メモ保存エラー:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingMemo(null);
    setMemoText('');
    setMemoVisibility(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // フィルタリング機能
  useEffect(() => {
    let filtered = entries;

    if (searchTerm) {
      filtered = filtered.filter(entry =>
        entry.event.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.realization.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.user?.line_username && entry.user.line_username.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (emotionFilter) {
      filtered = filtered.filter(entry => entry.emotion === emotionFilter);
    }

    if (dateFilter) {
      filtered = filtered.filter(entry => entry.date === dateFilter);
    }

    setFilteredEntries(filtered);
  }, [entries, searchTerm, emotionFilter, dateFilter]);

  const renderEntryDetailsModal = () => {
    if (!selectedEntry) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-jp-bold text-gray-900">日記詳細</h2>
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-4 flex-wrap">
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
                <span className="text-gray-900 font-jp-medium">
                  {selectedEntry.user?.line_username || 'Unknown User'}
                </span>
                <span className="text-gray-500 text-sm">
                  {formatDate(selectedEntry.date)}
                </span>
                {selectedEntry.urgency_level && (
                  <span className={`text-sm font-jp-medium ${
                    selectedEntry.urgency_level === 'high' ? 'text-red-600' :
                    selectedEntry.urgency_level === 'medium' ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    緊急度: {
                      selectedEntry.urgency_level === 'high' ? '高' :
                      selectedEntry.urgency_level === 'medium' ? '中' : '低'
                    }
                  </span>
                )}
              </div>

              <div>
                <h3 className="font-jp-semibold text-gray-700 mb-2">出来事</h3>
                <p className="text-gray-600 font-jp-normal leading-relaxed break-words whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                  {selectedEntry.event}
                </p>
              </div>

              <div>
                <h3 className="font-jp-semibold text-gray-700 mb-2">気づき</h3>
                <p className="text-gray-600 font-jp-normal leading-relaxed break-words whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                  {selectedEntry.realization}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-jp-semibold text-gray-700">カウンセラーメモ</h3>
                  {!editingMemo && (
                    <button
                      onClick={() => handleEditMemo(selectedEntry.id, selectedEntry.counselor_memo, selectedEntry.is_visible_to_user)}
                      className="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-1"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>編集</span>
                    </button>
                  )}
                </div>

                {editingMemo === selectedEntry.id ? (
                  <div className="space-y-3">
                    <textarea
                      value={memoText}
                      onChange={(e) => setMemoText(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg resize-none font-jp-normal"
                      rows={4}
                      placeholder="カウンセラーメモを入力..."
                    />
                    <div className="flex items-center space-x-3">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={memoVisibility}
                          onChange={(e) => setMemoVisibility(e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-700">ユーザーに表示</span>
                      </label>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSaveMemo(selectedEntry.id)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-1"
                      >
                        <Save className="w-4 h-4" />
                        <span>保存</span>
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 flex items-center space-x-1"
                      >
                        <X className="w-4 h-4" />
                        <span>キャンセル</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {selectedEntry.counselor_memo ? (
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-blue-900 font-jp-medium text-sm">メモ</span>
                          {selectedEntry.is_visible_to_user ? (
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
                        <p className="text-blue-800 font-jp-normal leading-relaxed break-words whitespace-pre-wrap">
                          {selectedEntry.counselor_memo}
                        </p>
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">メモはありません</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center text-sm text-gray-500 pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>{new Date(selectedEntry.created_at).toLocaleString('ja-JP')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {selectedEntry.assigned_counselor && (
                    <span className="text-gray-600 font-jp-medium">
                      担当: {selectedEntry.assigned_counselor}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {selectedEntry.source === 'supabase' ? 'Supabase' : 'ローカル'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-jp-bold text-gray-900 mb-2">管理者パネル</h1>
          <p className="text-gray-600 font-jp-normal">
            日記エントリーの管理とカウンセラー機能
            {currentCounselor && (
              <span className="ml-2 text-blue-600 font-jp-medium">
                ({currentCounselor})
              </span>
            )}
          </p>
        </div>

        {status && (
          <div className={`mb-6 p-4 rounded-lg ${
            status.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
            status.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
            'bg-blue-100 text-blue-800 border border-blue-200'
          }`}>
            <div className="flex items-center space-x-2">
              {status.type === 'success' && <CheckCircle className="w-5 h-5" />}
              {status.type === 'error' && <AlertTriangle className="w-5 h-5" />}
              {status.type === 'info' && <RefreshCw className="w-5 h-5" />}
              <span className="font-jp-medium">{status.message}</span>
            </div>
          </div>
        )}

        <Tabs defaultValue="entries" className="space-y-6">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="entries" className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>日記管理</span>
            </TabsTrigger>
            <TabsTrigger value="advanced-search" className="flex items-center space-x-2">
              <Search className="w-4 h-4" />
              <span>高度検索</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center space-x-2">
              <MessageCircle className="w-4 h-4" />
              <span>チャット</span>
            </TabsTrigger>
            <TabsTrigger value="counselors" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>カウンセラー</span>
            </TabsTrigger>
            <TabsTrigger value="backup" className="flex items-center space-x-2">
              <HardDrive className="w-4 h-4" />
              <span>バックアップ</span>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>メンテナンス</span>
            </TabsTrigger>
            <TabsTrigger value="device-auth" className="flex items-center space-x-2">
              <Database className="w-4 h-4" />
              <span>デバイス認証</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>セキュリティ</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entries">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                  <p className="text-gray-600 font-jp-normal">データを読み込み中...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                    <div className="flex items-center space-x-4">
                      <h2 className="text-xl font-jp-bold text-gray-900">日記エントリー</h2>
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-jp-medium">
                        {filteredEntries.length}件
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={handleSyncAdminData}
                        disabled={isSyncInProgress}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                      >
                        <RefreshCw className={`w-4 h-4 ${isSyncInProgress ? 'animate-spin' : ''}`} />
                        <span>{isSyncInProgress ? '同期中...' : 'データ同期'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="検索..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-jp-normal"
                      />
                    </div>
                    <select
                      value={emotionFilter}
                      onChange={(e) => setEmotionFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-jp-normal"
                    >
                      <option value="">すべての感情</option>
                      <option value="恐怖">恐怖</option>
                      <option value="悲しみ">悲しみ</option>
                      <option value="怒り">怒り</option>
                      <option value="悔しい">悔しい</option>
                      <option value="無価値感">無価値感</option>
                      <option value="罪悪感">罪悪感</option>
                      <option value="寂しさ">寂しさ</option>
                      <option value="恥ずかしさ">恥ずかしさ</option>
                    </select>
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-jp-normal"
                    />
                  </div>

                  {filteredEntries.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 font-jp-normal">日記エントリーがありません</p>
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
                                {entry.user?.line_username || 'Unknown User'}
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