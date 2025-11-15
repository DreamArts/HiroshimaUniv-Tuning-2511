# Jaeger演習ドキュメント（講義用）

## この演習の目的
- すでに設定済みのスパンを **Jaeger** で観察し、アプリの処理の流れを理解する  
- コードを見ながら「スパン」や「attribute（付加情報）」の仕組みを学ぶ  
- 自分で attribute を追加して、Jaeger 上で変化を確認してみる  

---

## ステップ1: 最初のトレース確認

### 1-1. 製品検索ページを開いてトレースを生成
1. ブラウザで [http://localhost:9000](http://localhost:9000) を開く
2. ページが読み込まれると自動的に商品一覧が表示される（この時点でAPIが呼ばれる）

### 1-2. Jaegerでトレースを確認
1. 新しいタブで [http://localhost:9004](http://localhost:9004) を開く  
2. 左上の「Service」で `product-search-backend` を選択  
3. 「Operation」で `get_products` を選択
3. 「Find Traces」をクリック  
4. 最新のトレースから `get_products` という名前のトレースを選んで開く

**観察ポイント**
- **スパン名**: `get_products`
- **実行時間**: バーの長さで処理時間を確認
- **Tags（属性情報）**:
  - `total_count`: 総製品数
  - `total_pages`: 総ページ数
  - `returned_count`: 実際に返却された製品数

Jaeger 上のバーの長さが「処理にかかった時間」を表しています。  
どの処理が長いか・属性情報にどんな値が記録されているかを観察しましょう。

---

## ステップ2: attributeを追加して変化を確認

### 2-1. コードにattributeを追加
`backend/internal/handlers/products.go` の `GetProducts` 関数を開き、以下の行を追加してみましょう：

```go
span.SetAttributes(
    attribute.Int("page", page),
    attribute.Int("limit", limit),
    // ↑上の2行を追加
    attribute.Int("total_count", totalCount),
    attribute.Int("total_pages", totalPages),
    attribute.Int("returned_count", len(products)),
)
```

### 2-2. バックエンドコンテナのみ再ビルド
```bash
# バックエンドのみ再ビルド・再起動
docker compose up --build -d backend

# または、まとめて停止→再ビルド
docker compose stop backend
docker compose up --build -d backend
```

**ヒント**: 
- フロントエンドやDBは変更していないので、バックエンドのみ再ビルドすれば十分です
- 変更後は `docker compose logs -f backend` でログを確認しましょう

**全体を再ビルドしたい場合のみ:**
```bash
docker compose down
docker compose up --build -d
```

### 2-3. 再度ページを開いて確認
1. [http://localhost:9000](http://localhost:9000) を再度開く（またはリロード）
2. Jaegerで新しいトレースを確認
3. 追加した `limit` と `page` の属性が表示されているか確認

**観察ポイント**
- 新しい属性が「Tags」欄に追加されている
- `limit` に1ページあたりの表示件数が記録されている
- `page` にページ番号が記録されている

---

## 演習問題

ここからは実際にコードを修正して、トレーシング機能を拡張する演習を行います。

### 演習1: 検索機能のスパンを追加する

**目標**: 検索機能に `search_products` スパンを追加して、検索条件と結果をトレースできるようにする

**手順**:
1. `backend/internal/handlers/search.go` の `SearchProducts` 関数を確認
2. 検索処理用のスパンを追加
3. 検索条件（カラム、キーワード、ページ等）を属性として記録
4. 検索結果（ヒット件数、返却件数等）を属性として記録

**ヒント**:
```go
import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
    // ↓下の2行を追加
	"go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"

	"sample-backend/internal/models"
)

// 既存のコード

func (h *SearchHandler) SearchProducts(w http.ResponseWriter, r *http.Request) {
    start := time.Now()
    log.Printf("[API] Search products request from %s", r.RemoteAddr)

    // トレーシングを追加
    tracer := otel.Tracer("product-search-backend")
    _, span := tracer.Start(r.Context(), "search_products")
    defer span.End()

    setJSONHeaders(w)

    // 既存のコード...
    // searchReqをデコードした後に以下を追加

    // 検索条件を属性として記録
    span.SetAttributes(
        attribute.String("search.column", searchReq.Column),
        attribute.String("search.keyword", searchReq.Keyword),
        attribute.Int("search.page", searchReq.Page),
        attribute.Int("search.limit", searchReq.Limit),
    )

    // DB処理後に以下も追加
    span.SetAttributes(
        attribute.Int("search.total_count", totalCount),
        attribute.Int("search.returned_count", len(products)),
    )
}
```

**確認方法**:
1. 検索フォームで「製品名」「Pro」で検索実行
2. Jaegerで `search_products` トレースを確認
3. 検索条件と結果の属性が記録されていることを確認

---

### 演習2: エラー状況を作ってトレースする

**目標**: 意図的にエラーを発生させて、エラーがJaegerでどう表示されるかを確認する

**手順**:
1. `backend/internal/handlers/health.go` にimportを追加:
   ```go
   import (
       // 既存のimport...
       "go.opentelemetry.io/otel/codes"
   )
   ```
2. ヘルスチェックAPIにテスト用エラー機能を追加
3. エラー情報をスパンに記録する処理を実装
4. エラートレースの可視化を確認

**実装例**:
```go
func HealthHandler(w http.ResponseWriter, r *http.Request) {
    start := time.Now()
    log.Printf("[API] Health check request from %s", r.RemoteAddr)

    // トレースの開始
    tracer := otel.Tracer("product-search-backend")
    _, span := tracer.Start(r.Context(), "health_check")
    defer span.End()

    // テスト用エラー条件を追加
    testError := r.URL.Query().Get("test_error")
    if testError == "true" {
        err := fmt.Errorf("テスト用エラー: システムチェック失敗")
        span.RecordError(err)
        span.SetStatus(codes.Error, "Health check failed")
        span.SetAttributes(attribute.String("error.type", "test_error"))
        log.Printf("[ERROR] Test error triggered: %v", err)
        http.Error(w, "Health check failed", http.StatusInternalServerError)
        return
    }

    setJSONHeaders(w)
    response := map[string]string{
        "status":    "ok",
        "timestamp": time.Now().Format(time.RFC3339),
        "message":   "サーバーは正常に動作しています",
    }

    span.SetAttributes(attribute.String("response.status", "ok"))
    // 既存のコード...
}
```

**確認方法**:
1. `http://localhost:9001/api/health?test_error=true` にアクセス
2. Jaegerでエラーになったスパンを確認
3. スパンが赤色で表示され、エラー詳細が記録されていることを確認

---

### 演習3: 子スパンを追加して処理を詳細化する

**目標**: データベースアクセス部分を子スパンとして分離し、処理の階層を可視化する

**手順**:
1. `backend/internal/handlers/products.go` の `GetProducts` 内のDB処理部分に子スパンを追加
2. SQLクエリの種類や実行時間を属性として記録
3. 親子関係のトレースを確認

**実装例**:
```go
func (h *ProductHandler) GetProducts(w http.ResponseWriter, r *http.Request) {
    // 既存のコード（start, log等）...

    // トレースの開始（親スパンのコンテキストを保存）
    tracer := otel.Tracer("product-search-backend")
    ctx, span := tracer.Start(r.Context(), "get_products")
    // ↑_をctxに書き換える
    defer span.End()

    // 既存のページネーション処理...

    // 総件数取得用の子スパンを追加（親のコンテキストを使用）
    _, countSpan := tracer.Start(ctx, "database_count_query")
    defer countSpan.End()
    countSpan.SetAttributes(attribute.String("query_type", "COUNT"))
    
    var totalCount int
    err = h.db.Get(&totalCount, "SELECT COUNT(*) FROM products")
    if err != nil {
        span.SetAttributes(attribute.String("error", err.Error()))
        countSpan.SetAttributes(attribute.String("error", err.Error()))
        // エラーハンドリング...
        return
    }
    countSpan.SetAttributes(attribute.Int("total_count", totalCount))

    // 製品データ取得用の子スパンを追加（親のコンテキストを使用）
    _, productsSpan := tracer.Start(ctx, "database_products_query")
    defer productsSpan.End()
    productsSpan.SetAttributes(
        attribute.String("query_type", "SELECT"),
        attribute.Int("limit", limit),
        attribute.Int("offset", offset),
    )
    
    products := []models.Product{}
    query := "SELECT id, name, category, brand, model, description, price, created_at FROM products ORDER BY id LIMIT ? OFFSET ?"
    err = h.db.Select(&products, query, limit, offset)
    if err != nil {
        span.SetAttributes(attribute.String("error", err.Error()))
        productsSpan.SetAttributes(attribute.String("error", err.Error()))
        // エラーハンドリング...
        return
    }
    productsSpan.SetAttributes(attribute.Int("returned_count", len(products)))

    // 残りの処理...
}
```

**確認方法**:
1. 製品一覧ページを開く
2. Jaegerで `get_products` トレースを確認
3. 親スパンの下に子スパンが表示されることを確認
