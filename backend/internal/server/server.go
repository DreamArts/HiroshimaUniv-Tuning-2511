package server

import (
	"log"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/jmoiron/sqlx"
	"github.com/rs/cors"

	"sample-backend/internal/config"
	"sample-backend/internal/handlers"
)

type Server struct {
	config *config.Config
	db     *sqlx.DB
}

func New(cfg *config.Config, db *sqlx.DB) *Server {
	return &Server{
		config: cfg,
		db:     db,
	}
}

func (s *Server) Start() error {
	// ハンドラー初期化
	productHandler := handlers.NewProductHandler(s.db)
	searchHandler := handlers.NewSearchHandler(s.db)

	// ルーター設定
	log.Println("[MAIN] Setting up routes...")
	r := mux.NewRouter()
	r.HandleFunc("/api/health", handlers.HealthHandler).Methods("GET")
	r.HandleFunc("/api/products", productHandler.GetProducts).Methods("GET")
	r.HandleFunc("/api/search", searchHandler.SearchProducts).Methods("POST")

	// CORS設定
	log.Println("[MAIN] Configuring CORS...")
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	handler := c.Handler(r)

	log.Printf("[MAIN] Server starting on port %s...", s.config.Port)
	log.Printf("[MAIN] Available endpoints:")
	log.Printf("[MAIN]   GET  /api/health  - Health check")
	log.Printf("[MAIN]   GET  /api/products - Get products with pagination")
	log.Printf("[MAIN]   POST /api/search  - Search products")

	return http.ListenAndServe(":"+s.config.Port, handler)
}
