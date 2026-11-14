# Meta-Observability

## Why Meta-Observability

"Observing the observer"; if the OTel Collector is silently dropping 10% of traces, every SLO
dashboard, every alerting rule, and every incident forensics query is built on incomplete data.
You will not know the pipeline is degraded unless you instrument the pipeline itself.

Other files in this skill assume a reliable telemetry pipeline. This file forces you to verify
that assumption. Four disciplines close the gap:

| Discipline | Risk if ignored | Section |
|---|---|---|
| Pipeline self-health | Silent data loss, metric gaps, memory crashes | A |
| Clock skew / NTP | Waterfall charts lie; phantom race conditions chased | B |
| Cardinality guardrails | TSDB storage explosion, query latency, vendor bill spikes | C |
| Retention matrix | Compliance violations, over-spend on raw data, data unavailable at audit | D |

Cross-cutting failure modes and recovery paths are in Section E. The alerts that guard the
pipeline itself are in Section F.

---

## Section A: Pipeline Self-Health

### A1. OTel Collector Self-Metrics

The Collector exposes its own telemetry through a Prometheus pull reader (port 8888 by convention).
Configure the reader explicitly; a bare `metrics.address` setting is ignored by current Collectors:

```yaml
# otelcol-config.yaml — telemetry block
service:
  telemetry:
    metrics:
      level: detailed          # none | basic | normal | detailed
      readers:
        - pull:
            exporter:
              prometheus:
                host: 0.0.0.0
                port: 8888
    logs:
      level: info
```

Scrape this endpoint from a separate Prometheus instance (or a second Collector) so that
Collector failures do not destroy their own observability. Do not rely on the Collector
scraping itself into its own pipeline: when it fails, the evidence fails with it.

### A2. Key otelcol_* Metrics

| Metric | What it measures | Alert threshold |
|---|---|---|
| `otelcol_receiver_accepted_spans` | Spans accepted from upstream | Baseline drop > 10% |
| `otelcol_receiver_refused_spans` | Spans refused (parse failure, queue full) | > 0 sustained for 2m |
| `otelcol_exporter_sent_spans` | Spans successfully shipped to backend | Baseline drop > 10% |
| `otelcol_exporter_send_failed_spans` | Export failures (network, auth, rate-limit) | > 1% of sent for 5m |
| `otelcol_exporter_queue_size` / `otelcol_exporter_queue_capacity` | Exporter sending-queue depth vs capacity (backpressure) | > 80% of capacity |
| `otelcol_process_runtime_heap_alloc_bytes` | Collector heap usage | > 75% of container limit |
| `otelcol_processor_memory_limiter_refused_spans` | Forced drops due to memory limit | > 0 |
| `otelcol_processor_memory_limiter_refused_metric_points` | Same, for metrics | > 0 |
| `otelcol_processor_memory_limiter_refused_log_records` | Same, for logs | > 0 |

The same `*_accepted_*`, `*_refused_*`, `*_sent_*`, and `*_send_failed_*` counter families exist
for metric points (`metric_points`) and log records (`log_records`). Apply identical thresholds.
Metric names and the level at which each is emitted change across Collector releases; confirm them
against the internal-telemetry docs for the deployed version.

### A3. Memory Limiter Processor (Required)

Add `memory_limiter` as the first processor in every pipeline to prevent OOM crashes:

```yaml
processors:
  memory_limiter:
    check_interval: 1s
    limit_percentage: 75          # hard limit: refuse new data above 75% heap
    spike_limit_percentage: 20    # headroom for burst above limit_percentage

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch, ...]
      exporters: [otlp]
    metrics:
      receivers: [otlp, prometheus]
      processors: [memory_limiter, batch, ...]
      exporters: [prometheusremotewrite]
    logs:
      receivers: [otlp, fluentforward]
      processors: [memory_limiter, batch, ...]
      exporters: [otlphttp/loki]
```

### A4. Agent Self-Resource Consumption

Order-of-magnitude expectations; measure the deployed agents before sizing limits:

