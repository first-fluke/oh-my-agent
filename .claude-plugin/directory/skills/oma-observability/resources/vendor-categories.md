# Observability Vendor Categories

> Example vendor rows are snapshots, not a registry. Verify project and vendor status at <https://landscape.cncf.io> before a selection depends on it.

This file is a **category taxonomy with example vendors**. Categories ("OSS full-stack", "SIEM", "profiling specialist") stay coherent for years; the vendors filling them change through acquisitions, archivals, and CNCF status moves. Use the category to frame the decision and the delegation target to get current setup detail; do not copy vendor documentation into this skill.

---

## Category Taxonomy

### (a) OSS Full-Stack

**Traits:** Self-hostable, covers metrics + logs + traces in one coherent stack, often includes UI, storage, and agents. No per-seat licensing. Operational burden is on the team.

**Example vendors**:

| Vendor | Metrics | Logs | Traces | Profiles | UI | Notes |
|--------|---------|------|--------|----------|----|-------|
| Grafana Labs LGTM+ | Mimir | Loki | Tempo | Pyroscope | Grafana | Alloy collector, Beyla eBPF auto-instr, Faro RUM, k6 load |
| Elastic Stack (ELK) | Yes | Elasticsearch | APM | No | Kibana | Mature; storage costs at scale |
| SigNoz | Yes | Yes | Yes | No | Yes | OTel-native from day 1; ClickHouse backend |
| OpenObserve | Yes | Yes | Yes | No | Yes | Rust-based; lower storage footprint claim |

**How to choose:**
- Already using Grafana dashboards → Grafana LGTM+
- Need full-text log search maturity → Elastic Stack
- Want OTel-native with no legacy shim → SigNoz
- Cost-sensitive storage + small team → OpenObserve or SigNoz

**Delegation target:** For Grafana stack setup, use `/oma-search --docs "Grafana LGTM+ OTel Collector setup"`. For Elastic, use Elastic documentation directly. No single vendor-owned skill covers the full OSS stack; delegate to `oma-search` unless a specific component skill is installed.

---

### (b) Commercial SaaS Unified APM

**Traits:** Managed SaaS; covers metrics, logs, traces, and often RUM/synthetics/profiling in one product. Per-host or per-ingestion pricing. Reduced operational burden; vendor lock-in risk.

**Example vendors**:

| Vendor | Metrics | Logs | Traces | Profiles | RUM | Notes |
|--------|---------|------|--------|----------|-----|-------|
| Datadog | Yes | Yes | Yes | Yes | Yes | Broadest feature surface; highest cost at scale |
| New Relic | Yes | Yes | Yes | Yes | Yes | Usage-based pricing; OTel-native ingest |
| Dynatrace | Yes | Yes | Yes | Yes | Yes | AI-driven auto-discovery; OneAgent proprietary |
| Sentry | Partial | Yes | Yes | No | Yes | Error-first; strong release tracking |
| Grafana Cloud | Yes | Yes | Yes | Yes | Faro | Managed LGTM+; per-signal pricing |

**How to choose:**
- Maximum feature coverage, budget flexible → Datadog
- OTel-native ingest preferred, usage pricing → New Relic
- Auto-discovery in complex microservice env → Dynatrace
- Error tracking + release correlation primary need → Sentry
- Prefer OSS tools managed → Grafana Cloud

**Delegation target:** a vendor-owned skill when installed (see How to Delegate); otherwise `/oma-search --docs "{vendor} OTel integration setup"`.

---

### (c) High-Cardinality Specialist

**Traits:** Purpose-built for high-cardinality event-based observability. Avoids pre-aggregation. Enables arbitrary dimension slicing at query time. Dynamic sampling to control cost.

**Example vendors**:

| Vendor | Approach | Key features | Notes |
|--------|----------|-------------|-------|
| Honeycomb | Event-first, columnar | BubbleUp root-cause, dynamic sampling, Query Builder | OTel-native; no metrics tier (use separate tool) |

**How to choose:**
- Cardinality explosion on Prometheus/Datadog metrics → Honeycomb for traces/events
- Need to slice by any arbitrary field post-hoc → Honeycomb
- Metrics + high-cardinality in one product → pair Honeycomb with a TSDB (category i)

