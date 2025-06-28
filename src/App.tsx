import React, { useState, useEffect } from 'react';
import { Heart, BookOpen, Search, BarChart2, HelpCircle, MessageCircle, Settings, Home, User, Menu, X } from 'lucide-react';
import { useMaintenanceStatus } from './hooks/useMaintenanceStatus';
import { useSupabase } from './hooks/useSupabase';
import { useAutoSync } from './hooks/useAutoSync';
import { isAuthenticated, getCurrentUser } from './lib/deviceAuth';

// コンポーネントのインポート
import MaintenanceMode from './components/MaintenanceMode';
import PrivacyConsent from './components/PrivacyConsent';
import DeviceAuthLogin from './components/DeviceAuthLogin';
import DeviceAuthRegistration from './components/DeviceAuthRegistration';
import Chat from './components/Chat';
import DataMigration from './components/DataMigration';
import AdminPanel from './components/AdminPanel';
import UserDataManagement from './components/UserDataManagement';

// ページコンポーネントのインポート
import DiaryPage from './pages/DiaryPage';
import DiarySearchPage from './pages/DiarySearchPage';
import EmotionTypes from './pages/EmotionTypes';
import FirstSteps from './pages/FirstSteps';
import HowTo from './pages/HowTo';
import NextSteps from './pages/NextSteps';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Support from './pages/Support';
import WelcomePage from './pages/WelcomePage';

