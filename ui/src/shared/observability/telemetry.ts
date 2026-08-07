import { ApplicationInsights } from "@microsoft/applicationinsights-web";
import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import { context, trace } from "@opentelemetry/api";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { DocumentLoadInstrumentation } from "@opentelemetry/instrumentation-document-load";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from "@opentelemetry/sdk-logs";
import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import {
  BatchSpanProcessor,
  WebTracerProvider,
} from "@opentelemetry/sdk-trace-web";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

type Env = {
  VITE_API_URL?: string;
  VITE_OTEL_EXPORTER_OTLP_ENDPOINT?: string;
  VITE_APPLICATIONINSIGHTS_CONNECTION_STRING?: string;
  MODE?: string;
};
const env = (import.meta as unknown as { env: Env }).env;

const SERVICE_NAME = "blog-ui";
const SERVICE_VERSION = env.MODE === "production" ? "prod" : "dev";

function initOpenTelemetry(otlpBase: string, apiOrigin: string | undefined): void {
  const base = otlpBase.replace(/\/+$/, "");
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: SERVICE_NAME,
    [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
  });

  // ── Traces ──────────────────────────────────────────────────────────────
  const tracerProvider = new WebTracerProvider({
    resource,
    spanProcessors: [
      new BatchSpanProcessor(new OTLPTraceExporter({ url: `${base}/v1/traces` })),
    ],
  });
  tracerProvider.register();

  // ── Metrics ─────────────────────────────────────────────────────────────
  const meterProvider = new MeterProvider({
    resource,
    readers: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: `${base}/v1/metrics` }),
        exportIntervalMillis: 30_000,
      }),
    ],
  });

  // Emit one page-view counter on startup so the resource shows up in the
  // dashboard's Metrics tab immediately rather than waiting on an instrumentation.
  meterProvider
    .getMeter(SERVICE_NAME)
    .createCounter("ui.page_view", { description: "Page views in the SPA" })
    .add(1, { path: window.location.pathname });

  // ── Logs ────────────────────────────────────────────────────────────────
  const loggerProvider = new LoggerProvider({
    resource,
    processors: [
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({ url: `${base}/v1/logs` }),
      }),
    ],
  });
  logs.setGlobalLoggerProvider(loggerProvider);

  patchConsoleToOtel();

  // ── Auto-instrumentation ────────────────────────────────────────────────
  const propagateUrls: (string | RegExp)[] = [];
  if (apiOrigin) {
    propagateUrls.push(apiOrigin);
  }

  registerInstrumentations({
    instrumentations: [
      new DocumentLoadInstrumentation(),
      new FetchInstrumentation({
        propagateTraceHeaderCorsUrls: propagateUrls,
        clearTimingResources: true,
      }),
    ],
  });
}

// Bridge browser console to OTel logs so console.* calls show up in the
// dashboard's Structured Logs tab. Originals still print to DevTools.
function patchConsoleToOtel(): void {
  const logger = logs.getLogger(SERVICE_NAME);
  const levels: Record<string, SeverityNumber> = {
    debug: SeverityNumber.DEBUG,
    info: SeverityNumber.INFO,
    log: SeverityNumber.INFO,
    warn: SeverityNumber.WARN,
    error: SeverityNumber.ERROR,
  };

  for (const [method, severity] of Object.entries(levels)) {
    const original = (console as unknown as Record<string, (...args: unknown[]) => void>)[method];
    (console as unknown as Record<string, (...args: unknown[]) => void>)[method] = (
      ...args: unknown[]
    ) => {
      try {
        logger.emit({
          severityNumber: severity,
          severityText: method.toUpperCase(),
          body: args
            .map((a) => (typeof a === "string" ? a : safeStringify(a)))
            .join(" "),
        });
      } catch {
        // Never let the bridge break the page.
      }
      original.apply(console, args);
    };
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function initApplicationInsights(connectionString: string): void {
  const appInsights = new ApplicationInsights({
    config: {
      connectionString,
      enableAutoRouteTracking: true,
      enableCorsCorrelation: true,
      enableRequestHeaderTracking: true,
      enableResponseHeaderTracking: true,
      disableFetchTracking: false,
      autoTrackPageVisitTime: true,
    },
  });
  appInsights.loadAppInsights();
  appInsights.trackPageView();
  (window as unknown as { appInsights?: ApplicationInsights }).appInsights = appInsights;
}

export function initTelemetry(): void {
  const flagged = window as unknown as { __telemetryInitialised?: boolean };
  if (flagged.__telemetryInitialised) {
    return;
  }
  flagged.__telemetryInitialised = true;

  const apiOrigin = env.VITE_API_URL;
  const connectionString = env.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING;
  const otlpBase = env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT;

  if (connectionString) {
    initApplicationInsights(connectionString);
  } else if (otlpBase) {
    initOpenTelemetry(otlpBase, apiOrigin);
  }
}

export { context, trace };
