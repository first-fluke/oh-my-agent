# Service Mesh Observability

## 1. Why the Service Mesh Has Its Own Observability File

The service mesh is classified as a **L4-L7 hybrid layer** in the taxonomy defined in `resources/standards.md` (OSI boundary decision). It differs from the adjacent L4-transport layer in a fundamental way: the mesh proxy (sidecar or ambient agent) operates at the HTTP/gRPC framing level, not at raw TCP socket level.

Three properties make mesh observability distinct enough to warrant a dedicated file:

1. **Zero-code auto-instrumentation.** Sidecar injection (or ambient mode) intercepts all inbound and outbound traffic without requiring any change to application code. Metrics, access logs, and distributed trace spans are produced automatically from day one of mesh deployment. This contrasts with `layers/L4-transport.md`, where eBPF probes attach to kernel socket events and produce transport-centric (TCP RTT, retransmit) artifacts.

2. **Proxy-centric, not transport-centric.** Mesh observability is Envoy-proxy-centric or Linkerd-proxy-centric. The primary artifacts are Envoy listeners/clusters, access log records, and HTTP/gRPC span metadata; not TCP segments or IP packets. `layers/L4-transport.md` covers kernel-level transport; this file covers proxy-level L7 framing.

3. **mTLS identity as a first-class signal.** The mesh terminates mTLS at the sidecar, producing certificate identity (SPIFFE SVID), cipher suite, and expiry as observable attributes alongside each request. No other layer produces this security context natively.

---

## 2. Service Mesh Options

| Mesh | CNCF Status | Proxy engine | Deployment modes | Primary differentiator |
|------|------------|-------------|-----------------|----------------------|
| **Istio** | Graduated | Envoy | Sidecar, Ambient (ztunnel + waypoint) | Richest Envoy telemetry; Telemetry API `telemetry.istio.io/v1` and OTLP/HTTP trace export (Istio 1.22+) |
| **Linkerd** | Graduated | linkerd2-proxy (Rust) | Sidecar only | Lightweight; minimal CPU overhead; built-in mTLS; proxy propagates W3C and B3 headers |
| **Envoy** | Graduated | Self | Standalone gateway or sidecar | Proxy engine underlying Istio; also deployed as standalone API gateway |
| **Consul Connect** | Not CNCF | Envoy (via xDS) | Sidecar | HashiCorp ecosystem; strong multi-datacenter support |
| **Kuma** | CNCF Sandbox | Envoy (via xDS) | Sidecar, Universal (VM) | Multi-cloud and multi-zone; Kong-backed |

CNCF status source: <https://landscape.cncf.io>; verify at use time when load-bearing.

---

## 3. Native Telemetry from the Mesh

### 3.1 Metrics: Envoy Golden Signals

Envoy exposes golden signals per **listener** (inbound) and **cluster** (outbound). Istio enables a controlled subset by default to avoid cardinality explosion caused by per-endpoint label permutations.

| Signal | Metric names (Istio/Envoy) | Label cardinality note |
|--------|---------------------------|----------------------|
| Request rate (throughput) | `istio_requests_total` | High: source × destination × method × status code |
| Error rate | `istio_requests_total{response_code=~"5.."}` | Subset of throughput labels |
| Latency p50/p95/p99 | `istio_request_duration_milliseconds` | Histogram; disable per-endpoint if >1000 pods |
| Saturation (pending) | `envoy_cluster_upstream_rq_pending_total` | Per cluster |
| mTLS handshake errors | `istio_tcp_connections_closed_total` | Proxy-level |

`istio_requests_total` multiplies source × destination × method × response code, and adding per-path or per-endpoint tags exceeds a Prometheus series budget quickly. Remove high-cardinality tags with Telemetry API metric overrides (`tagOverrides` with `operation: REMOVE`) or aggregate in a Collector `transform` processor, and confirm the cardinality budget in `resources/meta-observability.md` before adding tags.

### 3.2 Distributed Traces

Envoy automatically creates **ingress and egress spans** for every HTTP/gRPC call that traverses the proxy. Each span captures:

- `http.request.method`, `http.response.status_code`, `url.full` (Stable semconv)
- Peer service identity derived from the Envoy cluster name: `server.service.name` on client spans, `client.service.name` on server spans (Development semconv)
- mTLS peer identity (SPIFFE SVID) via `tls.*` attributes (Development semconv; see the stability tiers in `resources/standards.md`)
- `x-request-id` correlation ID (Istio-specific; carries across internal calls)

