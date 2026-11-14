# SLO Boundary

## 1. Scope

SLO (Service Level Objective) is the contractual reliability target bounding acceptable error rates
and response times. Covers: SLI definition, SLO math, error budget, burn-rate alerts, tool options.

Out of scope: dashboard config (`../observability-as-code.md`); progressive delivery gates (`release.md`);
pipeline SLOs (`../meta-observability.md §Section F`).

---

## 2. Terminology

| Term | Definition | Example |
|------|-----------|---------|
| **SLI** | Measurable property of a service | 99.2% of requests returned 2xx in past 30d |
| **SLO** | Internal reliability target | 99.9% availability, 28-day rolling window |
| **SLA** | Customer contract with consequences | SLO − buffer; breach triggers credits |
| **Error budget** | `100% − SLO`; headroom before breach | 0.1% = 43.2 min/month at 99.9% SLO |

Rule: SLA target < SLO target. Never set SLA = SLO (no operations buffer).

---

## 3. SLI Selection

| Method | Best for | Signals |
|--------|---------|---------|
| Golden Signals (Google SRE) | Any service | Latency, Traffic, Errors, Saturation |
| RED | Request-serving | Rate, Errors, Duration |
| USE | Resources | Utilization, Saturation, Errors |

SLI PromQL for availability and latency is in §4.

---

## 4. SLO Math

Availability SLI (28-day rolling window):

```promql
sum(rate(http_requests_total{status=~"2..|3.."}[28d]))
  / sum(rate(http_requests_total[28d]))
```

Latency SLI (fraction of requests under 300ms):

```promql
sum(rate(http_request_duration_seconds_bucket{le="0.3"}[28d]))
  / sum(rate(http_request_duration_seconds_count[28d]))
```

---

## 5. OpenSLO Spec

Source: <https://openslo.com>; community-driven, not CNCF. Vendor-neutral YAML; validate support in the selected consumer or adapter. Sloth and Pyrra native formats are separate.

```yaml
apiVersion: openslo/v1
kind: SLO
metadata:
  name: checkout-availability
spec:
  service: checkout
  budgetingMethod: Occurrences
  timeWindow:
    - duration: 28d
      isRolling: true
  objectives:
    - target: 0.999
  indicator:
    metadata:
      name: checkout-success-ratio
    spec:
      ratioMetric:
        counter: false # queries return window counts, not monotonic counters
        good:
          metricSource:
            type: Prometheus
            spec:
              query: sum(increase(http_requests_total{service="checkout",status=~"2..|3.."}[28d]))
        total:
          metricSource:
            type: Prometheus
            spec:
              query: sum(increase(http_requests_total{service="checkout"}[28d]))
```

The v1 structure follows <https://openslo.com/specification/>.
`metricSource.spec` is implementation-defined: verify the chosen consumer's
Prometheus adapter, window evaluation, and counter semantics. This example
does not imply Sloth or Pyrra directly accepts OpenSLO; native definitions
require a verified adapter/conversion if OpenSLO is the input.

---

## 6. Tool Options

| Tool | Type | Output |
|------|------|--------|
| Sloth | OSS CLI + k8s operator | PrometheusRule CRDs |
| Pyrra | OSS CLI + k8s operator | PrometheusRule CRDs |
| Grafana SLO | Grafana Cloud product | Cloud-native alerts |
| Nobl9 | Commercial SaaS | Multi-backend |
| Google Cloud Service Monitoring | GCP-native | GCP alerts |

Sloth and Pyrra are the recommended OSS path for Kubernetes-native GitOps deployments. Confirm
current project status at use time; see `../vendor-categories.md` for the OSS full-stack category.

---

## 7. Burn-Rate Alert Design

### 7.1 Problem

A simple error-budget-exhausted alert fires after damage is done. Multi-window burn-rate alerts
detect fast-burning incidents while they still have budget remaining.

Source: <https://sre.google/workbook/alerting-on-slos/>

### 7.2 Multi-Window Tiers (99.9% SLO)

| Tier | Budget consumed | Long window | Short window | Multiplier | Action |
|------|----------------|------------|-------------|-----------|--------|
| Fast burn | About 2.14% of 28d in 1h | 1h | 5m | 14.4× | Page immediately |
| Slow burn | About 5.36% of 28d in 6h | 6h | 30m | 6× | Create ticket |

**Window arithmetic:** a 28-day window is 672h. The classic 30-day
thresholds 14.4× and 6× consume about 2.14% in 1h and 5.36% in 6h
when used unchanged for 28d. For exactly 2% and 5%, use 13.44× and
5.6× respectively. Full-budget exhaustion at constant burn is
`window_hours / burn_rate`; remaining budget changes that horizon.

### 7.3 Fast Burn PromQL

```promql
(
  (1 - sum(rate(http_requests_total{status=~"2..|3.."}[1h]))
         / sum(rate(http_requests_total[1h])))
  > (1 - 0.999) * 14.4
)
and
(
  (1 - sum(rate(http_requests_total{status=~"2..|3.."}[5m]))
         / sum(rate(http_requests_total[5m])))
  > (1 - 0.999) * 14.4
)
```

### 7.4 Slow Burn PromQL

```promql
(
  (1 - sum(rate(http_requests_total{status=~"2..|3.."}[6h]))
         / sum(rate(http_requests_total[6h])))
  > (1 - 0.999) * 6
)
and
(
  (1 - sum(rate(http_requests_total{status=~"2..|3.."}[30m]))
         / sum(rate(http_requests_total[30m])))
  > (1 - 0.999) * 6
)
```

The short window gates the long window: long window detects sustained burns; short window
suppresses false positives from transient spikes.

---

## 8. Error Budget Policy

| Budget remaining | Action |
|-----------------|--------|
| > 50% | Normal feature velocity |
| 25–50% | Review reliability vs feature ratio |
| < 25% | Reliability sprint |
| 0% (exhausted) | Freeze deploys until budget recovers |

Cross-ref `release.md`; Flagger and Argo Rollouts use the SLI error rate as canary promotion gate;
the same threshold enforces budget-aware deployment freeze.

---

## 9. Cross-Integration

| File | Integration |
|------|------------|
| `release.md` | Flagger/Argo use SLI metric for canary promotion; SLO failure = rollback |
| `../observability-as-code.md` | OpenSLO YAML in Git; Sloth/Pyrra generate PrometheusRule CRDs in CI |
| `../meta-observability.md §Section F` | Pipeline has its own burn-rate alerts for computation lag |

---

## References

- Google SRE Workbook: Alerting on SLOs: <https://sre.google/workbook/alerting-on-slos/>
- OpenSLO specification: <https://openslo.com>
- Sloth: <https://github.com/slok/sloth>
- Pyrra: <https://github.com/pyrra-dev/pyrra>
- Grafana SLO plugin: <https://grafana.com/grafana/plugins/grafana-slo-app>
