# Logs Signal Reference

## 1. Scope

Logs are the "L" in MELT+P. Covers: events as LogRecords, systemd journal and OS log sources, collection agents, trace-ID injection, severity sampling, and retention.

**Normative base:** `../standards.md`. Fluentd remains CNCF Graduated. Select Fluentd, Fluent Bit, or OTel Collector from workload, plugin, and operational requirements.

**Record shape.** Emit structured (JSON or OTLP) records, never free-form text that needs grok parsing. The mandatory fields on every record (`trace_id`, `span_id`, `service.name`, `service.version`, `deployment.environment.name`, ISO 8601 UTC timestamp, severity) are defined once in `../incident-forensics.md` (Minimum Required Attributes). The LogRecord field definitions and severity scale are in the OTel log data model: <https://opentelemetry.io/docs/specs/otel/logs/data-model/>.

---

## 2. Events as LogRecords

An OTel Event is a LogRecord with a non-empty `EventName`; the name identifies the event's structure (attributes and body). There is no separate event signal. Source: <https://opentelemetry.io/docs/specs/otel/logs/data-model/#events>

Logical view of an event record (in OTLP the name is the LogRecord `event_name` field, not an attribute):

```json
{
  "timestamp": "2026-04-21T09:15:33.001Z",
  "level": "INFO",
  "event_name": "order.placed",
  "message": "order placed",
  "order.id": "ord_8f3k2",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "service.name": "order-service",
  "deployment.environment.name": "production"
}
```

Use cases: `feature_flag.evaluation`, `deployment.completed`, `order.placed`, `user.signup`.

**Distinction from metrics:** events are discrete occurrences; metrics are aggregated rates.  
**Distinction from logs:** events have a declared name and attribute contract; logs are often free-form.

---

## 3. Systemd Journal Integration

On most Linux cloud VMs, systemd-journald is the primary log sink. Map via `journaldreceiver` (alpha; confirm the current stability in the receiver README before depending on it).

```yaml
# otelcol-config.yaml
receivers:
  journald:
    directory: /var/log/journal
    units: [kubelet.service, containerd.service]
    priority: info
processors:
  resource:
    attributes:
      - { key: host.name, from_attribute: _HOSTNAME, action: upsert }
      - { key: service.name, from_attribute: _SYSTEMD_UNIT, action: upsert }
exporters:
  otlp:
    endpoint: "otel-gateway.observability.svc:4317"
service:
  pipelines:
    logs:
      receivers: [journald]
      processors: [resource]
      exporters: [otlp]
```

Source: <https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/journaldreceiver>

**journald field mapping:** `MESSAGE` → `Body` · `PRIORITY` → `SeverityNumber` · `_HOSTNAME` → `Resource["host.name"]` · `_SYSTEMD_UNIT` → `Resource["service.name"]` · `_PID` → `Attributes["process.pid"]`

**Kubernetes log sources:**
- kubelet → container stdout/stderr → runtime log files → `filelogreceiver` (`/var/log/pods/*/*/*.log`)
- Kubernetes events → `k8seventsreceiver` (OTel Collector contrib)

---

## 4. Collector and Agent Options

Cross-ref `../vendor-categories.md` category (h) Log Pipeline / Collection.

| Tool | Runtime | RAM (order of magnitude; measure under your load) | Project | Notes |
|---|---|---|---|---|
| **Fluent Bit** | C | 5–15 MB | CNCF Graduated (Fluentd project) | Edge DaemonSet; native OTLP output |
| **OTel Collector** | Go | 30–100 MB | CNCF Graduated (OpenTelemetry) | Unified MELT; gateway aggregation |
| **Vector** | Rust | 20–60 MB | Datadog OSS | Log + metric pipeline with transforms |
| **Cribl Stream** | Proprietary | 100+ MB | Commercial | Advanced routing |
| Fluentd | Ruby | Workload-dependent | CNCF Graduated | Validate plugin and resource requirements |

