import React, { useState, useEffect } from 'react';
import { Calendar, LineChart, Share2, Download, Filter, RefreshCw, TrendingUp } from 'lucide-react';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

// Type definition for range keys
type RangeKey = 'week'|'month'|'all';

/** latestDate を基準にフィルタリング */
const filterByRange = (data: ChartData[], range: RangeKey): ChartData[] => {
  if (range === 'all' || data.length === 0) return data;

  // データが持つ最新日を基準にする
  const latestDate = dayjs(
    data.reduce((max, d) => (d.date > max ? d.date : max), data[0].date)
  ).endOf('day');

  const from = range === 'week'
    ? latestDate.subtract(6, 'day').startOf('day')   // 直近7日間
    : latestDate.subtract(29,'day').startOf('day'); // 直近30日間

  const filtered = data.filter(d =>
    dayjs(d.date).isBetween(from, latestDate, 'day', '[]')
  );

  // データが 0 件ならフォールバックで全件返す（表示が空にならない保険）
  return filtered.length ? filtered : data;
};

// 日付を正規化する関数（時間部分を削除）
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

interface ScoreEntry {
  date: string;
  selfEsteemScore: number | string;
  worthlessnessScore: number | string;
}

interface ChartData {
  date: string;
  selfEsteemScore: number | string;
  worthlessnessScore: number | string;
}

