const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      
      // 静的ファイルをログから除外
      const isStaticFile = req.url.startsWith('/_next/static/') || 
                          req.url.startsWith('/favicon.ico') ||
                          req.url.includes('.js') || 
                          req.url.includes('.css') ||
                          req.url.includes('.png') ||
                          req.url.includes('.jpg');
      
      if (!isStaticFile) {
        // リクエスト受信ログ（処理開始前に即座に出力）
        console.log(`[FRONTEND] Request: ${req.method} ${req.url}`);
      }

      // 開始時間を記録
      const startTime = Date.now();

      // レスポンス送信時のログを追加
      const originalEnd = res.end;
      res.end = function(...args) {
        if (!isStaticFile) {
          const duration = Date.now() - startTime;
          // レスポンスログを即座に出力
          console.log(`[FRONTEND] Response: ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
        }
        originalEnd.apply(this, args);
      };

      await handle(req, res, parsedUrl);
      
    } catch (err) {
      console.error(`[FRONTEND] Error: ${req.method} ${req.url} - ${err.message}`);
      res.statusCode = 500;
      res.end('internal server error');
    }
  })
  .listen(port, () => {
    console.log(`[FRONTEND] Server ready on http://${hostname}:${port}`);
  });
});