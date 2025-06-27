import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Home, Book, Play, ArrowRight, Heart, Search, TrendingUp, Database, Settings, Menu, X, AlertTriangle, Plus } from 'lucide-react';
import HowTo from './pages/HowTo';
import FirstSteps from './pages/FirstSteps';
import NextSteps from './pages/NextSteps';
import EmotionTypes from './pages/EmotionTypes';
import Support from './pages/Support';
import PrivacyPolicy from './pages/PrivacyPolicy';
import DiaryPage from './pages/DiaryPage';
import DiarySearchPage from './pages/DiarySearchPage';
import PrivacyConsent from './components/PrivacyConsent';
import Chat from './components/Chat';
import DataMigration from './components/DataMigration';
import UserDataManagement from './components/UserDataManagement';
import DataBackupRecovery from './components/DataBackupRecovery';
import DeviceAuthLogin from './components/DeviceAuthLogin';
import DeviceAuthRegistration from './components/DeviceAuthRegistration';
import MaintenanceMode from './components/MaintenanceMode';
import { useMaintenanceStatus } from './hooks/useMaintenanceStatus';
import AdminPanel from './components/AdminPanel';
import { useAutoSync } from './hooks/useAutoSync';
import { getCurrentUser } from './lib/deviceAuth';

// メインアプリコンポーネント
const App: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [privacyConsentGiven, setPrivacyConsentGiven] = useState<boolean | null>(null);
  const [lineUsername, setLineUsername] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminName, setAdminName] = useState<string | null>(null);
  
  // メンテナンスモードの状態を取得
  const { isMaintenanceMode, isAdminBypass, config, refreshStatus } = useMaintenanceStatus();
  
  // 自動同期フックを使用
  useAutoSync();

  // 初期化
  useEffect(() => {
    // プライバシーポリシーの同意状態を確認
    const consentGiven = localStorage.getItem('privacyConsentGiven');
    setPrivacyConsentGiven(consentGiven === 'true');
    
    // LINEユーザー名を取得
    const savedUsername = localStorage.getItem('line-username');
    if (savedUsername) {
      setLineUsername(savedUsername);
    }
    
    // 管理者モードをチェック
    const counselorName = localStorage.getItem('current_counselor');
    if (counselorName) {
      setIsAdminMode(true);
      setAdminName(counselorName);
    }
  }, []);

  // プライバシー同意処理
  const handlePrivacyConsent = (accepted: boolean) => {
    if (accepted) {
      // 同意した場合
      const username = prompt('LINEのユーザー名を入力してください');
      if (username) {
        localStorage.setItem('line-username', username);
        localStorage.setItem('privacyConsentGiven', 'true');
        localStorage.setItem('privacyConsentDate', new Date().toISOString());
        setLineUsername(username);
        setPrivacyConsentGiven(true);
        
        // 同意履歴を記録
        const consentRecord = {
          id: Date.now().toString(),
          line_username: username,
          consent_given: true,
          consent_date: new Date().toISOString(),
          ip_address: 'unknown', // 実際の実装では取得可能
          user_agent: navigator.userAgent
        };
        
        // ローカルストレージに保存
        const existingHistories = localStorage.getItem('consent_histories');
        const histories = existingHistories ? JSON.parse(existingHistories) : [];
        histories.push(consentRecord);
        localStorage.setItem('consent_histories', JSON.stringify(histories));
      } else {
        alert('ユーザー名を入力してください。');
        setPrivacyConsentGiven(null);
      }
    } else {
      // 同意しなかった場合
      localStorage.setItem('privacyConsentGiven', 'false');
      setPrivacyConsentGiven(false);
    }
  };

  // 管理者ログイン処理
  const handleAdminLogin = () => {
    const password = prompt('カウンセラーパスワードを入力してください');
    if (password === 'counselor123') {
      const counselorName = prompt('カウンセラー名を入力してください');
      if (counselorName) {
        localStorage.setItem('current_counselor', counselorName);
        setIsAdminMode(true);
        setAdminName(counselorName);
        setShowLoginModal(false);
        alert(`${counselorName}としてログインしました。`);
        refreshStatus(); // メンテナンスモードの状態を更新
      }
    } else {
      alert('パスワードが正しくありません。');
    }
  };

  // 管理者ログアウト処理
  const handleAdminLogout = () => {
    if (window.confirm('カウンセラーアカウントからログアウトしますか？')) {
      localStorage.removeItem('current_counselor');
      setIsAdminMode(false);
      setAdminName(null);
      refreshStatus(); // メンテナンスモードの状態を更新
    }
  };

  // デバイス認証ログイン成功時の処理
  const handleDeviceAuthSuccess = (username: string) => {
    localStorage.setItem('line-username', username);
    setLineUsername(username);
    setShowLoginModal(false);
  };

  // デバイス認証登録完了時の処理
  const handleRegistrationComplete = (username: string) => {
    localStorage.setItem('line-username', username);
    setLineUsername(username);
    setShowRegistrationModal(false);
  };

  // メンテナンスモード中の場合
  if (isMaintenanceMode && !isAdminBypass) {
    return (
      <MaintenanceMode 
        config={config!} 
        onAdminLogin={handleAdminLogin}
        onRetry={refreshStatus}
      />
    );
  }

  // プライバシーポリシーの同意が必要な場合
  if (privacyConsentGiven === null || privacyConsentGiven === false) {
    return <PrivacyConsent onConsent={handlePrivacyConsent} />;
  }

  // デバイス認証モーダル
  if (showLoginModal) {
    return (
      <DeviceAuthLogin 
        onLoginSuccess={handleDeviceAuthSuccess}
        onRegister={() => {
          setShowLoginModal(false);
          setShowRegistrationModal(true);
        }}
        onBack={() => setShowLoginModal(false)}
      />
    );
  }

  // デバイス認証登録モーダル
  if (showRegistrationModal) {
    return (
      <DeviceAuthRegistration 
        onRegistrationComplete={handleRegistrationComplete}
        onBack={() => setShowRegistrationModal(false)}
      />
    );
  }

  return (
    <Router>
      <AppContent 
        showMenu={showMenu}
        setShowMenu={setShowMenu}
        lineUsername={lineUsername}
        isAdminMode={isAdminMode}
        adminName={adminName}
        onAdminLogin={handleAdminLogin}
        onAdminLogout={handleAdminLogout}
        isMaintenanceMode={isMaintenanceMode}
      />
    </Router>
  );
};

