# Web RUM: Real User Monitoring

## 1. Scope

This file covers browser-side Real User Monitoring (RUM) for web applications.

**In scope:** performance signals (Core Web Vitals), error tracking (`window.onerror`, unhandled promise rejections, source map correlation), 3rd-party script impact and CSP violation reporting, client-to-server trace correlation via W3C `traceparent`, session replay (vendor overview).

**Out of scope:** mobile RUM (see `mobile-rum.md`); native app crash analytics (see `crash-analytics.md`); synthetic monitoring tooling. Synthetic probes complement RUM where RUM is weak: low-traffic pages with too few samples, and availability SLIs that must not depend on sampling.

---

## 2. Core Web Vitals

**INP (Interaction to Next Paint)** is the Core Web Vitals responsiveness metric. FID (First Input Delay) is not a Core Web Vital; do not report it in dashboards or SLOs.

Reference implementation: `web-vitals` JS library (`google/web-vitals`); resolve the current major at use time.

### Official CWV Targets

| Metric | Full name | Dimension | Good | Needs improvement | Poor |
|--------|-----------|-----------|------|-------------------|------|
| **LCP** | Largest Contentful Paint | Loading performance | ≤ 2.5 s | 2.5 s – 4.0 s | > 4.0 s |
| **INP** | Interaction to Next Paint | Responsiveness | ≤ 200 ms | 200 ms – 500 ms | > 500 ms |
| **CLS** | Cumulative Layout Shift | Visual stability | ≤ 0.1 | 0.1 – 0.25 | > 0.25 |

### Additional Operational Signals (not official CWV)

| Metric | Meaning | Typical target |
|--------|---------|---------------|
| TTFB | Time to First Byte; server + network latency | ≤ 800 ms |
| FCP | First Contentful Paint; when first content is painted | ≤ 1.8 s |

Use `web-vitals` to collect all signals with a uniform API:

```js
import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals';

function sendToAnalytics({ name, value, rating, id }) {
  // forward to your RUM backend or OTel OTLP endpoint
  navigator.sendBeacon('/rum', JSON.stringify({ name, value, rating, id }));
}

onLCP(sendToAnalytics);
onINP(sendToAnalytics);
onCLS(sendToAnalytics);
onFCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

SLI recommendation: use **p75** for each CWV metric as the SLI value (aligns with Google Search Console scoring). Cross-reference: `../../boundaries/slo.md` for SLO burn-rate alert configuration.

---

## 3. Browser OpenTelemetry SDK

The OTel JavaScript SDK provides browser instrumentation for traces and metrics.

**Stability note:** upstream describes client instrumentation for the browser as experimental and mostly unspecified. The browser instrumentation packages below are all 0.x releases, and browser log/event instrumentation is still being developed in the OTel Browser SIG repository (`open-telemetry/opentelemetry-browser`). Do not build production SLOs on experimental instrumentations without a fallback to `web-vitals` directly.

### Typical Instrumentations

| Package | What it instruments | Status |
|---------|-------------------|--------|
| `@opentelemetry/instrumentation-document-load` | Navigation timing, resource timing | 0.x (experimental) |
| `@opentelemetry/instrumentation-user-interaction` | Click events → spans | 0.x (experimental) |
| `@opentelemetry/instrumentation-fetch` | `fetch()` calls + `traceparent` injection | 0.x (experimental) |
| `@opentelemetry/instrumentation-xml-http-request` | `XMLHttpRequest` + header injection | 0.x (experimental) |

### Minimal SDK Initialization

```js
import { context, propagation, trace } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  BatchSpanProcessor,
  StackContextManager,
  TracerProvider,
} from '@opentelemetry/sdk-trace';

const tracerProvider = new TracerProvider({
  resource: resourceFromAttributes({
    'service.name': 'my-web-app',
    'service.version': import.meta.env.VITE_RELEASE_VERSION, // CI-injected
    'deployment.environment.name': import.meta.env.MODE,
  }),
  // Span processors are a constructor option; there is no addSpanProcessor().
  spanProcessors: [
    new BatchSpanProcessor({
      exporter: new OTLPTraceExporter({ url: 'https://otel-collector.example.com/v1/traces' }),
    }),
  ],
});

trace.setGlobalTracerProvider(tracerProvider);
// Use ZoneContextManager from @opentelemetry/context-zone when spans must follow async callbacks.
context.setGlobalContextManager(new StackContextManager().enable());
propagation.setGlobalPropagator(new W3CTraceContextPropagator());

