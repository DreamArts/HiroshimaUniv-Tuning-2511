package config

import (
	"log"
	"os"
)

type Config struct {
	DatabaseURL    string
	Port           string
	TraceEnabled   bool
	JaegerEndpoint string
}

func Load() *Config {
	log.Println("[CONFIG] Loading configuration...")

	cfg := &Config{
		DatabaseURL:    getEnv("DATABASE_URL", "root:mysql@tcp(db:3306)/sample_db"),
		Port:           getEnv("PORT", "8080"),
		TraceEnabled:   getEnv("TRACE_ENABLED", "false") == "true",
		JaegerEndpoint: getEnv("JAEGER_ENDPOINT", "http://jaeger:14268/api/traces"),
	}

	log.Printf("[CONFIG] Port: %s", cfg.Port)
	log.Printf("[CONFIG] TraceEnabled: %t", cfg.TraceEnabled)
	log.Printf("[CONFIG] JaegerEndpoint: %s", cfg.JaegerEndpoint)

	return cfg
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
