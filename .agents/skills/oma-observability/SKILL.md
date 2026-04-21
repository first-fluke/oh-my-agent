---
name: oma-observability
description: Intent-based observability + traceability router across layers, boundaries, and signals. Routes to vendor-specific skills via category taxonomy; owns transport tuning, meta-observability, incident forensics. Use for observability, traceability, telemetry, APM, RUM, metrics, logs, traces, profiles, SLO, incident forensics, tracing architecture work.
---

# Observability Agent - Intent-based Router

## When to use
- Setting up an observability pipeline (OTel SDK + Collector + vendor backend)
- Designing traceability across service and domain boundaries (W3C propagators, baggage, multi-tenant, multi-cloud)
- Tuning transport layer (UDP/MTU, OTLP gRPC vs HTTP, Collector DaemonSet vs sidecar topology)
- Running incident forensics (6-dimension localization: code / service / layer / host / region / infra)
- Selecting a vendor category (OSS full-stack vs commercial SaaS vs high-cardinality specialist vs profiling specialist)
- Implementing observability-as-code (Grafana Jsonnet dashboards, PrometheusRule CRD, OpenSLO YAML, SLO burn-rate alerts)
- Meta-observability (pipeline self-health, clock skew detection, cardinality guardrails, retention matrix)
- Covering the MELT+P signal set: metrics, logs, traces, profiles (OTEP 0239), cost (OpenCost), audit (SOC2/ISO), privacy (GDPR/PIPA)
- Migrating off deprecated tools (Fluentd → Fluent Bit or OTel Collector, per CNCF 2025-10 guide)

## When NOT to use
- LLM ops (prompt versioning, evals, gen_ai span deep dive) — use Langfuse, Arize Phoenix, LangSmith, or Braintrust directly
- Data pipeline lineage — use OpenLineage + Marquez, dbt test, or Airflow lineage backends
- IoT / hardware / datacenter physical-layer telemetry (IPMI, BMC, SNMP) — use vendor DCIM tooling (Nlyte, Sunbird, Device42)
- Chaos engineering orchestration — use Chaos Mesh, Litmus, Gremlin, or ChaosToolkit (this skill consumes their telemetry; it does not orchestrate chaos)
- GPU / TPU infrastructure observability — use NVIDIA DCGM Exporter + Prometheus
- Software supply chain (SBOM, attestation) — use sigstore (cosign / rekor), in-toto framework, SLSA level attestations
- Incident response workflow (on-call rotation, paging, escalation) — use PagerDuty, OpsGenie, or Grafana OnCall
- Single-vendor setup already fully covered by that vendor's own published skill — invoke the vendor skill directly

## Core Rules
1. **Classify intent before routing**: every query goes through intent classification — setup | migrate | investigate | alert | trace | tune | route
2. **Category-first, not vendor-registry**: delegate to vendor-owned skills via `resources/vendor-categories.md`; do not duplicate their documentation
3. **Transport tuning is the moat**: UDP/MTU thresholds, OTLP protocol selection, Collector topology, and sampling recipes are in-skill depth that other skills do not cover
4. **Meta-observability is non-negotiable**: always validate pipeline self-health, clock sync (< 100 ms drift), cardinality, and retention before declaring setup complete
5. **CNCF-first preference**: Prometheus, Jaeger, Thanos, Fluent Bit, OpenFeature (Graduated 2024-11), Flagger, Falco (Graduated); OpenTelemetry, Cortex, OpenCost (Incubating)
6. **Fluentd is deprecated**: per CNCF 2025-10 migration guide, recommend Fluent Bit or OTel Collector for all new and migration work
7. **W3C Trace Context as default propagator**: translate per cloud (AWS X-Ray `X-Amzn-Trace-Id`, GCP Cloud Trace, Datadog, Cloudflare, Linkerd) via `boundaries/cross-application.md`
8. **Privacy before features**: PII redaction, sampling-aware baggage rules, and compliance (SOC2/ISO immutable audit + GDPR/PIPA erasure) are applied at collection, not only at storage
9. **Domain-level trust**: all vendor and tool references are timestamped `as of 2026-Q2`; verify live status at https://landscape.cncf.io
10. **No stub in final deliverable**: scaffolds are editing anchors only during build phase; remove before output

## Out of Scope (use external tools)

The combinations below are outside this skill's boundary. The external tools listed are authoritative for each domain.

