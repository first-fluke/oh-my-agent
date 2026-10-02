---
name: deepsec
description: Drive the `oma-deepsec` skill end-to-end. Installs `.deepsec/`, calibrates cost, runs the right scan/process/triage/revalidate/export pass, gates PRs with `process --diff`, writes custom matchers, and routes findings to follow-up specialists.
disable-model-invocation: true
---

- **Response language follows `language` setting in `.agents/oma-config.yaml` if configured.**
- Follow `.agents/skills/_shared/core/execution-policy.md` for authorization, clarification, verification, and completion. Execute required steps on the selected path in dependency order; apply documented branch and skip conditions.
- **Do NOT modify product source code in this workflow.** Findings that need code edits hand off to `oma-debug` / `oma-backend` / `oma-frontend` / `oma-mobile` / `oma-tf-infra` / `oma-db` in Step 5.
- **Read the skill before acting.** Step 1 mandates loading `.agents/skills/oma-deepsec/SKILL.md` and only the resource files needed for the resolved intent.
- **Calibrate before any unbounded `process`.** Deepsec docs (`getting-started.md`, `vercel-setup.md`, `faq.md`) recommend `--limit 50 --concurrency 5`. Defer to a user-named value if given.
- **Resume, do not reset.** On any interruption (Ctrl-C, network blip, quota stop), re-run the same command. Never delete `data/<id>/` to "start clean" without explicit user instruction.

---

> **Vendor note:** This workflow executes inline (no subagent spawning). All vendors invoke the deepsec CLI directly; the skill body and resource files contain the canonical commands.

---

## L1 Decision Events

Emit required L1 decisions by calling `oma state emit` directly, as documented in `.agents/skills/_shared/runtime/event-spec.md`.

---

## Step 1: Load the skill

Read `.agents/skills/oma-deepsec/SKILL.md` in full. Do **not** preload all `resources/*.md`. Load only what the resolved intent in Step 2 requires:

| Intent | Resource(s) to read |
|--------|--------------------|
| `setup` | `resources/setup.md` (+ `resources/config.md` if credentials are unclear) |
| `scan` | `resources/scanning.md` (+ `resources/setup.md` if `.deepsec/` is missing) |
| `pr-review` | `resources/pr-review.md` (+ `resources/config.md` for env vars in CI) |
| `matchers` | `resources/matchers.md` (+ `resources/scanning.md` for the supporting scan + process pass) |
| `triage` | `resources/triage.md` (+ `resources/scanning.md` if `revalidate` has not run yet) |
| `config` / `troubleshoot` | `resources/config.md` |

Confirm whether `.deepsec/` already exists at the target repo root. If yes, treat the run as **incremental**, never re-`init`.

---

## Step 2: Classify intent

Resolve `intent` from the user prompt into exactly one of:

- `setup`: first-time install, `.env.local` credential, populate `INFO.md`.
- `scan`: calibration → full `process` → triage → revalidate → export pipeline.
- `pr-review`: `process --diff` direct mode plus CI gating workflow.
- `matchers`: author project-specific matchers and close entry-point gaps.
- `triage`: read existing findings, cut FPs, prioritize, hand off.
- `config`: edit `deepsec.config.ts`, env vars, plugins, model defaults.
- `troubleshoot`: diagnose missing credentials, quota stops, refusals, sandbox auth.

If the user's request implies multiple intents (typical for a fresh repo: `setup` → `scan`), execute them sequentially in that order.

If `.deepsec/` does not exist and the intent involves AI calls (`scan` / `pr-review` / `matchers` / `triage`), insert `setup` ahead of the requested intent and tell the user.

---

## Step 3: Resolve backend, scope, and spend

Reuse the backend, file/matcher scope, severity floor, limits, and spend authorization already supplied by the user or project configuration. A configured backend identifies the tool; it does not authorize additional spend. Resolve routine choices within delegated scope. Ask only for a material unresolved choice or spend outside existing authorization.

Before any paid call (`process` / `revalidate` / `triage`) or a selected custom scope/backend, follow `.agents/skills/oma-deepsec/resources/decision-records.md` § Execution scope. Record the actual approved, limited, or declined action with its backend, scope, estimate, stopping limit, and authorization source. This conditional event records the decision; it does not require another confirmation. A declined paid pass stays declined; continue only authorized free or limited work.

---

## Step 4: Execute the resolved intent

Run from inside `.deepsec/`. `bunx deepsec …` is interchangeable with `pnpm deepsec …` / `npm exec deepsec …` / `yarn deepsec …`; pick what the project's lockfile already implies.

