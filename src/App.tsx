import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Search, TrendingUp, Plus, Edit3, Trash2, ChevronLeft, ChevronRight, Menu, X, BookOpen, Play, ArrowRight, Home, Heart, Share2, Shield, Settings, MessageCircle, RefreshCw } from 'lucide-react';
import PrivacyConsent from './components/PrivacyConsent';
import MaintenanceMode from './components/MaintenanceMode';
import { useMaintenanceStatus } from './hooks/useMaintenanceStatus';
import AdminPanel from './components/AdminPanel';
import DataMigration from './components/DataMigration';
import DiaryPage from './pages/DiaryPage';
import DiarySearchPage from './pages/DiarySearchPage';
import HowTo from './pages/HowTo';
import FirstSteps from './pages/FirstSteps';
import NextSteps from './pages/NextSteps';
import EmotionTypes from './pages/EmotionTypes';
import Support from './pages/Support';
import PrivacyPolicy from './pages/PrivacyPolicy';
import { useSupabase } from './hooks/useSupabase';
import { useAutoSync } from './hooks/useAutoSync';
import DeviceAuthLogin from './components/DeviceAuthLogin';
import DeviceAuthRegistration from './components/DeviceAuthRegistration';
import { isAuthenticated, getCurrentUser, logoutUser } from './lib/deviceAuth';

interface JournalEntry {
  id: string;
  date: string;
  emotion: string;
  event: string;
  realization: string;
  selfEsteemScore: number;
  worthlessnessScore: number;
}