// アプリコンテンツコンポーネント（ルーティングを含む）
const AppContent: React.FC<{
  showMenu: boolean;
  setShowMenu: React.Dispatch<React.SetStateAction<boolean>>;
  lineUsername: string | null;
  isAdminMode: boolean;
  adminName: string | null;
  onAdminLogin: () => void;
  onAdminLogout: () => void;
  isMaintenanceMode: boolean;
}> = ({ 
  showMenu, 
  setShowMenu, 
  lineUsername, 
  isAdminMode, 
  adminName,
  onAdminLogin,
  onAdminLogout,
  isMaintenanceMode
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  // 現在のユーザー情報を取得
  const currentUser = getCurrentUser();

  // メニューを閉じる
  const closeMenu = () => {
    setShowMenu(false);
  };

  // ナビゲーション処理
  const handleNavigation = (path: string) => {
    navigate(path);
    closeMenu();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Heart className="h-8 w-8 text-pink-500" />
              <h1 className="ml-2 text-xl font-jp-bold text-gray-900">かんじょうにっき</h1>
            </div>
            <div className="flex items-center space-x-4">
              {lineUsername && (
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-jp-medium">
                  {lineUsername}さん
                </div>
              )}
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                {showMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* サイドメニュー */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-20 transition-opacity duration-300 ${
          showMenu ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMenu}
      ></div>
      <div
        className={`fixed top-0 right-0 w-64 h-full bg-white shadow-lg z-30 transform transition-transform duration-300 ${
          showMenu ? 'translate-x-0' : 'translate-x-full'
        } overflow-y-auto`}
      >
        <div className="p-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-jp-bold text-gray-900">メニュー</h2>
            <button
              onClick={closeMenu}
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="space-y-1">
            <div
              onClick={() => handleNavigation('/')}
              className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
            >
              <Home className="h-5 w-5 text-gray-500" />
              <span>TOP</span>
            </div>
            <div
              onClick={() => handleNavigation('/how-to')}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer ${
                location.pathname === '/how-to' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Book className="h-5 w-5 text-gray-500" />
              <span>使い方</span>
            </div>
            <div
              onClick={() => handleNavigation('/first-steps')}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer ${
                location.pathname === '/first-steps' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Play className="h-5 w-5 text-gray-500" />
              <span>最初にやること</span>
            </div>
            <div
              onClick={() => handleNavigation('/next-steps')}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer ${
                location.pathname === '/next-steps' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <ArrowRight className="h-5 w-5 text-gray-500" />
              <span>次にやること</span>
            </div>
            <div
              onClick={() => handleNavigation('/emotion-types')}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer ${
                location.pathname === '/emotion-types' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Heart className="h-5 w-5 text-gray-500" />
              <span>感情の種類</span>
            </div>
            <div
              onClick={() => handleNavigation('/support')}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer ${
                location.pathname === '/support' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Heart className="h-5 w-5 text-gray-500" />
              <span>サポートについて</span>
            </div>
            <div
              onClick={() => handleNavigation('/privacy-policy')}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer ${
                location.pathname === '/privacy-policy' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Heart className="h-5 w-5 text-gray-500" />
              <span>同意文</span>
            </div>
            <div
              onClick={() => handleNavigation('/diary')}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer ${
                location.pathname === '/diary' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Plus className="h-5 w-5 text-gray-500" />
              <span>日記</span>
            </div>
            <div
              onClick={() => handleNavigation('/diary-search')}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer ${
                location.pathname === '/diary-search' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Search className="h-5 w-5 text-gray-500" />
              <span>日記検索</span>
            </div>
            <div
              onClick={() => handleNavigation('/worthlessness-chart')}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer ${
                location.pathname === '/worthlessness-chart' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <TrendingUp className="h-5 w-5 text-gray-500" />
              <span>無価値感推移</span>
            </div>
            <div
              onClick={() => handleNavigation('/data-management')}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer ${
                location.pathname === '/data-management' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Database className="h-5 w-5 text-gray-500" />
              <span>データ管理</span>
            </div>
            
            {/* 管理者メニュー */}
            {isAdminMode && (
              <div
                onClick={() => handleNavigation('/admin')}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer ${
                  location.pathname === '/admin' ? 'bg-green-50 text-green-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Settings className="h-5 w-5 text-green-500" />
                <span>管理画面</span>
              </div>
            )}
          </nav>
          
          {/* 管理者ステータス */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            {isAdminMode ? (
              <div className="space-y-3">
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <div className="flex items-center space-x-2 text-green-800 text-sm">
                    <Settings className="w-4 h-4" />
                    <span className="font-jp-medium">{adminName}</span>
                  </div>
                  <p className="text-xs text-green-700 mt-1">管理者モードで動作中</p>
                </div>
                <button
                  onClick={onAdminLogout}
                  className="w-full bg-red-100 hover:bg-red-200 text-red-800 px-3 py-2 rounded-lg text-sm font-jp-medium transition-colors"
                >
                  ログアウト
                </button>
              </div>
            ) : (
              <button
                onClick={onAdminLogin}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-lg text-sm font-jp-medium transition-colors"
              >
                カウンセラーログイン
              </button>
            )}
          </div>
          
          {/* メンテナンスモード表示 */}
          {isMaintenanceMode && (
            <div className="mt-4 bg-red-50 rounded-lg p-3 border border-red-200">
              <div className="flex items-center space-x-2 text-red-800 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-jp-medium">メンテナンスモード中</span>
              </div>
              {isAdminBypass && (
                <p className="text-xs text-red-700 mt-1">管理者アクセス中</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<HowTo />} />
          <Route path="/how-to" element={<HowTo />} />
          <Route path="/first-steps" element={<FirstSteps />} />
          <Route path="/next-steps" element={<NextSteps />} />
          <Route path="/emotion-types" element={<EmotionTypes />} />
          <Route path="/support" element={<Support />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/diary" element={<DiaryPage />} />
          <Route path="/diary-search" element={<DiarySearchPage />} />
          <Route path="/worthlessness-chart" element={
            <div className="p-4">
              <Chat />
            </div>
          } />
          <Route path="/data-management" element={
            <div className="p-4">
              {currentUser ? <DataBackupRecovery /> : <UserDataManagement />}
            </div>
          } />
          <Route path="/admin" element={isAdminMode ? <AdminPanel /> : <div>アクセス権限がありません</div>} />
        </Routes>
      </main>
    </div>
  );
};

export default App;