**Delegation target:** the Honeycomb skills from `honeycombio/agent-skill` when installed; otherwise `/oma-search --docs "Honeycomb OTel setup"`.

---

### (d) Profiling Specialist

**Traits:** Continuous profiling (CPU, memory, goroutine, heap). Always-on, low-overhead. pprof or OTel profiling (OTEP 0239, Development) as wire format. MELT+P fifth pillar.

**Example vendors**:

| Vendor | Governance | Backend | Notes |
|--------|------------|---------|-------|
| Parca | Open source (Polar Signals); not a CNCF project | FrostDB (embedded columnar, Parquet-based) | eBPF agent; pprof-compatible |
| Grafana Pyroscope | Open source (Grafana Labs); not a CNCF project | Object storage | Integrated into Grafana LGTM+ |
| Polar Signals Cloud | Commercial | Managed | Managed Parca |

**How to choose:**
- Full OSS control → Parca
- Already on Grafana LGTM+ → Grafana Pyroscope (co-located storage)
- Managed + enterprise support → Polar Signals Cloud

**Delegation target:** `/oma-search --docs "Parca OTel profiling setup"` or `/oma-search --docs "Grafana Pyroscope integration"`.

---

### (e) SIEM / Enterprise Logs

**Traits:** Security information and event management. Compliance-grade log retention, correlation rules, threat detection, alerting. Often WORM / immutable storage. Targets SOC2 / ISO 27001 audit requirements.

**Example vendors**:

| Vendor | Log ingest | Threat detection | Compliance | Notes |
|--------|-----------|-----------------|-----------|-------|
| Splunk | Yes | Yes | Yes | Market leader; high licensing cost |
| Elastic Security | Yes | Yes | Yes | Elastic Stack + SIEM rules; lower cost than Splunk |
| Sumo Logic | Yes | Yes | Yes | Cloud-native; per-GB pricing |
| Datadog Cloud SIEM | Yes | Yes | Partial | Add-on to Datadog unified APM |

**How to choose:**
- Enterprise compliance, existing Splunk investment → Splunk
- Cost-sensitive, already on Elastic → Elastic Security
- Cloud-native, no on-prem requirement → Sumo Logic
- Already on Datadog, want unified → Datadog Cloud SIEM

**Delegation target:** `/oma-search --docs "{vendor} SIEM log pipeline setup"`. For audit-specific requirements see `signals/audit.md` in this skill.

---

### (f) FinOps / Cost Observability

**Traits:** Kubernetes / cloud cost visibility, unit economics, per-tenant / per-namespace attribution. Cost is a first-class observability signal, not a boundary attribute. Distinct from APM cost-of-ownership analysis.

**Example vendors**:

| Vendor | CNCF status | K8s cost | Cloud cost | Notes |
|--------|------------|---------|-----------|-------|
| OpenCost | CNCF Incubating | Yes | AWS/GCP/Azure | Open spec + OSS implementation; Prometheus-native |
| Kubecost | Commercial (OpenCost-based) | Yes | Yes | Adds multi-cluster, RBAC, Slack alerts |
| CloudZero | Commercial SaaS | Partial | Yes | Business-unit cost allocation focus |

**How to choose:**
- OSS, Prometheus-integrated, per-namespace attribution → OpenCost
- Multi-cluster + enterprise reporting → Kubecost
- Cloud bill decomposed by product team → CloudZero

**Delegation target:** `/oma-search --docs "OpenCost Prometheus integration"`. For cost signal context see `signals/cost.md` in this skill.

---

### (g) Feature Flags / Progressive Delivery

**Traits:** Controlled rollout of features to subsets of users or traffic. Release observability; correlate flag states with error rates and latency. GitOps-integrated progressive delivery.

**Example vendors**:

| Vendor | CNCF status | Flag eval | Progressive delivery | Notes |
|--------|------------|---------|---------------------|-------|
| OpenFeature | CNCF Incubating | Yes (SDK standard) | No | Standardizes flag SDK; vendor-agnostic |
| Flagger | CNCF Graduated (Flux project) | No | Yes (canary/A-B/blue-green) | Prometheus/Datadog metric gating |
| Argo Rollouts | CNCF Graduated (Argo project) | No | Yes (canary/blue-green) | Kubernetes CRD; integrates with analysis templates |
| LaunchDarkly | Commercial | Yes | Partial | Mature commercial flag platform |
| Unleash | OSS + Commercial | Yes | No | Self-hostable flag platform |

