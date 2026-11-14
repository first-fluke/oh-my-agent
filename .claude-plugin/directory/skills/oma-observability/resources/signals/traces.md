# Distributed Traces Signal

## 1. Scope

Traces are the "T" in MELT+P; the correlation backbone of distributed observability. A single trace links every span produced by every service that participated in one request, job, or message.

Covers: DB patterns (N+1, slow query, pool exhaustion, `db.*`), messaging patterns (Kafka, Flink, Spark, DLQ, `messaging.*`), RPC (`rpc.*`), and exemplars.

Owned elsewhere:
- `traceparent` / `tracestate` format and the mandatory-forwarding rule: `../standards.md` (W3C Trace Context)
- Propagator matrix per cloud and vendor, baggage rules, trust boundaries: `../boundaries/cross-application.md`
- Mesh-injected headers and zero-code instrumentation: `../layers/mesh.md`
- Sampling strategy and tail-sampling configuration: `../transport/sampling-recipes.md`
- Trace backend selection: `../vendor-categories.md`
- PII in span attributes and baggage: `privacy.md`

Propagation rule that every pattern below depends on: **inject** `traceparent` on every outbound HTTP/gRPC call and message; **extract** at every inbound call before creating the server or consumer span. A sync call produces a `CLIENT` + `SERVER` span pair in one trace; an async message produces a `PRODUCER` + `CONSUMER` pair connected by a span link (Section 3).

---

## 2. Database Tracing Patterns (db.* semconv)

Source: <https://opentelemetry.io/docs/specs/semconv/database/>

All DB spans use `SpanKind = CLIENT`. The span name follows the pattern `<db.operation.name> <db.collection.name>` (e.g., `SELECT orders`).

### Core db.* attributes

| Attribute | Stability | Example | Notes |
|-----------|-----------|---------|-------|
| `db.system.name` | Stable | `postgresql`, `mysql`, `mongodb`, `redis` | Required; identifies the DB technology |
| `db.operation.name` | Stable | `SELECT`, `INSERT`, `HMGET` | SQL verb or command name |
| `db.query.text` | Stable | `SELECT * FROM orders WHERE id = $1` | Parameterized query text; PII risk; see caveat |
| `db.namespace` | Stable | `mydb` | Database name / schema |
| `db.collection.name` | Stable | `orders` | Table or collection name |

Connection-pool state is reported as metrics, not span attributes (Development tier; confirm names in the semconv registry before alerting on them):

| Metric | Instrument | Meaning |
|--------|------------|---------|
| `db.client.connection.count` | UpDownCounter | Connections by `db.client.connection.state` (`idle` / `used`) and `db.client.connection.pool.name` |
| `db.client.connection.pending_requests` | UpDownCounter | Requests waiting for a connection |
| `db.client.connection.wait_time` | Histogram (s) | Time to obtain a connection from the pool |
| `db.client.connection.timeouts` | Counter | Acquisition attempts that timed out |

`db.query.text` caveat: WHERE clause literals may contain PII (email addresses, phone numbers). Always use parameterized queries so that literals are replaced by `$1`, `?`, or `:name` placeholders. If the ORM or driver captures the raw query, apply redaction at the OTel SDK layer or in the Collector processor. Cross-ref `privacy.md §6 OTel Collector Processors for Redaction`.

### 2.1 N+1 Query Detection

Symptom: a single parent `SERVER` span contains N child `CLIENT` spans that all share the same `db.operation.name` and `db.collection.name`, each taking 2-30 ms, producing an additive latency of N × latency_per_query.

Trace waterfall example:

```
[SERVER] POST /api/orders            .................... 480ms
  [CLIENT] SELECT orders WHERE ...   ..  18ms
  [CLIENT] SELECT orders WHERE ...   ..  17ms
  [CLIENT] SELECT orders WHERE ...   ..  17ms
  [CLIENT] SELECT orders WHERE ...   ..  18ms
  ...  (× 24 more)
```

Detection:

- OTel trace visualizers (Honeycomb BubbleUp, Datadog Watchdog, Grafana Tempo TraceQL) can flag traces where `count(db.CLIENT spans per SERVER span) > N_threshold`.
- TraceQL example (Grafana Tempo): `{ span.db.system.name = "postgresql" } | count() > 10`
- Honeycomb: group by `trace.parent_id`, count `db.*` child spans, alert on p95 count > 10.

