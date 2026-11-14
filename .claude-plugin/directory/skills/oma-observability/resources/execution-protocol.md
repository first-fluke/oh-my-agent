# Observability Agent - Execution Protocol

## Step 0: Parse Query

1. **Extract flags** from the query string:
   - `--setup`, `--migrate`, `--investigate`, `--alert`, `--trace`, `--tune`, `--route`: force specific intent
   - `--strict`: require Stable semconv only; reject Development/Experimental attributes
   - `--multi-tenant`, `--multi-cloud`: force boundary dimension to `multi-tenant`
   - `--layer=L3|L4|mesh|L7`: force specific layer focus
   - `--signal=metrics|logs|traces|profiles|cost|audit|privacy`: force signal focus
2. **Detect intent signals** in the request; consult `resources/intent-rules.md` only when no flag is present and the intent is not obvious
3. **Extract ambient context** from user message or project files:
   - Target platform: k8s, serverless (Lambda/Cloud Run), VM, bare metal
   - Scale tier: single-service, multi-service, multi-region
   - Compliance requirements: SOC2, ISO 27001, GDPR, PIPA
4. **Log** resolved flags and ambient context for transparency

## Step 1: Classify Intent

1. If a flag is present → use that intent directly; skip keyword matching
2. If no flag → classify from the request's signals, using `resources/intent-rules.md` when the intent is not obvious
3. If ambiguous, choose the route best supported by the request; inspect available context before asking for missing information. Do not preload two playbooks by default.
4. **Sparse-context gate**: even when an intent is matched, before proceeding to Step 2 check that ambient context is sufficient for the chosen intent. Minimum required context per intent:
   - `investigate`: service name OR symptom category (error code, metric name) OR time window
   - `setup` / `migrate`: target platform (k8s/serverless/VM) OR language/framework
   - `alert`: SLI target or service name
   - `trace`: at least one boundary hint (service hop, mesh, cloud)
   - `tune`: signal type (metrics/logs/traces) OR problem (cost/cardinality/MTU)
   - `route`: tenant OR region OR cloud axis

   If the minimum is not present, inspect available project context first. Ask only for information that affects the next decision and cannot be recovered locally; continue independent inspection while waiting, following the shared execution policy.
5. Log selected intent and whether selection was `flag` or `auto`, plus any clarification requested

Intent vocabulary:

| Intent | Meaning |
|--------|---------|
| `setup` | First-time instrumentation or pipeline deployment |
| `migrate` | Moving from a deprecated or legacy tool |
| `investigate` | Incident analysis or anomaly root-cause |
| `alert` | SLO burn-rate or threshold alert authoring |
| `trace` | Distributed trace propagation and context design |
| `tune` | Transport, cardinality, sampling, or collector optimization |
| `route` | Signal routing, tenant isolation, or topology design |

## Step 2: Matrix Navigation

1. Based on (intent × layer × boundary × signal), identify relevant cells in `resources/matrix.md`
2. Select one primary intent guide and only the relevant rows or sections for matching `PASS` or `PARTIAL` cells. These describe documentation coverage, not successful verification of the target system.
3. Flag any N/A cells the user is asking about; redirect to an alternative dimension rather than producing a stub answer
4. Record the active (layer, boundary, signal) triple for use in Step 6 output header

## Step 3: Route Dispatch

Dispatch by intent using the route table in `SKILL.md` §Routes (Intent), then apply the intent-specific detail below. Add layer, boundary, signal, and transport guides by the triggers in `SKILL.md` §References.

### setup intent
- Consult `resources/vendor-categories.md`: select category based on constraints (OSS vs commercial, high-cardinality, FinOps, profiling)
- Delegate to a vendor-owned skill when one is installed; see `resources/vendor-categories.md §How to Delegate`
- If no matching vendor skill is installed → guide user to `/oma-search --docs` for vendor documentation

### migrate intent
- Fluentd as source → verify current upstream support and plugin compatibility; compare Fluent Bit and OTel Collector only against the requested migration requirements
- Legacy APM as source → provide OTel bridge config patterns; reference `resources/vendor-categories.md §(h)`

### investigate intent
- Invoke `resources/incident-forensics.md` full playbook (MRA + 6-dimension narrowing: code / service / layer / host / region / infra)
- Cross-reference signal files based on symptom category (latency, error rate, saturation, data loss)

