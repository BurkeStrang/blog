# blog

## this is a three.js blog

## observability

The Go API emits OpenTelemetry traces, correlated request logs, Redis spans/metrics, and Prometheus metrics.

Run the local Grafana/Prometheus/Tempo stack:

```sh
cd observability
docker compose up -d
```

Run the API with OTLP trace export enabled:

```sh
cd api
OTEL_EXPORTER_OTLP_ENDPOINT=localhost:4317 \
OTEL_EXPORTER_OTLP_INSECURE=true \
OTEL_SERVICE_NAME=blog-api \
go run main.go
```

Prometheus scrapes `http://localhost:8080/metrics`. Grafana is available at `http://localhost:3000` with Prometheus and Tempo data sources provisioned. Use the `trace_id` from API logs to search Tempo and see the ordered request spans. Set `OTEL_TRACES_EXPORTER=none` to run without trace export.
