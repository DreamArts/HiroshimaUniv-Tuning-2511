# 演習

アプリケーションが動いた人は、裏側で何が起きているのかを少しのぞいてみましょう。  
この演習では、**「Webアプリケーションの中でどんな通信が行われているか」** や  
**「どこでどんな処理が行われているのか」** を体感します。  

---

### 目次

- [① ログを確認する（アプリケーションの裏側を見てみよう）](#log)
- [② APIを直接叩いてみる（フロントを通さず通信する）](#api)
- [③ MySQLに入ってみる（データの中を見てみよう）](#mysql)
- [④ コードを変更してみる（アプリケーションを壊さない範囲で触ってみよう）](#code)

---

<a id="log"></a>
### ① ログを確認する（アプリケーションの裏側を見てみよう）

ターミナルで以下のコマンドを入力します：

```bash
docker compose logs backend
```

これで「バックエンド（リクエストを処理する部分）」の動作ログが確認できます。
リクエストを送るたびに「どのAPIにアクセスしたか」「どんな処理をしたか」が出力されるはずです。

**ポイント**
- フロントでボタンを押したり検索をしたりすると、ログにそのリクエストが流れます。  
- 「/api/products」など、APIのURLが見えたら成功です。  
- ログがどう変化するかを観察してみましょう。

**理解のヒント**
- ログは「アプリケーションが今何をしているか」を教えてくれる情報です。  
- フロントでの操作（例：検索ボタンを押す）→ バックエンドで処理（ログ出力）→ 結果が返る、という流れを見られます。  
- エラーが出たときも、まずはログを見ると原因の手がかりがつかめます。

---

<a id="api"></a>
### ② APIを直接叩いてみる（フロントエンドを通さず通信する）

次に、アプリケーションの"中身の通信"を自分の手で再現してみましょう。  
ターミナルで以下を実行します：

```bash
curl "http://localhost:9001/api/products?page=1&limit=5"
```

**検索APIも試してみよう:**
```bash
curl -X POST "http://localhost:9001/api/search" \
  -H "Content-Type: application/json" \
  -d '{"column":"name","keyword":"Pro","page":1,"limit":5}'
```

**ヘルスチェックも確認:**
```bash
curl "http://localhost:9001/api/health"
```

**ポイント**
- このコマンドは「フロントエンドを通さず、バックエンドに直接リクエストを送る」ものです。  
- 正常に動いていれば、商品データ（JSON形式）がターミナル上に表示されます。  
- `curl` は「サーバーにリクエストを送るためのコマンド」で、ブラウザの代わりに動作します。  

**理解のヒント**
- フロントで検索する操作も、裏ではこのようなHTTPリクエストが送られています。  
- 「ブラウザでの操作＝サーバーへの通信」だとイメージできると◎。  
- 実際の開発でも、APIが正しく動いているかを確認するために `curl` や `Postman` などを使うことがあります。

---

<a id="mysql"></a>
### ③ MySQLに入ってみる（データの中を見てみよう）

次に、実際にデータベースの中を見てみます。  
ここでは、「アプリケーションがどんなデータを使って動いているのか」を確認します。

まず、MySQLに入るために以下のコマンドを実行します：

```bash
docker compose exec db mysql -u root -pmysql sample_db
```

上のコマンドを実行すると、MySQLの中に入ります。
（mysql> という表示が出たら成功です）

続けて、次のコマンドを順番に入力してみましょう：

```sql
SHOW DATABASES;
USE sample_db;
SHOW TABLES;
SHOW COLUMNS FROM products;
SELECT * FROM products LIMIT 5;
SELECT COUNT(*) FROM products;
```

**ポイント**
- `SHOW DATABASES;`：データベースの一覧が見られます。
- `USE sample_db;`：使用するデータベースを sample_db に切り替えます。
- `SHOW TABLES;`：どんなテーブル（データの入れ物）があるか一覧で見られます。  
- `SHOW COLUMNS FROM products;`：`products` テーブルの中身の構造（列名・型など）を見られます。  
- `SELECT * FROM products LIMIT 5;`：データを5件だけ確認します。  
- `SELECT COUNT(*) FROM products;`：全体で何件あるか数えます。   

**MySQLから出るには:**
```sql
exit;
```

---

<a id="code"></a>
### ④ コードを変更してみる（アプリケーションを"壊さない範囲で"触ってみよう）

余裕がある人は、コードの中を見て少し変更してみましょう。  
ここでは「アプリケーションのどこを変えると何が変わるのか」を実際に体験します。

たとえば以下のような変更を試してみましょう：

#### 例1: ログメッセージを変更
`backend/internal/handlers/health.go` の中のメッセージを変更してみる：
```go
response := map[string]string{
    "status":    "ok",
    "timestamp": time.Now().Format(time.RFC3339),
    "message":   "サーバーは絶好調です！", // ← ここを変更
}
```

#### 例2: デフォルトのページサイズを変更
`backend/internal/handlers/products.go` の中の設定を変更：
```go
limit, err := strconv.Atoi(limitStr)
if err != nil || limit < 1 || limit > 100 {
    limit = 20  // ← 10から20に変更
}
```

**変更後の確認方法**
1. コードを保存する  
2. ターミナルで次のコマンドを実行してバックエンドのみ再起動する  
   ```bash
   docker compose up --build -d backend
   ```
3. ブラウザをリロードして、変更が反映されているか確認する
   
**全体を再起動したい場合:**
```bash
docker compose down
docker compose up --build -d
```

**変更を確認する方法:**
- **例1の確認**: `curl "http://localhost:9001/api/health"` でメッセージ変更を確認
- **例2の確認**: ブラウザで `http://localhost:9000` を開いて表示件数を確認
