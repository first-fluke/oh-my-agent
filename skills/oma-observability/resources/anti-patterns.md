# oma-observability Anti-Patterns

> Consolidated catalog of patterns that break observability/traceability.
> Each entry: pattern name, why-it-fails, remediation, severity.

## Severity legend

- **CRITICAL**: security breach / compliance violation / production data loss
- **HIGH**: blocks on-call ability to resolve incidents
- **MEDIUM**: degrades observability quality / cost / maintainability
- **LOW**: style or minor optimization

---

## A: Privacy & Sensitive Data

### A.1 Claiming "anonymization" for pseudonymized data

**Severity**: CRITICAL
**Why it fails**: Pseudonymized data (re-identifiable with a key or other reasonably available means) is still personal data under GDPR Article 4(1). Misclassifying it as anonymous data leads to non-compliant retention periods, missing erasure obligations, and exposes the organization to 4% global-turnover fines.
**Remediation**: Apply the identification assessment from `signals/privacy.md §3`: can a person reasonably be identified, linked, or singled out using this data and other available information? If yes, or if the assessment is unresolved, treat the data as personal data. Being unable to recover the original value does not by itself establish anonymity. Update your ROPA and re-classify accordingly.
**See also**: `signals/privacy.md §3 Anonymization vs Pseudonymization vs Tokenization`

### A.2 OTel Collector `hash` action on low-entropy user IDs

**Severity**: CRITICAL
**Why it fails**: The Collector's built-in `hash` action applies SHA-256 without a salt. Numeric user IDs (e.g., 6-digit codes) are reversible via rainbow tables, making the pseudonymization ineffective and constituting a GDPR breach.
**Remediation**: Perform HMAC-SHA256 with a vault-managed key at the SDK layer before emitting spans. Hold the key in a vault with access control independent of telemetry access (GDPR Art. 32 requires risk-appropriate security; it does not mandate a separate region). Rotate on a defined schedule.
**See also**: `signals/privacy.md §8 Salted Hashing Caveats`

### A.3 Baggage carrying PII across trust boundaries

**Severity**: CRITICAL
**Why it fails**: W3C Baggage propagates to every downstream service, including external partners. Placing `user.email`, session tokens, or credentials in baggage violates W3C Baggage §Security and GDPR Article 5(1)(c) minimization, leaking PII to untrusted collectors.
**Remediation**: Apply a baggage allowlist at every trust boundary. Internally allowed keys: `tenant.id`, `feature.variant`, `deployment.sha`, `region.hint`. At egress to an external or third-party endpoint, strip `tenant.*` as well unless the receiver is explicitly allowlisted; a tenant identifier reveals that a customer account exists.
**See also**: `boundaries/cross-application.md §4`, `boundaries/multi-tenant.md §4 Tenant ID Propagation`, `signals/privacy.md §4`

### A.4 PII in crash stack traces without redaction filter

**Severity**: CRITICAL
**Why it fails**: Exception messages frequently capture SQL queries, HTTP headers, and URL query strings verbatim, exposing `user.email`, `Authorization` tokens, card numbers, and passwords in vendor SaaS storage; a GDPR and PIPA breach.
**Remediation**: Implement a `beforeSend` / `before_send` allowlist hook in your crash SDK. Strip `Authorization`, `Cookie`, and any regex-matching email/card patterns before the crash report is serialized. Do not rely on server-side redaction alone.
**See also**: `layers/L7-application/crash-analytics.md §8 Privacy and PII`, `signals/privacy.md §7 SDK-Layer Redaction`

### A.5 Raw IP addresses retained without redaction

**Severity**: CRITICAL
**Why it fails**: IP addresses linked to natural persons are personal data under GDPR Article 4(1) and PIPA. Storing raw `srcaddr` / `client.address` in long-retention backends violates the data minimization principle (GDPR Art. 5(1)(c)) and is grounds for regulatory action.
**Remediation**: Truncate the last IPv4 octet (e.g., `203.0.113.0`) or apply rotating-salt SHA-256 pseudonymization at pipeline ingestion. Never store raw IPs beyond the 7-day raw retention tier.
**See also**: `signals/privacy.md §5 PII Handling Rules`, `layers/L3-network.md §3.3 Privacy Note`

### A.6 `db.query.text` with untrimmed PII

**Severity**: CRITICAL
**Why it fails**: SQL query text in `db.query.text` span attributes frequently contains `WHERE email = 'user@example.com'` or `WHERE ssn = '...'`. These surface verbatim in trace backends, violating GDPR minimization and leaking credentials.
**Remediation**: Use the OTel Collector `redaction` processor with an allowlist; block free-text query content unless it matches safe patterns. Apply SQL parameterization at the SDK layer so user data never enters query text.
**See also**: `signals/privacy.md §6 OTel Collector Processors`, `signals/traces.md`

### A.7 Observability backend open to all engineers (no RBAC)

**Severity**: HIGH
**Why it fails**: Production traces and logs containing even pseudonymized user data are sensitive. Unrestricted access violates the principle of least privilege, increases PII exposure risk, and fails SOC 2 CC7.2 and ISO/IEC 27001 A.8.15 access controls.
**Remediation**: Implement role-scoped access: on-call engineers see own-service traces (24h); security analysts see all services (30d); auditors get read-only audit index. Use Grafana folder permissions or Datadog Teams scopes.
**See also**: `signals/privacy.md §11`

### A.8 Routing telemetry to 3rd-party vendor without DPA

**Severity**: HIGH
**Why it fails**: Observability vendors receiving personal data are data processors under GDPR Article 28. Routing data before signing a Data Processing Agreement is a direct GDPR violation.
**Remediation**: Block data flows to Datadog, Sentry, Grafana Cloud, Honeycomb, New Relic, or Elastic Cloud until a DPA is signed. Confirm storage region matches your compliance obligations. Reference the legal team's approved vendor list.
**See also**: `signals/privacy.md §12 Third-Party Processor Obligations`

### A.9 Session replay without client-side PII masking

**Severity**: HIGH
**Why it fails**: Session replay captures DOM mutations including `<input>` fields. Without SDK-level masking, email addresses, credit card numbers, and passwords are captured in replay payloads before reaching the vendor; a GDPR Article 6 consent violation.
**Remediation**: Enable input masking in the SDK config (Sentry, Datadog both support this). Wire replay consent to the cookie consent flow. Test via automated replay review that sensitive fields are masked.
**See also**: `layers/L7-application/web-rum.md §7 Session Replay`, `signals/privacy.md §5`

### A.10 Unencrypted telemetry queue on mobile device

