# Sampling Recipes: Tail-Based, Attribute-Threshold, and Tenant-Aware

---

## 1. Sampling Taxonomy

| Type | Where Decision Is Made | Trace Completeness | Typical Use |
|------|----------------------|-------------------|-------------|
| **Head-based** | At trace start (first span) | May be incomplete; downstream services inherit decision but cannot guarantee it | Simple, low-overhead; works well for single-service or homogeneous traffic |
| **Tail-based** | After all spans arrive (end of trace) | Complete; sampler buffers spans until decision | Production multi-service; required for error/latency policies |
| **Adaptive** | Dynamic rate based on traffic volume | Depends on implementation | Auto-scaling sampling rate under variable load |

**Head-based limitation**: If a service at hop 2 is sampled out but hop 1 was sampled in (or vice versa), the reconstructed trace is missing spans. This is the core motivation for tail-based sampling in multi-service systems.

**Tail-based trade-off**: The sampler must buffer all spans for a trace until a decision is made (default `decision_wait: 30s`). Memory usage scales with trace volume and decision wait duration.

---

## 2. Tail-Based Recipe (Recommended for Production)

The production-standard recipe retains high-signal traces at 100% while keeping a low-rate baseline for ambient visibility.

**Positive retention policies** (default positive decisions combine as OR; ordering is not first-match priority. An `and` policy requires its subconditions to match):

1. **100% error retention**: any trace with an error span is always kept
2. **100% threshold retention**: traces meeting the configured trace-duration threshold, or carrying a span annotated for retention (Section 3), are kept
3. **5-10% baseline**: probabilistic sampling also evaluates traces; it adds baseline retention alongside the other policies

This requires the `tail_sampling` processor running in the **gateway tier only**, combined with a `loadbalancing` exporter upstream to ensure trace completeness via consistent hash by `trace_id`. See `collector-topology.md` Section 6.

```yaml
processors:
  tail_sampling:
    decision_wait: 30s          # wait up to 30s for all spans to arrive
    num_traces: 100000          # in-memory trace buffer capacity
    expected_new_traces_per_sec: 1000
    policies:
      # Policy 1: Always keep traces with errors
      - name: keep-errors
        type: status_code
        status_code:
          status_codes: [ERROR]

      # Policy 2: Always keep high-latency traces (p99 threshold)
      - name: keep-slow-traces
        type: latency
        latency:
          threshold_ms: 2000    # trace duration: earliest span start to latest span end

      # Policy 3: Always keep traces annotated for retention (see Section 3)
      - name: keep-annotated
        type: string_attribute
        string_attribute:
          key: sampling.keep_reason
          values: ["high_value"]

      # Policy 4: Baseline probabilistic sampling alongside the positive policies
      - name: baseline-sample
        type: probabilistic
        probabilistic:
          sampling_percentage: 8  # 5-10% baseline
```

> For these positive policies, any keep decision retains the trace (OR), regardless of policy order. `and` combines its own subconditions. Drop/inverted policies and optional early-decision behavior have additional semantics; verify them against the pinned processor README before use.

Place `memory_limiter` first in the gateway pipeline and size `num_traces` from `expected_new_traces_per_sec × decision_wait` (Section 5).

---

## 3. Attribute-Threshold Retention

Keep a trace when an individual span carries a numeric attribute above a threshold; for example a custom, team-defined `app.order.total_usd`. This is a per-span test, not a trace-level sum: two spans at 600 do not satisfy a 1000 threshold together. Trace-level cumulative values require a separately implemented and verified aggregation that supplies the total before the sampling decision.

The native `numeric_attribute` policy supports span-attribute bounds (`min_value`/`max_value`) and is sufficient for a single key. Use a `transform` annotation when several keys or conditions must normalize into one keep-reason attribute that Policy 3 in Section 2 retains:

```yaml
processors:
  transform/keep_annotation:
    trace_statements:
      - context: span
        statements:
          - set(attributes["sampling.keep_reason"], "high_value")
              where attributes["app.order.total_usd"] > 1000
          - set(attributes["sampling.keep_reason"], "high_value")
              where attributes["app.batch.row_count"] > 1000000

service:
  pipelines:
    traces:
      processors: [memory_limiter, transform/keep_annotation, tail_sampling]
```

The annotation must run before `tail_sampling` in the same gateway pipeline. Confirm the attribute is numeric at the source; a string-typed value does not satisfy the comparison.

---

## 4. Tenant-Aware Sampling (Multi-Tenant B2B SaaS)

Different customer tiers have different observability value. Enterprise customers justify full retention; free tier customers do not.

