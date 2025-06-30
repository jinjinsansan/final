import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { useAutoSync } from '../hooks/useAutoSync';
import { useSupabase } from '../hooks/useSupabase';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ja';

// 日本語ロケールと相対時間プラグインを設定
dayjs.extend(relativeTime);
dayjs.locale('ja');

interface SyncStatusIndicatorProps {
  className?: string;
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ className = '' }) => {
  const autoSync = useAutoSync();
  const { isConnected } = useSupabase();
  const [timeSinceSync, setTimeSinceSync] = useState<string>('');
  
  // 最終同期時間からの経過時間を計算
  useEffect(() => {
    const updateTimeSinceSync = () => {
      const lastSyncTime = localStorage.getItem('last_sync_time') || '';
      if (!lastSyncTime) {
        setTimeSinceSync('未同期');
        return;
      }
      
      // dayjsを使用して相対時間を表示
      setTimeSinceSync(dayjs(lastSyncTime).fromNow());
    };
    
    updateTimeSinceSync();
    const interval = setInterval(updateTimeSinceSync, 60000); // 1分ごとに更新
    
    return () => clearInterval(interval);
  }, []);
  
  // 同期状態に基づいて表示を変更
  const getStatusColor = () => {
    if (!navigator.onLine) return 'bg-gray-100 text-gray-600 border-gray-200';
    if (!isConnected) return 'bg-yellow-100 text-yellow-600 border-yellow-200';
    if (autoSync.syncInProgress) return 'bg-blue-100 text-blue-600 border-blue-200 animate-pulse'; 
    if (!autoSync.isAutoSyncEnabled) return 'bg-yellow-100 text-yellow-600 border-yellow-200';
    
    // 最終同期時間から6時間以上経過している場合は警告表示
    const lastSyncTime = localStorage.getItem('last_sync_time') || '';
    if (lastSyncTime) {
      const diffHours = dayjs().diff(dayjs(lastSyncTime), 'hour');
      
      if (diffHours > 6) {
        return 'bg-yellow-100 text-yellow-600 border-yellow-200';
      }
    }
    
    return 'bg-green-100 text-green-600 border-green-200';
  };
  
  const getStatusIcon = () => {
    if (autoSync.syncInProgress) return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (!navigator.onLine) return <AlertTriangle className="w-4 h-4" />;
    if (!isConnected) return <AlertTriangle className="w-4 h-4" />;
    if (!autoSync.isAutoSyncEnabled) return <AlertTriangle className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };
  
  const getStatusText = () => {
    if (autoSync.syncInProgress) return '同期中...';
    if (!navigator.onLine) return 'オフラインモード';
    if (!isConnected) return 'ローカルモード';
    if (!autoSync.isAutoSyncEnabled) return '自動同期オフ';
    
    // 最終同期時間から6時間以上経過している場合は警告表示
    const lastSyncTime = localStorage.getItem('last_sync_time') || '';
    if (lastSyncTime) {
      const diffHours = dayjs().diff(dayjs(lastSyncTime), 'hour');
      if (diffHours > 6) {
        return '同期が必要';
      }
    }
    
    return '同期済み';
  };
  
  const handleClick = () => {
    if (!isConnected || autoSync.syncInProgress) return;
    autoSync.triggerManualSync();
  };
  
  return (
    <button
      onClick={handleClick}
      disabled={!isConnected || autoSync.syncInProgress || !autoSync.currentUser}
      className={`flex items-center space-x-2 px-3 py-1 rounded-lg border ${getStatusColor()} transition-colors ${className} ${isConnected && !autoSync.syncInProgress && autoSync.currentUser ? 'hover:bg-opacity-80 cursor-pointer' : 'cursor-default'}`}
      title={isConnected && !autoSync.syncInProgress && autoSync.currentUser ? "クリックして手動同期" : ""}
    >
      {getStatusIcon()}
      <div className="flex flex-col items-start">
        <span className="text-xs font-jp-medium">{getStatusText()}</span>
        {localStorage.getItem('last_sync_time') ? (
          <div className="flex items-center space-x-1 text-xs opacity-80">
            <Clock className="w-3 h-3" /> 
            <span>{timeSinceSync}</span> 
          </div>
        ) : (
          <div className="flex items-center space-x-1 text-xs opacity-80"> 
            <span>{!isConnected ? (navigator.onLine ? 'ローカルモード' : 'オフライン中') : '同期履歴なし'}</span>
          </div>
        )}
      </div>
    </button>
  );
};

export default SyncStatusIndicator;