**Severity**: HIGH
**Why it fails**: Mobile telemetry queued to disk is PII at rest on user devices. If the device is lost, compromised, or forensically examined, unencrypted queue files expose personal data; violating GDPR Art. 32 and PIPA Art. 29 safety measures.
**Remediation**: Encrypt the queue using platform-native key storage: iOS Keychain, Android Keystore. Apply field-level redaction before write, not before send.
**See also**: `layers/L7-application/mobile-rum.md §3 Offline-First Telemetry Queuing`

### A.11 Cross-region telemetry routing without GDPR mechanism

**Severity**: HIGH
**Why it fails**: GDPR Chapter V prohibits transfer of personal data to non-adequate countries without Standard Contractual Clauses or an adequacy decision. Routing EU telemetry through a US-hosted collector without SCC in place is a direct violation.
**Remediation**: Implement routing connector per `signals/privacy.md §10`: route EU traffic to EU-region backend, KR traffic to KR-region backend. Confirm SCC or adequacy decision with legal before routing.
**See also**: `signals/privacy.md §10 Cross-Border Transfer`, `transport/collector-topology.md §7`

### A.12 `tenant.region` trusted from client-supplied input

**Severity**: CRITICAL
**Why it fails**: If residency routing reads `tenant.region` from a header, baggage entry, query string, or client-controlled JWT claim, a misconfigured or malicious tenant can self-declare another region and bypass residency routing.
**Remediation**: Resolve `tenant.region` from a server-side authoritative source (tenant registry, organization metadata, IdP claim stamped at session start) keyed on `tenant.id`. At the ingress gateway, strip any inbound `tenant.region` and re-attach the registry value before the Collector pipeline accepts the signal.
**See also**: `boundaries/multi-tenant.md §8 Data Residency`

### A.13 Personal data written to locked audit storage without minimization

**Severity**: HIGH
**Why it fails**: Records in a locked (WORM) store cannot be erased until the lock expires. Plain emails, raw IPs, or free-text fields in audit events turn every erasure request into a retention exception that must be documented and defended.
**Remediation**: Pseudonymize `user.id` before write, decide `ip.address` handling per the privacy rules, and keep free-text fields out of audit events. Record the legal basis and erasure exceptions with the retention schedule.
**See also**: `signals/audit.md §4 Required Attributes per Audit Event`, `signals/privacy.md §9`

### A.14 Raw request body captured on error traces

**Severity**: HIGH
**Why it fails**: Request bodies frequently contain credentials and personal data; capturing them on error spans or events stores that data in the trace backend.
**Remediation**: Drop request bodies by default. Allowlist specific non-sensitive fields at the SDK layer.
**See also**: `signals/privacy.md §5 PII Handling Rules by Field`, `signals/privacy.md §7`

### A.15 Pseudonymization key reachable with the same permissions as telemetry

**Severity**: HIGH
**Why it fails**: If one access grant reaches both the HMAC key or token vault and the telemetry store, a single compromise re-identifies every pseudonymized record.
**Remediation**: Hold keys in a separately access-controlled vault with its own audit trail. Choose geographic separation from the threat model and residency policy; it is not mandated by GDPR Art. 32.
**See also**: `signals/privacy.md §3`, `signals/privacy.md §8 Salted Hashing Caveats`

---

## B: Cardinality & Cost

### B.1 `user.id` as metric label

**Severity**: CRITICAL
**Why it fails**: Creates one TSDB time series per user. For a service with 1M users, this is 1M series; instant storage explosion, query latency degradation, and SaaS vendor bill spike. Additionally, user IDs are PII under GDPR Art. 4(1).
**Remediation**: Replace with `user.tier`, `user.cohort`, or aggregated bucket labels. Never use any unbounded identifier as a metric label. Enforce via OTel SDK View attribute allow-list.
**See also**: `signals/metrics.md §6 Cardinality and Tenant Labels`, `meta-observability.md` Section C

### B.2 New metric name per tenant

**Severity**: HIGH
**Why it fails**: Creating `http_requests_total_tenant_acme` for each tenant bypasses TSDB cardinality controls entirely and cannot be aggregated across tenants. It also disables cardinality budget alerting.
**Remediation**: Use `http_requests_total{tenant_id="acme"}` with a top-N cap (≤ 1000 explicit tenants). Map overflow to label value `"other"`. Apply Collector `transform` processor for normalization.
**See also**: `signals/metrics.md §6 Cardinality and Tenant Labels`, `signals/cost.md §8`

### B.3 Raw `url.full` as metric label

**Severity**: HIGH
**Why it fails**: URL query strings are unbounded and may contain tokens or email addresses (`?token=...`, `?email=...`). Using raw `url.full` as a label causes cardinality explosion and PII leakage in the TSDB.
**Remediation**: Use `http.route` (normalized route) instead. Apply `replace_pattern` in OTel Collector `transform` processor to strip numeric IDs and UUIDs from route segments.
**See also**: `meta-observability.md` Section C, `signals/metrics.md §2.5 Naming and Labels`

### B.4 Summary instrument for cross-service aggregation

**Severity**: MEDIUM
**Why it fails**: Prometheus Summary computes quantiles client-side per process. p99 from three replicas cannot be merged into a fleet-level p99; the values are mathematically incompatible.
**Remediation**: Replace Summary with Histogram + `histogram_quantile()` at query time. Set explicit bucket boundaries matching the expected value range (e.g., seconds-scale for request duration, not the default millisecond buckets).
**See also**: `signals/metrics.md §2.3 Summary Is Legacy Interoperability Data`

### B.5 Histogram with default bucket boundaries

**Severity**: MEDIUM
**Why it fails**: The OTel SDK default buckets are millisecond-scale `[0, 5, 10, 25, 50, ...]`. For second-scale operations (database queries, batch jobs, file uploads), all measurements land in the last bucket, making `histogram_quantile()` meaningless.
**Remediation**: Set explicit bucket boundaries per instrument view using `View(instrument_name=..., aggregation=ExplicitBucketHistogramAggregation([0.01, 0.05, 0.1, 0.5, 1, 2, 5]))`.
**See also**: `signals/metrics.md §2.2 Histogram Buckets`

### B.6 Unbounded values as log stream labels

**Severity**: MEDIUM
**Why it fails**: In label-indexed log stores such as Loki, every distinct label value creates a stream. Message IDs, request IDs, `trace_id`, or user identifiers used as labels explode the stream count, degrade ingestion and query performance, and inflate cost.
**Remediation**: Keep unbounded values in the log body or structured metadata. Use only bounded labels (`service.name`, environment, severity, namespace).
**See also**: `signals/logs.md §7 Log Retention, Compliance, and Backends`

### B.7 Egress cost left out of cost attribution