| Agent | Typical RAM | Typical CPU |
|---|---|---|
| Fluent Bit | 5–15 MB | < 1% (idle), < 5% (burst) |
| OTel Collector (DaemonSet) | 30–100 MB | < 5% (moderate load) |
| OTel Collector (gateway) | 100–500 MB | scales with throughput |

Collect host-level CPU and memory for agent processes via `hostmetrics` receiver:

```yaml
receivers:
  hostmetrics:
    collection_interval: 30s
    scrapers:
      process:
        include:
          names: ["otelcol", "fluent-bit"]
          match_type: regexp
        mute_process_name_error: true
```

Fluent Bit exposes its own Prometheus metrics at `:2020/api/v1/metrics/prometheus`:

- `fluentbit_input_records_total`: records ingested per input plugin
- `fluentbit_output_proc_records_total`: records successfully processed per output plugin
- `fluentbit_output_errors_total`: output failures

### A5. End-to-End Delivery Checks

Do not divide global exporter-sent spans by global receiver-accepted spans to
estimate delivery. Sampling and filters intentionally remove spans; fan-out and
multiple Collector hops can count a span several times. Queueing also shifts
the accounting windows. Diagnose each pipeline/hop separately using receiver
refusals, exporter failures, queue depth, and expected post-policy volume.
Collector counters alone do not establish backend ingestion.

Implement an end-to-end synthetic probe: send identifiable traces expected to
be retained under the configured policy, query the selected backend after its
ingestion deadline, and record each completed check once. The following is a
**team-implemented metric**, not a Collector default:
`telemetry_probe_completed_total{pipeline="...",result="delivered|missing"}`.
Keep pipeline labels bounded and initialize both result counters to zero for
each pipeline, so an all-missing population still has a delivered=0 series.
Count only completed checks in both numerator
and denominator so ingestion lag does not compare different populations.

```promql
sum by (pipeline) (rate(telemetry_probe_completed_total{result="delivered"}[5m]))
  /
(sum by (pipeline) (rate(telemetry_probe_completed_total[5m])) > 0)
```

Set the probe deadline, volume, and threshold for the selected pipeline; 99%
below is an example target. Verify sampling expectations and query permissions
before enabling the alert. Missing probe runs need a separate job-health check.

---

## Section B: Clock Skew & NTP Discipline

### B1. Why Trace Waterfalls Lie

Distributed traces use wall-clock timestamps from the node where each span is recorded.
If two nodes have diverging clocks, the waterfall view in any tracing backend will show:

- A child span appearing to start before its parent span started.
- Negative durations on synthetic computed spans.

These patterns warrant investigation, not an automatic clock-drift verdict.
An asynchronous child can legitimately outlive its parent; ending the parent
does not end its children. Compare measured host offsets and operation semantics
before attributing suspicious cross-host ordering to clocks.

Typical NTP accuracy on well-connected cloud VMs: < 50 ms. On baremetal with good NTP: < 10 ms.
PTP (IEEE 1588) achieves sub-millisecond accuracy for financial and telco workloads.

Reference: `resources/standards.md §Clock Discipline` for the span timestamp validation rule.

### B2. NTP Requirements

All host VMs, container hosts, and Kubernetes nodes MUST run a time synchronization daemon:

- **Linux (systemd)**: `systemd-timesyncd` (lightweight) or `chrony` (recommended for accuracy)
- **Kubernetes**: Node time sync is the Linux host's responsibility. The kubelet and containers
  inherit the host clock. The path is: hypervisor NTP → node OS → container runtime → container.
  Confirm this chain with your cloud provider's documentation.

Cloud-provider time sources:

| Cloud | NTP endpoint | Notes |
|---|---|---|
| AWS | `169.254.169.123` (Amazon Time Sync Service) | PTP-backed, link-local; add to `chrony.conf`; verify with `chronyc sources -v` |
| GCP | `metadata.google.internal` | Internal hypervisor sync. `timedatectl show` only shows daemon state; use `chronyc sources -v` for actual offset |
| Azure | Hyper-V IC timesync primary; `time.windows.com` external NTP is fallback only | Azure Linux VMs with IC tools use host time. External NTP as a parallel peer can conflict; configure as fallback. Docs: <https://learn.microsoft.com/azure/virtual-machines/linux/time-sync> |

