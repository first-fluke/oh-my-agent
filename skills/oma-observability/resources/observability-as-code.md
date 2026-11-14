# Observability-as-Code

## 1. Why Observability-as-Code

UI-edited dashboards and alerts accumulate silent debt:

- **No DR / no rollback.** A dashboard overwritten in the Grafana UI cannot be reverted without a backup.
- **No peer review.** Alert thresholds edited live bypass the same change-management gates required for code.
- **Scale problem.** 100+ dashboards across N environments managed by hand drift within weeks. Each environment develops its own undocumented fork.
- **Compliance.** SOC 2 change-management controls require an audit trail for every change to detection and response configuration. Git history provides that trail; Grafana's internal change log does not. Cross-ref `signals/audit.md` for evidence-specific integrity and retention controls.

The non-negotiable principle: version every observability artifact (dashboards, alert rules, SLO definitions, Collector config) in git, applied via CI/CD.

---

## 2. Artifact Map

Pick one source format per artifact and validate it in CI. Tool syntax changes between releases; take setup detail from the tool's current documentation (`/oma-search --docs "<tool> <topic>"`) and resolve image, chart, and provider versions at use time.

| Artifact | Source format | CI validation | Notes |
|----------|---------------|---------------|-------|
| Grafana dashboards | Grafonnet (Jsonnet) rendered to JSON, or the Terraform Grafana provider | `jsonnetfmt --test`, render step, dashboard linter | Provision from files and block UI edits (`allowUiUpdates: false`) |
| Vendor-neutral dashboards | Perses YAML (`percli lint`) | `percli lint` | Schema is still evolving; check its maturity before making it the only dashboard source |
| SaaS dashboards and monitors | The vendor's Terraform provider (Datadog, Honeycomb, Grafana Cloud) | `terraform validate` and plan review | Terraform authoring and plan review belong to `oma-tf-infra` |
| Prometheus alert rules | `PrometheusRule` CRD (`monitoring.coreos.com/v1`) | Extract `.spec`, then `promtool check rules` (Section 4) | Rule tests in Section 6 |
| Alert routing | Alertmanager YAML | `amtool check-config` | Webhook URLs and tokens come from a Secret, never inline |
| SLOs | OpenSLO YAML, or the native format of the generator in use (Sloth, Pyrra) | Generator's own validation | SLO math, the OpenSLO example, and tool options: `boundaries/slo.md` §5–§7. An OpenSLO document is not accepted by Sloth or Pyrra without a verified adapter |
| Collector config | `OpenTelemetryCollector` CRD (OTel Operator) or plain Collector YAML | `otelcol validate --config <file>` with the same distribution that will run it | Deployment modes and the agent manifest: `transport/collector-topology.md` |
| Auto-instrumentation | `Instrumentation` CRD (OTel Operator) | CRD schema validation | `layers/mesh.md` |

Delivery: a GitOps controller (Argo CD or Flux) reconciles the repository to the cluster. Scrape the controller's own metrics and alert on drift (`boundaries/release.md`); the observability stack depends on the same pipeline health as everything else (`meta-observability.md` Section A).

---

## 3. Alert Rule as Code (PrometheusRule)

The burn-rate thresholds and window math come from `boundaries/slo.md §7`; this section shows only the packaging. One rule is shown in full because the rule test in Section 6 asserts its labels and annotations. Add the slow-burn pair (6h / 30m, 6×) from `boundaries/slo.md §7.4` in the same group.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: checkout-slo-burn-rate
  namespace: monitoring
  labels:
    prometheus: kube-prometheus
    role: alert-rules
spec:
  groups:
    - name: checkout.slo.burn_rate
      interval: 30s
      rules:
        # Fast burn — 1h / 5m windows
        - alert: CheckoutSLOBurnRateFast
          expr: |
            (
              sum(rate(http_requests_total{service="checkout",status=~"5.."}[1h]))
              / sum(rate(http_requests_total{service="checkout"}[1h]))
            ) / (1 - 0.999) > 14.4
            and
            (
              sum(rate(http_requests_total{service="checkout",status=~"5.."}[5m]))
              / sum(rate(http_requests_total{service="checkout"}[5m]))
            ) / (1 - 0.999) > 14.4
          for: 2m
          labels:
            severity: critical
            slo: checkout-availability
          annotations:
            summary: "Checkout SLO fast burn above 14.4x"
            description: >
              Burn rate is {{ $value }} times the budget rate.
              At 14.4x, a full 28-day budget lasts about 46.7 hours;
              remaining-budget exhaustion depends on budget already spent.
            runbook: "https://wiki.example.com/runbooks/checkout-slo-fast-burn"
