# Metrics Signal

## 1. Scope

Metrics are the "M" in MELT+P (Metrics, Events, Logs, Traces + Profiles).

This file covers the metric decisions that are easy to get wrong in an OTel pipeline:
- Instrument, temporality, and naming rules that affect aggregation
- Which auto-instrumented metrics serve as SLI inputs, and the healthcheck rule
- `hostmetrics` receiver for host-level collection
- Kubernetes metric sources
- Cardinality and tenant-label rules (pointer)

Owned elsewhere:
- SLI selection, SLO targets, error budgets, and burn-rate alert rules: `../boundaries/slo.md`
- OpenCost metric surface, scrape config, and unit economics: `cost.md`
- Cardinality guardrails, series budgets, and remediation: `../meta-observability.md` (Section C: Cardinality Guardrails)
- Long-term storage backend selection: `../vendor-categories.md` category (i)

---

## 2. Instrument, Temporality, and Naming Rules

Source: <https://opentelemetry.io/docs/specs/otel/metrics/api/>

### 2.1 Instrument Selection

| Measurement | Instrument | Rule |
|-------------|------------|------|
| Cumulative total that never decreases | Counter | Never use for values that can decrease |
| Quantity that rises and falls (queue length, in-flight requests) | UpDownCounter | Never use for strictly increasing values |
| Point-in-time reading from an external source | Gauge (prefer the async `ObservableGauge`) | No accumulation |
| Distribution (duration, size) | Histogram | Set explicit bucket boundaries per instrument |

### 2.2 Histogram Buckets

The default OTel SDK boundaries are `[0, 5, 10, 25, 50, 75, 100, 250, 500, 750, 1000, 2500, 5000, 7500, 10000]`, sized for millisecond values. A seconds-based duration histogram recorded against these lands almost entirely in the first buckets and `histogram_quantile` becomes meaningless. Override the boundaries with a View for every seconds-based instrument.

### 2.3 Summary Is Legacy Interoperability Data

Summary is a legacy metric data type carried by the OTel data model for Prometheus/OpenCensus imports; the Meter API does not create a Summary instrument. Its quantiles are computed per process and cannot be merged across replicas: a `p99` from three replicas is not a fleet `p99`. Use Histogram + `histogram_quantile` for any distributed system. Keep an existing Summary only when the downstream consumer cannot be migrated and the measurement is single-process.

### 2.4 Temporality: Delta vs Cumulative

The OTLP metric exporter defaults to `cumulative`. Delta is a configurable preference for supported instrument kinds; verify the exporter and language implementation.
Prometheus counters expose cumulative values; gauges can increase or decrease. Choose conversion according to the instrument and backend, not a blanket monotonic rule for every metric.

Set the preference via environment variable:

```
OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE=cumulative
```

For delta OTLP input destined for a cumulative backend, use the Collector delta-to-cumulative processor; check the component ID that the deployed distribution and version accept. `prometheusreceiver` scrapes Prometheus input; it is not a delta OTLP conversion processor. Sources: <https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/otlp/> and <https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/deltatocumulativeprocessor>.

### 2.5 Naming and Labels

- Durations are recorded in seconds (`_seconds`), sizes in bytes (`_bytes`), fractions as `_ratio` (0.0–1.0), and counters end in `_total` when exposed in Prometheus format.
- Use `http.route` (normalized), never raw `url.full`, as a label.
- Never use `user.id`, `request.id`, `trace.id`, raw `url.full`, or `error.message` as metric labels. The full label rules live in `../meta-observability.md` (Section C: Cardinality Guardrails).

---

## 3. SLI and Health Metrics

### 3.1 Auto-Instrumented SLI Inputs

OTel auto-instrumentation provides request rate, error, and duration metrics for common frameworks. These are the usual SLI inputs:

| Source | Metric | Instrument |
|--------|--------|------------|
| HTTP server | `http.server.request.duration` | Histogram |
| HTTP server (in-flight) | `http.server.active_requests` | UpDownCounter |
| HTTP client | `http.client.request.duration` | Histogram |
| RPC | `rpc.server.call.duration`, `rpc.client.call.duration` | Histogram |
| Database client | `db.client.operation.duration` | Histogram |

Confirm each metric's stability tier in the semconv registry and confirm that the framework's instrumentation library emits it before an SLO depends on it. SLI formulas, SLO targets, and burn-rate rules are in `../boundaries/slo.md`.

### 3.2 Healthcheck Endpoints and Metrics