function App() {
  // 状態管理
  const [activeTab, setActiveTab] = useState<string>('home');
  const [showPrivacyConsent, setShowPrivacyConsent] = useState(false);
  const [lineUsername, setLineUsername] = useState<string | null>(null);
  const [showDeviceAuth, setShowDeviceAuth] = useState(false);
  const [isDeviceRegistration, setIsDeviceRegistration] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showWelcomePage, setShowWelcomePage] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  // カスタムフックの使用
  const { isMaintenanceMode, config, isAdminBypass } = useMaintenanceStatus();
  const { isConnected, error: supabaseError, retryConnection } = useSupabase();
  
  // 自動同期フックを使用
  useAutoSync();

  // 初期化
  useEffect(() => {
    // プライバシーポリシー同意状態の確認
    const consentGiven = localStorage.getItem('privacyConsentGiven');
    if (consentGiven !== 'true') {
      setShowPrivacyConsent(true);
    }

    // ユーザー名の取得
    const savedUsername = localStorage.getItem('line-username');
    if (savedUsername) {
      setLineUsername(savedUsername);
    }

    // 管理者状態の確認
    const currentCounselor = localStorage.getItem('current_counselor');
    if (currentCounselor) {
      setIsAdmin(true);
    }
  }, []);

  // プライバシーポリシー同意処理
  const handlePrivacyConsent = (accepted: boolean) => {
    if (accepted) {
      const username = prompt('LINEのユーザー名を入力してください');
      if (username) {
        localStorage.setItem('line-username', username);
        localStorage.setItem('privacyConsentGiven', 'true');
        localStorage.setItem('privacyConsentDate', new Date().toISOString());
        setLineUsername(username);
        setShowPrivacyConsent(false);
      }
    } else {
      alert('プライバシーポリシーに同意いただけない場合、サービスをご利用いただけません。');
    }
  };

  // デバイス認証処理
  const handleDeviceAuthLogin = (username: string) => {
    setLineUsername(username);
    setShowDeviceAuth(false);
  };

  // 管理者ログイン処理
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'counselor123') {
      const counselorName = prompt('カウンセラー名を入力してください');
      if (counselorName) {
        localStorage.setItem('current_counselor', counselorName);
        setIsAdmin(true);
        setShowAdminLogin(false);
        alert(`${counselorName}としてログインしました。`);
      }
    } else {
      alert('パスワードが正しくありません。');
    }
  };

  // 管理者ログアウト処理
  const handleAdminLogout = () => {
    if (window.confirm('管理者ログアウトしますか？')) {
      localStorage.removeItem('current_counselor');
      setIsAdmin(false);
      alert('管理者ログアウトしました。');
    }
  };

  // ホームタブをクリックした時の処理
  const handleHomeClick = () => {
    setActiveTab('home');
    setShowWelcomePage(true);
  };

  // はじめるボタンをクリックした時の処理
  const handleStartClick = () => {
    setShowWelcomePage(false);
    setActiveTab('diary');
  };

  // WelcomePageからのイベントリスナー
  useEffect(() => {
    const handleStartApp = () => {
      handleStartClick();
    };
    
    window.addEventListener('startApp', handleStartApp);
    
    return () => {
      window.removeEventListener('startApp', handleStartApp);
    };
  }, []);

  // メニューの開閉
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  // メンテナンスモードの場合
  if (isMaintenanceMode && !isAdminBypass) {
    return <MaintenanceMode config={config} onRetry={retryConnection} />;
  }

  // プライバシーポリシー同意画面
  if (showPrivacyConsent) {
    return <PrivacyConsent onConsent={handlePrivacyConsent} />;
  }

  // デバイス認証画面
  if (showDeviceAuth) {
    if (isDeviceRegistration) {
      return (
        <DeviceAuthRegistration
          onRegistrationComplete={handleDeviceAuthLogin}
          onBack={() => setShowDeviceAuth(false)}
        />
      );
    } else {
      return (
        <DeviceAuthLogin
          onLoginSuccess={handleDeviceAuthLogin}
          onRegister={() => setIsDeviceRegistration(true)}
          onBack={() => setShowDeviceAuth(false)}
        />
      );
    }
  }

  // 管理者ログイン画面
  if (showAdminLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
          <h1 className="text-2xl font-jp-bold text-gray-900 mb-6 text-center">カウンセラーログイン</h1>
          
          <form onSubmit={handleAdminLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-jp-medium text-gray-700 mb-2">
                パスワード
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-jp-normal"
                placeholder="パスワードを入力"
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-jp-bold transition-colors shadow-md hover:shadow-lg"
            >
              ログイン
            </button>
            
            <button
              type="button"
              onClick={() => setShowAdminLogin(false)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-jp-medium transition-colors"
            >
              キャンセル
            </button>
          </form>
        </div>
      </div>
    );
  }

  // メインコンテンツ
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button 
              onClick={toggleMenu}
              className="p-2 rounded-md text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="flex items-center flex-1 justify-center">
              <Heart className="w-6 h-6 text-red-500" />
              <h1 className="ml-2 text-xl font-jp-bold text-gray-900">かんじょうにっき</h1>
            </div>
            
            {lineUsername && (
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-jp-medium text-gray-700">{lineUsername}さん</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* サイドメニュー */}
      <div className={`fixed inset-0 z-40 transform ${menuOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`}>
        <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={toggleMenu}></div>
        <div className="relative max-w-xs w-full h-full bg-white shadow-xl flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Heart className="w-6 h-6 text-red-500" />
                <h2 className="ml-2 text-xl font-jp-bold text-gray-900">かんじょうにっき</h2>
              </div>
              <button
                onClick={toggleMenu}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            {lineUsername && (
              <div className="mt-4 flex items-center space-x-2">
                <User className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-jp-medium text-gray-700">{lineUsername}さん</span>
              </div>
            )}
          </div>
          
          <nav className="flex-1 px-2 py-4 bg-white space-y-1 overflow-y-auto">
            <button
              onClick={() => {
                handleHomeClick();
                toggleMenu();
              }}
              className={`flex items-center px-3 py-2 w-full rounded-md ${
                activeTab === 'home' ? 'bg-blue-100 text-blue-900' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Home className="w-5 h-5 mr-3" />
              <span className="font-jp-medium">ホーム</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('diary');
                setShowWelcomePage(false);
                toggleMenu();
              }}
              className={`flex items-center px-3 py-2 w-full rounded-md ${
                activeTab === 'diary' ? 'bg-blue-100 text-blue-900' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BookOpen className="w-5 h-5 mr-3" />
              <span className="font-jp-medium">日記</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('search');
                setShowWelcomePage(false);
                toggleMenu();
              }}
              className={`flex items-center px-3 py-2 w-full rounded-md ${
                activeTab === 'search' ? 'bg-blue-100 text-blue-900' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Search className="w-5 h-5 mr-3" />
              <span className="font-jp-medium">検索</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('chart');
                setShowWelcomePage(false);
                toggleMenu();
              }}
              className={`flex items-center px-3 py-2 w-full rounded-md ${
                activeTab === 'chart' ? 'bg-blue-100 text-blue-900' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BarChart2 className="w-5 h-5 mr-3" />
              <span className="font-jp-medium">感情</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('howto');
                setShowWelcomePage(false);
                toggleMenu();
              }}
              className={`flex items-center px-3 py-2 w-full rounded-md ${
                activeTab === 'howto' ? 'bg-blue-100 text-blue-900' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <HelpCircle className="w-5 h-5 mr-3" />
              <span className="font-jp-medium">使い方</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('chat');
                setShowWelcomePage(false);
                toggleMenu();
              }}
              className={`flex items-center px-3 py-2 w-full rounded-md ${
                activeTab === 'chat' ? 'bg-blue-100 text-blue-900' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <MessageCircle className="w-5 h-5 mr-3" />
              <span className="font-jp-medium">チャット</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('data');
                setShowWelcomePage(false);
                toggleMenu();
              }}
              className={`flex items-center px-3 py-2 w-full rounded-md ${
                activeTab === 'data' ? 'bg-blue-100 text-blue-900' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Settings className="w-5 h-5 mr-3" />
              <span className="font-jp-medium">設定</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  setActiveTab('admin');
                  setShowWelcomePage(false);
                  toggleMenu();
                }}
                className={`flex items-center px-3 py-2 w-full rounded-md ${
                  activeTab === 'admin' ? 'bg-green-100 text-green-900' : 'text-green-700 hover:bg-green-50'
                }`}
              >
                <User className="w-5 h-5 mr-3" />
                <span className="font-jp-medium">管理</span>
              </button>
            )}
          </nav>
          
          <div className="p-4 border-t border-gray-200">
            {isAdmin ? (
              <button
                onClick={handleAdminLogout}
                className="flex items-center px-3 py-2 w-full rounded-md text-red-700 hover:bg-red-50"
              >
                <span className="font-jp-medium">管理者ログアウト</span>
              </button>
            ) : (
              <button
                onClick={() => setShowAdminLogin(true)}
                className="flex items-center px-3 py-2 w-full rounded-md text-gray-700 hover:bg-gray-100"
              >
                <span className="font-jp-medium">カウンセラーログイン</span>
              </button>
            )}
          </div>
        </div>
      </div>
      {/* メインコンテンツ */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ウェルカムページ表示 */}
        {activeTab === 'home' && showWelcomePage ? (
          <WelcomePage />
        ) : (
          <div className="space-y-6">
            {/* 管理者モード表示 */}
            {isAdmin && (
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-green-800 font-jp-medium text-sm">管理者モード: {localStorage.getItem('current_counselor')}</span>
                  </div>
                  <button
                    onClick={handleAdminLogout}
                    className="text-xs text-red-600 hover:text-red-800 font-jp-medium"
                  >
                    ログアウト
                  </button>
                </div>
              </div>
            )}

            {/* メンテナンスモード表示（管理者バイパス時） */}
            {isMaintenanceMode && isAdminBypass && (
              <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-red-800 font-jp-medium text-sm">メンテナンスモード中（管理者アクセス）</span>
                </div>
              </div>
            )}

            {/* Supabase接続エラー表示 */}
            {supabaseError && (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <div className="flex items-start space-x-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mt-1"></div>
                  <div>
                    <h3 className="font-jp-medium text-yellow-800 text-sm">Supabase接続エラー</h3>
                    <p className="text-yellow-700 text-xs mt-1">{supabaseError}</p>
                    <button
                      onClick={retryConnection}
                      className="mt-2 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1 rounded-md font-jp-medium transition-colors"
                    >
                      再接続
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* アクティブなタブに応じたコンテンツ表示 */}
            {activeTab === 'home' && !showWelcomePage && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-jp-bold text-gray-900 mb-6">ダッシュボード</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                    <h3 className="font-jp-bold text-gray-900 mb-4">最近の日記</h3>
                    <p className="text-gray-600 font-jp-normal">
                      最近の日記を確認したり、新しい日記を書いたりできます。
                    </p>
                    <button
                      onClick={() => setActiveTab('diary')}
                      className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-jp-medium transition-colors"
                    >
                      日記を書く
                    </button>
                  </div>
                  <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                    <h3 className="font-jp-bold text-gray-900 mb-4">無価値感推移</h3>
                    <p className="text-gray-600 font-jp-normal">
                      あなたの無価値感の推移を確認できます。
                    </p>
                    <button
                      onClick={() => setActiveTab('chart')}
                      className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-jp-medium transition-colors"
                    >
                      グラフを見る
                    </button>
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setShowWelcomePage(true)}
                    className="text-blue-600 hover:text-blue-800 font-jp-medium text-sm"
                  >
                    ウェルカム画面に戻る
                  </button>
                </div>
              </div>
            )}
            {activeTab === 'diary' && <DiaryPage />}
            {activeTab === 'search' && <DiarySearchPage />}
            {activeTab === 'chart' && <EmotionTypes />}
            {activeTab === 'howto' && <HowTo />}
            {activeTab === 'first' && <FirstSteps />}
            {activeTab === 'next' && <NextSteps />}
            {activeTab === 'support' && <Support />}
            {activeTab === 'privacy' && <PrivacyPolicy />}
            {activeTab === 'chat' && <Chat />}
            {activeTab === 'data' && <DataMigration />}
            {activeTab === 'backup' && <UserDataManagement />}
            {activeTab === 'admin' && isAdmin && <AdminPanel />}
          </div>
        )}
      </main>

    </div>
  );
}

export default App;