### alert intent
- Use `resources/boundaries/slo.md` for burn-rate calculation and multi-window alert rules
- Use `resources/observability-as-code.md` for PrometheusRule packaging, CI validation, and rule tests

### trace intent
- Use `resources/boundaries/cross-application.md` for W3C Trace Context propagator matrix across cloud providers
- Use `resources/layers/mesh.md` for zero-code auto-instrumentation via service mesh

### tune intent
Load the one guide that matches the observed problem; do not load the transport directory as a set.
- Metric cardinality, series count, or a metrics bill driven by labels → `resources/meta-observability.md` Section C
- Trace volume or sampling policy → `resources/transport/sampling-recipes.md`
- UDP payload size, fragmentation, StatsD drops → `resources/transport/udp-statsd-mtu.md`
- OTLP protocol selection, proxy or firewall constraints, batch and queue tuning → `resources/transport/otlp-grpc-vs-http.md`
- DaemonSet vs sidecar vs gateway placement → `resources/transport/collector-topology.md`
- Cost attribution by tenant, namespace, or workload → `resources/signals/cost.md`

### route intent
- `resources/boundaries/multi-tenant.md`: tenant isolation strategies (attribute-based, pipeline-based, storage-based)
- `resources/transport/collector-topology.md`: routing topology for signal fan-out and load balancing

## Step 4: Collect Reference Material

1. Load the primary guide selected in Step 3. Add a transport, boundary, or signal section only when a concrete question requires it; do not read the reference set wholesale
2. Verify current official project documentation and CNCF status yourself when support or maturity affects the decision. Do not treat an old timestamp or version pin as proof of current status
3. For commercial vendor references, check whether a vendor-owned skill is installed locally before suggesting manual setup

## Step 5: Validate Against Constraints

1. Consult the relevant category in `resources/anti-patterns.md` when validating the proposed design; do not preload the full catalog
2. Consult only the applicable sections of `resources/checklist.md`; report executed checks separately from proposed checks
3. For setup, configuration changes, or label/cardinality design, use the relevant preview in `resources/meta-observability.md` and flag unbounded dimensions. For investigation or routing, load it only when pipeline health or cardinality is implicated
4. If `--strict` flag is set → reject any semconv attribute in Development or Experimental stability tier; cite stable alternative
5. If PII is involved → apply `resources/signals/privacy.md` redaction and sampling-aware baggage rules at collection, not only at storage
6. If `--multi-tenant` or `--multi-cloud` → apply `resources/boundaries/multi-tenant.md` isolation rules; verify data residency is explicit

## Step 6: Present

Format output as:

```
Intent: {intent}  Mode: {auto|flag}
Layer:  {L3|L4|mesh|L7}    Boundary: {multi-tenant|cross-application|slo|release}    Signal: {metrics|logs|traces|profiles|cost|audit|privacy}

Primary recommendation:
  - {file:section} — {1-line rationale}

Secondary considerations:
  - {file:section} — {caveat or anti-pattern hit}

Delegation target:
  - {vendor-owned skill name, or /oma-search command}

Checklist items to verify:
  - [ ] {item from checklist.md}
  - [ ] {item}
```

Example output for "setup OTel stack on k8s":

```
Intent: setup  Mode: auto
Layer: L7 + mesh    Boundary: cross-application    Signal: metrics + logs + traces

Primary recommendation:
  - resources/transport/collector-topology.md §Two-tier hybrid — DaemonSet + Deployment gateway
  - resources/vendor-categories.md §(a) OSS Full-Stack — Grafana LGTM+

Secondary considerations:
  - resources/transport/sampling-recipes.md §Tail-based — consistent routing via loadbalancing exporter
  - resources/anti-patterns.md §C — avoid sidecar as default on k8s; use DaemonSet

Delegation target:
  - No single vendor skill (OSS self-host); use oma-tf-infra for Terraform + /oma-search for component docs

Checklist items to verify:
  - [ ] memory_limiter processor placed before batch processor in pipeline
  - [ ] NTP synced on all nodes (< 100 ms drift)
  - [ ] cardinality budget set per service before enabling high-cardinality labels
  - [ ] Source support and plugin compatibility checked before selecting a migration path
```

## On Error

See `resources/checklist.md §7 Recovery` for recovery steps.
