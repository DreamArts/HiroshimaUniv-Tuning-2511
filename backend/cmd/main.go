package main

import (
	"log"

	"sample-backend/internal/config"
	"sample-backend/internal/database"
	"sample-backend/internal/server"
	"sample-backend/internal/tracing"
)

func main() {
	log.Println("[MAIN] Starting product-search-backend server...")

	// 設定読み込み
	cfg := config.Load()

	// トレーシング初期化
	tracing.Init(cfg)

	// データベース接続
	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatal("[MAIN FATAL] Failed to connect to database:", err)
	}
	defer db.Close()

	// サーバー起動
	srv := server.New(cfg, db)
	if err := srv.Start(); err != nil {
		log.Fatal("[MAIN FATAL] Server failed:", err)
	}
}
