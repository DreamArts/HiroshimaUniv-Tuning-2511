# セットアップ手順書

このドキュメントでは、講義で使うアプリケーションを自分のパソコンで動かすまでの手順を説明します。  
難しい言葉は使わずに、「どこで」「何を」「どうすればいいか」がわかるように順番に進めていきましょう。

---

## 今回使うアプリ

今回動かすアプリケーションは、商品の検索機能が備わっているものです。
いくつかの小さな部品（サービス）が組み合わさって動いており、構成要素とそれぞれの役割は下記のとおりです。

| 名前 | 役割 | 説明 |
|------|------|------|
| **frontend** | 表示画面の定義 | ブラウザで見える部分です。 |
| **backend** | 処理 | ユーザーの操作を受け取って処理を行います。 |
| **mysql** | データの保管 | 商品などの情報を保存します。 |
| **nginx** | 割り振り | リクエストを受け取って、指定された場所に割り振ります。 |
| **jaeger** | 計測ツール | どの処理にどのくらい時間がかかっているかを見える化します。 |

---

## アプリのファイル構成

今回のアプリケーションは以下のような構造になっています。  
**コードを変更する際は、この構成を参考にしてください。**

```
広大事前講義/
├── frontend/                  # 画面表示部分（Next.js）
│   └── pages/                 # ページ
│       └── index.js           # メインページ
│
├── backend/                   # サーバー処理部分（Go）
│   ├── cmd/                   # 起動用ファイル
│   │   └── main.go            # アプリの開始点
│   └── internal/              # 実際の処理コード
│       ├── handlers/          # リクエスト処理
│       │   ├── health.go      # ヘルスチェック
│       │   ├── products.go    # 商品一覧取得
│       │   └── search.go      # 商品検索
│       ├── config/            # 設定管理
│       ├── database/          # データベース接続
│       ├── models/            # データ構造定義
│       ├── server/            # サーバー設定
│       └── tracing/           # 計測機能
│
├── mysql/                     # データベース関連
│   ├── init/                  # 初期データ
│   └── conf/                  # MySQL設定
│
├── documents/                 # 説明書類
│   ├── 01_setup.md           # このファイル
│   ├── 02_tracing.md         # Jaeger演習
│   ├── ubuntu_setup.md       # ubuntuのセットアップ
│   └── exercise.md           # 基本演習
│
├── docker-compose.yml         # 全体の設定ファイル
└── nginx/                     # リバースプロキシ設定
```

---

## 1. 事前準備

### Windows

