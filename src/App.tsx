import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Heart, Search, BookOpen, HelpCircle, Settings, User, Home } from 'lucide-react';
import { useSupabase } from './hooks/useSupabase';
import { useMaintenanceStatus } from './hooks/useMaintenanceStatus';
import { useAutoSync } from './hooks/useAutoSync';
import { getCurrentUser } from './lib/deviceAuth';

// ページコンポーネント
import DiaryPage from './pages/DiaryPage';
import DiarySearchPage from './pages/DiarySearchPage';
import EmotionTypes from './pages/EmotionTypes';
import HowTo from './pages/HowTo';
import NextSteps from './pages/NextSteps';
import FirstSteps from './pages/FirstSteps';
import Support from './pages/Support';
import PrivacyPolicy from './pages/PrivacyPolicy';
import WelcomePage from './pages/WelcomePage';

// コンポーネント
import PrivacyConsent from './components/PrivacyConsent';
import MaintenanceMode from './components/MaintenanceMode';
import AdminPanel from './components/AdminPanel';
import Chat from './components/Chat';
import DataMigration from './components/DataMigration';
import DeviceAuthLogin from './components/DeviceAuthLogin';
import DeviceAuthRegistration from './components/DeviceAuthRegistration';
import UserDataManagement from './components/UserDataManagement';

