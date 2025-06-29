import React, { useState, useEffect } from 'react';
import { Calendar, LineChart, Share2, Download, Filter, RefreshCw, TrendingUp } from 'lucide-react';

// 日付を正規化する関数（時間部分を削除して日付のみにする）
const normalizeDate = (dateString: string): Date => {
  const date = new Date(dateString);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

// 日本時間を取得する関数
const getJapaneseDate = (): Date => {
  const now = new Date();
  const japanOffset = 9 * 60 * 60 * 1000;
  const japanTime = new Date(now.getTime() + japanOffset);
  return japanTime;
};

interface InitialScore {
  selfEsteemScore: number | string;
  worthlessnessScore: number | string;
  measurementMonth: string;
  measurementDay: string;
}

interface EmotionCount {
  emotion: string;
  count: number;
}

interface ChartData {
  date: string;
  selfEsteemScore: number | string;
  worthlessnessScore: number | string;
}

const WorthlessnessChart: React.FC = () => {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week');
  const [loading, setLoading] = useState(true);
  const [allEmotionCounts, setAllEmotionCounts] = useState<{[key: string]: number}>({});
  const [filteredEmotionCounts, setFilteredEmotionCounts] = useState<{[key: string]: number}>({});
  const [emotionCounts, setEmotionCounts] = useState<EmotionCount[]>([]);
  const [initialScore, setInitialScore] = useState<InitialScore | null>(null);

  useEffect(() => {
    loadChartData();
  }, [period]);

  const loadChartData = () => {
    setLoading(true);
    try {
      // 日本時間を取得
      const japanToday = getJapaneseDate();
      
      // ローカルストレージから日記データを取得
      const now = new Date();
      const normalizedToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const savedInitialScores = localStorage.getItem('initialScores');
      const savedEntries = localStorage.getItem('journalEntries');
      
      // 初期スコアを取得
      if (savedInitialScores) {
        try {
          const parsedInitialScores = JSON.parse(savedInitialScores);
          setInitialScore(parsedInitialScores);
        } catch (error) {
          console.error('初期スコア読み込みエラー:', error);
        }
      }
      
      if (savedEntries) {
        const entries = JSON.parse(savedEntries);
        
        console.log('全エントリー数:', entries.length);
        
        // 無価値感の日記のみをフィルタリング
        const worthlessnessEntries = filterByPeriod(entries, period, normalizedToday)
          .sort((a: any, b: any) => normalizeDate(a.date).getTime() - normalizeDate(b.date).getTime());
        
        console.log('無価値感エントリー数:', worthlessnessEntries.length, '期間:', period);
        // 日記データをフォーマット
        let formattedData = worthlessnessEntries.map((entry: any) => ({
          date: entry.date,
          selfEsteemScore: typeof entry.selfEsteemScore === 'number' ? entry.selfEsteemScore : 
                          (typeof entry.selfEsteemScore === 'string' ? parseInt(entry.selfEsteemScore) : 0),
          worthlessnessScore: typeof entry.worthlessnessScore === 'number' ? entry.worthlessnessScore : 
                             (typeof entry.worthlessnessScore === 'string' ? parseInt(entry.worthlessnessScore) : 0)
        }));
        
        console.log('フォーマット後のデータ:', formattedData);
        
        // 初期スコアを追加（全期間表示の場合、または他の期間でデータがない場合）
        if (initialScore && period === 'all') {
          // 初期スコアの日付を作成（最初の日記の前日）
          const firstEntryDate = formattedData.length > 0 
            ? new Date(formattedData[0].date)
            : normalizedToday; // データがない場合は今日の日付を使用
          firstEntryDate.setDate(firstEntryDate.getDate() - 1);
          const initialScoreDate = firstEntryDate.toISOString().split('T')[0];
          
          // 初期スコアが既に含まれていないか確認
          const hasInitialScore = false; // 常に初期スコアを追加
          
          console.log('初期スコア:', initialScore);
          console.log('初期スコアが含まれているか:', hasInitialScore);
          
          if (!hasInitialScore) {
            // 初期スコアをデータの先頭に追加
            formattedData = [{
              date: initialScoreDate || '2025-01-01',
              selfEsteemScore: typeof initialScore.selfEsteemScore === 'number' ? initialScore.selfEsteemScore : 
                              (typeof initialScore.selfEsteemScore === 'string' ? parseInt(initialScore.selfEsteemScore) : 50),
              worthlessnessScore: typeof initialScore.worthlessnessScore === 'number' ? initialScore.worthlessnessScore : 
                                 (typeof initialScore.worthlessnessScore === 'string' ? parseInt(initialScore.worthlessnessScore) : 50)
            }, ...formattedData];
          }
        }
        
        setChartData(formattedData);
        
        console.log('最終的なチャートデータ:', formattedData);
        
        // 全期間の感情の出現回数を集計
        const counts: {[key: string]: number} = {};
        entries?.forEach((entry: any) => {
          counts[entry.emotion] = (counts[entry.emotion] || 0) + 1;
        });
        setAllEmotionCounts(counts);
        
        // 選択された期間の感情の出現回数を集計
        const filteredCounts: {[key: string]: number} = {};
        const filteredAllEntries = filterByPeriod(entries, period, normalizedToday);
        filteredAllEntries?.forEach((entry: any) => {
          filteredCounts[entry.emotion] = (filteredCounts[entry.emotion] || 0) + 1;
        });
        setFilteredEmotionCounts(filteredCounts);
        
        // 感情の出現回数を配列に変換してソート
        const currentCounts = period === 'all' ? counts : filteredCounts;
        const sortedEmotionCounts = Object.entries(currentCounts)
          .map(([emotion, count]) => ({ emotion, count: count as number }))
          .sort((a, b) => b.count - a.count);
        
        setEmotionCounts(sortedEmotionCounts);
      }
    } catch (error) {
      console.error('チャートデータ読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterByPeriod = (entries: any[], selectedPeriod: string, today: Date) => {
    if (!entries || entries.length === 0) {
      return [];
    }
    
   // 無価値感の日記のみをフィルタリング
   const worthlessnessEntries = entries.filter((entry: any) => entry.emotion === '無価値感');
   
    let result = [];
    
    switch (selectedPeriod) {
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
       result = worthlessnessEntries.filter((entry: any) => {
          const entryDate = normalizeDate(entry.date);
          return entryDate >= weekAgo;
        });
        break;
      
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);
       result = worthlessnessEntries.filter((entry: any) => {
          const entryDate = normalizeDate(entry.date);
          return entryDate >= monthAgo;
        });
        break;
      
      case 'all':
      default:
       result = worthlessnessEntries;
        break;
    }
    
    // 日付でソート
    result.sort((a: any, b: any) => normalizeDate(a.date).getTime() - normalizeDate(b.date).getTime());
    
    console.log(`${selectedPeriod}期間のフィルター結果:`, result.length, '件');
    return result;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const handleShare = () => {
    if (chartData.length === 0) {
      alert('共有するデータがありません。');
      return;
    }
    
    const username = localStorage.getItem('line-username') || 'ユーザー';
    const latestData = chartData[chartData.length - 1];
    
    let shareText = `${username}の無価値感推移 📊\n\n`;
    shareText += `🔵 自己肯定感: ${latestData?.selfEsteemScore || 0}\n`;
    shareText += `🔴 無価値感: ${latestData?.worthlessnessScore || 0}\n\n`;
    
    // 感情の出現回数
    const currentEmotionCounts = period === 'all' ? allEmotionCounts : filteredEmotionCounts;
    if (emotionCounts.length > 0) {
      shareText += `【感情の出現回数】\n`;
      emotionCounts.slice(0, 3).forEach(item => {
        shareText += `${item.emotion}: ${item.count}回\n`;
      });
    }
    
    shareText += `\n#かんじょうにっき #感情日記 #自己肯定感\n\nhttps://apl.namisapo2.love/`;
    
    if (navigator.share) {
      navigator.share({
        title: 'かんじょうにっき - 無価値感推移',
        text: shareText,
      }).catch((error) => {
        console.log('シェアがキャンセルされました:', error);
      });
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        alert('シェア用テキストをクリップボードにコピーしました！\nSNSに貼り付けてシェアしてください。');
      }).catch(() => {
        prompt('以下のテキストをコピーしてSNSでシェアしてください:', shareText);
      });
    }
  };

  const handleTwitterShare = () => {
    if (chartData.length === 0) {
      alert('共有するデータがありません。');
      return;
    }
    
    const username = localStorage.getItem('line-username') || 'ユーザー';
    const latestData = chartData[chartData.length - 1];
    
    let shareText = `${username}の無価値感推移 📊\n\n`;
    shareText += `🔵 自己肯定感: ${latestData?.selfEsteemScore || 0}\n`;
    shareText += `🔴 無価値感: ${latestData?.worthlessnessScore || 0}\n\n`;
    
    // 感情の出現回数
    const currentEmotionCounts = period === 'all' ? allEmotionCounts : filteredEmotionCounts;
    if (emotionCounts.length > 0) {
      shareText += `【感情の出現回数】\n`;
      emotionCounts.slice(0, 3).forEach(item => {
        shareText += `${item.emotion}: ${item.count}回\n`;
      });
    }
    
    shareText += `\n#かんじょうにっき #感情日記 #自己肯定感\n\nhttps://apl.namisapo2.love/`;
    
    const encodedShareText = encodeURIComponent(shareText);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedShareText}`;
    
    window.open(twitterUrl, '_blank');
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 px-2">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-jp-bold text-gray-900">無価値感推移</h1>
          <div className="flex space-x-2">
            <button
              onClick={handleShare}
              className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-jp-medium transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">シェア</span>
            </button>
            <button
              onClick={handleTwitterShare}
              className="flex items-center space-x-2 px-3 py-2 bg-black hover:bg-gray-800 text-white rounded-lg text-sm font-jp-medium transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span className="hidden sm:inline">Xでシェア</span>
            </button>
          </div>
        </div>

        {/* 期間フィルター */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded-lg text-sm font-jp-medium transition-colors ${
              period === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            1週間
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-lg text-sm font-jp-medium transition-colors ${
              period === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            1ヶ月
          </button>
          <button
            onClick={() => setPeriod('all')}
            className={`px-4 py-2 rounded-lg text-sm font-jp-medium transition-colors ${
              period === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            全期間
          </button>
        </div>

        {/* チャート表示エリア */}
        {loading ? (
          <div className="bg-gray-50 rounded-lg p-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-12 text-center">
            <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-jp-medium text-gray-500 mb-2">
              データがありません
            </h3>
            <p className="text-gray-400 font-jp-normal">
              無価値感を選んだ日記を書くとグラフが表示されます
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* グラフ */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 overflow-x-auto relative">
              {initialScore && period === 'all' && (
                <div className="absolute top-2 left-2 bg-blue-50 rounded-lg p-2 border border-blue-200 text-xs">
                  <span className="font-jp-medium text-blue-800">初期スコア表示中</span>
                </div>
              )}
              <div className="min-w-[600px]">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-jp-medium text-gray-700">自己肯定感</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm font-jp-medium text-gray-700">無価値感</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {period === 'week' ? '過去7日間' : period === 'month' ? '過去30日間' : '全期間'}
                  </div>
                </div>
                
                {/* グラフ本体 */}
                <div className="h-64 relative mb-8">
                  {/* Y軸 */}
                  <div className="absolute left-0 top-0 bottom-0 w-10 flex flex-col justify-between text-xs text-gray-500">
                    <div className="transform -translate-y-2">100</div>
                    <div className="transform -translate-y-2">75</div>
                    <div className="transform -translate-y-2">50</div>
                    <div className="transform -translate-y-2">25</div>
                    <div className="transform -translate-y-2">0</div>
                  </div>
                  
                  {/* グラフエリア */}
                  <div className="absolute left-10 right-0 top-0 bottom-0 px-2">
                    {/* 水平線 */}
                    <div className="absolute left-0 right-0 top-0 h-px bg-gray-200"></div>
                    <div className="absolute left-0 right-0 top-1/4 h-px bg-gray-200"></div>
                    <div className="absolute left-0 right-0 top-1/2 h-px bg-gray-200"></div>
                    <div className="absolute left-0 right-0 top-3/4 h-px bg-gray-200"></div>
                    <div className="absolute left-0 right-0 bottom-0 h-px bg-gray-200"></div>
                    
                    {/* 折れ線グラフ */}
                    <div className="h-full relative">
                      {/* 自己肯定感の折れ線 */}
                      <svg className="absolute inset-0 w-full h-full overflow-visible">
                        <polyline
                          points={chartData.length > 0 
                            ? chartData.map((data, index) => {
                                const xPos = chartData.length > 1 ? (index / (chartData.length - 1)) * 100 : 50;
                                const yPos = 100 - Number(data.selfEsteemScore || 0);
                                return `${xPos}% ${yPos}%`;
                              }).join(' ')
                            : ''
                          }
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="2"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                        {chartData.map((data, index) => {
                          const xPos = chartData.length > 1 ? (index / (chartData.length - 1)) * 100 : 50;
                          const yPos = 100 - Number(data.selfEsteemScore);
                          return (
                            <circle
                              key={`self-esteem-${index}`}
                              cx={`${chartData.length > 1 ? (index / (chartData.length - 1)) * 100 : 50}%`}
                              cy={`${100 - Number(data.selfEsteemScore || 0)}%`}
                              r="4"
                              fill="#3b82f6"
                              stroke="white"
                              strokeWidth="1"
                              className={`${index === 0 && period === 'all' && initialScore ? 'ring-2 ring-blue-300' : ''}`}
                            >
                              <title>自己肯定感: {data.selfEsteemScore}</title>
                            </circle>
                          );
                        })}
                      </svg>
                      
                      {/* 無価値感の折れ線 */}
                      <svg className="absolute inset-0 w-full h-full overflow-visible">
                        <polyline
                          points={chartData.length > 0 
                            ? chartData.map((data, index) => {
                                const xPos = chartData.length > 1 ? (index / (chartData.length - 1)) * 100 : 50;
                                const yPos = 100 - Number(data.worthlessnessScore || 0);
                                return `${xPos}% ${yPos}%`;
                              }).join(' ')
                            : ''
                          }
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="2"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                        {chartData.map((data, index) => {
                          const xPos = chartData.length > 1 ? (index / (chartData.length - 1)) * 100 : 50;
                          const yPos = 100 - Number(data.worthlessnessScore);
                          return (
                            <circle
                              key={`worthlessness-${index}`}
                              cx={`${chartData.length > 1 ? (index / (chartData.length - 1)) * 100 : 50}%`}
                              cy={`${100 - Number(data.worthlessnessScore || 0)}%`}
                              r="4"
                              fill="#ef4444"
                              stroke="white"
                              strokeWidth="1"
                              className={`${index === 0 && period === 'all' && initialScore ? 'ring-2 ring-red-300' : ''}`}
                            >
                              <title>無価値感: {data.worthlessnessScore}</title>
                            </circle>
                          );
                        })}
                      </svg>
                    </div>
                    
                    {/* X軸ラベル */}
                    <div className="absolute left-0 right-0 bottom-[-24px] flex justify-between">
                      {chartData.map((data, index) => (
                        <div key={index} className="text-xs text-gray-500 transform -translate-x-1/2" style={{ left: `${chartData.length > 1 ? (index / (chartData.length - 1)) * 100 : 50}%` }}>
                          {index === 0 && period === 'all' && initialScore 
                            ? '初期' 
                            : formatDate(data.date)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 最新スコア */}
            {chartData.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-jp-bold text-gray-900">最新スコア</h3>
                  <div className="text-xs text-gray-500">
                    {formatDate(chartData[chartData.length - 1].date)}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-jp-medium">自己肯定感</span>
                      <span className="text-2xl font-jp-bold text-blue-600">
                        {chartData[chartData.length - 1].selfEsteemScore}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-red-200">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-jp-medium">無価値感</span>
                      <span className="text-2xl font-jp-bold text-red-600">
                        {chartData[chartData.length - 1].worthlessnessScore}
                      </span>
                    </div>
                  </div>
                </div>
                
                {initialScore && period === 'all' && (
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-jp-medium text-gray-900">初期スコア</h4>
                      <div className="text-xs text-gray-500">
                        {initialScore.measurementMonth}月{initialScore.measurementDay}日
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-3 border border-blue-100">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-jp-medium text-sm">自己肯定感</span>
                          <span className="text-xl font-jp-bold text-blue-600">
                            {initialScore.selfEsteemScore}
                          </span>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-red-100">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-jp-medium text-sm">無価値感</span>
                          <span className="text-xl font-jp-bold text-red-600">
                            {initialScore.worthlessnessScore}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* 感情の出現頻度 */}
            {emotionCounts.length > 0 && (
              <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-jp-bold text-gray-900">感情の出現頻度</h3>
                  <div className="text-xs text-gray-500">
                    {period === 'week' ? '過去7日間' : period === 'month' ? '過去30日間' : '全期間'}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {emotionCounts.map((item, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="text-center">
                        <div className="text-lg font-jp-bold text-gray-900 mb-1">{item.emotion}</div>
                        <div className="text-sm text-gray-600">{item.count}回</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorthlessnessChart;