# GitHub移行用バックアップファイル一覧

## 主要ファイル

### 設定ファイル
- `.env.example` - 環境変数設定例
- `package.json` - 依存関係
- `tsconfig.json` - TypeScript設定
- `tsconfig.app.json` - アプリケーション用TypeScript設定
- `tsconfig.node.json` - Node.js用TypeScript設定
- `vite.config.ts` - Vite設定
- `eslint.config.js` - ESLint設定
- `postcss.config.js` - PostCSS設定
- `tailwind.config.js` - Tailwind CSS設定
- `netlify.toml` - Netlify設定

### ソースコード
- `src/App.tsx` - メインアプリケーション
- `src/main.tsx` - エントリーポイント
- `src/index.css` - グローバルスタイル
- `src/vite-env.d.ts` - Vite環境定義

### コンポーネント
- `src/components/` - 共通コンポーネント
  - `AdminPanel.tsx` - 管理画面
  - `AdvancedSearchFilter.tsx` - 検索フィルター
  - `AutoSyncSettings.tsx` - 自動同期設定
  - `Chat.tsx` - チャットコンポーネント
  - `ConsentHistoryManagement.tsx` - 同意履歴管理
  - `CounselorChat.tsx` - カウンセラーチャット
  - `CounselorManagement.tsx` - カウンセラー管理
  - `DataBackupRecovery.tsx` - データバックアップ・復元
  - `DataCleanup.tsx` - テストデータ削除
  - `DataMigration.tsx` - データ移行
  - `DeviceAuthLogin.tsx` - デバイス認証ログイン
  - `DeviceAuthManagement.tsx` - デバイス認証管理
  - `DeviceAuthRegistration.tsx` - デバイス認証登録
  - `MaintenanceController.tsx` - メンテナンスモード制御
  - `MaintenanceMode.tsx` - メンテナンスモード表示
  - `PrivacyConsent.tsx` - プライバシー同意
  - `SecurityDashboard.tsx` - セキュリティダッシュボード
  - `UserDataManagement.tsx` - ユーザーデータ管理
  - `ui/tabs.tsx` - タブコンポーネント

### ページ
- `src/pages/` - ページコンポーネント
  - `DiaryPage.tsx` - 日記ページ
  - `DiarySearchPage.tsx` - 日記検索ページ
  - `EmotionTypes.tsx` - 感情タイプページ
  - `FirstSteps.tsx` - 最初にやることページ
  - `HowTo.tsx` - 使い方ページ
  - `NextSteps.tsx` - 次にやることページ
  - `PrivacyPolicy.tsx` - プライバシーポリシーページ
  - `Support.tsx` - サポートページ
  - `WelcomePage.tsx` - ウェルカムページ
  - `WorthlessnessChart.tsx` - 無価値感推移グラフページ

### ライブラリ
- `src/lib/` - ライブラリ
  - `cleanupTestData.ts` - テストデータ削除ロジック
  - `deviceAuth.ts` - デバイス認証システム
  - `supabase.ts` - Supabase連携
  - `utils.ts` - ユーティリティ関数

### フック
- `src/hooks/` - カスタムフック
  - `useAutoSync.ts` - 自動同期フック
  - `useMaintenanceStatus.ts` - メンテナンス状態フック
  - `useSupabase.ts` - Supabase連携フック

### データベース
- `supabase/migrations/` - Supabaseマイグレーションファイル

### 静的ファイル
- `public/` - 静的ファイル
  - `background.jpg` - 背景画像

## ドキュメント
- `README.md` - プロジェクト概要
- `CHANGELOG.md` - 変更履歴
- `DEPLOYMENT_INFO.md` - デプロイ情報
- `DEVELOPMENT_GUIDE.md` - 開発ガイド
- `GITHUB_MIGRATION_GUIDE.md` - GitHub移行ガイド

## 注意事項
- `.env`ファイルは含まれていません（セキュリティのため）
- `node_modules`は除外されています
- 環境変数は`.env.example`を参考に設定してください
- Supabaseの設定は別途必要です