import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, X, User, Calendar, AlertTriangle, UserCheck, Edit3, Save, MessageSquare, ChevronLeft, ChevronRight, Database, Shield } from 'lucide-react';
import AdvancedSearchFilter from './AdvancedSearchFilter';
import CounselorManagement from './CounselorManagement';
import MaintenanceController from './MaintenanceController';
import DeviceAuthManagement from './DeviceAuthManagement';
import SecurityDashboard from './SecurityDashboard';
import { diaryService } from '../lib/supabase';

interface JournalEntry {
  id: string;
  date: string;
  emotion: string;
  event: string;
  realization: string;
  self_esteem_score: number;
  worthlessness_score: number;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState('');
  const [selectedCounselor, setSelectedCounselor] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningEntry, setAssigningEntry] = useState<JournalEntry | null>(null);
  const [editingMemo, setEditingMemo] = useState<string | null>(null);
  const [memoText, setMemoText] = useState('');
  const [memoVisibleToUser, setMemoVisibleToUser] = useState(false);
  const [activeTab, setActiveTab] = useState<'diary' | 'search' | 'counselor' | 'maintenance' | 'device-auth' | 'security'>('diary');
  const [currentCounselor, setCurrentCounselor] = useState<string | null>(null);

  const emotions = [
    '恐怖', '悲しみ', '怒り', '悔しい', '無価値感', '罪悪感', '寂しさ', '恥ずかしさ'
  ];

  const counselors = [
    '未割り当て',
    '心理カウンセラー仁',
    '心理カウンセラーAOI',
    '心理カウンセラーあさみ',
    '心理カウンセラーSHU',
    '心理カウンセラーゆーちゃ',
    '心理カウンセラーSammy'
  ];

  const urgencyLevels = [
    { value: 'high', label: '高', color: 'bg-red-100 text-red-800 border-red-200' },
    { value: 'medium', label: '中', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    { value: 'low', label: '低', color: 'bg-green-100 text-green-800 border-green-200' }
  ];

  useEffect(() => {
    loadEntries();
    
    // ログイン中のカウンセラー名を取得
    const counselorName = localStorage.getItem('current_counselor');
    if (counselorName) {
      // 古い形式のカウンセラー名を新しい形式に変換
      const newFormatName = convertCounselorNameFormat(counselorName);
      setCurrentCounselor(newFormatName);
      localStorage.setItem('current_counselor', newFormatName);
    } else {
      // デフォルトのカウンセラー名を設定（デモ用）
      setCurrentCounselor('心理カウンセラー仁');
      localStorage.setItem('current_counselor', '心理カウンセラー仁');
    }
  }, []);

  // カウンセラー名の形式を変換する関数
  const convertCounselorNameFormat = (oldName: string): string => {
    const nameMap: { [key: string]: string } = {
      '仁カウンセラー': '心理カウンセラー仁',
      'AOIカウンセラー': '心理カウンセラーAOI',
      'あさみカウンセラー': '心理カウンセラーあさみ',
      'SHUカウンセラー': '心理カウンセラーSHU',
      'ゆーちゃカウンセラー': '心理カウンセラーゆーちゃ',
      'sammyカウンセラー': '心理カウンセラーSammy'
    };
    
    return nameMap[oldName] || oldName;
  };

  useEffect(() => {
    filterEntries();
  }, [entries, searchTerm, selectedEmotion, selectedUrgency, selectedCounselor, selectedDate]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      // ローカルストレージからデータを読み込み（デモ用）
      const localEntries = localStorage.getItem('journalEntries');
      if (localEntries) {
        const parsedEntries = JSON.parse(localEntries);
        
        // 管理画面用にデータを拡張
        const enhancedEntries = parsedEntries.map((entry: any) => ({
          ...entry,
          self_esteem_score: entry.selfEsteemScore || 50,
          worthlessness_score: entry.worthlessnessScore || 50,
          created_at: entry.date,
          user: {
            line_username: 'テストユーザー'
          },
          assigned_counselor: entry.assigned_counselor || '未割り当て',
          urgency_level: entry.urgency_level || 'medium',
          counselor_memo: entry.counselor_memo || '',
          is_visible_to_user: entry.is_visible_to_user || false,
          counselor_name: entry.counselor_name || ''
        }));
        
        setEntries(enhancedEntries);
      }
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterEntries = () => {
    let filtered = [...entries];

    if (searchTerm) {
      filtered = filtered.filter(entry =>
        entry.event.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.realization.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.user?.line_username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.counselor_memo || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedEmotion) {
      filtered = filtered.filter(entry => entry.emotion === selectedEmotion);
    }

    if (selectedUrgency) {
      filtered = filtered.filter(entry => entry.urgency_level === selectedUrgency);
    }

    if (selectedCounselor) {
      filtered = filtered.filter(entry => entry.assigned_counselor === selectedCounselor);
    }

    if (selectedDate) {
      filtered = filtered.filter(entry => entry.date === selectedDate);
    }

    // 日付順でソート（新しい順）
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setFilteredEntries(filtered);
  };

  const handleAssignCounselor = (entry: JournalEntry) => {
    setAssigningEntry(entry);
    setShowAssignModal(true);
  };

  const handleSaveAssignment = (counselor: string) => {
    if (!assigningEntry) return;

    // ローカルストレージを更新
    const localEntries = localStorage.getItem('journalEntries');
    if (localEntries) {
      const parsedEntries = JSON.parse(localEntries);
      const updatedEntries = parsedEntries.map((entry: any) =>
        entry.id === assigningEntry.id
          ? { ...entry, assigned_counselor: counselor }
          : entry
      );
      localStorage.setItem('journalEntries', JSON.stringify(updatedEntries));
    }

    // 状態を更新
    setEntries(prev => prev.map(entry =>
      entry.id === assigningEntry.id
        ? { ...entry, assigned_counselor: counselor }
        : entry
    ));

    setShowAssignModal(false);
    setAssigningEntry(null);
  };

  const handleUpdateUrgency = (entryId: string, urgencyLevel: 'high' | 'medium' | 'low') => {
    // ローカルストレージを更新
    const localEntries = localStorage.getItem('journalEntries');
    if (localEntries) {
      const parsedEntries = JSON.parse(localEntries);
      const updatedEntries = parsedEntries.map((entry: any) =>
        entry.id === entryId
          ? { ...entry, urgency_level: urgencyLevel }
          : entry
      );
      localStorage.setItem('journalEntries', JSON.stringify(updatedEntries));
    }

    // 状態を更新
    setEntries(prev => prev.map(entry =>
      entry.id === entryId
        ? { ...entry, urgency_level: urgencyLevel }
        : entry
    ));
  };

  const handleEditMemo = (entryId: string, currentMemo: string, isVisibleToUser: boolean = false, counselorName: string = '') => {
    setEditingMemo(entryId);
    setMemoText(currentMemo);
    setMemoVisibleToUser(isVisibleToUser);
  };

  const handleSaveMemo = (entryId: string) => {
    if (!memoText.trim()) {
      alert('メモを入力してください');
      return;
    }
    
    // ローカルストレージを更新
    const localEntries = localStorage.getItem('journalEntries');
    if (localEntries) {
      const parsedEntries = JSON.parse(localEntries);
      const updatedEntries = parsedEntries.map((entry: any) =>
        entry.id === entryId
          ? { 
              ...entry, 
              counselor_memo: memoText,
              is_visible_to_user: memoVisibleToUser,
              counselor_name: memoVisibleToUser ? currentCounselor : entry.counselor_name
            }
          : entry
      );
      localStorage.setItem('journalEntries', JSON.stringify(updatedEntries));
    }

    // 状態を更新
    setEntries(prev => prev.map(entry =>
      entry.id === entryId
        ? { 
            ...entry, 
            counselor_memo: memoText,
            is_visible_to_user: memoVisibleToUser,
            counselor_name: memoVisibleToUser ? currentCounselor : entry.counselor_name
          }
        : entry
    ));

    setEditingMemo(null);
    setMemoText('');
    setMemoVisibleToUser(false);
    
    // 保存成功メッセージ
    alert(memoVisibleToUser ? 'メモを保存し、ユーザーに表示します' : 'メモを保存しました');
  };

  const handleCancelMemo = () => {
    setEditingMemo(null);
    setMemoText('');
    setMemoVisibleToUser(false);
  };

  const generateCalendar = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return { days, firstDay, lastDay };
  };

  const handleDateSelect = (selectedDateObj: Date) => {
    const dateString = selectedDateObj.toISOString().split('T')[0];
    setSelectedDate(dateString);
    setShowCalendar(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(calendarDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCalendarDate(newDate);
  };

  const clearDateFilter = () => {
    setSelectedDate('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getEmotionColor = (emotion: string) => {
    const colorMap: { [key: string]: string } = {
      '恐怖': 'bg-purple-100 text-purple-800 border-purple-200',
      '悲しみ': 'bg-blue-100 text-blue-800 border-blue-200',
      '怒り': 'bg-red-100 text-red-800 border-red-200',
      '悔しい': 'bg-green-100 text-green-800 border-green-200',
      '無価値感': 'bg-gray-100 text-gray-800 border-gray-300',
      '罪悪感': 'bg-orange-100 text-orange-800 border-orange-200',
      '寂しさ': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      '恥ずかしさ': 'bg-pink-100 text-pink-800 border-pink-200'
    };
    return colorMap[emotion] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getUrgencyColor = (urgency: string) => {
    const urgencyLevel = urgencyLevels.find(level => level.value === urgency);
    return urgencyLevel?.color || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getCounselorColor = (counselor: string) => {
    if (counselor === '未割り当て') {
      return 'bg-gray-100 text-gray-600 border-gray-200';
    }
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  // 詳細モーダル
  const renderDetailModal = () => {
    if (!selectedEntry) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-jp-bold text-gray-900">日記詳細</h2>
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-jp-medium text-gray-700 mb-1">
                    ユーザー
                  </label>
                  <p className="text-gray-900 font-jp-normal">
                    {selectedEntry.user?.line_username || 'Unknown'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-jp-medium text-gray-700 mb-1">
                    日付
                  </label>
                  <p className="text-gray-900 font-jp-normal">
                    {formatDate(selectedEntry.date)}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-jp-medium text-gray-700 mb-2">
                  感情
                </label>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-jp-medium border ${getEmotionColor(selectedEntry.emotion)}`}>
                  {selectedEntry.emotion}
                </span>
              </div>

              <div>
                <label className="block text-sm font-jp-medium text-gray-700 mb-2">
                  出来事
                </label>
                <p className="text-gray-900 font-jp-normal leading-relaxed bg-gray-50 p-4 rounded-lg">
                  {selectedEntry.event}
                </p>
              </div>

              <div>
                <label className="block text-sm font-jp-medium text-gray-700 mb-2">
                  気づき
                </label>
                <p className="text-gray-900 font-jp-normal leading-relaxed bg-gray-50 p-4 rounded-lg">
                  {selectedEntry.realization}
                </p>
              </div>

              {selectedEntry.emotion === '無価値感' && (
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <label className="block text-sm font-jp-medium text-gray-700 mb-2">
                    スコア
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">自己肯定感:</span>
                      <span className="ml-2 font-jp-bold text-blue-600">
                        {selectedEntry.self_esteem_score}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">無価値感:</span>
                      <span className="ml-2 font-jp-bold text-red-600">
                        {selectedEntry.worthlessness_score}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-jp-medium text-gray-700 mb-2">
                    担当カウンセラー
                  </label>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-jp-medium border ${getCounselorColor(selectedEntry.assigned_counselor || '未割り当て')}`}>
                    {selectedEntry.assigned_counselor || '未割り当て'}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-jp-medium text-gray-700 mb-2">
                    緊急度
                  </label>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-jp-medium border ${getUrgencyColor(selectedEntry.urgency_level || 'medium')}`}>
                    {urgencyLevels.find(level => level.value === selectedEntry.urgency_level)?.label || '中'}
                  </span>
                </div>
              </div>

              {/* カウンセラーメモ */}
              <div>
                <label className="block text-sm font-jp-medium text-gray-700 mb-2">
                  カウンセラーメモ
                </label>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {selectedEntry.is_visible_to_user && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full border border-green-200">
                          ユーザーに表示
                        </span>
                      )}
                      {selectedEntry.counselor_name && (
                        <span className="text-xs text-gray-600">
                          {selectedEntry.counselor_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-900 font-jp-normal leading-relaxed">
                    {selectedEntry.counselor_memo || 'メモがありません'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 担当者選択モーダル
  const renderAssignmentModal = () => {
    if (!showAssignModal || !assigningEntry) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-jp-bold text-gray-900">担当カウンセラーを選択</h2>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {counselors.map((counselor) => (
                <button
                  key={counselor}
                  onClick={() => handleSaveAssignment(counselor)}
                  className={`w-full p-3 text-left rounded-lg border-2 transition-all hover:bg-gray-50 ${
                    assigningEntry.assigned_counselor === counselor
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      counselor === '未割り当て' ? 'bg-gray-400' : 'bg-blue-500'
                    }`}></div>
                    <span className="font-jp-medium text-gray-900">{counselor}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 px-4">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-jp-bold text-gray-900 mb-6">管理画面</h1>

        {/* タブナビゲーション */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-2 sm:space-x-4 lg:space-x-8 overflow-x-auto">
            {[
              { key: 'diary', label: '日記管理', shortLabel: '日記', icon: MessageSquare },
              { key: 'search', label: '高度な検索', shortLabel: '検索', icon: Search },
              { key: 'counselor', label: 'カウンセラー', shortLabel: 'カウンセラー', icon: User },
              { key: 'maintenance', label: 'メンテナンス', shortLabel: 'メンテ', icon: AlertTriangle },
              { key: 'device-auth', label: 'デバイス認証', shortLabel: '認証', icon: Shield },
              { key: 'security', label: 'セキュリティ', shortLabel: 'セキュリティ', icon: Eye }
            ].map(({ key, label, shortLabel, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`py-2 px-2 sm:px-3 lg:px-4 border-b-2 font-jp-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                  activeTab === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{shortLabel}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* タブコンテンツ */}
        {activeTab === 'diary' && (
          <>
            {/* フィルター */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-jp-medium text-gray-700 mb-2">
                    検索
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="ユーザー名、出来事、気づき、メモで検索"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-jp-normal text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-jp-medium text-gray-700 mb-2">
                    感情
                  </label>
                  <select
                    value={selectedEmotion}
                    onChange={(e) => setSelectedEmotion(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-jp-normal text-sm"
                  >
                    <option value="">すべて</option>
                    {emotions.map((emotion) => (
                      <option key={emotion} value={emotion}>{emotion}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-jp-medium text-gray-700 mb-2">
                    緊急度
                  </label>
                  <select
                    value={selectedUrgency}
                    onChange={(e) => setSelectedUrgency(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-jp-normal text-sm"
                  >
                    <option value="">すべて</option>
                    {urgencyLevels.map((level) => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-jp-medium text-gray-700 mb-2">
                    担当者
                  </label>
                  <select
                    value={selectedCounselor}
                    onChange={(e) => setSelectedCounselor(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-jp-normal text-sm"
                  >
                    <option value="">すべて</option>
                    {counselors.map((counselor) => (
                      <option key={counselor} value={counselor}>{counselor}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-jp-medium text-gray-700 mb-2">
                    日付検索
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setShowCalendar(!showCalendar)}
                      className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-jp-normal text-sm bg-white hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className={selectedDate ? 'text-gray-900' : 'text-gray-500'}>
                          {selectedDate ? new Date(selectedDate).toLocaleDateString('ja-JP') : '日付を選択'}
                        </span>
                      </div>
                      {selectedDate && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            clearDateFilter();
                          }}
                          className="text-gray-400 hover:text-gray-600 ml-2"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </button>

                    {/* カレンダーポップアップ */}
                    {showCalendar && (
                      <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 w-80 max-w-[calc(100vw-2rem)]">
                        {/* カレンダーヘッダー */}
                        <div className="flex items-center justify-between mb-4">
                          <button
                            onClick={() => navigateMonth('prev')}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            <ChevronLeft className="w-5 h-5 text-gray-600" />
                          </button>
                          <h3 className="font-jp-bold text-gray-900">
                            {calendarDate.getFullYear()}年{calendarDate.getMonth() + 1}月
                          </h3>
                          <button
                            onClick={() => navigateMonth('next')}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            <ChevronRight className="w-5 h-5 text-gray-600" />
                          </button>
                        </div>

                        {/* 曜日ヘッダー */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
                            <div key={day} className="text-center text-xs font-jp-medium text-gray-500 py-2">
                              {day}
                            </div>
                          ))}
                        </div>

                        {/* カレンダー日付 */}
                        <div className="grid grid-cols-7 gap-1">
                          {generateCalendar(calendarDate).days.map((day, index) => {
                            const isCurrentMonth = day.getMonth() === calendarDate.getMonth();
                            const dayString = day.toISOString().split('T')[0];
                            const isSelected = dayString === selectedDate;
                            const isToday = dayString === new Date().toISOString().split('T')[0];
                            const hasEntries = entries.some(entry => entry.date === dayString);
                            
                            return (
                              <button
                                key={index}
                                onClick={() => handleDateSelect(day)}
                                className={`
                                  w-8 h-8 text-xs font-jp-normal rounded transition-colors relative
                                  ${isCurrentMonth ? 'text-gray-900' : 'text-gray-300'}
                                  ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}
                                  ${isToday && !isSelected ? 'bg-blue-100 text-blue-600' : ''}
                                  ${hasEntries && !isSelected ? 'font-jp-bold' : ''}
                                `}
                              >
                                {day.getDate()}
                                {hasEntries && (
                                  <div className={`absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full ${
                                    isSelected ? 'bg-white' : 'bg-blue-500'
                                  }`}></div>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* 閉じるボタン */}
                        <div className="mt-4 text-center">
                          <button
                            onClick={() => setShowCalendar(false)}
                            className="text-sm text-gray-500 hover:text-gray-700 font-jp-normal"
                          >
                            閉じる
                          </button>
                        </div>

                        {/* 凡例 */}
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center justify-center space-x-4 text-xs text-gray-600">
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span>日記あり</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-blue-100 rounded-full"></div>
                              <span>今日</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* アクティブフィルター表示 */}
              {(searchTerm || selectedEmotion || selectedUrgency || selectedCounselor || selectedDate) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-jp-medium text-gray-700">アクティブフィルター:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {searchTerm && (
                      <span className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        <span>検索: {searchTerm}</span>
                        <button onClick={() => setSearchTerm('')} className="hover:text-blue-900">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {selectedEmotion && (
                      <span className="inline-flex items-center space-x-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                        <span>感情: {selectedEmotion}</span>
                        <button onClick={() => setSelectedEmotion('')} className="hover:text-purple-900">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {selectedUrgency && (
                      <span className="inline-flex items-center space-x-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                        <span>緊急度: {urgencyLevels.find(level => level.value === selectedUrgency)?.label}</span>
                        <button onClick={() => setSelectedUrgency('')} className="hover:text-orange-900">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {selectedCounselor && (
                      <span className="inline-flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                        <span>担当者: {selectedCounselor}</span>
                        <button onClick={() => setSelectedCounselor('')} className="hover:text-green-900">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {selectedDate && (
                      <span className="inline-flex items-center space-x-1 px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs">
                        <span>日付: {new Date(selectedDate).toLocaleDateString('ja-JP')}</span>
                        <button onClick={clearDateFilter} className="hover:text-indigo-900">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 統計情報 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-jp-medium text-gray-700">
                    {(searchTerm || selectedEmotion || selectedUrgency || selectedCounselor || selectedDate) ? '検索結果' : '総日記数'}
                  </span>
                </div>
                <p className="text-2xl font-jp-bold text-blue-600 mt-1">{filteredEntries.length}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-jp-medium text-gray-700">高緊急度</span>
                </div>
                <p className="text-2xl font-jp-bold text-red-600 mt-1">
                  {filteredEntries.filter(e => e.urgency_level === 'high').length}
                </p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm font-jp-medium text-gray-700">中緊急度</span>
                </div>
                <p className="text-2xl font-jp-bold text-yellow-600 mt-1">
                  {filteredEntries.filter(e => e.urgency_level === 'medium').length}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-jp-medium text-gray-700">未割り当て</span>
                </div>
                <p className="text-2xl font-jp-bold text-gray-600 mt-1">
                  {filteredEntries.filter(e => e.assigned_counselor === '未割り当て').length}
                </p>
              </div>
            </div>

            {/* 日記一覧 */}
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-jp-normal">読み込み中...</p>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center py-8">
                <Filter className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-jp-medium text-gray-500 mb-2">
                  該当する日記がありません
                </h3>
                <p className="text-gray-400 font-jp-normal">
                  フィルター条件を変更してください
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEntries.map((entry) => (
                  <div key={entry.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="font-jp-medium text-gray-900">
                          {entry.user?.line_username || 'Unknown User'}
                        </span>
                        <span className="text-gray-500 text-sm font-jp-normal">
                          {formatDate(entry.date)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedEntry(entry)}
                          className="text-blue-600 hover:text-blue-700 p-1"
                          title="詳細を見る"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleAssignCounselor(entry)}
                          className="text-green-600 hover:text-green-700 p-1"
                          title="担当者を変更"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-jp-medium border ${getEmotionColor(entry.emotion)}`}>
                        {entry.emotion}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-jp-medium border ${getCounselorColor(entry.assigned_counselor || '未割り当て')}`}>
                        {entry.assigned_counselor || '未割り当て'}
                      </span>
                    </div>

                    <div className="mb-3">
                      <p className="text-gray-700 text-sm font-jp-normal line-clamp-2 break-words">
                        {entry.event.length > 100 ? `${entry.event.substring(0, 100)}...` : entry.event}
                      </p>
                    </div>

                    {/* カウンセラーメモセクション */}
                    <div className="mb-3 bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <MessageSquare className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-jp-medium text-blue-900">カウンセラーメモ</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {entry.is_visible_to_user && (
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full border border-green-200">
                              ユーザーに表示
                            </span>
                          )}
                          {entry.is_visible_to_user && entry.counselor_name && (
                            <span className="text-xs text-gray-600">
                              {entry.counselor_name}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleEditMemo(entry.id, entry.counselor_memo || '', entry.is_visible_to_user || false, entry.counselor_name || '')}
                          className="text-blue-600 hover:text-blue-700 p-1"
                          title="メモを編集"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {editingMemo === entry.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={memoText}
                            onChange={(e) => setMemoText(e.target.value)}
                            placeholder="カウンセラーメモを入力してください（1行程度）"
                            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-jp-normal text-sm resize-none"
                            rows={2}
                            maxLength={200}
                          />
                          
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`visible-to-user-${entry.id}`}
                              checked={memoVisibleToUser}
                              onChange={(e) => setMemoVisibleToUser(e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label 
                              htmlFor={`visible-to-user-${entry.id}`}
                              className="text-sm font-jp-medium text-gray-700"
                            >
                              ユーザーにコメントとして表示する
                            </label>
                          </div>
                          
                          {memoVisibleToUser && (
                            <div className="mt-2 bg-blue-50 rounded-lg p-2 border border-blue-200">
                              <p className="text-xs text-blue-700">
                                表示時のカウンセラー名: <span className="font-jp-bold">{currentCounselor || '心理カウンセラー'}</span>
                              </p>
                            </div>
                          )}
                          
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={handleCancelMemo}
                              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 font-jp-normal"
                            >
                              キャンセル
                            </button>
                            <button
                              onClick={() => handleSaveMemo(entry.id)}
                              className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-jp-medium transition-colors"
                            >
                              <Save className="w-3 h-3" />
                              <span>保存</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-blue-800 text-sm font-jp-normal leading-relaxed break-words">
                          {entry.counselor_memo || 'メモがありません'}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                        <div>
                          <p className="text-sm font-jp-medium text-gray-700">緊急度</p>
                          <div className="flex space-x-1">
                            {urgencyLevels.map((level) => (
                              <button
                                key={level.value}
                                onClick={() => handleUpdateUrgency(entry.id, level.value)}
                                className={`w-6 h-6 rounded-full border-2 transition-all ${
                                  entry.urgency_level === level.value
                                    ? level.color.replace('bg-', 'bg-').replace('text-', 'border-').replace('border-', 'border-2 border-')
                                    : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
                                }`}
                                title={`緊急度: ${level.label}`}
                              >
                                <span className="sr-only">{level.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {entry.emotion === '無価値感' && (
                        <div className="flex space-x-6 text-sm bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-500 font-jp-medium">自己肯定感:</span>
                            <span className="font-jp-semibold text-blue-600">{entry.self_esteem_score}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-500 font-jp-medium">無価値感:</span>
                            <span className="font-jp-semibold text-red-600">{entry.worthlessness_score}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {activeTab === 'search' && <AdvancedSearchFilter entries={entries} onFilteredResults={setFilteredEntries} onViewEntry={setSelectedEntry} />}
        {activeTab === 'counselor' && <CounselorManagement />}
        {activeTab === 'maintenance' && <MaintenanceController />}
        {activeTab === 'device-auth' && <DeviceAuthManagement />}
        {activeTab === 'security' && <SecurityDashboard />}
      </div>
      {/* 詳細モーダル */}
      {renderDetailModal()}
      
      {/* 担当者選択モーダル */}
      {renderAssignmentModal()}
    </div>
  );
};

export default AdminPanel;