For sub-millisecond requirements (financial trading, high-frequency event processing):
use **PTP (IEEE 1588)** with hardware timestamping. Cloud support varies; AWS supports PTP on
Nitro instances via the Amazon Time Sync Service; verify availability before committing.

### B3. Span Timestamp Diagnostics

Validate each span's own start/end ordering and compare suspicious cross-host
timestamps with measured NTP/PTP offsets. The Trace API does not require child
intervals to be contained in parent intervals. Do not emit a clock violation
merely because a child ends later, and do not use nonexistent OTTL parent-time
fields as an executable Collector rule. Backend diagnostics need the operation's
actual synchronous/asynchronous semantics to classify timestamp evidence.

Source: <https://opentelemetry.io/docs/specs/otel/trace/api/>.

### B4. chrony Offset Metric

Emit `node.clock.drift_ms` from each host using a cron job or node exporter textfile collector:

```bash
#!/bin/sh
# /etc/cron.d/chrony-offset — runs every minute
OFFSET=$(chronyc tracking | awk '/System time/ {gsub(/[^0-9.-]/, "", $4); print $4 * 1000}')
echo "node_clock_drift_ms $OFFSET" > /var/lib/node_exporter/textfile/chrony_offset.prom
```

Alert rule (see Section F, Alert 3):

```promql
node_clock_drift_ms > 100
```

---

## Section C: Cardinality Guardrails

### C1. Why Cardinality Matters

Every unique label combination in a TSDB (Prometheus, VictoriaMetrics, Thanos, Mimir) creates a
separate time series. A metric with 3 labels each having 100 values creates 1,000,000 series.

Consequences of label explosion:
- TSDB storage grows quadratically with cardinality.
- Query latency increases: each query fans out across more series.
- Vendor bill spikes: SaaS TSDBs charge per active series.
- Ingestion falls behind; scrape intervals are missed.

### C2. Hard Rules

| Label | Rule | Reason |
|---|---|---|
| `user.id` | **NEVER** as metric label | Unbounded; one series per user |
| `request.id` | **NEVER** as metric label | One series per request; instant explosion |
| `trace.id` | **NEVER** as metric label | One series per trace |
| `user.email` | **NEVER** as metric label | PII + cardinality double violation |
| `tenant.id` | Cap at top-N (e.g., top-1000); overflow → label value `"other"` | Bounded set of known tenants |
| `endpoint` / `route` | Normalize high-cardinality routes: `/users/42` → `/users/_` | URL parameters are unbounded |
| `url.full` | **NEVER** raw; use `http.route` (normalized) | Query strings are unbounded |
| `error.message` | **NEVER** as label; use error type/code only | Free-text strings are unbounded |

Implement route normalization in the Collector `transform` processor:

```yaml
processors:
  transform/normalize_routes:
    error_mode: ignore
    metric_statements:
      - context: datapoint
        statements:
          - replace_pattern(attributes["http.route"], "/[0-9]+", "/_")
          - replace_pattern(attributes["http.route"], "/[0-9a-f-]{36}", "/_")  # UUID
```

### C3. Cardinality Measurement

Measure active series per metric name in Prometheus-compatible TSDBs:

```promql
# Count distinct series for a specific metric
count(http_request_duration_seconds_bucket) by (job)

# Top 10 highest-cardinality metrics in the entire TSDB
topk(10, count({__name__!=""}) by (__name__))
```

VictoriaMetrics exposes `/api/v1/status/tsdb` for cardinality breakdown by metric name
and label value; use this for bulk auditing.

Allow-list attributes with an SDK View:

```python
# Python SDK example
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.view import View

view = View(
    instrument_name="http_request_duration",
    attribute_keys={"http.request.method", "http.response.status_code", "http.route"},  # explicit allow-list
)
provider = MeterProvider(views=[view])
```

Explicitly allow-listing attributes is the most effective cardinality control.

### C4. Series Budget

