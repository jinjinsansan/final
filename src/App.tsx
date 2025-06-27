import React, { useState, useEffect } from 'react';
import { Shield, User, Settings, Search, Calendar, Info, HelpCircle, MessageCircle } from 'lucide-react';
import DiaryPage from './pages/DiaryPage';
import DiarySearchPage from './pages/DiarySearchPage';
import EmotionTypes from './pages/EmotionTypes';
import HowTo from './pages/HowTo';
import FirstSteps from './pages/FirstSteps';
import NextSteps from './pages/NextSteps';
import Support from './pages/Support';
import PrivacyConsent from './components/PrivacyConsent';
import PrivacyPolicy from './pages/PrivacyPolicy';
import AdminPanel from './components/AdminPanel';
import MaintenanceMode from './components/MaintenanceMode';
import { useMaintenanceStatus } from './hooks/useMaintenanceStatus';
import { useAutoSync } from './hooks/useAutoSync';
import DataMigration from './components/DataMigration';
import UserDataManagement from './components/UserDataManagement';
import DataBackupRecovery from './components/DataBackupRecovery';
import DeviceAuthLogin from './components/DeviceAuthLogin';
import DeviceAuthRegistration from './components/DeviceAuthRegistration';
import { isAuthenticated, getCurrentUser, logoutUser } from './lib/deviceAuth';
import Chat from './components/Chat';

