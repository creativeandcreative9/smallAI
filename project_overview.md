# プロジェクト概要 & 引き継ぎ資料

このファイルは、本プロジェクト（WebGPU & GGUF Local Chat）の構成と、Antigravity（または他のAI・開発者）が続きの作業を再開するための状態をまとめた資料です。

---

## 📂 フォルダ構成とファイルの役割

プロジェクトフォルダは現在、**「GitHub Pages公開用（WebGPU）」**と**「ローカル検証用（GGUF localhost）」**の2つの環境を共存させて維持しています。

```
D:\Claude-Knowledge\P06_LLM\
│
├── 🌐 GitHub公開用 / WebGPU環境 (サーバー不要)
│   ├── index.html       <- WebGPU用チャットUI (メイン)
│   ├── app.js           <- WebGPU/WebLLM用メイン処理 (ESモジュール)
│   ├── style.css        <- WebGPU用UIスタイルシート
│   └── worker.js        <- WebLLM推論処理を別スレッドで走らせる Worker スクリプト
│
├── 💻 ローカル環境 / GGUF・Ollama環境 (要ローカルサーバー)
│   ├── index_local.html <- 従来のローカルサーバー接続用UI (復元済み)
│   ├── app_local.js     <- 従来のローカルOllama接続用処理 (復元済み)
│   └── style_local.css  <- 従来のローカル接続用スタイルシート (復元済み)
│
├── ⚙️ 設定・スクリプト
│   ├── .gitignore       <- ローカル環境ファイルをGitHubプッシュから除外する設定
│   ├── README.md        <- ローカルGGUFチャットの準備・起動手順書
│   ├── github_deployment_plan.md <- GitHubデプロイ手順書
│   ├── GGUFチャット起動.bat       <- ローカル起動用バッチ
│   ├── Modelfile        <- 各種Ollamaモデル作成用スクリプト群
│   └── res.txt          <- ローカル推論の検証結果メモ
```

---

## 🛠️ 各環境の動かし方

### A. WebGPU環境（GitHub公開用・完全ブラウザ完結）
*   **起動方法**: 本ファイルをローカルで動かす場合、WebGPUのセキュリティ仕様上、直接ファイルをダブルクリックするのではなく、ローカルWebサーバー（PythonやVS CodeのLive Serverなど）を介して開く必要があります。
    *   例: `python -m http.server 8085` を実行し、`http://localhost:8085` にアクセスする。
*   **特徴**: 
    *   ブラウザ側で `CreateWebWorkerMLCEngine` を使ってモデル（Gemma 2 2BやQwen 0.5Bなど）を IndexedDB にダウンロード・キャッシュし、ブラウザ上で推論します。
    *   初回のみダウンロード待ちが発生しますが、次回以降はインターネットが切れていても起動します。

### B. ローカル接続環境（Ollama / llama.cpp 接続用）
*   **起動方法**: `index_local.html` をブラウザで直接ダブルクリックで開くだけで起動します。
*   **特徴**:
    *   これまで動作させていた技術検証用の環境そのものです。
    *   事前に Ollama などを起動（CORS制限を解除した状態）しておき、そこからモデル一覧を取得してチャットを行います。

---

## 📝 完了した作業
1.  **WebGPUチャットの実装**: `index.html` / `app.js` / `style.css` / `worker.js` の新規作成および書き換え。
2.  **WebGPU動作検証**: Qwen 2.5 0.5B モデルをロードし、ブラウザ内でローカル推論が動作することを確認（応答生成を確認済み）。
3.  **ローカル環境の完全分離と復元**: `index_local.html` / `app_local.js` / `style_local.css` の作成による、これまでのOllama接続チャット機能の維持。
4.  **`.gitignore` の設定**: ローカル用のコードやバッチ、Modelfileを誤ってGitHubにプッシュしないように保護。

---

## 🚀 続きの作業を行う場合（Antigravityへの指示）

作業を再開する場合、以下のステップに沿って進めてください。

1.  **GitHubデプロイのサポート**:
    *   `github_deployment_plan.md` に従って、ユーザーがローカルリポジトリを初期化し、GitHubにプッシュして GitHub Pages を有効化するプロセスをサポートしてください。
    *   ユーザーにリポジトリが作成されたら、リモートを追加してプッシュするコマンドの実行代行などを進めます。
2.  **デプロイ後の検証**:
    *   GitHub Pages 上で公開されたページを開き、モデルのダウンロードとチャット動作がオンラインでも問題なく実行できるかをテストします。