**Per-tier retention targets**:

| Tenant Tier | Retention Rate | Rationale |
|------------|---------------|-----------|
| `enterprise` | 100% | SLA obligations, full debugging capability |
| `pro` | 20% | Representative sample, cost-controlled |
| `free` | 2% | Ambient visibility only |

**Option A: `routing_connector` for per-tenant pipeline branching**

The `routing_connector` routes telemetry to different pipelines based on attribute values, allowing different `tail_sampling` configurations per tenant tier.

> Stability warning: confirm the connector's current stability level in its README before use; a component below stable may change API and behavior in minor releases. Verify the pinned connector version before using it. If stability requirements preclude it, use separately configured collector/exporter pipelines or dedicated collectors for isolation. Option B changes retention in a shared pipeline only; it does not replace routing.

```yaml
connectors:
  routing:
    default_pipelines: [traces/pro]  # fallback if no rule matches
    error_mode: ignore
    table:
      - statement: route() where attributes["tenant.tier"] == "enterprise"
        pipelines: [traces/enterprise]
      - statement: route() where attributes["tenant.tier"] == "free"
        pipelines: [traces/free]

service:
  pipelines:
    traces/input:
      receivers: [otlp]
      exporters: [routing]

    traces/enterprise:
      receivers: [routing]
      processors: [tail_sampling/enterprise]
      exporters: [otlp/backend]

    traces/pro:
      receivers: [routing]
      processors: [tail_sampling/pro]
      exporters: [otlp/backend]

    traces/free:
      receivers: [routing]
      processors: [tail_sampling/free]
      exporters: [otlp/backend]
```

**Option B: `tail_sampling` with per-tier policies in a shared pipeline**

Use composite `and` policies combining tenant tier with probabilistic sampling. This controls retention only; it neither splits export pipelines nor isolates tenant data. Validate that each trace has a consistent server-verified tier. The final 2% baseline applies to all tiers under OR semantics; it is not a first-match fallback:

```yaml
processors:
  tail_sampling:
    decision_wait: 30s
    num_traces: 100000
    policies:
      # Enterprise: always keep
      - name: enterprise-full
        type: and
        and:
          and_sub_policy:
            - name: is-enterprise
              type: string_attribute
              string_attribute:
                key: tenant.tier
                values: ["enterprise"]
            - name: keep-all
              type: probabilistic
              probabilistic:
                sampling_percentage: 100

      # Pro: 20%
      - name: pro-sample
        type: and
        and:
          and_sub_policy:
            - name: is-pro
              type: string_attribute
              string_attribute:
                key: tenant.tier
                values: ["pro"]
            - name: pro-rate
              type: probabilistic
              probabilistic:
                sampling_percentage: 20

      # Baseline: 2% across all tiers (OR, not an ordered fallback)
      - name: free-sample
        type: probabilistic
        probabilistic:
          sampling_percentage: 2  # global baseline; tier-specific keep decisions OR with this
```

---

## 5. Pitfalls

| Pitfall | Description | Mitigation |
|---------|-------------|-----------|
| Head-based sampling on multi-service paths | A service sampled out at hop 2 drops spans; trace is reconstructed with gaps | Use tail-based sampling in gateway; propagate `traceparent` regardless of local sampling decision |
| Tail sampling memory exhaustion | Buffer holds all in-flight spans per trace for `decision_wait` duration; high RPS + long wait = large heap | Set `num_traces` based on `expected_new_traces_per_sec * decision_wait`; always include `memory_limiter` |
| Decision wait too short | Spans from slow downstream services arrive after decision is made; those spans are dropped | Set `decision_wait` to exceed your p99 inter-service latency; typically 30-60s |
| Sample-rate mismatch between gateway tiers | Tier-1 and Tier-2 each apply independent sampling; effective rate is multiplied (e.g., 50% × 20% = 10%) | Assign sampling responsibility to one tier only; the other tier passes all traffic through |
| `routing_connector` used without a stability check | Components below stable may break on minor version upgrades of collector-contrib | Verify connector stability for the pinned version; use separate collector/exporter pipelines for isolation if necessary. `tail_sampling` `and` changes retention, not routing |
| Missing `loadbalancing` exporter before tail sampler | Spans for the same trace land on different gateway replicas; sampler on each replica sees an incomplete trace and makes wrong decisions | Always deploy `loadbalancing` exporter (routing_key: traceID) in the tier upstream of `tail_sampling` |

---


## References

- https://opentelemetry.io/docs/specs/otlp/
- https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor
- https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/connector/routingconnector
