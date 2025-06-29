import React, { useMemo, useState, useEffect } from 'react';
import { Calendar, LineChart, Share2, Download, Filter, RefreshCw, TrendingUp } from 'lucide-react';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
dayjs.extend(isBetween);

/* 型例：日記データ */
interface ScoreEntry {
  date: string;                // ISO 形式 '2025-06-04'
  selfEsteemScore: number;     // 0‒100
  worthlessnessScore: number;  // 0‒100
}

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

/* ----- ★ タブ state ----- */
type RangeKey = 'week' | 'month' | 'all';

const WorthlessnessChart: React.FC = () => {
  const [chartData, setChartData] = useState<ScoreEntry[]>([]);
  const [period, setPeriod] = useState<RangeKey>('week');
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
      // ローカルストレージから日記データを取得
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
        
        console.log('全エントリー数:', entries?.length || 0);
        
        // 無価値感の日記のみをフィルタリング
        const worthlessnessEntries = entries?.filter((entry: any) => entry.emotion === '無価値感') || [];
        
        // 日記データをフォーマット
        let formattedData = worthlessnessEntries.map((entry: any) => ({
          date: entry.date,
          selfEsteemScore: typeof entry.selfEsteemScore === 'number' ? entry.selfEsteemScore : 
                          (typeof entry.selfEsteemScore === 'string' ? parseInt(entry.selfEsteemScore) : 0),
          worthlessnessScore: typeof entry.worthlessnessScore === 'number' ? entry.worthlessnessScore : 
                             (typeof entry.worthlessnessScore === 'string' ? parseInt(entry.worthlessnessScore) : 0)
        }));
        
        // 日付順にソート
        formattedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        // 初期スコアを追加（全期間表示の場合）
        if (initialScore && period === 'all' && formattedData.length > 0) {
          // 初期スコアの日付を作成（最初の日記の前日）
          const firstEntryDate = new Date(formattedData[0].date);
          firstEntryDate.setDate(firstEntryDate.getDate() - 1);
          const initialScoreDate = firstEntryDate.toISOString().split('T')[0];
          
          // 初期スコアをデータの先頭に追加
          formattedData = [{
            date: initialScoreDate,
            selfEsteemScore: typeof initialScore.selfEsteemScore === 'number' ? initialScore.selfEsteemScore : 
                            (typeof initialScore.selfEsteemScore === 'string' ? parseInt(initialScore.selfEsteemScore) : 50),
            worthlessnessScore: typeof initialScore.worthlessnessScore === 'number' ? initialScore.worthlessnessScore : 
                               (typeof initialScore.worthlessnessScore === 'string' ? parseInt(initialScore.worthlessnessScore) : 50)
          }, ...formattedData];
        }
        
        setChartData(formattedData);
        
        // 全期間の感情の出現回数を集計
        const counts: {[key: string]: number} = {};
        entries?.filter(entry => entry && entry.emotion)?.forEach((entry: any) => {
          counts[entry.emotion] = (counts[entry.emotion] || 0) + 1;
        });
        setAllEmotionCounts(counts);
        
        // 選択された期間の感情の出現回数を集計
        const filteredCounts: {[key: string]: number} = {};
        const entriesWithEmotion = entries?.filter((entry: any) => entry && entry.emotion) || [];
        
        // 期間でフィルタリング
        const filteredAllEntries = period === 'all' 
          ? entriesWithEmotion 
          : filterEntriesByPeriod(entriesWithEmotion, period);
          
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const handleShare = () => {
    if (displayedData.length === 0) {
      alert('共有するデータがありません。');
      return;
    }
    
    const username = localStorage.getItem('line-username') || 'ユーザー';
    const latestData = displayedData[displayedData.length - 1];
    
    let shareText = `${username}の無価値感推移 📊\n\n`;
    shareText += `🔵 自己肯定感: ${latestData?.selfEsteemScore || 0}\n`;
    shareText += `🔴 無価値感: ${latestData?.worthlessnessScore || 0}\n\n`;
    
    // 感情の出現回数
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
    if (displayedData.length === 0) {
      alert('共有するデータがありません。');
      return;
    }
    
    const username = localStorage.getItem('line-username') || 'ユーザー';
    const latestData = displayedData[displayedData.length - 1];
    
    let shareText = `${username}の無価値感推移 📊\n\n`;
    shareText += `🔵 自己肯定感: ${latestData?.selfEsteemScore || 0}\n`;
    shareText += `🔴 無価値感: ${latestData?.worthlessnessScore || 0}\n\n`;
    
    // 感情の出現回数
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

  // 期間でエントリーをフィルタリングする関数
  const filterEntriesByPeriod = (entries: any[], selectedPeriod: RangeKey) => {
    if (!entries || entries.length === 0) return [];
    if (selectedPeriod === 'all') return entries;
    
    // データが持つ最新日を基準にする
    const latestDate = entries.reduce((max, entry) => {
      const entryDate = new Date(entry.date);
      return entryDate > max ? entryDate : max;
    }, new Date(0));
    
    const startDate = new Date(latestDate);
    if (selectedPeriod === 'week') {
      startDate.setDate(startDate.getDate() - 6); // 7日間（当日含む）
    } else {
      startDate.setDate(startDate.getDate() - 29); // 30日間（当日含む）
    }
    
    return entries.filter((entry: any) => {
      const entryDate = new Date(entry.date);
      return entryDate >= startDate && entryDate <= latestDate;
    });
  };

  // 表示用データを準備
  const displayedData = useMemo(() => {
    if (period === 'all' || chartData.length === 0) return chartData;
    
    // データが持つ最新日を基準にする
    const latestDate = dayjs(
      chartData.reduce((max, d) => (d.date > max ? d.date : max), chartData[0].date)
    ).endOf('day');
    
    const from = period === 'week'
      ? latestDate.subtract(6, 'day').startOf('day')   // 直近7日間
      : latestDate.subtract(29,'day').startOf('day'); // 直近30日間
    
    const filtered = chartData.filter(d =>
      dayjs(d.date).isBetween(from, latestDate, 'day', '[]')
    );
    
    // データが 0 件ならフォールバックで全件返す（表示が空にならない保険）
    return filtered.length ? filtered : chartData;
  }, [chartData, period]);

  // Y 軸スケール計算
  const { min, max, span } = useMemo(() => {
    if (displayedData.length === 0) {
      return { min: 0, max: 100, span: 100 };
    }
    
    const allScores = displayedData.flatMap(d => [
      Number(d.selfEsteemScore || 0),
      Number(d.worthlessnessScore || 0)
    ]);
    
    let minVal = Math.min(...allScores);
    let maxVal = Math.max(...allScores);
    
    // 上下に 10pt の余白を持たせつつ 0‒100 にクリップ
    minVal = Math.max(0, minVal - 10);
    maxVal = Math.min(100, maxVal + 10);
    const yRange = maxVal - minVal || 1;   // 0 除算防止
    
    return { min: minVal, max: maxVal, span: yRange };
  }, [displayedData]);

  // 座標変換関数
  const toX = (i: number, total: number) => (i / Math.max(1, total - 1)) * 100;
  const toY = (val: number) => ((max - val) / span) * 100;

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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600">
              <span className="sr-only">読み込み中...</span>
            </div>
          </div>
        ) : displayedData.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-12 text-center">
            <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-jp-medium text-gray-500 mb-2">
              データがありません
            </h3>
            <p className="text-gray-400 font-jp-normal mb-4">
              選択した期間に無価値感を選んだ日記がありません
            </p>
            <button
              onClick={loadChartData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-jp-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              再読み込み
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* グラフ */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 overflow-hidden relative">
              {initialScore && period === 'all' && (
                <div className="absolute top-2 left-2 bg-blue-50 rounded-lg p-2 border border-blue-200 text-xs z-10">
                  <span className="font-jp-medium text-blue-800">初期スコア表示中</span>
                </div>
              )}
              
              <div className="w-full" style={{ height: '300px' }}>
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
                <div className="relative w-full h-60 overflow-hidden">
                  <svg
                    viewBox="0 0 120 100"
                    preserveAspectRatio="xMinYMid meet"
                    className="absolute inset-0 w-full h-full graph-svg"
                  >
                    {/* グリッド */}
                    <g stroke="#e5e7eb" strokeWidth="0.4" vectorEffect="non-scaling-stroke">
                      {[0, 25, 50, 75, 100].map(tick => (
                        <g key={tick}>
                          <line x1="0" y1={toY(tick)} x2="120" y2={toY(tick)} />
                          <text
                            x="0"
                            y={toY(tick) - 1.5}
                            fontSize="3"
                            fill="#9ca3af"
                            style={{ userSelect: 'none' }}
                          >
                            {tick}
                          </text>
                        </g>
                      ))}
                    </g>

                    {/* 折れ線 */}
                    {[
                      { key: 'selfEsteemScore', color: '#3b82f6' },
                      { key: 'worthlessnessScore', color: '#ef4444' },
                    ].map(({ key, color }) => (
                      <polyline
                        key={key}
                        points={displayedData
                          .map((d, i) =>
                            `${toX(i, displayedData.length)},${toY(Number(d[key as keyof ScoreEntry] as number))}`
                          )
                          .join(' ')}
                        fill="none"
                        stroke={color}
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    ))}

                    {/* 点 */}
                    {displayedData.map((d, i) => {
                      const x = toX(i, displayedData.length);
                      return ['selfEsteemScore', 'worthlessnessScore'].map((k, idx) => (
                        <circle
                          key={`${k}-${i}`}
                          cx={x}
                          cy={toY(Number(d[k as keyof ScoreEntry] as number))}
                          r="2"
                          fill={idx ? '#ef4444' : '#3b82f6'}
                          stroke="#fff"
                          strokeWidth="0.3"
                          vectorEffect="non-scaling-stroke"
                        >
                          <title>
                            {`${d.date} ${idx ? '無価値感' : '自己肯定感'} ${
                              d[k as keyof ScoreEntry]
                            }`}
                          </title>
                        </circle>
                      ));
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
                      >
                        {index === 0 && period === 'all' && initialScore 
                          ? '初期' 
                          : formatDate(data.date)}
                      </text>
                    ))}
                  </svg>
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
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-jp-medium text-lg">自己肯定感スコア</span>
                      <span className="text-3xl font-jp-bold text-blue-600">
                        {displayedData[displayedData.length - 1].selfEsteemScore}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-red-200">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-jp-medium text-lg">無価値感スコア</span>
                      <span className="text-3xl font-jp-bold text-red-600">
                        {displayedData[displayedData.length - 1].worthlessnessScore}
                      </span>
                    </div>
                  </div>
                </div>
                
                {initialScore && period === 'all' && (
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-jp-medium text-gray-900 text-base">初期スコア</h4>
                      <div className="text-sm font-medium text-gray-700">
                        {initialScore.measurementMonth}月{initialScore.measurementDay}日
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-3 border border-blue-100">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-jp-medium text-base">自己肯定感スコア</span>
                          <span className="text-2xl font-jp-bold text-blue-600">
                            {initialScore.selfEsteemScore}
                          </span>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-red-100">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-jp-medium text-base">無価値感スコア</span>
                          <span className="text-2xl font-jp-bold text-red-600">
                            {initialScore.worthlessnessScore}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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

            {/* 感情の出現頻度 */}
            {emotionCounts.length > 0 && (
              <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-jp-bold text-gray-900 text-lg">感情の出現頻度</h3>
                  <div className="text-sm font-medium text-gray-700">
                    {period === 'week' ? '過去7日間' : period === 'month' ? '過去30日間' : '全期間'}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {emotionCounts.map((item, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="text-center">
                        <div className="text-lg font-jp-bold text-gray-900 mb-1">{item.emotion}</div>
                        <div className="text-base font-medium text-gray-600">{item.count}回</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 初期スコアが設定されていない場合の警告メッセージ */}
            {!initialScore && period === 'all' && (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200 mt-4">
                <div className="flex items-start space-x-3">
                  <div className="text-yellow-500 text-xl">⚠️</div>
                  <div>
                    <p className="text-yellow-800 font-jp-medium">
                      初期スコアが設定されていません。最初にやることページで自己肯定感計測を行ってください。
                    </p>
                  </div>
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