**Severity**: MEDIUM
**Why it fails**: A CPU + memory cost query omits network egress, which is often the largest surprise cost in multi-cloud or CDN-heavy architectures. Unit-cost figures look healthy while the bill grows.
**Remediation**: Multiply the egress unit-price metric by attributed network usage, or use the OpenCost Allocation API's network cost. Set an egress budget alert. Treat L3/L4 byte counts as a proxy, not as unit economics.
**See also**: `signals/cost.md §5.1 Egress Attribution`

### B.8 Per-endpoint tags on Envoy / Istio request metrics

**Severity**: HIGH
**Why it fails**: `istio_requests_total` already multiplies source × destination × method × response code. Adding URL path or per-endpoint tags multiplies it again and exceeds the series budget on any sizeable mesh.
**Remediation**: Remove high-cardinality tags with Telemetry API metric overrides (`tagOverrides` with `operation: REMOVE`) or aggregate in a Collector `transform` processor before storage.
**See also**: `layers/mesh.md §3.1`, `meta-observability.md` Section C

---

## C: Pipeline & Collector

### C.1 Missing `memory_limiter` processor

**Severity**: CRITICAL
**Why it fails**: Without `memory_limiter`, a traffic spike or backend backpressure causes the Collector heap to grow unbounded until the process OOM-kills. All in-flight signals are lost and the pipeline is silent until the pod restarts.
**Remediation**: Add `memory_limiter` as the **first** processor in every pipeline (traces, metrics, logs). Set `limit_percentage: 75` and `spike_limit_percentage: 20`. Apply to both DaemonSet agents and gateway tiers.
**See also**: `meta-observability.md` A3, `transport/collector-topology.md §2`, `transport/otlp-grpc-vs-http.md §4.3`

### C.2 Sidecar collectors on standard Kubernetes nodes

**Severity**: HIGH
**Why it fails**: Sidecar mode injects one Collector per application pod. A 100-pod deployment runs 100 Collectors. CPU and memory cost scales linearly with pod count, overwhelming cluster resources. Additionally, sidecar collectors see only spans from their own pod, breaking tail sampling.
**Remediation**: Use DaemonSet mode (one Collector per node) for standard Kubernetes. Reserve sidecar mode for AWS Fargate or GCP Cloud Run where DaemonSets are unavailable.
**See also**: `transport/collector-topology.md §3 When to Use Sidecar`

### C.3 Tail sampling in sidecar

**Severity**: HIGH
**Why it fails**: A sidecar Collector only sees spans from its own pod. A trace spanning multiple services has spans on different pods, each with a different sidecar. No single sidecar has the complete trace; sampling decisions are based on incomplete data, producing systematically wrong retention.
**Remediation**: Run `tail_sampling` processor in the gateway tier (Deployment mode) only, combined with a `loadbalancing` exporter using consistent hash by `trace_id` to ensure trace completeness.
**See also**: `transport/collector-topology.md §3`, `transport/sampling-recipes.md §2`

### C.4 Single gateway replica

**Severity**: HIGH
**Why it fails**: A single gateway Collector is a single point of failure. Under backend backpressure or a rolling restart, all telemetry is lost for the duration. This eliminates observability exactly when it is most needed.
**Remediation**: Deploy a minimum of 2–3 gateway replicas. Use a PodDisruptionBudget to prevent simultaneous eviction. Add a `loadbalancing` exporter upstream for trace-complete routing.
**See also**: `transport/collector-topology.md §6 High-Throughput Gateway Scaling`

### C.5 Log migration based on an unsupported deprecation claim

**Severity**: MEDIUM
**Why it fails**: Fluentd remains CNCF Graduated. The CNCF migration guide does not deprecate it, and Fluent Bit configuration syntax/plugins are not a drop-in replacement. A migration without conversion and parity checks can lose logs.
**Remediation**: Choose from actual plugin, route, resource, and support requirements. Convert configuration and validate representative records in parallel before cutover.
**See also**: `signals/logs.md §4 Collector and Agent Options`, `vendor-categories.md §(h)`

### C.6 Prometheus receiver on multiple replicas without target allocator

**Severity**: MEDIUM
**Why it fails**: When multiple gateway Collector replicas each run a `prometheus` receiver, every replica scrapes every target. This produces duplicate metrics in the TSDB backend and inflates series counts.
**Remediation**: Enable the OTel Operator's `spec.targetAllocator` to distribute scrape targets across replicas. Each replica scrapes a non-overlapping subset of targets.
**See also**: `transport/collector-topology.md §4 Component Placement Reference`

### C.7 Collector self-metrics not scraped by independent instance

**Severity**: MEDIUM
**Why it fails**: If the Collector scrapes its own self-metrics endpoint (port 8888) and the Collector fails, the metrics that would reveal the failure are also lost. The pipeline's health is invisible at the moment of failure.
**Remediation**: Scrape Collector self-metrics from a separate Prometheus instance or second Collector instance. Expose `otelcol_*` metrics through a Prometheus pull reader (`service.telemetry.metrics.readers[].pull.exporter.prometheus`, host and port 8888) with `level: detailed`.
**See also**: `meta-observability.md` A1

---

## D: Sampling & Retention

### D.1 Head-based sampling on multi-service call paths

**Severity**: HIGH
**Why it fails**: Head-based sampling makes a sampling decision at the trace root. If a downstream service independently samples out, its spans are dropped; the reconstructed trace has gaps. Tracing backends show incomplete traces that mislead incident investigation.
**Remediation**: Use tail-based sampling in the gateway tier for multi-service systems. Propagate `traceparent` on every hop regardless of local sampling decision. The gateway buffers all spans and decides after the trace is complete.
**See also**: `transport/sampling-recipes.md §1`, `transport/sampling-recipes.md §5 Pitfalls`

### D.2 Missing `loadbalancing` exporter before tail sampler

**Severity**: HIGH
**Why it fails**: Without consistent-hash routing, spans for the same trace arrive at different gateway replicas. Each replica's `tail_sampling` processor sees an incomplete trace and makes wrong retention decisions; high-value traces are dropped, low-value traces are retained.
**Remediation**: Deploy `loadbalancing` exporter (with `routing_key: traceID`) in the tier upstream of `tail_sampling`. Use a headless Kubernetes Service so the exporter resolves per-pod DNS.
**See also**: `transport/sampling-recipes.md §2`, `transport/collector-topology.md §6`

### D.3 Audit evidence can be altered without detection

**Severity**: HIGH
**Why it fails**: Missing access controls and tamper protection can invalidate required audit evidence. The applicable framework and record class determine the controls; there is no common requirement that every audit log use WORM.
**Remediation**: Record the integrity requirement, access controls, and retention/legal-hold policy. Choose Object Lock or equivalent only when justified; select Governance/Compliance mode according to the approved control and deletion obligations.
**See also**: `signals/audit.md §5 Immutable WORM Storage`

