import React, { useState, useEffect } from 'react';
import { Menu, X, Home, BookOpen, Search, BarChart2, MessageCircle, Settings, User, LogIn, Shield } from 'lucide-react';
import DiaryPage from './pages/DiaryPage';
import DiarySearchPage from './pages/DiarySearchPage';
import HowTo from './pages/HowTo';
import EmotionTypes from './pages/EmotionTypes';
import FirstSteps from './pages/FirstSteps';
import NextSteps from './pages/NextSteps';
import Support from './pages/Support';
import PrivacyPolicy from './pages/PrivacyPolicy';
import PrivacyConsent from './components/PrivacyConsent';
import MaintenanceMode from './components/MaintenanceMode';
import AdminPanel from './components/AdminPanel';
import Chat from './components/Chat';
import DataMigration from './components/DataMigration';
import UserDataManagement from './components/UserDataManagement';
import DeviceAuthLogin from './components/DeviceAuthLogin';
import DeviceAuthRegistration from './components/DeviceAuthRegistration';
import { useMaintenanceStatus } from './hooks/useMaintenanceStatus';
import { useSupabase } from './hooks/useSupabase';
import { useAutoSync } from './hooks/useAutoSync';
import { isAuthenticated, getCurrentUser, logoutUser } from './lib/deviceAuth';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<string>('diary');
  const [showMenu, setShowMenu] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [lineUsername, setLineUsername] = useState<string | null>(null);
  const [privacyConsentGiven, setPrivacyConsentGiven] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDeviceAuthenticated, setIsDeviceAuthenticated] = useState(false);
  
  // メンテナンスモードの状態を取得
  const { isMaintenanceMode, isAdminBypass, config, refreshStatus } = useMaintenanceStatus();
  
  // Supabase接続状態を取得
  const { isConnected, currentUser, loading: supabaseLoading } = useSupabase();
  
  // 自動同期フックを使用
  const autoSync = useAutoSync();

  // 初期化
  useEffect(() => {
    // ローカルストレージからプライバシー同意状態を取得
    const consentGiven = localStorage.getItem('privacyConsentGiven');
    if (consentGiven === 'true') {
      setPrivacyConsentGiven(true);
    }

    // ローカルストレージからLINEユーザー名を取得
    const savedUsername = localStorage.getItem('line-username');
    if (savedUsername) {
      setLineUsername(savedUsername);
    }

    // 管理者かどうかをチェック
    const counselorName = localStorage.getItem('current_counselor');
    if (counselorName) {
      setIsAdmin(true);
    }
    
    // デバイス認証状態をチェック
    setIsDeviceAuthenticated(isAuthenticated());
    
    // URLからページを設定
    const path = window.location.hash.substring(1);
    if (path) {
      setActivePage(path);
    }
    
    // ハッシュ変更イベントリスナーを追加
    const handleHashChange = () => {
      const newPath = window.location.hash.substring(1);
      if (newPath) {
        setActivePage(newPath);
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // ページ変更時にURLハッシュを更新
  useEffect(() => {
    window.location.hash = activePage;
  }, [activePage]);

  // プライバシーポリシー同意処理
  const handlePrivacyConsent = (accepted: boolean) => {
    if (accepted) {
      localStorage.setItem('privacyConsentGiven', 'true');
      localStorage.setItem('privacyConsentDate', new Date().toISOString());
      setPrivacyConsentGiven(true);
      
      // 同意履歴を記録
      const consentRecord = {
        id: Date.now().toString(),
        line_username: lineUsername || 'unknown_user',
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
      // 同意しない場合の処理
      alert('プライバシーポリシーに同意いただけない場合、サービスをご利用いただけません。');
    }
  };

  // ユーザー名設定処理
  const handleSetUsername = (username: string) => {
    localStorage.setItem('line-username', username);
    setLineUsername(username);
  };

  // ログイン処理
  const handleLogin = (username: string) => {
    setLineUsername(username);
    setShowLoginModal(false);
  };

  // ログアウト処理
  const handleLogout = () => {
    if (window.confirm('ログアウトしますか？')) {
      logoutUser();
      setIsDeviceAuthenticated(false);
      window.location.reload();
    }
  };

  // 管理者ログイン処理
  const handleAdminLogin = () => {
    const password = prompt('カウンセラーパスワードを入力してください');
    if (password === 'counselor123') {
      const counselorName = prompt('カウンセラー名を入力してください', '心理カウンセラー');
      if (counselorName) {
        localStorage.setItem('current_counselor', counselorName);
        setIsAdmin(true);
        alert(`${counselorName}としてログインしました。`);
        setActivePage('admin');
      }
    } else {
      alert('パスワードが正しくありません。');
    }
  };

  // 管理者ログアウト処理
  const handleAdminLogout = () => {
    if (window.confirm('カウンセラーアカウントからログアウトしますか？')) {
      localStorage.removeItem('current_counselor');
      setIsAdmin(false);
      setActivePage('diary');
      window.location.reload();
    }
  };

  // メンテナンスモードのリトライ処理
  const handleRetryMaintenance = () => {
    refreshStatus();
  };

  // メニュー項目
  const menuItems = [
    { id: 'diary', label: 'TOP', icon: Home },
    { id: 'search', label: '検索', icon: Search },
    { id: 'howto', label: '使い方', icon: BookOpen },
    { id: 'emotion-types', label: '感情の種類', icon: BarChart2 },
    { id: 'first-steps', label: '最初にやること', icon: BookOpen },
    { id: 'next-steps', label: '次にやること', icon: BookOpen },
    { id: 'support', label: 'サポート', icon: MessageCircle },
    { id: 'privacy', label: 'プライバシー', icon: Shield },
    { id: 'data-management', label: 'データ管理', icon: Settings },
  ];

  // 管理者メニュー項目
  const adminMenuItems = [
    { id: 'admin', label: '管理画面', icon: Settings },
    { id: 'data-migration', label: 'データ同期', icon: Settings },
  ];

  // メンテナンスモードの場合
  if (isMaintenanceMode && !isAdminBypass) {
    return (
      <MaintenanceMode 
        config={config!} 
        onAdminLogin={handleAdminLogin}
        onRetry={handleRetryMaintenance}
      />
    );
  }

  // プライバシーポリシー同意前の場合
  if (!privacyConsentGiven) {
    return <PrivacyConsent onConsent={handlePrivacyConsent} />;
  }

  // デバイス認証モーダル
  if (showLoginModal) {
    return (
      <DeviceAuthLogin 
        onLoginSuccess={handleLogin}
        onRegister={() => {
          setShowLoginModal(false);
          setShowRegistrationModal(true);
        }}
        onBack={() => setShowLoginModal(false)}
      />
    );
  }

  // デバイス登録モーダル
  if (showRegistrationModal) {
    return (
      <DeviceAuthRegistration 
        onRegistrationComplete={handleLogin}
        onBack={() => setShowRegistrationModal(false)}
      />
    );
  }

  // メインアプリ
  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="mr-2 text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-xl font-jp-bold text-gray-900">かんじょうにっき</h1>
            </div>
            <div className="flex items-center space-x-4">
              {isAdmin ? (
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-jp-medium text-green-600">{localStorage.getItem('current_counselor')}</span>
                  <button
                    onClick={handleAdminLogout}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    ログアウト
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  {lineUsername && (
                    <span className="text-sm font-jp-medium text-gray-600">{lineUsername}</span>
                  )}
                  {isDeviceAuthenticated ? (
                    <button
                      onClick={handleLogout}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      ログアウト
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowLoginModal(true)}
                      className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>ログイン</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* サイドメニュー */}
      {showMenu && (
        <div className="fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setShowMenu(false)}
          ></div>
          <div className="relative bg-white w-64 max-w-xs h-full shadow-xl flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-jp-bold text-gray-900">メニュー</h2>
              <button
                onClick={() => setShowMenu(false)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
              <nav className="space-y-1 px-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActivePage(item.id);
                        setShowMenu(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-jp-medium ${
                        activePage === item.id
                          ? 'bg-blue-100 text-blue-900'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* 管理者メニュー */}
              {isAdmin && (
                <>
                  <div className="border-t border-gray-200 my-4"></div>
                  <div className="px-3 py-2">
                    <h3 className="text-xs font-jp-medium text-gray-500 uppercase tracking-wider">
                      管理者メニュー
                    </h3>
                  </div>
                  <nav className="space-y-1 px-2">
                    {adminMenuItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActivePage(item.id);
                            setShowMenu(false);
                          }}
                          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-jp-medium ${
                            activePage === item.id
                              ? 'bg-green-100 text-green-900'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                </>
              )}

              {/* カウンセラーログインボタン */}
              {!isAdmin && (
                <div className="mt-4 px-2">
                  <button
                    onClick={handleAdminLogin}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-jp-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <User className="w-4 h-4" />
                    <span>カウンセラーログイン</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* メンテナンスモード表示 */}
      {isMaintenanceMode && isAdminBypass && (
        <div className="bg-red-100 border-b border-red-200 text-red-800 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-jp-medium">メンテナンスモード中（管理者アクセス）</span>
            </div>
            <button
              onClick={refreshStatus}
              className="text-xs text-red-700 hover:text-red-900 underline"
            >
              更新
            </button>
          </div>
        </div>
      )}

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {activePage === 'diary' && <DiaryPage />}
        {activePage === 'search' && <DiarySearchPage />}
        {activePage === 'howto' && <HowTo />}
        {activePage === 'emotion-types' && <EmotionTypes />}
        {activePage === 'first-steps' && <FirstSteps />}
        {activePage === 'next-steps' && <NextSteps />}
        {activePage === 'support' && <Support />}
        {activePage === 'privacy' && <PrivacyPolicy />}
        {activePage === 'admin' && isAdmin && <AdminPanel />}
        {activePage === 'data-migration' && <DataMigration />}
        {activePage === 'chat' && <Chat />}
        {activePage === 'data-management' && <UserDataManagement />}
      </main>

      {/* フッター */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <p className="text-xs text-gray-500 mb-2 sm:mb-0">
              © 2025 一般社団法人NAMIDAサポート協会
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setActivePage('privacy')}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                プライバシーポリシー
              </button>
              <button
                onClick={() => setActivePage('support')}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                サポート
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;