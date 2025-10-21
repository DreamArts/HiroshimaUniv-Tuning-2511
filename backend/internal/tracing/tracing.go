package tracing

import (
	"log"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/jaeger"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.12.0"

	"sample-backend/internal/config"
)

func Init(cfg *config.Config) {
	log.Println("[INIT] Initializing tracing...")
	log.Printf("[INIT] TRACE_ENABLED: %t", cfg.TraceEnabled)

	if !cfg.TraceEnabled {
		log.Println("[INIT] Tracing disabled")
		return
	}

	log.Printf("[INIT] Jaeger endpoint: %s", cfg.JaegerEndpoint)

	// Jaeger エクスポーターの作成
	exp, err := jaeger.New(jaeger.WithCollectorEndpoint(jaeger.WithEndpoint(cfg.JaegerEndpoint)))
	if err != nil {
		log.Printf("[ERROR] Failed to create Jaeger exporter: %v", err)
		return
	}

	// トレースプロバイダーの作成
	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exp),
		sdktrace.WithResource(resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceNameKey.String("product-search-backend"),
		)),
	)

	// グローバル設定
	otel.SetTracerProvider(tp)
	log.Println("[INIT] Tracing enabled successfully")
}
