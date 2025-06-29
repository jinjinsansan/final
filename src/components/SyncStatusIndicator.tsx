import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { useSupabase } from '../hooks/useSupabase';

interface SyncStatusIndicatorProps {
  className?: string;
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ className = '' }) => {
  const { isConnected } = useSupabase();
  const [timeSinceSync, setTimeSinceSync] = useState<string>('');
  const [syncInProgress, setSyncInProgress] = useState(false);
  
  // 最終同期時間からの経過時間を計算
  useEffect(() => {
    const updateTimeSinceSync = () => {
      const lastSyncTime = localStorage.getItem('last_sync_time') || '';
      if (!lastSyncTime) {
        setTimeSinceSync('未同期');
        return;
      }
      
      // 相対時間を計算
      const lastSync = new Date(lastSyncTime);
      const now = new Date();
      const diffMs = now.getTime() - lastSync.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffDays > 0) {
        setTimeSinceSync(`${diffDays}日前`);
      } else if (diffHours > 0) {
        setTimeSinceSync(`${diffHours}時間前`);
      } else if (diffMins > 0) {
        setTimeSinceSync(`${diffMins}分前`);
      } else {
        setTimeSinceSync('たった今');
      }
    };
    
    updateTimeSinceSync();
    const interval = setInterval(updateTimeSinceSync, 60000); // 1分ごとに更新
    
    return () => clearInterval(interval);
  }, []);
  
  // 同期状態に基づいて表示を変更
  const getStatusColor = () => {
    if (!isConnected) return 'bg-gray-100 text-gray-600 border-gray-200';
    if (syncInProgress) return 'bg-blue-100 text-blue-600 border-blue-200 animate-pulse';
    
    // 最終同期時間から6時間以上経過している場合は警告表示
    const lastSyncTime = localStorage.getItem('last_sync_time') || '';
    if (lastSyncTime) {
      const lastSync = new Date(lastSyncTime);
      const now = new Date();
      const diffHours = Math.floor((now.getTime() - lastSync.getTime()) / (1000 * 60 * 60));
      
      if (diffHours > 6) {
        return 'bg-yellow-100 text-yellow-600 border-yellow-200';
      }
    }
    
    return 'bg-green-100 text-green-600 border-green-200';
  };
  
  const getStatusIcon = () => {
    if (syncInProgress) return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (!isConnected) return <AlertTriangle className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };
  
  const getStatusText = () => {
    if (syncInProgress) return '同期中...';
    if (!isConnected) return 'オフラインモード';
    return '同期済み';
  };
  
  return (
    <button
      disabled={true}
      className={`flex items-center space-x-2 px-3 py-1 rounded-lg border ${getStatusColor()} transition-colors ${className} cursor-default`}
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
            <span>同期履歴なし</span>
          </div>
        )}
      </div>
    </button>
  );
};

export default SyncStatusIndicator;