**How to choose:**
- Standardize flag SDK across vendors → OpenFeature (pair with LaunchDarkly or Unleash as backend)
- Automated canary promotion with metric gates → Flagger or Argo Rollouts
- Per-tenant progressive rollout (feature flags) → LaunchDarkly or Unleash
- GitOps-native canary on Kubernetes → Flagger (Flux / Helm native)

**Delegation target:** `/oma-search --docs "OpenFeature SDK {runtime} setup"` or `/oma-search --docs "Flagger canary analysis Prometheus"`. For release boundary observability see `boundaries/release.md` in this skill.

---

### (h) Log Pipeline / Collection

**Traits:** High-throughput log and event collection, transformation, routing, and forwarding. Runs as DaemonSet agents (preferred) or standalone pipeline. OTel Collector is the default for new OTel-native deployments.

**Fluentd note:** CNCF lists Fluentd as Graduated. Choose migration from workload requirements, resource use, and plugin support, not a deprecation claim. The CNCF Fluentd-to-Fluent Bit migration guide states that Fluentd and Fluent Bit configuration syntax differs substantially; validate converted plugins/routes before cutover. Sources: <https://www.cncf.io/projects/fluentd/> and <https://www.cncf.io/blog/2025/10/01/fluentd-to-fluent-bit-a-migration-guide/>.

**Example vendors**:

| Vendor | CNCF status | Protocol support | Transform | Notes |
|--------|------------|----------------|---------|-------|
| Fluent Bit | CNCF Graduated (Fluentd project) | Multiple | Lua / built-in | C, low memory; not config-compatible with Fluentd |
| OpenTelemetry Collector | CNCF Graduated | OTLP + many | processors | OTel-native; recommended for new deployments |
| Vector (Datadog OSS) | Non-CNCF | Multiple | VRL | Rust; high throughput; Datadog-backed |
| Cribl Stream | Commercial | Multiple | Yes | Enterprise routing + data shaping |

**How to choose:**
- Migrating from Fluentd → compare Fluent Bit plugin/route support; convert configuration and validate in parallel (not a drop-in config replacement)
- New OTel-native deployment → OpenTelemetry Collector
- High-throughput with Rust reliability → Vector
- Enterprise data routing with UI + compliance → Cribl Stream

**Delegation target:** `/oma-search --docs "Fluent Bit Kubernetes DaemonSet setup"` or `/oma-search --docs "OTel Collector configuration {backend}"`. For collector topology guidance see `transport/collector-topology.md` in this skill.

---

### (i) Time Series Storage / Long-term Metrics

**Traits:** Purpose-built for metrics storage at scale. Prometheus-compatible query (PromQL). Long-term retention beyond Prometheus 15-day default. HA + multi-tenancy for production.

**Example vendors**:

| Vendor | CNCF status | Multi-tenant | Object storage | Notes |
|--------|------------|------------|---------------|-------|
| Prometheus | CNCF Graduated | No (single-tenant) | No | Standard scrape source; 15d retention default |
| Thanos | CNCF Incubating | Yes | Yes (S3/GCS/Azure) | Sidecar or receive mode; global query view |
| Cortex | CNCF Incubating | Yes | Yes | Horizontally scalable; more complex ops |
| Grafana Mimir | Non-CNCF (Grafana OSS) | Yes | Yes | Evolved from Cortex; simpler ops |
| VictoriaMetrics | Non-CNCF (OSS + Commercial) | Cluster edition | Yes | High compression; low resource usage |
| InfluxDB | Non-CNCF (Commercial OSS) | Yes (Cloud) | Yes | Line protocol; IOx rewrite in Rust |

**How to choose:**
- Starting fresh, Kubernetes, team familiar with Grafana → Grafana Mimir
- Need CNCF Graduated status for procurement → verify an eligible project with CNCF; Thanos is Incubating and does not meet a Graduated-only requirement
- Multi-tenant with complex federation needs → Cortex
- Resource-constrained or high compression priority → VictoriaMetrics
- Time-series with SQL query surface needed → InfluxDB IOx

**Delegation target:** `/oma-search --docs "Thanos sidecar Prometheus setup"` or `/oma-search --docs "Grafana Mimir distributed mode"`.