Spans are created without SDK changes. The caveat is that without application-level header forwarding, each service starts a **new root span** rather than contributing to the existing trace. This is the context propagation problem addressed in Section 5.

### 3.3 Access Logs

Envoy access logs provide per-request metadata: source workload identity, destination service, HTTP method and status code, request duration, bytes sent and received, and upstream cluster name. Access logs complement traces; they are always available (100% sampling) even when traces are sampled at 1%.

Structured access log format (JSON) is required for trace correlation:

```json
{
  "trace_id": "%TRACE_ID%",
  "span_id": "%SPAN_ID%",
  "upstream_cluster": "%UPSTREAM_CLUSTER%",
  "response_code": "%RESPONSE_CODE%",
  "duration": "%DURATION%",
  "source_principal": "%DOWNSTREAM_PEER_SUBJECT%"
}
```

> Envoy command operators `%TRACE_ID%` and `%SPAN_ID%` extract the W3C `traceparent` context Envoy itself emitted. Using `%REQ(X-B3-TRACEID)%` is only correct if the upstream explicitly sent the B3 header. Since this skill standardizes on W3C (see §6 Propagator Headers), prefer the command operators.

### 3.4 mTLS Certificate Observability

Istio exposes certificate expiry and rotation events as Prometheus metrics:

- `citadel_server_csr_count`: certificate signing request volume
- `pilot_xds_pushes{type="sds"}`: SDS secret delivery (certificate rotation)
- Cert expiry: scraped from `istio-proxy` via `/pki` endpoint, alertable as a PrometheusRule

`tls.*` attributes are Development tier; see the stability tiers in `resources/standards.md`.

---

## 4. OpenTelemetry Direct Export (Envoy 1.29+ / Istio 1.22+)

### 4.1 Envoy OTLP Tracer

Since Envoy 1.29, the built-in OpenTelemetry tracer exports spans over OTLP/HTTP as well as OTLP/gRPC to any OTel-compatible backend or OTel Collector, with resource detectors and a configurable sampler.

Istio 1.22 surfaces this via the `opentelemetry` extension provider in MeshConfig, which a **Telemetry API** resource selects; this avoids editing raw Envoy bootstrap config.

### 4.2 Telemetry CR (Istio 1.22+)

```yaml
# Configure Istio tracing to export OTLP/HTTP to an OTel Collector
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: otel-tracing
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: otel-tracing-provider
      randomSamplingPercentage: 10.0
---
# Register the OTel tracing provider in MeshConfig
# (set via IstioOperator or helm values: meshConfig.extensionProviders)
# meshConfig:
#   extensionProviders:
#     - name: otel-tracing-provider
#       opentelemetry:
#         service: otel-collector.observability.svc.cluster.local
#         port: 4318
#         http:
#           path: /v1/traces
#         resourceDetectors:
#           environment: {}
```

The `resourceDetectors.environment` block activates the **Environment Resource Detector**, which reads `OTEL_RESOURCE_ATTRIBUTES` from the proxy environment and adds those attributes to the exported resource.

### 4.3 Custom Samplers (Envoy 1.29+)

Envoy 1.29 added a configurable sampler to the OpenTelemetry tracer; current Envoy ships always-on, parent-based, trace-ID-ratio, CEL, and Dynatrace samplers. In Istio, custom samplers are configured through MeshConfig. Tail-based sampling decisions are still made at the Collector tier; see `resources/transport/sampling-recipes.md` for tail-sampler configuration.

---

## 5. Zero-Code Auto-Instrumentation Pitfall: Broken Context Propagation

### 5.1 The Problem

The mesh sidecar creates spans but cannot inject `traceparent` into the application's outbound HTTP calls by itself. If the application does not read the incoming `traceparent` header and forward it on outbound calls, Envoy on the egress side starts a **new trace**, breaking the trace chain. The result is a trace forest of disconnected single-hop spans rather than a unified distributed trace.

This is the primary mesh tracing pitfall: mesh-only tracing without application header forwarding. The mesh also sees only network hops; database queries, cache reads, and business logic stay invisible until the application carries an SDK (Section 7).

### 5.2 Solution A: Application-Level Propagator Library

Add the W3C Trace Context propagator to the application SDK. The SDK reads `traceparent` from incoming requests and automatically injects it into all outbound HTTP/gRPC calls.