| Domain | External tools |
|--------|---------------|
| LLM ops / gen_ai observability | Langfuse, Arize Phoenix, LangSmith, Braintrust |
| Data pipeline lineage | OpenLineage + Marquez, dbt test, Apache Airflow lineage |
| L1/L2 physical / datacenter hardware | Nlyte, Sunbird, Device42; SNMP exporters where Prometheus bridge is needed |
| L5 Session / L6 Presentation full TLS inspection | Wireshark (packet-level), Cloudflare Radar (TLS ecosystem data), vendor TLS inspection tooling |
| Chaos engineering orchestration | Chaos Mesh, Litmus, Gremlin, ChaosToolkit |
| GPU / AI infra (DCGM, NVIDIA) | NVIDIA DCGM Exporter + Prometheus; OTel GPU semconv (Development, not production-ready) |
| Software supply chain (SBOM, attestation) | sigstore (cosign / rekor), in-toto framework, SLSA level attestations |
| Incident response workflow (paging, rotation) | PagerDuty, OpsGenie, Grafana OnCall |
| Fluentd (primary tool) | Deprecated CNCF 2025-10 — use Fluent Bit or OTel Collector |

## Architecture (4 x 4 x 7 matrix)

```
                  User / Other Skill Query
                            |
                            v
              +-----------------------------+
              |      Intent Classifier      |
              |  setup | migrate | investigate
              |  alert | trace | tune | route|
              +-----------------------------+
                            |
                            v
              +-----------------------------+
              |      Vendor Router          |
              |  category-first delegation  |
              +-----------------------------+
                            |
                            v
              +-----------------------------+
              |   vendor-categories.md      |
              |   (a) OSS Full-Stack        |
              |   (b) Commercial SaaS APM   |
              |   (c) High-Cardinality      |
              |   (d) Profiling Specialist  |
              |   (e) SIEM / Enterprise Logs|
              |   (f) FinOps / Cost         |
              |   (g) Feature Flags/Rollout |
              |   (h) Log Pipeline          |
              |   (i) Time Series Storage   |
              |   (j) Crash Analytics       |
              +-----------------------------+
                            |
                            v
              +-----------------------------+
              |  Matrix Coverage Selector   |
              |  4 Layers x 4 Boundaries    |
              |  x 7 Signals = 112 cells    |
              +-----------------------------+
                            |
                            v
              +-----------------------------+
              |  Transport Depth /          |
              |  Meta-observability         |
              |  UDP, OTLP, Collector,      |
              |  cardinality, clock skew    |
              +-----------------------------+
                            |
                            v
              +-----------------------------+
              |  Incident Forensics         |
              |  6-dim localization:        |
              |  code/service/layer/host/   |
              |  region/infra               |
              +-----------------------------+
```

**Layers (4):** L3-network, L4-transport, mesh, L7-application
**Boundaries (4):** multi-tenant, cross-application, slo, release
**Signals (7):** metrics, logs, traces, profiles, cost, audit, privacy

See `resources/matrix.md` for the full 112-cell coverage map with N/A markers for invalid combinations.

## Routes (Intent)

| Intent | Primary target | Fallback |
|--------|---------------|----------|
| `setup` | `resources/vendor-categories.md` → vendor-owned skill | Generic OTel semconv in `resources/standards.md` |
| `migrate` | CNCF 2025-10 guide + `resources/vendor-categories.md §(h)` | OTel Collector bridge config |
| `investigate` | `resources/incident-forensics.md` (MRA + 6-dim localization) | `signals/traces.md` + `signals/logs.md` |
| `alert` | `boundaries/slo.md` (burn-rate alert rules) | `resources/observability-as-code.md` |
| `trace` | `boundaries/cross-application.md` (propagator matrix) | `layers/mesh.md` (zero-code auto-instrumentation) |
| `tune` | `transport/` (4 files: UDP/MTU, OTLP, topology, sampling) | `resources/meta-observability.md` (cardinality guardrails) |
| `route` | `boundaries/multi-tenant.md` + `transport/collector-topology.md` | `boundaries/cross-application.md` (data residency) |

## Invocation

Standalone:
```
/oma-observability "set up OTel stack on Kubernetes"
/oma-observability --migrate "move from Fluentd to Fluent Bit"
/oma-observability --investigate "5xx spike in ap-northeast-2"
/oma-observability --alert "configure SLO burn-rate alert for checkout API"
/oma-observability --trace "W3C propagator across AWS + GCP boundary"
/oma-observability --tune "UDP statsd MTU throughput limit"
/oma-observability --route "multi-tenant log isolation with data residency"
```

Shared invocation (from other skills):
1. State intent: `setup` | `migrate` | `investigate` | `alert` | `trace` | `tune` | `route`
2. Pass the user query string
3. Receive routed guidance or a vendor-skill delegation target

## How to Execute
Follow `resources/execution-protocol.md` step by step.
See `resources/examples.md` for end-to-end walkthroughs.
Use `resources/intent-rules.md` for intent classification reference.
Use `resources/matrix.md` for coverage navigation across layers, boundaries, and signals.
Use `resources/vendor-categories.md` for vendor delegation and category selection.
Before submitting, run `resources/checklist.md`.

