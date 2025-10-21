package database

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"

	"sample-backend/internal/config"
)

func Connect(cfg *config.Config) (*sqlx.DB, error) {
	log.Println("[DB] Initializing database connection...")

	dsn := fmt.Sprintf("%s?charset=utf8mb4&parseTime=True&loc=Asia%%2FTokyo", cfg.DatabaseURL)
	log.Printf("[DB] Using DSN: %s", strings.ReplaceAll(dsn, "mysql", "mysql://***:***"))

	dbConn, err := sqlx.Open("mysql", dsn)
	if err != nil {
		log.Printf("[DB ERROR] Failed to open database connection: %v", err)
		return nil, fmt.Errorf("failed to open database connection: %w", err)
	}

	// 接続テスト（タイムアウト付き）
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	log.Println("[DB] Testing database connection...")
	for i := 0; i < 10; i++ {
		err = dbConn.PingContext(ctx)
		if err == nil {
			break
		}
		log.Printf("[DB] Connection attempt %d/10 failed: %v", i+1, err)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		dbConn.Close()
		log.Printf("[DB ERROR] Failed to connect to database after 10 attempts: %v", err)
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// コネクションプールの設定
	dbConn.SetMaxOpenConns(25)
	dbConn.SetMaxIdleConns(10)
	dbConn.SetConnMaxLifetime(5 * time.Minute)

	log.Println("[DB] Database connection established successfully")
	return dbConn, nil
}
