# Intent Classification Rules

## Purpose

- Classify a request into one of 7 intents when no override flag is present and the intent is not obvious.
- Used by Step 1 of `execution-protocol.md`. Routes per intent live in `SKILL.md` §Routes (Intent); this file only decides which intent applies.
- Activation keywords (all locales) are owned by `.agents/hooks/core/triggers.json §oma-observability.keywords`; do not duplicate token lists here.

## Classification Priority

1. **Override flags** always win and skip classification: `--setup`, `--migrate`, `--investigate`, `--alert`, `--trace`, `--tune`, `--route`.
2. **Distinguishing signals** in the request (table below).
3. **Tiebreak** when two intents fit equally: `investigate` > `setup` > `tune` > `alert` > `trace` > `route` > `migrate` (ordered by business-incident impact).
4. **No clear signal**: pick the single route best supported by the request and the project context. Inspect local context first; ask only for the fact that decides between routes. Never dispatch two playbooks in parallel.

## The 7 Intents

| Intent | Use when | Distinguishing signals |
|--------|----------|------------------------|
| `setup` | Bootstrapping a pipeline or instrumenting a service from scratch | "How do I add OTel to …"; a new service, environment, or cluster with no existing config; SDK or Collector install |
| `migrate` | Moving off a legacy tool (log agent, APM platform) | A source tool name plus "replace", "away from", "moving off"; measured resource or plugin constraints |
| `investigate` | Something is broken, degraded, or slow right now | HTTP status codes or error-rate numbers; a region or service name with a symptom; "suddenly", "after deploy", a time window; edge 403s or WAF blocks; a suspected third-party outage |
| `alert` | Defining alerts, SLOs, or burn-rate rules | SLO/SLI/SLA, error budget, "alert when …", PrometheusRule, burn rate |
| `trace` | Designing or debugging propagation and context | "Trace breaks", "missing parent span"; propagator names (W3C, B3, X-Ray); mesh or gateway plus trace context; baggage keys |
| `tune` | Reducing cost, cardinality, or volume; fixing pipeline throughput | A bill that "jumped"; label explosion; sampling ratio; UDP MTU or OTLP throughput; backpressure |
| `route` | Tenant, cloud, or region routing, isolation, residency, federation | A region plus a residency or compliance requirement; "tenant A vs tenant B" separation; several Collectors or clusters with routing context |

Symptom-specific guides attach to the intent through `SKILL.md` §References. Examples: an `investigate` request about edge 403s adds `layers/L7-application/waf.md`; a `tune` request about a metrics bill goes to `meta-observability.md` Section C, not to the transport guides; a `tune` request about per-tenant cost adds `signals/cost.md`.

## Ambiguity Resolution Examples

| Query | Intent | Reason |
|-------|--------|--------|
| "OTel Collector configuration" | `setup` (`tune` if one is already deployed) | Check for an existing deployment before choosing |
| "p99 high, why?" | `investigate` | Symptom plus causal question |
| "How do I sample?" | `tune` | Sampling is volume and cost optimization |
| "Tenant data isolation" | `route` | Isolation plus tenant framing |
| "SLO alert setup" | `alert` | SLO and alarm terms outrank "setup" |
| "Want to drop Fluentd" | `migrate` | Explicit replacement intent |
| "Istio trace propagation" | `trace` | Mesh plus context propagation |
| "Datadog bill jumped 3x" | `tune` | Cost symptom; route to cardinality guardrails and sampling |
| "Customers get 403 but the backend looks fine" | `investigate` | Edge symptom; add the WAF guide |
| "Something off with OTel" (no detail) | none yet | Inspect configs and recent changes; ask for the symptom or the signal type if nothing local decides it |

## Integration with Hooks

- `triggers.json` activates the skill at `UserPromptSubmit`; this file is consulted only after activation.
- When a new domain needs activation tokens (for example WAF or cascading failure), add them to `triggers.json` and add a row to `SKILL.md` §References for the guide it should load.
