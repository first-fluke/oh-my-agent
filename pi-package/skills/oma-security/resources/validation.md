# Independent candidate validation

Load for triage, reproduction, or final candidate review. Cloudflare's security-audit-skill supplies the source/local verification method; ARTEX has a separate authorized-runtime replay branch.
This resource does not claim Cloudflare detects more accurately than another engine. Scanner confidence and static revalidation are inputs, not observed proof.

## Independent reviewer

Assign each unique candidate to a fresh verifier who did not discover it. Supply the candidate, relevant current target identity/locations, raw evidence, threat model, and the applicable proof boundary.
Do not supply another verifier's conclusion as an authority. The verifier must re-read decisive evidence and attempt to refute the claim through preventing controls, reachability, input constraints, identity, and impact.
Use a unique verifier ID and scratch area. The parent retains final artifacts; target code and the verifier must not write evidence directly into trusted retained storage.
Return one structured decision using the findings contract. Keep malformed or unsupported verdicts unvalidated rather than repairing them into a stronger claim.
If budget or independence prevents review, retain the candidate in `pending_candidates`, record the missing review, and mark required coverage partial.

## Local proof: Cloudflare method

Use `proof_context: local_sandbox`. This branch reads current source and performs bounded local reproduction; it never contacts deployed endpoints or external/shared services.
Before any target-controlled execution, require an OS-enforced sandbox with no external network, an empty allowlisted environment, read-only target/tools, scratch-only writes, and explicit low resource and wall-clock limits.
Separate trusted parent orchestration from target code and all sandbox processes. Shell access, an agent instruction, a temporary directory, or a plain subprocess is not evidence that these controls exist.
If a control is unavailable, do not execute. Keep the exact missing capability as a validation blocker; do not silently move the proof to ARTEX, a deployment, or a less constrained runner.
Use the target's native interface: library call, file fixture, message, CLI input, local browser action, rendered policy, or local HTTP fixture when appropriate. Do not require a live endpoint for a source/library target.
Reproduce the minimum claimed result with dummy principals/resources, stop at the demonstrated boundary, and retain only evidence supporting the observed impact.
Do not build or compile a missing harness/target without an explicit build request; missing executable prerequisites remain gaps.

### Trusted evidence promotion

Treat every scratch entry as target-controlled after execution. Wait until the sandbox and all its processes terminate before parent-side promotion.
Use an existing trusted promotion helper that enforces the upstream procedure: predeclared relative files, byte limits, retained directory handles, no-follow component traversal, regular single-link files, stable identity/size, and exclusive destination creation.
Do not substitute recursive copy, archive extraction, globbing, or ordinary path-based copying for that procedure. Reject symlinks, hard links, devices, FIFOs, sockets, directories, changing files, and oversized output.
If the helper or any required check is unavailable, do not promote the scratch entry; decisive unavailable evidence keeps the candidate unconfirmed.
Read the current pinned upstream validation procedure before using its implementation. When invoking the full upstream skill, preserve its native schema/ledger/validator outputs separately from the normalized OMA records.

## Runtime proof: ARTEX replay

Use `proof_context: authorized_runtime` only for a selected scoped runtime stage and its recorded test deployment. This is not Cloudflare local reproduction with a different label.
The ARTEX resource owns snapshot/platform integration and enforceable target/budget controls. Reuse the actual scope/authorization; do not add a generic approval sequence or extend targets from model discovery.
Bind the independent replay to the runtime task, exact URL/host/port, allowlist, test-account roles, allowed effects, deployment/environment/session identity, and execution limits in `runtime.json`.
Record backend/LLM egress separately; it cannot enlarge attack-target scope. Redirects, linked hosts, discovered assets, and imported subdomains stay out of scope unless separately included through shared policy.
Have a non-discoverer verifier replay the minimum candidate against dummy resources/accounts and observe the claimed security boundary crossing.
Retain exact request/input shape, expected behavior, observed behavior, timestamps, sanitized request/response references, relevant tool logs, and verifier identity.
An engine-written “exploitable” label, success message, graph edge, screenshot, or finding narrative alone does not establish independent runtime proof.
If deployed revision cannot be established, a verified claim is limited to the observed deployment/session; it cannot confirm the checked-out source or a later deployment.
Unsuccessful attack, error, incomplete exploration, or budget stop cannot establish security and does not automatically trigger another engine.

## Final disposition

Use the findings contract's separate validation, reproduction, proof-context, status, and severity fields.

| Evidence | Disposition |
|---|---|
| Independently supported claim plus identity-bound observed local/runtime proof | `confirmed`; assign severity from demonstrated impact and realistic conditions |
| Source/runtime evidence supports a specific claim but a decisive fact/proof is unavailable | `needs_validation`; exact blocker and next applicable check, no normalized severity |
| Source, visible control, observed behavior, or impossible prerequisite refutes the claim | `rejected`; preserve counterevidence |
| No fresh independent review | Keep pending; do not present it as a reviewed validation lead or confirmed finding |

A Deepsec `true-positive` revalidation is static evidence. Preserve it in provenance; do not translate it directly into `confirmed` or `reproduced`.
A failed replay alone is not counterevidence that the entire claim is false; document the observed inputs, conditions, and remaining unknowns.
Keep likelihood, impact, and confidence distinct. Do not exceed the impact established by the bounded result or assign severity to an unresolved lead.
The verifier checks the final structured record against current evidence. A material promotion or change to root cause, trace, observed result, impact, or severity requires another fresh verifier that did not discover or propose that replacement.
Non-material wording corrections can be applied without rerunning the proof; changed target identity invalidates decisive proof until affected checks rerun.
Never verify only confirmed records: misleading validation leads also waste owner time and preserve false premises.

## Completion and evidence limits

Use existing validators for native artifacts and the normalized schema where available; syntax/schema success is format evidence, not proof of a vulnerability or scanner accuracy.
If full validator execution is unavailable, record the exact missing check and perform available syntax/reference/identity checks; do not claim a full schema pass.
Report completed proof, blocked proof, unreviewed candidates, rejected claims, and measured coverage separately. Preserve raw originals in restricted storage and share only redacted derivatives.
Keep the final result proportional to evidence; zero confirmed findings is valid, with unresolved scope or validation gaps reported explicitly.

## Source

[Cloudflare validation and reporting procedure](https://github.com/cloudflare/security-audit-skill/blob/main/skills/security-audit/VALIDATION-AND-REPORTING.md) defines the source/local non-discoverer review and bounded sandbox contract. Record the consulted revision when executing it; do not import its network restrictions into ARTEX as a false claim that runtime testing is local.
