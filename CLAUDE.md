# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## アプリケーション概要

このリポジトリは「広島大学 Tuning the backend Contest 2025」の競技用コードベースです。倉庫管理システム「StoreLink」のバックエンドをチューニングし、パフォーマンスを改善することが目的です。

### サービス構成

- **Backend**: Go言語で実装されたAPIサーバー (`webapp/backend`)
- **Frontend**: Next.js + TypeScript で実装されたWebアプリ (`webapp/frontend`) - チューニング対象外
- **MySQL**: データベース (`webapp/mysql`)
- **Nginx**: リバースプロキシ (`webapp/nginx`)
- **Jaeger**: 分散トレーシング用

### 主要機能

1. ユーザー認証・ログイン
2. 商品一覧の表示・検索・ソート
3. 注文の作成・履歴表示
4. ロボット向けAPI（配送計画取得、ステータス更新）

## 開発環境とコマンド

### 初期セットアップ

```bash
# 初回のみ実行（リポジトリクローン後）
bash init.sh [VMのパブリックIPアドレス] [秘密鍵のパス]
# VM環境の場合は引数不要
bash init.sh
```

### コンテナ操作

```bash
# コンテナの再起動（webapp配下で実行）
cd webapp
bash restart_container.sh

# データベースのリストア＆マイグレーション
cd webapp
bash restore_and_migration.sh
```

### テスト・評価

```bash
# E2Eテスト実行（webapp/e2e配下で実行）
cd webapp/e2e
bash run_e2e_test.sh

# 評価スクリプト実行（リストア→E2E→負荷試験→採点を一括実行）
bash run.sh

# 負荷試験のステータス確認
bash get_test_status.sh <JOB_ID>
```

### ローカル開発

```bash
# バックエンドの開発ビルド
cd webapp/backend
go build -o server ./cmd

# MySQLへの接続
docker exec -it tuning-mysql mysql -u root -pmysql hiroshimauniv2511-db
```

## アーキテクチャ

### バックエンド構造 (`webapp/backend/internal`)

```
internal/
├── cmd/main.go           # エントリーポイント
├── server/               # サーバー初期化とルーティング
├── handler/              # HTTPハンドラー（auth, product, order, robot）
├── service/              # ビジネスロジック
├── repository/           # データアクセス層
├── model/                # データモデル
├── db/                   # DB接続管理
├── middleware/           # 認証・トレーシングミドルウェア
└── telemetry/            # OpenTelemetry設定
```

### リクエストフロー

1. Nginx → Frontend/Backend
2. Middleware（認証・トレーシング）
3. Handler → Service → Repository → MySQL
4. レスポンス返却

### 主要エンドポイント

- `POST /api/login` - ユーザー認証
- `POST /api/v1/product` - 商品一覧取得（ページング・ソート・検索対応）
- `POST /api/v1/product/post` - 注文作成
- `POST /api/v1/orders` - 注文履歴取得
- `GET /api/v1/image` - 商品画像取得
- `GET /api/robot/delivery-plan` - ロボット配送計画取得
- `PATCH /api/robot/orders/status` - 注文ステータス更新

### データベースマイグレーション

`webapp/mysql/migration/` に `{数字}_*.sql` 形式でファイルを配置すると、評価スクリプト実行時に番号順に適用されます。

例: `0_add_index.sql`, `1_create_table.sql`

## 競技レギュレーション

### 重要な制約事項

- **テーブル構造の変更禁止**: 既存テーブルのカラム追加・削除・変更は不可（新規テーブル作成は可）
- **APIエンドポイント・ペイロード・レスポンス型の変更禁止**
- **frontendディレクトリの変更禁止**: チューニング対象外
- **初期データの保持**: 顧客データの削除による高速化は禁止
- **パスワードのハッシュ化必須**: 平文保存は禁止（ハッシュ方式変更は可）
- **画像サイズ変更禁止**

### チューニング可能な範囲

- `webapp/backend` 配下のGoコード
- `webapp/mysql/conf.d` のMySQL設定
- `webapp/nginx/nginx.conf` のNginx設定
- データベースインデックスの追加
- タイムアウト時間の調整（`webapp/backend/internal/service/utils/timeout.go`）

### 禁止事項

- API動作テストをすり抜けるだけの極端な最適化
- UIの大幅な変更
- 他リソース（個人PC等）の利用
- 採点モジュールの改ざん

## 採点の仕組み

### 採点フロー

1. データベースを初期状態にリストア
2. マイグレーションSQL実行
3. E2Eテスト（API動作確認）
4. 負荷試験（240秒間、ローカルは30秒）
5. スコア計算（シナリオ成功数の合計）

### 負荷試験シナリオ

1. **商品一覧シナリオ**: ログイン → 商品一覧表示 → ページング → ソート → 検索 → 注文作成
2. **注文履歴シナリオ**: ログイン → 注文履歴表示 → ソート → 検索
3. **ロボットシナリオ**: 配送計画取得 → ステータス更新

## 技術スタック

### Backend
- **言語**: Go 1.23
- **フレームワーク**: chi (HTTPルーター)
- **DB**: MySQL 8系
- **ORM**: sqlx
- **認証**: セッショントークン（bcryptでパスワードハッシュ化）
- **トレーシング**: OpenTelemetry + Jaeger

### Frontend
- **フレームワーク**: Next.js 15
- **言語**: TypeScript
- **UI**: Material-UI
- **HTTPクライアント**: axios

### Infrastructure
- **コンテナ**: Docker Compose
- **VM**: Azure Standard D2as v4 (2 vCPU, 8 GiB メモリ)

## チューニングのヒント

### 一般的な最適化ポイント

- データベースクエリの最適化（N+1問題の解消、適切なインデックス追加）
- コネクションプーリングの調整
- 不要なトレースの無効化（`TRACE_ENABLED=false`）
- キャッシュの活用
- 並列処理の導入

### 確認すべきファイル

- `webapp/backend/internal/service/` - ビジネスロジック・クエリ実行箇所
- `webapp/backend/internal/repository/` - SQLクエリ
- `webapp/mysql/conf.d/` - MySQL設定
- `docker-compose.yml` - 環境変数・リソース設定

## 注意事項

- `/.da` ディレクトリは変更禁止（SSL証明書等が格納）
- ディレクトリ構成の変更禁止（スクリプトが動作しなくなる）
- HDD容量に制限があるため不要なリソースは削除
- OSのシャットダウンはSSHログイン不可になるため注意