```python
# Python example (opentelemetry-sdk)
from opentelemetry.propagate import set_global_textmap
from opentelemetry.propagators.composite import CompositePropagator
from opentelemetry.propagators.b3 import B3MultiFormat
from opentelemetry import propagate

set_global_textmap(CompositePropagator([
    propagate.get_global_textmap(),  # W3C TraceContext + Baggage
    B3MultiFormat(),                  # B3 for Zipkin-legacy services
]))
```

### 5.3 Solution B: OTel Operator Instrumentation CR

The **OpenTelemetry Operator** (`github.com/open-telemetry/opentelemetry-operator`) injects the OTel SDK init container and environment variables into Pods automatically via a mutating webhook, without any application code change.

Supported language runtimes: Java, NodeJS, Python, .NET, Go, PHP, Ruby, Apache HTTPD, Nginx.

**Step 1; Deploy the Instrumentation CR:**

```yaml
apiVersion: opentelemetry.io/v1alpha1
kind: Instrumentation
metadata:
  name: default-instrumentation
  namespace: my-app
spec:
  exporter:
    endpoint: http://otel-collector.observability.svc.cluster.local:4318
  propagators:
    - tracecontext   # W3C traceparent / tracestate
    - baggage        # W3C baggage
    - b3             # B3 single-header (Zipkin legacy compatibility)
  sampler:
    type: parentbased_traceidratio
    argument: "0.1"
  java:
    image: ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-java:latest
  nodejs:
    image: ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-nodejs:latest
  python:
    image: ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-python:latest
  dotnet:
    image: ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-dotnet:latest
  go:
    image: ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-go:latest
```

**Step 2; Activate per Pod via annotation:**

```yaml
metadata:
  annotations:
    instrumentation.opentelemetry.io/inject-java: "true"
    # or: inject-nodejs, inject-python, inject-dotnet, inject-go
```

The Operator injects the SDK agent, sets `OTEL_EXPORTER_OTLP_ENDPOINT`, and configures the propagator list. The sidecar then sees correctly formed `traceparent` headers on all outbound calls, connecting mesh spans to application spans in a single trace.

---

## 6. Propagator Headers per Mesh

Cross-reference: `resources/boundaries/cross-application.md` for full propagator compatibility matrix.

| Header | Standard / Origin | Carried by | Notes |
|--------|------------------|-----------|-------|
| `traceparent` | W3C Trace Context L1 | W3C-compliant SDKs, Envoy OTLP, Istio | Recommended default for all new deployments |
| `tracestate` | W3C Trace Context L1 | Same as above | Vendor-specific trace flags; opaque to intermediaries |
| `baggage` | W3C Baggage | OTel SDK, Istio | Key-value propagation; strip PII at ingress gateway |
| `x-b3-traceid` | B3 (Zipkin) | Envoy B3 propagator, Linkerd proxy | 128-bit; use B3 multi-header format |
| `x-b3-spanid` | B3 (Zipkin) | Same | 64-bit |
| `x-b3-parentspanid` | B3 (Zipkin) | Same | 64-bit; absent on root spans |
| `x-b3-sampled` | B3 (Zipkin) | Same | `1` = keep, `0` = drop; overrides downstream sampler |
| `x-request-id` | Envoy / Istio internal | Istio sidecar injected | Stable correlation ID across retries; not a trace ID |
| `x-ot-span-context` | LightStep (legacy) | Envoy LightStep tracer | Legacy; Envoy 1.24+ does not ship that tracer, so use the Envoy OpenTelemetry tracer |

**Cross-mesh compatibility rule:** when Istio and Linkerd coexist (or when a service exits the mesh boundary to an external system), standardize on W3C `traceparent` / `tracestate` as the translation surface. Configure each mesh's propagator list to include W3C as the first entry.

**Linkerd:** the Linkerd proxy propagates both W3C and B3 trace headers and, when a request carries both, forwards only the W3C headers. It emits a span only for requests that already carry a trace header, and exports to any collector that accepts the OpenTelemetry protocol. The application must still copy the trace headers from inbound to outbound requests; confirm details in the current Linkerd distributed-tracing docs.

---

## 7. Combining Mesh and Application Telemetry

The mesh alone covers **network boundary spans**: the ingress proxy creates a server-side span, the egress proxy creates a client-side span. What it cannot see is what the application does between receiving a request and making the next outbound call; database queries, cache reads, external API calls, or business-logic operations.