### D.4 Audit retention does not match its approved schedule

**Severity**: HIGH
**Why it fails**: Records may be erased before a required period or kept beyond their lawful purpose. HIPAA required security documentation and operational audit logs are different record classes; six years is not a blanket raw-log minimum.
**Remediation**: Map each class to applicable legal/contractual obligations and purpose, including erasure and legal-hold exceptions. Configure lifecycle/lock controls and a scheduled policy check against that schedule rather than a universal seven-year threshold.
**See also**: `signals/audit.md §7 Evidence-Specific Retention Policy`, `meta-observability.md` Section F (Alert 5)

### D.5 No tamper evidence on audit trail

**Severity**: HIGH
**Why it fails**: WORM prevents deletion but does not prove that records were not silently modified or that records are not missing. An audit trail without a hash chain or Merkle root anchoring cannot satisfy forensic integrity requirements for SOC 2 or ISO/IEC 27001.
**Remediation**: Implement per-event hash chain: `event_N.hash = SHA256(event_N.payload + event_{N-1}.hash)`. Anchor daily Merkle root to an external transparency log (rekor/sigstore). Run automated chain verification weekly.
**See also**: `signals/audit.md §6 Tamper Evidence`

### D.6 Kubernetes audit logs routed to operational log store

**Severity**: HIGH
**Why it fails**: Operational log stores (Loki, Elasticsearch) are mutable and have short retention policies. Kubernetes API audit logs record secret access, RBAC mutations, and cluster-admin actions; they are audit evidence and inherit the integrity and retention controls approved for that record class, which an operational store does not provide.
**Remediation**: Route K8s audit logs via a separate pipeline to the audit store selected for that record class, with the tamper protection and retention its schedule requires (Object Lock only when the obligation calls for it). Tag with `source: k8s_apiserver`. Do not co-mingle with operational logs.
**See also**: `signals/audit.md §9 Kubernetes Audit Logs`

### D.7 Decision wait too short in tail sampler

**Severity**: MEDIUM
**Why it fails**: If `decision_wait` is shorter than the p99 inter-service latency, spans from slow downstream services arrive after the sampling decision is finalized. Those spans are dropped unconditionally, making tail sampling silently incomplete.
**Remediation**: Set `decision_wait` to exceed your p99 cross-service latency (typically 30–60 s for synchronous calls). For cross-region deployments, account for additional propagation delay. Monitor `otelcol_processor_tail_sampling_sampling_late_span_age` and `otelcol_processor_tail_sampling_sampling_trace_dropped_too_early` for late arrivals and buffer pressure.
**See also**: `transport/sampling-recipes.md §5 Pitfalls`

### D.8 Istio default 1% trace sampling left in place

**Severity**: MEDIUM
**Why it fails**: Istio samples 1% of requests by default. Low-traffic endpoints and canary subsets may never produce a trace, so the trace backend is empty exactly where debugging is needed.
**Remediation**: Set `randomSamplingPercentage` in the Telemetry CR deliberately (100 in staging and on canary scopes, a chosen baseline in production) and control cost with tail sampling at the gateway Collector.
**See also**: `layers/mesh.md §9 Sampling Considerations`, `transport/sampling-recipes.md`

---

## E: Release & Deployment

### E.1 No release markers in telemetry

**Severity**: HIGH
**Why it fails**: Without `service.version` on spans, metrics, and logs; and without a deployment event at release time; there is no way to correlate a metric anomaly or error spike to a specific deploy. Incident investigation degrades to git bisect guesswork.
**Remediation**: Set `service.version` on the OTel Resource at SDK init (injected via CI as `OTEL_RESOURCE_ATTRIBUTES`). Emit a structured deployment event at release time and pipeline it to Grafana as a vertical annotation line.
**See also**: `boundaries/release.md §8 Release Markers in Telemetry`

### E.2 Canary analysis without SLI metric

**Severity**: HIGH
**Why it fails**: Promoting a canary without a Flagger `MetricTemplate` or Argo Rollouts `AnalysisTemplate` means the promotion decision is manual and intuition-based. Regressions in error rate or latency ship silently to 100% of traffic.
**Remediation**: Gate every canary on at minimum: error rate (max +0.5% allowed) and p99 latency (max +50ms allowed). Reference PromQL SLI queries from `boundaries/slo.md` as the metric source.
**See also**: `boundaries/release.md §9 Canary Analysis Metric Suite`

### E.3 Symbol upload not automated in CI (mobile / web)

**Severity**: HIGH
**Why it fails**: Without automated dSYM / ProGuard / source map upload on every release, production crashes produce unreadable minified stack traces. Incident investigation time for mobile/web crashes increases by 30–60 minutes per incident.
**Remediation**: Add symbol upload as a mandatory CI step, gated on the same pipeline step as container image push or app store submission. Use Sentry CLI, `fastlane-plugin-sentry`, or Gradle Sentry plugin. Never store symbols in git LFS.
**See also**: `layers/L7-application/crash-analytics.md §9 CI Integration`

### E.4 GitOps drift unalerted

**Severity**: MEDIUM
**Why it fails**: When the cluster state diverges from the git manifest (OutOfSync in Argo CD, stalled Flux reconcile), the cluster is running unintended configuration. This silently breaks observability contracts; dashboards may reference metrics from a previous config version.
**Remediation**: Alert on `argocd_app_info{sync_status="OutOfSync"} == 1` and, for Flux, on `gotk_resource_info{ready="False"} == 1` (emitted through the kube-state-metrics custom-resource-state config; confirm the labels against the installed config). Treat drift as an incident, not a warning.
**See also**: `boundaries/release.md §7 GitOps Engines`

### E.5 Feature flag evaluation not observed

**Severity**: MEDIUM
**Why it fails**: Without `feature_flag.*` span attributes on every flag evaluation, A/B experiment effects are invisible. A latency regression introduced by a new feature variant cannot be attributed to the flag without telemetry.
**Remediation**: Record `feature_flag.key`, `feature_flag.result.variant`, and `feature_flag.provider.name` on every evaluation (OTel `feature_flag.*` semconv, Release Candidate; confirm the tier in the registry). Track `feature_flag_evaluation_total` and error rate delta per variant.
**See also**: `boundaries/release.md §6 Observing Feature Flag Evaluations`

### E.6 Rollback without post-mortem audit trail

**Severity**: MEDIUM
**Why it fails**: A rollback event without an audit record severs the learning loop. The same deployment failure repeats because there is no evidence of what was deployed, who authorized it, and what metric triggered rollback.
**Remediation**: Record every rollback in the audit log with: `actor.type`, `action: rollback`, `service.version` (both from and to), `event.outcome`, and `trace_id`. Cross-reference to the triggering alert.
**See also**: `signals/audit.md §3 Audit Event Categories`, `boundaries/release.md §10`

### E.7 Canary analysis without a saturation gate

**Severity**: HIGH
**Why it fails**: A success-rate gate does not fail while pods are OOM-killed and restarted between requests. The canary keeps progressing and automated rollback never triggers.
**Remediation**: Add a memory saturation metric (`container_memory_working_set_bytes` against the limit, or restart count) as a custom Flagger or Argo Rollouts analysis gate next to success rate and latency.
**See also**: `incident-forensics.md §5` (Scenario C), `boundaries/release.md §9 Canary Analysis Metric Suite`

---

## F: Security & Compliance

### F.1 `traceparent` stripped at service boundary

**Severity**: HIGH
**Why it fails**: Stripping `traceparent` on outbound calls silently breaks distributed trace continuity. The downstream service starts a new root trace, making it impossible to correlate a customer-reported request across services. MTTR increases by 15–30 minutes per incident.
**Remediation**: Every outbound HTTP/gRPC call MUST forward `traceparent`. Configure the OTel SDK auto-instrumentation to inject the header automatically. Test with an integration test that asserts the `traceparent` header on every outbound call.
**See also**: `standards.md §2.2 W3C Trace Context`

### F.2 Mixed propagators without normalization at ingress

**Severity**: HIGH
**Why it fails**: When B3 (Zipkin), AWS X-Ray, and W3C headers coexist without a composite propagator at the ingress gateway, spans from different origins appear as disconnected root spans in the trace backend. Waterfall correlation is impossible across cloud or vendor boundaries.
**Remediation**: Configure the ingress gateway with a composite propagator that extracts all known formats (tracecontext, b3multi, awsxray, datadog) and emits only W3C downstream.
**See also**: `boundaries/cross-application.md §3 Propagator Matrix`

### F.3 `request_id` not exposed to frontend users

**Severity**: MEDIUM
**Why it fails**: Without a user-visible `request_id` in error banners, customer support cannot correlate a user-reported error to backend traces. Support agents must rely on user-provided timestamps and symptoms; escalations that should take 2 minutes take 20.
**Remediation**: Return `x-request-id` in every HTTP response header. Display it in frontend error banners. Customer support uses this ID; engineers use it to pivot to `trace_id` in the log system.
**See also**: `boundaries/cross-application.md §7 request_id to trace_id Integration`

### F.4 `service.namespace` not set on services

**Severity**: MEDIUM
**Why it fails**: Without `service.namespace`, a system with 80+ microservices presents a flat, unordered list in trace backends and dashboards. Domain-level KPIs (e.g., payment-domain error rate vs. inventory-domain error rate) are impossible to compute.
**Remediation**: Assign `service.namespace` per DDD bounded context at deployment time via `OTEL_RESOURCE_ATTRIBUTES` or OTel Collector `resource` processor. Align namespaces with domain boundaries, not team names.
**See also**: `boundaries/cross-application.md §5 DDD Bounded Context`

### F.5 New `trace_id` generated on DLQ replay

**Severity**: MEDIUM
**Why it fails**: Generating a new `trace_id` at dead letter queue replay severs the forensic chain from the original failure span to the replay event. Root cause analysis of repeated failures requires tracing back to the originating request.
**Remediation**: Re-inject the original `traceparent` and `causation_id` from the failed message headers when replaying. Use a span link; not parent-child; to connect replay span to the original trace.
**See also**: `boundaries/cross-application.md §8 Idempotency and Event-Driven Trace Lineage`

### F.6 WAF rule hit / block rate unmonitored

**Severity**: HIGH
**Why it fails**: When a WAF rule update over-blocks legitimate traffic, the edge returns 403 to users while backend services see request volume drop. Service-level error rate stays flat; the on-call investigates "missing traffic" rather than "WAF blocking my users", and the FP storm is discovered only via customer complaints. MTTR runs into hours.
**Remediation**: Emit `waf_action_total{action, rule_id, rule_set_version}` from the edge tier. Alert when the block rate per `rule.id` step-changes more than 3σ above its rolling 24h baseline. Dashboard the action distribution alongside the application 5xx rate so block-vs-error is visible side-by-side.
**See also**: `layers/L7-application/waf.md §5 False-Positive Surge`

### F.7 WAF rule-set deploy without release marker

**Severity**: HIGH
**Why it fails**: Without a release marker stream for ruleset rollouts, an edge 403 surge cannot be aligned with the rule change that caused it. The rollback decision is guesswork; engineers may roll back the application instead of the ruleset.
**Remediation**: Emit a structured deployment event on every ruleset rollout carrying `waf.rule.set.version`, `waf.vendor`, and the rollout strategy (full vs canary). Treat WAF ruleset versions as a peer to `service.version` for release-correlation purposes per `boundaries/release.md`.
**See also**: `layers/L7-application/waf.md §3 Required Attributes`, `boundaries/release.md`

### F.8 WAF fail-closed without dependency-health signal

**Severity**: HIGH
**Why it fails**: WAFs that consult external services (IP reputation, bot scoring, GeoIP, threat-intel API) inherit those dependencies' failure modes. A fail-closed policy without dependency telemetry means a third-party API outage silently blocks 100% of traffic; on-call has no signal that the security layer is the cause.
**Remediation**: Emit `waf_dependency_failure_total{dependency, policy}` per external dependency. Alert when non-zero for more than 60 s. Document the fail-open vs fail-closed policy per rule and surface it on the WAF dashboard.
**See also**: `layers/L7-application/waf.md §6 Fail-Open vs Fail-Closed`

### F.9 WAF logs detached from application trace context

**Severity**: MEDIUM
**Why it fails**: When the WAF blocks a request and emits a log without trace correlation, the application has no record of the attempt. On-call cannot answer "did this user even reach our service?" without manually joining vendor-specific identifiers (e.g., `cf-ray`, `X-Amzn-Trace-Id`) to the application trace.
**Remediation**: Configure the WAF to propagate `traceparent` even on block actions. Map vendor headers (`cf-ray`, `X-Amzn-Trace-Id`, Akamai `X-Akamai-*`) to W3C baggage at the edge so application traces and WAF logs join cleanly on `trace_id`.
**See also**: `layers/L7-application/waf.md §7 Vendor Telemetry Surfaces`, `boundaries/cross-application.md §3 Propagator Matrix`

### F.10 WAF rules promoted to `block` without `log`-mode soak

**Severity**: MEDIUM
**Why it fails**: A new rule promoted directly to `block` action carries unknown FP rate; first contact with production traffic doubles as the rule's correctness test. The failure mode is a mass-block incident affecting real customers.
**Remediation**: Mandatory minimum 24 h `log`-mode (detect-only) soak per new rule with FP rate verified below a target ratio (commonly < 0.1% of matched traffic) before promotion to `block`. Encode the soak requirement as a CI gate on the ruleset repository so promotion bypass is auditable.
**See also**: `layers/L7-application/waf.md §2 WAF Action Model`, `layers/L7-application/waf.md §5`

### F.11 Mesh-only tracing without application context propagation

**Severity**: HIGH
**Why it fails**: A mesh sidecar creates spans but cannot copy `traceparent` from an inbound request onto the application's outbound calls. Without header forwarding in the application, every hop starts a new root span and the backend shows a forest of single-hop traces. The mesh also sees only network hops; database queries and business logic stay invisible.
**Remediation**: Deploy the OTel Operator `Instrumentation` CR and annotate application Deployments, or add the W3C propagator in the application SDK. Verify one request yields a single trace across hops.
**See also**: `layers/mesh.md §5`

### F.12 Async messaging without span links

**Severity**: MEDIUM
**Why it fails**: When the consumer span is not linked to the producer span context, `PRODUCER` and `CONSUMER` spans land in separate disconnected traces. A message cannot be followed end to end across the queue.
**Remediation**: Inject `traceparent` into message headers at the producer; at the consumer, extract it and attach the producer context as a span link when creating the `CONSUMER` span.
**See also**: `signals/traces.md §3 Messaging Tracing Patterns`

### F.13 Regulated tenant on a shared observability backend

**Severity**: HIGH
**Why it fails**: Soft isolation (shared collector and backend, `tenant.id` label filtering only) co-mingles a regulated tenant's telemetry with every other tenant's. This can breach the tenant's data processing agreement, and one query-scope or RBAC mistake exposes all tenants at once.
**Remediation**: Choose the isolation tier from the tenant's contractual and compliance obligations, not from cost. Move regulated tenants to a dedicated collector or dedicated backend tier and record the tier decision per tenant.
**See also**: `boundaries/multi-tenant.md §3 Four-Tier Isolation Strategy`

### F.14 Tenant offboarding without a record-class policy

**Severity**: HIGH
**Why it fails**: Deleting everything on contract termination can erase audit or legal-claim evidence that must be retained (GDPR Art. 17(3)); deleting nothing leaves eligible personal data in hot/warm/cold tiers and backups past its lawful purpose.
**Remediation**: Inventory the tenant's records across telemetry tiers, backups, audit, and cost systems. Delete eligible records through verified backend procedures; keep legally required classes under restricted access with an approved expiry; emit a minimized audit event for the action.
**See also**: `boundaries/multi-tenant.md §9 Tenant Onboarding and Offboarding`

### F.15 Shared RBAC for operations and audit readers

**Severity**: HIGH
**Why it fails**: If the role that operates the system can also read or modify audit storage, there is no separation of duties; the people whose actions are audited can alter or selectively expose the evidence.
**Remediation**: Create a distinct read-only `audit-reader` role, scoped to approved time ranges. No single engineer can both produce audit events and modify audit storage. Define the roles in IaC.
**See also**: `signals/audit.md §11 Access Control on Audit Data`

### F.16 `/debug/pprof` exposed on production endpoints

**Severity**: HIGH
**Why it fails**: The endpoint serves CPU and heap profiles and internal function names to any caller who discovers the path, and profile requests are expensive enough to be a denial-of-service vector.
**Remediation**: Leave the `net/http/pprof` import out of production builds, or serve it on an internal-only listener behind authentication. Use a continuous profiler for production profiling.
**See also**: `signals/profiles.md §3 Sampling Overhead`

---

## G: Frontend / Mobile

### G.1 3rd-party script loaded without CSP monitoring

**Severity**: HIGH
**Why it fails**: Third-party scripts loaded without a Content Security Policy are an unmonitored XSS and supply-chain attack vector. A compromised CDN script executes in the user's browser with full page access. LCP regressions from script load delays are also invisible without attribution.
**Remediation**: Add `Content-Security-Policy` header with `report-to` endpoint. Pipe CSP violation reports to the log backend and alert on new `blocked-uri` origins. Pin script hashes with Subresource Integrity (`integrity="sha384-..."`).
**See also**: `layers/L7-application/web-rum.md §6 Third-Party Scripts and CSP`

### G.2 Source maps not uploaded to error vendor

**Severity**: HIGH
**Why it fails**: Minified production bundles produce unreadable stack traces: `at t.<anonymous> (bundle.min.js:1:74821)`. Without source maps, engineers cannot identify the failing line of code. Incident investigation for frontend crashes is impossible.
**Remediation**: Upload source maps to the error tracking vendor on every CI release pipeline step, before the release is considered complete. Use Sentry CLI or equivalent. Never store source maps in git LFS; use vendor symbol storage.
**See also**: `layers/L7-application/web-rum.md §8 Error Tracking`, `layers/L7-application/crash-analytics.md §3`

### G.3 FID still reported in dashboards after March 2024

**Severity**: MEDIUM
**Why it fails**: First Input Delay (FID) was removed from Core Web Vitals in March 2024 and replaced by Interaction to Next Paint (INP). Dashboards still reporting FID mislead SLO reviews; FID scores passing does not mean the INP SLO is met.
**Remediation**: Replace FID with INP in all dashboards and OpenSLO definitions. SLI target: INP p75 ≤ 200 ms. Use `onINP` from the `web-vitals` JS library.
**See also**: `layers/L7-application/web-rum.md §2 Core Web Vitals`

### G.4 `propagateTraceHeaderCorsUrls` / `allowedTracingUrls` not configured

**Severity**: MEDIUM
**Why it fails**: The browser SDK injects `traceparent` only on requests to origins in its allowlist, and the server's CORS policy must allow the header. When either side is missing, client-to-server trace correlation silently breaks; frontend traces appear disconnected from backend traces.
**Remediation**: Add all API origin patterns to `FetchInstrumentation`'s `propagateTraceHeaderCorsUrls` (OTel JS) or Datadog RUM's `allowedTracingUrls`, and allow `traceparent` in the API's `Access-Control-Allow-Headers`. Confirm in a browser network inspector that the header is present.
**See also**: `layers/L7-application/web-rum.md §5 Client-to-Server Error Correlation`

### G.5 Missing `traceparent` injection on mobile outbound HTTP