Set a per-service series budget. The 5,000-series figure below is an illustrative starting baseline; high-throughput services legitimately operate at 20k-100k series. Calibrate to your service's traffic shape and TSDB ingestion cost.

```promql
# Alert: service approaching cardinality budget (example baseline: 5000 series/service)
count({job="my-service"}) > 4000
```

Cardinality explosion is an anti-pattern. See `resources/anti-patterns.md` §B for
the full cardinality anti-pattern list.

---

## Section D: Retention Matrix

Retention policy governs how long raw and aggregated data is kept, at what resolution,
and under what storage class. Failing to set explicit retention leads to either:
- Over-spend: keeping full-resolution data for years.
- Compliance violation: flushing audit logs before mandatory retention periods expire.

### D1. Unified Per-Signal Retention Policy

| Signal | Raw resolution | Aggregated / downsampled | Archive |
|---|---|---|---|
| Metrics | 15d full-res | 90d @ 5m resolution | 2y @ 1h resolution |
| Logs (operational) | 7d | 30d | 90d |
| Logs (audit) | Per-class approved schedule | Per-class approved schedule | Tamper protection; WORM if required |
| Traces (sampled, tail-based) | 30d | N/A | N/A |
| Traces (full 100% sample) | 3d | N/A | N/A |
| Profiles | 14d | N/A | N/A |
| Events | 30d | 90d | N/A |

The periods above are starting points sized to common use: 15d of full-resolution metrics covers
most post-incident reviews, 30d of sampled traces covers cross-sprint investigations, and 100%
trace capture is kept only through a release's stability window.

**Logs (audit)**: document the applicable obligation and purpose for each
record class, then select retention and tamper-protection controls. There is no
universal seven-year WORM minimum across SOC 2, ISO 27001, PCI DSS, and HIPAA.
HIPAA's six-year requirement covers required security documentation, not every
raw audit event. Personal audit data still requires a lawful purpose and
eligible erasure, subject to GDPR Article 17(3) exceptions such as a legal
obligation or legal claims. A longer lock is not automatically safer.
Cross-ref: `signals/audit.md` for evidence-specific retention and integrity.

### D2. Storage Class Configuration Example (Loki)

```yaml
# loki-config.yaml — retention is configured through the compactor
compactor:
  retention_enabled: true
  retention_delete_delay: 2h

# Stream-level policy in ruler or via label matchers:
# {log_type="audit"} → approved per-class period, with hold/erasure rules
# {log_type="operational"} → 2160h (90d)
# {log_type="debug"} → 168h (7d)
```

Cross-ref: `signals/audit.md` for integrity and retention controls (S3 Object Lock, GCS
Object Hold, Azure Immutable Blob Storage when the obligation requires them). Cross-ref: `signals/privacy.md` for
GDPR Article 5(1)(e) storage limitation (data not kept longer than necessary for the purpose).

---

## Section E: Pipeline Failure Modes

| Failure mode | Symptom | Remediation |
|---|---|---|
| Upstream receiver overflow | `otelcol_receiver_refused_*` rising; `otelcol_exporter_queue_size` climbing toward capacity | Add `memory_limiter` processor; scale gateway Collector replicas horizontally |
| Exporter backpressure | `otelcol_exporter_queue_size` near `otelcol_exporter_queue_capacity`; `send_failed_*` incrementing | Check vendor rate limits; tune exporter `retry_on_failure` with exponential backoff; reduce batch size |
| Clock drift spike | Waterfall inversion; `node_clock_drift_ms > 100` alert fires | Run `chronyc makestep` to force immediate re-sync; for persistent drift, check NTP source reachability; escalate to PTP for sub-ms requirements |
| Cardinality bomb | TSDB ingestion lag; query timeouts; vendor bill alert | Identify offending metric with `topk(10, count({__name__!=""}) by (__name__))`, add `filter` processor to drop or `transform` to remove offending label |
| Memory OOM crash | Collector process exits; gap in all signals | `memory_limiter` prevents this if configured; if reached anyway, increase container memory limit or reduce `limit_percentage` |
| Audit log retention violation | Audit records deleted before, or kept past, their approved period | Verify the lock and lifecycle policy against the approved per-class schedule; cross-ref `signals/audit.md` |

