# かんじょうにっき - GitHub連携後の開発継続プロンプト

## 🚀 プロジェクト復元手順

### 1. GitHubからのクローン後の初期設定
```bash
# 依存関係のインストール
npm install

# 環境変数ファイルの作成
cp .env.example .env
# .envファイルを編集してSupabaseとLINE認証の設定を追加

# 開発サーバーの起動
npm run dev
```

## 📋 現在の開発状況（2025年1月21日時点）

### ✅ 完成済み機能
- **感情日記システム**: 作成・編集・削除・検索機能
- **無価値感推移グラフ**: データ可視化とSNSシェア
- **カウンセラー管理画面**: 
  - 日記管理・高度検索・カレンダー検索
  - カウンセラーメモ機能
  - 担当者割り当て・緊急度管理
- **🆕 自動同期システム**: ローカル↔Supabase自動同期
- **🆕 同意履歴管理**: プライバシーポリシー同意の完全追跡
- **🆕 LINE認証対応**: セキュアな認証システム（環境変数で制御）
- **🆕 デバイス認証システム**: PIN番号認証、秘密の質問、セキュリティダッシュボード
- **メンテナンスモード**: システム保守時の適切な案内
- **レスポンシブデザイン**: 全デバイス対応

### 🔧 技術スタック
- React + TypeScript + Vite
- Tailwind CSS
- Supabase (PostgreSQL)
- LINE認証 + カスタム認証
- Netlify (デプロイ)

## ⚠️ 重要な制約事項
```
# Bolt への指示
- pages ディレクトリ以外は変更しないこと
- Tailwind 設定ファイルに手を加えないこと
- 新しい依存パッケージはインストールしないこと
- supabase/migrations/ 内のファイルは変更しないこと
```

## 🗄️ データベース構成
- **users**: ユーザー情報
- **diary_entries**: 日記エントリー
- **counselors**: カウンセラー情報
- **chat_rooms**: チャットルーム
- **messages**: メッセージ
- **consent_histories**: 同意履歴（新規追加）

## 👥 カウンセラーアカウント
| 名前 | メールアドレス | パスワード |
|------|----------------|------------|
| 仁カウンセラー | jin@namisapo.com | counselor123 |
| AOIカウンセラー | aoi@namisapo.com | counselor123 |
| あさみカウンセラー | asami@namisapo.com | counselor123 |
| SHUカウンセラー | shu@namisapo.com | counselor123 |
| ゆーちゃカウンセラー | yucha@namisapo.com | counselor123 |
| sammyカウンセラー | sammy@namisapo.com | counselor123 |

## 🔧 環境変数設定
```env
# Supabase設定（必須）
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# LINE認証設定（オプション）
# LINE認証は削除済み

# メンテナンスモード設定（オプション）
VITE_MAINTENANCE_MODE=false
VITE_MAINTENANCE_MESSAGE=システムメンテナンス中です
VITE_MAINTENANCE_END_TIME=2025-01-22T10:00:00Z
```

## 🆕 新機能の詳細

### 自動同期システム
- **場所**: `src/hooks/useAutoSync.ts`, `src/components/AutoSyncSettings.tsx`
- **機能**: 
  - アプリ起動時の自動ユーザー作成・確認
  - 5分間隔でのローカルデータ自動同期
  - 手動同期オプション
  - エラーハンドリングと状態表示
- **使用方法**: `src/App.tsx`で`useAutoSync()`フックを呼び出し済み

### 同意履歴管理
- **場所**: `src/components/ConsentHistoryManagement.tsx`
- **機能**:
  - プライバシーポリシー同意の完全追跡
  - 法的要件に対応した履歴保存
  - CSV出力機能
  - 管理画面での一覧・検索機能
- **データ**: `consent_histories`テーブルとローカルストレージ

### LINE認証システム
- **削除済み**: デバイス認証システムを使用

## 📁 重要なファイル構成

### 新規追加されたファイル
```
src/
├── hooks/
│   └── useAutoSync.ts              # 自動同期フック
├── components/
│   ├── AutoSyncSettings.tsx       # 自動同期設定UI
│   └── ConsentHistoryManagement.tsx # 同意履歴管理UI
```

### 主要な変更があったファイル
```
src/
├── App.tsx                         # 自動同期フック追加、UI改善
├── lib/supabase.ts                 # 同意履歴サービス追加
├── hooks/useSupabase.ts            # 自動同期対応
├── components/
│   ├── DataMigration.tsx           # 自動同期タブ追加
│   └── PrivacyConsent.tsx          # 同意履歴記録機能追加
├── hooks/useMaintenanceStatus.ts   # パフォーマンス改善
└── lib/deviceAuth.ts               # デバイス認証システム
```

## 🎯 開発継続時の注意点

### 1. 自動同期機能
- `useAutoSync`フックは既に`App.tsx`で呼び出し済み
- ユーザーがアプリを開くと自動的にSupabaseユーザーが作成される
- 5分間隔で自動同期が実行される
- 手動での操作は基本的に不要

### 2. 同意履歴管理
- プライバシーポリシー同意時に自動的に履歴が記録される
- 管理画面の「カウンセラー」タブから履歴を確認可能
- CSV出力機能で法的要件に対応

### 3. LINE認証
- 削除済み（デバイス認証システムを使用）

## 🔄 データフロー

### 自動同期フロー
1. アプリ起動 → `useAutoSync`フック実行
2. Supabase接続確認 → ユーザー存在確認
3. ユーザー未存在の場合 → 自動作成
4. ローカルデータ存在確認 → 自動同期実行
5. 5分間隔で定期同期実行

### 同意履歴フロー
1. プライバシーポリシー表示 → ユーザー同意/拒否
2. 同意履歴をローカルストレージに記録
3. 自動同期により Supabase に同期
4. 管理画面で履歴確認・CSV出力

## 🚀 デプロイ設定

### Netlify設定
- **ビルドコマンド**: `npm run build`
- **公開ディレクトリ**: `dist`
- **環境変数**: 上記の環境変数を設定
- **リダイレクト**: `netlify.toml`で設定済み

### 環境変数の優先度
1. Netlify環境変数（本番）
2. `.env`ファイル（開発）
3. `.env.example`（テンプレート）

## 🔍 トラブルシューティング

### よくある問題
1. **Supabase接続エラー**: 環境変数の確認
2. **自動同期が動作しない**: ブラウザのコンソールでエラー確認
3. **カウンセラーログインできない**: パスワード`counselor123`を確認
4. **LINE認証エラー**: 環境変数とリダイレクトURIを確認

### デバッグ方法
- 開発環境では詳細なログが出力される
- `localStorage`の内容を確認
- Supabaseダッシュボードでデータ確認

## 📞 サポート情報

- **開発者**: 一般社団法人NAMIDAサポート協会
- **メール**: info@namisapo.com
- **技術スタック**: React + TypeScript + Supabase
- **デプロイ**: Netlify

---

## 🎯 次回開発時の推奨アクション

1. **環境確認**: `npm run dev`でローカル環境が正常に動作することを確認
2. **Supabase接続**: 環境変数を設定してSupabase接続を確認
3. **自動同期テスト**: 新しいユーザーでアプリを開いて自動同期をテスト
4. **機能テスト**: 日記作成、検索、管理画面の動作確認
5. **新機能開発**: 既存の制約事項を守りながら新機能を追加

このプロンプトを使用することで、GitHub連携後に完全な状態でプロジェクトを復元し、開発を継続できます。