registerInstrumentations({
  instrumentations: [
    new DocumentLoadInstrumentation(),
    new UserInteractionInstrumentation(),
    new FetchInstrumentation({
      // Allow traceparent injection only to trusted origins (see §5)
      propagateTraceHeaderCorsUrls: [/^https:\/\/api\.example\.com(?:\/|$)/],
    }),
  ],
});
```

The sample targets `@opentelemetry/sdk-trace`, the package that supersedes `sdk-trace-web` and `sdk-trace-base`. On an SDK 2.x release that predates it, use `WebTracerProvider` from `@opentelemetry/sdk-trace-web` with the same `resource` and `spanProcessors` options, construct `new BatchSpanProcessor(exporter)`, and call `provider.register({ propagator })`. Check the OTel JS browser getting-started page and the migration guide for the installed SDK major before copying either form.

**Session and view identifier strategy:** Generate a `session.id` UUID on tab open (stored in `sessionStorage`) and a `view.id` UUID on each route change. Attach both as span attributes. This enables session-level RUM aggregation without a vendor SDK.

---

## 4. Vendor Options

Vendors below are examples, not a registry; verify current offerings in vendor documentation. `../../vendor-categories.md` has no dedicated RUM category: RUM is bundled into category (b) Commercial SaaS Unified APM, and error-first products appear under category (j) Crash Analytics.

| Vendor | Bundle size | Session replay | OTel-based | Full-stack correlation | Notes |
|--------|------------|---------------|-----------|----------------------|-------|
| **Sentry Browser** | Medium | Yes (opt-in) | Partial | Strong | Error-first; release tracking |
| **Grafana Faro** | Lightweight | No | Yes | Grafana stack | OSS; emits OTel-compatible signals; pairs with LGTM+ |
| **Datadog RUM** | Heavy | Yes | Partial | APM link | Strongest APM-to-RUM pivot; `allowedTracingUrls` CORS config |
| **SmartBear Insight Hub** (Bugsnag SDKs) | Light | No | No | Partial | Stability-focused; good grouping |

For vendor-specific setup, delegate to a vendor-published skill when one is installed; otherwise route to `/oma-search --docs "{vendor} browser RUM setup"`.

---

## 5. Client-to-Server Error Correlation

**Problem:** A server-side 5xx error causes the browser to retry. Without shared trace context, each retry appears as an independent request in backend traces. The root cause (one bad deploy) generates a cascade that looks like independent failures.

**Solution:** emit the same `trace_id` on both sides using W3C `traceparent`.

The `FetchInstrumentation` (OTel JS) and Datadog RUM inject `traceparent` automatically into outbound requests; but only for origins listed in the CORS allowlist configuration.

```js
// OTel JS SDK — propagateTraceHeaderCorsUrls
new FetchInstrumentation({
  propagateTraceHeaderCorsUrls: [
    /^https:\/\/api\.example\.com(?:\/|$)/,
    /^https:\/\/gateway\.example\.com(?:\/|$)/,
  ],
});

// Datadog RUM — allowedTracingUrls
datadogRum.init({
  allowedTracingUrls: [
    { match: /^https:\/\/api\.example\.com(?:\/|$)/, propagatorTypes: ['tracecontext'] },
  ],
});
```

The SDK tracing allowlist controls injection, not server CORS permission. For cross-origin requests, configure the API's OPTIONS/preflight response and `Access-Control-Allow-Headers` for the headers actually sent (`traceparent`, `tracestate`, and `baggage` when used), and `Access-Control-Allow-Origin` for the trusted frontend origin. Credentialed requests require an explicit allowed origin and `Access-Control-Allow-Credentials: true`. Verify browser preflight behavior. The server must extract the propagated context and emit the same `trace_id` in its own spans. When the browser console shows an error, the `trace_id` links directly to the backend trace in Sentry Performance, Datadog APM, or any OTel-compatible backend.

**Anti-pattern to avoid:** client retry loop on 5xx without a circuit breaker. Retrying immediately amplifies server load. Implement exponential backoff + circuit breaker in the fetch layer before enabling distributed tracing; otherwise the correlation data documents a cascading failure, not a single event. Cross-reference: `../../anti-patterns.md §G` and `../../signals/traces.md`.

---

## 6. Third-Party Scripts and CSP

3rd-party scripts are the dominant cause of LCP regression and a primary XSS / supply-chain attack vector. Observability of 3rd-party scripts requires both performance attribution and security violation reporting.

### Content Security Policy Violation Reporting

```http
Content-Security-Policy: default-src 'self';
  script-src 'self' https://cdn.trusted-vendor.com;
  report-to csp-violations;
  report-uri https://csp-reports.example.com/collect