### Step 4A: `setup`

```bash
cd <target-repo>
bunx deepsec init
cd .deepsec
bun install
```

Edit `.env.local` per `resources/setup.md` § 2 (AI Gateway key, OIDC, direct provider, or subscription).

Verify:

```bash
bunx deepsec scan --limit 20         # cheap, no AI calls
bunx deepsec process --limit 5       # exercises the gateway
```

Then write `data/<id>/INFO.md` per `resources/setup.md` § 4: 50–100 lines, project-specific only, 3–5 examples per section, no line numbers, no generic CWE rehash. Apply `.agents/skills/_shared/core/execution-policy.md`: proceed within existing authorization; ask only for a material missing decision or new authorization.

### Step 4B: `scan`

1. **Scan** (free, no AI):
   ```bash
   bunx deepsec scan
   bunx deepsec status
   ```
2. **Calibrate** within the recorded authorization, using the deepsec-recommended values or user-named limits. Record the execution-scope decision before this paid pass; a file-count limit is not a spend cap:
   ```bash
   bunx deepsec process --limit 50 --concurrency 5
   ```
3. **Report cost extrapolation**: read the calibration run's total cost, multiply by `(total_files / 50)`, present to the user with the cost-band table from `resources/scanning.md`. If the CLI reports only a per-batch cost, multiply by `(total_files / batch_size)` instead (`--batch-size` defaults to 5, so the `--limit 50` calibration runs 10 batches). Cross-check against the cost-band table before reporting. **Before launching full `process`, record the approved, limited, or declined scope against this estimate using the execution-scope protocol. Reuse existing authorization when it covers the backend, scope, and estimated spend; otherwise resolve only the missing authorization. Use a limited pass or stop when the full pass is not authorized.**
4. **Full investigation**:
   ```bash
   bunx deepsec process --concurrency 5
   ```
5. **Triage and revalidate** (worth running on `HIGH+`):
   ```bash
   bunx deepsec triage --severity HIGH
   bunx deepsec revalidate --min-severity HIGH
   ```
6. **Record verdicts before filtering or export**: follow `.agents/skills/oma-deepsec/resources/decision-records.md` § Finding verdicts for every triaged finding, including false positives and fixed findings that will be suppressed. Bind each event and verification to its finding and analysis/revalidation revision.
7. **Export**:
   ```bash
   bunx deepsec export --format md-dir --out ./findings
   bunx deepsec metrics
   ```

If a run halts on quota / credit / Ctrl-C, **re-run the same command** after the printed remediation. Files already done are skipped. Never `rm -rf data/<id>/`.

### Step 4C: `pr-review`

Use direct mode for scoped CI review:

```bash
bunx deepsec process \
  --diff origin/${BASE_REF} \
  --comment-out comment.md
```

For CI wiring, emit the **two-job pattern** from `resources/pr-review.md`:
- `analyze` runs PR-controlled code with the AI gateway secret but **no `pull-requests: write`**.
- `comment` has `pull-requests: write` but never runs PR code; consumes only the sanitized `comment.md` artifact.

Exit-code semantics: `0` = no findings, `1` = at least one **net-new** finding (gates the build), other = runtime error.

**Pin actions to full SHAs** in production CI; major-version tags are for examples only.

### Step 4D: `matchers`

Precondition: at least one `scan` + `process` pass exists in `data/<id>/`. If not, run Step 4B at least through the calibration `process --limit 50` first.

Follow `resources/matchers.md` workflow:

1. Read the contract in `.deepsec/node_modules/deepsec/dist/config.d.ts` and `samples/webapp/matchers/*`.
2. Walk `data/<id>/files/` to identify entry-point coverage gaps.
3. Walk the parent repo to enumerate route / handler / RPC / queue / cron entry points.
4. Write per-slug matchers to `.deepsec/matchers/<slug>.ts` with the right noise tier (`precise` / `normal` / `noisy`) and tight `filePatterns`.
5. Wire the inline plugin in `.deepsec/deepsec.config.ts`.
6. Verify hit rate:
   ```bash
   bunx deepsec scan --matchers <slug1>,<slug2>
   ```
   Sweet spots per `resources/matchers.md`: `precise` 1–20 / 1k files, `normal` 5–100 / 1k files, `noisy` ≈ entry-point count of the targeted framework.

### Step 4E: `triage`

Pipeline per `resources/triage.md`:

