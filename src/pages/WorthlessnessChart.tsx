import React, { useState, useEffect } from 'react';
import { Calendar, LineChart, Share2, Download, Filter, RefreshCw, TrendingUp } from 'lucide-react';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

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
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('month');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [allEmotionCounts, setAllEmotionCounts] = useState<{[key: string]: number}>({});
  const [filteredEmotionCounts, setFilteredEmotionCounts] = useState<{[key: string]: number}>({});
  const [emotionCounts, setEmotionCounts] = useState<EmotionCount[]>([]);
  const [initialScore, setInitialScore] = useState<InitialScore | null>(null);

  const [dataRange, setDataRange] = useState({
    minVal: 0,
    maxVal: 100,
    yRange: 100
  });

  useEffect(() => {
    loadChartData();
  }, [period]);

  const loadChartData = () => {
    setLoading(true);
    try {
      // 現在の日本時間
      const today = getJapaneseDate();
      
      // ローカルストレージから日記データを取得
      const now = new Date();
      const normalizedToday = normalizeDate(now.toISOString());
      
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
        // まず無価値感のエントリーだけを抽出
        const worthlessnessEntries = entries?.filter((entry: any) => entry.emotion === '無価値感') || [];
        
        // 期間でフィルタリングして日付順にソート
        const filteredEntries = filterByPeriod(worthlessnessEntries, period, normalizedToday)
          .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        console.log('無価値感エントリー数:', filteredEntries.length, '期間:', period);
        
        // 日記データをフォーマット
        let formattedData = filteredEntries.map((entry: any) => ({
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
        
        // データの最小・最大値を計算
        const allScores = formattedData.flatMap(d => [
          Number(d.selfEsteemScore ?? 0),
          Number(d.worthlessnessScore ?? 0)
        ]);

        let minVal = Math.min(...allScores);
        let maxVal = Math.max(...allScores);

        // 上下に 10pt の余白を持たせつつ 0‒100 にクリップ
        minVal = Math.max(0, minVal - 10);
        maxVal = Math.min(100, maxVal + 10);
        const yRange = maxVal - minVal || 1;   // 0 除算防止

        // データ範囲を更新
        setDataRange({ minVal, maxVal, yRange });
        
        setChartData(formattedData);
        
        console.log('最終的なチャートデータ:', formattedData);
        
        // 全期間の感情の出現回数を集計
        const counts: {[key: string]: number} = {};
        entries?.filter(entry => entry && entry.emotion)?.forEach((entry: any) => {
          counts[entry.emotion] = (counts[entry.emotion] || 0) + 1;
        });
        setAllEmotionCounts(counts);
        
        // 選択された期間の感情の出現回数を集計
        const filteredCounts: {[key: string]: number} = {};
        const entriesWithEmotion = entries?.filter((entry: any) => entry && entry.emotion) || [];
        const filteredAllEntries = filterByPeriod(entriesWithEmotion, period, normalizedToday);
        filteredAllEntries?.filter(entry => entry && entry.emotion)?.forEach((entry: any) => {
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
      console.error('チャートデータの読み込みエラー:', error);
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
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 座標変換関数
  const toX = (i: number, total: number) => (i / (total - 1)) * 100;
  const toY = (val: number) => ((dataRange.maxVal - val) / dataRange.yRange) * 100;

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
        // クリップボードAPIも使えない場合は手動でテキストを表示
        prompt('以下のテキストをコピーしてSNSでシェアしてください:', shareText);
      });
    }
  };

  // Twitterでシェア
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
    
    // Twitterシェア用URL
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedShareText}`;
    
    // 新しいウィンドウでTwitterシェアを開く
    window.open(twitterUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 px-2">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600 font-jp-medium">読み込み中...</span>
        </div>
      </div>
    );
  }

  // 表示用データを準備
  const displayedData = (() => {
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
  })();

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

        {/* 検索結果エリア */}
        <div className="space-y-6">
          {/* チャート表示エリア */}
          {displayedData.length === 0 ? (
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
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none" 
                      className="absolute inset-0 w-full h-full overflow-visible graph-svg"
                    >
                      {/* グリッド線 & 目盛ラベル */}
                      {(()=>{
                        // 4 分割目盛 (0,25,50,75,100) をレンジ内に再計算
                        const ticks = [0,0.25,0.5,0.75,1].map(t=>dataRange.minVal + t*dataRange.yRange);
                        return (
                          <g stroke="#e5e7eb" strokeWidth="0.4">
                            {ticks.map((v,idx)=>(
                              <g key={idx}>
                                <line x1="0" y1={toY(v)} x2="100" y2={toY(v)} />
                                <text
                                  x="2" y={toY(v)-1.5}
                                  fontSize="3" fill="#6b7280"
                                  style={{userSelect:'none'}}
                                >
                                  {Math.round(v)}
                                </text>
                              </g>
                            ))}
                          </g>
                        );
                      })()}

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
                          <React.Fragment key={`point-${i}`}>
                            {[
                              {key:'selfEsteemScore', color:'#3b82f6'},
                              {key:'worthlessnessScore', color:'#ef4444'}
                            ].map(({key,color})=>(
                              <circle
                                key={`${key}-${i}`}
                                cx={x} cy={toY(Number(d[key]||0))}
                                r="2"
                                fill={color}
                                stroke="#fff" strokeWidth="0.4"
                              >
                                <title>{`${d.date} ${key==='selfEsteemScore'?'自己肯定感':'無価値感'} ${d[key]}`}</title>
                              </circle>
                            ))}
                          </React.Fragment>
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
    </div>
  );
};


export default WorthlessnessChart;