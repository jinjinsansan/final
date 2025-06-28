import React, { useState, useEffect } from 'react';
import { Heart, Search, BookOpen, HelpCircle, Settings, User } from 'lucide-react';
import { useMaintenanceStatus } from './hooks/useMaintenanceStatus';
import { useSupabase } from './hooks/useSupabase';
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

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showDataMigration, setShowDataMigration] = useState(false);
  const [showUserDataManagement, setShowUserDataManagement] = useState(false);
  const [lineUsername, setLineUsername] = useState<string | null>(null);
  const [privacyConsentGiven, setPrivacyConsentGiven] = useState<boolean>(false);
  const [isDeviceAuthMode, setIsDeviceAuthMode] = useState(false);
  const [isDeviceRegistered, setIsDeviceRegistered] = useState(false);
  
  // メンテナンスモードの状態を取得
  const { isMaintenanceMode, config, isAdminBypass, refreshStatus } = useMaintenanceStatus();
  
  // Supabase接続状態を取得
  const { isConnected, error: supabaseError, retryConnection } = useSupabase();
  
  // 自動同期フックを使用
  useAutoSync();

  // 初期化
  useEffect(() => {
    // ローカルストレージからプライバシーポリシー同意状態を取得
    const consentGiven = localStorage.getItem('privacyConsentGiven');
    if (consentGiven === 'true') {
      setPrivacyConsentGiven(true);
    }
    
    // ローカルストレージからLINEユーザー名を取得
    const savedUsername = localStorage.getItem('line-username');
    if (savedUsername) {
      setLineUsername(savedUsername);
    }
    
    // デバイス認証モードかどうかをチェック
    const deviceAuthEnabled = localStorage.getItem('device_auth_enabled') === 'true';
    setIsDeviceAuthMode(deviceAuthEnabled);
    
    // デバイスが登録済みかどうかをチェック
    const user = getCurrentUser();
    setIsDeviceRegistered(!!user);
    
    // カウンセラーとしてログインしているかチェック
    const counselorName = localStorage.getItem('current_counselor');
    if (counselorName) {
      console.log('カウンセラーとしてログイン中:', counselorName);
    }
  }, []);

  // プライバシーポリシー同意処理
  const handlePrivacyConsent = (accepted: boolean) => {
    if (accepted) {
      localStorage.setItem('privacyConsentGiven', 'true');
      localStorage.setItem('privacyConsentDate', new Date().toISOString());
      setPrivacyConsentGiven(true);
      
      // ユーザー名が設定されていない場合は仮のユーザー名を設定
      if (!lineUsername) {
        const tempUsername = `user_${Date.now()}`;
        localStorage.setItem('line-username', tempUsername);
        setLineUsername(tempUsername);
      }
    } else {
      // 同意しなかった場合の処理
      alert('プライバシーポリシーに同意いただけない場合、サービスをご利用いただけません。');
    }
  };

  // カウンセラーログイン処理
  const handleCounselorLogin = () => {
    const password = prompt('カウンセラーパスワードを入力してください');
    if (password === 'counselor123') {
      const counselorName = prompt('カウンセラー名を入力してください', '心理カウンセラー');
      if (counselorName) {
        localStorage.setItem('current_counselor', counselorName);
        setShowAdminPanel(true);
        setActiveTab('admin');
        alert(`${counselorName}としてログインしました。`);
        
        // メンテナンスモードの状態を更新
        refreshStatus();
      }
    } else {
      alert('パスワードが正しくありません');
    }
  };

  // デバイス認証ログイン成功時の処理
  const handleDeviceAuthSuccess = (username: string) => {
    localStorage.setItem('line-username', username);
    setLineUsername(username);
    setIsDeviceRegistered(true);
    setActiveTab('diary');
  };

  // メンテナンスモードが有効で管理者バイパスがない場合
  if (isMaintenanceMode && !isAdminBypass) {
    return (
      <MaintenanceMode 
        config={config!} 
        onAdminLogin={handleCounselorLogin}
        onRetry={refreshStatus}
      />
    );
  }

  // プライバシーポリシーに同意していない場合
  if (!privacyConsentGiven) {
    return <PrivacyConsent onConsent={handlePrivacyConsent} />;
  }

  // デバイス認証モードが有効で、デバイスが登録されていない場合
  if (isDeviceAuthMode && !isDeviceRegistered) {
    return (
      <DeviceAuthRegistration 
        onRegistrationComplete={handleDeviceAuthSuccess}
        onBack={() => setIsDeviceAuthMode(false)}
      />
    );
  }

  // デバイス認証モードが有効で、デバイスが登録済みの場合
  if (isDeviceAuthMode && !getCurrentUser()) {
    return (
      <DeviceAuthLogin 
        onLoginSuccess={handleDeviceAuthSuccess}
        onRegister={() => setIsDeviceRegistered(false)}
        onBack={() => setIsDeviceAuthMode(false)}
      />
    );
  }

  // メインコンテンツの表示
  return (
    <div className="min-h-screen bg-gray-100">
      {/* メンテナンスモード表示（管理者バイパス時） */}
      {isMaintenanceMode && isAdminBypass && (
        <div className="bg-red-100 p-2 text-center">
          <div className="flex items-center justify-center space-x-2 text-red-800 text-sm font-jp-medium">
            <span>⚠️ メンテナンスモード中（管理者アクセス）</span>
          </div>
        </div>
      )}
      
      {/* ヘッダー */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Heart className="h-8 w-8 text-pink-500" />
                <span className="ml-2 text-xl font-jp-bold text-gray-900">かんじょうにっき</span>
              </div>
            </div>
            <div className="flex items-center">
              {lineUsername && (
                <span className="text-sm text-gray-600 mr-4">
                  {lineUsername}さん
                </span>
              )}
              <div className="relative">
                <button
                  onClick={() => {
                    const menu = document.getElementById('user-menu');
                    if (menu) {
                      menu.classList.toggle('hidden');
                    }
                  }}
                  className="p-2 rounded-full text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  <User className="h-6 w-6" />
                </button>
                <div
                  id="user-menu"
                  className="hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10"
                >
                  <button
                    onClick={() => {
                      setShowAdminPanel(false);
                      setShowChat(false);
                      setShowDataMigration(true);
                      setShowUserDataManagement(false);
                      setActiveTab('data');
                      document.getElementById('user-menu')?.classList.add('hidden');
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    データ管理
                  </button>
                  <button
                    onClick={() => {
                      setShowAdminPanel(false);
                      setShowChat(true);
                      setShowDataMigration(false);
                      setShowUserDataManagement(false);
                      setActiveTab('chat');
                      document.getElementById('user-menu')?.classList.add('hidden');
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    カウンセラーチャット
                  </button>
                  <button
                    onClick={() => {
                      setShowAdminPanel(false);
                      setShowChat(false);
                      setShowDataMigration(false);
                      setShowUserDataManagement(true);
                      setActiveTab('user-data');
                      document.getElementById('user-menu')?.classList.add('hidden');
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    バックアップ・復元
                  </button>
                  <button
                    onClick={handleCounselorLogin}
                    className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-gray-100"
                  >
                    カウンセラーログイン
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {showAdminPanel ? (
          <AdminPanel />
        ) : showChat ? (
          <Chat />
        ) : showDataMigration ? (
          <DataMigration />
        ) : showUserDataManagement ? (
          <UserDataManagement />
        ) : (
          <div className="px-4 py-6 sm:px-0">
            {activeTab === 'home' && <WelcomePage />}
            {activeTab === 'diary' && <DiaryPage />}
            {activeTab === 'search' && <DiarySearchPage />}
            {activeTab === 'emotions' && <EmotionTypes />}
            {activeTab === 'howto' && <HowTo />}
            {activeTab === 'nextsteps' && <NextSteps />}
            {activeTab === 'firststeps' && <FirstSteps />}
            {activeTab === 'support' && <Support />}
            {activeTab === 'privacy' && <PrivacyPolicy />}
          </div>
        )}
      </main>

      {/* フッターナビゲーション */}
      <footer className="bg-white shadow-md fixed bottom-0 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <button
              onClick={() => {
                setShowAdminPanel(false);
                setShowChat(false);
                setShowDataMigration(false);
                setShowUserDataManagement(false);
                setActiveTab('home');
              }}
              className={`flex flex-col items-center justify-center w-1/5 ${
                activeTab === 'home' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Heart className="h-6 w-6" />
              <span className="text-xs mt-1">ホーム</span>
            </button>
            <button
              onClick={() => {
                setShowAdminPanel(false);
                setShowChat(false);
                setShowDataMigration(false);
                setShowUserDataManagement(false);
                setActiveTab('diary');
              }}
              className={`flex flex-col items-center justify-center w-1/5 ${
                activeTab === 'diary' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <BookOpen className="h-6 w-6" />
              <span className="text-xs mt-1">日記</span>
            </button>
            <button
              onClick={() => {
                setShowAdminPanel(false);
                setShowChat(false);
                setShowDataMigration(false);
                setShowUserDataManagement(false);
                setActiveTab('search');
              }}
              className={`flex flex-col items-center justify-center w-1/5 ${
                activeTab === 'search' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Search className="h-6 w-6" />
              <span className="text-xs mt-1">検索</span>
            </button>
            <button
              onClick={() => {
                setShowAdminPanel(false);
                setShowChat(false);
                setShowDataMigration(false);
                setShowUserDataManagement(false);
                setActiveTab('emotions');
              }}
              className={`flex flex-col items-center justify-center w-1/5 ${
                activeTab === 'emotions' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <HelpCircle className="h-6 w-6" />
              <span className="text-xs mt-1">感情</span>
            </button>
            <button
              onClick={() => {
                setShowAdminPanel(false);
                setShowChat(false);
                setShowDataMigration(false);
                setShowUserDataManagement(false);
                setActiveTab('support');
              }}
              className={`flex flex-col items-center justify-center w-1/5 ${
                activeTab === 'support' || activeTab === 'howto' || activeTab === 'nextsteps' || activeTab === 'firststeps' || activeTab === 'privacy'
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Settings className="h-6 w-6" />
              <span className="text-xs mt-1">サポート</span>
            </button>
          </div>
        </div>
      </footer>

      {/* サポートメニュー（サポートタブがアクティブな場合のみ表示） */}
      {(activeTab === 'support' || activeTab === 'howto' || activeTab === 'nextsteps' || activeTab === 'firststeps' || activeTab === 'privacy') && (
        <div className="fixed bottom-16 left-0 right-0 bg-white shadow-md border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-2">
            <div className="flex overflow-x-auto space-x-4 pb-2">
              <button
                onClick={() => setActiveTab('support')}
                className={`px-3 py-1 text-sm rounded-full whitespace-nowrap ${
                  activeTab === 'support'
                    ? 'bg-blue-100 text-blue-800 font-jp-medium'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                サポート付き
              </button>
              <button
                onClick={() => setActiveTab('howto')}
                className={`px-3 py-1 text-sm rounded-full whitespace-nowrap ${
                  activeTab === 'howto'
                    ? 'bg-blue-100 text-blue-800 font-jp-medium'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                使い方
              </button>
              <button
                onClick={() => setActiveTab('firststeps')}
                className={`px-3 py-1 text-sm rounded-full whitespace-nowrap ${
                  activeTab === 'firststeps'
                    ? 'bg-blue-100 text-blue-800 font-jp-medium'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                最初にやること
              </button>
              <button
                onClick={() => setActiveTab('nextsteps')}
                className={`px-3 py-1 text-sm rounded-full whitespace-nowrap ${
                  activeTab === 'nextsteps'
                    ? 'bg-blue-100 text-blue-800 font-jp-medium'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                次にやること
              </button>
              <button
                onClick={() => setActiveTab('privacy')}
                className={`px-3 py-1 text-sm rounded-full whitespace-nowrap ${
                  activeTab === 'privacy'
                    ? 'bg-blue-100 text-blue-800 font-jp-medium'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                プライバシー
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 接続エラー表示 */}
      {supabaseError && (
        <div className="fixed bottom-20 right-4 bg-red-100 border border-red-200 rounded-lg p-3 shadow-lg max-w-xs">
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5"></div>
            <div>
              <p className="text-red-800 font-jp-medium text-sm">接続エラー</p>
              <p className="text-red-700 text-xs mt-1">{supabaseError}</p>
              <button
                onClick={retryConnection}
                className="text-xs text-blue-600 hover:text-blue-800 mt-2 underline"
              >
                再接続する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;