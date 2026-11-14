# Cost Signal

## 1. Scope & Boundary

Cost is the 6th signal in the `oma-observability` skill. It sits alongside metrics, logs, traces, profiles, audit, and privacy in the 4 × 4 × 7 coverage matrix.

**In scope:**
- Cost as a telemetry signal: metric surface (OpenCost Prometheus exposition), attribution rules, and unit economics
- Kubernetes-native cost allocation via OpenCost
- Per-tenant cost attribution (B2B SaaS) and per-feature cost deltas
- Cross-cloud and egress cost attribution
- Retention policy and access-control rules for cost data
- Cardinality rules specific to cost labels

**Out of scope:**
- Full FinOps strategy: procurement, Reserved Instances / Savings Plans, commitment analysis, contract negotiation; see [FinOps Foundation framework](https://www.finops.org/framework/)
- LLM token-cost observability (prompt versioning, evals, model routing economics); see Langfuse, Arize Phoenix, LangSmith
- Cluster cost optimization (rightsizing, spot orchestration): see Kubecost commercial tier or CloudZero

**Distinct boundary with `../boundaries/multi-tenant.md §Cost Attribution`:** that file uses cost as a _routing signal_ (tenant chargeback, showback, residency). This file defines cost as a _telemetry signal_; what to collect, how to attribute it, and how to store it. Read both for tenant chargeback work.

Cost differs from the other signals in source (cloud billing APIs plus a Kubernetes allocation engine, not instrumented code), granularity (hourly or daily aggregates, not per-request), and primary consumer (Finance and Platform Engineering). `$ per request`, `$ per tenant`, and `$ per feature` therefore require joining billing data with application telemetry; neither source alone is sufficient.

---

## 2. OpenCost

Sources:
- <https://www.opencost.io/>
- <https://github.com/opencost/opencost>

OpenCost is the open-source Kubernetes cost monitoring project (CNCF Incubating; confirm current status at <https://www.cncf.io/projects/opencost/> when it is load-bearing). Kubecost (IBM) builds its commercial tier (UI, recommendations, multi-cluster federation) on the OpenCost core.

### 2.1 Architecture

```
Cloud Billing API (AWS CUR / GCP Billing Export / Azure Cost Management)
        |
        v
+----------------+        /metrics (Prometheus format)
| OpenCost Pod   | -----> Prometheus scrape -----> OTel Collector prometheusreceiver
| (namespace:    |                                          |
|  opencost)     |                                          v
+----------------+                               Your TSDB backend
        |                                        (Thanos / Mimir / VictoriaMetrics)
        v
Kubernetes API (node prices, pod labels, PVC claims)
```

The OpenCost pod reads node price data from a cloud-provider price configmap (or the cloud billing API directly), reads Kubernetes resource allocations from the kubelet and API server, and exposes Prometheus metrics at port 9003.

### 2.2 Key Metrics Exposed

Source: <https://opencost.io/docs/integrations/metrics/>. OpenCost exposes allocation quantities and unit/hourly prices; it does not automatically emit namespace/workload cost counters. Label-based tenant/workload totals require explicit API aggregation or verified recording rules.

| Metric | Unit | Purpose |
|--------|------|---------|
| `node_cpu_hourly_cost` | USD / core-hour | Node CPU unit price |
| `node_ram_hourly_cost` | USD / GiB-hour | Node memory unit price |
| `node_total_hourly_cost` | USD / hour | Total node rate |
| `container_cpu_allocation` | cores | Allocated container CPU |
| `container_memory_allocation_bytes` | bytes | Allocated container memory |
| `pod_pvc_allocation` | bytes | Allocated PVC storage |
| `pv_hourly_cost` | USD / GiB-hour | Persistent-volume unit price |
| `kubecost_network_internet_egress_cost` | USD / GiB | Internet egress price; multiply by attributed usage |
| `kubecost_load_balancer_cost` | USD / hour | Load-balancer rate |
| `kubecost_cluster_management_cost` | USD / hour | Cluster management rate |

### 2.3 Scrape Configuration (OTel Collector)

Scraping OpenCost through `prometheusreceiver` puts cost in the same TSDB as latency and error metrics. This is the single copy of the scrape config in this skill.

```yaml
receivers:
  prometheus:
    config:
      scrape_configs:
        - job_name: opencost
          scrape_interval: 60s
          static_configs:
            - targets: ["opencost.opencost.svc.cluster.local:9003"]
```

### 2.4 Allocation Model

Three allocation categories: compute (CPU + RAM), storage (PVC), and network (egress bytes). Each workload receives a share of node cost proportional to resource requests. Idle cost distributes across active workloads or a dedicated `__idle__` namespace via configurable rules. Cross-cloud pricing is supplied via a price configmap; on-prem environments set custom `$/CPU-hr` and `$/GB-RAM-hr` values.

---

## 3. Cost Attribution by Dimension

| Dimension | Kubernetes mechanism | Label / attribute |
|-----------|---------------------|-------------------|
| Namespace / team | Namespace label → team ownership mapping | `namespace`, `team` |
| Workload | Deployment / StatefulSet / DaemonSet name | `workload`, `controller_kind` |
| Tenant (B2B SaaS) | `tenant.id` label on pods + W3C Baggage propagation | `tenant_id` |
| Feature | Custom pod label (`feature.name`) | `feature_name` |

**Tenant attribution** is the primary B2B SaaS use case: tag every pod with `tenant.id` at deploy time (Helm values or admission webhook), then request the appropriate label aggregation from the OpenCost Allocation API or explicitly join allocation metrics to verified ownership metadata. Pod labels alone do not create a new cost counter at `/metrics`, and without the label chargeback is impossible. Cross-ref `../boundaries/multi-tenant.md §Cost Attribution` for chargeback and showback patterns. **Feature attribution** uses a custom pod label (`feature.name`); cross-ref `../boundaries/release.md` for canary and A/B cost comparison.

---

## 4. Unit Economics

Compute costs with matching units and attribution scope. The default OpenCost metrics support this namespace compute-cost rate (USD/hour):

```promql
sum by (namespace) (
  container_cpu_allocation
    * on(node) group_left node_cpu_hourly_cost
  + container_memory_allocation_bytes
    * on(node) group_left node_ram_hourly_cost / (1024 * 1024 * 1024)
)
```

This covers CPU and memory only. Add PVC, attributed network usage, load-balancer, shared/idle, and management costs according to the allocation model before treating the result as a total bill. For tenant/workload daily totals, use the OpenCost Allocation API's window and aggregation controls rather than assuming a workload counter exists. Source: <https://opencost.io/docs/integrations/api/>.

**Per-request cost (custom counter example, rolling 1-hour window):**

The following query requires a separately implemented monotonic `workload_cost_usd_total` counter in USD and an ownership mapping to the same workload. It is a team-defined export, not an OpenCost default metric. Verify that costs and request counts cover the same scope and time window.

```promql
sum(rate(workload_cost_usd_total{workload="checkout-api"}[1h]))
  /
sum(rate(http_requests_total{job="checkout-api"}[1h]))
```

Both rates are per second, so the result is USD/request; do not multiply only one side by 3600. An hourly cost gauge must instead be divided by requests/hour.

For gold/silver SLO-tier cost comparisons, compare their allocated costs over the same window and attribution scope, and report the corresponding SLI measurements. Do not compare lifetime cumulative counters as a current tier-cost ratio. Cost is an input to choosing an SLO tier; it is not itself an error-budget SLO.

---

## 5. Cross-Cloud Cost

Each cloud exposes billing data through a distinct API and export format. FOCUS (FinOps Open Cost and Usage Specification) is the data-format unification effort.

| Cloud | Billing data source | Export format | Ingestion path |
|-------|--------------------|----|------|
| AWS | Cost & Usage Report (CUR) | Parquet / CSV → S3 | Athena query → OpenCost price configmap |
| GCP | Billing Export | BigQuery table | BigQuery export job → OpenCost |
| Azure | Cost Management Export | CSV → Blob Storage | Storage export → OpenCost |
| On-prem | Manual price configmap | Custom `$/CPU-hr`, `$/GB-hr` | OpenCost configmap |

**FOCUS Spec** (<https://github.com/FinOps-Open-Cost-and-Usage-Spec/FOCUS_Spec>) provides a vendor-neutral column schema (`BilledCost`, `ResourceId`, `ServiceName`) for cross-cloud cost joins. When FOCUS exports are available from a cloud provider, prefer them over native formats. For the OSS multi-cluster path, run one OpenCost instance per cluster and aggregate in Thanos or Mimir by namespace and workload labels.

### 5.1 Egress Attribution

Egress is often the largest surprise cost in multi-cloud or CDN-heavy architectures, and it is absent from a CPU + memory cost query.

- Use the egress unit-price metric (`kubecost_network_internet_egress_cost`) multiplied by attributed network usage, or the Allocation API's network cost, and set an egress budget alert.
- L3 flow-log byte counts per tenant VPC/CIDR and L4 byte volume per tenant are a cost **proxy**. They are sufficient for explaining a cloud egress bill but not for unit economics, which needs L7 per-request attribution. Cross-VPC attribution is unreliable without flow tagging.
- Mesh telemetry (per-service byte and request counts from the proxy) is the bridge between the L3/L4 proxy and L7 unit cost.

---

## 6. Retention Policy

Example schedule; set the actual periods from the organization's finance and audit retention requirements.

| Data type | Retention | Rationale |
|-----------|-----------|-----------|
| Raw cloud billing data (CUR / GCP export) | 2 years | Financial audit evidence |
| OpenCost Prometheus metrics (hourly resolution) | 2 years | Chargeback evidence per tenant |
| Aggregated per-tenant / per-feature cost | Long-term (cold storage) | Historical unit economics trending |
| Per-request cost attributes on spans | 30–90 days | Operational debugging window |

Cross-ref `../meta-observability.md` (Section D: Retention Matrix) for the retention policy covering all seven signals.

---

## 7. Privacy & Access Control

Cost per tenant reveals revenue tier, contract value, and resource consumption patterns. Restrict access by role and never embed cost dashboards publicly:

| Role | Dashboard access | Data access |
|------|-----------------|-------------|
| Finance | Full cost by tenant, contract | Billing export (read-only) |
| Platform Engineering | Cost by namespace, workload, cluster | OpenCost metrics (read-only) |
| Application Engineering | Cost by their own service / namespace | Filtered by namespace label |
| Tenant admin (self-serve) | Their own tenant cost only | Filtered by `tenant_id` claim |

Cross-ref `privacy.md §11 Backend Access Control (RBAC on Observability Data)` for role-scoped access patterns.

---

## 8. Anti-Cardinality Rules for Cost Labels

Follow the same principles as metric labels (cross-ref `../meta-observability.md`, Section C: Cardinality Guardrails). Cost workloads add one more risk surface: dynamic tenant growth.

| Rule | Applies to | Rationale |
|------|-----------|-----------|
| `tenant.id` allowed as metric label with top-N cap (≤ 1000) | OpenCost metrics | Bounded tenant count; use `"other"` bucket for overflow |
| `namespace` and `workload` always allowed | OpenCost metrics | Bounded by cluster size |
| `feature.name` allowed as pod label; allowed as metric label with cap | OpenCost workload attribution | Feature set is bounded; gate new features through label allowlist |
| `request.id` never as metric label for cost | Any | Unbounded cardinality; use trace attribute only |
| One cost metric with a bounded tenant dimension; never one metric name per tenant | Any | Per-tenant metric names bypass TSDB cardinality controls and cannot be aggregated |

Per-request cost values are safe only as trace span attributes, where cardinality is handled by the trace backend (not a TSDB). Aggregate by `tenant.id`, `namespace`, and `workload` for metric surfaces.

---

## 9. Vendors

Selection guidance (OpenCost, Kubecost, CloudZero, Vantage, and others) is in `../vendor-categories.md` category (f) FinOps / Cost Observability. Verify current project and vendor status there or at <https://landscape.cncf.io> when the choice is load-bearing.

---

## Cross-References

| Topic | File |
|-------|------|
| Tenant cost chargeback and routing | `../boundaries/multi-tenant.md §Cost Attribution` |
| Canary cost delta and A/B comparison | `../boundaries/release.md` |
| Cardinality guardrails and top-N cap | `../meta-observability.md` (Section C) |
| Retention matrix (all signals) | `../meta-observability.md` (Section D) |
| Cost dashboard RBAC | `privacy.md §11 Backend Access Control (RBAC on Observability Data)` |
| Vendor selection (FinOps category) | `../vendor-categories.md` category (f) |
| Coverage matrix with cost column | `../matrix.md` |