Reporting-Endpoints: csp-violations="https://csp-reports.example.com/collect"
```

> `report-uri` is the legacy fallback directive for browsers that do not support the Reporting API (`report-to`). Keep both so every browser delivers violation reports.

CSP violations are reported to your server endpoint as JSON. Pipe them to your log backend and alert on new `blocked-uri` origins; these indicate either a new 3rd-party load attempt or a supply-chain injection.

### Subresource Integrity (SRI)

Pin the exact hash of any 3rd-party CDN script to detect tampered deliveries:

```html
<script
  src="https://cdn.trusted-vendor.com/lib.min.js"
  integrity="sha384-<base64-hash>"
  crossorigin="anonymous"
></script>
```

### Performance Attribution

Use the Resource Timing API (`PerformanceObserver` type `resource`, `buffered: true`) to attribute LCP and INP delays to specific 3rd-party origins by comparing `new URL(entry.name).origin` against `window.location.origin`. Report per-origin `entry.duration` to your RUM backend.

Cross-reference: `../../signals/privacy.md` for 3rd-party cookie and tracking signal rules; `../../anti-patterns.md §G` for the "unmonitored 3rd-party script" anti-pattern.

---

## 7. Session Replay

Session replay records DOM mutations to reconstruct a visual playback. Vendors include Sentry Session Replay, Datadog Session Replay (both mask all inputs by default), FullStory, Hotjar, and LogRocket.

**Privacy requirements:**
- Email addresses, credit card fields, and `input[type=password]` MUST be masked client-side before the payload is sent. Do not rely on server-side masking alone.
- Session replay consent must be tied to the cookie consent flow (GDPR Article 6(1)(a)).
- Cross-reference: `../../signals/privacy.md` for replay sanitization rules and PII classification.

---

## 8. Error Tracking

```js
// Global error handler
window.addEventListener('error', (event) => {
  myRumSdk.captureException(event.error, {
    'span.id': currentSpan?.spanContext().spanId,
    'trace.id': currentSpan?.spanContext().traceId,
  });
});

// Unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  myRumSdk.captureException(event.reason);
});
```

Framework error boundaries (React `ErrorBoundary`, Vue `app.config.errorHandler`) catch render-time errors that never reach `window.onerror`; report from both.

**Source map uploads:** Minified production bundles produce unreadable stack traces. Upload source maps to your error tracking vendor on every release.

```bash
# Example: Sentry CLI source map upload (run in CI after build)
# SENTRY_AUTH_TOKEN, SENTRY_ORG, and SENTRY_PROJECT come from the CI environment
sentry-cli sourcemaps inject ./dist
sentry-cli sourcemaps upload ./dist
```

Cross-reference: `../../boundaries/release.md` for CI integration patterns; source map upload should be gated on the same pipeline step as container image push.

---

## 9. References

Internal cross-references:
- `../../standards.md`: normative semconv stability tiers and W3C Trace Context requirements
- `../../matrix.md`: coverage map (L7-application rows)
- `../../vendor-categories.md`: vendor category taxonomy and delegation targets
- `../../anti-patterns.md`: anti-pattern catalog (§G Frontend / Mobile)
- `../../boundaries/slo.md`: SLO definitions for CWV SLIs and burn-rate alerts
- `../../boundaries/release.md`: source map upload CI integration and `service.version` tagging
- `../../boundaries/cross-application.md`: propagator matrix (for `traceparent` CORS allowlist guidance)
- `../../signals/privacy.md`: PII masking rules, 3rd-party tracking signals, replay sanitization
- `../../signals/traces.md`: server-side trace patterns for backend correlation
- `../mesh.md`: mesh propagator headers (cross-reference for `traceparent` propagation chain)
- `mobile-rum.md`: mobile RUM (offline-first queuing, battery, app lifecycle)
- `crash-analytics.md`: native crash symbolication and CFR tracking

External:

- Core Web Vitals: <https://web.dev/articles/vitals>
- INP as a Core Web Vital: <https://web.dev/blog/inp-cwv>
- `web-vitals` JS library: <https://github.com/GoogleChrome/web-vitals>
- OTel JS browser getting started: <https://opentelemetry.io/docs/languages/js/getting-started/browser/>
- OTel JS migration guides: <https://github.com/open-telemetry/opentelemetry-js/tree/main/doc>
- OTel Browser SIG repository: <https://github.com/open-telemetry/opentelemetry-browser>
- Datadog RUM browser SDK: <https://docs.datadoghq.com/real_user_monitoring/browser/>
- Sentry Browser SDK: <https://docs.sentry.io/platforms/javascript/>
- Grafana Faro: <https://grafana.com/oss/faro/>
