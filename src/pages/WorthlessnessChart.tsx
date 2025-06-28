import React, { useState, useEffect } from 'react';
import { Calendar, BarChart2, Share2, Download, Filter, RefreshCw } from 'lucide-react';

interface EmotionCount {
  emotion: string;
  count: number;
}

interface ChartData {
  date: string;
  selfEsteemScore: number;
  worthlessnessScore: number;
}

const WorthlessnessChart: React.FC = () => {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week');
  const [loading, setLoading] = useState(true);
  const [allEmotionCounts, setAllEmotionCounts] = useState<{[key: string]: number}>({});
  const [filteredEmotionCounts, setFilteredEmotionCounts] = useState<{[key: string]: number}>({});
  const [emotionCounts, setEmotionCounts] = useState<EmotionCount[]>([]);

  useEffect(() => {
    loadChartData();
  }, [period]);

  const loadChartData = () => {
    setLoading(true);
    try {
      // ローカルストレージから日記データを取得
      const savedEntries = localStorage.getItem('journalEntries');
      if (savedEntries) {
        const entries = JSON.parse(savedEntries);
        
        // 無価値感の日記のみをフィルタリング
        const worthlessnessEntries = entries.filter((entry: any) => entry.emotion === '無価値感');
        
        // 日付でソート
        worthlessnessEntries.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        // 期間でフィルタリング
        const filteredEntries = filterByPeriod(worthlessnessEntries, period);
        
        // チャートデータの形式に変換
        const formattedData = filteredEntries.map((entry: any) => ({
          date: entry.date,
          selfEsteemScore: entry.selfEsteemScore || 0,
          worthlessnessScore: entry.worthlessnessScore || 0
        }));
        
        setChartData(formattedData);
        
        // 全期間の感情の出現回数を集計
        const counts: {[key: string]: number} = {};
        entries.forEach((entry: any) => {
          counts[entry.emotion] = (counts[entry.emotion] || 0) + 1;
        });
        setAllEmotionCounts(counts);
        
        // 選択された期間の感情の出現回数を集計
        const filteredCounts: {[key: string]: number} = {};
        const filteredAllEntries = filterByPeriod(entries, period);
        filteredAllEntries.forEach((entry: any) => {
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

  const filterByPeriod = (entries: any[], selectedPeriod: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (selectedPeriod) {
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return entries.filter((entry: any) => new Date(entry.date) >= weekAgo);
      
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);
        return entries.filter((entry: any) => new Date(entry.date) >= monthAgo);
      
      case 'all':
      default:
        return entries;
    }
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
            <BarChart2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
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
            <div className="bg-white rounded-lg p-4 border border-gray-200 overflow-x-auto">
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
                <div className="h-64 relative">
                  {/* Y軸 */}
                  <div className="absolute left-0 top-0 bottom-0 w-10 flex flex-col justify-between text-xs text-gray-500">
                    <span>100</span>
                    <span>75</span>
                    <span>50</span>
                    <span>25</span>
                    <span>0</span>
                  </div>
                  
                  {/* グラフエリア */}
                  <div className="absolute left-10 right-0 top-0 bottom-0">
                    {/* 水平線 */}
                    <div className="absolute left-0 right-0 top-0 h-px bg-gray-200"></div>
                    <div className="absolute left-0 right-0 top-1/4 h-px bg-gray-200"></div>
                    <div className="absolute left-0 right-0 top-1/2 h-px bg-gray-200"></div>
                    <div className="absolute left-0 right-0 top-3/4 h-px bg-gray-200"></div>
                    <div className="absolute left-0 right-0 bottom-0 h-px bg-gray-200"></div>
                    
                    {/* データポイント */}
                    <div className="h-full flex items-end">
                      {chartData.map((data, index) => (
                        <div key={index} className="flex-1 flex flex-col items-center justify-end h-full relative">
                          {/* 自己肯定感バー */}
                          <div 
                            className="w-4 bg-blue-500 rounded-t-sm mx-1"
                            style={{ height: `${data.selfEsteemScore}%` }}
                          ></div>
                          
                          {/* 無価値感バー */}
                          <div 
                            className="w-4 bg-red-500 rounded-t-sm mx-1 absolute bottom-0 left-6"
                            style={{ height: `${data.worthlessnessScore}%` }}
                          ></div>
                          
                          {/* X軸ラベル */}
                          <div className="absolute bottom-[-20px] text-xs text-gray-500">
                            {formatDate(data.date)}
                          </div>
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
                <h3 className="font-jp-bold text-gray-900 mb-4">最新スコア</h3>
                <div className="grid grid-cols-2 gap-4">
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