function App() {
  const [activeTab, setActiveTab] = useState<string>('diary');
  const [privacyConsentGiven, setPrivacyConsentGiven] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [showDataManagement, setShowDataManagement] = useState(false);
  const [showDeviceAuth, setShowDeviceAuth] = useState(false);
  const [deviceAuthMode, setDeviceAuthMode] = useState<'login' | 'register'>('login');
  const [isDeviceAuthenticated, setIsDeviceAuthenticated] = useState(false);
  
  // メンテナンスモードの状態を取得
  const { isMaintenanceMode, isAdminBypass, config, refreshStatus } = useMaintenanceStatus();
  
  // 自動同期フックを使用
  useAutoSync();

  // プライバシーポリシーの同意状態を確認
  useEffect(() => {
    const consentGiven = localStorage.getItem('privacyConsentGiven');
    if (consentGiven === 'true') {
      setPrivacyConsentGiven(true);
    } else {
      setPrivacyConsentGiven(false);
    }
    
    // 管理者ログイン状態を確認
    const currentCounselor = localStorage.getItem('current_counselor');
    if (currentCounselor) {
      setIsAdmin(true);
    }
    
    // デバイス認証状態を確認
    setIsDeviceAuthenticated(isAuthenticated());
  }, []);

  // プライバシーポリシーの同意処理
  const handlePrivacyConsent = (accepted: boolean) => {
    if (accepted) {
      localStorage.setItem('privacyConsentGiven', 'true');
      localStorage.setItem('privacyConsentDate', new Date().toISOString());
      setPrivacyConsentGiven(true);
    } else {
      localStorage.setItem('privacyConsentGiven', 'false');
      setPrivacyConsentGiven(false);
    }
  };

  // 管理者ログイン処理
  const handleAdminLogin = () => {
    if (adminPassword === 'counselor123') {
      localStorage.setItem('current_counselor', '管理者');
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminPassword('');
      setAdminLoginError('');
    } else {
      setAdminLoginError('パスワードが正しくありません');
    }
  };

  // 管理者ログアウト処理
  const handleAdminLogout = () => {
    localStorage.removeItem('current_counselor');
    setIsAdmin(false);
  };

  // デバイス認証完了処理
  const handleDeviceAuthComplete = (lineUsername: string) => {
    localStorage.setItem('line-username', lineUsername);
    setIsDeviceAuthenticated(true);
    setShowDeviceAuth(false);
  };

  // メンテナンスモード中かつ管理者でない場合はメンテナンス画面を表示
  if (isMaintenanceMode && !isAdminBypass) {
    return (
      <MaintenanceMode 
        config={config!} 
        onAdminLogin={() => setShowAdminLogin(true)}
        onRetry={refreshStatus}
      />
    );
  }

  // プライバシーポリシーの同意が必要な場合
  if (privacyConsentGiven === false) {
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
          onBack={() => setDeviceAuthMode('login')}
        />
      );
    }
  }

  // 管理者ログイン画面
  if (showAdminLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-jp-bold text-gray-900 mb-2">
              カウンセラーログイン
            </h1>
            <p className="text-gray-600 font-jp-normal">
              カウンセラー専用の管理画面にアクセスします
            </p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleAdminLogin(); }} className="space-y-6">
            <div>
              <label className="block text-sm font-jp-medium text-gray-700 mb-2">
                パスワード
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-jp-normal"
                placeholder="カウンセラーパスワードを入力"
              />
              {adminLoginError && (
                <p className="mt-2 text-sm text-red-600 font-jp-normal">{adminLoginError}</p>
              )}
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
              戻る
            </button>
          </form>
        </div>
      </div>
    );
  }

  // データ管理画面
  if (showDataManagement) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-jp-bold text-gray-900">データ管理</h1>
            <button
              onClick={() => setShowDataManagement(false)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-jp-medium transition-colors"
            >
              戻る
            </button>
          </div>
          
          <div className="space-y-6">
            <DataMigration />
            <DataBackupRecovery />
            <UserDataManagement />
          </div>
        </div>
      </div>
    );
  }

  // 管理者画面
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-jp-bold text-gray-900">管理画面</h1>
            <div className="flex space-x-2">
              <button
                onClick={handleAdminLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-jp-medium transition-colors"
              >
                ログアウト
              </button>
            </div>
          </div>
          
          <AdminPanel />
        </div>
      </div>
    );
  }

  // メインアプリ
  return (
    <div className="min-h-screen bg-gray-50">
      {/* メンテナンスモード表示 */}
      {isMaintenanceMode && isAdminBypass && (
        <div className="bg-red-100 text-red-800 px-4 py-2 text-center font-jp-medium">
          <div className="flex items-center justify-center space-x-2">
            <AlertTriangle className="w-4 h-4" />
            <span>メンテナンスモード中（管理者アクセス）</span>
          </div>
        </div>
      )}
      
      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* タブナビゲーション */}
        <div className="bg-white rounded-xl shadow-lg mb-6 overflow-x-auto">
          <div className="flex space-x-1 p-1">
            <button
              onClick={() => setActiveTab('diary')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-jp-medium transition-colors ${
                activeTab === 'diary'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>日記</span>
            </button>
            
            <button
              onClick={() => setActiveTab('search')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-jp-medium transition-colors ${
                activeTab === 'search'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>検索</span>
            </button>
            
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-jp-medium transition-colors ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>設定</span>
            </button>
            
            <button
              onClick={() => setActiveTab('help')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-jp-medium transition-colors ${
                activeTab === 'help'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>ヘルプ</span>
            </button>
          </div>
        </div>
        
        {/* タブコンテンツ */}
        <div className="mb-20">
          {activeTab === 'diary' && <DiaryPage />}
          {activeTab === 'search' && <DiarySearchPage />}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-jp-bold text-gray-900 mb-6">設定</h2>
                
                <div className="space-y-4">
                  <button
                    onClick={() => setShowDataManagement(true)}
                    className="flex items-center space-x-3 w-full bg-blue-50 hover:bg-blue-100 text-blue-800 px-4 py-3 rounded-lg font-jp-medium transition-colors border border-blue-200"
                  >
                    <Database className="w-5 h-5" />
                    <span>データ管理</span>
                  </button>
                  
                  <button
                    onClick={() => setShowDeviceAuth(true)}
                    className="flex items-center space-x-3 w-full bg-green-50 hover:bg-green-100 text-green-800 px-4 py-3 rounded-lg font-jp-medium transition-colors border border-green-200"
                  >
                    <Shield className="w-5 h-5" />
                    <span>デバイス認証設定</span>
                  </button>
                  
                  <button
                    onClick={() => setShowAdminLogin(true)}
                    className="flex items-center space-x-3 w-full bg-purple-50 hover:bg-purple-100 text-purple-800 px-4 py-3 rounded-lg font-jp-medium transition-colors border border-purple-200"
                  >
                    <User className="w-5 h-5" />
                    <span>カウンセラーログイン</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('privacy')}
                    className="flex items-center space-x-3 w-full bg-gray-50 hover:bg-gray-100 text-gray-800 px-4 py-3 rounded-lg font-jp-medium transition-colors border border-gray-200"
                  >
                    <Info className="w-5 h-5" />
                    <span>プライバシーポリシー</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'help' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-jp-bold text-gray-900 mb-6">ヘルプ</h2>
                
                <div className="space-y-4">
                  <button
                    onClick={() => setActiveTab('emotion-types')}
                    className="flex items-center space-x-3 w-full bg-blue-50 hover:bg-blue-100 text-blue-800 px-4 py-3 rounded-lg font-jp-medium transition-colors border border-blue-200"
                  >
                    <HelpCircle className="w-5 h-5" />
                    <span>感情の種類について</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('how-to')}
                    className="flex items-center space-x-3 w-full bg-green-50 hover:bg-green-100 text-green-800 px-4 py-3 rounded-lg font-jp-medium transition-colors border border-green-200"
                  >
                    <Info className="w-5 h-5" />
                    <span>かんじょうにっきの使い方</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('first-steps')}
                    className="flex items-center space-x-3 w-full bg-yellow-50 hover:bg-yellow-100 text-yellow-800 px-4 py-3 rounded-lg font-jp-medium transition-colors border border-yellow-200"
                  >
                    <Calendar className="w-5 h-5" />
                    <span>最初にやること</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('next-steps')}
                    className="flex items-center space-x-3 w-full bg-orange-50 hover:bg-orange-100 text-orange-800 px-4 py-3 rounded-lg font-jp-medium transition-colors border border-orange-200"
                  >
                    <Calendar className="w-5 h-5" />
                    <span>次にやること</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('support')}
                    className="flex items-center space-x-3 w-full bg-purple-50 hover:bg-purple-100 text-purple-800 px-4 py-3 rounded-lg font-jp-medium transition-colors border border-purple-200"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>サポート付き</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'emotion-types' && <EmotionTypes />}
          {activeTab === 'how-to' && <HowTo />}
          {activeTab === 'first-steps' && <FirstSteps />}
          {activeTab === 'next-steps' && <NextSteps />}
          {activeTab === 'support' && <Support />}
          {activeTab === 'privacy' && <PrivacyPolicy />}
        </div>
      </div>
      
      {/* フッターナビゲーション */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex justify-around items-center h-16">
          <button
            onClick={() => setActiveTab('diary')}
            className={`flex flex-col items-center justify-center w-full h-full ${
              activeTab === 'diary' ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-xs mt-1">日記</span>
          </button>
          
          <button
            onClick={() => setActiveTab('search')}
            className={`flex flex-col items-center justify-center w-full h-full ${
              activeTab === 'search' ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <Search className="w-5 h-5" />
            <span className="text-xs mt-1">検索</span>
          </button>
          
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center w-full h-full ${
              activeTab === 'settings' ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-xs mt-1">設定</span>
          </button>
          
          <button
            onClick={() => setActiveTab('help')}
            className={`flex flex-col items-center justify-center w-full h-full ${
              activeTab === 'help' ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <HelpCircle className="w-5 h-5" />
            <span className="text-xs mt-1">ヘルプ</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;