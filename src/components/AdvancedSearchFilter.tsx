import React, { useState, useEffect } from 'react';
import { Search, Filter, X, Calendar, User, AlertTriangle, Tag, ChevronDown, ChevronUp, RotateCcw, Download, Eye, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SearchFilters {
  keyword: string;
  emotion: string;
  urgency: string;
  counselor: string;
  dateRange: {
    start: string;
    end: string;
  };
  userSearch: string;
  hasNotes: boolean | null;
  scoreRange: {
    selfEsteemMin: number;
    selfEsteemMax: number;
    worthlessnessMin: number;
    worthlessnessMax: number;
  };
}

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
}

interface AdvancedSearchFilterProps {
  entries: JournalEntry[];
  onFilteredResults: (filtered: JournalEntry[]) => void;
  onViewEntry: (entry: JournalEntry) => void; 
  onDeleteEntry?: (entryId: string) => void;
}

// デフォルトの感情リスト
const defaultEmotions = [
  '恐怖', '悲しみ', '怒り', '悔しい', '無価値感', '罪悪感', '寂しさ', '恥ずかしさ', 
  '嬉しい', '感謝', '達成感', '幸せ' 
];

const AdvancedSearchFilter: React.FC<AdvancedSearchFilterProps> = ({
  entries,
  onFilteredResults = () => {},
  onViewEntry,
  onDeleteEntry
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: '',
    emotion: '',
    urgency: '',
    counselor: '',
    dateRange: {
      start: '',
      end: ''
    },
    userSearch: '',
    hasNotes: null,
    scoreRange: {
      selfEsteemMin: 1,
      selfEsteemMax: 10,
      worthlessnessMin: 1,
      worthlessnessMax: 10
    }
  });

  // Use a local state for filtered entries
  const [localFilteredEntries, setLocalFilteredEntries] = useState<JournalEntry[]>(entries);
  const [savedSearches, setSavedSearches] = useState<Array<{id: string, name: string, filters: SearchFilters}>>([]);
  const [searchName, setSearchName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSaveSearch, setShowSaveSearch] = useState(false);

  // 使用する感情リスト
  const emotions = defaultEmotions;

  const counselors = [
    '未割り当て',
    '田中カウンセラー',
    '佐藤カウンセラー',
    '山田カウンセラー'
  ];

  // 管理者モードの確認
  useEffect(() => {
    const checkAdminMode = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          
          setIsAdminMode(profile?.role === 'admin');
        }
      } catch (error) {
        console.error('管理者権限の確認に失敗しました:', error);
      }
    };

    checkAdminMode();
  }, []);

  // 保存された検索条件の読み込み
  useEffect(() => {
    const loadSavedSearches = () => {
      const saved = localStorage.getItem('savedSearches');
      if (saved) {
        setSavedSearches(JSON.parse(saved));
      }
    };
    loadSavedSearches();
  }, []);

  // フィルタリング処理
  useEffect(() => {
    const filtered = entries.filter(entry => {
      // キーワード検索
      if (filters.keyword) {
        const keyword = filters.keyword.toLowerCase();
        const searchText = `${entry.event} ${entry.realization} ${entry.emotion}`.toLowerCase();
        if (!searchText.includes(keyword)) return false;
      }

      // 感情フィルタ
      if (filters.emotion && entry.emotion !== filters.emotion) return false;

      // 緊急度フィルタ
      if (filters.urgency && entry.urgency_level !== filters.urgency) return false;

      // カウンセラーフィルタ
      if (filters.counselor) {
        if (filters.counselor === '未割り当て' && entry.assigned_counselor) return false;
        if (filters.counselor !== '未割り当て' && entry.assigned_counselor !== filters.counselor) return false;
      }

      // 日付範囲フィルタ
      if (filters.dateRange.start && entry.date < filters.dateRange.start) return false;
      if (filters.dateRange.end && entry.date > filters.dateRange.end) return false;

      // ユーザー検索
      if (filters.userSearch && entry.user?.line_username) {
        if (!entry.user.line_username.toLowerCase().includes(filters.userSearch.toLowerCase())) return false;
      }

      // メモの有無フィルタ
      if (filters.hasNotes !== null) {
        const hasNotes = Boolean(entry.counselor_memo && entry.counselor_memo.trim());
        if (filters.hasNotes !== hasNotes) return false;
      }

      // スコア範囲フィルタ
      if (entry.self_esteem_score !== undefined) {
        if (entry.self_esteem_score < filters.scoreRange.selfEsteemMin || 
            entry.self_esteem_score > filters.scoreRange.selfEsteemMax) return false;
      }
      if (entry.worthlessness_score !== undefined) {
        if (entry.worthlessness_score < filters.scoreRange.worthlessnessMin || 
            entry.worthlessness_score > filters.scoreRange.worthlessnessMax) return false;
      }

      return true;
    });

    setLocalFilteredEntries(filtered);
    onFilteredResults(filtered);
  }, [entries, filters, onFilteredResults]);

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleDateRangeChange = (key: 'start' | 'end', value: string) => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [key]: value
      }
    }));
  };

  const handleScoreRangeChange = (key: keyof SearchFilters['scoreRange'], value: number) => {
    setFilters(prev => ({
      ...prev,
      scoreRange: {
        ...prev.scoreRange,
        [key]: value
      }
    }));
  };

  const resetFilters = () => {
    setFilters({
      keyword: '',
      emotion: '',
      urgency: '',
      counselor: '',
      dateRange: {
        start: '',
        end: ''
      },
      userSearch: '',
      hasNotes: null,
      scoreRange: {
        selfEsteemMin: 1,
        selfEsteemMax: 10,
        worthlessnessMin: 1,
        worthlessnessMax: 10
      }
    });
  };

  const saveSearch = () => {
    if (!searchName.trim()) return;

    const newSearch = {
      id: Date.now().toString(),
      name: searchName,
      filters: { ...filters }
    };

    const updatedSearches = [...savedSearches, newSearch];
    setSavedSearches(updatedSearches);
    localStorage.setItem('savedSearches', JSON.stringify(updatedSearches));
    setSearchName('');
    setShowSaveSearch(false);
  };

  const loadSearch = (savedFilters: SearchFilters) => {
    setFilters(savedFilters);
  };

  const deleteSavedSearch = (id: string) => {
    const updatedSearches = savedSearches.filter(search => search.id !== id);
    setSavedSearches(updatedSearches);
    localStorage.setItem('savedSearches', JSON.stringify(updatedSearches));
  };

  const exportResults = () => {
    const csvContent = [
      ['日付', '感情', '出来事', '気づき', '自尊心スコア', '無価値感スコア', 'ユーザー', 'カウンセラー', '緊急度', 'メモ'],
      ...localFilteredEntries.map(entry => [
        entry.date,
        entry.emotion,
        entry.event,
        entry.realization,
        entry.self_esteem_score || '',
        entry.worthlessness_score || '',
        entry.user?.line_username || '',
        entry.assigned_counselor || '未割り当て',
        entry.urgency_level || '',
        entry.counselor_memo || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `journal_entries_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getUrgencyLabel = (urgency?: string) => {
    switch (urgency) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return '未設定';
    }
  };

  return (
    <div className="space-y-6">
      {/* 検索フィルター */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-jp-bold text-gray-900">高度な検索</h2>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 transition-colors"
          >
            <span className="text-sm font-jp-medium">
              {isExpanded ? '折りたたむ' : '展開する'}
            </span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* 基本検索 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-jp-medium text-gray-700 mb-2">
              キーワード検索
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filters.keyword}
                onChange={(e) => handleFilterChange('keyword', e.target.value)}
                placeholder="出来事、気づき、感情を検索..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-jp-normal"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-jp-medium text-gray-700 mb-2">
              感情
            </label>
            <select
              value={filters.emotion}
              onChange={(e) => handleFilterChange('emotion', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-jp-normal"
            >
              <option value="">すべての感情</option>
              {emotions.map(emotion => (
                <option key={emotion} value={emotion}>{emotion}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-jp-medium text-gray-700 mb-2">
              緊急度
            </label>
            <select
              value={filters.urgency}
              onChange={(e) => handleFilterChange('urgency', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-jp-normal"
            >
              <option value="">すべての緊急度</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>
        </div>

        {/* 詳細フィルター */}
        {isExpanded && (
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-jp-medium text-gray-700 mb-2">
                  担当カウンセラー
                </label>
                <select
                  value={filters.counselor}
                  onChange={(e) => handleFilterChange('counselor', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-jp-normal"
                >
                  <option value="">すべてのカウンセラー</option>
                  {counselors.map(counselor => (
                    <option key={counselor} value={counselor}>{counselor}</option>
                  ))}
                </select>
              </div>

              {isAdminMode && (
                <div>
                  <label className="block text-sm font-jp-medium text-gray-700 mb-2">
                    ユーザー検索
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={filters.userSearch}
                      onChange={(e) => handleFilterChange('userSearch', e.target.value)}
                      placeholder="ユーザー名で検索..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-jp-normal"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-jp-medium text-gray-700 mb-2">
                  カウンセラーメモ
                </label>
                <select
                  value={filters.hasNotes === null ? '' : filters.hasNotes.toString()}
                  onChange={(e) => handleFilterChange('hasNotes', e.target.value === '' ? null : e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-jp-normal"
                >
                  <option value="">すべて</option>
                  <option value="true">メモあり</option>
                  <option value="false">メモなし</option>
                </select>
              </div>
            </div>

            {/* 日付範囲 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-jp-medium text-gray-700 mb-2">
                  開始日
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={filters.dateRange.start}
                    onChange={(e) => handleDateRangeChange('start', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-jp-normal"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-jp-medium text-gray-700 mb-2">
                  終了日
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={filters.dateRange.end}
                    onChange={(e) => handleDateRangeChange('end', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-jp-normal"
                  />
                </div>
              </div>
            </div>

            {/* スコア範囲 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-jp-medium text-gray-700 mb-2">
                  自尊心スコア範囲
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={filters.scoreRange.selfEsteemMin}
                    onChange={(e) => handleScoreRangeChange('selfEsteemMin', parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600 w-8">{filters.scoreRange.selfEsteemMin}</span>
                  <span className="text-sm text-gray-400">〜</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={filters.scoreRange.selfEsteemMax}
                    onChange={(e) => handleScoreRangeChange('selfEsteemMax', parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600 w-8">{filters.scoreRange.selfEsteemMax}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-jp-medium text-gray-700 mb-2">
                  無価値感スコア範囲
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={filters.scoreRange.worthlessnessMin}
                    onChange={(e) => handleScoreRangeChange('worthlessnessMin', parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600 w-8">{filters.scoreRange.worthlessnessMin}</span>
                  <span className="text-sm text-gray-400">〜</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={filters.scoreRange.worthlessnessMax}
                    onChange={(e) => handleScoreRangeChange('worthlessnessMax', parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600 w-8">{filters.scoreRange.worthlessnessMax}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={resetFilters}
              className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm font-jp-medium">リセット</span>
            </button>
            
            <button
              onClick={() => setShowSaveSearch(!showSaveSearch)}
              className="flex items-center space-x-1 px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Tag className="w-4 h-4" />
              <span className="text-sm font-jp-medium">検索条件を保存</span>
            </button>

            <button
              onClick={exportResults}
              className="flex items-center space-x-1 px-3 py-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm font-jp-medium">CSVエクスポート</span>
            </button>
          </div>

          {/* 保存された検索条件 */}
          {savedSearches.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600 font-jp-medium">保存済み:</span>
              {savedSearches.map(search => (
                <div key={search.id} className="flex items-center bg-gray-100 rounded-lg">
                  <button
                    onClick={() => loadSearch(search.filters)}
                    className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900 font-jp-normal"
                  >
                    {search.name}
                  </button>
                  <button
                    onClick={() => deleteSavedSearch(search.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 検索条件保存フォーム */}
        {showSaveSearch && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="検索条件の名前を入力..."
                className="flex-1 px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-jp-normal"
              />
              <button
                onClick={saveSearch}
                disabled={!searchName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-jp-medium"
              >
                保存
              </button>
              <button
                onClick={() => setShowSaveSearch(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 検索結果 */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-jp-bold text-gray-900">検索結果</h3>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>表示: {localFilteredEntries.length}件</span>
            {localFilteredEntries.length !== entries.length && (
              <span>/ 全体: {entries.length}件</span>
            )}
          </div>
        </div>

        {localFilteredEntries.length === 0 ? (
          <div className="text-center py-8">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-jp-medium text-gray-500 mb-2">
              検索結果がありません
            </h3>
            <p className="text-gray-400 font-jp-normal">
              検索条件を変更してお試しください
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {localFilteredEntries.map((entry) => (
              <div key={entry.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-500 font-jp-normal">{entry.date}</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-jp-medium">
                      {entry.emotion}
                    </span>
                    {entry.urgency_level && (
                      <span className={`px-2 py-1 rounded-full text-xs font-jp-medium ${getUrgencyColor(entry.urgency_level)}`}>
                        緊急度: {getUrgencyLabel(entry.urgency_level)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onViewEntry(entry)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="詳細を見る"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {isAdminMode && onDeleteEntry && (
                      <button
                        onClick={() => onDeleteEntry(entry.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-jp-medium text-gray-700">出来事: </span>
                    <span className="text-sm text-gray-900 font-jp-normal">{entry.event}</span>
                  </div>
                  <div>
                    <span className="text-sm font-jp-medium text-gray-700">気づき: </span>
                    <span className="text-sm text-gray-900 font-jp-normal">{entry.realization}</span>
                  </div>
                </div>

                {(entry.self_esteem_score || entry.worthlessness_score) && (
                  <div className="flex items-center space-x-4 mt-3 pt-3 border-t border-gray-100">
                    {entry.self_esteem_score && (
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-gray-600 font-jp-medium">自尊心:</span>
                        <span className="text-xs font-jp-bold text-blue-600">{entry.self_esteem_score}/10</span>
                      </div>
                    )}
                    {entry.worthlessness_score && (
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-gray-600 font-jp-medium">無価値感:</span>
                        <span className="text-xs font-jp-bold text-red-600">{entry.worthlessness_score}/10</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    {isAdminMode && entry.user?.line_username && (
                      <span className="font-jp-normal">ユーザー: {entry.user.line_username}</span>
                    )}
                    <span className="font-jp-normal">
                      カウンセラー: {entry.assigned_counselor || '未割り当て'}
                    </span>
                  </div>
                  {entry.counselor_memo && (
                    <div className="flex items-center space-x-1 text-xs text-green-600">
                      <Tag className="w-3 h-3" />
                      <span className="font-jp-medium">メモあり</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedSearchFilter;