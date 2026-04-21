---
otel_spec: "1.x (stable API/SDK)"
otel_semconv: "1.27.0 (2024-11)"
---

# Intent Classification Rules

## Purpose

- Classify a user query into one of 7 intents to route to the right resources
- Used by Step 1 of `execution-protocol.md`
- Bilingual keyword matching (Korean + English) for `.agents/hooks/core/triggers.json` compatibility

## Classification Priority

1. **Override flags** — always win, skip classification entirely (e.g., `--investigate`, `--tune`)
2. **Keyword pattern matching** — scan query for intent-specific keywords
3. **Signal detection** — contextual clues (tool names, error messages, metric names, cloud regions)
4. **Fallback** — `investigate + tune` parallel when no clear signal

## Override Flags

| Flag | Forced Intent |
|------|--------------|
| `--setup` | `setup` |
| `--migrate` | `migrate` |
| `--investigate` | `investigate` |
| `--alert` | `alert` |
| `--trace` | `trace` |
| `--tune` | `tune` |
| `--route` | `route` |

---

## The 7 Intents

### Intent 1: `setup`

Bootstrap a new observability pipeline or instrument a new service from scratch.
Use when the user is starting fresh: no existing pipeline, first-time SDK integration, or onboarding a new environment.

#### Keywords

| Language | Keywords |
|----------|----------|
| English | setup, install, bootstrap, instrument, configure, onboard, initialize, start, enable, add, integrate, begin, getting started, first time |
| Korean | 설치, 설정, 구성, 도입, 계측, 시작, 초기 구성, 셋업, 세팅, 추가, 연동, 처음, 시작하기, 온보딩 |
| Abbreviations / synonyms | init, SDK setup, OTel setup, collector setup, agent install |

**Signals:**
- "How do I add OTel to ..." queries
- Service name + "for the first time"
- New environment or cluster name mentioned with no existing config

#### Example Queries

- "Set up OTel stack on our k8s cluster"
- "Instrument our Node.js backend with OTel"
- "쿠버네티스에 OTel 도입하고 싶어"
- "백엔드 계측 어떻게 시작해?"
- "How do I enable tracing on a new Spring Boot service?"

#### Primary Route

`resources/vendor-categories.md` → category selection; `resources/transport/collector-topology.md` for Kubernetes

#### Secondary Considerations

`resources/standards.md` for semconv requirements before first instrumentation commit

---

### Intent 2: `migrate`

Move from a legacy tool to a modern equivalent. Applies to logging agents, APM platforms, and deprecated CNCF projects.

#### Keywords

| Language | Keywords |
|----------|----------|
| English | migrate, migration, transition, move, replace, upgrade, modernize, switch, deprecate, port, convert, off-board, phase out |
| Korean | 마이그레이션, 이주, 이전, 전환, 교체, 업그레이드, 현대화, 옮기기, 대체, 포팅, 전환 작업, 탈피 |
| Abbreviations / synonyms | Fluentd → Fluent Bit, legacy APM → OTel, lift-and-shift, rip-and-replace |

**Signals:**
- Source tool name (Fluentd, New Relic, Datadog, old APM) + destination intent
- "Replace", "away from", "moving off of"
- CNCF deprecation context (Fluentd 2025-10)

#### Example Queries

- "Migrating Fluentd to Fluent Bit per CNCF guidance"
- "Move from New Relic to OpenTelemetry"
- "Fluentd에서 Fluent Bit으로 이주 작업 중이야"
- "기존 APM을 OTel 기반으로 전환하고 싶어"
- "How do I port StatsD metrics to OTLP?"

#### Primary Route

`resources/vendor-categories.md §(h) Log Pipeline` (deprecation notes); CNCF 2025-10 Fluentd migration guide

#### Secondary Considerations

`resources/transport/otlp-grpc-vs-http.md` for destination protocol selection during migration

---

### Intent 3: `investigate`

Production incident or bug root-cause analysis. Use when something is broken, degraded, or unexpectedly slow right now.

#### Keywords

| Language | Keywords |
|----------|----------|
| English | investigate, debug, diagnose, incident, outage, postmortem, forensics, root-cause, why, broken, failing, spike, degraded, 5xx, error rate, latency, slow, down, regression, N+1, slow query, connection pool, pool exhaustion, db span, memory leak, OOM, flame graph, stuck |
| Korean | 조사, 분석, 장애, 원인, 부검, 디버깅, 왜, 문제, 에러, 고장, 5xx, 에러율, 지연, 느림, 다운, 장애 분석, 원인 파악, N+1, 슬로우 쿼리, 커넥션 풀, 풀 고갈, 메모리 누수, OOM, 플레임 그래프 |
| Abbreviations / synonyms | RCA, postmortem, blameless review, p99 spike, tail latency, DB timeout |

**Signals:**
- HTTP status codes (5xx, 4xx) or error rate numbers
- Cloud region name mentioned with a problem symptom
- Service name + "suddenly", "again", "just started"
- Time window phrase ("since 14:00", "after deploy")

#### Example Queries

- "5xx spike in ap-northeast-2, need to find root cause"
- "Why is checkout service p99 high?"
- "특정 테넌트만 느린데 왜 그런지 조사해줘"
- "결제 서비스 에러율 갑자기 올라감, 원인 분석"
- "Auth service started timing out after today's release — help"

#### Primary Route

`resources/incident-forensics.md` (MRA + 6-dimension localization flow)

#### Secondary Considerations

`resources/signals/traces.md`, `resources/signals/logs.md`, `resources/boundaries/multi-tenant.md` (if single-tenant degradation pattern)

---

### Intent 4: `alert`

Define alerts, SLO burn-rate rules, or monitor configuration. Use when the user wants to be notified proactively before or during an incident.

#### Keywords

| Language | Keywords |
|----------|----------|
| English | alert, alarm, notification, burn-rate, SLO, SLI, SLA, threshold, page, warn, monitor, PrometheusRule, alerting rule, error budget, firing |
| Korean | 알람, 알림, 경보, 임계치, SLO, SLA, 페이지, 경고, 번레이트, 모니터, 에러 버짓, 알람 설정, 발화 |
| Abbreviations / synonyms | burn rate alert, fast burn, slow burn, PD (PagerDuty), firing rule, recording rule |

**Signals:**
- SLO/SLI/SLA acronyms
- "Alert when ...", "notify me if ..."
- PrometheusRule, Alertmanager, or burn-rate framing
- Error budget percentage mentioned

#### Example Queries

- "Set up SLO burn-rate alert for payment service"
- "Need alerts when error budget is burning fast"
- "결제 서비스 에러 버짓 번레이트 알람 설정"
- "PrometheusRule로 에러율 알람 만들어줘"
- "How do I configure a slow-burn SLO alert in Grafana?"

#### Primary Route

`resources/boundaries/slo.md`; `resources/observability-as-code.md` (PrometheusRule CRD, OpenSLO YAML)

#### Secondary Considerations

`resources/meta-observability.md §Section F` for meta-observability pipeline health alerts

---

### Intent 5: `trace`

Design or debug distributed tracing: propagators, baggage, cross-service context, or mesh trace continuity.

#### Keywords

| Language | Keywords |
|----------|----------|
| English | trace, tracing, propagator, traceparent, tracestate, baggage, span, distributed, context propagation, correlation, W3C, X-Amzn-Trace-Id, context break, missing spans |
| Korean | 트레이싱, 추적, 전파, traceparent, 스팬, 분산, 컨텍스트, 상관관계, 전파자, 트레이스 끊김, 스팬 누락 |
| Abbreviations / synonyms | W3C Trace Context, B3, Zipkin, X-Ray trace, OpenTelemetry tracing, end-to-end trace |

**Signals:**
- "Trace breaks", "missing parent span", "trace not showing"
- Propagator format names (W3C, B3, X-Ray, Jaeger)
- Mesh or gateway name + trace context question
- Baggage field name mentioned

#### Example Queries

- "Our traces break at the Istio ingress — how to propagate context?"
- "Design baggage for multi-tenant trace correlation"
- "Istio 들어가면 트레이스가 끊어짐, 전파 어떻게 해?"
- "테넌트 ID baggage로 전파할 때 주의점"
- "How do I bridge AWS X-Ray trace headers into W3C Trace Context?"

#### Primary Route

`resources/boundaries/cross-application.md` (propagator matrix); `resources/layers/mesh.md` (zero-code auto-instrumentation)

#### Secondary Considerations

`resources/signals/privacy.md` (baggage PII rules — no user identifiers in traceparent/baggage without redaction)

---

### Intent 6: `tune`

Optimize performance, reduce cost, tame cardinality, configure sampling, or fix throughput bottlenecks in the telemetry pipeline.

#### Keywords

| Language | Keywords |
|----------|----------|
| English | tune, optimize, performance, throughput, cost, cardinality, sampling, budget, reduce, bandwidth, MTU, rate-limit, too much, expensive, overhead, head sampling, tail sampling, drop |
| Korean | 튜닝, 최적화, 성능, 처리량, 비용, 카디널리티, 샘플링, 예산, 줄이기, 대역폭, MTU, 너무 많음, 비쌈, 오버헤드, 헤드 샘플링, 테일 샘플링 |
| Abbreviations / synonyms | high cardinality, metric explosion, bill shock, DPM (data points per minute), ingest cost, backpressure |

**Signals:**
- Cost number with "jumped", "tripled", "too high"
- Cardinality, label explosion, or DPM framing
- UDP MTU or OTLP throughput question
- Sampling ratio or rate-limit configuration

#### Example Queries

- "Datadog bill jumped 3x — need to reduce cardinality"
- "UDP statsd throughput is low at peak"
- "Datadog 비용 3배 뛰었음, 카디널리티 줄여야 해"
- "테일 샘플링 레시피 추천"
- "How do I set a cost-aware tail sampling policy for the checkout service?"

#### Primary Route

`resources/transport/` (all 4 files: `udp-statsd-mtu.md`, `otlp-grpc-vs-http.md`, `collector-topology.md`, `sampling-recipes.md`); `resources/meta-observability.md §Cardinality`

#### Secondary Considerations

`resources/vendor-categories.md` for alternative tool selection when current vendor is causing the cost spike

---

### Intent 7: `route`

Multi-tenant, multi-cloud, or multi-region telemetry routing, isolation, data residency, or federation.

#### Keywords

| Language | Keywords |
|----------|----------|
| English | route, routing, multi-tenant, multi-cloud, region, residency, isolation, segregation, gateway, fan-out, federation, data locality, GDPR residency, pipeline split, tenant routing |
| Korean | 라우팅, 멀티테넌트, 멀티클라우드, 리전, 데이터 거주, 격리, 분리, 페더레이션, 게이트웨이, 팬아웃, 테넌트 라우팅 |
| Abbreviations / synonyms | data sovereignty, geo-fencing, per-tenant collector, routing_connector, OTel Collector routing |

**Signals:**
- Specific cloud region name + compliance or residency requirement
- "Tenant A vs Tenant B" pipeline separation
- Multiple collectors or clusters mentioned with routing context
- GDPR, PIPA, or data sovereignty regulation cited

#### Example Queries

- "Route tenant A telemetry to ap-northeast-2 only (GDPR residency)"
- "Federated collectors across 3 k8s clusters"
- "KR 데이터 거주 요건으로 리전별 Collector 분리"
- "엔터프라이즈 테넌트 전용 Collector 분리"
- "How do I fan-out logs to two different Loki stacks by tenant tier?"

#### Primary Route

`resources/boundaries/multi-tenant.md`; `resources/transport/collector-topology.md`

#### Secondary Considerations

`resources/boundaries/cross-application.md` for trust boundary enforcement when routing crosses application domains

---

## Ambiguous / Fallback

When no intent is detected with confidence:

- Default to `investigate + tune` in parallel (observability work is often both diagnosing a problem and reducing noise)
- Present both result sets; let the user pick
- If automation is critical (e.g., CI pipeline), require the user to pass an explicit flag

**Ambiguity resolution examples:**

| Query | Detected Intent | Reason |
|-------|----------------|--------|
| "OTel Collector 설정" | `setup` (or `tune` if already deployed) | "설정" matches setup; check for existing deployment context |
| "p99 높음, 왜 그럼?" | `investigate` | Problem symptom + causal question |
| "샘플링 어떻게 해?" | `tune` | Sampling = throughput/cost optimization |
| "테넌트 데이터 분리" | `route` | Isolation + tenant framing |
| "SLO 알람 설정" | `alert` | SLO + alarm keywords |
| "Fluentd 버리고 싶어" | `migrate` | Deprecation + replacement intent |
| "Istio 트레이스 전파" | `trace` | Mesh + trace context propagation |
| "OTel 뭔가 이상함" (no detail) | `investigate + tune` fallback | No specific signal; dispatch parallel |

---

## Matching Algorithm

1. Lower-case both query and keyword list
2. For each intent, count keyword hits (whole-word boundary match)
3. Pick the intent with the highest score
4. On a tie, apply tiebreak priority: `investigate` > `setup` > `tune` > `alert` > `trace` > `route` > `migrate` (ordered by business-incident impact)
5. If all scores are zero: fall back to `investigate + tune` parallel with a clarification prompt

---

## Integration with Hooks

- Keywords from each intent feed `.agents/hooks/core/triggers.json` for auto-detection at `UserPromptSubmit`
- Intent classification result is consumed by `resources/execution-protocol.md §Step 1` to select the primary resource file set
- Override flags (`--investigate`, etc.) bypass keyword scoring entirely and force the named intent
