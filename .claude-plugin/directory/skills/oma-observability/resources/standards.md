# Observability Standards Reference

## 1. Purpose

This file defines the normative standards baseline for the `oma-observability` skill. It answers:

- Which specifications govern trace propagation, attribute naming, and signal transport?
- Which semconv stability tiers may feed production SLOs?
- Which OSI layers are in scope and why?
- What clock discipline is required for trustworthy timestamp ordering?

Other files cite this document for these rules. Load it when one of these questions is in play.

**Version currency (the only such statement in this skill):** no file pins an OpenTelemetry spec, semconv, or tool version. Attribute names and tiers below follow the semantic-conventions registry as written here; resolve the live registry (<https://opentelemetry.io/docs/specs/semconv/>) and the deployed SDK and Collector versions at use time, and treat a mismatch as a finding. Resolve tool and chart versions at use time as well.

---

## 2. Primary De Facto Standards

### 2.1 OpenTelemetry (CNCF Graduated)

Source: <https://opentelemetry.io/docs/specs/otel/> | CNCF: <https://www.cncf.io/projects/opentelemetry/>

OpenTelemetry is the vendor-neutral, CNCF-graduated specification for telemetry APIs, SDKs, semantic conventions, and the wire protocol OTLP. It is the single de facto standard this skill operates on.

Four pillars in scope for this skill:

| Pillar | Specification | Wire protocol |
|--------|---------------|---------------|
| API / SDK | opentelemetry.io/docs/specs/otel/ | N/A |
| Semantic Conventions (semconv) | opentelemetry.io/docs/specs/semconv/ | N/A |
| Protocol (OTLP) | opentelemetry.io/docs/specs/otlp/ | gRPC :4317 / HTTP :4318 |
| Collector | opentelemetry.io/docs/collector/ | N/A |

Key constraints:
- Use the stable semconv groups listed in Section 3 for production instrumentation.
- OTLP is the mandatory export format; vendor-native formats are acceptable only as secondary sinks.
- The OTel Operator manages Collector (`OpenTelemetryCollector`) and auto-instrumentation (`Instrumentation`) custom resources in Kubernetes. The two CRDs carry different API versions; check the installed CRDs before writing a manifest.

### 2.2 W3C Trace Context

- Level 1 Recommendation: <https://www.w3.org/TR/trace-context/>
- Level 2: <https://www.w3.org/TR/trace-context-2/>

W3C Trace Context defines the `traceparent` and `tracestate` HTTP headers that establish a distributed trace across service boundaries. Level 1 is the production-stable baseline. Check the Level 2 document's current maturity before depending on its additions.

Mandatory propagation rule: every outbound HTTP/gRPC call MUST forward `traceparent`. Stripping it silently is an anti-pattern.

Vendor header compatibility reference (informative; the full matrix is in `boundaries/cross-application.md`):
- AWS X-Ray: `X-Amzn-Trace-Id`; bridge via the OTel X-Ray propagator
- GCP Cloud Trace: prefers W3C; legacy `X-Cloud-Trace-Context` is supported for backward compatibility
- Datadog: `X-Datadog-Trace-Id`; use OTel Datadog exporter for bridging

### 2.3 W3C Baggage

Recommendation: <https://www.w3.org/TR/baggage/>

W3C Baggage defines the `baggage` HTTP header for key-value pairs propagated alongside a trace. The W3C spec itself contains trust-boundary and PII guidance: baggage is visible to all downstream services and MUST NOT carry secrets, tokens, or personally identifiable information without explicit downstream trust agreement.

OTel Baggage API reference: <https://opentelemetry.io/docs/specs/otel/baggage/api/>

Usage rules enforced by this skill:
- Allowed: tenant ID, feature flag state, deployment SHA, region hint.
- Not allowed: user email, session tokens, authentication credentials.
- Trust boundary: strip or validate baggage at ingress gateway before forwarding to external services.

---

## 3. OpenTelemetry Semconv Stability Tiers

Semantic convention stability determines which attributes can be used in production without risk of breaking changes. The table records the tier this skill assumes; confirm the tier in the registry when a recommendation depends on it.

Source: <https://opentelemetry.io/docs/specs/semconv/general/attribute-requirement-level/>

| Tier | Groups | Production use |
|------|--------|----------------|
| Stable | `service.*`, `host.*`, `cloud.*`, `k8s.*` (core), `http.*`, `db.*` (core), `rpc.*` (core spans and metrics), `network.*` (core), `error.*`, `deployment.environment.name` | Yes, without caveat |
| Release Candidate (RC) | `feature_flag.*` (evaluation event) | Yes, expect minor changes |
| Development | `messaging.*`, `db.client.connection.*` metrics, `tls.*`, `network.connection.type` / `.subtype`, profiles (OTEP 0239) | Test environments; production use requires change-tolerance; not for production SLOs |

Notes:
- `network.*` core attributes (e.g., `network.protocol.name`, `network.transport`) are Stable. `network.connection.type` and `network.connection.subtype` are Development.
- `tls.*` attributes are Development. For TLS deep inspection, use Wireshark or vendor-specific TLS tooling rather than OTel attributes.
- The OTel profiling signal ([OTEP 0239](https://github.com/open-telemetry/oteps/blob/main/text/profiles/0239-profiles-data-model.md)) is Development. Parca and Pyroscope run in production on their own formats. Mark any profiling-related SLOs as experimental.
- `gen_ai.*` is out of scope for this skill (LLM ops; see `SKILL.md` "When NOT to use").

Attribute names this skill uses for commonly renamed concepts:

| Concept | Attribute |
|---------|-----------|
| Deployment environment | `deployment.environment.name` |
| Database system | `db.system.name` |
| Messaging consumer group | `messaging.consumer.group.name` |
| Feature-flag variant | `feature_flag.result.variant` |
| Feature-flag provider | `feature_flag.provider.name` |
| Peer service | `server.service.name` (client spans), `client.service.name` (server spans) |

When an SDK in the target system still emits a different name for one of these, treat the difference as a migration item and check the SDK's semconv opt-in settings.

Registry pages follow the pattern `https://opentelemetry.io/docs/specs/semconv/registry/attributes/<group>/` (for example `.../service/`, `.../network/`, `.../tls/`).

---

## 4. OSI Boundary Decision

This skill operates on OSI layers L3, L4, mesh (L4-L7 hybrid), and L7. The following table makes the in-scope and out-of-scope decisions explicit.

### In scope

| Layer | Label | Coverage |
|-------|-------|----------|
| L3 | Network | IP routing, VPC flow logs, ICMP, PMTUD |
| L4 | Transport | TCP retransmits/RTT, eBPF instrumentation (OBI/Beyla, Pixie), QUIC/HTTP3 transport |
| L4-L7 | Service mesh | Istio/Linkerd/Envoy: zero-code instrumentation, mTLS metadata as security context |
| L7 | Application | HTTP/gRPC/WebSocket, RUM (web + mobile), crash analytics, messaging, edge WAF |

### Out of scope

| Layer | Label | Reason | Use instead |
|-------|-------|--------|-------------|
| L1 | Physical | SaaS hypervisor hides; no OTel semconv coverage | Vendor DCIM tooling (Nlyte, Sunbird, Device42) |
| L2 | Data Link | Same as L1; SNMP/IPMI are hardware domains | Vendor DCIM tooling; SNMP exporters for Prometheus if needed |
| L3 (routing control plane) | BGP/BMP, RPKI | ISP and network-operator domain; not OTel telemetry | BGP monitoring tooling (BGPalerter, route collectors) |
| L5 | Session (full) | gRPC session semantics moved to L7 instrumentation; WebSocket deferred | WebSocket-specific vendor tooling |
| L6 | Presentation (full) | TLS kept as security context attributes only (`tls.*` Development tier); full TLS inspection is not OTel's domain | Wireshark for packet-level TLS; vendor-specific TLS inspection tooling |

Rationale: most production debugging occurs at L3, L4, mesh, and L7. L1/L2 are opaque to SaaS workloads. L5/L6 full coverage requires OTel semconv maturity that does not yet exist (Development tier).

---

## 5. Clock Discipline

Distributed traces depend on monotonic, synchronized clocks across all nodes. Clock drift corrupts waterfall charts and makes parent-before-child ordering unreliable.

### Requirements

- **NTP or chrony** MUST be running and synchronized on all host VMs and container hosts.
- Acceptable drift tolerance for trace timestamp correlation: **< 100 ms** (typical NTP accuracy on well-connected hosts).
- For sub-millisecond precision (financial, telco, or high-frequency workloads): use **PTP (IEEE 1588)** hardware timestamping.

### Cloud hypervisor time sync notes

| Cloud | Mechanism | Notes |
|-------|-----------|-------|
| AWS | Chrony + Amazon Time Sync Service (169.254.169.123) | PTP-backed time source; verify with `chronyc tracking` and `chronyc sources -v`. Docs: <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/set-time.html> |
| GCP | Internal hypervisor clock sync (`metadata.google.internal` via `time.google.com`) | GCP VMs inherit host clock. `timedatectl show` only confirms a sync daemon is active; to verify the actual offset, use `chronyc sources -v` (chrony) or `timedatectl timesync-status` (systemd-timesyncd) |
| Azure | Hyper-V IC timesync primary; external NTP fallback only if Hyper-V IC tools absent | Azure Linux VMs with the Hyper-V Integration Services use host time as the authoritative source. External NTP (for example `time.windows.com`) as a peer source can conflict with IC timesync; treat it as a fallback, not a parallel source. Docs: <https://learn.microsoft.com/azure/virtual-machines/linux/time-sync> |

### Span timestamp validation rule

Validate each span against its own timestamps:

```
span.start_time <= span.end_time
```

A parent span may end before an asynchronous child completes; the OTel Trace API explicitly allows children to continue after their parent ends. Parent/child interval containment is not a validity invariant or clock-drift detector. Investigate suspicious cross-host ordering using measured clock offsets and the actual synchronous/asynchronous operation semantics. See `resources/meta-observability.md` Section B and <https://opentelemetry.io/docs/specs/otel/trace/api/>.

### Anti-pattern

NTP drift left unmonitored is catalogued in `resources/anti-patterns.md` §H: waterfall charts appear causally wrong, leading engineers to chase phantom race conditions. Monitor node-level NTP offset alongside Collector health.

---

## 6. Review Triggers

No scheduled cadence (see `SKILL.md` §Versioning & Deprecation). Revisit this file when:

- A semconv group listed in Section 3 changes tier, or an attribute named in this skill is deprecated or renamed.
- A listed W3C document advances maturity.
- A CNCF status change (<https://landscape.cncf.io/>) affects cited content.

When updating, also update the signal, layer, and boundary files that use the changed attribute group.
