import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { useAutoSync } from '../hooks/useAutoSync';

interface SyncStatusIndicatorProps {
  className?: string;
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ className = '' }) => {
  const { isConnected, isAutoSyncEnabled, lastSyncTime, syncInProgress, triggerManualSync } = useAutoSync();
  const [timeSinceSync, setTimeSinceSync] = useState<string>('');
  
  // 最終同期時間からの経過時間を計算
  useEffect(() => {
    const updateTimeSinceSync = () => {
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
  }, [lastSyncTime]);
  
  // 同期状態に基づいて表示を変更
  const getStatusColor = () => {
    if (!isConnected) return 'bg-gray-100 text-gray-600 border-gray-200';
    if (syncInProgress) return 'bg-blue-100 text-blue-600 border-blue-200';
    if (!isAutoSyncEnabled) return 'bg-yellow-100 text-yellow-600 border-yellow-200';
    
    // 最終同期時間から6時間以上経過している場合は警告表示
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
    if (syncInProgress) return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (!isConnected) return <AlertTriangle className="w-4 h-4" />;
    if (!isAutoSyncEnabled) return <AlertTriangle className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };
  
  const getStatusText = () => {
    if (syncInProgress) return '同期中...';
    if (!isConnected) return 'オフライン';
    if (!isAutoSyncEnabled) return '自動同期オフ';
    return '同期済み';
  };
  
  const handleClick = () => {
    if (!isConnected || syncInProgress) return;
    triggerManualSync();
  };
  
  return (
    <button
      onClick={handleClick}
      disabled={!isConnected || syncInProgress}
      className={`flex items-center space-x-2 px-3 py-1 rounded-lg border ${getStatusColor()} transition-colors ${className} ${isConnected && !syncInProgress ? 'hover:bg-opacity-80 cursor-pointer' : 'cursor-default'}`}
    >
      {getStatusIcon()}
      <div className="flex flex-col items-start">
        <span className="text-xs font-jp-medium">{getStatusText()}</span>
        {lastSyncTime && (
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