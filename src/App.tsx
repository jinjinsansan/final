import React, { useState, useEffect, useRef } from 'react';
import { Heart, Menu, X, AlertTriangle } from 'lucide-react';
import DiaryPage from './pages/DiaryPage';
import DiarySearchPage from './pages/DiarySearchPage';
import HowTo from './pages/HowTo';
import FirstSteps from './pages/FirstSteps';
import NextSteps from './pages/NextSteps';
import EmotionTypes from './pages/EmotionTypes';
import Support from './pages/Support';
import PrivacyPolicy from './pages/PrivacyPolicy';
import PrivacyConsent from './components/PrivacyConsent';
import MaintenanceMode from './components/MaintenanceMode';
import AdminPanel from './components/AdminPanel';
import Chat from './components/Chat';
import DataMigration from './components/DataMigration';
import AutoSyncSettings from './components/AutoSyncSettings';
import DataBackupRecovery from './components/DataBackupRecovery';
import UserDataManagement from './components/UserDataManagement';
import DeviceAuthLogin from './components/DeviceAuthLogin';
import DeviceAuthRegistration from './components/DeviceAuthRegistration';
import { useMaintenanceStatus } from './hooks/useMaintenanceStatus';
import { useSupabase } from './hooks/useSupabase';
import { useAutoSync } from './hooks/useAutoSync';
import { isAuthenticated, getAuthSession, logoutUser } from './lib/deviceAuth';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [privacyConsentGiven, setPrivacyConsentGiven] = useState<boolean | null>(null);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [currentCounselor, setCurrentCounselor] = useState<string | null>(null);
  const [showDeviceAuth, setShowDeviceAuth] = useState(false);
  const [deviceAuthMode, setDeviceAuthMode] = useState<'login' | 'register'>('login');
  const [lineUsername, setLineUsername] = useState<string | null>(null);
  
  const { isMaintenanceMode, config, isAdminBypass, refreshStatus } = useMaintenanceStatus();
  
  const { isConnected, currentUser, retryConnection, error } = useSupabase();
  
  const autoSync = useAutoSync();

  useEffect(() => {
    const consentGiven = localStorage.getItem('privacyConsentGiven');
    if (consentGiven === 'true') {
      setPrivacyConsentGiven(true);
      
      const username = localStorage.getItem('line-username');
      setLineUsername(username);
      
      checkDeviceAuthStatus();
    } else if (consentGiven === 'false') {
      setPrivacyConsentGiven(false);
    } else {
      setPrivacyConsentGiven(null);
    }
    
    const counselor = localStorage.getItem('current_counselor');
    if (counselor) {
      setCurrentCounselor(counselor);
    }
  }, []);

  const checkDeviceAuthStatus = () => {
    const isDeviceAuthed = isAuthenticated();
    if (!isDeviceAuthed) {
      const session = getAuthSession();
      if (session) {
        setDeviceAuthMode('login');
      } else {
        setDeviceAuthMode('register');
      }
      
      setShowDeviceAuth(false);
    }
  };

  const handleConsentResponse = (accepted: boolean) => {
    if (accepted) {
      const username = prompt('LINEのユーザー名を入力してください');
      if (username) {
        localStorage.setItem('line-username', username);
        localStorage.setItem('privacyConsentGiven', 'true');
        localStorage.setItem('privacyConsentDate', new Date().toISOString());
        setPrivacyConsentGiven(true);
        setLineUsername(username);
        
        const consentRecord = {
          id: Date.now().toString(),
          line_username: username,
          consent_given: true,
          consent_date: new Date().toISOString(),
          ip_address: 'unknown',
          user_agent: navigator.userAgent
        };
        
        const existingHistories = localStorage.getItem('consent_histories');
        const histories = existingHistories ? JSON.parse(existingHistories) : [];
        histories.push(consentRecord);
        localStorage.setItem('consent_histories', JSON.stringify(histories));
        
        checkDeviceAuthStatus();
      }
    } else {
      localStorage.setItem('privacyConsentGiven', 'false');
      setPrivacyConsentGiven(false);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (adminPassword === 'counselor123') {
      const counselorName = prompt('カウンセラー名を入力してください');
      if (counselorName) {
        localStorage.setItem('current_counselor', counselorName);
        setCurrentCounselor(counselorName);
        setShowAdminLogin(false);
        setAdminPassword('');
        
        refreshStatus();
        
        setActiveTab('admin');
      }
    } else {
      alert('パスワードが正しくありません');
    }
  };

  const handleAdminLogout = () => {
    if (window.confirm('カウンセラーアカウントからログアウトしますか？')) {
      localStorage.removeItem('current_counselor');
      setCurrentCounselor(null);
      
      refreshStatus();
      
      setActiveTab('home');
    }
  };

  const handleDeviceAuthComplete = (username: string) => {
    setShowDeviceAuth(false);
    setLineUsername(username);
  };

  const handleUserLogout = () => {
    if (window.confirm('ログアウトしますか？')) {
      logoutUser();
      localStorage.removeItem('line-username');
      localStorage.removeItem('privacyConsentGiven');
      localStorage.removeItem('privacyConsentDate');
      setPrivacyConsentGiven(null);
      setLineUsername(null);
      
      setActiveTab('home');
    }
  };

  if (isMaintenanceMode && !isAdminBypass) {
    return (
      <MaintenanceMode 
        config={config!} 
        onAdminLogin={() => setShowAdminLogin(true)}
        onRetry={refreshStatus}
      />
    );
  }

  if (privacyConsentGiven === null) {
    return <PrivacyConsent onConsent={handleConsentResponse} />;
  }

  if (privacyConsentGiven === false) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-jp-bold text-gray-900 mb-2">
              ご利用いただけません
            </h1>
            <p className="text-gray-600 font-jp-normal">
              プライバシーポリシーに同意いただけない場合、本サービスはご利用いただけません。
            </p>
          </div>
          <button
            onClick={() => setPrivacyConsentGiven(null)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-jp-medium transition-colors"
          >
            プライバシーポリシーを再確認する
          </button>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-[#FFF8E8] relative">
      {/* 背景の水玉模様 */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-32 h-32 bg-white opacity-20 rounded-full -translate-y-1/4 -translate-x-1/4"></div>
        <div className="absolute top-1/4 right-1/4 w-24 h-24 bg-white opacity-20 rounded-full"></div>
        <div className="absolute bottom-0 left-1/4 w-40 h-40 bg-white opacity-20 rounded-full translate-y-1/4"></div>
        <div className="absolute bottom-1/4 right-0 w-36 h-36 bg-white opacity-20 rounded-full translate-x-1/4"></div>
        <div className="absolute top-1/2 left-1/2 w-20 h-20 bg-white opacity-20 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      {/* ヘッダー */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Heart className="w-8 h-8 text-[#F4933F]" />
              <h1 className="ml-2 text-xl font-jp-bold text-gray-900">かんじょうにっき</h1>
            </div>
            <div className="flex items-center space-x-4">
              {currentCounselor && (
                <div className="hidden sm:flex items-center">
                  <span className="bg-green-100 text-green-800 text-xs font-jp-medium px-2.5 py-0.5 rounded-full border border-green-200">
                    {currentCounselor}
                  </span>
                </div>
              )}
              {isMaintenanceMode && isAdminBypass && (
                <div className="hidden sm:flex items-center">
                  <span className="bg-red-100 text-red-800 text-xs font-jp-medium px-2.5 py-0.5 rounded-full border border-red-200 flex items-center">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    メンテナンスモード中
                  </span>
                </div>
              )}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 focus:outline-none"
              >
                {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* サイドメニュー */}
      {menuOpen && (
        <div className="fixed inset-0 z-20 overflow-hidden" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black bg-opacity-50"></div>
          <div className="absolute top-0 right-0 w-64 h-full bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                  <Heart className="w-6 h-6 text-[#F4933F]" />
                  <h2 className="ml-2 text-lg font-jp-bold text-gray-900">かんじょうにっき</h2>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-1 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 focus:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-1">
                <button
                  onClick={() => { setActiveTab('home'); setMenuOpen(false); }}
                  className={`flex items-center w-full px-3 py-2 rounded-md ${
                    activeTab === 'home' ? 'bg-[#FFF0D9] text-[#F4933F]' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-3">🏠</span>
                  <span className="font-jp-medium">TOP</span>
                </button>
                
                <button
                  onClick={() => { setActiveTab('diary'); setMenuOpen(false); }}
                  className={`flex items-center w-full px-3 py-2 rounded-md ${
                    activeTab === 'diary' ? 'bg-[#FFF0D9] text-[#F4933F]' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-3">📝</span>
                  <span className="font-jp-medium">日記を書く</span>
                </button>
                
                <button
                  onClick={() => { setActiveTab('search'); setMenuOpen(false); }}
                  className={`flex items-center w-full px-3 py-2 rounded-md ${
                    activeTab === 'search' ? 'bg-[#FFF0D9] text-[#F4933F]' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-3">🔍</span>
                  <span className="font-jp-medium">日記を検索</span>
                </button>
                
                <button
                  onClick={() => { setActiveTab('howto'); setMenuOpen(false); }}
                  className={`flex items-center w-full px-3 py-2 rounded-md ${
                    activeTab === 'howto' ? 'bg-[#FFF0D9] text-[#F4933F]' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-3">📖</span>
                  <span className="font-jp-medium">使い方</span>
                </button>
                
                <button
                  onClick={() => { setActiveTab('firststeps'); setMenuOpen(false); }}
                  className={`flex items-center w-full px-3 py-2 rounded-md ${
                    activeTab === 'firststeps' ? 'bg-[#FFF0D9] text-[#F4933F]' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-3">▶️</span>
                  <span className="font-jp-medium">最初にやること</span>
                </button>
                
                <button
                  onClick={() => { setActiveTab('nextsteps'); setMenuOpen(false); }}
                  className={`flex items-center w-full px-3 py-2 rounded-md ${
                    activeTab === 'nextsteps' ? 'bg-[#FFF0D9] text-[#F4933F]' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-3">➡️</span>
                  <span className="font-jp-medium">次にやること</span>
                </button>
                
                <button
                  onClick={() => { setActiveTab('emotiontypes'); setMenuOpen(false); }}
                  className={`flex items-center w-full px-3 py-2 rounded-md ${
                    activeTab === 'emotiontypes' ? 'bg-[#FFF0D9] text-[#F4933F]' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-3">❤️</span>
                  <span className="font-jp-medium">感情の種類</span>
                </button>
                
                <button
                  onClick={() => { setActiveTab('support'); setMenuOpen(false); }}
                  className={`flex items-center w-full px-3 py-2 rounded-md ${
                    activeTab === 'support' ? 'bg-[#FFF0D9] text-[#F4933F]' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-3">❓</span>
                  <span className="font-jp-medium">サポート付き</span>
                </button>
                
                <button
                  onClick={() => { setActiveTab('privacy'); setMenuOpen(false); }}
                  className={`flex items-center w-full px-3 py-2 rounded-md ${
                    activeTab === 'privacy' ? 'bg-[#FFF0D9] text-[#F4933F]' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-3">🛡️</span>
                  <span className="font-jp-medium">同意文</span>
                </button>
                
                <button
                  onClick={() => { setActiveTab('chat'); setMenuOpen(false); }}
                  className={`flex items-center w-full px-3 py-2 rounded-md ${
                    activeTab === 'chat' ? 'bg-[#FFF0D9] text-[#F4933F]' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-3">💬</span>
                  <span className="font-jp-medium">チャット</span>
                </button>
                
                <button
                  onClick={() => { setActiveTab('data'); setMenuOpen(false); }}
                  className={`flex items-center w-full px-3 py-2 rounded-md ${
                    activeTab === 'data' ? 'bg-[#FFF0D9] text-[#F4933F]' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-3">⚙️</span>
                  <span className="font-jp-medium">データ管理</span>
                </button>
                
                {currentCounselor && (
                  <button
                    onClick={() => { setActiveTab('admin'); setMenuOpen(false); }}
                    className={`flex items-center w-full px-3 py-2 rounded-md ${
                      activeTab === 'admin' ? 'bg-[#FFF0D9] text-[#F4933F]' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-3">⚙️</span>
                    <span className="font-jp-medium">管理画面</span>
                  </button>
                )}
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                {lineUsername && (
                  <div className="mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm text-[#F4933F] font-jp-medium">
                        {lineUsername}さん
                      </span>
                    </div>
                    <button
                      onClick={handleUserLogout}
                      className="flex items-center text-sm text-red-600 hover:text-red-800 font-jp-normal"
                    >
                      <span className="mr-2">🚪</span>
                      <span>ログアウト</span>
                    </button>
                  </div>
                )}
                
                {currentCounselor ? (
                  <button
                    onClick={handleAdminLogout}
                    className="flex items-center text-sm text-red-600 hover:text-red-800 font-jp-normal"
                  >
                    <span className="mr-2">🚪</span>
                    <span>カウンセラーログアウト</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowAdminLogin(true)}
                    className="flex items-center text-sm text-gray-600 hover:text-gray-800 font-jp-normal"
                  >
                    <span className="mr-2">🔑</span>
                    <span>心理カウンセラーに</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* カウンセラーログインモーダル */}
      {showAdminLogin && (
        <div className="fixed inset-0 z-30 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowAdminLogin(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4" onClick={(e) => e.stopPropagation()}>
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <span className="text-xl">🔑</span>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-jp-medium text-gray-900" id="modal-title">
                      カウンセラーログイン
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        カウンセラー専用のパスワードを入力してください。
                      </p>
                    </div>
                  </div>
                </div>
                <form onSubmit={handleAdminLogin} className="mt-5 sm:mt-4">
                  <div>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="パスワードを入力"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#F4933F] text-base font-jp-medium text-white hover:bg-[#E87F2F] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F4933F] sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      ログイン
                    </button>
                    <button
                      type="button"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-jp-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                      onClick={() => setShowAdminLogin(false)}
                    >
                      キャンセル
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 relative z-1">
        {/* ホーム画面 */}
        {activeTab === 'home' && (
          <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
            <div className="w-36 h-36 bg-white rounded-full flex items-center justify-center shadow-md mb-10">
              <Heart className="w-20 h-20 text-[#F4933F]" />
            </div>
            <h1 className="text-6xl font-jp-bold text-gray-900 mb-6">かんじょうにっき</h1>
            <p className="text-2xl font-jp-medium text-gray-700 mb-16">自己肯定感を育てる感情日記アプリ</p>
            <button
              onClick={() => setActiveTab('diary')}
              className="bg-[#F4933F] hover:bg-[#E87F2F] text-white px-12 py-6 rounded-full font-jp-bold text-2xl shadow-lg transition-colors"
            >
              はじめる
            </button>
            <p className="mt-24 text-gray-500 font-jp-normal">一般社団法人NAMIDAサポート協会</p>
          </div>
        )}
        
        {/* 日記ページ */}
        {activeTab === 'diary' && <DiaryPage />}
        
        {/* 検索ページ */}
        {activeTab === 'search' && <DiarySearchPage />}
        
        {/* 使い方ページ */}
        {activeTab === 'howto' && <HowTo />}
        
        {/* 最初にやることページ */}
        {activeTab === 'firststeps' && <FirstSteps />}
        
        {/* 次にやることページ */}
        {activeTab === 'nextsteps' && <NextSteps />}
        
        {/* 感情の種類ページ */}
        {activeTab === 'emotiontypes' && <EmotionTypes />}
        
        {/* サポート付きページ */}
        {activeTab === 'support' && <Support />}
        
        {/* プライバシーポリシーページ */}
        {activeTab === 'privacy' && <PrivacyPolicy />}
        
        {/* チャットページ */}
        {activeTab === 'chat' && <Chat />}
        
        {/* データ管理ページ */}
        {activeTab === 'data' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h1 className="text-2xl font-jp-bold text-gray-900 mb-6">データ管理</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                  onClick={() => setActiveTab('data-migration')}
                  className="bg-blue-50 hover:bg-blue-100 rounded-xl p-6 border border-blue-200 text-left transition-colors"
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xl">🔄</span>
                    </div>
                    <h2 className="text-lg font-jp-bold text-gray-900">データ同期</h2>
                  </div>
                  <p className="text-gray-600 font-jp-normal text-sm">
                    ローカルデータとSupabaseデータの同期設定を管理します
                  </p>
                </button>
                
                <button
                  onClick={() => setActiveTab('auto-sync')}
                  className="bg-green-50 hover:bg-green-100 rounded-xl p-6 border border-green-200 text-left transition-colors"
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-xl">⚙️</span>
                    </div>
                    <h2 className="text-lg font-jp-bold text-gray-900">自動同期設定</h2>
                  </div>
                  <p className="text-gray-600 font-jp-normal text-sm">
                    自動同期の設定を管理します
                  </p>
                </button>
                
                <button
                  onClick={() => setActiveTab('data-backup')}
                  className="bg-purple-50 hover:bg-purple-100 rounded-xl p-6 border border-purple-200 text-left transition-colors"
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-xl">💾</span>
                    </div>
                    <h2 className="text-lg font-jp-bold text-gray-900">データバックアップ</h2>
                  </div>
                  <p className="text-gray-600 font-jp-normal text-sm">
                    データのバックアップと復元を行います
                  </p>
                </button>
                
                <button
                  onClick={() => setActiveTab('user-data')}
                  className="bg-yellow-50 hover:bg-yellow-100 rounded-xl p-6 border border-yellow-200 text-left transition-colors"
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <span className="text-xl">👤</span>
                    </div>
                    <h2 className="text-lg font-jp-bold text-gray-900">ユーザーデータ</h2>
                  </div>
                  <p className="text-gray-600 font-jp-normal text-sm">
                    ユーザーデータの管理を行います
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* データ同期ページ */}
        {activeTab === 'data-migration' && <DataMigration />}
        
        {/* 自動同期設定ページ */}
        {activeTab === 'auto-sync' && <AutoSyncSettings />}
        
        {/* データバックアップページ */}
        {activeTab === 'data-backup' && <DataBackupRecovery />}
        
        {/* ユーザーデータページ */}
        {activeTab === 'user-data' && <UserDataManagement />}
        
        {/* 管理画面 */}
        {activeTab === 'admin' && currentCounselor && <AdminPanel />}
      </main>

      {/* メンテナンスモード表示 */}
      {isMaintenanceMode && isAdminBypass && (
        <div className="fixed bottom-0 left-0 right-0 bg-red-100 border-t border-red-200 p-2 text-center">
          <div className="flex items-center justify-center space-x-2 text-red-800 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-jp-medium">メンテナンスモード中（管理者アクセス）</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;