| Source | Spans covered | Business context |
|--------|--------------|-----------------|
| Mesh (Envoy/Linkerd) | Ingress and egress HTTP/gRPC per service hop | None; proxy has no access to app state |
| Application SDK | Internal operations: DB, cache, queue, business logic | Full; SDK operates inside the application process |
| Combined via OTel Collector | All of the above, correlated by `trace_id` | Complete; best result |

Recommended pipeline architecture:

```
Envoy sidecar
  └─ OTLP/HTTP → OTel Collector (DaemonSet or sidecar)
                    └─ traces → observability backend

Application SDK (via OTel Operator Instrumentation CR)
  └─ OTLP/gRPC → OTel Collector (same or separate instance)
                    └─ traces → observability backend (same trace_id)
```

Both pipelines feed the same backend. The backend joins spans by `trace_id`. The result is a waterfall chart with proxy-level boundary spans and application-level internal spans in the same view.

For Collector topology options see `resources/transport/collector-topology.md`.

---

## 8. mTLS Observability (Security Context)

When Istio PeerAuthentication is set to `STRICT` mode, all pod-to-pod traffic is encrypted with mTLS. The mesh then exposes security context as observable attributes:

- **TLS version**: `tls.protocol.version` (Development tier; see the stability tiers in `resources/standards.md`)
- **Cipher suite**: `tls.cipher` (Development tier)
- **Certificate expiry**: alertable via PrometheusRule on `citadel_server_root_cert_expiry_timestamp`
- **SPIFFE peer identity**: available in Envoy access log via `%DOWNSTREAM_PEER_SUBJECT%`; identifies source workload for zero-trust audit

```yaml
# PrometheusRule: alert when any Istio cert expires within 7 days
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-cert-expiry
  namespace: istio-system
spec:
  groups:
    - name: istio.certificates
      rules:
        - alert: IstioCertExpiryWarning
          expr: |
            (citadel_server_root_cert_expiry_timestamp - time()) / 86400 < 7
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "Istio root certificate expires in fewer than 7 days"
```

---

## 9. Sampling Considerations

Istio's default sampling rate is **1%** (`randomSamplingPercentage: 1.0`). At 1%, you need 100 requests before the first trace is visible in the backend; this is insufficient for debugging low-traffic endpoints or canary deployments.

| Scenario | Recommended sampling rate | Configuration location |
|----------|--------------------------|----------------------|
| Development / staging | 100% | Telemetry CR `randomSamplingPercentage: 100` |
| Production (baseline) | 10% | Telemetry CR `randomSamplingPercentage: 10` |
| High-traffic SLO critical path | Tail-based at Collector | Collector `tail_sampling` processor |
| Canary release tracing | 100% on canary subset | Telemetry CR scoped to canary namespace or label |

Tune via the Telemetry API `randomSamplingPercentage` field or by configuring a custom OTel Sampler via Envoy 1.29+. For tail-based sampling (retain error traces, drop successful traces after SLO window), configure at the gateway Collector tier as documented in `resources/transport/sampling-recipes.md`.

---

## 10. References


Internal cross-references:
- `resources/standards.md`: normative semconv stability tiers and W3C Trace Context requirements
- `resources/matrix.md`: coverage map (mesh rows)
- `resources/transport/sampling-recipes.md`: tail-based sampling at Collector tier
- `resources/transport/collector-topology.md`: DaemonSet vs sidecar Collector topology
- `resources/meta-observability.md`: cardinality guardrails and pipeline self-health
- `resources/layers/L4-transport.md`: eBPF socket-level profiles for mesh sidecar overhead
- `resources/boundaries/cross-application.md`: full propagator compatibility matrix
- `resources/boundaries/multi-tenant.md`: baggage-based tenant attribution
- `resources/boundaries/release.md`: canary trace routing with `service.version`
- `resources/signals/privacy.md`: baggage PII rules at the ingress gateway
- `resources/signals/traces.md`: OTel SDK trace patterns for application layer

External:

- Istio observability concepts: <https://istio.io/latest/docs/concepts/observability/>
- Istio OpenTelemetry tracing task: <https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/>
- Envoy + Istio OTel features (2024): <https://opentelemetry.io/blog/2024/new-otel-features-envoy-istio/>
- OTel Operator GitHub: <https://github.com/open-telemetry/opentelemetry-operator>
- Linkerd distributed tracing: <https://linkerd.io/2-edge/tasks/distributed-tracing/>
- W3C Trace Context L1: <https://www.w3.org/TR/trace-context/>
- OTel semconv `tls.*`: <https://opentelemetry.io/docs/specs/semconv/registry/attributes/tls/>