---

### (j) Crash Analytics (Mobile-Heavy)

**Traits:** Symbolication of native crash stacks. Crash-free rate (CFR) tracking. Release-correlated crash trends. ANR (Application Not Responding) detection. Mobile session replay context.

**Example vendors**:

| Vendor | iOS | Android | Web | Notes |
|--------|-----|---------|-----|-------|
| Firebase Crashlytics | Yes | Yes | No | Free; Google ecosystem; dSYM auto-upload |
| Sentry | Yes | Yes | Yes | Cross-platform; OTel trace correlation |
| SmartBear Insight Hub (Bugsnag) | Yes | Yes | Yes | Strong breadcrumb API; error grouping and noise reduction |
| Embrace | Yes | Yes | No | Mobile-first; session replay; network body capture |
| Datadog Error Tracking | Yes | Yes | Yes | Unified with Datadog APM |

**How to choose:**
- Mobile-only, budget zero → Firebase Crashlytics
- Cross-platform (mobile + web + backend) correlation → Sentry
- Mobile session replay + user journey → Embrace
- Already on Datadog APM → Datadog Error Tracking
- Need noise reduction + grouping quality → SmartBear Insight Hub

**Delegation target:** the Sentry `sentry-sdk-setup` skill when installed. For others: `/oma-search --docs "{vendor} iOS/Android crash reporting setup"`. For crash analytics context see `layers/L7-application/crash-analytics.md` in this skill.

---

## Intent to Category Routing

| User intent | Primary categories | Notes |
|------------|-------------------|-------|
| Setup full-stack OSS monitoring | (a) OSS Full-Stack, (h) Log Pipeline, (i) TSDB, (d) Profiling | Start with (a); (h)+(i)+(d) fill gaps |
| Setup commercial managed APM | (b) Commercial SaaS Unified APM | Select vendor by criteria in (b) |
| Migrate off Fluentd | (h) Log Pipeline | Compare Fluent Bit and OTel Collector against plugin and route requirements; neither is a drop-in replacement |
| High-cardinality trace investigation | (c) High-Cardinality Specialist | Honeycomb + dynamic sampling |
| FinOps cost attribution program | (f) FinOps / Cost Observability | OpenCost + `signals/cost.md` |
| Per-tenant progressive rollout | (g) Feature Flags / Progressive Delivery | OpenFeature SDK + Flagger or Argo Rollouts |
| Mobile crash rate SLO | (j) Crash Analytics | Pair with (b) or (a) for backend traces |
| Long-term metric retention | (i) TSDB | Thanos or Mimir on top of Prometheus |
| Continuous profiling (MELT+P) | (d) Profiling Specialist | Parca (OSS) or Pyroscope (Grafana) |
| SIEM / SOC2 audit log compliance | (e) SIEM / Enterprise Logs | See `signals/audit.md` for integrity and retention requirements |

---

## How to Delegate

### When a vendor-specific skill is installed

Invoke the vendor's skill directly instead of reproducing its guidance. Check which skills the current host has installed; vendor skill names and contents change, so confirm before delegating. Published examples:

| Skill | Source | Coverage |
|-------|--------|----------|
| `sentry-sdk-setup` | `getsentry/sentry-for-ai` | Routes to Sentry's per-platform SDK setup skills |
| Honeycomb skills | `honeycombio/agent-skill` | OTel instrumentation, query patterns, SLOs and triggers, production investigation |

### When no vendor-specific skill is installed

Route to the `oma-search` skill with vendor + observability context (a skill route, not a shell command):

- `/oma-search --docs "{vendor} observability setup"`
- `/oma-search --docs "{vendor} OTel integration {runtime}"`
- `/oma-search --docs "{vendor} {signal} configuration"`

Examples:
- `/oma-search --docs "Grafana Mimir Prometheus remote_write setup"`
- `/oma-search --docs "OpenCost Kubernetes namespace cost attribution"`
- `/oma-search --docs "Fluent Bit Kubernetes DaemonSet migration from Fluentd"`
- `/oma-search --docs "Parca continuous profiling Go gRPC"`

### CNCF landscape as canonical vendor source

For current CNCF project status or whether a project is still maintained, check <https://landscape.cncf.io> directly or through `/oma-search --docs "site:landscape.cncf.io {category or vendor}"`.
