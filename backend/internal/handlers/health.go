package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
)

func HealthHandler(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	log.Printf("[API] Health check request from %s", r.RemoteAddr)

	// トレースの開始
	tracer := otel.Tracer("product-search-backend")
	_, span := tracer.Start(r.Context(), "health_check")
	defer span.End()

	setJSONHeaders(w)
	response := map[string]string{
		"status":    "ok",
		"timestamp": time.Now().Format(time.RFC3339),
		"message":   "サーバーは正常に動作しています",
	}

	span.SetAttributes(attribute.String("response.status", "ok"))

	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("[ERROR] Failed to encode health response: %v", err)
		return
	}

	duration := time.Since(start)
	log.Printf("[API] Health check completed in %v", duration)
}

func setJSONHeaders(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache")
}
