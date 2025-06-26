import { useState, useEffect, useRef } from 'react';
import { useSupabase } from './useSupabase';
import { userService, syncService, consentService } from '../lib/supabase';
import { getCurrentUser, logSecurityEvent } from '../lib/deviceAuth';

interface AutoSyncStatus {
  isAutoSyncEnabled: boolean;
  lastSyncTime: string | null;
  syncInProgress: boolean;
  syncError: string | null;
  userCreated: boolean;
}

export const useAutoSync = () => {
  const { isConnected, currentUser, initializeUser } = useSupabase();
  const [status, setStatus] = useState<AutoSyncStatus>({
    isAutoSyncEnabled: false,
    lastSyncTime: null,
    syncInProgress: false,
    syncError: null,
    userCreated: false
  });
  
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedRef = useRef(false);

  // 自動同期の設定を読み込み
  useEffect(() => {
    const autoSyncEnabled = localStorage.getItem('auto_sync_enabled') === 'true';
    const lastSync = localStorage.getItem('last_sync_time');
    
    setStatus(prev => ({
      ...prev,
      isAutoSyncEnabled: autoSyncEnabled,
      lastSyncTime: lastSync,
      userCreated: !!currentUser
    }));
  }, [currentUser]);

  // 接続状態が変わった時の自動処理
  useEffect(() => {
    if (isConnected && !hasInitializedRef.current && localStorage.getItem('line-username')) {
      hasInitializedRef.current = true;
      const lineUsername = localStorage.getItem('line-username');
      if (lineUsername) {
        handleAutoInitialization(lineUsername);
      }
    }
  }, [isConnected]);

  // 自動初期化処理
  const handleAutoInitialization = async (lineUsername: string) => {
    try {
      // 開発環境用のモックユーザー
      let user = {
        id: 'mock-user-id',
        line_username: lineUsername,
        created_at: new Date().toISOString()
      };
      
      setStatus(prev => ({ ...prev, userCreated: true }));
      console.log('モックユーザーを使用します:', user);

      // 2. 自動同期が有効な場合のみデータ同期
      if (status.isAutoSyncEnabled && user) {
        console.log('自動同期をシミュレートします');
        const now = new Date().toISOString();
        localStorage.setItem('last_sync_time', now);
        setStatus(prev => ({ ...prev, lastSyncTime: now }));
      }
    } catch (error) {
      console.error('自動初期化エラー:', error);
      setStatus(prev => ({ 
        ...prev, 
        syncError: error instanceof Error ? error.message : '初期化に失敗しました'
      }));
    } finally {
      setStatus(prev => ({ ...prev, syncInProgress: false }));
    }
  };

  // 自動同期実行
  const performAutoSync = async (userId: string) => {
    // 開発環境用のモック同期
    console.log('モック自動同期を実行:', userId);
    
    // 同期完了を記録
    const now = new Date().toISOString();
    localStorage.setItem('last_sync_time', now);
    
    try {
      logSecurityEvent('auto_sync_completed', userId, '自動同期が完了しました');
    } catch (error) {
      console.error('セキュリティログ記録エラー:', error);
    }
    
    setStatus(prev => ({ ...prev, lastSyncTime: now }));
  };

  // 自動同期の有効/無効切り替え
  const toggleAutoSync = async (enabled: boolean) => {
    localStorage.setItem('auto_sync_enabled', enabled.toString());
    
    try {
      const user = getCurrentUser();
      logSecurityEvent('auto_sync_toggled', user?.lineUsername || 'system', `自動同期が${enabled ? '有効' : '無効'}になりました`);
    } catch (error) {
      console.error('セキュリティログ記録エラー:', error);
    }
    
    setStatus(prev => ({ ...prev, isAutoSyncEnabled: enabled }));
    
    if (enabled && isConnected && currentUser) {
      // 即座に同期を実行
      await performAutoSync(currentUser.id);
    }
  };

  // 手動同期実行
  const triggerManualSync = async () => {
    setStatus(prev => ({ ...prev, syncInProgress: true, syncError: null }));
    
    try {
      // 開発環境用のモック手動同期
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const now = new Date().toISOString();
      localStorage.setItem('last_sync_time', now);
      setStatus(prev => ({ ...prev, lastSyncTime: now }));
      
      try {
        const user = getCurrentUser();
        logSecurityEvent('manual_sync_triggered', user?.lineUsername || 'unknown', '手動同期が実行されました');
      } catch (error) {
        console.error('セキュリティログ記録エラー:', error);
      }
      
    } finally {
      setStatus(prev => ({ ...prev, syncInProgress: false }));
    }
  };

  // 定期同期の設定（5分間隔）
  useEffect(() => {    
    if (status.isAutoSyncEnabled) {
      // 前回のタイマーをクリア
      if (syncTimeoutRef.current) {
        clearInterval(syncTimeoutRef.current);
      }
      
      syncTimeoutRef.current = setInterval(() => {
        // 開発環境用のモック定期同期
        const now = new Date().toISOString();
        localStorage.setItem('last_sync_time', now);
        setStatus(prev => ({ ...prev, lastSyncTime: now }));
        console.log('定期自動同期をシミュレート:', now);
      }, 5 * 60 * 1000); // 5分

      return () => {
        if (syncTimeoutRef.current) {
          clearInterval(syncTimeoutRef.current);
        }
      };
    } else if (syncTimeoutRef.current) {
      clearInterval(syncTimeoutRef.current);
    }
  }, [status.isAutoSyncEnabled]);

  return {
    ...status,
    toggleAutoSync,
    triggerManualSync,
    isConnected,
    currentUser
  };
};