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
    if (isConnected && !hasInitializedRef.current) {
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
      let user = await userService.getUserByUsername(lineUsername);
      
      if (!user) {
        if (import.meta.env.DEV) {
          console.log('ユーザーが存在しないため、自動作成します');
        }
        
        try {
          logSecurityEvent('auto_sync_create_user', lineUsername, 'ユーザーが存在しないため、自動作成します');
        } catch (logError) {
          console.error('セキュリティログ記録エラー:', logError);
        }
        
        user = await userService.createUser(lineUsername);
        
        if (user) {
          setStatus(prev => ({ ...prev, userCreated: true }));
          // ユーザー作成後、アプリの状態を更新
          if (initializeUser) {
            await initializeUser(lineUsername); 
          }
        }
      } else {
        setStatus(prev => ({ ...prev, userCreated: true }));
      }

      // 2. 自動同期が有効な場合のみデータ同期
      if (status.isAutoSyncEnabled && user) {
        await performAutoSync(user.id);
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
    try {
      // ローカルデータの存在確認
      const localEntries = localStorage.getItem('journalEntries');
      const localConsents = localStorage.getItem('consent_histories');
      
      let syncPerformed = false;

      // 日記データの同期
      if (localEntries) {
        const entries = JSON.parse(localEntries);
        if (entries.length > 0) {
          await syncService.migrateLocalData(userId);
          syncPerformed = true;
          if (import.meta.env.DEV) {
            console.log('日記データを自動同期しました');
          }
        }
      }

      // 同意履歴の同期
      if (localConsents) {
        const consents = JSON.parse(localConsents);
        if (consents.length > 0) {
          await syncService.syncConsentHistories();
          syncPerformed = true;
          if (import.meta.env.DEV) {
            console.log('同意履歴を自動同期しました');
          }
        }
      }

      if (syncPerformed) {
        const now = new Date().toISOString();
        localStorage.setItem('last_sync_time', now);
        
        try {
          logSecurityEvent('auto_sync_completed', userId, '自動同期が完了しました');
        } catch (error) {
          console.error('セキュリティログ記録エラー:', error);
        }
        
        setStatus(prev => ({ ...prev, lastSyncTime: now }));
      }

    } catch (error) {
      console.error('自動同期エラー:', error);
      setStatus(prev => ({ 
        ...prev, 
        syncError: error instanceof Error ? error.message : '同期に失敗しました'
      }));
    }
  };

  // 自動同期の有効/無効切り替え
  const toggleAutoSync = (enabled: boolean) => {
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
      performAutoSync(currentUser.id);
    }
  };

  // 手動同期実行
  const triggerManualSync = async () => {
    if (!isConnected || !currentUser) {
      throw new Error('Supabaseに接続されていないか、ユーザーが設定されていません');
    }
    
    setStatus(prev => ({ ...prev, syncInProgress: true, syncError: null }));
    
    try {
      await performAutoSync(currentUser.id);
      
      try {
        const user = getCurrentUser();
        logSecurityEvent('manual_sync_triggered', user?.lineUsername || currentUser.id, '手動同期が実行されました');
      } catch (error) {
        console.error('セキュリティログ記録エラー:', error);
      }
      
    } finally {
      setStatus(prev => ({ ...prev, syncInProgress: false }));
    }
  };

  // 定期同期の設定（5分間隔）
  useEffect(() => {    
    if (status.isAutoSyncEnabled && isConnected && currentUser) {
      // 前回のタイマーをクリア
      if (syncTimeoutRef.current) {
        clearInterval(syncTimeoutRef.current);
      }
      
      syncTimeoutRef.current = setInterval(() => {
        performAutoSync(currentUser.id);
      }, 5 * 60 * 1000); // 5分

      return () => {
        if (syncTimeoutRef.current) {
          clearInterval(syncTimeoutRef.current);
        }
      };
    } else if (syncTimeoutRef.current) {
      clearInterval(syncTimeoutRef.current);
    }
  }, [status.isAutoSyncEnabled, isConnected, currentUser]);

  return {
    ...status,
    toggleAutoSync,
    triggerManualSync,
    isConnected,
    currentUser
  };
};