const WorthlessnessChart: React.FC = () => {
  const [period, setPeriod] = useState<RangeKey>('month');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [allEmotionCounts, setAllEmotionCounts] = useState<{[key: string]: number}>({});
  const [filteredEmotionCounts, setFilteredEmotionCounts] = useState<{[key: string]: number}>({});
  const [displayedData, setDisplayedData] = useState<ChartData[]>([]);
  const [emotionCounts, setEmotionCounts] = useState<EmotionCount[]>([]);
  const [initialScore, setInitialScore] = useState<InitialScore | null>(null);

  const [dataRange, setDataRange] = useState({
    minVal: 0,
    maxVal: 100,
    yRange: 100
  });

  // 期間が変更されたときにデータをフィルタリング
  useEffect(() => {
    setDisplayedData(filterByRange(chartData, period));
  }, [chartData, period]);

  useEffect(() => {
    loadChartData();
  }, [period]);

  const loadChartData = async () => {
    try {
      setLoading(true);
      
      const normalizedToday = normalizeDate(getJapaneseDate().toISOString());
      
      // 無価値感エントリーを取得
      const worthlessnessEntries = await window.electronAPI.getWorthlessnessEntries();
      console.log('取得した無価値感エントリー:', worthlessnessEntries);
      
      if (!worthlessnessEntries || worthlessnessEntries.length === 0) {
        console.log('無価値感エントリーが見つかりません');
        setChartData([]);
        setDisplayedData([]);
        setLoading(false);
        return;
      }
      
      // 期間でフィルタリングして日付順にソート
      const filteredEntries = filterByPeriod(worthlessnessEntries, period, normalizedToday)
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      console.log('無価値感エントリー数:', filteredEntries.length, '期間:', period);
      
      if (filteredEntries.length === 0) {
        console.log('フィルタリング後のエントリーが見つかりません');
        setChartData([]);
        setDisplayedData([]);
        setLoading(false);
        return;
      }
      
      // チャートデータを作成
      const formattedData: ChartData[] = filteredEntries.map((entry: any) => ({
        date: entry.date,
        selfEsteemScore: entry.selfEsteemScore || 0,
        worthlessnessScore: entry.worthlessnessScore || 0
      }));
      
      // データ範囲を計算
      const allScores = formattedData.flatMap(d => [
        Number(d.selfEsteemScore) || 0,
        Number(d.worthlessnessScore) || 0
      ]);
      
      const minVal = Math.min(...allScores, 0);
      const maxVal = Math.max(...allScores, 100);
      const yRange = maxVal - minVal;
      
      setDataRange({ minVal, maxVal, yRange });
      
      setChartData(formattedData);
      setDisplayedData(filterByRange(formattedData, period));
      
      console.log('最終的なチャートデータ:', formattedData);
      
    } catch (error) {
      console.error('チャートデータの読み込みエラー:', error);
      setChartData([]);
      setDisplayedData([]);
    } finally {
      setLoading(false);
    }
  };

  const filterByPeriod = (entries: any[], period: RangeKey, today: Date) => {
    if (period === 'all') return entries;
    
    const days = period === 'week' ? 7 : 30;
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days + 1);
    
    return entries.filter((entry: any) => {
      const entryDate = normalizeDate(entry.date);
      return entryDate >= startDate && entryDate <= today;
    });
  };

  const formatDate = (dateString: string) => {
    return dayjs(dateString).format('M/D');
  };

  // 座標変換関数
  const toX = (i: number, total: number) => (i / (total - 1)) * 100;
  const toY = (val: number) => ((dataRange.maxVal - val) / dataRange.yRange) * 100;

  const handleShare = () => {
    if (chartData.length === 0) {
      alert('共有するデータがありません');
      return;
    }
    
    const shareText = `無価値感チャート\n期間: ${period === 'week' ? '1週間' : period === 'month' ? '1ヶ月' : '全期間'}\n最新スコア: 自己肯定感 ${chartData[chartData.length - 1].selfEsteemScore}, 無価値感 ${chartData[chartData.length - 1].worthlessnessScore}`;
    
    if (navigator.share) {
      navigator.share({
        title: '無価値感チャート',
        text: shareText,
      });
    } else {
      navigator.clipboard.writeText(shareText);
      alert('クリップボードにコピーしました');
    }
  };

  const handleDownload = () => {
    if (chartData.length === 0) {
      alert('ダウンロードするデータがありません');
      return;
    }
    
    const csvContent = 'data:text/csv;charset=utf-8,' + 
      '日付,自己肯定感スコア,無価値感スコア\n' +
      chartData.map(d => `${d.date},${d.selfEsteemScore},${d.worthlessnessScore}`).join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `worthlessness_chart_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 px-2">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600 font-jp-medium">データを読み込んでいます...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 px-2">
      {/* ヘッダー */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <LineChart className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-jp-bold text-gray-900">無価値感チャート</h2>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* 期間選択 */}
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              {[
                { key: 'week' as RangeKey, label: '1週間' },
                { key: 'month' as RangeKey, label: '1ヶ月' },
                { key: 'all' as RangeKey, label: '全期間' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setPeriod(key)}
                  className={`px-3 py-1.5 text-sm font-jp-medium rounded-md transition-colors ${
                    period === key
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            
            {/* アクションボタン */}
            <button
              onClick={handleShare}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="共有"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="ダウンロード"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* チャート */}
      {displayedData.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="bg-gray-50 rounded-lg p-12 text-center">
            <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-jp-medium text-gray-500 mb-2">
              データがありません
            </h3>
            <p className="text-gray-400 font-jp-normal mb-4">
              選択した期間に無価値感を選んだ日記がありません
            </p>
            <button
              onClick={() => setPeriod('all')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-jp-medium hover:bg-blue-700 transition-colors"
            >
              全期間で表示
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="space-y-6">
            {/* グラフエリア */}
            <div className="relative">
              <div className="bg-gray-50 rounded-lg p-4">
                <svg viewBox="0 0 100 100" className="w-full h-64">
                  {/* グリッド線 */}
                  {[0, 25, 50, 75, 100].map(y => (
                    <line
                      key={y}
                      x1="0"
                      y1={y}
                      x2="100"
                      y2={y}
                      stroke="#e5e7eb"
                      strokeWidth="0.2"
                    />
                  ))}
                  
                  {/* Y軸ラベル */}
                  {[0, 25, 50, 75, 100].map(y => (
                    <text
                      key={y}
                      x="-2"
                      y={y + 1}
                      fontSize="3"
                      textAnchor="end"
                      fill="#6b7280"
                      className="font-jp-normal"
                    >
                      {dataRange.maxVal - (y / 100) * dataRange.yRange}
                    </text>
                  ))}

                  {/* 折れ線 */}
                  {[
                    {key:'selfEsteemScore', color:'#3b82f6'},
                    {key:'worthlessnessScore', color:'#ef4444'}
                  ].map(({key,color})=>(
                    <polyline
                      key={key}
                      points={displayedData.map((d,i)=>`${toX(i,displayedData.length)},${toY(Number(d[key]||0))}`).join(' ')}
                      fill="none"
                      stroke={color}
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}

                  {/* データ点 (ホバー時に数値表示) */}
                  {displayedData.map((d,i)=>{
                    const x = toX(i, displayedData.length);
                    return (
                      <>
                        {[
                          {key:'selfEsteemScore', color:'#3b82f6'},
                          {key:'worthlessnessScore', color:'#ef4444'}
                        ].map(({key,color})=>(
                          <circle
                            key={`${i}-${key}`}
                            cx={x}
                            cy={toY(Number(d[key]||0))}
                            r="1"
                            fill={color}
                            className="hover:r-2 transition-all cursor-pointer"
                          >
                            <title>{`${key}: ${d[key]}`}</title>
                          </circle>
                        ))}
                      </>
                    );
                  })}
                  
                  {/* X軸ラベル */}
                  {displayedData.map((data, index) => (
                    <text
                      key={`x-label-${index}`}
                      x={toX(index, displayedData.length)}
                      y="98"
                      fontSize="3"
                      textAnchor="middle"
                      fill="#6b7280"
                      className="font-jp-normal"
                    >
                      {formatDate(data.date)}
                    </text>
                  ))}
                </svg>
              </div>
              
              {/* 凡例 */}
              <div className="flex justify-center space-x-6 mt-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-jp-medium text-gray-700">自己肯定感スコア</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm font-jp-medium text-gray-700">無価値感スコア</span>
                </div>
              </div>
            </div>

            {/* 最新スコア */}
            {displayedData.length > 0 ? (
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-jp-bold text-gray-900 text-lg">最新スコア</h3>
                  <div className="text-sm font-medium text-gray-700">
                    {formatDate(displayedData[displayedData.length - 1].date)}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-blue-100">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-jp-medium text-lg">自己肯定感スコア</span>
                      <span className="text-3xl font-jp-bold text-blue-600">
                        {displayedData[displayedData.length - 1].selfEsteemScore}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-blue-100">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-jp-medium text-lg">無価値感スコア</span>
                      <span className="text-3xl font-jp-bold text-red-600">
                        {displayedData[displayedData.length - 1].worthlessnessScore}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
                <div className="flex items-start space-x-3">
                  <div className="text-yellow-500 text-xl">⚠️</div>
                  <div>
                    <p className="text-yellow-800 font-jp-medium">
                      無価値感を選んだ日記がありません。無価値感を選んだ日記を書くとグラフが表示されます。
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorthlessnessChart;