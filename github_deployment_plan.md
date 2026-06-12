# GitHub Pages への公開・デプロイ手順

この計画書は、現在ローカルで完成しているWllama（GGUF）ブラウザチャット環境を GitHub にアップロードし、全世界に一般公開するための手順書です。

## 📋 デプロイ計画の概要

このチャットアプリはサーバーを持たない**静的Webサイト**（HTML, CSS, JSのみ）であるため、**GitHub Pages**という無料機能を利用してデプロイします。
モデルファイル（GGUF）は Hugging Face からブラウザが直接ダウンロードするため、GitHubリポジトリに巨大なモデルファイルを置く必要はありません。
ローカル専用ファイル（Ollama設定ファイルやローカルチャット用のコード）は、作成済みの `.gitignore` によって自動的にGit管理から除外されるため、公開用ファイルのみが安全にプッシュされます。

---

## 🛠️ 公開手順詳細

### ステップ1: ローカルリポジトリの初期化
コマンドプロンプトやPowerShellでプロジェクトフォルダ（`D:\Claude-Knowledge\P06_LLM`）を開き、以下のコマンドを順番に実行します。

1. **Gitの初期化:**
   ```bash
   git init
   ```
2. **すべての公開用ファイルをステージング:**
   ```bash
   git add .
   ```
   *※ `.gitignore` により、`index_local.html` などのローカル専用ファイルは自動的に除外されます。*
3. **コミットの作成:**
   ```bash
   git commit -m "feat: WllamaによるGGUF自動ロード・チャット機能の追加"
   ```

---

### ステップ2: GitHub上に新しいリポジトリを作成
1. ブラウザで [GitHub](https://github.com/) にサインインします。
2. 画面右上の「**+**」ボタンから「**New repository**」を選択します。
3. 以下の設定を行い、リポジトリを作成します：
   - **Repository name**: `gguf-chat` (お好みの名前で構いません)
   - **Public / Private**: `Public` (GitHub Pagesの無料利用にはPublicにする必要があります)
   - **Initialize repository with**: すべて未チェック（空のリポジトリを作ります）

---

### ステップ3: コードのプッシュ
GitHubでリポジトリを作成すると、接続用コマンドが表示されます。
ローカルのターミナルに戻り、以下のコマンドを実行してコードを送信します：

1. **メインブランチ名を `main` に設定:**
   ```bash
   git branch -M main
   ```
2. **リモートリポジトリ（GitHub）の登録:**
   ```bash
   git remote add origin https://github.com/【ユーザー名】/gguf-chat.git
   ```
   *※ `【ユーザー名】` はご自身のGitHubユーザー名に置き換えてください。*
3. **プッシュを実行:**
   ```bash
   git push -u origin main
   ```
   *※ このとき、Gitの認証ポップアップが表示されます。画面の指示に従ってGitHubアカウントでサインイン（Authorize）してください。*

---

### ステップ4: GitHub Pagesの有効化（一般公開）
1. 作成したGitHubリポジトリのWebページを開きます。
2. タブメニューから「⚙️ **Settings**」をクリックします。
3. 左サイドバーの「**Code and automation**」セクション内にある「**Pages**」をクリックします。
4. **Build and deployment** の設定で、以下を選択します：
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` ブランチ、フォルダは `/ (root)`
5. 「**Save**」をクリックします。

数分待つと、ページ上部に以下のような公開用のURLが自動生成されて表示されます：
👉 `https://【ユーザー名】.github.io/gguf-chat/`

このURLにアクセスするだけで、誰でも即座にGGUFチャットを使用できるようになります！