function App() {
  const [privacyConsentGiven, setPrivacyConsentGiven] = useState<boolean | null>(null);
  const [lineUsername, setLineUsername] = useState<string | null>(null);
  const [showDeviceAuth, setShowDeviceAuth] = useState(false);
  const [deviceAuthMode, setDeviceAuthMode] = useState<'login' | 'register'>('login');
  const [isCounselor, setIsCounselor] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  
  const { isMaintenanceMode, config, refreshStatus, isAdminBypass } = useMaintenanceStatus();
  const { isConnected, error, retryConnection, currentUser } = useSupabase();
  
  // 自動同期フックを初期化
  useAutoSync();

  // 初期化時にプライバシー同意状態とLINEユーザー名を取得
  useEffect(() => {
    const consentGiven = localStorage.getItem('privacyConsentGiven') === 'true';
    setPrivacyConsentGiven(consentGiven);
    
    const savedUsername = localStorage.getItem('line-username');
    if (savedUsername) {
      setLineUsername(savedUsername);
    }
    
    // カウンセラーとしてログインしているかチェック
    const counselorName = localStorage.getItem('current_counselor');
    if (counselorName) {
      setIsCounselor(true);
    }
  }, []);

  // プライバシーポリシーの同意処理
  const handlePrivacyConsent = (accepted: boolean) => {
    if (accepted) {
      localStorage.setItem('privacyConsentGiven', 'true');
      localStorage.setItem('privacyConsentDate', new Date().toISOString());
      setPrivacyConsentGiven(true);
      
      // デバイス認証画面を表示
      setShowDeviceAuth(true);
      setDeviceAuthMode('register');
    } else {
      localStorage.setItem('privacyConsentGiven', 'false');
      setPrivacyConsentGiven(false);
      // 同意しない場合はウェルカムページに戻る
      window.location.href = '/';
    }
  };

  // デバイス認証完了時の処理
  const handleDeviceAuthComplete = (username: string) => {
    setLineUsername(username);
    localStorage.setItem('line-username', username);
    setShowDeviceAuth(false);
  };

  // カウンセラーログイン処理
  const handleCounselorLogin = () => {
    const password = prompt('カウンセラーパスワードを入力してください');
    if (password === 'counselor123') {
      const counselorName = prompt('カウンセラー名を入力してください', '心理カウンセラー');
      if (counselorName) {
        localStorage.setItem('current_counselor', counselorName);
        setIsCounselor(true);
        alert(`${counselorName}としてログインしました`);
        window.location.reload();
      }
    } else {
      alert('パスワードが正しくありません');
    }
  };

  // カウンセラーログアウト処理
  const handleCounselorLogout = () => {
    if (window.confirm('カウンセラーアカウントからログアウトしますか？')) {
      localStorage.removeItem('current_counselor');
      setIsCounselor(false);
      alert('ログアウトしました');
      window.location.reload();
    }
  };

  // メンテナンスモード中の場合
  if (isMaintenanceMode && !isAdminBypass) {
    return (
      <MaintenanceMode 
        config={config!} 
        onAdminLogin={() => refreshStatus()} 
        onRetry={() => refreshStatus()}
      />
    );
  }

  // プライバシー同意が必要な場合
  if (privacyConsentGiven === false || privacyConsentGiven === null) {
    return <PrivacyConsent onConsent={handlePrivacyConsent} />;
  }

  // デバイス認証が必要な場合
  if (showDeviceAuth) {
    if (deviceAuthMode === 'login') {
      return (
        <DeviceAuthLogin
          onLoginSuccess={handleDeviceAuthComplete}
          onRegister={() => setDeviceAuthMode('register')}
          onBack={() => setShowDeviceAuth(false)}
        />
      );
    } else {
      return (
        <DeviceAuthRegistration
          onRegistrationComplete={handleDeviceAuthComplete}
          onBack={() => setShowDeviceAuth(false)}
        />
      );
    }
  }

  // メインアプリ
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        {/* ヘッダー */}
        <header className="bg-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link to="/" className="flex items-center space-x-2" onClick={() => setActiveTab('home')}>
                  <Heart className="h-8 w-8 text-pink-500" />
                  <span className="text-xl font-jp-bold text-gray-900">かんじょうにっき</span>
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                {lineUsername && (
                  <div className="text-sm text-gray-600 font-jp-normal hidden sm:block">
                    {lineUsername}さん
                  </div>
                )}
                {isCounselor ? (
                  <button
                    onClick={handleCounselorLogout}
                    className="text-red-600 hover:text-red-800 text-sm font-jp-medium"
                  >
                    カウンセラーログアウト
                  </button>
                ) : (
                  <button
                    onClick={handleCounselorLogin}
                    className="text-blue-600 hover:text-blue-800 text-sm font-jp-medium"
                  >
                    カウンセラーログイン
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* メインコンテンツ */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Routes>
            <Route path="/" element={<WelcomePage />} />
            <Route path="/diary" element={<DiaryPage />} />
            <Route path="/search" element={<DiarySearchPage />} />
            <Route path="/emotions" element={<EmotionTypes />} />
            <Route path="/howto" element={<HowTo />} />
            <Route path="/nextsteps" element={<NextSteps />} />
            <Route path="/firststeps" element={<FirstSteps />} />
            <Route path="/support" element={<Support />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/admin" element={isCounselor ? <AdminPanel /> : <Navigate to="/" />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/data" element={<DataMigration />} />
            <Route path="/user-data" element={<UserDataManagement />} />
          </Routes>
        </main>

        {/* フッターナビゲーション */}
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between py-3">
              <Link
                to="/"
                className={`flex flex-col items-center space-y-1 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'home' ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
                }`}
                onClick={() => setActiveTab('home')}
              >
                <Home className="h-6 w-6" />
                <span className="text-xs font-jp-medium">ホーム</span>
              </Link>
              <Link
                to="/diary"
                className={`flex flex-col items-center space-y-1 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'diary' ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
                }`}
                onClick={() => setActiveTab('diary')}
              >
                <Heart className="h-6 w-6" />
                <span className="text-xs font-jp-medium">日記</span>
              </Link>
              <Link
                to="/search"
                className={`flex flex-col items-center space-y-1 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'search' ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
                }`}
                onClick={() => setActiveTab('search')}
              >
                <Search className="h-6 w-6" />
                <span className="text-xs font-jp-medium">検索</span>
              </Link>
              <Link
                to="/emotions"
                className={`flex flex-col items-center space-y-1 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'emotions' ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
                }`}
                onClick={() => setActiveTab('emotions')}
              >
                <BookOpen className="h-6 w-6" />
                <span className="text-xs font-jp-medium">感情</span>
              </Link>
              <Link
                to={isCounselor ? "/admin" : "/support"}
                className={`flex flex-col items-center space-y-1 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'support' ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
                }`}
                onClick={() => setActiveTab('support')}
              >
                {isCounselor ? (
                  <>
                    <Settings className="h-6 w-6" />
                    <span className="text-xs font-jp-medium">管理</span>
                  </>
                ) : (
                  <>
                    <HelpCircle className="h-6 w-6" />
                    <span className="text-xs font-jp-medium">サポート</span>
                  </>
                )}
              </Link>
            </div>
          </div>
        </footer>

        {/* メンテナンスモードバッジ（管理者アクセス時） */}
        {isMaintenanceMode && isAdminBypass && (
          <div className="fixed top-4 right-4 bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-jp-medium border border-red-200 shadow-sm">
            メンテナンスモード中（管理者アクセス）
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;