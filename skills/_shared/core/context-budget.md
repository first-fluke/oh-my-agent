# Context Budget

Keep the context relevant to the current task. Prefer scoped search and reads for large files; read a whole file when its size or the review scope makes that useful. Re-read changed content when needed to verify current behavior.

## Measure actual loading

`bun scripts/measure-skill-context.ts` reports file-size estimates using UTF-8 bytes / 4. It is not an Astra tokenizer or a live usage measurement. The routed tier is the entry skill; resource tiers are comparison scenarios, not instructions to preload those files. Generated vendor aliases are not independent prompt copies.

Measure the assembled prompt separately when changing injection. Include the owning entry, runtime contracts, task instructions, and any references actually supplied. The runtime retains a required entry even if it exceeds its soft budget and reports the overrun. Reduce that entry or select a narrower skill; do not silently drop its contract.

Use `oma skill audit` to find routing overlap and unusually large entries. Counts and thresholds are diagnostics, not proof of task utility. Keep measured summaries current rather than copying fixed claims about which skills exceed a limit.

## During a task

- Process bulk logs, datasets, and manifests through tools; return relevant excerpts, counts, and artifact paths.
- Load one platform or operation at a time. Error playbooks, examples, and experimental protocols remain conditional.
- Record important decisions and remaining work in durable state for long tasks. Do not maintain a separate file-read ledger for a trivial edit.
- Before compaction or a restart, save completed work, remaining acceptance criteria, relevant paths, verification status, and material assumptions.
- Continue from that checkpoint. A turn estimate or elapsed time is not completion and does not require renewed approval.
- Restart an agent only for observed loss of useful context or stalled progress. Preserve its partial result and avoid duplicating a live attempt.

Authorization and completion follow `execution-policy.md`; run/claim identity follows `../runtime/result-contract.md`.
