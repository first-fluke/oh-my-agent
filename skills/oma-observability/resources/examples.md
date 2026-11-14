# oma-observability Examples

> Two walkthroughs that show the output shape for a setup and a migration request.
> Incident walkthroughs live in `incident-forensics.md §5`; SLO and burn-rate examples live in `boundaries/slo.md`.
> Snippets are illustrative excerpts. Use the referenced resources for full configuration.

---

## Scenario 1: Greenfield: OSS Full-Stack on Kubernetes

**Situation:** New Kubernetes cluster. Team wants OTel-native metrics, logs, traces, and Grafana dashboards with no licensing cost.

**Intent:** `setup`

**Files referenced:** `vendor-categories.md §(a)`, `transport/collector-topology.md §2`, `observability-as-code.md`, `checklist.md`

### Walkthrough

1. Request: `/oma-observability "set up OTel stack on k8s"`. The intent classifies as `setup`.
2. `vendor-categories.md §(a) OSS Full-Stack` selects **Grafana LGTM+** (Mimir, Loki, Tempo, Grafana) for a team already familiar with Grafana dashboards.
3. `transport/collector-topology.md §2 Recommended Pattern: Two-Tier Hybrid` determines the deployment pattern: DaemonSet agent per node plus a Deployment gateway. The agent manifest is in that file; do not restate it.
4. The gateway batches and exports. Loki, Tempo, and Mimir all accept OTLP or remote-write; no backend-specific log exporter is needed.

```yaml
# Gateway — key fields only (OpenTelemetryCollector, mode: deployment)
spec:
  mode: deployment
  replicas: 2
  config:
    receivers:
      otlp: { protocols: { grpc: { endpoint: 0.0.0.0:4317 } } }
    processors:
      memory_limiter: { check_interval: 1s, limit_percentage: 75, spike_limit_percentage: 20 }
      batch: {}
    exporters:
      otlphttp/tempo: { endpoint: http://tempo.observability.svc:4318 }
      otlphttp/loki: { endpoint: http://loki.observability.svc:3100/otlp }
      prometheusremotewrite: { endpoint: http://mimir.observability.svc:9009/api/v1/push }
    service:
      pipelines:
        traces: { receivers: [otlp], processors: [memory_limiter, batch], exporters: [otlphttp/tempo] }
        metrics: { receivers: [otlp], processors: [memory_limiter, batch], exporters: [prometheusremotewrite] }
        logs: { receivers: [otlp], processors: [memory_limiter, batch], exporters: [otlphttp/loki] }
```

5. Collector config is committed to git and applied through the cluster's GitOps controller (`observability-as-code.md`).
6. Checklist items carried into the result (from `checklist.md §1`, `§2`, `§3`):
   - [ ] `memory_limiter` is the first processor in every pipeline
   - [ ] NTP drift < 100 ms on all nodes (`chronyc tracking`)
   - [ ] Cardinality budget set before first data ingest
   - [ ] Gateway has ≥ 2 replicas with a PodDisruptionBudget
   - [ ] Collector self-metrics scraped by an independent instance

**Result shape:** the `execution-protocol.md` Step 6 block with the route, the two primary recommendations above, the checklist items, and an explicit list of checks that were proposed but not run.

---

## Scenario 2: Migrating off Fluentd to Fluent Bit

**Situation:** A Fluentd DaemonSet's measured memory use is the migration driver. Fluentd remains CNCF Graduated; the CNCF migration guide is a conversion reference, not a deprecation notice. The team needs a zero-downtime migration with log parity verified before decommission.

**Intent:** `migrate`

**Files referenced:** `vendor-categories.md §(h)`, `signals/logs.md`, `transport/collector-topology.md §2`, `observability-as-code.md`

### Walkthrough

1. Request: `/oma-observability --migrate "Fluentd to Fluent Bit"`.
2. `vendor-categories.md §(h) Log Pipeline / Collection` frames the choice. Fluent Bit configuration is not drop-in compatible: convert the Fluentd syntax, plugins, and routes, and validate each converted route.

**Phase 1 — Dual-send.** Deploy the Fluent Bit DaemonSet alongside the existing Fluentd DaemonSet. Both ship to the same backend; Fluentd stays primary. Tag each pipeline with a distinct attribute so the two streams can be told apart.

```ini
# Fluent Bit DaemonSet — core pipeline (fluent-bit.conf)
[INPUT]
    Name           tail
    Path           /var/log/pods/*/*/*.log
    Parser         cri
    Tag            kube.*
    Mem_Buf_Limit  5MB

[FILTER]
    Name        kubernetes
    Match       kube.*
    Merge_Log   On
    Labels      On

[OUTPUT]
    Name      opentelemetry
    Match     kube.*
    Host      otel-gateway.observability.svc
    Port      4318
    Logs_uri  /v1/logs
```

**Phase 2 — Parity verification.** In the backend, compare record counts per `service.name` between the two pipeline tags over an agreed window. Set the acceptable divergence up front and account for timing at the window edges. Compare a sample of records field by field; plugin differences show up in parsed fields before they show up in counts.

**Phase 3 — Decommission Fluentd.** After the agreed parity window, remove the Fluentd DaemonSet from its GitOps or Helm desired state and reconcile through its owner. A DaemonSet has no replica count and cannot be scaled to zero. For an unmanaged DaemonSet, deletion after verified cutover is the removal action:

```bash
kubectl delete daemonset fluentd -n logging
```

3. Commit the Fluent Bit ConfigMap and DaemonSet manifests to git and apply them through the GitOps controller (`observability-as-code.md`).
4. Checks to select: `otelcol validate` on the gateway config and `promtool check rules` on any log-based alerting rules. Run them when the user or the active workflow asks; otherwise list them as not verified.

**Result shape:** the migration phases, the parity criterion and who measures it, the rollback point (Fluentd still primary until Phase 3), and the unverified checks.
