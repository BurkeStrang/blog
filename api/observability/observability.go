package observability

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/exporters/prometheus"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/propagation"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.38.0"
	"go.opentelemetry.io/otel/trace"
)

const (
	defaultServiceName    = "blog-api"
	defaultServiceVersion = "dev"
)

var (
	requestCount    metric.Int64Counter
	requestDuration metric.Float64Histogram
)

// ShutdownFunc releases observability exporters and providers.
type ShutdownFunc func(context.Context) error

// Init configures OpenTelemetry traces, metrics, and context propagation.
func Init(ctx context.Context) (ShutdownFunc, error) {
	serviceName := envOrDefault("OTEL_SERVICE_NAME", defaultServiceName)
	serviceVersion := envOrDefault("OTEL_SERVICE_VERSION", defaultServiceVersion)

	res, err := resource.Merge(
		resource.Default(),
		resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceName(serviceName),
			semconv.ServiceVersion(serviceVersion),
			attribute.String("deployment.environment", envOrDefault("OTEL_DEPLOYMENT_ENVIRONMENT", "local")),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("create otel resource: %w", err)
	}

	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	var shutdowns []ShutdownFunc

	if !isDisabled("OTEL_TRACES_EXPORTER") {
		traceProvider, err := newTraceProvider(ctx, res)
		if err != nil {
			return nil, err
		}
		otel.SetTracerProvider(traceProvider)
		shutdowns = append(shutdowns, traceProvider.Shutdown)
	} else {
		log.Println("OpenTelemetry trace export disabled by OTEL_TRACES_EXPORTER=none")
	}

	meterProvider, err := newMeterProvider(res)
	if err != nil {
		return nil, err
	}
	otel.SetMeterProvider(meterProvider)
	shutdowns = append(shutdowns, meterProvider.Shutdown)

	meter := otel.Meter("blogapi/observability")
	requestCount, err = meter.Int64Counter(
		"http.server.requests",
		metric.WithDescription("Total HTTP requests received by the API."),
	)
	if err != nil {
		return nil, fmt.Errorf("create request counter: %w", err)
	}
	requestDuration, err = meter.Float64Histogram(
		"http.server.request.duration",
		metric.WithDescription("HTTP request duration in milliseconds."),
		metric.WithUnit("ms"),
	)
	if err != nil {
		return nil, fmt.Errorf("create request duration histogram: %w", err)
	}

	return func(ctx context.Context) error {
		var errs []error
		for _, shutdown := range shutdowns {
			if err := shutdown(ctx); err != nil {
				errs = append(errs, err)
			}
		}
		return errors.Join(errs...)
	}, nil
}

func newTraceProvider(ctx context.Context, res *resource.Resource) (*sdktrace.TracerProvider, error) {
	options := []otlptracegrpc.Option{}
	if endpoint := os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT"); endpoint != "" {
		options = append(options, otlptracegrpc.WithEndpoint(strings.TrimPrefix(endpoint, "http://")))
	}
	if strings.EqualFold(os.Getenv("OTEL_EXPORTER_OTLP_INSECURE"), "true") {
		options = append(options, otlptracegrpc.WithInsecure())
	}

	exporter, err := otlptracegrpc.New(ctx, options...)
	if err != nil {
		return nil, fmt.Errorf("create OTLP trace exporter: %w", err)
	}

	return sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(res),
		sdktrace.WithSampler(sdktrace.ParentBased(sdktrace.TraceIDRatioBased(traceSampleRatio()))),
	), nil
}

func newMeterProvider(res *resource.Resource) (*sdkmetric.MeterProvider, error) {
	exporter, err := prometheus.New()
	if err != nil {
		return nil, fmt.Errorf("create prometheus exporter: %w", err)
	}

	return sdkmetric.NewMeterProvider(
		sdkmetric.WithReader(exporter),
		sdkmetric.WithResource(res),
	), nil
}

// Middleware adds Gin request spans and records Prometheus-friendly HTTP metrics.
func Middleware(serviceName string) gin.HandlerFunc {
	return otelgin.Middleware(serviceName)
}

// MetricsHandler exposes the Prometheus scrape endpoint.
func MetricsHandler() gin.HandlerFunc {
	handler := promhttp.Handler()
	return func(c *gin.Context) {
		handler.ServeHTTP(c.Writer, c.Request)
	}
}

// HTTPMetricsMiddleware records low-cardinality metrics after each request.
func HTTPMetricsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		route := c.FullPath()
		if route == "" {
			route = "unmatched"
		}

		attrs := metric.WithAttributes(
			attribute.String("http.request.method", c.Request.Method),
			attribute.String("http.route", route),
			attribute.Int("http.response.status_code", c.Writer.Status()),
		)
		elapsedMs := float64(time.Since(start).Microseconds()) / 1000
		ctx := c.Request.Context()
		requestCount.Add(ctx, 1, attrs)
		requestDuration.Record(ctx, elapsedMs, attrs)
	}
}

// TraceFields returns active trace identifiers for log correlation.
func TraceFields(ctx context.Context) (string, string, bool) {
	spanContext := trace.SpanContextFromContext(ctx)
	if !spanContext.IsValid() {
		return "", "", false
	}
	return spanContext.TraceID().String(), spanContext.SpanID().String(), true
}

func envOrDefault(name, fallback string) string {
	value := strings.TrimSpace(os.Getenv(name))
	if value == "" {
		return fallback
	}
	return value
}

func isDisabled(name string) bool {
	return strings.EqualFold(strings.TrimSpace(os.Getenv(name)), "none")
}

func traceSampleRatio() float64 {
	raw := strings.TrimSpace(os.Getenv("OTEL_TRACES_SAMPLER_ARG"))
	if raw == "" {
		return 1
	}
	ratio, err := strconv.ParseFloat(raw, 64)
	if err != nil || ratio < 0 || ratio > 1 {
		log.Printf("Invalid OTEL_TRACES_SAMPLER_ARG=%q; using 1.0", raw)
		return 1
	}
	return ratio
}