```

Pipeline self-health alerts that must exist before any other alert is trusted are in `meta-observability.md` Section F.

---

## 4. CI Validation

`promtool` reads a raw rule file whose top level is `groups:`. A `PrometheusRule` manifest wraps that under `.spec`, so passing the manifest straight to `promtool check rules` fails or checks nothing. Extract `.spec` first and validate the Kubernetes CRD schema separately:

```bash
# Requires promtool and mikefarah/yq v4 on the runner.
mkdir -p rendered-rules
for rule in alerts/*.yaml; do
  rendered="rendered-rules/$(basename "$rule")"
  yq eval '.spec' "$rule" > "$rendered"
  promtool check rules "$rendered"
done

amtool check-config alertmanager-config.yaml
otelcol validate --config otelcol-config.yaml   # use the distribution that will run the config
```

`otelcol validate` checks syntax and whether each component exists in that binary; a config that validates against `otelcol-contrib` can still fail on a custom or core distribution.

These are the checks to wire into the repository's CI. When working on a change, select the ones that apply; run them when the user or the active workflow asks, otherwise report them as not verified.

---

## 5. Review Workflow

All observability changes flow through the same review gate as application code:

| Step | Tool | What is checked |
|------|------|----------------|
| Open PR | GitHub / GitLab | Diff shows intent |
| CI: PromQL / rule lint | Extract `.spec`, then `promtool check rules` | Raw `groups` rule syntax and PromQL; validate the Kubernetes CRD separately |
| CI: rule tests | `promtool test rules` | Alerts fire, and stay silent, on fixture series (Section 6) |
| CI: Collector config lint | `otelcol validate` | Collector YAML syntax and component graph |
| CI: Jsonnet lint | `jsonnetfmt --test` | Grafonnet formatting |
| CI: Dashboard lint | Grafana dashboard linter | Panel best practices (no orphan panels, datasource vars set) |
| Peer review | CODEOWNERS | At least one SRE approval |
| Merge → main | CI gate | All checks must pass |
| CD apply | Argo CD / Flux | Reconciles to cluster; drift is surfaced |

Audit trail: git history records reviewed configuration changes. Select access, integrity, and retention controls for the required evidence; see `signals/audit.md`. WORM is conditional on the approved obligation.

Two rules that reviews enforce:

- **No inline secrets.** Backend API keys, service-account tokens, and webhook URLs are referenced through `secretKeyRef` (External Secrets Operator, Sealed Secrets, or the cloud secret store), never committed in dashboard YAML, `values.yaml`, or Collector config.
- **Parameterize, do not duplicate.** One dashboard and one rule source per concern, with the environment as a template variable or overlay value. Per-environment copies diverge.

---

## 6. Testing Alert Rules

Feed fixture series to the extracted rule file and assert the alert, its labels, and its annotations:

```yaml
# promtool rule test — tests/checkout_slo_test.yaml
# First extract the CRD .spec to the raw groups file referenced here.
rule_files:
  - ../rendered-rules/checkout-slo-burn-rate.yaml

tests:
  - interval: 1m
    input_series:
      - series: 'http_requests_total{service="checkout",status="500"}'
        values: "0+100x10"    # 100 errors/min for 10 minutes
      - series: 'http_requests_total{service="checkout",status="200"}'
        values: "0+900x10"    # 900 success/min
    alert_rule_test:
      - eval_time: 10m
        alertname: CheckoutSLOBurnRateFast
        exp_alerts:
          - exp_labels:
              severity: critical
              slo: checkout-availability
            exp_annotations:
              summary: "Checkout SLO fast burn above 14.4x"
              description: >
                Burn rate is 100 times the budget rate.
                At 14.4x, a full 28-day budget lasts about 46.7 hours;
                remaining-budget exhaustion depends on budget already spent.
              runbook: "https://wiki.example.com/runbooks/checkout-slo-fast-burn"
```

Add a negative case (error ratio below the threshold, no alert expected) for every alert. Dashboards have no equivalent unit test: render them in CI and review the rendered JSON diff.