### E1. Exporter Retry Configuration

```yaml
exporters:
  otlp:
    endpoint: backend:4317
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s    # give up after 5 minutes; prevents infinite queue growth
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 1000
```

### E2. Filter Processor for Cardinality Drop

```yaml
processors:
  filter/drop_high_cardinality:
    error_mode: ignore
    metrics:
      datapoint:
        - 'attributes["user.id"] != nil'      # drop any datapoint carrying user.id
        - 'attributes["request.id"] != nil'   # drop request.id label
```

Cross-ref: `resources/checklist.md §7 Recovery` for the full recovery procedure checklist.
Cross-ref: `resources/anti-patterns.md` §C for pipeline anti-patterns.

---

## Section F: Alerts

### F1. Five Golden Meta-Observability Alerts

These five alerts MUST be in place before any other observability alerting is considered
reliable. Without them, you cannot trust your alerts.

**Alert 1; Synthetic pipeline delivery below the selected target**

Requires the team-implemented completed-probe metric defined in A5; this is not
a ratio of default Collector receiver/exporter counters.

```yaml
# Alert rule entry within a PrometheusRule.spec.groups[].rules[] list
- alert: TelemetryProbeDeliveryBelowTarget
  expr: |
    (
      sum by (pipeline) (rate(telemetry_probe_completed_total{result="delivered"}[5m]))
      /
      (sum by (pipeline) (rate(telemetry_probe_completed_total[5m])) > 0)
    ) < 0.99
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Synthetic telemetry delivery below the selected 99% target"
    description: "Inspect completed probes, configured sampling, backend ingestion, exporter errors, and queues."
```

**Alert 2; Exporter send failures above 1%**

```yaml
- alert: OtelcolExporterSendFailed
  expr: |
    (
      sum(rate(otelcol_exporter_send_failed_spans[5m]))
      /
      (sum(rate(otelcol_exporter_sent_spans[5m])) > 0)
    ) > 0.01
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "OTel Collector exporter failures above 1%"
    description: "Check vendor rate limits, network connectivity, and exporter authentication."
```

**Alert 3; Node clock drift above 100 ms**

```yaml
- alert: NodeClockDriftHigh
  expr: node_clock_drift_ms > 100
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Node clock drift exceeds 100ms on {{ $labels.instance }}"
    description: "Trace waterfall ordering may be unreliable. Run chronyc makestep or check NTP source."
```

**Alert 4; Service approaching cardinality budget**

```yaml
- alert: MetricCardinalityBudgetExceeded
  expr: count({job=~".+"}) by (job) > 4000
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "{{ $labels.job }} exceeds 80% of 5000-series cardinality budget"
    description: "Identify high-cardinality labels with topk(10, count({job='{{ $labels.job }}'}) by (__name__)). Apply attribute filter."
```

**Alert 5; Audit log retention policy violation**

This alert cannot be expressed in PromQL alone; implement it as a scheduled policy check in
your compliance tooling. The metric below must be implemented by that job;
it is not automatically emitted by a storage backend or Collector. Check
both premature expiry and unjustified over-retention against the approved
record-class policy, and monitor job freshness separately:

```yaml
- alert: AuditLogRetentionViolation
  expr: audit_log_retention_compliant{log_type="audit"} == 0 # custom policy-check job: 1=compliant, 0=violation
  for: 1h
  labels:
    severity: critical
  annotations:
    summary: "Audit retention violates the approved record-class policy"
    description: "Check the applicable schedule, lock/lifecycle controls, eligible erasure, and legal holds. Cross-ref signals/audit.md."
```

## Review Triggers

- On Collector upgrade: verify `otelcol_*` metric names and the telemetry config shape against the
  internal-telemetry docs for the deployed version.
- On cloud provider NTP endpoint changes: update the Section B2 table.
- On TSDB migration (e.g., Prometheus → VictoriaMetrics): verify the cardinality queries in
  Section C3; VictoriaMetrics exposes `/api/v1/status/tsdb` for the same purpose.