**Severity**: MEDIUM
**Why it fails**: Without `traceparent` on outbound requests from the mobile app, the mobile user session is invisible in backend distributed traces. Customer-reported mobile errors cannot be linked to backend spans.
**Remediation**: Configure the mobile SDK's HTTP interceptor at initialization time (not at individual call sites). Verify with a network proxy tool (Charles, mitmproxy) that `traceparent` appears on all outbound API calls.
**See also**: `layers/L7-application/mobile-rum.md §9 W3C Trace Context Propagation`

### G.6 No event TTL on mobile offline queue

**Severity**: MEDIUM
**Why it fails**: Stale events queued on-device for hours or days eventually upload when the network reconnects. Events with device timestamps that are 24+ hours old mislead dashboards and SLO calculations; a crash from two days ago appears as a current incident.
**Remediation**: Set an event TTL of 24–72 hours on the mobile offline queue. Drop events that exceed the TTL before upload, not after. Log dropped event counts as a metric for monitoring queue health.
**See also**: `layers/L7-application/mobile-rum.md §3 Offline-First Telemetry Queuing`

### G.7 No release marker for crash correlation on mobile

**Severity**: MEDIUM
**Why it fails**: Without `service.version` set on every crash event and without a release marker event at deploy time, a crash rate spike cannot be attributed to a specific app version. Investigation requires manual version comparison across crash groups.
**Remediation**: Set `service.version` as a custom key on every crash report. Automate release marker events at submission time. Use the release marker to draw vertical lines on CFR trend charts for before/after comparison.
**See also**: `layers/L7-application/crash-analytics.md §4 Release Tracking Integration`

### G.8 Server receipt time used as mobile event timestamp

**Severity**: MEDIUM
**Why it fails**: Offline-queued mobile events arrive minutes to days after they happened. Stamping them with server receipt time reorders waterfalls and attributes old events to the current window.
**Remediation**: Record the device-local emit time on every event and sort by it server-side; treat receipt time as ingestion metadata only.
**See also**: `layers/L7-application/mobile-rum.md §3`

### G.9 Android ANR rate unmonitored or measured against the wrong denominator

**Severity**: HIGH
**Why it fails**: Google Play's bad-behavior threshold is a user-perceived ANR rate of 0.47% of daily active users. An ANR-events-per-session series compared with that number gives a false pass or false alarm, and no ANR series at all risks reduced store visibility.
**Remediation**: Track the Play user-perceived ANR rate per daily active user against 0.47%. Keep any custom session-based stall metric as a separate series with its own target.
**See also**: `layers/L7-application/crash-analytics.md §10 ANR and Hang Detection`

### G.10 Single aggregate crash-free-rate target

**Severity**: MEDIUM
**Why it fails**: One fleet-wide CFR hides regressions confined to low-end devices or one OS version; the aggregate stays green while a cohort is broken.
**Remediation**: Segment CFR by `device.model`, `os.version`, and network type, and alert per segment.
**See also**: `layers/L7-application/crash-analytics.md §2 Core Metrics`

---

## H: Network / Transport / Clock

### H.1 NTP drift left unmonitored

**Severity**: HIGH
**Why it fails**: Distributed traces depend on synchronized clocks. When two nodes diverge by more than 100 ms, waterfall charts show child spans starting before their parent; engineers chase phantom race conditions instead of real bugs. MTTR increases by hours.
**Remediation**: Emit `node_clock_drift_ms` from every host (chrony textfile collector or node exporter). Alert when drift exceeds 100 ms for 5 minutes. Run `chronyc makestep` to force resync. For financial / telco workloads requiring sub-ms precision, use PTP (IEEE 1588).
**See also**: `standards.md §5 Clock Discipline`, `meta-observability.md` Section B

### H.2 PMTUD black hole left uncorrected

**Severity**: HIGH
**Why it fails**: When firewalls block ICMP Type 3 Code 4 ("Fragmentation Needed"), PMTUD fails silently. Large TCP transfers stall while health checks (small packets) pass; masking the problem. Services appear healthy in monitors while bulk data transfers time out.
**Remediation**: Enable MSS clamping at VPN/tunnel endpoints. Allow ICMP Type 3 Code 4 through security groups. Verify the fix with `ping -M do -s 1472 <destination>`. Cross-reference UDP MTU constraints for StatsD pipelines.
**See also**: `layers/L3-network.md §4 PMTUD`, `transport/udp-statsd-mtu.md §2`

### H.3 Connection pool observability absent

**Severity**: HIGH
**Why it fails**: Pool queue saturation causes application latency spikes that are invisible in TCP metrics alone. Neither retransmit rate nor error rate spikes until connection timeouts fire; engineers investigate network issues while the actual problem is a saturated database pool.
**Remediation**: Instrument connection pool size, wait time, and timeout counters at the application layer (not only at the TCP layer). Alert on pool utilization > 80% before timeouts occur.
**See also**: `layers/L4-transport.md §3.3 Common Pitfalls`

### H.4 QUIC adoption without HTTP/3 trace tooling validation

**Severity**: HIGH
**Why it fails**: Enabling QUIC without verifying that OTel SDKs emit `network.transport: quic` and `network.protocol.version: "3"` creates a transport-layer blind spot. UDP-based QUIC flows are invisible in TCP metrics (`/proc/net/tcp`), leaving L4 observability dark.
**Remediation**: Add a canary assertion in staging: verify `network.transport: quic` appears in spans and that Envoy access logs show QUIC connection IDs. eBPF auto-instrumentation may not parse HTTP/3; confirm what the deployed tool supports before production rollout.
**See also**: `layers/L4-transport.md §7`

### H.5 eBPF agent deployed without kernel/capability preflight

**Severity**: HIGH
**Why it fails**: An eBPF instrumentation DaemonSet (OBI/Beyla, Pixie) on a kernel below the tool's minimum, without BTF, or without the required capabilities fails silently, providing no operator-visible error or metric. The observability gap is discovered only during an incident.
**Remediation**: Add an `initContainer` that asserts the kernel version and BTF availability against the tool's documented minimum and checks the required capabilities. Exit non-zero if requirements are unmet. This surfaces the incompatibility during deployment, not during an incident.
**See also**: `layers/L4-transport.md §5.2 Kernel and Privilege Requirements`

### H.6 WebSocket reconnection storm undetected

**Severity**: MEDIUM
**Why it fails**: A server restart without graceful drain makes every WebSocket client reconnect at once. At L4 the SYN burst looks like ordinary new connections, so transport metrics do not flag it.
**Remediation**: Count client reconnections and alert on rate spikes. Require exponential backoff with jitter in clients and drain connections before restart.
**See also**: `layers/L4-transport.md §6 Connection Lifecycle Observability`

---

## I: As-Code & GitOps

### I.1 Production dashboards edited directly in UI