1. `bunx deepsec triage --severity HIGH` to bucket P0/P1/P2/skip (~$0.01 / finding).
2. `bunx deepsec revalidate --min-severity HIGH` to attach `true-positive` / `false-positive` / `fixed` / `uncertain` verdicts (cuts FP rate by 50%+).
3. Record and verify each finding verdict using `.agents/skills/oma-deepsec/resources/decision-records.md` § Finding verdicts before filtering, suppression, or export. Include the finding identity, actual verdict, causal evidence, and analysis/revalidation revision.
4. Filter the export to verdict `true-positive` (and `uncertain` for human review). Suppress `false-positive` and matched-`fixed` only after their verdict events are recorded.
5. Note recurring FP shapes for the next `INFO.md` revision; bias matchers toward `precise` if the FP is regex-level.

### Step 4F: `config` / `troubleshoot`

Use `resources/config.md`. For credential / quota / refusal failures, match the symptom against the table there and apply the printed fix.

---

## Step 5: Summarize and route

Produce a short report in the user's response language:

```markdown
## deepsec run summary
- Repo: <path>  • Project id: <id>
- Pass: <setup | scan-calibrated | scan-full | pr-review | matchers | triage>
- Agent: <claude | codex>  • Model: <id>
- Files scanned: <n>  • Findings: <n>  • TP after revalidate: <n>
- Cost: $<x>  • Wall time: <m> min
- Files written: <list>
- Stop conditions hit: <none | quota | refusal | user halt>

## Findings (severity ≥ <floor>)
- <severity> · <vulnSlug> · <filePath>:<line> · <title>  [<verdict>]
…

## Follow-ups
- <item>
```

Then **route follow-ups** by finding shape (do not implement code yourself):

Route by **the layer of the vulnerable file**, not by "is it a bug". The agent makes the layer call from each finding's `filePath` + `vulnSlug` + `revalidation.verdict`, with `data/<id>/tech.json`, `INFO.md`, `priorityPaths`, and the project's actual directory structure as project-specific signals.

Do **not** maintain a global slug→layer or path-glob enumeration in this workflow. Deepsec adds matchers continuously and project layout varies, so trust the artifact at runtime.

| Layer of the vulnerable file | Specialist |
|---|---|
| Backend / server / API | `oma-backend` |
| Frontend / web client | `oma-frontend` |
| Mobile / native client | `oma-mobile` |
| IaC / cloud / network | `oma-tf-infra` |
| Database / data model | `oma-db` |
| CI / workflow / supply chain | `oma-dev-workflow` (or this workflow's PR-review pattern for the deepsec gate itself) |
| Documentation drift surfaced by the run | `oma-docs` |
| New entry-point gap (a cluster of `other-*` slugs or a framework deepsec does not glob) | re-enter Step 4D (`matchers`) |

**Ambiguity → `oma-debug` first.** Route to `oma-debug` whenever the layer is not obvious from the artifact: shared / isomorphic / utility code, an `other-*` slug, a fix that would touch multiple layers, `revalidation.verdict === "uncertain"`, or `BUG` / `HIGH_BUG` non-security correctness without an obvious owner. The hop is **triage, not fix**: pin the exact file:line and re-route to the correct specialist with a layer-tagged finding, or fix inline only when the change is a single isolated line and the diagnosis is confident. The deepsec run summary must record the second-hop owner so the user sees who finally took the work.

For each routed item, include: file path, severity, `vulnSlug`, revalidation verdict, and the export markdown path.

---

## Step 6: Stop conditions

End the workflow when **any** of these is true:

- The user's stated intent is complete and Step 5 summary has been delivered.
- A blocking precondition is reported (missing credential, unresolved spend authorization, or unusable INFO.md).
- A quota / credit stop has been surfaced with the safe-resume command.

Do not loop back to Step 1 unless the user re-invokes the workflow with a new intent.

---

## Absolute Rules

- Do NOT echo or commit credentials (`vck_…`, `sk-ant-…`, `sk-…`, OIDC tokens). `.env.local` is gitignored.
- Do NOT grant `pull-requests: write` to any CI job that runs PR-controlled code.
- Do NOT silently drop a refusal (`refused: true`). Log it, retry with the other backend, or add the path to `data/<id>/config.json:ignorePaths` only when the refusal reproduces.
- Do NOT invent CLI flags. Anything beyond `resources/scanning.md`'s flag list must be checked against `--help` first. When the CLI's printed models, defaults, or costs disagree with the skill's notes, trust the CLI.
- Do NOT modify `.agents/` files unless the user is editing the OMA source repo itself.
