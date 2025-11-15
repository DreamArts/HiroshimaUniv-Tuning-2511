-- ========================================
-- インデックス追加マイグレーション
-- パフォーマンス改善のため、頻繁に使用されるカラムにインデックスを追加
-- ========================================

-- orders テーブルのインデックス
-- user_id: ユーザーごとの注文履歴取得で使用（WHERE user_id = ?）
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- shipped_status: 配送状態での絞り込みで使用（WHERE shipped_status = 'shipping'）
CREATE INDEX IF NOT EXISTS idx_orders_shipped_status ON orders(shipped_status);

-- created_at: 注文日時でのソートで使用（ORDER BY created_at）
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- 複合インデックス: user_id と created_at の組み合わせ
-- ユーザーの注文履歴を日付順に取得する際に効果的
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at);

-- products テーブルのインデックス
-- name: 商品名でのソートで使用（ORDER BY name）
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- value: 商品価格でのソートで使用（ORDER BY value）
CREATE INDEX IF NOT EXISTS idx_products_value ON products(value);

-- 全文検索用インデックス（LIKE検索の高速化）
-- 商品名・説明での検索で使用（WHERE name LIKE '%keyword%' OR description LIKE '%keyword%'）
CREATE FULLTEXT INDEX IF NOT EXISTS idx_products_search ON products(name, description);
