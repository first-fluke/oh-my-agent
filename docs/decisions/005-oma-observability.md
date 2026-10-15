# oma-observability Design Document

> Observability & traceability meta-router across layers, boundaries, and signals.

## Overview

`oma-observability` is an intent-based meta-skill that routes observability tasks to vendor-specific setup skills (Sentry, Honeycomb, Dash0, Datadog, OpenCost, etc.), provides a layer × boundary × signal matrix for systematic coverage, and owns a transport-tuning / cardinality-guardrail knowledge base that existing skills do not offer.

It does NOT reinvent what CNCF standards already cover; it routes, matrixes, and fills gaps in propagation / UDP / MTU / collector topology / meta-observability / observability-as-code.

## One-liner

Vendor-agnostic observability + traceability router across L3/L4/mesh/L7, multi-tenant/domain/cross-app/SLO/release boundaries, and MELT+P+cost+audit+privacy signals, with transport-layer depth no other skill provides.

## Scope

### In scope
- **Layers**: L3 (network, BGP), L4 (transport, eBPF), mesh (Istio/Linkerd/Envoy), L7 (web RUM, mobile RUM, crash analytics)
- **Boundaries**: multi-tenant, cross-application (W3C propagators + DDD namespaces), SLO, release (Flagger/Argo/OpenFeature)
- **Signals**: metrics, logs (events as LogRecords), traces, profiles (Parca/Pyroscope/OTEP 0239), cost (OpenCost), audit (SOC2/ISO), privacy (GDPR/PIPA)
- **Transport tuning**: UDP/StatsD MTU, OTLP gRPC vs HTTP, Collector topology (2-tier k8s, Fargate sidecar), sampling recipes
- **Meta-observability**: pipeline self-health, clock skew, cardinality guardrails, retention matrix
- **Observability-as-code**: Grafana Jsonnet, PrometheusRule CRD, OpenSLO, Alertmanager, GitOps
- **Incident forensics playbook**: 6-dimension (code/service/layer/host/region/infra) localization

### Out of scope (use these external tools instead)
- **OSI L1/L2 physical, IoT firmware, datacenter hardware (IPMI/BMC/SNMP)**: use vendor DCIM tooling (Nlyte, Sunbird, Device42)
- **OSI L5 Session / L6 Presentation full coverage**: TLS kept as security context only (OTel `tls.*` Development); for full TLS observability use Wireshark, Cloudflare Radar, or vendor-specific TLS inspection
- **Chaos Engineering**: Chaos Mesh, Litmus, Gremlin, ChaosToolkit (observability skill consumes their telemetry; does not orchestrate chaos)
- **LLM/AI-specific observability (prompt versioning, eval, gen_ai span deep dive)**: Langfuse, Arize Phoenix, LangSmith, Braintrust; or `claude-api` skill for Anthropic-specific caching/eval patterns
- **Data pipeline lineage (OpenLineage, dbt lineage)**: OpenLineage + Marquez, dbt test, Airflow lineage backends
- **GPU/AI infra (DCGM, nvidia)**: NVIDIA DCGM Exporter + Prometheus, OpenTelemetry GPU semconv (Development)
- **Supply chain observability (SBOM, sigstore, in-toto)**: sigstore (cosign/rekor), in-toto framework, SLSA level attestations
- **Incident response workflow (PagerDuty rotation, OpsGenie)**: PagerDuty, OpsGenie, Grafana OnCall (this skill emits signals; response tooling is separate domain)
- **Fluentd as primary tool**: deprecated by CNCF (2025-10 migration guide), use Fluent Bit or OTel Collector

## Architecture

```
                       User / Other Skill Query
                                 |
                                 v
                   +------------------------------+
                   |      Intent Classifier       |
                   |  (setup|migrate|investigate  |
                   |   |alert|trace|tune|route)   |
                   +------------------------------+
                                 |
                                 v
                   +------------------------------+
                   |      Vendor Router           |
                   +------+-----+-----+-----+----+
                          |     |     |     |
                                 v
                   +----------------------------------+
                   |   Vendor Categories              |
                   |   (not a registry)               |
                   +----------------------------------+
                   Examples by category (as of 2026-Q2,
                   verify via CNCF landscape or oma-search):
                   - OSS Full-Stack:       Grafana LGTM+, Elastic Stack, SigNoz
                   - Commercial SaaS:      Datadog, New Relic, Dynatrace, Sentry, Grafana Cloud
                   - High-Cardinality:     Honeycomb
                   - Profiling Specialist: Parca, Pyroscope, Polar Signals
                   - FinOps / Cost:        OpenCost, Kubecost, CloudZero
                   - SIEM / Enterprise:    Splunk, Elastic Security, Sumo Logic
                   - Feature Flags / Rollout: OpenFeature, Flagger, Argo Rollouts
                   - Log Pipeline:         Fluent Bit, OTel Collector, Vector, Cribl
                   Delegation: category → invoke vendor-specific skill for setup
                                                 
           +-----------------------------------------+
           |     Matrix-based Coverage Selector      |
           |                                         |
           |  4 Layers × 4 Boundaries × 7 Signals    |
           |  (112 cells, N/A markers for invalid)   |
           +-----------------------------------------+
                                 |
                                 v
           +-----------------------------------------+
           |  Transport Depth / Meta-observability   |
           |   UDP, OTLP, collector topology,        |
           |   cardinality guardrails, clock skew    |
           +-----------------------------------------+
                                 |
                                 v
                     Incident Forensics Playbook
                     (6-dim localization: code/service/
                      layer/host/region/infra)
```

### Routes (Intent)

| Intent | Primary target | Fallback |
|--------|---------------|----------|
| `setup` | Vendor SDK/instrumentation skill | Generic OTel semconv |
| `migrate` | Honeycomb Migration / Fluentd→Fluent Bit | OTel bridge |
| `investigate` | `incident-forensics.md` + vendor query | Logs/traces correlation |
| `alert` | SLO burn-rate / vendor alert config | `observability-as-code.md` |
| `trace` | Propagator matrix + cross-application | Service mesh auto-instr |
| `tune` | Transport depth (UDP/OTLP/Collector) | Cardinality guardrails |
| `route` | Multi-tenant / multi-cloud / multi-domain | Residency + sampling per tenant |

### Matrix (4 × 4 × 7)

**Layers (4)**: L3-network, L4-transport, mesh, L7-application  
**Boundaries (4)**: multi-tenant, cross-application, SLO, release  
**Signals (7)**: metrics, logs, traces, profiles, cost, audit, privacy

112 cells total. Matrix file marks impossible combinations as N/A (e.g., L3 × multi-tenant × profile is not meaningful).

## Key Design Decisions

### D1. Router, not a reinventor
Vendor-specific skills (Sentry SDK, Honeycomb OTel, Dash0, Datadog) are already published. oma-observability ROUTES intents to them and FILLS gaps (transport tuning, matrix navigation, incident forensics) they don't cover.

### D2. L3 + L4 + mesh + L7 only
Consciously exclude L1/L2 (SaaS hypervisor hides) and L5/L6 (OTel semconv Development). L3-L7 covers ~90% of real debugging needs. Gaps declared explicitly in SKILL.md.

### D3. Category-first vendor routing (not a vendor registry)

The skill does NOT maintain a vendor registry. Vendor-specific setup is the domain of vendor-owned skills (Sentry SDK, Honeycomb Agent Skills, Dash0 OTel, Datadog Labs, etc.). This skill defines observability vendor CATEGORIES and routes intent to the appropriate category, providing:
- Category traits (what defines this class of tool)
- 2-5 example vendors **with `as-of YYYY-QX` timestamp**
- Feature-comparison micro-matrix per category
- "How to choose" decision criteria
- Delegation target (which existing vendor skill to invoke)

**Why category-first instead of vendor registry**:
1. Vendor names rot (Keptn archived 2025-09, Fluentd deprecated 2025-10, Pyroscope acquired by Grafana 2023)
2. Categories are stable (OSS full-stack / SIEM / profiling specialist, unchanged for years)
3. No duplication with vendor-owned skills that already describe themselves
4. CNCF landscape is the authoritative vendor registry. Link to it, do not copy it.

**Category taxonomy**: OSS full-stack, commercial SaaS unified, high-cardinality specialist, profiling specialist, SIEM / enterprise logs, FinOps / cost, feature flags / progressive delivery, log pipeline, time series storage.

**Deprecated reference**: Fluentd (CNCF 2025-10 migration guide → Fluent Bit / OTel Collector).

### D4. Cost as 1st-class signal (not boundary attribute)
DPE's principled objection preserved. OpenCost is a telemetry source, cost observability is an independent discipline (FinOps). Kept `signals/cost.md` as standalone.

### D5. Audit and Privacy as distinct signals
DSO's principled objection preserved. SOC2 audit (immutable WORM, 7y) and GDPR privacy (redaction, right-to-erasure) have conflicting mutability models. Merging under "compliance" was a suppressed compromise. Two files.

### D6. Profiling as 5th pillar (MELT+P)
OTEP 0239 alpha, but Parca/Pyroscope in production. Marked experimental but first-class.

### D7. Two-tier Collector default (not sidecar)
Verified via OTel docs: DaemonSet agents + Deployment gateway is 2026 standard. Sidecar reserved for AWS Fargate / GCP Cloud Run / strong per-app isolation only.

### D8. Transport-layer depth is the moat
UDP/MTU (1472 IPv4, 1452 IPv6, 8192 UDS, 16K loopback), OTLP gRPC vs HTTP selection, sampling recipes (tail-based with cost-aware), and `routing_connector` (alpha) awareness. No other published skill covers this depth.

### D9. Meta-observability and as-code are non-negotiable
Blind review surfaced these gaps post-consensus. Added `meta-observability.md` (pipeline self-health, clock sync, cardinality, retention matrix) and `observability-as-code.md` (dashboards/alerts/SLO as code, SLO burn-rate alerts).

### D10. Incident forensics playbook is the product
The skill's existence rationale. `incident-forensics.md` provides Minimum Required Attributes (MRA), 6-dimension narrowing flow, vendor query examples, 3 scenario walkthroughs.

## Directory Structure (33 files)

```
oma-observability/
├── SKILL.md                        # Router + out-of-scope + integrations + versioning + "When NOT to use"
├── resources/
│   ├── execution-protocol.md       # 7-step protocol
│   ├── intent-rules.md             # Intent classification
│   ├── standards.md                # OTel/W3C/ISO 25010 + OSI boundary
│   ├── matrix.md                   # 4 Layers × 4 Boundaries × 7 Signals
│   ├── incident-forensics.md       # MRA + 6-dim localization + scenarios
│   ├── meta-observability.md       # Pipeline self-health + clock + cardinality + retention
│   ├── observability-as-code.md    # Grafana Jsonnet + PrometheusRule + SLO YAML + burn-rate
│   ├── vendor-categories.md        # Category taxonomy + example vendors (timestamped) + delegation
│   ├── anti-patterns.md            # 15+ items
│   ├── checklist.md                # Setup validation + Recovery §
│   ├── examples.md                 # Usage walkthroughs
│   │
│   ├── layers/
│   │   ├── L3-network.md           # VPC flow + BGP + PMTUD
│   │   ├── L4-transport.md         # eBPF (Beyla/Pixie) + QUIC/HTTP3
│   │   ├── mesh.md                 # Istio/Linkerd/Envoy zero-code
│   │   └── L7-application/
│   │       ├── web-rum.md          # CWV (INP 2024) + Synthetic § + 3rd-party scripts + client↔server correlation
│   │       ├── mobile-rum.md       # Offline-first queuing + battery + app lifecycle
│   │       └── crash-analytics.md  # CFR + symbolication + release tracking
│   │
│   ├── boundaries/
│   │   ├── multi-tenant.md         # 4-tier isolation + cost attribution ref
│   │   ├── cross-application.md    # 4-layer correlation + propagators + DDD namespaces
│   │   ├── slo.md                  # OpenSLO + Sloth/Pyrra + SLO burn-rate alerts
│   │   └── release.md              # Flagger + Argo Rollouts + OpenFeature + GitOps engines
│   │
│   ├── signals/
│   │   ├── metrics.md              # SLI + healthcheck + OpenCost reference
│   │   ├── logs.md                 # Events as LogRecords + systemd journal
│   │   ├── traces.md               # DB patterns (N+1, pool) + messaging (Kafka/Flink/Spark) + DLQ
│   │   ├── profiles.md             # Parca/Pyroscope/OTEP 0239 (experimental badge)
│   │   ├── cost.md                 # OpenCost + unit economics
│   │   ├── audit.md                # SOC2/ISO + WORM + tamper evidence (hash chain)
│   │   └── privacy.md              # GDPR/PIPA + PII/anonymization/pseudonymization + backend RBAC
│   │
│   └── transport/
│       ├── udp-statsd-mtu.md       # 1472/1452/1432/8192/16K table
│       ├── otlp-grpc-vs-http.md    # Decision tree
│       ├── collector-topology.md   # 2-tier k8s + Fargate/Cloud Run sidecar + container runtime
│       └── sampling-recipes.md     # Tail-based + cost-aware + tenant-aware
```

## Ownership & Quality Gates

| File | Primary owner | Quality gate |
|---|---|---|
| SKILL.md / standards.md / matrix.md | CTO | CTO direct review |
| anti-patterns.md / privacy.md / audit.md | DSO | DSO + CTO co-signed |
| layers/L3, L4 / transport/* | NE + SysE | NE primary |
| layers/mesh / boundaries/release | BE + DevOps | BE primary |
| layers/L7-*, mobile-rum, crash-analytics | FE + ME | FE+ME co-owned |
| boundaries/multi-tenant, slo, cross-application | DevOps + BE | DevOps primary |
| signals/metrics, logs, traces | BE + DevOps | BE primary |
| signals/profiles / meta-observability | SysE | SysE primary |
| signals/cost | DPE + DevOps | DPE primary |
| observability-as-code | DevOps | DevOps primary |
| incident-forensics | DevOps + DSO | DevOps+DSO co-owned |

## Integration with OMA Ecosystem

| Skill | Integration point |
|---|---|
| `oma-debug` | On failure: pull traces + logs by request_id, invoke incident-forensics playbook |
| `oma-qa` | Canary post-deploy loop (chrome-devtools MCP): console errors + CWV trend |
| `oma-tf-infra` | Terraform module for OTel Collector / Grafana / Loki stack |
| `oma-scm` | Deployment SHA → `service.version` attribute + release marker events |
| `oma-backend` | backend.md ruleset references propagator/baggage rules |
| `oma-frontend` | web-rum.md INP/LCP/CLS checklist in frontend rules |
| `oma-mobile` | mobile-rum.md offline-queuing pattern in mobile rules |
| `oma-db` | traces.md DB patterns referenced in database.md ruleset |

## Rollout Plan

### Phase 1a: Core MVP (week 1)
- SKILL.md + standards.md + matrix.md + incident-forensics.md
- vendor-categories.md
- transport/* (all 4)
- meta-observability.md

### Phase 1b: Layer and signal coverage (week 2)
- layers/L3, L4, mesh, L7-* (6 files)
- signals/metrics, logs, traces, profiles, cost, audit, privacy (7 files)

### Phase 1c: Boundaries and operational (week 3)
- boundaries/multi-tenant, cross-application, slo, release (4 files)
- observability-as-code.md
- anti-patterns, checklist, examples, execution-protocol, intent-rules

### Deferred to v1.5
- Vendor migration exit strategy (Honeycomb→Datadog workflows)
- Dev-time local observability
- CI/test observability (may merge into oma-qa)
- HIPAA/PCI DSS specific adaptations
- eBPF security-specific (Tetragon vs Falco)

### Areas intentionally not covered (separate domains)

Not committing to future OMA skills (those are roadmap decisions, not design decisions). These areas use established external tools listed in the "Out of scope" section above:
- LLM ops
- Data pipeline lineage
- Hardware / IoT / datacenter
- Chaos engineering orchestration
- GPU/TPU infrastructure
- Software supply chain
- Incident response workflow

If demand emerges for OMA-native coverage of any, evaluate at that point; do not pre-declare skill names in documentation that users read.

## Verification Log

Verified via primary sources during design:
- [OTel Monitoring Docs](https://code.claude.com/docs/en/monitoring-usage): `CLAUDE_CODE_ENHANCED_TELEMETRY_BETA`, `TRACEPARENT` auto-injection
- [OTel TLS attributes-registry](https://opentelemetry.io/docs/specs/semconv/attributes-registry/tls/): all `tls.*` Development
- [OTel network attributes-registry](https://opentelemetry.io/docs/specs/semconv/attributes-registry/network/): core Stable, `network.connection.*` Development
- [OTel RPC/gRPC semconv](https://opentelemetry.io/docs/specs/semconv/rpc/grpc/): Release Candidate
- [OTel Operator](https://github.com/open-telemetry/opentelemetry-operator): 4 modes, `v1beta1`
- [OTel Kubernetes Collector components](https://opentelemetry.io/docs/platforms/kubernetes/collector/components/): DaemonSet preferred for receivers
- [OTel Baggage API](https://opentelemetry.io/docs/specs/otel/baggage/api/): no PII warning in OTel itself
- [W3C Baggage](https://www.w3.org/TR/baggage/): PII guidance in W3C layer
- [W3C Trace Context L1](https://www.w3.org/TR/trace-context/): Recommendation (2020-02-06)
- [OTel routing_connector](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/connector/routingconnector): alpha
- [AWS X-Ray](https://docs.aws.amazon.com/xray/latest/devguide/xray-concepts.html): `X-Amzn-Trace-Id`
- [GCP Cloud Trace](https://docs.cloud.google.com/trace/docs/trace-context): W3C preferred, legacy `X-Cloud-Trace-Context` supported
- [ISO/IEC 25010:2023](https://www.iso.org/standard/78176.html): no "Observability" characteristic; related: Analysability, Accountability, Faultlessness
- [CNCF projects page](https://www.cncf.io/projects/): Prometheus, Fluentd, Jaeger Graduated; OpenTelemetry, Cortex, Thanos (now Graduated 2024), OpenCost, OpenFeature Incubating; Keptn Archived 2025-09
- [Honeycomb Agent Skills](https://github.com/honeycombio/agent-skill): open-sourced 8+ skills
- [CNCF Fluentd→Fluent Bit migration](https://www.cncf.io/blog/2025/10/01/fluentd-to-fluent-bit-a-migration-guide/): official deprecation path

## Consensus Process Log

- **Round 1**: 9-engineer open brainstorm on scope (L3-L7 + multi-tenant/multi-domain/cross-app). Consensus on 20-file MVP.
- **Round 2**: User challenge (OSI 7-layer question) → reframed as 4-layer + 4-boundary + 7-signal matrix. Grew to 28 files.
- **Round 3**: CNCF landscape audit (user prompt) → added profiles.md (MELT+P) and expanded to 31 files.
- **Round 4**: CTO rigorous review cut to 28, found to be suppressing DSO and DPE principled objections. Restored 30 files.
- **Round 5**: Gap self-audit identified meta-observability and observability-as-code missing. Added to 31-32 files.
- **Round 6**: Incident forensics playbook recognized as skill's raison d'être (32 → 33 files).
- **Round 7 (blind review)**: Independent critique surfaced 17 unique issues (QUIC/HTTP3, DB N+1, backend RBAC, offline mobile queuing, "When NOT to use", versioning, etc.). All resolved as content additions to existing 33 files (no new files).

**Final**: 33 files. Genuine consensus by all 10 stakeholders.

## Anti-patterns (15+)

1. Full prompt/body logging without redaction
2. Missing parent spans
3. Secrets leaking into traces
4. Blocking telemetry emission (app wait)
5. High cardinality labels (`user.id` as metric label)
6. Missing token/cost tracking for LLM calls
7. Absent error context in exception spans
8. Hashing without salt (low-entropy is reversible)
9. Keys/vault in same region as pseudonymized data
10. Claiming "anonymization" for what is pseudonymization (4% GDPR risk)
11. Running sidecar collectors on non-serverless k8s (use DaemonSet)
12. Tail sampling in sidecar (breaks trace completeness)
13. Production dashboards edited in UI (no code, no rollback)
14. BGP hijack / route leak unmonitored with own ASN
15. 3rd-party browser scripts loaded without CSP monitoring
16. PII metric labels (`user.email`, a cardinality + privacy double violation)
17. Missing release markers (cannot correlate deploys to incidents)
18. NTP drift unmonitored (waterfall charts lie)

## Success Criteria

- Skill answers: *"When a 5xx spike happens in ap-northeast-2, can I locate code/service/layer/host/region/infra in under 15 minutes?"* Yes, via `incident-forensics.md` MRA + 6-dim playbook.
- Skill differentiates from: Honeycomb (OTel-depth but Honeycomb-backend biased), Sentry (single-vendor SDK), Dash0 (generic OTel), nexus-labs/agent-observability (AI-agent layer only, WIP).
- Skill fills: transport tuning + meta-observability + observability-as-code + incident forensics.

## Versioning & Deprecation

- Pin OTel spec versions in `standards.md` header (e.g., "OTel spec 1.x, W3C Trace Context L1 Recommendation, L2 CR").
- On spec evolution (Development to Stable transition, attribute deprecation): update `standards.md` + affected files, bump skill minor version.
- Quarterly review cadence driven by OTel spec releases.

---

Design approved. Next: `/plan` to decompose into actionable tasks.
