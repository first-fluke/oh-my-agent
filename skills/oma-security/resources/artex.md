# ARTEX runtime testing

Load for an explicit ARTEX request or a concrete `web_runtime`/`pentest` target.
ARTEX is the selected runtime engine for a scoped web test deployment; absent deployment/artifact prerequisites leave that stage pending.
Use [findings-contract.md](findings-contract.md) for `run.json`/`runtime.json` and [validation.md](validation.md) for independent replay.
The shared execution policy governs the actual target, effects, credentials, and cost; this resource adds no separate approval sequence.

## Provenance and artifact readiness

The author announced the end of public updates/releases/support and a move to closed source on 2026-10-08.
The original `Autumn-27/ARTEX` repository was unavailable when checked; do not assume a current upstream release/image exists.
Use the [author's statement](https://github.com/Autumn-27/Autumn-27/blob/main/README.md) as the upstream support-status source.
[Hinln/ARTEX](https://github.com/Hinln/ARTEX) and [jiwoochris/artex-ko](https://github.com/jiwoochris/artex-ko) are third-party backup/fork candidates, not official upstream distributions.
Do not select a fork by stars, assume its base version matches its current tree, or treat a preserved image name as verified provenance.

Before execution, bind the chosen existing platform to:

- Repository URL, exact commit, dirty-tree digest, upstream/fork base, and reviewed differences.
- Dependency locks/digests, license obligations, tool inventory, and review of execution/update paths.
- Exact executable hashes and every container image digest, including database and tool containers.
- Available artifact provenance and a verified UI/API contract for that snapshot.
- An isolated platform environment, restricted administration UI, disposable storage, and an effective task network policy.

Do not use floating tags such as `latest`, automatic update scripts, or unverified assumed upstream images.
Pinning a tag/commit alone is insufficient if the running tool/database containers or updater can change it.
Verify that auto-update is disabled or enforceably blocked for the chosen snapshot; do not invent a disabling flag.
If a required image/artifact is unavailable, leave setup pending; do not build, deploy, or switch forks implicitly.
Installation/build/platform deployment is a separate requested operation. Preserve existing platform data when inspecting readiness.

Read-only identity checks for already present reviewed artifacts may include:

```bash
git -C "$ARTEX_ROOT" rev-parse HEAD
git -C "$ARTEX_ROOT" status --short
shasum -a 256 "$ARTEX_BIN"
docker image inspect "$ARTEX_IMAGE_DIGEST"
```

The Docker check refers to an already present digest; it does not authorize a pull/start or prove other images are pinned.
Run executable help only in the reviewed isolated environment, after verifying that executable and its startup behavior.
The inspected backup's [Go entry point](https://github.com/Hinln/ARTEX/blob/main/cmd/artex/main.go) exposes service flags such as `-addr`, `-data`, and `-proxy`.
That is third-party snapshot evidence, not an upstream scanner contract; do not assume `artex scan`, `--url`, headless mode, or a severity exit.
The backup [compose file](https://github.com/Hinln/ARTEX/blob/main/docker-compose.yml) contains floating image references; copy neither it nor its image names as an approved deployment.

## Bind the runtime task

ARTEX has its own Go service/UI, PostgreSQL, and LLM/tool execution environment.
Reuse an existing verified platform manually, or a previously reviewed snapshot-specific adapter.
Until that adapter/API contract is verified, record integration as `manual/external`; do not claim native CI support.
The engine receipt uses `native_exit: null` when no native command exit exists. Platform health alone is not task completion.

Before starting a task, record the concrete test deployment and enforce:

| Input | Required bound |
|---|---|
| Deployment identity | URL, deployment revision/image, environment, session, and source relationship when known |
| Attack-target scope | Scheme/host/port, allowed addresses/paths, exclusions, and deny-by-default redirects |
| Accounts | Credential references, roles, disposable fixtures, and permitted data access |
| Effects | Allowed state changes; destructive actions require an explicit existing scope decision |
| Budgets | Wall time, request count/rate, concurrency, tokens/spend, and stop conditions |
| Backend egress | Configured LLM/tool-service endpoints and their separate allowed network access |
| Containment | Effective network/filesystem/process controls and observable enforcement evidence |

A prompt containing an allowlist does not establish containment.
Enforce target scope at the execution/network layer, including host/address resolution and redirect destinations.
Discovered subdomains, linked sites, imported assets, or ScopeSentry results do not enter the allowlist automatically.
Block an out-of-scope redirect/request and retain the event; resolve any actual expansion through shared policy before dependent work.
Backend network access never extends the attack-target allowlist; a permitted LLM endpoint is not an attack target.
Use user-owned isolated test deployments by default; a supplied site URL does not imply production authorization.
Missing enforceable scope, account roles, effect limits, or budget controls leaves execution pending.

## Canonical manual/external path

1. Establish the current run/target IDs and artifact/deployment identities; validate the prerequisites above without starting a task.
2. Inspect the chosen platform's actual UI/API task fields, authentication, tool execution, stop control, and evidence export for that snapshot.
3. Record the interface/version evidence. If task scope/budgets cannot be enforced, retain a skipped/partial receipt and the exact blocker.
4. In the verified UI or adapter, create one task against the bound test deployment with reviewed account references, effects, limits, and exclusions.
5. Save platform task ID, interface/session identity, actual task settings, backend/model, timestamps, and scope-enforcement references.
6. Capture progress, tool failures/refusals, redirects blocked, budget stops, task termination, and measured routes/roles/checks exercised.
7. Export available task/tool logs and raw HTTP request-response evidence into restricted local storage; retain originals and hashes.
8. Import candidate/evidence references using the common contract; validate task identity, completion, and coverage before marking its engine receipt.
9. Give candidates and relevant evidence to a fresh verifier for bounded independent replay; write the observed outcome and unresolved gaps.

Do not fabricate a CLI invocation where a UI task was used. Record the external task reference instead of fictional argv.
Do not infer unattended operation, output schemas, severity exits, or CI flags from the platform's existence.
An unavailable export/API field is a recorded gap until a verified retrieval path exists; screenshots cannot replace raw protocol proof.
Preserve prior tasks when retrying, and create a new receipt if artifact, deployment, account role, scope, or backend identity changes.

## Evidence, replay, and completion

`runtime.json` owns deployment/session/scope/budget/backend-egress/task completion and traffic/evidence references.
Retain request method/URL, relevant headers/body, response status/headers/body, timestamps, account-role references, and tool/task IDs.
Raw traffic can contain cookies, tokens, or private data: keep originals access-controlled and produce redacted sharing copies.
Normalized records must contain references, not credential values. Never overwrite originals to redact or deduplicate them.
For each claim, retain the expected boundary, observed crossing, fixture preconditions, and replay artifact references.

ARTEX's narrative, screenshot, or self-reported success remains a candidate claim.
A fresh verifier must seek counterevidence and independently replay the bounded request sequence against the same authorized identity.
Use `proof_context: authorized_runtime` for that replay; Cloudflare's local no-external-network procedure does not authorize runtime requests.
Grant `confirmed` only after supported, observed reproduction; otherwise retain `needs_validation` with gaps under the common contract.
Failure to reproduce is not automatic refutation, and an unsuccessful attack does not establish that the deployment is secure.
Without deployment revision identity, proof is session-specific; it cannot confirm the local source checkout or another deployment.

Record `completed` only when the selected task is finished and its required completion/evidence receipt is valid.
Budget stops, tool errors, absent traffic proof, or incomplete intended exploration produce `partial`; unusable execution is `failed`; missing prerequisites are `skipped`.
Report measured coverage and exclusions even for a completed task; no finite exploration proves total coverage.
For automation, [ci.md](ci.md) requires a verified snapshot-specific adapter and validated imported receipt.
Until then the integration remains manual/external, and a required unresolved runtime stage cannot yield a passing gate.