Remediation: replace per-row lookups with eager loading (ORM `include`/`join`), batch queries (`SELECT ... WHERE id = ANY($1)`), or the DataLoader pattern for GraphQL.

### 2.2 Slow Query Analysis

Slow queries surface as `CLIENT` spans with duration above the p99 threshold.

1. Index `db.query.text` + `db.operation.name` against a `span.duration` histogram in the trace backend.
2. Flag spans where `span.duration > 100ms` at p99 (adjust threshold per SLO).
3. Correlate `db.query.text` with `pg_stat_statements` / MySQL `slow_query_log` to obtain execution plans.
4. Apply `EXPLAIN ANALYZE` and add the missing index or rewrite the query.

Privacy: if `db.query.text` captures literal values, redact before export; see `privacy.md §6 OTel Collector Processors for Redaction`.

### 2.3 Connection Pool Exhaustion

Symptom: the blocking span is on the **client side** (waiting to acquire a pool connection), not inside the DB. `CLIENT` span duration grows while actual DB response time stays flat.

```
[SERVER] POST /api/orders            .............. 5200ms
  [CLIENT] acquire pool connection   ............  5190ms  ← pool wait, no DB call yet
  [CLIENT] SELECT orders WHERE ...   .           10ms
```

Metrics to monitor: `db.client.connection.count` in state `used` against the pool's configured maximum (alert above 85% used), `db.client.connection.pending_requests` above zero for a sustained period, and the `db.client.connection.wait_time` histogram. When the driver does not emit these, instrument pool size, wait time, and timeouts at the application layer.

Remediation: tune pool size to expected concurrency (10-20 connections per pod); add circuit breaker upstream; split read/write pools for long-running read transactions.

---

## 3. Messaging Tracing Patterns (messaging.* semconv)

Source: <https://opentelemetry.io/docs/specs/semconv/messaging/>

### Core messaging.* attributes

The messaging conventions are Development tier; confirm names in the semconv registry before building alerts or SLOs on them.

| Attribute | Example | Notes |
|-----------|---------|-------|
| `messaging.system` | `kafka`, `rabbitmq`, `nats` | Required |
| `messaging.destination.name` | `orders-topic` | Topic or queue name |
| `messaging.operation.type` | `create`, `send`, `receive`, `process`, `settle` | `settle` covers ack/nack; `ack`, `publish`, and `deliver` are NOT valid values |
| `messaging.message.id` | `msg-uuid-1234` | Message identifier for dedup |
| `messaging.consumer.group.name` | `payment-consumer-group` | Consumer group (Kafka and other systems) |
| `kafka.message.key` | `order-9988` | Kafka partition key |

### SpanKind assignment

- `PRODUCER`: set when calling `producer.send()` or equivalent.
- `CONSUMER`: set when calling `consumer.poll()` or the message handler.
- Connect the two with a **span link** (not parent-child): async messaging breaks the synchronous call chain; span links preserve trace continuity across the queue boundary. Without the link, the producer and consumer spans land in disconnected traces and a message cannot be followed end to end.

```
[PRODUCER] send orders-topic         ..  3ms    TraceId: aaa
  Link → [CONSUMER] receive orders-topic  ...  220ms  TraceId: aaa
    [CLIENT] INSERT INTO payments    ..  18ms
```

### 3.1 Kafka-Specific Patterns

Inject W3C `traceparent` into Kafka message headers at the producer; extract at the consumer before creating the `CONSUMER` span. OTel Kafka client instrumentation does this automatically where it is available for the language.

Kafka consumer lag is a metric, not a trace attribute, and its name depends on the source: the managed service's own lag metrics (MSK via CloudWatch, Confluent Cloud via its metrics API) or a lag exporter scraped by Prometheus for self-managed clusters. The thresholds below use `kafka_consumer_group_lag` as a placeholder for whichever metric the cluster exposes.

**Primary-topic lag alert threshold (recommended starting point):**
- Warn: `kafka_consumer_group_lag > 10_000 for 5m` (queue growing faster than consumer can drain)
- Page: `kafka_consumer_group_lag > 100_000 for 10m` (backlog will breach SLO if unaddressed)
- Calibrate per topic throughput and consumer group parallelism; high-throughput topics routinely run at 50k–500k lag without impact.

### 3.2 Flink and Spark Streaming

