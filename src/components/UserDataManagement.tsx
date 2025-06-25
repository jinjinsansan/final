import React, { useState } from 'react';
import { Database, Download, Upload, Key, RefreshCw, CheckCircle, AlertTriangle, Shield, Info, Copy } from 'lucide-react';
import { getCurrentUser } from '../lib/deviceAuth';

const UserDataManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'backup' | 'recovery'>('backup');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [backupData, setBackupData] = useState<File | null>(null);
  const [recoveryCode, setRecoveryCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // バックアップデータの作成
  const handleCreateBackup = () => {
    setLoading(true);
    setStatus(null);
    
    try {
      // ローカルストレージからデータを収集
      const backupObject = {
        journalEntries: localStorage.getItem('journalEntries') ? JSON.parse(localStorage.getItem('journalEntries')!) : [],
        initialScores: localStorage.getItem('initialScores') ? JSON.parse(localStorage.getItem('initialScores')!) : null,
        consentHistories: localStorage.getItem('consent_histories') ? JSON.parse(localStorage.getItem('consent_histories')!) : [],
        lineUsername: localStorage.getItem('line-username'),
        privacyConsentGiven: localStorage.getItem('privacyConsentGiven'),
        privacyConsentDate: localStorage.getItem('privacyConsentDate'),
        backupDate: new Date().toISOString(),
        version: '1.0'
      };
      
      // JSONに変換してダウンロード
      const dataStr = JSON.stringify(backupObject, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      // ファイル名にユーザー名と日付を含める
      const user = getCurrentUser();
      const username = user?.lineUsername || localStorage.getItem('line-username') || 'user';
      const date = new Date().toISOString().split('T')[0];
      const fileName = `kanjou-nikki-backup-${username}-${date}.json`;
      
      // ダウンロードリンクを作成して自動クリック
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(dataBlob);
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      setStatus('バックアップが正常に作成されました！');
    } catch (error) {
      console.error('バックアップ作成エラー:', error);
      setStatus('バックアップの作成に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  // バックアップファイルの選択
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setBackupData(e.target.files[0]);
      setStatus(null);
    }
  };

  // バックアップからの復元
  const handleRestoreBackup = async () => {
    if (!backupData) {
      setStatus('バックアップファイルを選択してください。');
      return;
    }
    
    if (!window.confirm('バックアップからデータを復元すると、現在のデータが上書きされます。続行しますか？')) {
      return;
    }
    
    setLoading(true);
    setStatus(null);
    
    try {
      // ファイルを読み込み
      const fileReader = new FileReader();
      
      fileReader.onload = (event) => {
        try {
          if (!event.target || typeof event.target.result !== 'string') {
            throw new Error('ファイルの読み込みに失敗しました。');
          }
          
          const backupObject = JSON.parse(event.target.result);
          
          // バージョンチェック
          if (!backupObject.version) {
            throw new Error('無効なバックアップファイルです。');
          }
          
          // データの復元
          if (backupObject.journalEntries) {
            localStorage.setItem('journalEntries', JSON.stringify(backupObject.journalEntries));
          }
          
          if (backupObject.initialScores) {
            localStorage.setItem('initialScores', JSON.stringify(backupObject.initialScores));
          }
          
          if (backupObject.consentHistories) {
            localStorage.setItem('consent_histories', JSON.stringify(backupObject.consentHistories));
          }
          
          if (backupObject.lineUsername) {
            localStorage.setItem('line-username', backupObject.lineUsername);
          }
          
          if (backupObject.privacyConsentGiven) {
            localStorage.setItem('privacyConsentGiven', backupObject.privacyConsentGiven);
          }
          
          if (backupObject.privacyConsentDate) {
            localStorage.setItem('privacyConsentDate', backupObject.privacyConsentDate);
          }
          
          setStatus('データが正常に復元されました！ページを再読み込みしてください。');
          
          // 3秒後に自動的にページを再読み込み
          setTimeout(() => {
            window.location.reload();
          }, 5000);
          
        } catch (error) {
          console.error('データ復元エラー:', error);
          setStatus('データの復元に失敗しました。有効なバックアップファイルか確認してください。');
          setLoading(false);
        }
      };
      
      fileReader.onerror = () => {
        setStatus('ファイルの読み込みに失敗しました。');
        setLoading(false);
      };
      
      fileReader.readAsText(backupData);
      
    } catch (error) {
      console.error('バックアップ復元エラー:', error);
      setStatus('バックアップの復元に失敗しました。');
      setLoading(false);
    }
  };

  // 復活の呪文を生成
  const generateRecoveryCode = () => {
    setLoading(true);
    setStatus(null);
    
    try {
      // ユーザー情報を取得
      const user = getCurrentUser();
      const username = user?.lineUsername || localStorage.getItem('line-username');
      
      if (!username) {
        setStatus('ユーザー情報が見つかりません。');
        setLoading(false);
        return;
      }
      
      // 日記データの件数を取得
      const journalEntries = localStorage.getItem('journalEntries');
      const entriesCount = journalEntries ? JSON.parse(journalEntries).length : 0;
      
      // 初期スコア情報を取得
      const initialScores = localStorage.getItem('initialScores');
      const scores = initialScores ? JSON.parse(initialScores) : null;
      
      // 復活の呪文の基本情報
      const codeBase = {
        u: username,                                // ユーザー名
        c: entriesCount,                            // 日記の件数
        t: Math.floor(Date.now() / 1000),           // タイムスタンプ（秒）
        v: 1                                        // バージョン
      };
      
      // 初期スコアがある場合は追加
      if (scores) {
        Object.assign(codeBase, {
          s: scores.selfEsteemScore,                // 自己肯定感スコア
          w: scores.worthlessnessScore,             // 無価値感スコア
          m: scores.measurementMonth,               // 計測月
          d: scores.measurementDay                  // 計測日
        });
      }
      
      // JSONを文字列化して圧縮
      const jsonStr = JSON.stringify(codeBase);
      const compressedCode = btoa(jsonStr);
      
      // 5文字ごとにハイフンを挿入して読みやすくする
      const formattedCode = compressedCode.match(/.{1,5}/g)?.join('-') || compressedCode;
      
      setRecoveryCode(formattedCode);
      setStatus('復活の呪文が生成されました！');
    } catch (error) {
      console.error('復活の呪文生成エラー:', error);
      setStatus('復活の呪文の生成に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  // 復活の呪文をクリップボードにコピー
  const copyToClipboard = () => {
    navigator.clipboard.writeText(recoveryCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // 復活の呪文を使用してデータを復元
  const restoreFromCode = () => {
    if (!inputCode.trim()) {
      setStatus('復活の呪文を入力してください。');
      return;
    }
    
    if (!window.confirm('復活の呪文からデータを復元すると、現在のデータが上書きされる可能性があります。続行しますか？')) {
      return;
    }
    
    setLoading(true);
    setStatus(null);
    
    try {
      // ハイフンを削除して元のコードを取得
      const cleanCode = inputCode.replace(/-/g, '');
      
      // Base64デコードしてJSONに変換
      const jsonStr = atob(cleanCode);
      const codeData = JSON.parse(jsonStr);
      
      // バージョンチェック
      if (!codeData.v || codeData.v !== 1) {
        throw new Error('無効な復活の呪文です。');
      }
      
      // ユーザー名を復元
      if (codeData.u) {
        localStorage.setItem('line-username', codeData.u);
        localStorage.setItem('privacyConsentGiven', 'true');
        localStorage.setItem('privacyConsentDate', new Date(codeData.t * 1000).toISOString());
      }
      
      // 初期スコアを復元
      if (codeData.s && codeData.w && codeData.m && codeData.d) {
        const initialScores = {
          selfEsteemScore: codeData.s,
          worthlessnessScore: codeData.w,
          measurementMonth: codeData.m,
          measurementDay: codeData.d
        };
        localStorage.setItem('initialScores', JSON.stringify(initialScores));
      }
      
      setStatus('データが正常に復元されました！ページを再読み込みしてください。');
      
      // 3秒後に自動的にページを再読み込み
      setTimeout(() => {
        window.location.reload();
      }, 5000);
      
    } catch (error) {
      console.error('データ復元エラー:', error);
      setStatus('データの復元に失敗しました。有効な復活の呪文か確認してください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 px-4">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Database className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-jp-bold text-gray-900">データ管理</h1>
        </div>

        {/* タブナビゲーション */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('backup')}
              className={`py-2 px-1 border-b-2 font-jp-medium text-sm ${
                activeTab === 'backup'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              バックアップと復元
            </button>
            <button
              onClick={() => setActiveTab('recovery')}
              className={`py-2 px-1 border-b-2 font-jp-medium text-sm ${
                activeTab === 'recovery'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              復活の呪文
            </button>
          </nav>
        </div>

        {/* タブコンテンツ */}
        {activeTab === 'backup' ? (
          <div className="space-y-6">
            {/* 説明セクション */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-6">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800 font-jp-normal">
                  <p className="font-jp-medium mb-2">データのバックアップについて</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>ブラウザのキャッシュクリアや端末変更に備えて、定期的にデータをバックアップしてください</li>
                    <li>バックアップファイルは安全な場所に保存してください</li>
                    <li>復元時には現在のデータが上書きされますのでご注意ください</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* バックアップセクション */}
            <div className="bg-green-50 rounded-lg p-6 border border-green-200 mb-6">
              <div className="flex items-center space-x-3 mb-4">
                <Download className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-jp-bold text-gray-900">データのバックアップ</h3>
              </div>
              
              <p className="text-gray-700 font-jp-normal mb-4 text-sm">
                現在のデータをバックアップファイルとして保存します。このファイルは後でデータを復元する際に使用できます。
              </p>
              
              <button
                onClick={handleCreateBackup}
                disabled={loading}
                className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-jp-medium transition-colors w-full sm:w-auto"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                <span>バックアップを作成</span>
              </button>
            </div>

            {/* 復元セクション */}
            <div className="bg-purple-50 rounded-lg p-6 border border-purple-200 mb-6">
              <div className="flex items-center space-x-3 mb-4">
                <Upload className="w-6 h-6 text-purple-600" />
                <h3 className="text-lg font-jp-bold text-gray-900">データの復元</h3>
              </div>
              
              <p className="text-gray-700 font-jp-normal mb-4 text-sm">
                以前作成したバックアップファイルからデータを復元します。現在のデータは上書きされます。
              </p>
              
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-jp-medium
                      file:bg-purple-100 file:text-purple-700
                      hover:file:bg-purple-200
                      cursor-pointer"
                  />
                </div>
                
                <button
                  onClick={handleRestoreBackup}
                  disabled={loading || !backupData}
                  className="flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-jp-medium transition-colors w-full sm:w-auto"
                >
                  {loading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                  <span>バックアップから復元</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 説明セクション */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-6">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800 font-jp-normal">
                  <p className="font-jp-medium mb-2">復活の呪文について</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>端末変更やブラウザのキャッシュクリアに備えて、復活の呪文を保存してください</li>
                    <li>呪文を使うと、ユーザー名と初期スコアを復元できます</li>
                    <li>呪文はメモ帳やスクリーンショットで保存しておくことをおすすめします</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 呪文生成セクション */}
            <div className="bg-purple-50 rounded-lg p-6 border border-purple-200 mb-6">
              <div className="flex items-center space-x-3 mb-4">
                <Key className="w-6 h-6 text-purple-600" />
                <h3 className="text-lg font-jp-bold text-gray-900">復活の呪文を生成</h3>
              </div>
              
              <p className="text-gray-700 font-jp-normal mb-4 text-sm">
                あなた専用の復活の呪文を生成します。この呪文を安全な場所に保存してください。
              </p>
              
              <button
                onClick={generateRecoveryCode}
                disabled={loading}
                className="flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-jp-medium transition-colors w-full sm:w-auto mb-4"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Key className="w-5 h-5" />
                )}
                <span>呪文を生成</span>
              </button>
              
              {recoveryCode && (
                <div className="mt-4">
                  <div className="bg-white rounded-lg p-4 border border-purple-200 mb-2 relative">
                    <div className="font-mono text-sm break-all select-all">
                      {recoveryCode}
                    </div>
                    <button
                      onClick={copyToClipboard}
                      className="absolute top-2 right-2 text-purple-600 hover:text-purple-800 p-1"
                      title="コピー"
                    >
                      {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-purple-700">
                    この呪文を安全な場所に保存してください。端末変更やブラウザのキャッシュクリアの際に使用できます。
                  </p>
                </div>
              )}
            </div>

            {/* 呪文使用セクション */}
            <div className="bg-green-50 rounded-lg p-6 border border-green-200 mb-6">
              <div className="flex items-center space-x-3 mb-4">
                <Shield className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-jp-bold text-gray-900">復活の呪文を使用</h3>
              </div>
              
              <p className="text-gray-700 font-jp-normal mb-4 text-sm">
                以前保存した復活の呪文を入力して、データを復元します。
              </p>
              
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder="復活の呪文を入力（例: XXXXX-XXXXX-XXXXX-XXXXX）"
                    className="w-full px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:border-green-500 focus:outline-none font-jp-normal text-sm"
                  />
                </div>
                
                <button
                  onClick={restoreFromCode}
                  disabled={loading || !inputCode.trim()}
                  className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-jp-medium transition-colors w-full sm:w-auto"
                >
                  {loading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Shield className="w-5 h-5" />
                  )}
                  <span>呪文を使用</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ステータス表示 */}
        {status && (
          <div className={`rounded-lg p-4 border ${
            status.includes('失敗') 
              ? 'bg-red-50 border-red-200 text-red-800' 
              : 'bg-green-50 border-green-200 text-green-800'
          }`}>
            <div className="flex items-center space-x-2">
              {status.includes('失敗') ? (
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              )}
              <span className="font-jp-medium">{status}</span>
            </div>
          </div>
        )}

        {/* 注意事項 */}
        <div className="mt-6 bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800 font-jp-normal">
              <p className="font-jp-medium mb-2">重要な注意事項</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>バックアップファイルには個人情報が含まれています。安全に保管してください</li>
                <li>復元操作は元に戻せません。必要に応じて現在のデータもバックアップしてください</li>
                <li>端末を変更する場合は、必ずバックアップを作成してください</li>
                <li>定期的なバックアップをお勧めします（週に1回程度）</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDataManagement;