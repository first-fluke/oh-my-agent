---
name: oma-observability
description: Design or troubleshoot telemetry, SLOs, and incident diagnostics.
  Route to the relevant signal, system boundary, or vendor guide.
---

# Observability Agent - Intent-based Router

## Scheduling

### Goal
Route, design, tune, and review observability work across MELT+P signals, layers, boundaries, vendor categories, transport choices, meta-observability, and incident forensics.

### Intent signature
- User asks for observability, telemetry, OTel, metrics, logs, traces, profiles, SLOs, RUM, APM, incident forensics, trace propagation, transport tuning, or observability-as-code.
- User needs vendor/category routing or observability architecture instead of a single vendor's already-covered setup.

### When to use
- Setting up an observability pipeline (OTel SDK + Collector + vendor backend)
- Designing traceability across service and domain boundaries (W3C propagators, baggage, multi-tenant, multi-cloud)
- Tuning transport layer (UDP/MTU, OTLP gRPC vs HTTP, Collector DaemonSet vs sidecar topology)
- Running incident forensics (6-dimension localization: code / service / layer / host / region / infra)
- Selecting a vendor category (OSS full-stack vs commercial SaaS vs high-cardinality specialist vs profiling specialist)
- Implementing observability-as-code (Grafana Jsonnet dashboards, PrometheusRule CRD, OpenSLO YAML, SLO burn-rate alerts)
- Meta-observability (pipeline self-health, clock skew detection, cardinality guardrails, retention matrix)
- Covering the MELT+P signal set: metrics, logs, traces, profiles (OTEP 0239), cost (OpenCost), audit (SOC2/ISO), privacy (GDPR/PIPA)
- Evaluating log-pipeline migrations against current upstream support and project requirements

### When NOT to use
- LLM ops (prompt versioning, evals, gen_ai span deep dive); use Langfuse, Arize Phoenix, LangSmith, or Braintrust directly
- Data pipeline lineage: use OpenLineage + Marquez, dbt test, or Airflow lineage backends
- IoT / hardware / datacenter physical-layer telemetry (IPMI, BMC, SNMP); use vendor DCIM tooling (Nlyte, Sunbird, Device42)
- Chaos engineering orchestration: use Chaos Mesh, Litmus, Gremlin, or ChaosToolkit (this skill consumes their telemetry; it does not orchestrate chaos)
- GPU / TPU infrastructure observability: use NVIDIA DCGM Exporter + Prometheus
- Software supply chain (SBOM, attestation): use sigstore (cosign / rekor), in-toto framework, SLSA level attestations
- Incident response workflow (on-call rotation, paging, escalation); use PagerDuty, Jira Service Management, or Grafana Cloud IRM
- Full TLS packet inspection: use packet-analysis or vendor TLS inspection tooling
- Security scanning, skill/MCP audits, or penetration testing: use `oma-security` (this skill covers security telemetry only: audit trails, WAF signals, PII redaction)
- Single-vendor setup already fully covered by that vendor's own published skill; invoke the vendor skill directly

### Expected inputs
- Observability intent, target system, architecture boundary, signals, vendor context, and incident symptoms if any
- Existing OTel/collector/vendor configs, dashboards, SLOs, trace/log/metric examples, or deployment topology

### Expected outputs
- Routed observability guidance, setup/migration/tuning plan, incident-forensics path, alerting/SLO guidance, or observability-as-code recommendations
- Transport, meta-observability, privacy, audit, and retention checks
- Vendor delegation target when appropriate

### Dependencies
Load resources conditionally: start with the execution protocol and the one guide the intent route selects. Read only relevant matrix rows, then add a layer, boundary, signal, or transport guide when its trigger in §References is present. No reference is a mandatory preload.

- OTel/W3C/CNCF references and resources under `resources/`
- Vendor categories, matrix, standards, incident forensics, meta-observability, transport, layers, boundaries, and signal guides

### Control-flow features
- Branches by intent, vendor category, layer/boundary/signal matrix, transport topology, privacy/audit risk, and incident localization dimension
- May read/write observability config and docs; generally delegates vendor-specific implementation
- Requires live status verification for load-bearing CNCF/vendor currency

## Structural Flow

### Entry
1. Classify the intent: setup, migrate, investigate, alert, trace, tune, or route.
2. Identify layers, boundaries, signals, and vendor category.
3. Load only the relevant resource guide(s).

### Scenes
1. **PREPARE**: Classify intent and matrix coverage.
2. **ACQUIRE**: Read configs, topology, telemetry examples, or incident signals.
3. **REASON**: Route vendor/category, tune transport, assess meta-observability, or localize incident.
4. **ACT**: Produce setup/migration/tuning/alert/trace/forensics guidance or config changes.
5. **VERIFY**: Check pipeline health, clock skew, cardinality, retention, privacy, and audit concerns.
6. **FINALIZE**: Report route, evidence, risks, and handoff references.

### Transitions
- If a vendor-owned skill fully covers setup, delegate instead of duplicating docs.
- If migration is requested, verify upstream support and compatibility before choosing a replacement.
- If incident investigation is requested, use 6-dimensional localization.
- If transport tuning appears, load the one transport guide that matches the observed problem.

### Failure and recovery
- If live CNCF/vendor status is load-bearing, verify current status.
- If telemetry samples are missing, provide instrumentation/collection steps before analysis.
- If scope belongs to out-of-scope domains, route to external authoritative tools.

### Exit
- Success: observability path is routed, evidence-backed, and checks are explicit.
- Partial success: missing telemetry, stale vendor status, or external-domain handoff is explicit.

## Logical Operations

### Actions
| Action | SSL primitive | Evidence |
|--------|---------------|----------|
| Classify observability intent | `SELECT` | Intent rules |
| Read telemetry/config evidence | `READ` | OTel/vendor configs, dashboards, samples |
| Route vendor/category | `SELECT` | Vendor categories |
| Infer coverage gaps | `INFER` | Matrix and signal/boundary mapping |
| Validate meta-observability | `VALIDATE` | Clock, cardinality, retention, health |
| Write guidance/config | `WRITE` | OaC/config/docs when requested |
| Notify result | `NOTIFY` | Routed recommendation |

### Tools and instruments
- OTel/CNCF/W3C standards references
- Vendor categories, matrix, incident forensics, meta-observability, transport and signal guides
- Optional CLI/config tooling from the target stack

### Canonical workflow path
```text
1. Classify intent: setup, migrate, investigate, alert, trace, tune, or route.
2. Select layer/boundary/signal coverage from `resources/matrix.md`.
3. Load the guide whose trigger in §References matches before producing guidance.
```

When CNCF/vendor status is load-bearing, verify live state at `https://landscape.cncf.io`.

### Resource scope
| Scope | Resource target |
|-------|-----------------|
| `CODEBASE` | Observability config, dashboards, alert rules, instrumentation |
| `LOCAL_FS` | Resource guides and generated docs |
| `NETWORK` | Vendor/CNCF status and telemetry backends when checked |
| `USER_DATA` | Incident symptoms, logs, metrics, traces, profiles |

### Preconditions
- Observability intent and system boundary are identifiable.
- Relevant telemetry/config evidence is available or missing evidence is stated.

### Effects and side effects
- May recommend or modify observability config, dashboards, alerts, and instrumentation docs.
- May route to vendor-owned skills or external tools.

### Guardrails
1. Classify intent and use `resources/vendor-categories.md` only when category selection or vendor delegation is needed.
2. Load the transport guide matching the observed problem: UDP/MTU, OTLP protocol, Collector topology, or sampling.
3. Before declaring a setup complete, verify pipeline health, clock synchronization, cardinality limits, and retention against the project's requirements. Record checks that could not run.
4. Verify current upstream support, attribute stability, and migration guidance when they affect the recommendation. Use official project documentation and CNCF status; stored versions are assumptions, not proof of current status.
5. Use W3C Trace Context by default, with cloud translations from `resources/boundaries/cross-application.md` where required.
6. Apply PII redaction and sampling-aware baggage controls at collection. Check retention, erasure, and audit requirements for the target system.
7. Deliver working configuration or explicitly labeled proposals. Scaffolds and unverified checks cannot count as completed setup.
8. Use existing OMA skill names for cross-skill handoffs; do not present future skills as available.

The coverage matrix has four layers (L3, L4, mesh, L7), four boundaries (multi-tenant, cross-application, SLO, release), and seven signals (metrics, logs, traces, profiles, cost, audit, privacy). Read matching rows in `resources/matrix.md`; N/A cells do not require implementation.

### Routes (Intent)

| Intent | Primary target | Fallback |
|--------|---------------|----------|
| `setup` | `resources/vendor-categories.md` → vendor-owned skill | Generic OTel semconv in `resources/standards.md` |
| `migrate` | Current upstream migration docs + `resources/vendor-categories.md` log-pipeline section | OTel Collector bridge config |
| `investigate` | `resources/incident-forensics.md` (MRA + 6-dim localization) | `resources/signals/traces.md` + `resources/signals/logs.md` |
| `alert` | `resources/boundaries/slo.md` (burn-rate alert rules) | `resources/observability-as-code.md` |
| `trace` | `resources/boundaries/cross-application.md` (propagator matrix) | `resources/layers/mesh.md` (zero-code auto-instrumentation) |
| `tune` | The one guide matching the problem: cardinality or series cost → `resources/meta-observability.md` Section C; telemetry volume → `resources/transport/sampling-recipes.md`; UDP/MTU, OTLP protocol, or Collector topology → the matching `resources/transport/` file | `resources/vendor-categories.md` when the current vendor's pricing model is the cause |
| `route` | `resources/boundaries/multi-tenant.md` + `resources/transport/collector-topology.md` | `resources/boundaries/cross-application.md` (data residency) |

Record the selected intent route, and any vendor category chosen for `setup`, with subject `observability.route-selection` per `references/_shared/runtime/route-selection.md`.

### Invocation and loading
For example: `/oma-observability --investigate "5xx spike in checkout"`.
Other skills pass the intent, system boundary, and evidence; the result returns guidance, checks, and any vendor handoff.

Read `resources/execution-protocol.md` first. Use the selected route above, add guides by the triggers in §References, then check only the applicable checklist sections before delivery. Do not load all transport, layer, boundary, and signal guides together.

### Integrations with OMA Ecosystem

| Skill | Integration point |
|-------|------------------|
| `oma-debug` | Production-failure evidence comes here: pull traces and logs by `trace_id` (resolve it from `request_id` when that is all the reporter has) and run `resources/incident-forensics.md` 6-dimension localization. Reproduction, the fix, and the regression test stay in `oma-debug` |
| `oma-qa` | Supplies review inputs, not the review: Core Web Vitals targets (INP/LCP/CLS) from `resources/layers/L7-application/web-rum.md` and backend latency evidence from `resources/signals/traces.md`. `oma-qa` owns the performance review and verdict |
| `oma-tf-infra` | Writes and reviews the Terraform that provisions Collectors, backends, and IAM. This skill supplies the requirements: topology (`resources/transport/collector-topology.md`), transport choice, retention (`resources/meta-observability.md` Section D), and release metadata. Neither skill ships ready-made observability modules |
| `oma-security` | Source, skill, and MCP scanning and scoped penetration tests. This skill hands over security findings surfaced by telemetry and keeps only the telemetry side: `resources/signals/audit.md`, `resources/layers/L7-application/waf.md`, `resources/signals/privacy.md` |
| `oma-search` | Vendor and upstream documentation lookup (`/oma-search --docs "<vendor> <topic>"`) when no vendor-owned skill is installed, and live CNCF or vendor status checks |
| `oma-scm` | Deployment SHA → `service.version` OTel attribute + release marker events; see `resources/boundaries/release.md` |
| `oma-backend` | Propagator and baggage rules (`resources/boundaries/cross-application.md`); DB N+1 and messaging span patterns in `resources/signals/traces.md` §2–§3. Back-reference: `oma-backend/SKILL.md` §References "Observability handoff" |
| `oma-frontend` | `resources/layers/L7-application/web-rum.md` INP/LCP/CLS checklist. Back-reference: `oma-frontend/SKILL.md` §References "Observability handoff" |
| `oma-mobile` | `resources/layers/L7-application/mobile-rum.md` offline-queuing pattern. Back-reference: `oma-mobile/SKILL.md` §References "Observability handoff" |
| `oma-db` | `resources/signals/traces.md` §2 DB patterns (N+1, connection pool). Back-reference: `oma-db/SKILL.md` §References "Observability handoff" |

### Versioning & Deprecation

- **No per-file version pins**: `resources/standards.md` holds the single statement on spec and semconv currency. Where content depends on an attribute's stability tier, the tier is stated inline; confirm it in the semconv registry when it is load-bearing.
- **Update triggers** (not scheduled):
  - OTel semconv promotion (Development → RC → Stable) affecting attributes cited in this skill → update `resources/standards.md` and the affected file.
  - Attribute deprecation → replace the name across all citing files.
  - CNCF status change for a vendor/project named in `vendor-categories.md` (Graduated / Archived / acquired) → update the vendor table.
- **Authoritative live state**: `https://landscape.cncf.io` for CNCF project status. This skill does not promise to track it on any schedule; verify at use time if the information is load-bearing.

Before delivering observability changes, check the items of `resources/checklist.md` that apply, starting with §1 Setup validation; report checks that were not run.

## References

Each reference loads on its trigger. Paths are relative to the skill root.

| Trigger | Load |
|---------|------|
| Every invocation: flag parsing, intent classification, output shape | `resources/execution-protocol.md` |
| No flag and the intent is not obvious from the request | `resources/intent-rules.md` |
| Deciding which artifact belongs at a layer × boundary × signal, or whether a cell is N/A | `resources/matrix.md` (matching rows only) |
| Attribute naming or stability tier, W3C Trace Context / Baggage rule, OSI scope question, clock synchronization | `resources/standards.md` |
| Choosing a vendor category or a delegation target | `resources/vendor-categories.md` |
| Production incident, root-cause localization, missing forensic attributes | `resources/incident-forensics.md` |
| Collector self-health, clock skew, cardinality budget, retention policy | `resources/meta-observability.md` |
| Dashboards, alert rules, SLOs, or Collector config managed in git; CI validation of rules | `resources/observability-as-code.md` |
| Validating a proposed design against known failure patterns | `resources/anti-patterns.md` (affected category only) |
| Pre-delivery checks | `resources/checklist.md` (applicable sections only) |
| Unfamiliar output shape for a greenfield setup or a log-agent migration | `resources/examples.md` |
| StatsD or UDP drops, MTU, fragmentation | `resources/transport/udp-statsd-mtu.md` |
| OTLP gRPC vs HTTP, proxy or firewall traversal, compression, batch and queue tuning | `resources/transport/otlp-grpc-vs-http.md` |
| Collector deployment mode, agent vs gateway placement, routing fan-out | `resources/transport/collector-topology.md` |
| Head or tail sampling policy, reducing trace volume | `resources/transport/sampling-recipes.md` |
| VPC flow logs, PMTUD black holes, IP-level reachability | `resources/layers/L3-network.md` |
| TCP retransmits or RTT, load-balancer idle timeouts, QUIC, eBPF instrumentation | `resources/layers/L4-transport.md` |
| Istio, Linkerd, or Envoy telemetry; zero-code instrumentation; trace breaks at a proxy | `resources/layers/mesh.md` |
| Browser RUM, Core Web Vitals, source maps, session replay | `resources/layers/L7-application/web-rum.md` |
| Mobile RUM, offline telemetry queue, app start, ANR | `resources/layers/L7-application/mobile-rum.md` |
| Crash-free rate, symbolication, crash grouping, crash-to-release correlation | `resources/layers/L7-application/crash-analytics.md` |
| Edge 403 storm, WAF false positives, ruleset rollout, WAF fail-open or fail-closed | `resources/layers/L7-application/waf.md` |
| Tenant isolation, per-tenant routing or sampling, data residency | `resources/boundaries/multi-tenant.md` |
| Propagators, baggage, cross-cloud or cross-vendor trace continuity, `request_id`, third-party dependency outage | `resources/boundaries/cross-application.md` |
| SLI or SLO definition, error budget, burn-rate alerts | `resources/boundaries/slo.md` |
| Release markers, canary analysis, feature-flag telemetry, GitOps drift | `resources/boundaries/release.md` |
| Metric naming, histogram buckets, exemplars, label design | `resources/signals/metrics.md` |
| Log agent or pipeline choice, structured logging, trace-ID injection into logs | `resources/signals/logs.md` |
| Span design; DB (N+1, connection pool) and messaging span patterns | `resources/signals/traces.md` |
| Continuous profiling, flame graphs, heap or CPU diff across releases | `resources/signals/profiles.md` |
| Cost attribution, OpenCost, FinOps unit economics | `resources/signals/cost.md` |
| Audit trail, compliance evidence, retention schedule, tamper evidence | `resources/signals/audit.md` |
| PII redaction, pseudonymization, cross-border transfer, backend access control | `resources/signals/privacy.md` |