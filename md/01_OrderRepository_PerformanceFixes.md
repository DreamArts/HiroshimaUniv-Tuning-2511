# OrderRepository 性能改善（優先度順）

## 概要
`webapp/backend/internal/repository/order.go` の `ListOrders` 実装では、アプリ側での全件取得・N+1 クエリ・メモリ上ソート／ページングが発生しており、大量データ時に遅延の主要因となっています。本ドキュメントは改善すべき項目を優先度順にまとめ、実装案と注意点を提示します。

---

## 優先度 1 — N+1 クエリの解消（最重要）
- 問題: `ListOrders` が最初に orders を全件取得し、ループ内で各注文ごとに `SELECT name FROM products WHERE product_id = ?` を発行している（N+1）。
- 影響: DB ラウンドトリップが注文数に比例して増加し、遅延が大きくなる。
- 対応案: `JOIN products` を使い、1回のクエリで `product_name` を取得する。
- 推定工数: 小〜中（関数内の SQL を変更し、構造体とマッピングを調整するだけ）
- 参考 SQL:

```sql
SELECT
  o.order_id,
  o.product_id,
  o.shipped_status,
  o.created_at,
  o.arrived_at,
  p.name AS product_name
FROM orders o
JOIN products p ON o.product_id = p.product_id
WHERE o.user_id = ?
-- 検索・ソート・ページングは下で追加
```

---

## 優先度 2 — DB 側での検索（WHERE）・ソート（ORDER BY）・ページング（LIMIT/OFFSET）
- 問題: 現行はアプリ内で検索（prefix/contains）・ソート・ページングを実行している。
- 影響: 大量データをメモリにロードし CPU と GC を圧迫。DB のインデックス活用ができない。
- 対応案:
  - SQL 側で `WHERE p.name LIKE ?` を使う（prefix は `search%`、contains は `%search%`）。
  - `ORDER BY <allowed_column> ASC|DESC` と `LIMIT ? OFFSET ?` を組み合わせる。
  - `sortField` と `sortOrder` はホワイトリストで検証して組み立てる（SQL インジェクション防止）。
- 推定工数: 中（SQL 組み立ての安全化とパラメータ調整）

---

## 優先度 3 — total を DB の `COUNT(*)` で取得
- 問題: 現行はフィルタ後の配列長を `total` としているため、全件取得が前提。
- 影響: ページング時に不要な全件スキャン／メモリ確保が発生。
- 対応案: 同一フィルタ条件で `SELECT COUNT(*) FROM orders o JOIN products p ... WHERE ...` を実行して総件数を取得（2クエリ構成）。
- 推定工数: 小

---

## 優先度 4 — インデックス確認・追加
- 問題: 適切なインデックスがないと、DB の WHERE/ORDER が遅くなる。
- 影響: フルテーブルスキャンやソートのコスト増。
- 対応案: 以下を検討
  - `orders(user_id)`
  - `orders(user_id, created_at DESC)`（created_at での ORDER を速くするため）
  - `orders(shipped_status)`（`GetShippingOrders` 用）
  - `products(name)`（場合によってはフルテキストや trigram などの導入を検討）
- 推定工数: 小（DB への ALTER が必要）

---

## 優先度 5 — `UpdateStatuses` の大量 ID 対応（バッチ化）
- 問題: `sqlx.In` による `IN (?)` は ID 数が多いとプレースホルダ上限を超える可能性がある。
- 影響: 大量更新時に失敗する、または非常に大きなクエリを投げることによる負荷。
- 対応案: 1000 件など適切なサイズで分割してトランザクション内で複数回実行する。
- 推定工数: 小

---

## 優先度 6 — その他（プロファイリング、クエリプラン確認、トレース）
- 問題: 実際の遅延原因の割合は環境依存。
- 影響: 理論的な改善だけでは十分でない場合がある。
- 対応案:
  - `EXPLAIN` / `EXPLAIN ANALYZE` を用いてクエリプランを確認。
  - slow query log や Jaeger トレーシングで実運用の遅延を測定。
  - 必要ならアプリのプロファイリング（pprof）を行う。
- 推定工数: 中

---

## 実装上の注意点
- `sortField` / `sortOrder` を SQL に埋め込む場合は、文字列連結で直接ユーザ入力を埋め込まない。必ず許可済みカラム名にマップしてから埋める。
- `LIKE '%...%'`（contains）はインデックスが効きにくい。検索要件次第でフルテキスト検索（MySQL の FULLTEXT、Postgres の GIN/trigram）を検討する。
- 2 クエリ（データ取得と COUNT）構成により整合性の問題が小さく出る可能性があるが、通常は許容範囲。

---

## 推奨実施手順（最短パス）
1. `ListOrders` を JOIN + WHERE(LIKE) + ORDER BY + LIMIT/OFFSET に変更（N+1 解消）。
2. 同条件で `COUNT(*)` を取得して `total` を計算。
3. DB に必要なインデックスを追加。
4. 本番に近いデータで `EXPLAIN` とベンチ（簡易）を実行し効果を確認。
5. 必要なら追加で検索インフラ（全文検索など）を導入。

---

## 追加サポート
- 実装パッチ（`ListOrders` の書き換え）を私が作成できます。パッチ適用を希望する場合は「実装して」と返信してください。
- `EXPLAIN` 実行やインデックス追加の SQL を要望があれば環境（DB 種別・バージョン）を教えてください。

---

作成者: GitHub Copilot（変更提案）
日時: 2025-11-15