Create one span per pipeline stage; the trace covers end-to-end job from source read to sink write. Check the current state of OTel instrumentation for the Flink version in use before relying on it; use `messaging.system = kafka` for source/sink spans and `INTERNAL` for operator chains. Spark: instrument at the `foreachBatch` boundary; each micro-batch is one `INTERNAL` span. Checkpoint duration and backlog are metrics from the engine's own metric reporter, not trace attributes.

### 3.3 Dead Letter Queue (DLQ) Observability

A DLQ receives messages that failed all retries. Losing trace context at DLQ ingestion prevents diagnosis.

1. **Trace propagation**: copy the original `traceparent` from the failed message headers into the DLQ message headers; do not generate a new trace ID.
2. **DLQ depth alert**: alert on `kafka_consumer_group_lag{topic="orders-dlq"}` > 0 for critical queues.
3. **DLQ arrival span**: create a `CONSUMER` span at DLQ arrival with `messaging.destination.name = orders-dlq` and the original `trace_id`.
4. **Replay tooling**: re-inject the original trace context into replayed messages. A new `trace_id` at replay orphans the original failure span.

---

## 4. RPC Tracing (rpc.* semconv)

Source: <https://opentelemetry.io/docs/specs/semconv/rpc/rpc-spans/>

### gRPC

| Attribute | Example |
|-----------|---------|
| `rpc.system.name` | `grpc` |
| `rpc.method` | `com.example.OrderService/CreateOrder` (fully-qualified `Service/Method`) |

SpanKind: `CLIENT` on the caller; `SERVER` on the callee. The `traceparent` header is propagated via gRPC metadata. The RPC span conventions are Stable; confirm in the semconv registry. An instrumentation library may still emit a different attribute set (`rpc.system`, `rpc.service`) until it opts in through `OTEL_SEMCONV_STABILITY_OPT_IN`, so check what the deployed library version emits before writing queries.

### HTTP RPC

Use `http.*` attributes for REST and JSON-RPC over HTTP. `rpc.*` is for binary RPC protocols only.

### Error handling

Set `status.code = ERROR` and `status.description` on RPC failures, and record `exception.type`, `exception.message`, and `exception.stacktrace`; these are required by the MRA in `../incident-forensics.md` (error span attributes). Exceptions recorded as span events (`span.recordException(e)`) are being replaced by exception LogRecords; instrumentation that supports `OTEL_SEMCONV_EXCEPTION_SIGNAL_OPT_IN` should use `logs/dup` during migration so both the span pivot and log-based queries keep working.

---

## 5. Trace Exemplars

Exemplars link a metric data point to a specific trace, enabling direct navigation from a PromQL alert to the trace that caused the spike.

- Prometheus stores exemplars only when exemplar storage is enabled (`--enable-feature=exemplar-storage`). Histogram samples can then carry a `trace_id`.
- OTel SDKs with exemplar support attach one when the current span context is sampled (the default `trace_based` exemplar filter).
- Usage: click a spike in a Grafana panel backed by a Prometheus histogram → the exemplar tooltip shows a `trace_id` link → click to open the trace in the configured trace backend (Tempo, Jaeger, etc.).

```promql
# Example: p99 latency histogram with exemplar-capable query
histogram_quantile(0.99,
  sum by (le, service_name) (
    rate(http_server_request_duration_seconds_bucket{
      deployment_environment_name="prod"
    }[5m])
  )
)
```

Cross-ref `../incident-forensics.md §Step 2: Acquire trace_id` for the exemplar-based trace acquisition flow.

---

## References

- OTel Trace API specification: <https://opentelemetry.io/docs/specs/otel/trace/api/>
- OTel Database semconv: <https://opentelemetry.io/docs/specs/semconv/database/>
- OTel Messaging semconv: <https://opentelemetry.io/docs/specs/semconv/messaging/>
- OTel RPC semconv: <https://opentelemetry.io/docs/specs/semconv/rpc/>
- W3C Trace Context Level 1 Recommendation: <https://www.w3.org/TR/trace-context/>
- W3C Baggage Recommendation: <https://www.w3.org/TR/baggage/>
- Kafka producer/consumer instrumentation: <https://kafka.apache.org/documentation/>
- Confluent consumer lag metrics: <https://docs.confluent.io/platform/current/kafka/monitoring.html>