1. **Ubuntu（WSL2）をインストール**  
   [Microsoft Store - Ubuntu](https://apps.microsoft.com/detail/9NZ3KLHXDJP5)  
   「入手」→ インストール → 起動（"Welcome to Ubuntu" が出ればOK）  

   **Ubuntuの初回セットアップ方法はこちら**  
   → [Ubuntu初回設定マニュアル（別ページ）](./ubuntu_setup.md)

2. **Docker Desktopをインストール**  
   [公式サイト](https://www.docker.com/products/docker-desktop/)  
   「Download for Windows」→ インストール → 起動  

3. **VS Code（推奨）**  
   [Visual Studio Code](https://code.visualstudio.com/)  
   ファイルを開いたり、コマンドを入力したりするのに便利なツールです。  
   なくても進められますが、あった方が作業しやすいです。

---

### Mac

1. **Docker Desktopをインストール**  
   [公式サイト](https://www.docker.com/products/docker-desktop/)  
   `.dmg` ファイルを開き、指示に従ってインストール → 起動

2. **VS Code（推奨）**  
   [Visual Studio Code](https://code.visualstudio.com/)  
   Finderからフォルダをドラッグ＆ドロップして開けます。

---

## 2. VS Codeを使う場合（推奨）

1. **VS Codeを開く**  
   VS Code でファイルを開きます。
   開き方がわからない場合は下記の方法を参考にしてください。
   - VS Codeを起動 → 「ファイル」メニュー → 「フォルダーを開く」
   - VS Codeを起動 → フォルダをドラッグ＆ドロップ

2. **ターミナルを開く**  
   **Windows の場合**：
   - スタートメニューから「Ubuntu」を直接開く（推奨）
   - または VS Code内で：メニューから「ターミナル → 新しいターミナル」→ 右下の「+」の隣の下矢印から「Ubuntu (WSL)」を選択
   
   **Mac の場合**：
   - VS Code内で：メニューから「ターミナル → 新しいターミナル」

3. **フォルダの確認（重要！）**  
   ```bash
   pwd
   ```  
   表示されたパスが、配布フォルダ（例：`広大事前講義`）になっていることを確認してください。  
   違う場合は次のように移動します：  
   ```bash
   cd ~/Downloads/広大事前講義
   ```

4. **アプリを起動**
   ```bash
   docker compose up --build -d
   ```  
   - `--build`：アプリの中身を準備してから起動します（初回や設定を変えたとき）  
   - `-d`：バックグラウンドで動かします（画面をふさがないように）  

5. **ログを見たいとき**
   ```bash
   docker compose logs backend
   ```  
   → バックエンドの動作結果を確認できます（リアルタイムではなく一度だけ表示）。

---

## 2. VS Codeを使わない場合（代替手順）

### Windows（Ubuntu）
1. スタートメニューから「Ubuntu」を開く  
2. 解凍したフォルダに移動  
   ```bash
   cd /mnt/c/Users/<ユーザー名>/Downloads/広大事前講義
   ```
3. アプリを起動  
   ```bash
   docker compose up --build -d
   ```

---

### Mac
1. **ターミナルを開く**  
   - Spotlight（⌘ + Space）→「terminal」と入力 → Enter  
2. **フォルダに移動**  
   ```bash
   cd ~/Downloads/広大事前講義
   ```
3. **アプリを起動**  
   ```bash
   docker compose up --build -d
   ```

---

## 3. 動作確認

1. **アプリの起動状況を確認**  
   ```bash
   docker ps
   ```
   以下の5つのコンテナが表示されていれば成功です：
   - `go_backend`
   - `react_frontend` 
   - `mysql_db`
   - `nginx_proxy`
   - `jaeger`

   **STATUS列が「Up」になっていることを確認してください**

2. **ブラウザで開く**  
   [http://localhost:9000](http://localhost:9000)

3. ページが表示されれば成功です 
   まだ出てこない場合は、少し待ってから再読み込みしてください。

---

## 4. よくあるトラブル

| 症状 | 原因 | 対処法 |
|------|------|---------|
| `docker compose up` でエラー | Dockerが起動していない | Docker Desktopを開く |
| `docker ps` で5つ表示されない | まだ起動中 | 1-2分待ってから再度確認 |
| ページが開かない | 起動中 / ポートが使われている | 数十秒待つか、ポート番号を変える（例：8089） |
| `cd` で移動できない | フォルダの場所が違う | エクスプローラーやFinderで場所を確認 |
| すでに別の環境が動いている | 競合している | 一度 `docker compose down` で停止する |
| Docker環境をリセットしたい | 古いデータが残っている | 下記の「Docker完全リセット」を実行 |

### Docker完全リセット（すべて削除）

**注意：すべてのDockerデータが削除されます**

```bash
# 1. すべてのコンテナを停止・削除
docker compose down -v

# 2. すべてのコンテナ、イメージ、ネットワーク、ボリュームを削除
docker system prune -a -f --volumes

# 3. 確認（何も表示されなければ成功）
docker ps -a
docker images
docker volume ls
```

**実行後の状況：**  
Docker Desktopを開くと「Containers」「Images」「Volumes」がすべて空になっています。

**リセット後は再度セットアップが必要です：**
```bash
docker compose up --build -d
```

---

## 5. コマンドまとめ

| コマンド | 使うタイミング |
|-----------|----------------|
| `docker compose up --build -d` | 初回・設定を変えたとき・通常起動 |
| `docker compose logs backend` | バックエンドの動作結果を一度だけ見たいとき |
| `docker compose down` | 一時的に止めたいとき |
| `docker compose down -v` | 完全に削除してリセットしたいとき |

---

## 6. チェック項目

- `docker ps` で5つのコンテナが「Up」状態になっている  
- [http://localhost:9000](http://localhost:9000) にアクセスできる  
- ページが正しく表示される  
- Docker Desktopで次の5つが動いている（Running）  
  - backend / frontend / mysql / nginx / jaeger  

これで準備は完了です！  
早めに終わった人は[演習問題](./exercise.md)に取り組んでみましょう！

---

## 7. 動作確認をしよう

**このセクションは講師と一緒に進めます！**  
各コンテナが正常に起動しているか、curlコマンドで確認してみましょう。

### 7.1 backendの動作確認（例）

**ヘルスチェック:**
```bash
curl http://localhost:9001/api/health
```
期待される結果: `{"message":"サーバーは正常に動作しています","status":"ok","timestamp":"2025-10-21T22:54:24Z"}`

### 7.2 他のコンテナの確認（参考）

**frontend（フロントエンド画面）:**
- ブラウザで [http://localhost:9002](http://localhost:9002) にアクセス
- または `curl http://localhost:9002` でHTMLが返されることを確認

**nginx（リバースプロキシ）:**
- ブラウザで [http://localhost:9000](http://localhost:9000) にアクセス
- または `curl http://localhost:9000` でフロントエンド画面が表示されることを確認

**jaeger（トレーシングUI）:**
- ブラウザで [http://localhost:9004](http://localhost:9004) にアクセス
- Jaegerの管理画面が表示されることを確認

**mysql（データベース）:**
- ポート: 9003（直接アクセスは通常不要）
- backendが正常にAPIを返せばDB接続も正常
