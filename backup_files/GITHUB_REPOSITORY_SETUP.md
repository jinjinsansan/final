# GitHub リポジトリ設定ガイド

## 🚀 リポジトリ作成手順

### 1. リポジトリの作成
1. GitHub にログイン
2. 右上の「+」ボタン → 「New repository」をクリック
3. 以下の情報を入力:
   - Repository name: `kanjou-nikki`
   - Description: `感情日記アプリ - 自己肯定感を育てるテープ式心理学アプリ`
   - Visibility: Private（推奨）または Public
   - README: チェックを外す
4. 「Create repository」をクリック

### 2. ローカルリポジトリの初期化

```bash
# プロジェクトディレクトリに移動
cd /path/to/your/project

# Git初期化
git init

# .gitignoreファイルを作成
cat > .gitignore << EOL
node_modules/
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
dist/
.DS_Store
*.log
.vscode/
.idea/
EOL

# ファイルをステージング
git add .

# 初回コミット
git commit -m "初回コミット: 感情日記アプリ - 完全版"

# リモートリポジトリを追加
git remote add origin https://github.com/YOUR_USERNAME/kanjou-nikki.git

# プッシュ
git branch -M main
git push -u origin main
```

## 📋 リポジトリ設定

### 1. ブランチ保護ルール
1. リポジトリの「Settings」→「Branches」→「Branch protection rules」→「Add rule」
2. 以下の設定を推奨:
   - Branch name pattern: `main`
   - Require pull request reviews before merging: ✓
   - Require status checks to pass before merging: ✓
   - Require branches to be up to date before merging: ✓

### 2. コラボレーターの追加
1. リポジトリの「Settings」→「Manage access」
2. 「Invite a collaborator」をクリック
3. ユーザー名またはメールアドレスを入力して招待

### 3. GitHub Actions の設定
`.github/workflows/deploy.yml` ファイルを作成:

```yaml
name: Deploy to Netlify

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    - name: Install dependencies
      run: npm install
    - name: Build
      run: npm run build
      env:
        VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
        VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
    - name: Deploy to Netlify
      uses: nwtgck/actions-netlify@v1.2
      with:
        publish-dir: './dist'
        production-branch: main
      env:
        NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
        NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

### 4. シークレットの設定
1. リポジトリの「Settings」→「Secrets and variables」→「Actions」
2. 「New repository secret」をクリック
3. 以下のシークレットを追加:
   - `VITE_SUPABASE_URL`: Supabase URL
   - `VITE_SUPABASE_ANON_KEY`: Supabase Anon Key
   - `NETLIFY_AUTH_TOKEN`: Netlify認証トークン
   - `NETLIFY_SITE_ID`: NetlifyサイトID

## 📝 Issue・PR テンプレート

### Issue テンプレート
`.github/ISSUE_TEMPLATE/feature_request.md`:

```markdown
---
name: 機能リクエスト
about: 新機能のアイデアを提案
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

## 機能の説明
どのような機能が欲しいか簡潔に説明してください。

## 解決する問題
この機能がどのような問題を解決するか説明してください。

## 提案する実装方法
機能の実装方法について、あなたのアイデアを共有してください。

## 代替案
検討した代替案があれば記載してください。

## その他の情報
機能リクエストに関連するスクリーンショットや追加情報があれば追加してください。
```

`.github/ISSUE_TEMPLATE/bug_report.md`:

```markdown
---
name: バグレポート
about: バグを報告する
title: '[BUG] '
labels: bug
assignees: ''
---

## バグの説明
バグの内容を簡潔に説明してください。

## 再現手順
1. '...' に移動
2. '...' をクリック
3. '...' まで下にスクロール
4. エラーを確認

## 期待される動作
何が起こるべきだったかを説明してください。

## スクリーンショット
可能であれば、問題を説明するスクリーンショットを追加してください。

## 環境
- OS: [例: iOS]
- ブラウザ: [例: chrome, safari]
- バージョン: [例: 22]
```

### PR テンプレート
`.github/pull_request_template.md`:

```markdown
## 変更内容
この PR で何を変更したかを説明してください。

## 変更の種類
- [ ] バグ修正
- [ ] 新機能
- [ ] 破壊的変更
- [ ] ドキュメント更新

## テスト
- [ ] 既存のテストが通ることを確認
- [ ] 新しいテストを追加（該当する場合）

## チェックリスト
- [ ] コードレビューの準備ができている
- [ ] 自己レビューを実施済み
- [ ] 関連するドキュメントを更新済み
```

## 🔄 ブランチ戦略

### 推奨ブランチ戦略
- `main`: 本番環境用。直接コミットは禁止し、PRを通してのみ更新
- `develop`: 開発環境用。機能開発の統合先
- `feature/*`: 新機能開発用。developからブランチを切り、完了後developにマージ
- `bugfix/*`: バグ修正用
- `hotfix/*`: 緊急のバグ修正用。mainから直接ブランチを切り、mainとdevelopの両方にマージ

### コミットメッセージの規約
```
feat: 新機能
fix: バグ修正
docs: ドキュメントのみの変更
style: コードの意味に影響を与えない変更（空白、フォーマット、セミコロンの欠落など）
refactor: バグ修正や機能追加ではないコード変更
perf: パフォーマンスを向上させるコード変更
test: 不足しているテストの追加や既存のテストの修正
chore: ビルドプロセスやドキュメント生成などの変更
```

## 📊 プロジェクト管理

### GitHub Projects の設定
1. リポジトリの「Projects」タブ
2. 「Create a project」をクリック
3. 以下のカラムを設定:
   - To do
   - In progress
   - Review
   - Done

### ラベルの設定
1. リポジトリの「Issues」→「Labels」
2. 以下のラベルを追加:
   - `bug`: バグ
   - `enhancement`: 機能追加・改善
   - `documentation`: ドキュメント
   - `good first issue`: 初心者向け
   - `help wanted`: 助けが必要
   - `question`: 質問
   - `wontfix`: 修正予定なし

## 🔒 セキュリティ設定

### Dependabot の設定
`.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

### CodeQL の設定
1. リポジトリの「Security」→「Code scanning」→「Set up code scanning」
2. 「GitHub Actions (CodeQL Analysis)」を選択
3. 「Configure CodeQL Analysis」をクリック

## 🚀 最終確認

- [ ] リポジトリが正しく作成されている
- [ ] .gitignoreが適切に設定されている
- [ ] READMEが適切に作成されている
- [ ] ブランチ保護ルールが設定されている
- [ ] Issue・PRテンプレートが設定されている
- [ ] GitHub Actionsが設定されている
- [ ] シークレットが設定されている
- [ ] Dependabotが設定されている

---

**一般社団法人NAMIDAサポート協会**  
テープ式心理学による心の健康サポート

**最終更新日**: 2025年1月25日