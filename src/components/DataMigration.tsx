import React, { useState, useEffect } from 'react';
import { Database, Upload, Download, RefreshCw, CheckCircle, AlertTriangle, Shield, Info, Save } from 'lucide-react';
import { supabase, userService, syncService } from '../lib/supabase';
import { useSupabase } from '../hooks/useSupabase';
import { getCurrentUser } from '../lib/deviceAuth';

const DataMigration: React.FC = () => {
  const [localDataCount, setLocalDataCount] = useState(0);
  const [supabaseDataCount, setSupabaseDataCount] = useState(0);
  const [migrating, setMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string>('');
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userExists, setUserExists] = useState(false);
  const [userCreationError, setUserCreationError] = useState<string | null>(null);
  const [syncDirection, setSyncDirection] = useState<'local-to-supabase' | 'supabase-to-local'>('local-to-supabase');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(true);
  const [backupInProgress, setBackupInProgress] = useState(false);

  // 全体のデータ数を保持する状態
  const [totalLocalDataCount, setTotalLocalDataCount] = useState(0);
  const [totalSupabaseDataCount, setTotalSupabaseDataCount] = useState(0);

  const { isConnected, currentUser, initializeUser } = useSupabase();

  useEffect(() => {
    loadData();
    
    // 自動同期設定を読み込み
    const autoSyncSetting = localStorage.getItem('auto_sync_enabled');
    setAutoSyncEnabled(autoSyncSetting !== 'false'); // デフォルトはtrue

    // カウンセラーとしてログインしているかチェック
    const counselorName = localStorage.getItem('current_counselor');
    if (counselorName) {
      setIsAdminMode(true);
      console.log('管理者モードで動作中:', counselorName);
    }
  }, []);

  // ... (rest of the component code)

  return (
    <div className="space-y-6">
      {/* ... (rest of the JSX) */}
    </div>
  );
};

export default DataMigration;