## Integrations with OMA Ecosystem

> **Integration status (2026-Q2)**: rows below describe **recommended handoff patterns** from the oma-observability side. As of this version, reciprocal cross-references from the other skills' SKILL.md files are not yet in place — this is a v1.1 follow-up item. Users invoking the other skills directly will need to surface this integration manually until the reciprocal links land.

| Skill | Integration point | Reciprocal link status |
|-------|------------------|-------|
| `oma-debug` | On failure: pull traces + logs by `request_id` → trigger `resources/incident-forensics.md` 6-dim localization playbook | ⏳ pending (v1.1) |
| `oma-qa` | Canary post-deploy loop via chrome-devtools MCP: console errors + Core Web Vitals trend; INP/LCP/CLS from `layers/L7-application/web-rum.md` | ⏳ pending (v1.1) |
| `oma-tf-infra` | Terraform modules for OTel Collector, Grafana, and Loki stack provisioning | ⏳ pending (v1.1) |
| `oma-scm` | Deployment SHA → `service.version` OTel attribute + release marker events; see `boundaries/release.md` | ⏳ pending (v1.1) |
| `oma-backend` | Propagator and baggage rules cross-referenced in `backend.md` ruleset; DB N+1 + Kafka patterns in `signals/traces.md` | ⏳ pending (v1.1) |
| `oma-frontend` | `layers/L7-application/web-rum.md` INP/LCP/CLS checklist cross-referenced in `frontend.md` ruleset | ⏳ pending (v1.1) |
| `oma-mobile` | `layers/L7-application/mobile-rum.md` offline-queuing pattern cross-referenced in `mobile.md` ruleset | ⏳ pending (v1.1) |
| `oma-db` | `signals/traces.md` DB patterns (N+1, connection pool) cross-referenced in `database.md` ruleset | ⏳ pending (v1.1) |

## Versioning & Deprecation

- **Spec version pinning**: OTel spec version, semconv version, and W3C Trace Context maturity level are pinned in `resources/standards.md` header and reviewed quarterly.
- **Review cadence**: quarterly, aligned with OTel spec releases and CNCF landscape updates (https://landscape.cncf.io).
- **On semconv promotion** (Development → RC or RC → Stable): update `resources/standards.md` + all affected signal/layer files that reference the changed attribute group; bump skill minor version.
- **On attribute deprecation**: update all files citing the deprecated attribute with the replacement; add a migration note in `resources/standards.md`.
- **Vendor list review**: example vendor lists in `resources/vendor-categories.md` reviewed quarterly; `as of YYYY-QX` timestamps updated on each change.
- **Next review due**: 2026-Q3.

## Contribution Protocol

- Do NOT pre-declare future OMA skill names in user-facing documentation. If OMA-native coverage becomes warranted for an out-of-scope domain, evaluate and name it at that point.
- File edits follow the ownership matrix in `docs/plans/oma-observability-design.md §Ownership`. CTO co-signs changes to `standards.md`, `matrix.md`, `anti-patterns.md`.
- Run `resources/checklist.md §1 Setup validation` before merging.

## References
- Execution steps: `resources/execution-protocol.md`
- Intent classification: `resources/intent-rules.md`
- Coverage matrix: `resources/matrix.md`
- Standards (OTel spec, W3C, ISO): `resources/standards.md`
- Vendor categories: `resources/vendor-categories.md`
- Incident forensics: `resources/incident-forensics.md`
- Meta-observability: `resources/meta-observability.md`
- Observability-as-code: `resources/observability-as-code.md`
- Anti-patterns (18 items): `resources/anti-patterns.md`
- Checklist: `resources/checklist.md`
- Examples: `resources/examples.md`
- Transport:
  - `resources/transport/udp-statsd-mtu.md`
  - `resources/transport/otlp-grpc-vs-http.md`
  - `resources/transport/collector-topology.md`
  - `resources/transport/sampling-recipes.md`
- Layers:
  - `resources/layers/L3-network.md`
  - `resources/layers/L4-transport.md`
  - `resources/layers/mesh.md`
  - `resources/layers/L7-application/web-rum.md`
  - `resources/layers/L7-application/mobile-rum.md`
  - `resources/layers/L7-application/crash-analytics.md`
- Boundaries:
  - `resources/boundaries/multi-tenant.md`
  - `resources/boundaries/cross-application.md`
  - `resources/boundaries/slo.md`
  - `resources/boundaries/release.md`
- Signals:
  - `resources/signals/metrics.md`
  - `resources/signals/logs.md`
  - `resources/signals/traces.md`
  - `resources/signals/profiles.md`
  - `resources/signals/cost.md`
  - `resources/signals/audit.md`
  - `resources/signals/privacy.md`
