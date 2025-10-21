import { useState, useEffect } from 'react';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchColumn, setSearchColumn] = useState('name');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // APIのベースURL
  const API_BASE_URL = '/api';

  // コンポーネントマウント時にデータを取得
  useEffect(() => {
    fetchProducts();
  }, []);

  // ページ変更時のデータ取得
  useEffect(() => {
    if (currentPage > 1) {
      fetchProducts(searchKeyword ? searchColumn : '', searchKeyword);
    }
  }, [currentPage]);

  const fetchProducts = async (column = '', keyword = '') => {
    setLoading(true);
    setError('');
    
    try {
      let url, options;

      if (column && keyword) {
        // 検索API
        url = `${API_BASE_URL}/search`;
        options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            column, 
            keyword, 
            page: currentPage, 
            limit: 10 
          })
        };
        console.log(`[FRONTEND] → Calling Backend API: POST /api/search - column=${column}, keyword=${keyword}`);
      } else {
        // 全製品取得API
        url = `${API_BASE_URL}/products?page=${currentPage}&limit=10`;
        options = {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        };
        console.log(`[FRONTEND] → Calling Backend API: GET /api/products?page=${currentPage}&limit=10`);
      }

      const response = await fetch(url, options);
      
      if (!response.ok) {
        console.log(`[FRONTEND] API Error: ${response.status} ${response.statusText}`);
        throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`[FRONTEND] ← Backend API Response: Received ${data.products?.length || 0} products`);
      
      if (data && data.products && Array.isArray(data.products)) {
        setProducts(data.products);
        setTotalPages(data.totalPages || 1);
      } else {
        setProducts([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.log(`[FRONTEND] API Error: ${error.message}`);
      setError(`データの取得に失敗しました: ${error.message}`);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setCurrentPage(1);
    
    if (searchKeyword.trim()) {
      await fetchProducts(searchColumn, searchKeyword.trim());
    } else {
      await fetchProducts();
    }
  };

  const handleReset = async () => {
    setSearchKeyword('');
    setCurrentPage(1);
    await fetchProducts();
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>製品検索システム</h1>
      

      
      {/* エラー表示 */}
      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          border: '1px solid #f5c6cb', 
          borderRadius: '4px', 
          marginBottom: '20px' 
        }}>
          <strong>エラー:</strong> {error}
        </div>
      )}
      
      {/* 検索フォーム */}
      <form onSubmit={handleSearch} style={{ 
        marginBottom: '20px', 
        padding: '20px', 
        border: '1px solid #ddd', 
        borderRadius: '8px',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select 
            value={searchColumn} 
            onChange={(e) => setSearchColumn(e.target.value)}
            style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          >
            <option value="name">製品名</option>
            <option value="category">カテゴリ</option>
            <option value="brand">ブランド</option>
            <option value="model">モデル</option>
            <option value="description">説明</option>
          </select>
          
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="検索キーワードを入力"
            style={{ 
              padding: '8px', 
              border: '1px solid #ccc', 
              borderRadius: '4px', 
              minWidth: '200px',
              flex: '1'
            }}
          />
          
          <button 
            type="submit"
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: loading ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '検索中...' : '検索'}
          </button>
          
          <button 
            type="button"
            onClick={handleReset}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: loading ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            リセット
          </button>
        </div>
      </form>

      {/* 結果表示 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <p>データを読み込み中...</p>
        </div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', backgroundColor: '#fff3cd', border: '1px solid #ffeeba', borderRadius: '4px' }}>
          <p>製品が見つかりませんでした。</p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '20px' }}>
            <p><strong>検索結果: {products.length} 件表示</strong></p>
          </div>
          
          {/* 製品一覧テーブル */}
          <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>ID</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>製品名</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>カテゴリ</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>ブランド</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>モデル</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>説明</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>価格</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>登録日</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{product.id}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold' }}>{product.name}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{product.category}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{product.brand}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{product.model}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.description}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>
                      ¥{product.price?.toLocaleString()}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                      {new Date(product.created_at).toLocaleDateString('ja-JP')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ページネーション */}
          {totalPages > 1 && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
                style={{
                  padding: '8px 12px',
                  margin: '0 5px',
                  backgroundColor: (currentPage === 1 || loading) ? '#6c757d' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (currentPage === 1 || loading) ? 'not-allowed' : 'pointer'
                }}
              >
                ← 前へ
              </button>
              
              <span style={{ margin: '0 15px', fontSize: '16px', fontWeight: 'bold' }}>
                {currentPage} / {totalPages} ページ
              </span>
              
              <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || loading}
                style={{
                  padding: '8px 12px',
                  margin: '0 5px',
                  backgroundColor: (currentPage === totalPages || loading) ? '#6c757d' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (currentPage === totalPages || loading) ? 'not-allowed' : 'pointer'
                }}
              >
                次へ →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}