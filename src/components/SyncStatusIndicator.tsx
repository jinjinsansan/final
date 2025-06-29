import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { useAutoSync } from '../hooks/useAutoSync';
import { useSupabase } from '../hooks/useSupabase';

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
      const lastSyncTime = localStorage.getItem('last_sync_time');
      if (!lastSyncTime) {
        setTimeSinceSync('未同期');
        return;
      }
      
      const now = new Date();
      const syncTime = new Date(lastSyncTime);
      const diffMs = now.getTime() - syncTime.getTime();
      
      // 分単位で表示
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      if (diffMinutes < 1) {
        setTimeSinceSync('たった今');
      } else if (diffMinutes < 60) {
        setTimeSinceSync(`${diffMinutes}分前`);
      } else {
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) {
          setTimeSinceSync(`${diffHours}時間前`);
        } else {
          const diffDays = Math.floor(diffHours / 24);
          setTimeSinceSync(`${diffDays}日前`);
        }
      }
    };
    
    updateTimeSinceSync();
    const interval = setInterval(updateTimeSinceSync, 60000); // 1分ごとに更新
    
    return () => clearInterval(interval);
  }, []);
  
  // 同期状態に基づいて表示を変更
  const getStatusColor = () => {
    if (!isConnected) return 'bg-gray-100 text-gray-600 border-gray-200';
    if (autoSync.syncInProgress) return 'bg-blue-100 text-blue-600 border-blue-200';
    if (!autoSync.isAutoSyncEnabled) return 'bg-yellow-100 text-yellow-600 border-yellow-200';
    
    // 最終同期時間から6時間以上経過している場合は警告表示
    const lastSyncTime = localStorage.getItem('last_sync_time');
    if (lastSyncTime) {
      const now = new Date();
      const syncTime = new Date(lastSyncTime);
      const diffHours = (now.getTime() - syncTime.getTime()) / (1000 * 60 * 60);
      
      if (diffHours > 6) {
        return 'bg-yellow-100 text-yellow-600 border-yellow-200';
      }
    }
    
    return 'bg-green-100 text-green-600 border-green-200';
  };
  
  const getStatusIcon = () => {
    if (autoSync.syncInProgress) return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (!isConnected) return <AlertTriangle className="w-4 h-4" />;
    if (!autoSync.isAutoSyncEnabled) return <AlertTriangle className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };
  
  const getStatusText = () => {
    if (autoSync.syncInProgress) return '同期中...';
    if (!isConnected) return 'オフライン';
    if (!autoSync.isAutoSyncEnabled) return '自動同期オフ';
    return '同期済み';
  };
  
  const handleClick = () => {
    if (!isConnected || autoSync.syncInProgress) return;
    autoSync.triggerManualSync();
  };
  
  return (
    <button
      onClick={handleClick}
      disabled={!isConnected || autoSync.syncInProgress}
      className={`flex items-center space-x-2 px-3 py-1 rounded-lg border ${getStatusColor()} transition-colors ${className} ${isConnected && !autoSync.syncInProgress ? 'hover:bg-opacity-80 cursor-pointer' : 'cursor-default'}`}
    >
      {getStatusIcon()}
      <div className="flex flex-col items-start">
        <span className="text-xs font-jp-medium">{getStatusText()}</span>
        {localStorage.getItem('last_sync_time') && (
          <div className="flex items-center space-x-1 text-xs opacity-80">
            <Clock className="w-3 h-3" />
            <span>{timeSinceSync}</span>
          </div>
        )}
      </div>
    </button>
  );
};

export default SyncStatusIndicator;