**Common topology:** Fluent Bit DaemonSet (edge) → OTLP → OTel Collector gateway (enrichment, PII redaction, routing) → backends. An all-Collector pipeline (agent + gateway) is equally valid; choose from plugin, parser, and resource requirements.

---

## 5. Trace ID Injection Rules

**EVERY log line from an instrumented service MUST carry `trace_id` + `span_id`.**

Without them, log-trace join fails during incident forensics, adding 15–30 min to MTTR.

**Injection mechanisms:**

| Language | Library | Method |
|---|---|---|
| Python | `structlog` | Context processor extracting OTel span context |
| Java | Logback / Log4j2 | `OpenTelemetryAppender` MDC integration |
| Node.js | `pino` | `pino-opentelemetry-transport` |
| Go | `zap` / `slog` | Manual `trace.SpanFromContext` extraction |

**Verification:** when a test or staging check is in scope, assert that the `trace_id` in a log record equals the trace-id field of the inbound `traceparent` header. Cross-ref `../standards.md` (W3C Trace Context).

---

## 6. Log Severity and Sampling

| Severity | Production policy |
|---|---|
| TRACE / DEBUG | 1% sample |
| INFO | 10–20% for high-volume services |
| WARN / ERROR / FATAL | 100% retained |

Apply sampling at the collection tier (Fluent Bit throttle filter or OTel Collector `probabilistic_sampler`), not at the application tier.

**Trace-correlated log retention:** the Collector `tail_sampling` processor accepts traces, not logs. Keeping logs based on a later trace outcome requires a separately implemented stateful correlation/buffering stage or backend policy keyed by `trace_id`. Until that exists, retain WARN/ERROR/FATAL through a log-specific severity policy and sample lower severities independently; the trace recipe alone cannot join the signals.

---

## 7. Log Retention, Compliance, and Backends

| Category | Retention | Storage |
|---|---|---|
| Operational (INFO/DEBUG) | 7–30 days | Hot |
| WARN / ERROR | 90 days | Hot or warm |
| Audit logs | Approved schedule for the record class | Tamper protection; WORM when the selected obligation requires it |

**PII redaction** MUST occur at ingestion (Fluent Bit or OTel Collector `redaction` processor), not at storage time. Cross-ref `privacy.md §6 OTel Collector Processors for Redaction`.

Cross-ref `../meta-observability.md` (Section D: Retention Matrix) for unified policy across all signals.

**Backends.** Selection (Loki, Elasticsearch, OpenSearch, ClickHouse-based stores) is in `../vendor-categories.md`, categories (a) OSS Full-Stack and (e) SIEM / Enterprise Logs. One rule is backend-specific and often missed: in label-indexed stores such as Loki, keep unbounded values (message IDs, request IDs, `trace_id`, user identifiers) in the log body or structured metadata, never in stream labels; each distinct label value creates a stream.

---

## 8. OS-Level Log Sources

| Source | Collection | Notes |
|---|---|---|
| systemd-journald | `journaldreceiver` | Primary on Linux; all systemd units |
| syslog (legacy) | `syslogreceiver` | Facilities: kern, daemon, auth |
| kernel dmesg | journald (forwarded automatically) | OOM kills, NIC errors |
| Linux auditd | `filelogreceiver` on `/var/log/audit/audit.log` | Route to the audit pipeline; cross-ref `audit.md §3 Audit Event Categories` |

---

## 9. References

1. OTel log data model: <https://opentelemetry.io/docs/specs/otel/logs/data-model/>
2. journaldreceiver: <https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/journaldreceiver>
3. CNCF Fluentd migration guide: <https://www.cncf.io/blog/2025/10/01/fluentd-to-fluent-bit-a-migration-guide/>
4. Fluent Bit docs: <https://docs.fluentbit.io>
5. `../standards.md` · `../matrix.md` · `../incident-forensics.md` · `../meta-observability.md` · `../transport/sampling-recipes.md` · `../vendor-categories.md`
