# Local GGUF Chat Web UI (Step 1)

このプロジェクトは、ローカルPC上で動作するGGUF推論エンジン（Ollama または llama.cpp）のAPIに接続し、WebブラウザからローカルのGPU/CPUパワーを利用してチャットを行うための静的Webフロントエンドです。
ビルドツールは不要で、`index.html` を直接ブラウザで開くだけで動作します。

---

## 準備手順

ブラウザからローカルAPIへ接続するためには、**CORS（オリジン間リソース共有）制限を許可してローカルサーバーを起動する**必要があります。

### 方法 A: Ollama を使用する場合

#### 1. CORSを有効にしてOllamaを起動する
OSに応じて以下のコマンドを実行し、Ollamaを起動します。

*   **Windows (PowerShell):**
    ```powershell
    $env:OLLAMA_ORIGINS="*"
    ollama serve
    ```
    *(注: タスクトレイにすでにOllamaの常駐アイコンがある場合は、右クリックして「Quit Ollama」で一旦終了してからコマンドを実行してください)*

*   **macOS / Linux (Terminal):**
    ```bash
    OLLAMA_ORIGINS="*" ollama serve
    ```

#### 2. モデルをダウンロードする（未ダウンロードの場合）
別のターミナルを開き、使用したいモデルをプルします。
```bash
ollama pull qwen2.5:0.5b
# または
ollama pull gemma2:2b
```

---

### 方法 B: llama.cpp を使用する場合

`llama-server` (または `server` バイナリ) を起動する際、`--cors` フラグを追加します。

```bash
./llama-server -m your_model.gguf --port 8080 --cors
```

---

## アプリケーションの起動方法

1. このフォルダ内の `index.html` を任意のWebブラウザ（Chrome、Edge、Safari、Firefoxなど）で開きます。
2. 画面左側の「接続設定」から、起動したエンジンの種類（Ollama / llama.cpp）を選択し、接続先URLが正しいことを確認します。
3. 「モデル一覧を取得」ボタンを押し、プルダウンメニューから起動しているモデルを選択します。
4. パラメータ（Temperature等）を必要に応じて調整し、メッセージを入力してチャットを開始してください。