**Severity**: HIGH
**Why it fails**: UI-edited dashboards have no version history, no rollback path, no peer review, and no audit trail. SOC 2 change-management controls require an audit-traceable change process for detection and response configuration. A dashboard overwritten by mistake cannot be recovered without a backup.
**Remediation**: Version all dashboards in git using Grafonnet (Jsonnet) or Terraform Grafana provider. Apply via CI/CD only and block UI edits in provisioning (`allowUiUpdates: false`). Gate on PR review and linting (`jsonnetfmt --test`). Treat the git history as the audit trail.
**See also**: `observability-as-code.md §1 Why Observability-as-Code`

### I.2 Alert thresholds hardcoded per-environment without parameterization

**Severity**: MEDIUM
**Why it fails**: Hardcoded thresholds in per-environment alert YAML files diverge silently over time. Production runs a different error-rate threshold than staging, masking regressions that staging was supposed to catch.
**Remediation**: Parameterize alert thresholds as Jsonnet or Terraform variables. Derive environment-specific values from a shared defaults map. Apply the same alert code to all environments with environment-scoped variable overrides.
**See also**: `observability-as-code.md §5 Review Workflow`

### I.3 SLO definitions stored only in the vendor UI

**Severity**: MEDIUM
**Why it fails**: SLO definitions stored only in Datadog, Grafana Cloud, or Honeycomb UIs are not version-controlled, not peer-reviewed, and cannot be reconstructed after a vendor migration. SLO drift goes undetected.
**Remediation**: Define SLOs in OpenSLO YAML, committed to git. Apply via sloth or the vendor's Terraform provider. The git commit history is the audit trail for SLO changes.
**See also**: `observability-as-code.md`, `boundaries/slo.md`

### I.4 Alert rules shipped without rule tests or with the CRD fed straight to `promtool`

**Severity**: MEDIUM
**Why it fails**: Untested rules produce false alarms or silently never fire. A `PrometheusRule` manifest passed directly to `promtool check rules` is not a raw rule file, so the lint step fails or validates nothing while CI looks green.
**Remediation**: Extract `.spec` from the CRD before `promtool check rules`, validate the CRD schema separately, and add `promtool test rules` fixtures (one firing case, one silent case) for every alert.
**See also**: `observability-as-code.md §4 CI Validation`, `observability-as-code.md §6 Testing Alert Rules`

---

## Z: Cross-cutting

### Z.1 `trace_id` missing from log records

**Severity**: HIGH
**Why it fails**: Without `trace_id` and `span_id` on every log record, log-trace join during incident forensics fails. Engineers cannot pivot from a log error to the distributed trace waterfall, adding 15–30 minutes to MTTR per incident.
**Remediation**: Inject `trace_id` and `span_id` into every log record via the OTel SDK context hook (Python: `structlog`; Java: Logback `OpenTelemetryAppender`; Node.js: `pino-opentelemetry-transport`). Assert in integration tests.
**See also**: `signals/logs.md §5 Trace ID Injection Rules`, `incident-forensics.md §2.3`

### Z.2 `service.version` missing from resource attributes

**Severity**: HIGH
**Why it fails**: Without `service.version` on every signal, before/after comparison across a release is impossible. Canary analysis, SLO delta calculation, and post-incident release attribution all fail.
**Remediation**: Set `service.version` on the OTel Resource at SDK initialization. Inject via CI as `OTEL_RESOURCE_ATTRIBUTES=service.version=${GIT_SHA}`. Never set it per-signal; the Resource is the single source.
**See also**: `incident-forensics.md §2.1`, `boundaries/release.md §8`

### Z.3 Pipeline delivery ratio unmonitored

**Severity**: HIGH
**Why it fails**: If the OTel Collector is silently dropping 10% of traces, every SLO dashboard and alert is built on incomplete data. The pipeline degradation is invisible until SLO violations appear; at which point on-call cannot distinguish real incidents from telemetry gaps.
**Remediation**: Inspect receiver refusals, exporter failures, and queues per pipeline/hop. Use completed synthetic backend-delivery probes for end-to-end checks, accounting for configured sampling/filter expectations. A global sent/accepted ratio is not a loss measure; see `meta-observability.md` A5.
**See also**: `meta-observability.md` A5, `meta-observability.md` Section F (Alert 1)

### Z.4 Tenant ID absent from multi-tenant telemetry

**Severity**: HIGH
**Why it fails**: In a multi-tenant system, telemetry without `tenant.id` makes per-tenant SLO computation, chargeback, and incident isolation impossible. All tenants are indistinguishable in dashboards; a single noisy tenant can mask SLO violations for the entire fleet.
**Remediation**: Propagate `tenant.id` via W3C Baggage from the API gateway through all downstream services. Emit it on every span, log record, and metric data point. Apply top-N cap (≤ 1000) when used as a metric label.
**See also**: `incident-forensics.md §2.3`, `boundaries/multi-tenant.md`

### Z.5 Incident forensics without 6-dimension MRA attributes

**Severity**: HIGH
**Why it fails**: Missing Minimum Required Attributes (`service.name`, `service.namespace`, `service.version`, `deployment.environment.name`, `cloud.region`, `k8s.pod.name`) break the 6-dimension narrowing flow; Code / Service / Layer / Host / Region / Infra pivots fail silently.
**Remediation**: Enforce MRA completeness at CI via an OTel attribute coverage gate. Set all resource attributes via `OTEL_RESOURCE_ATTRIBUTES` or the OTel Collector `resource` processor. Validate with `otelcol` debug exporter in staging before production rollout.
**See also**: `incident-forensics.md §2 Minimum Required Attributes`

### Z.6 Cost dashboard accessible to all engineers without RBAC

**Severity**: MEDIUM
**Why it fails**: Per-tenant cost data reveals revenue tier, contract value, and resource consumption patterns. Exposing this to all engineers violates least-privilege access principles and may constitute a data breach under GDPR if cost data is linked to identifiable customers.
**Remediation**: Separate cost dashboards by role: Finance sees full cost by tenant; Platform Engineering sees cost by namespace/workload; Application Engineering sees only their own service. Apply Grafana folder permissions or OPA policies.
**See also**: `signals/cost.md §7`

### Z.7 Healthcheck not tied to dependency health

**Severity**: MEDIUM
**Why it fails**: A readiness probe that returns 200 while the database is down reports false availability; SLI dashboards built on it stay green during an outage.
**Remediation**: Return non-2xx from readiness when a required dependency is down, and expose the same state as a gauge (`service_health_status{check="db"} 0`) so SLO computation can consume it.
**See also**: `signals/metrics.md §3.2 Healthcheck Endpoints and Metrics`
