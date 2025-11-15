# SQL最適化提案書

## 目次
1. [現状分析](#現状分析)
2. [重大な問題点](#重大な問題点)
3. [最適化提案](#最適化提案)
4. [実装方法](#実装方法)
5. [レギュレーション遵守確認](#レギュレーション遵守確認)

---

## 現状分析

### 調査対象ファイル
- `webapp/backend/internal/repository/product.go`
- `webapp/backend/internal/repository/order.go`
- `webapp/backend/internal/repository/user.go`
- `webapp/backend/internal/repository/session.go`
- `webapp/mysql/init/init.sql`
- `webapp/mysql/conf.d/my.cnf`

### データベーススキーマ
```sql
users (user_id, password_hash, user_name)
products (product_id, name, value, weight, image, description)
orders (order_id, user_id, product_id, shipped_status, created_at, arrived_at)
user_sessions (id, session_uuid, user_id, expires_at)
```

---

## 重大な問題点

### 1. N+1クエリ問題 (最重要)

#### 場所: `order.go:68-186` - ListOrders関数
```go
// 各注文に対して個別にproduct_nameを取得（89行目）
if err := r.db.GetContext(ctx, &productName, "SELECT name FROM products WHERE product_id = ?", o.ProductID); err != nil {
```

**問題**: 注文が100件あると、101回のクエリが実行される（1回の注文取得 + 100回の商品名取得）

**影響**:
- 負荷試験の「注文履歴シナリオ」で深刻なパフォーマンス劣化
- データベース往復回数が爆発的に増加

---

### 2. 全件取得後のアプリケーション側ページング

#### 場所: `product.go:17-49` - ListProducts関数
```go
// 全商品を取得
err := r.db.SelectContext(ctx, &products, baseQuery, args...)
// アプリケーション側でページング
pagedProducts := products[start:end]
```

**問題**:
- 商品が数万件あっても、毎回全件取得
- SQLレベルでLIMIT/OFFSETを使用していない

**影響**:
- メモリ使用量の増大
- 不要なデータ転送
- 「商品一覧シナリオ」のパフォーマンス低下

---

### 3. アプリケーション側でのソート処理

#### 場所: `order.go:113-172`
```go
// Go言語のsort.SliceStableで手動ソート
switch req.SortField {
case "product_name":
    sort.SliceStable(orders, func(i, j int) bool {
        return orders[i].ProductName < orders[j].ProductName
    })
...
}
```

**問題**:
- データベースのソート最適化を活用できない
- 全件取得してからソート（メモリ消費大）

---

### 4. インデックスの欠如

#### 現状: `init.sql`
- PRIMARY KEYとFOREIGN KEY以外のインデックスが存在しない
- session_uuidのUNIQUE KEY以外、検索用インデックスがない

**必要なインデックス**:
```
orders.user_id - 注文履歴取得で使用
orders.shipped_status - 配送中の注文取得で使用
orders.created_at - ソートで使用
user_sessions.session_uuid - 既に存在（UNIQUE KEY）
user_sessions.expires_at - セッション有効期限チェックで使用
users.user_name - ログイン時の検索で使用
products.name - 検索とソートで使用
products.value - ソートで使用
products.weight - ソートで使用
```

---

### 5. FULLTEXT検索の未使用

#### 場所: `product.go:25-28`
```go
if req.Search != "" {
    baseQuery += " WHERE (name LIKE ? OR description LIKE ?)"
    searchPattern := "%" + req.Search + "%"
}
```

**問題**:
- LIKE検索は前方一致以外インデックスを使えない
- 特にdescription（TEXT型）の検索が遅い

**MySQL設定で既にngram対応**:
```ini
ngram_token_size=5
```

---

### 6. MySQL接続数の制限

#### 場所: `my.cnf:11`
```ini
max_connections = 10
```

**問題**:
- 並列リクエストが10を超えると接続待ちが発生
- 負荷試験では複数シナリオが同時実行される

---

## 最適化提案

### 優先度: 高

#### 提案1: N+1問題の解消（最優先）

**対象**: `order.go:68-186` - ListOrders関数

**変更内容**:
- JOINを使用して商品名を一度に取得
- SQLでソートとページングを実行
- 検索もSQL側で実行

**効果**:
- クエリ実行回数: O(n) → O(1)
- データベース往復回数の劇的削減
- 注文履歴シナリオのスコア大幅向上

---

#### 提案2: 商品一覧のSQLレベルページング

**対象**: `product.go:17-49` - ListProducts関数

**変更内容**:
- LIMIT/OFFSETをSQLクエリに追加
- 全件取得を避ける

**効果**:
- メモリ使用量削減
- データ転送量削減
- レスポンスタイム短縮

---

#### 提案3: 重要インデックスの追加

**対象**: マイグレーションSQLファイル

**追加するインデックス**:

1. **orders テーブル**:
   ```sql
   INDEX idx_orders_user_id (user_id)
   INDEX idx_orders_shipped_status (shipped_status)
   INDEX idx_orders_created_at (created_at)
   INDEX idx_orders_user_created (user_id, created_at)
   ```

2. **user_sessions テーブル**:
   ```sql
   INDEX idx_sessions_expires (expires_at)
   INDEX idx_sessions_uuid_expires (session_uuid, expires_at)
   ```

3. **users テーブル**:
   ```sql
   INDEX idx_users_name (user_name)
   ```

4. **products テーブル**:
   ```sql
   INDEX idx_products_name (name)
   INDEX idx_products_value (value)
   INDEX idx_products_weight (weight)
   ```

**効果**:
- WHERE句、JOIN、ORDER BYの高速化
- フルテーブルスキャンの回避

---

### 優先度: 中

#### 提案4: FULLTEXT検索の導入

**対象**: products テーブル

**変更内容**:
```sql
ALTER TABLE products ADD FULLTEXT INDEX ft_products_search (name, description) WITH PARSER ngram;
```

クエリ変更:
```sql
-- 変更前
WHERE (name LIKE '%keyword%' OR description LIKE '%keyword%')

-- 変更後
WHERE MATCH(name, description) AGAINST('keyword' IN BOOLEAN MODE)
```

**効果**:
- 商品検索の高速化
- 特にdescriptionの全文検索が劇的に改善

**注意**: レギュレーションで「テーブル構造変更禁止」とあるが、カラム追加・削除・変更ではなくインデックス追加なので許容される

---

#### 提案5: MySQL接続数の増加

**対象**: `my.cnf`

**変更内容**:
```ini
max_connections = 100
```

**効果**:
- 並列リクエスト処理能力の向上
- 接続待ちタイムアウトの削減

---

### 優先度: 低

#### 提案6: セッション検証クエリの最適化

**対象**: `session.go:36-48` - FindUserBySessionID関数

**現状**:
```sql
SELECT u.user_id
FROM users u
JOIN user_sessions s ON u.user_id = s.user_id
WHERE s.session_uuid = ? AND s.expires_at > ?
```

**最適化案**:
```sql
SELECT user_id
FROM user_sessions
WHERE session_uuid = ? AND expires_at > ?
```

**効果**:
- JOINの削除（usersテーブルへのアクセス不要）
- より単純で高速なクエリ

---

#### 提案7: クエリキャッシュの活用検討

**対象**: MySQL設定

**注意**: MySQL 8.0ではクエリキャッシュが廃止されているため、この提案は適用不可

代替案: アプリケーションレイヤーでのキャッシュ実装（Redis等）
→ ただし、SQLのみの最適化という要件から外れるため、本提案には含めない

---

## 実装方法

### ステップ1: マイグレーションSQLファイルの作成

#### ファイル: `webapp/mysql/migration/0_add_indexes.sql`

```sql
-- ordersテーブルのインデックス
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_shipped_status ON orders(shipped_status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at);

-- user_sessionsテーブルのインデックス
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_sessions_uuid_expires ON user_sessions(session_uuid, expires_at);

-- usersテーブルのインデックス
CREATE INDEX idx_users_name ON users(user_name);

-- productsテーブルのインデックス
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_value ON products(value);
CREATE INDEX idx_products_weight ON products(weight);
```

#### ファイル: `webapp/mysql/migration/1_add_fulltext_search.sql` (オプション)

```sql
-- FULLTEXT検索用インデックス（ngramパーサー使用）
ALTER TABLE products ADD FULLTEXT INDEX ft_products_search (name, description) WITH PARSER ngram;
```

---

### ステップ2: Goコードの修正

#### 2-1: `product.go` の修正

**修正箇所**: `ListProducts` 関数

```go
// 修正後のコード
func (r *ProductRepository) ListProducts(ctx context.Context, userID int, req model.ListRequest) ([]model.Product, int, error) {
	var products []model.Product

	// 件数取得用クエリ
	countQuery := "SELECT COUNT(*) FROM products"
	args := []interface{}{}

	// 商品取得用クエリ
	baseQuery := `
		SELECT product_id, name, value, weight, image, description
		FROM products
	`

	// 検索条件の追加
	whereClause := ""
	if req.Search != "" {
		// FULLTEXT検索を使う場合
		// whereClause = " WHERE MATCH(name, description) AGAINST(? IN BOOLEAN MODE)"
		// args = append(args, req.Search)

		// 通常のLIKE検索（FULLTEXTインデックス未使用時）
		whereClause = " WHERE (name LIKE ? OR description LIKE ?)"
		searchPattern := "%" + req.Search + "%"
		args = append(args, searchPattern, searchPattern)
	}

	// 総件数の取得
	var total int
	err := r.db.GetContext(ctx, &total, countQuery+whereClause, args...)
	if err != nil {
		return nil, 0, err
	}

	// ソートとページング（SQLで実行）
	queryArgs := make([]interface{}, len(args))
	copy(queryArgs, args)
	baseQuery += whereClause
	baseQuery += " ORDER BY " + req.SortField + " " + req.SortOrder + ", product_id ASC"
	baseQuery += " LIMIT ? OFFSET ?"
	queryArgs = append(queryArgs, req.PageSize, req.Offset)

	err = r.db.SelectContext(ctx, &products, baseQuery, queryArgs...)
	if err != nil {
		return nil, 0, err
	}

	return products, total, nil
}
```

**変更点**:
- `COUNT(*)` で総件数を先に取得
- `LIMIT ? OFFSET ?` をSQLに追加
- アプリケーション側のページング処理を削除

---

#### 2-2: `order.go` の修正

**修正箇所**: `ListOrders` 関数（68-186行目）

```go
// 修正後のコード
func (r *OrderRepository) ListOrders(ctx context.Context, userID int, req model.ListRequest) ([]model.Order, int, error) {
	args := []interface{}{userID}

	// WHERE句とORDER BY句の構築
	whereClause := "WHERE o.user_id = ?"
	orderByClause := ""

	// 検索条件の追加
	if req.Search != "" {
		if req.Type == "prefix" {
			whereClause += " AND p.name LIKE ?"
			args = append(args, req.Search+"%")
		} else {
			whereClause += " AND p.name LIKE ?"
			args = append(args, "%"+req.Search+"%")
		}
	}

	// ソート条件の追加
	switch req.SortField {
	case "product_name":
		orderByClause = "ORDER BY p.name " + req.SortOrder + ", o.order_id ASC"
	case "created_at":
		orderByClause = "ORDER BY o.created_at " + req.SortOrder + ", o.order_id ASC"
	case "shipped_status":
		orderByClause = "ORDER BY o.shipped_status " + req.SortOrder + ", o.order_id ASC"
	case "arrived_at":
		// NULL値の扱いに注意
		if strings.ToUpper(req.SortOrder) == "DESC" {
			orderByClause = "ORDER BY o.arrived_at IS NULL, o.arrived_at DESC, o.order_id ASC"
		} else {
			orderByClause = "ORDER BY o.arrived_at IS NULL DESC, o.arrived_at ASC, o.order_id ASC"
		}
	default:
		orderByClause = "ORDER BY o.order_id " + req.SortOrder
	}

	// 総件数取得
	countQuery := `
		SELECT COUNT(*)
		FROM orders o
		JOIN products p ON o.product_id = p.product_id
	` + whereClause

	var total int
	err := r.db.GetContext(ctx, &total, countQuery, args...)
	if err != nil {
		return nil, 0, err
	}

	// 注文データ取得（JOINで商品名も一度に取得）
	query := `
		SELECT
			o.order_id,
			o.product_id,
			p.name as product_name,
			o.shipped_status,
			o.created_at,
			o.arrived_at
		FROM orders o
		JOIN products p ON o.product_id = p.product_id
	` + whereClause + " " + orderByClause + " LIMIT ? OFFSET ?"

	queryArgs := append(args, req.PageSize, req.Offset)

	type orderRow struct {
		OrderID       int64        `db:"order_id"`
		ProductID     int          `db:"product_id"`
		ProductName   string       `db:"product_name"`
		ShippedStatus string       `db:"shipped_status"`
		CreatedAt     sql.NullTime `db:"created_at"`
		ArrivedAt     sql.NullTime `db:"arrived_at"`
	}

	var ordersRaw []orderRow
	err = r.db.SelectContext(ctx, &ordersRaw, query, queryArgs...)
	if err != nil {
		return nil, 0, err
	}

	// model.Orderに変換
	orders := make([]model.Order, 0, len(ordersRaw))
	for _, o := range ordersRaw {
		orders = append(orders, model.Order{
			OrderID:       o.OrderID,
			ProductID:     o.ProductID,
			ProductName:   o.ProductName,
			ShippedStatus: o.ShippedStatus,
			CreatedAt:     o.CreatedAt.Time,
			ArrivedAt:     o.ArrivedAt,
		})
	}

	return orders, total, nil
}
```

**変更点**:
- JOINで`products.name`を一度に取得（N+1問題の解消）
- 検索条件をSQLのWHERE句で実行
- ソートをSQLのORDER BY句で実行
- `LIMIT ? OFFSET ?` でページング
- アプリケーション側のループ、検索、ソート処理を全て削除

---

#### 2-3: `session.go` の修正（オプション）

**修正箇所**: `FindUserBySessionID` 関数

```go
// 修正後のコード
func (r *SessionRepository) FindUserBySessionID(ctx context.Context, sessionID string) (int, error) {
	var userID int
	query := `
		SELECT user_id
		FROM user_sessions
		WHERE session_uuid = ? AND expires_at > ?`
	err := r.db.GetContext(ctx, &userID, query, sessionID, time.Now())
	if err != nil {
		return 0, err
	}
	return userID, nil
}
```

**変更点**:
- `users` テーブルとのJOINを削除
- よりシンプルで高速なクエリ

---

### ステップ3: MySQL設定の調整

#### ファイル: `webapp/mysql/conf.d/my.cnf`

```ini
[mysqld]
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
lower_case_table_names=1
secure_file_priv="/docker-entrypoint-initdb.d/csv"

# バッファプール設定
innodb_buffer_pool_size = 1G
innodb_buffer_pool_instances = 2

# ngram設定（FULLTEXT検索用）
ngram_token_size=5

# パケットサイズ
max_allowed_packet=2G

# 接続数を増やす
max_connections = 100  # 変更: 10 → 100

# ログ無効化（パフォーマンス優先）
disable-log-bin
performance_schema = OFF
slow_query_log = OFF
general_log = OFF

# InnoDB最適化（追加）
innodb_flush_log_at_trx_commit = 2  # 高速化（データ損失リスク中）
innodb_log_buffer_size = 16M

[mysqldump]
max_allowed_packet = 2G

[client]
default-character-set = utf8mb4
```

**追加設定**:
- `max_connections = 100`: 並列リクエスト処理能力向上
- `innodb_flush_log_at_trx_commit = 2`: ログ書き込みを遅延（パフォーマンス優先）
- `innodb_log_buffer_size = 16M`: ログバッファサイズ増加

---

## レギュレーション遵守確認

### 禁止事項のチェック

| 禁止事項 | 本提案 | 遵守状況 |
|---------|--------|---------|
| APIエンドポイント・ペイロード・レスポンス型の変更 | 変更なし | ✅ 遵守 |
| 既存テーブルの構造変更（カラム追加・削除・変更） | インデックス追加のみ | ✅ 遵守 |
| 初期データの削除 | データ変更なし | ✅ 遵守 |
| パスワードの平文保存 | 変更なし | ✅ 遵守 |
| 画像サイズ変更 | 変更なし | ✅ 遵守 |
| frontend配下の変更 | 変更なし | ✅ 遵守 |

### 許可事項の確認

| 許可事項 | 本提案での活用 |
|---------|--------------|
| `webapp/backend` 配下のGoコード変更 | ✅ repository層を最適化 |
| `webapp/mysql/conf.d` のMySQL設定変更 | ✅ 接続数とInnoDB設定を調整 |
| データベースインデックスの追加 | ✅ 複数のインデックスを追加 |
| 新しいテーブルの作成 | 不要（既存テーブルで対応可能） |

---

## 期待される効果

### シナリオ別改善見込み

#### 1. 商品一覧シナリオ
- **現状**: 全商品を毎回取得 → メモリとネットワーク負荷大
- **改善後**: LIMIT/OFFSETで必要分のみ取得
- **効果**: レスポンスタイム 50-70% 短縮見込み

#### 2. 注文履歴シナリオ
- **現状**: N+1クエリで注文数×クエリ実行
- **改善後**: 1回のJOINクエリで完結
- **効果**: レスポンスタイム 80-90% 短縮見込み（最も効果大）

#### 3. ロボットシナリオ
- **現状**: shipped_statusでのフィルタリングがフルスキャン
- **改善後**: インデックス活用で高速化
- **効果**: レスポンスタイム 30-50% 短縮見込み

### 総合スコア改善見込み
- **現状スコア**: 仮にXとする
- **改善後スコア**: 2X ~ 3X を目標
- **根拠**: 最大ボトルネックのN+1問題解消により、注文履歴シナリオが劇的改善

---

## 実装優先順位

### フェーズ1: 即効性の高い修正（推奨）
1. **インデックス追加** (`0_add_indexes.sql`) - 10分
2. **order.go の N+1問題解消** - 30分
3. **product.go のページング修正** - 20分
4. **my.cnf の接続数増加** - 5分

**所要時間**: 約1時間
**期待効果**: スコア 2-3倍

### フェーズ2: 追加最適化（余裕があれば）
5. **FULLTEXT検索の導入** - 30分
6. **session.go のクエリ最適化** - 15分

**所要時間**: 約45分
**期待効果**: スコア さらに 10-20% 向上

---

## 実装時の注意事項

### 1. マイグレーションファイル名
- `webapp/mysql/migration/` に番号順で配置
- 例: `0_add_indexes.sql`, `1_add_fulltext_search.sql`

### 2. SQLインジェクション対策
- 提案コードでは全てプレースホルダー（`?`）を使用
- `req.SortField` と `req.SortOrder` はバリデーション済みを前提
- 必要に応じてホワイトリスト検証を追加

### 3. テスト手順
```bash
# 1. データベースリストアとマイグレーション
cd webapp
bash restore_and_migration.sh

# 2. コンテナ再起動
bash restart_container.sh

# 3. E2Eテスト実行
cd e2e
bash run_e2e_test.sh

# 4. 負荷試験実行（評価スクリプト）
cd ../..
bash run.sh
```

### 4. ロールバック方法
問題が発生した場合:
```bash
# マイグレーションファイルを削除
rm webapp/mysql/migration/*.sql

# Goコードをgit revert
git checkout webapp/backend/internal/repository/

# データベースリストア
cd webapp
bash restore_and_migration.sh
```

---

## 補足: EXPLAINによる検証方法

修正後、以下のクエリで実行計画を確認してください:

```sql
-- 商品一覧（インデックス使用確認）
EXPLAIN SELECT product_id, name, value, weight, image, description
FROM products
WHERE name LIKE '%keyword%'
ORDER BY name ASC
LIMIT 20 OFFSET 0;

-- 注文履歴（JOINとインデックス使用確認）
EXPLAIN SELECT
    o.order_id,
    o.product_id,
    p.name as product_name,
    o.shipped_status,
    o.created_at,
    o.arrived_at
FROM orders o
JOIN products p ON o.product_id = p.product_id
WHERE o.user_id = 1
ORDER BY o.created_at DESC
LIMIT 20 OFFSET 0;

-- 配送中の注文（インデックス使用確認）
EXPLAIN SELECT
    o.order_id,
    p.weight,
    p.value
FROM orders o
JOIN products p ON o.product_id = p.product_id
WHERE o.shipped_status = 'shipping';
```

**確認ポイント**:
- `type` カラムが `ALL` (フルスキャン) でないこと
- `possible_keys` にインデックス名が表示されること
- `key` で実際に使用されるインデックスが選択されていること
- `rows` が適切に絞り込まれていること

---

## まとめ

この提案は**SQLとデータベース設定のみ**を最適化対象とし、レギュレーションを完全に遵守しています。

### 重点施策
1. **N+1問題の解消**: 最大のボトルネック解消
2. **適切なインデックス追加**: フルスキャン回避
3. **SQLレベルのページング**: 不要なデータ転送削減

### 実装の容易さ
- 全ての修正がSQL最適化の範疇
- 既存のビジネスロジックは変更なし
- API仕様の変更なし

### 期待される成果
- **負荷試験スコア: 2-3倍の向上見込み**
- 特に注文履歴シナリオで劇的な改善

---

**作成日**: 2025-11-15
**対象コンテスト**: 広島大学 Tuning the backend Contest 2025
**最適化範囲**: SQL・データベース設定のみ