const App: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [currentPage, setCurrentPage] = useState('home');
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPrivacyConsent, setShowPrivacyConsent] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [lineUsername, setLineUsername] = useState<string | null>(null);
  const [emotionPeriod, setEmotionPeriod] = useState<'all' | 'month' | 'week'>('all');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCounselorLogin, setShowCounselorLogin] = useState(false);
  const [counselorCredentials, setCounselorCredentials] = useState({
    email: '',
    password: ''
  });
  const [currentCounselor, setCurrentCounselor] = useState<string | null>(null);
  const [authState, setAuthState] = useState<'none' | 'login' | 'register'>('none');

  const [dataLoading, setDataLoading] = useState(true);
  const { isMaintenanceMode, config: maintenanceConfig, loading: maintenanceLoading } = useMaintenanceStatus();
  const { isConnected, currentUser, initializeUser } = useSupabase();
  const { isAutoSyncEnabled } = useAutoSync();

  const [formData, setFormData] = useState({
    emotion: '',
    event: '',
    realization: '',
    selfEsteemScore: 5,
    worthlessnessScore: 5
  });

  const emotions = [
    '喜び', '悲しみ', '怒り', '不安', '恐れ', '驚き', '嫌悪', '恥',
    '罪悪感', '嫉妬', '孤独', '希望', '感謝', '愛', '憎しみ', '後悔'
  ];

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    const consentGiven = localStorage.getItem('privacyConsentGiven');
    const savedUsername = localStorage.getItem('line-username');
    
    if (consentGiven === 'true') {
      setShowPrivacyConsent(false);
      
      // 認証状態をチェック
      if (isAuthenticated()) {
        // 認証済みの場合は使い方ページへ
        const user = getCurrentUser();
        if (user) {
          setLineUsername(user.lineUsername);
          // Supabaseユーザーを初期化
          if (isConnected) {
            initializeUser(user.lineUsername);
          }
          setCurrentPage('how-to');
        }
      } else if (savedUsername) {
        // 未認証だがユーザー名がある場合はそのまま使用
        setLineUsername(savedUsername);
        // Supabaseユーザーを初期化
        if (isConnected) {
          initializeUser(savedUsername);
        }
        setCurrentPage('how-to');
      }
    }
  }, [isConnected]);

  // テストデータ生成関数
  const generateTestData = () => {
    const testEntries = [
      // 既存のデータ（10件）
      {
        id: 'test-1',
        date: '2025-01-21',
        emotion: '無価値感',
        event: '会議で自分の意見が採用されなかった。みんなの前で否定された気がして、自分は価値のない人間だと感じた。',
        realization: '他人の評価で自分の価値を決めてしまっていた。一つの意見が通らなかっただけで、自分全体を否定する必要はない。',
        selfEsteemScore: 25,
        worthlessnessScore: 75
      },
      {
        id: 'test-2',
        date: '2025-01-20',
        emotion: '悲しみ',
        event: '友人との約束をドタキャンされた。楽しみにしていたのに、一人で過ごすことになった。',
        realization: '相手にも事情があったかもしれない。一人の時間も大切にできるようになりたい。',
        selfEsteemScore: 40,
        worthlessnessScore: 60
      },
      {
        id: 'test-3',
        date: '2025-01-19',
        emotion: '怒り',
        event: '電車で席を譲らない人を見てイライラした。マナーの悪さに腹が立った。',
        realization: '他人をコントロールしようとしていた。自分ができることをすればいい。',
        selfEsteemScore: 45,
        worthlessnessScore: 55
      },
      {
        id: 'test-4',
        date: '2025-01-18',
        emotion: '恐怖',
        event: '新しいプロジェクトを任された。失敗したらどうしようと不安で眠れなかった。',
        realization: '完璧を求めすぎていた。失敗も学びの一つだと考えよう。',
        selfEsteemScore: 35,
        worthlessnessScore: 65
      },
      {
        id: 'test-5',
        date: '2025-01-17',
        emotion: '罪悪感',
        event: '母親に強く当たってしまった。後で謝ったが、申し訳ない気持ちが残っている。',
        realization: 'ストレスが溜まっていた。感情をコントロールする方法を学びたい。',
        selfEsteemScore: 30,
        worthlessnessScore: 70
      },
      {
        id: 'test-6',
        date: '2025-01-16',
        emotion: '寂しさ',
        event: '一人で夕食を食べながら、誰かと一緒にいたいと思った。',
        realization: '一人の時間も価値がある。自分との対話を大切にしよう。',
        selfEsteemScore: 38,
        worthlessnessScore: 62
      },
      {
        id: 'test-7',
        date: '2025-01-15',
        emotion: '恥ずかしさ',
        event: 'プレゼンで言葉に詰まってしまった。みんなに見られて恥ずかしかった。',
        realization: '完璧でなくても大丈夫。人間らしさも魅力の一つ。',
        selfEsteemScore: 42,
        worthlessnessScore: 58
      },
      {
        id: 'test-8',
        date: '2025-01-14',
        emotion: '悔しさ',
        event: '同期が昇進した。自分も頑張っているのに認められない。',
        realization: '他人と比較していた。自分のペースで成長していこう。',
        selfEsteemScore: 33,
        worthlessnessScore: 67
      },
      {
        id: 'test-9',
        date: '2025-01-13',
        emotion: '無価値感',
        event: 'SNSで他人の充実した生活を見て、自分は何もできていないと感じた。',
        realization: 'SNSは一部分しか見えない。自分の小さな成長も認めよう。',
        selfEsteemScore: 28,
        worthlessnessScore: 72
      },
      {
        id: 'test-10',
        date: '2025-01-12',
        emotion: '悲しみ',
        event: 'ペットが病気になった。大切な存在を失うかもしれない不安。',
        realization: '今この瞬間を大切にしよう。愛情を注げることに感謝。',
        selfEsteemScore: 36,
        worthlessnessScore: 64
      },
      // 追加のテストデータ（10件）
      {
        id: 'test-11',
        date: '2025-01-11',
        emotion: '恐怖',
        event: '夜道を一人で歩いていたら、後ろから足音が聞こえてきて怖くなった。心臓がバクバクして、急いで明るい場所に向かった。',
        realization: '過度に心配しすぎていた。安全な場所を選んで歩けば大丈夫。',
        selfEsteemScore: 45,
        worthlessnessScore: 55
      },
      {
        id: 'test-12',
        date: '2025-01-10',
        emotion: '怒り',
        event: '電車で席を譲らない若者を見てイライラした。お年寄りが立っているのに気づかないふりをしていた。',
        realization: '他人の行動をコントロールしようとしていた。自分ができることをすればいい。',
        selfEsteemScore: 50,
        worthlessnessScore: 50
      },
      {
        id: 'test-13',
        date: '2025-01-09',
        emotion: '無価値感',
        event: '同僚が昇進した話を聞いて、自分だけが取り残されている気がした。何をやってもダメな人間だと思った。',
        realization: '他人と比較することで自分を苦しめていた。自分のペースで成長していけばいい。',
        selfEsteemScore: 20,
        worthlessnessScore: 80
      },
      {
        id: 'test-14',
        date: '2025-01-08',
        emotion: '寂しさ',
        event: '友人たちが集まっているSNSの投稿を見て、自分だけ誘われていないことに気づいた。一人でいることが辛い。',
        realization: '全ての集まりに参加する必要はない。一人の時間も大切にしよう。',
        selfEsteemScore: 35,
        worthlessnessScore: 65
      },
      {
        id: 'test-15',
        date: '2025-01-07',
        emotion: '罪悪感',
        event: '忙しくて実家に電話をかけるのを忘れていた。母から心配の電話がきて、申し訳ない気持ちになった。',
        realization: '完璧でなくても大丈夫。今度から定期的に連絡を取るようにしよう。',
        selfEsteemScore: 40,
        worthlessnessScore: 60
      },
      {
        id: 'test-16',
        date: '2025-01-06',
        emotion: '恥ずかしさ',
        event: '会議で間違った発言をしてしまい、みんなに訂正された。顔が真っ赤になって恥ずかしかった。',
        realization: '間違いは誰にでもある。学習の機会として捉えよう。',
        selfEsteemScore: 43,
        worthlessnessScore: 57
      },
      {
        id: 'test-17',
        date: '2025-01-05',
        emotion: '悔しさ',
        event: 'ゲームで負け続けて悔しい。練習しているのに上達しない自分にイライラする。',
        realization: '結果だけでなく、過程も大切。楽しむことを忘れていた。',
        selfEsteemScore: 48,
        worthlessnessScore: 52
      },
      {
        id: 'test-18',
        date: '2025-01-04',
        emotion: '無価値感',
        event: '新年の目標を立てたが、もう挫折しそう。毎年同じことの繰り返しで、自分には変われないと思った。',
        realization: '完璧を求めすぎていた。小さな変化も成長の証。',
        selfEsteemScore: 25,
        worthlessnessScore: 75
      },
      {
        id: 'test-19',
        date: '2025-01-03',
        emotion: '悲しみ',
        event: '正月休みが終わって、また日常に戻ることが悲しい。楽しい時間はあっという間に過ぎてしまう。',
        realization: '楽しい時間があったからこそ、それを大切に思える。次の楽しみを見つけよう。',
        selfEsteemScore: 42,
        worthlessnessScore: 58
      },
      {
        id: 'test-20',
        date: '2025-01-02',
        emotion: '恐怖',
        event: '新年早々、健康診断の結果が気になって眠れない。悪い結果だったらどうしようと不安になった。',
        realization: 'まだ結果も出ていないのに心配しすぎていた。今できることに集中しよう。',
        selfEsteemScore: 38,
        worthlessnessScore: 62
      }
    ];

    return testEntries;
  };

  const loadEntries = async () => {
    setDataLoading(true);
    
    try {
      // ローカルストレージから既存のデータを取得
      const savedEntries = localStorage.getItem('journalEntries');
      
      if (savedEntries) {
        const parsedEntries = JSON.parse(savedEntries);
        setEntries(parsedEntries);
        console.log('既存のデータを読み込みました');
      } else {
        // 初回の場合、テストデータを生成
        const testData = generateTestData();
        setEntries(testData);
        localStorage.setItem('journalEntries', JSON.stringify(testData));
        console.log('テストデータを生成しました');
      }
    } catch (error) {
      console.error('データ読み込みエラー:', error);
      // エラーの場合もテストデータを使用
      const testData = generateTestData();
      setEntries(testData);
      localStorage.setItem('journalEntries', JSON.stringify(testData));
    } finally {
      setDataLoading(false);
    }
  };

  const handlePrivacyConsent = (accepted: boolean) => {
    if (accepted) {
      localStorage.setItem('privacyConsentGiven', 'true');
      localStorage.setItem('privacyConsentDate', new Date().toISOString());
      setShowPrivacyConsent(false);
      setAuthState('register');
    } else {
      alert('プライバシーポリシーに同意いただけない場合、サービスをご利用いただけません。');
    }
  };

  const handleDeviceAuthSuccess = (lineUsername: string) => {
    localStorage.setItem('line-username', lineUsername);
    setLineUsername(lineUsername);
    // Supabaseユーザーを初期化
    if (isConnected) {
      initializeUser(lineUsername);
    }
    setCurrentPage('how-to');
    setAuthState('none');
  }

  const handleStartApp = () => {
    const consentGiven = localStorage.getItem('privacyConsentGiven');
    
    if (consentGiven === 'true') {
      // 既存ユーザーは認証状態をチェック
      if (isAuthenticated()) {
        // 認証済みの場合は使い方ページへ
        const user = getCurrentUser();
        if (user) {
          setLineUsername(user.lineUsername);
          setCurrentPage('how-to');
        }
      } else {
        // 未認証の場合はログイン画面へ
        setAuthState('login');
      }
    } else {
      // 新規ユーザーはプライバシー同意から
      setShowPrivacyConsent(true);
    }
  };

  // ログアウト処理
  const handleLogout = () => {
    if (window.confirm('ログアウトしますか？')) {
      logoutUser();
      setLineUsername(null);
      setCurrentPage('home');
      setIsMobileMenuOpen(false);
    }
  };

  // カウンセラーアカウント情報
  const counselorAccounts = [
    { name: '仁カウンセラー', email: 'jin@namisapo.com' },
    { name: 'AOIカウンセラー', email: 'aoi@namisapo.com' },
    { name: 'あさみカウンセラー', email: 'asami@namisapo.com' },
    { name: 'SHUカウンセラー', email: 'shu@namisapo.com' },
    { name: 'ゆーちゃカウンセラー', email: 'yucha@namisapo.com' },
    { name: 'sammyカウンセラー', email: 'sammy@namisapo.com' }
  ];

  // カウンセラーログイン処理
  const handleCounselorLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    const { email, password } = counselorCredentials;
    
    // パスワードチェック
    if (password !== 'counselor123') {
      alert('パスワードが正しくありません。');
      return;
    }
    
    // メールアドレスチェック
    const counselor = counselorAccounts.find(c => c.email === email);
    if (!counselor) {
      alert('登録されていないメールアドレスです。');
      return;
    }
    
    // ログイン成功
    setCurrentCounselor(counselor.name);
    setIsAdmin(true);
    setShowCounselorLogin(false);
    setCurrentPage('admin');
    setCounselorCredentials({ email: '', password: '' });
  };

  // ログアウト処理
  const handleCounselorLogout = () => {
    setCurrentCounselor(null);
    setIsAdmin(false);
    setCurrentPage('how-to');
  };

  // カウンセラーログイン画面表示
  const handleShowCounselorLogin = () => {
    setShowCounselorLogin(true);
  };

  const getEmotionFrequency = () => {
    const now = new Date();
    let filteredEntries = entries;

    if (emotionPeriod === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredEntries = entries.filter(entry => new Date(entry.date) >= weekAgo);
    } else if (emotionPeriod === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filteredEntries = entries.filter(entry => new Date(entry.date) >= monthAgo);
    }

    const frequency: { [key: string]: number } = {};
    filteredEntries.forEach(entry => {
      frequency[entry.emotion] = (frequency[entry.emotion] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
  };

  const getWorthlessnessData = () => {
    // 最初にやることページで保存されたスコアを取得
    const savedInitialScores = localStorage.getItem('initialScores');
    let initialData = [];
    
    if (savedInitialScores) {
      const initialScores = JSON.parse(savedInitialScores);
      if (initialScores.selfEsteemScore && initialScores.worthlessnessScore && initialScores.measurementMonth && initialScores.measurementDay) {
        // 計測日を作成（年は現在年を使用）
        const currentYear = new Date().getFullYear();
        const measurementDate = `${currentYear}-${String(initialScores.measurementMonth).padStart(2, '0')}-${String(initialScores.measurementDay).padStart(2, '0')}`;
        
        initialData.push({
          date: measurementDate,
          selfEsteem: parseInt(initialScores.selfEsteemScore),
          worthlessness: parseInt(initialScores.worthlessnessScore)
        });
      }
    }
    
    const worthlessnessEntries = entries
      .filter(entry => entry.emotion === '無価値感')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(entry => ({
        date: entry.date,
        selfEsteem: entry.selfEsteemScore,
        worthlessness: entry.worthlessnessScore
      }));

    // 初期データと日記データを結合し、日付順でソート
    const allData = [...initialData, ...worthlessnessEntries]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-10); // 最新10件

    return allData;
  };

  const renderWorthlessnessChart = (data: any[], period: string) => {
    if (data.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500 font-jp-normal">無価値感のデータがありません</p>
        </div>
      );
    }

    const maxValue = 100;
    const chartWidth = 600;
    const chartHeight = 300;
    const padding = 40;

    const xStep = (chartWidth - padding * 2) / Math.max(data.length - 1, 1);
    const yScale = (chartHeight - padding * 2) / maxValue;

    const selfEsteemPoints = data.map((item, index) => ({
      x: padding + index * xStep,
      y: chartHeight - padding - item.selfEsteem * yScale
    }));

    const worthlessnessPoints = data.map((item, index) => ({
      x: padding + index * xStep,
      y: chartHeight - padding - item.worthlessness * yScale
    }));

    const createPath = (points: any[]) => {
      if (points.length === 0) return '';
      return `M ${points[0].x} ${points[0].y} ` + 
             points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    };

    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <svg width="100%" height="300" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible">
          {/* グリッドライン */}
          {[0, 25, 50, 75, 100].map(value => (
            <g key={value}>
              <line
                x1={padding}
                y1={chartHeight - padding - value * yScale}
                x2={chartWidth - padding}
                y2={chartHeight - padding - value * yScale}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
              <text
                x={padding - 10}
                y={chartHeight - padding - value * yScale + 5}
                fontSize="12"
                fill="#6b7280"
                textAnchor="end"
              >
                {value}
              </text>
            </g>
          ))}

          {/* 自己肯定感ライン */}
          <path
            d={createPath(selfEsteemPoints)}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 無価値感ライン */}
          <path
            d={createPath(worthlessnessPoints)}
            fill="none"
            stroke="#ef4444"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* データポイント */}
          {selfEsteemPoints.map((point, index) => (
            <circle
              key={`self-${index}`}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#3b82f6"
              className="hover:r-6 transition-all cursor-pointer"
            >
              <title>{`${data[index].date}: 自己肯定感 ${data[index].selfEsteem}`}</title>
            </circle>
          ))}

          {worthlessnessPoints.map((point, index) => (
            <circle
              key={`worth-${index}`}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#ef4444"
              className="hover:r-6 transition-all cursor-pointer"
            >
              <title>{`${data[index].date}: 無価値感 ${data[index].worthlessness}`}</title>
            </circle>
          ))}

          {/* 日付ラベル */}
          {data.map((item, index) => (
            <text
              key={index}
              x={padding + index * xStep}
              y={chartHeight - 10}
              fontSize="10"
              fill="#6b7280"
              textAnchor="middle"
            >
              {new Date(item.date).getMonth() + 1}/{new Date(item.date).getDate()}
            </text>
          ))}
        </svg>

        {/* 凡例 */}
        <div className="flex justify-center space-x-6 mt-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-jp-medium text-gray-700">自己肯定感</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span className="text-sm font-jp-medium text-gray-700">無価値感</span>
          </div>
        </div>
      </div>
    );
  };

  const handleShareWorthlessness = (period: string, data: any[]) => {
    const periodText = period === 'week' ? '1週間' : period === 'month' ? '1ヶ月' : '全期間';
    const recordCount = data.length;
    const emotionFreq = getEmotionFrequency();
    const mostFrequentEmotion = emotionFreq.length > 0 ? `${emotionFreq[0][0]} (${emotionFreq[0][1]}回)` : 'なし';
    
    const shareText = `📊 無価値感推移レポート（${periodText}）\n\n📝 記録数: ${recordCount}件\n😔 最も多い感情: ${mostFrequentEmotion}\n\n#かんじょうにっき #感情日記 #無価値感推移\n\n${window.location.origin}`;
    
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

  // カウンセラーログインモーダル
  const renderCounselorLoginModal = () => {
    if (!showCounselorLogin) return null;

    return (
      <div className="fixed inset-0 bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto p-6 transform transition-all duration-300 scale-100">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-4 shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-jp-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              カウンセラーログイン
            </h1>
            <p className="text-gray-500 font-jp-normal text-sm">
              専用アカウントでログインしてください
            </p>
          </div>

          <form onSubmit={handleCounselorLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-jp-semibold text-gray-800 mb-2">
                メールアドレス
              </label>
              <input
                type="email"
                value={counselorCredentials.email}
                onChange={(e) => setCounselorCredentials({...counselorCredentials, email: e.target.value})}
                placeholder="カウンセラー用メールアドレスを入力"
                className="w-full px-3 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-jp-normal text-gray-800 placeholder-gray-400 transition-all duration-200 bg-gray-50 focus:bg-white text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-jp-semibold text-gray-800 mb-2">
                パスワード
              </label>
              <input
                type="password"
                value={counselorCredentials.password}
                onChange={(e) => setCounselorCredentials({...counselorCredentials, password: e.target.value})}
                placeholder="パスワードを入力"
                className="w-full px-3 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-jp-normal text-gray-800 placeholder-gray-400 transition-all duration-200 bg-gray-50 focus:bg-white text-sm"
                required
              />
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100 shadow-sm">
              <div className="text-xs text-blue-900 font-jp-normal">
                <p className="font-jp-bold mb-2 flex items-center space-x-2">
                  <span className="text-sm">🔐</span>
                  <span>カウンセラー専用アカウント</span>
                </p>
                <p className="text-xs text-blue-700 leading-relaxed mb-2">
                  登録されたカウンセラー用メールアドレスとパスワードを入力してください。
                </p>
                <p className="text-xs text-blue-600 font-jp-medium">
                  ※ アカウント情報は管理者にお問い合わせください
                </p>
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 px-4 rounded-lg font-jp-bold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 text-sm"
              >
                ログイン
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCounselorLogin(false);
                  setCounselorCredentials({ email: '', password: '' });
                }}
                className="px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-gray-300 font-jp-medium transition-all duration-200 hover:shadow-md text-sm"
              >
                キャンセル
              </button>
            </div>
          </form>
          
          {/* 装飾的な要素 */}
          <div className="absolute top-2 right-2 w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full opacity-20 -z-10"></div>
          <div className="absolute bottom-2 left-2 w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full opacity-20 -z-10"></div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (showPrivacyConsent) {
      return <PrivacyConsent onConsent={handlePrivacyConsent} />;
    }

    if (authState === 'login') {
      return <DeviceAuthLogin 
        onLoginSuccess={handleDeviceAuthSuccess}
        onRegister={() => setAuthState('register')}
        onBack={() => setCurrentPage('home')}
      />;
    }

    if (authState === 'register') {
      return <DeviceAuthRegistration 
        onRegistrationComplete={handleDeviceAuthSuccess}
        onBack={() => setCurrentPage('home')}
      />;
    }

    if (currentPage === 'home') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-50 flex items-center justify-center p-4 relative overflow-hidden">
          {/* 水玉模様の装飾要素 */}
          <div className="absolute inset-0 pointer-events-none">
            {/* 大きな円形要素 */}
            <div className="absolute top-20 left-20 w-32 h-32 bg-white rounded-full opacity-30 shadow-lg"></div>
            <div className="absolute top-40 right-32 w-24 h-24 bg-orange-200 rounded-full opacity-40"></div>
            <div className="absolute bottom-32 left-16 w-28 h-28 bg-amber-200 rounded-full opacity-35"></div>
            <div className="absolute bottom-20 right-20 w-20 h-20 bg-yellow-200 rounded-full opacity-45"></div>
            
            {/* 中サイズの円形要素 */}
            <div className="absolute top-32 left-1/3 w-16 h-16 bg-white rounded-full opacity-25"></div>
            <div className="absolute top-60 right-1/4 w-14 h-14 bg-orange-100 rounded-full opacity-30"></div>
            <div className="absolute bottom-40 left-1/2 w-18 h-18 bg-amber-100 rounded-full opacity-35"></div>
            <div className="absolute bottom-60 right-1/3 w-12 h-12 bg-yellow-100 rounded-full opacity-40"></div>
            
            {/* 小さな円形要素 */}
            <div className="absolute top-16 left-1/2 w-8 h-8 bg-white rounded-full opacity-20"></div>
            <div className="absolute top-80 left-1/4 w-6 h-6 bg-orange-50 rounded-full opacity-25"></div>
            <div className="absolute bottom-16 left-2/3 w-10 h-10 bg-amber-50 rounded-full opacity-30"></div>
            <div className="absolute bottom-80 right-1/2 w-8 h-8 bg-yellow-50 rounded-full opacity-35"></div>
            
            {/* 追加の装飾円 */}
            <div className="absolute top-1/4 right-16 w-22 h-22 bg-white rounded-full opacity-20 shadow-md"></div>
            <div className="absolute top-3/4 left-1/4 w-26 h-26 bg-orange-100 rounded-full opacity-25"></div>
            <div className="absolute top-1/2 right-1/4 w-14 h-14 bg-amber-100 rounded-full opacity-30"></div>
            <div className="absolute top-2/3 left-1/3 w-16 h-16 bg-yellow-100 rounded-full opacity-25"></div>
          </div>
          
          <div className="text-center text-gray-800">
            {/* メインハートアイコン */}
            <div className="mb-8 relative z-10">
              <div className="inline-flex items-center justify-center w-32 h-32 bg-white rounded-full mb-6 shadow-lg">
                <Heart className="w-16 h-16 text-orange-400" fill="currentColor" />
              </div>
            </div>

            {/* メインタイトル */}
            <h1 className="text-4xl md:text-6xl font-jp-bold mb-4 text-gray-800 relative z-10">
              かんじょうにっき
            </h1>

            {/* サブタイトル */}
            <p className="text-xl md:text-2xl font-jp-medium mb-6 text-gray-600 relative z-10">
              自己肯定感を育てる感情日記アプリ
            </p>

            {/* はじめるボタン */}
            <button
              onClick={handleStartApp}
              className="bg-orange-400 hover:bg-orange-500 text-white px-8 py-4 rounded-full font-jp-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl mb-8 relative z-10"
            >
              はじめる
            </button>

            {/* 下部テキスト */}
            <p className="mt-8 text-sm font-jp-normal text-gray-400 relative z-10">
              一般社団法人NAMIDAサポート協会
            </p>
          </div>
        </div>
      );
    }

    // その他のページのレンダリング
    switch (currentPage) {
      case 'how-to':
        return <HowTo />;
      case 'first-steps':
        return <FirstSteps />;
      case 'next-steps':
        return <NextSteps />;
      case 'emotion-types':
        return <EmotionTypes />;
      case 'support':
        return <Support />;
      case 'privacy-policy':
        return <PrivacyPolicy />;
      case 'diary':
        return <DiaryPage />;
      case 'search':
        return <DiarySearchPage />;
      case 'admin':
        return isAdmin ? <AdminPanel /> : <div>アクセス権限がありません</div>;
      case 'data-migration':
        return isAdmin ? <DataMigration /> : <div>アクセス権限がありません</div>;
      case 'worthlessness-trend':
        const worthlessnessData = getWorthlessnessData();
        const filteredData = emotionPeriod === 'week' 
          ? worthlessnessData.slice(-7)
          : emotionPeriod === 'month'
          ? worthlessnessData.slice(-30)
          : worthlessnessData;

        const emotionFrequency = getEmotionFrequency();

        return (
          <div className="w-full max-w-4xl mx-auto space-y-6 px-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
                <h1 className="text-2xl font-jp-bold text-gray-900">無価値感推移</h1>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                  <div className="flex space-x-2">
                    {[
                      { key: 'week' as const, label: '1週間' },
                      { key: 'month' as const, label: '1ヶ月' },
                      { key: 'all' as const, label: '全期間' }
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setEmotionPeriod(key)}
                        className={`px-3 py-2 rounded-lg font-jp-medium text-sm transition-colors ${
                          emotionPeriod === key
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => handleShareWorthlessness(emotionPeriod, filteredData)}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-jp-medium transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>SNSでシェア</span>
                  </button>
                </div>
              </div>

              {renderWorthlessnessChart(filteredData, emotionPeriod)}

            </div>

            {/* 感情の出現頻度 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
                <h2 className="text-xl font-jp-bold text-gray-900">感情の出現頻度</h2>
                <div className="flex space-x-2">
                  {[
                    { key: 'week' as const, label: '1週間' },
                    { key: 'month' as const, label: '1ヶ月' },
                    { key: 'all' as const, label: '全期間' }
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setEmotionPeriod(key)}
                      className={`px-3 py-2 rounded-lg font-jp-medium text-sm transition-colors ${
                        emotionPeriod === key
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {emotionFrequency.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📊</div>
                  <h3 className="text-lg font-jp-medium text-gray-500 mb-2">
                    データがありません
                  </h3>
                  <p className="text-gray-400 font-jp-normal">
                    選択した期間に日記データがありません
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {emotionFrequency.map(([emotion, count], index) => {
                    const percentage = Math.round((count / emotionFrequency.reduce((sum, [, c]) => sum + c, 0)) * 100);
                    const getEmotionColor = (emotion: string) => {
                      const colorMap: { [key: string]: { bg: string; border: string; text: string } } = {
                        '恐怖': { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800' },
                        '悲しみ': { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800' },
                        '怒り': { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-800' },
                        '悔しい': { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800' },
                        '無価値感': { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-800' },
                        '罪悪感': { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800' },
                        '寂しさ': { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-800' },
                        '恥ずかしさ': { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-800' }
                      };
                      return colorMap[emotion] || { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-800' };
                    };
                    
                    const colors = getEmotionColor(emotion);
                    
                    return (
                      <div key={emotion} className={`${colors.bg} rounded-lg p-3 border ${colors.border}`}>
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center space-x-3">
                            <span className="text-base font-jp-bold">{index + 1}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-jp-medium border ${colors.bg} ${colors.border} ${colors.text}`}>
                              {emotion}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-jp-bold ${colors.text}`}>{count}回</div>
                            <div className={`text-xs font-jp-medium ${colors.text}`}>{percentage}%</div>
                          </div>
                        </div>
                        
                        {/* プログレスバー */}
                        <div className="w-full bg-white rounded-full h-1.5 border border-gray-200">
                          <div 
                            className={`h-1.5 rounded-full transition-all duration-500 ${colors.border.replace('border-', 'bg-')}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      default:
        return <HowTo />;
    }
  };

  // メンテナンスモードのチェック
  if (maintenanceLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-jp-normal">システム状態を確認中...</p>
        </div>
      </div>
    );
  }

  if (isMaintenanceMode && maintenanceConfig) {
    return <MaintenanceMode config={maintenanceConfig} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {!showPrivacyConsent && currentPage !== 'home' && authState === 'none' && (
        <>
          {/* ヘッダー */}
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setCurrentPage('home')}
                    className="flex items-center space-x-2 text-gray-900 hover:text-blue-600 transition-colors mr-2"
                  >
                    <Heart className="w-6 h-6 text-pink-500" />
                    <span className="font-jp-bold text-lg">かんじょうにっき</span>
                  </button>
                  
                  {/* ユーザー名表示 */}
                  {lineUsername && (
                    <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-blue-50 rounded-full border border-blue-200">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-blue-700 font-jp-medium text-sm">
                        {lineUsername}さん
                      </span>
                    </div>
                  )}
                </div>

                {/* デスクトップナビゲーション */}
                <nav className="hidden md:hidden space-x-8">
                  {[
                    { key: 'how-to', label: '使い方', icon: BookOpen },
                    { key: 'diary', label: '日記', icon: Plus },
                    { key: 'search', label: '検索', icon: Search },
                    { key: 'worthlessness-trend', label: '推移', icon: TrendingUp },
                    ...(isAdmin ? [{ key: 'admin', label: '管理', icon: Settings }] : [])
                  ].map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setCurrentPage(key)}
                      className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-jp-medium transition-colors ${
                        currentPage === key
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{label}</span>
                    </button>
                  ))}
                  {!isAdmin && (
                    <button
                      onClick={handleShowCounselorLogin}
                      className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-jp-medium text-gray-600 hover:text-gray-900 transition-colors"
                      title="カウンセラーログイン"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  )}
                  {isAdmin && currentCounselor && (
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-gray-600 font-jp-normal">
                        {currentCounselor}
                      </div>
                      <button
                        onClick={handleCounselorLogout}
                        className="text-sm text-gray-500 hover:text-gray-700 font-jp-normal"
                      >
                        ログアウト
                      </button>
                    </div>
                  )}
                </nav>

                {/* モバイルメニューボタン */}
                <div className="flex items-center space-x-3 md:block">
                  {/* モバイル用ユーザー名表示 */}
                  {lineUsername && (
                    <div className="sm:hidden flex items-center space-x-2 px-2 py-1 bg-blue-50 rounded-full border border-blue-200">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <span className="text-blue-700 font-jp-medium text-xs">
                        {lineUsername}さん
                      </span>
                    </div>
                  )}
                  
                  <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  >
                    {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                  </button>
                </div>
              </div>
            </div>

            {/* モバイルメニュー */}
            {isMobileMenuOpen && (
              <div className="border-t border-gray-200 bg-white">
                <div className="px-2 pt-2 pb-3 space-y-1">
                  {[
                    { key: 'home', label: 'TOP', icon: Home },
                    { key: 'how-to', label: '使い方', icon: BookOpen },
                    { key: 'first-steps', label: '最初にやること', icon: Play },
                    { key: 'next-steps', label: '次にやること', icon: ArrowRight },
                    { key: 'emotion-types', label: '感情の種類', icon: Heart },
                    { key: 'support', label: 'サポートについて', icon: Shield },
                    { key: 'privacy-policy', label: '同意文', icon: Shield },
                    { key: 'diary', label: '日記', icon: Plus },
                    { key: 'search', label: '日記検索', icon: Search },
                    { key: 'worthlessness-trend', label: '無価値感推移', icon: TrendingUp },
                    ...(isAdmin ? [
                      { key: 'admin', label: '管理画面', icon: Settings },
                      { key: 'data-migration', label: 'データ管理', icon: Settings }
                    ] : [])
                  ].map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => {
                        setCurrentPage(key);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`flex items-center space-x-3 w-full px-3 py-2 rounded-md text-base font-jp-medium transition-colors ${
                        currentPage === key
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{label}</span>
                    </button>
                  ))}
                  
                  {/* お問い合わせ */}
                  <a
                    href="https://lin.ee/VXZVGnx"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-3 w-full px-3 py-2 rounded-md text-base font-jp-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>お問い合わせ</span>
                  </a>
                  
                  {!isAdmin && (
                    <button
                      onClick={() => {
                        handleShowCounselorLogin();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center space-x-3 w-full px-3 py-2 rounded-md text-base font-jp-medium text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <Settings className="w-5 h-5" />
                      <span>カウンセラーログイン</span>
                    </button>
                  )}
                  
                  {/* ログアウトボタン */}
                  {lineUsername && (
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-3 w-full px-3 py-2 rounded-md text-base font-jp-medium text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                    >
                      <Shield className="w-5 h-5" />
                      <span>ログアウト</span>
                    </button>
                  )}
                  
                  {isAdmin && currentCounselor && (
                    <div className="px-3 py-2 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-jp-medium text-gray-700">
                          {currentCounselor}
                        </span>
                        <button
                          onClick={() => {
                            handleCounselorLogout();
                            setIsMobileMenuOpen(false);
                          }}
                          className="text-sm text-gray-500 hover:text-gray-700 font-jp-normal"
                        >
                          ログアウト
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </header>

          {/* メインコンテンツ */}
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {/* Supabase接続状態表示 */}
            {isAdmin && (
              <div className="mb-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-jp-medium ${
                    isConnected 
                      ? 'bg-green-100 text-green-800 border border-green-200' 
                      : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    <span>Supabase: {isConnected ? '接続済み' : 'ローカルモード'}</span>
                    {currentUser && (
                      <span className="text-xs">({currentUser.line_username})</span>
                    )}
                  </div>
                  {currentCounselor && (
                    <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-jp-medium bg-blue-100 text-blue-800 border border-blue-200">
                      <Shield className="w-3 h-3" />
                      <span>{currentCounselor}</span>
                    </div>
                  )}
                  {isAutoSyncEnabled && (
                    <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-jp-medium bg-purple-100 text-purple-800 border border-purple-200">
                      <RefreshCw className="w-3 h-3" />
                      <span>自動同期: 有効</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {renderContent()}
          </main>
        </>
      )}

      {(showPrivacyConsent || currentPage === 'home' || authState !== 'none') && renderContent()}
      
      {/* カウンセラーログインモーダル */}
      {renderCounselorLoginModal()}
    </div>
  );
};

export default App;