# Collector Topology: Deployment Modes and Kubernetes Patterns

---

## 1. Four Deployment Modes (OTel Operator `Spec.Mode`)

The OpenTelemetry Operator manages collectors via the `OpenTelemetryCollector` CRD at **v1beta1**. The `spec.mode` field controls the deployment strategy.

| Mode | Kubernetes Kind | Replicas | Typical Use Case |
|------|----------------|----------|-----------------|
| `deployment` | Deployment | 1..N | Gateway, tail sampling, aggregation |
| `daemonset` | DaemonSet | 1 per node | Node-level metrics, log collection |
| `statefulset` | StatefulSet | 1..N | Ordered, persistent-volume workloads |
| `sidecar` | injected container | 1 per pod | Serverless (Fargate, Cloud Run), isolation |

**`Deployment` (default; Gateway use case)**
Runs as a standard Kubernetes Deployment. Suitable for centralized processing: batching, tail sampling, exporters to backend. Scales horizontally but cannot access node-local resources (e.g., `/var/log`, `/proc`). Source: [OTel Collector Deployment docs](https://opentelemetry.io/docs/collector/deployment/).

**`DaemonSet` (Agent use case; one per node)**
Guarantees exactly one collector pod per node. Required for receivers that must run on the host: `hostmetrics`, `filelog`, `kubeletstats`. Accesses node filesystem and network namespaces directly.

**`StatefulSet` (specialized)**
Useful when collectors need stable network identity or persistent volumes (e.g., Write-Ahead Log for durability). Uncommon; prefer Deployment unless stable pod identity is mandatory.

**`Sidecar` (one per pod)**
Injected by the operator via pod annotation (`sidecar.opentelemetry.io/inject: "true"`). Runs in the same pod as the application. See Section 3 for when sidecar is appropriate.

> CRD version note: `OpenTelemetryCollector` is `opentelemetry.io/v1beta1`; the `Instrumentation` CRD is `opentelemetry.io/v1alpha1`. Check the versions served by the installed operator (`kubectl api-resources --api-group=opentelemetry.io`); promotions are tracked in [opentelemetry-operator](https://github.com/open-telemetry/opentelemetry-operator) releases.

---

## 2. Recommended Pattern: Two-Tier Hybrid

The standard production pattern for Kubernetes clusters is a two-tier architecture separating node-level collection from centralized processing.

```
App Pod(s)
    │ OTLP gRPC/HTTP
    ▼
DaemonSet Agent (1 per node)
  - hostmetrics / filelog / kubeletstats receivers
  - memory_limiter and k8sattributes enrichment
  - traces: loadbalancing exporter, routing_key: traceID
    │ consistent traceID hash to individual gateway replicas
    │ metrics/logs may use their separately configured normal load balancing
    ▼
Deployment Gateway (N tail-sampler replicas, per-pod discovery)
  - memory_limiter → tail_sampling → batch
  - backend exporter
    │ OTLP / vendor protocol
    ▼
Observability Backend (e.g., Grafana Cloud, Jaeger, Prometheus)
```

Do not send traces through an ordinary ClusterIP/load balancer before independent
tail samplers. It can split one trace across replicas. The traceID-aware exporter
must be upstream of those samplers; an exporter after sampling cannot recover
trace completeness. Resolve individual sampler replicas (for example via a
headless Service), and validate late-span behavior during membership changes.

**Agent layer responsibilities** (must be per-host):
- `hostmetrics` receiver: CPU, memory, disk, network from `/proc`, `/sys`
- `filelog` receiver: container log files from `/var/log/pods/`
- `k8sattributes` processor: enriches spans/metrics with pod, namespace, node labels
- `kubeletstats` receiver: pod/container resource metrics via Kubelet API

**Gateway layer responsibilities**:
- `batch` processor: reduce export RPCs, improve compression
- `tail_sampling` processor: evaluate complete traces before sampling decision
- Backend exporter: send the gateway's already-sampled traces to the selected backend. Put `loadbalancing` upstream of any further independent tail-sampler tier, not after the only sampler.
- `memory_limiter` processor: prevent OOM under backpressure

Example agent `OpenTelemetryCollector` manifest snippet for host metrics/logs only (traces additionally require an OTLP receiver and the traceID-aware `loadbalancing` exporter described above and in §6):

```yaml
apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: otel-agent
spec:
  mode: daemonset
  config:
    receivers:
      hostmetrics:
        collection_interval: 30s
        scrapers:
          cpu: {}
          memory: {}
          filesystem: {}
      filelog:
        include: [/var/log/pods/*/*/*.log]
        include_file_path: true
      kubeletstats:
        collection_interval: 20s
        auth_type: serviceAccount
    processors:
      k8sattributes:
        passthrough: false
        extract:
          metadata: [k8s.pod.name, k8s.namespace.name, k8s.node.name]
      memory_limiter:
        limit_mib: 400
        check_interval: 1s
    exporters:
      otlp:
        endpoint: otel-gateway:4317
    service:
      pipelines:
        metrics:
          receivers: [hostmetrics, kubeletstats]
          processors: [memory_limiter, k8sattributes]
          exporters: [otlp]
        logs:
          receivers: [filelog]
          processors: [memory_limiter, k8sattributes]
          exporters: [otlp]
```

---

## 3. When to Use Sidecar (NOT Default)

Sidecar mode is **not recommended for standard Kubernetes nodes**. Use it only when DaemonSet is unavailable or per-pod isolation is a hard requirement.

| Condition | Use Sidecar? | Reason |
|-----------|-------------|--------|
| AWS Fargate | Yes | DaemonSet not supported on Fargate nodes |
| GCP Cloud Run | Yes | No DaemonSet concept; sidecar containers supported |
| Strong per-pod isolation | Yes | Compliance or security boundary per workload |
| Multi-tenant pod separation | Yes | Each tenant's data must not cross pod boundaries |
| Standard Kubernetes nodes | No | N collectors for N pods; cost scales linearly |
| Tail sampling requirement | No | Trace spans split across pods; sampler sees incomplete traces |

> Warning: Enabling sidecar injection on standard Kubernetes creates one collector instance per application pod. For a 100-pod deployment, this is 100 collectors. CPU and memory costs multiply accordingly. Always prefer DaemonSet on regular nodes.

---

## 4. Collector Component Placement Reference

Source: [OTel Kubernetes Collector Components](https://opentelemetry.io/docs/platforms/kubernetes/collector/components/)

| Receiver / Processor | Preferred Mode | Notes |
|---------------------|---------------|-------|
| `kubeletstats` receiver | DaemonSet | Requires access to Kubelet API per node |
| `filelog` receiver | DaemonSet | Reads `/var/log/pods/` on each node |
| `hostmetrics` receiver | DaemonSet | Reads `/proc`, `/sys`; host-only access |
| `k8sattributes` processor | DaemonSet or Gateway | On agent: enriches at source; on gateway: enriches late |
| `prometheus` receiver | Deployment (with caveats) | Replicas do not distribute scrape targets on their own; use the Operator target allocator (see caveat below) |
| `tail_sampling` processor | Deployment (Gateway) | Requires complete trace; combine with `loadbalancing` exporter |
| `batch` processor | Both | Tuned independently per tier |
| `memory_limiter` processor | Both (mandatory) | Always include; prevents OOM under traffic spikes |

> Prometheus scraping caveat: When multiple gateway replicas each run `prometheus` receiver, scrape targets are duplicated across replicas causing duplicate metrics. Use target allocator (`spec.targetAllocator`) provided by the OTel Operator to distribute scrape targets across replicas.

---

## 5. Container Runtime Observability Integration

**containerd and CRI-O**

Both runtimes expose metrics and events relevant to infrastructure observability:
- Image pull duration and failure rates
- Container start/stop lifecycle events
- Runtime panic or OOM kill events

Integration approaches:
- `hostmetrics` receiver with `process` scraper captures container process CPU/memory
- containerd serves Prometheus metrics at `/v1/metrics` on the TCP address set as `[metrics] address` in its `config.toml`
- CRI-O serves metrics at `:9090/metrics` once `enable_metrics = true` is set under `[crio.metrics]` (`metrics_port` changes the port); scrape with `prometheus` receiver on the DaemonSet agent

**cAdvisor integration**

cAdvisor runs as part of the Kubelet on each node and exposes per-container CPU, memory, filesystem, and network metrics.

```yaml
# Scrape cAdvisor via kubeletstats receiver (preferred)
receivers:
  kubeletstats:
    collection_interval: 20s
    auth_type: serviceAccount
    endpoint: "https://${env:K8S_NODE_IP}:10250"
    insecure_skip_verify: true
    metric_groups: [container, pod, node]
```

**Pod and container attribute enrichment**

The `k8sattributes` processor queries the Kubernetes API to attach resource attributes to all telemetry:

```yaml
processors:
  k8sattributes:
    auth_type: serviceAccount
    passthrough: false
    extract:
      metadata:
        - k8s.pod.name
        - k8s.pod.uid
        - k8s.deployment.name
        - k8s.namespace.name
        - k8s.node.name
        - k8s.container.name
      labels:
        - tag_name: app.label.version
          key: app.kubernetes.io/version
          from: pod
    pod_association:
      - sources:
          - from: resource_attribute
            name: k8s.pod.ip
```

---

## 6. High-Throughput Gateway Scaling

For high-volume environments, the gateway tier must scale to avoid becoming a bottleneck.

**Horizontal scaling with consistent hashing**

Tail sampling requires that all spans for a given `trace_id` reach the same collector replica. Use `loadbalancing` exporter in a first-tier gateway to route traces consistently:

```yaml
exporters:
  loadbalancing:
    protocol:
      otlp:
        tls:
          insecure: true
    resolver:
      k8s:
        service: otel-tail-sampler-headless
        ports: [4317]
    routing_key: traceID  # consistent hash on trace_id
```

**Two-tier gateway pattern for tail sampling**

```
DaemonSet Agents
    │
    ▼
Gateway Tier-1 (Deployment, 3+ replicas)
  loadbalancing exporter → consistent hash by trace_id
    │
    ▼
Gateway Tier-2 (Deployment, 3+ replicas)
  tail_sampling processor
  batch + memory_limiter
    │
    ▼
Backend
```

Tier-1 only routes; Tier-2 owns sampling decisions. This prevents trace fragmentation across replicas.

---

## 7. Federated / Multi-Cluster

For multi-cluster and multi-region deployments:

```
Cluster A (Region US)          Cluster B (Region EU)
  DaemonSet Agents               DaemonSet Agents
       │                               │
  Regional Gateway               Regional Gateway
  (edge aggregation)             (edge aggregation)
       │                               │
       └──────────┬────────────────────┘
                  ▼
         Central Gateway (single region or multi-region active-active)
                  │
             Backend
```

Key considerations:
- **Cross-cloud egress cost**: Exporting telemetry across cloud providers or regions incurs data transfer charges. Evaluate sampling aggressively at the regional edge to reduce egress volume before forwarding to the central gateway.
- **Network latency**: Tail sampling decision wait (typically 30s) must account for cross-region span arrival delay. Increase `decision_wait` accordingly.
- **Authentication**: Use workload identity / OIDC per cluster; avoid static credentials for cross-cluster OTLP export.

---

## References

- https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- https://github.com/open-telemetry/opentelemetry-operator
- https://opentelemetry.io/docs/collector/deployment/