Kubernetes readiness and liveness probes (`/readyz`, `/healthz`) are HTTP checks; they are not metrics themselves. The underlying health state MUST also be exposed as a metric so that dashboards and SLO computation can consume it continuously:

```promql
# Prometheus scrape synthetic metric
up{job="my-service"}

# Custom health gauge from OTel SDK (1 = healthy, 0 = unhealthy)
service_health_status{service="checkout", check="database"} 1
```

A healthcheck that returns 200 without reflecting dependency health produces false-positive availability. If the database is down, the readiness probe MUST return a non-2xx status and the `service_health_status` gauge MUST read 0.

---

## 4. hostmetrics Receiver (OTel Collector)

Source: <https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/hostmetricsreceiver>

The `hostmetrics` receiver collects host-level OS metrics without a separate agent. It runs inside the OTel Collector process and reads from OS interfaces. Deploy it in the DaemonSet agent tier (one Collector per node); see `../transport/collector-topology.md` for the two-tier topology.

```yaml
receivers:
  hostmetrics:
    collection_interval: 30s
    root_path: /hostfs    # required when running in a container; mount host /proc and /sys
    scrapers:
      cpu: {}
      memory: {}
      disk: {}
      filesystem: {}
      network: {}
      load: {}
      paging: {}
      process:
        mute_process_name_error: true
```

| Scraper | Metric family | Covers |
|---------|---------------|--------|
| `cpu` | `system.cpu.*` | CPU time and utilization by state |
| `memory` | `system.memory.*` | Memory usage and utilization by state |
| `disk` | `system.disk.*` | Disk I/O bytes, operations, and busy time by device |
| `filesystem` | `system.filesystem.*` | Filesystem usage by mount point |
| `network` | `system.network.*` | Network I/O and errors by interface and direction |
| `load` | `system.cpu.load_average.*` | 1m / 5m / 15m load averages |
| `paging` | `system.paging.*` | Swap usage and paging activity |
| `process` | `process.*` | Per-process CPU time and memory |

Several metrics are disabled by default (utilization metrics in particular). Take exact metric names and defaults from the receiver's documentation for the deployed Collector version.

Where the Collector cannot run on the host, Prometheus Node Exporter is the alternative: scrape it with `prometheusreceiver`. Its metric names differ from OTel semconv (`node_cpu_seconds_total` vs `system.cpu.time`), so dashboards are not portable between the two. Prefer `hostmetrics` for new deployments.

---

## 5. Kubernetes Metric Sources

Three complementary sources cover cluster, node, pod, and container metrics:

| Source | Scope | Collector component |
|--------|-------|---------------------|
| `kubeletstats` receiver | Pod and container metrics from kubelet API | `kubeletstatsreceiver` |
| `k8scluster` receiver | Cluster-level state (node conditions, pod phases, deployment replicas) | `k8sclusterreceiver` |
| Prometheus operator + ServiceMonitor CRD | Scrape application Prometheus endpoints declaratively | `prometheusreceiver` |

`kubeletstats` belongs in the DaemonSet agent tier; `k8scluster` must run as a single instance, or it duplicates cluster-state metrics. Placement of each component is in `../transport/collector-topology.md`.

---

## 6. Cardinality and Tenant Labels

Cardinality rules, measurement queries, series budgets, and SDK View allow-listing are in `../meta-observability.md` (Section C: Cardinality Guardrails). Two rules are specific to metric design:

- `tenant.id` is allowed as a metric label only with a hard cap: top-N explicit tenants (for example 1000), all others mapped to the label value `"other"`.
- Never create a new metric name per tenant (`http_requests_total_tenant_acme`); it bypasses TSDB cardinality controls and cannot be aggregated across tenants.

Per-tenant metric attribution and isolation are in `../boundaries/multi-tenant.md`.

---

## Cross-References

| Topic | File |
|-------|------|
| SLO policy, error budget, burn-rate alerts | `../boundaries/slo.md` |
| OpenCost metrics and unit economics | `cost.md` |
| Cardinality guardrails and remediation | `../meta-observability.md` |
| Collector two-tier topology (DaemonSet + gateway) | `../transport/collector-topology.md` |
| OTel spec and semconv stability tiers | `../standards.md` |
| Metric anti-patterns | `../anti-patterns.md` (Section B) |
| Long-term metrics storage selection | `../vendor-categories.md` category (i) |
| Exemplars (metric → trace pivot) | `traces.md` |
