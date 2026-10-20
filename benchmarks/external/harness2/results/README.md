# Harness² results

Every non-plan run writes a manifest here:

```
results/<run-id>/manifest.json
results/<run-id>/report.txt   # optional, when `report` runs
```

Commit only the manifest and the report. Raw model output stays under
`results/<run-id>/runs/` and is gitignored, as are demo output and the
`dependencies/` checkout.

## Manifest fields

| Field | Meaning |
|---|---|
| `oma_commit` | OMA commit the run was launched from |
| `harness2.repo/ref/commit` | Upstream Harness² source and resolved commit |
| `bench`, `subset`, `substrate` | Benchmark cell |
| `k`, `mode`, `seed` | Recursion budget and run identity |
| `only_domains`, `max_tasks`, `workers` | Task-stream filters |
| `dry_run` | Whether the upstream command used `--dry-run` |
| `network_policy` | Egress restriction text supplied by the operator |
| `models` | Solver / improver / judge model IDs (or `upstream-default`) |
| `vertex.project/region` | Vertex target, when set |
| `started_at`, `finished_at`, `exit_code` | Run lifecycle |
| `commands` | Exact commands executed |

Do not add tokens, API keys, or full environment dumps to manifests.