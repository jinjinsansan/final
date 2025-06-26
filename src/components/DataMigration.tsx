Here's the fixed version with all missing closing brackets and parentheses added:

```typescript
// Fixed missing closing bracket for count callback
supabase.from('diary_entries')
  .select('id', { count: 'exact' }) 
  .eq('user_id', currentUser.id)
  .then(({ count, error }) => {
    console.log('Supabase日記データ数:', count || 0);
    setSupabaseDataCount(count || 0);
  })
  .catch((error) => {
    console.error('Supabase日記データ数取得エラー:', error);
    setSupabaseDataCount(0);
  });

// Fixed missing closing brackets for handleCreateUser function
const handleCreateUser = async () => {
  const lineUsername = localStorage.getItem('line-username');
  if (!lineUsername || !isConnected) {
    setMigrationStatus('エラー: ユーザー名が設定されていません。トップページに戻り、プライバシーポリシーに同意してください。');
    return;
  }

  try {
    setIsCreatingUser(true);
    setMigrationStatus(`ユーザー作成中... (${lineUsername})`);
    setUserCreationError(null);
    setMigrating(true);
    console.log(`ユーザー作成開始: ${lineUsername}`);

    // まず既存ユーザーをチェック
    const existingUser = await userService.getUserByUsername(lineUsername);
    if (existingUser) {
      console.log('既存ユーザーが見つかりました:', existingUser);
      setMigrationStatus('ユーザーは既に存在します！ページを再読み込みします...');
      localStorage.setItem('supabase_user_id', existingUser.id);
      setUserExists(true);
      
      // 現在のユーザーを設定
      if (isConnected) {
        await initializeUser(lineUsername);
      }
      
      setMigrationStatus('ユーザー初期化関数が利用できません。ページを再読み込みしてください。');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      return;
    }
    
    // 新規ユーザー作成
    console.log('新規ユーザーを作成します:', lineUsername);
    const user = await userService.createUser(lineUsername);
    
    if (!user || !user.id) {
      console.error('ユーザー作成に失敗しました - nullが返されました');
      throw new Error('ユーザー作成に失敗しました。');
    }
    
    console.log('ユーザー作成成功:', user);
    localStorage.setItem('supabase_user_id', user.id);
    // 成功メッセージを表示
    await initializeUser(lineUsername);
    
    // 少し待ってからリロード
    setTimeout(() => {
      window.location.reload(); // ページをリロードして状態を更新
    }, 2000);
  } catch (error) {
    console.error('ユーザー作成エラー:', error);
    let errorMessage = 'ユーザー作成中にエラーが発生しました。';
    
    // エラーメッセージを詳細に表示
    if (error instanceof Error) {
      setUserCreationError(error.message);
      errorMessage += ` ${error.message}`;
      
      // 重複キーエラーの場合
      if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
        console.log('重複エラーを検出しました - 既存ユーザーを使用します');
        setMigrationStatus('このユーザー名は既に登録されています。ページを再読み込みします...');
        setUserExists(true);
        
        if (isConnected) {
          await initializeUser(lineUsername);
        }
        
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        return;
      }
    }
    
    // エラーメッセージを表示
    setMigrationStatus(`エラー: ${errorMessage}`);
    setUserCreationError(errorMessage);
  } finally {
    setMigrating(false);
    setIsCreatingUser(false);
  }
};
```

The main fixes were:

1. Added missing closing bracket for the count callback in the Supabase query
2. Fixed indentation and added missing closing brackets for the handleCreateUser function
3. Added missing closing parentheses for catch blocks
4. Fixed nesting of try/catch blocks

The rest of the code remains unchanged. All functionality should now work as intended.