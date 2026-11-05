# Large Merge Risk Triage

Trigger this step when merge scope is large by change footprint, not PR count.
Read thresholds from `.agents/oma-config.yaml` `large_merge_thresholds.*` first.
If config values are missing, use these defaults:
- combined changed files >= 150
- combined additions+deletions >= 3000 lines
- touching >= 3 high-churn/hotspot paths
- any candidate has `risk_score >= 60`

Use these signals:
- file overlap across PRs (same files)
- line-range overlap when available
- branch age and divergence from base
- hotspot files (high churn/recent edits)
- ownership spread (many authors/teams touching same area)
- semantic flags (API contract/interface/schema changes)

Risk score formula (0-100):

`risk_score = overlap(0-40) + divergence(0-20) + hotspot(0-15) + ownership(0-15) + semantic(0-10)`

Bucket thresholds:
- **LOW** (0-29): no overlap, low divergence, no semantic flags
- **MEDIUM** (30-59): partial overlap or moderate divergence
- **HIGH** (60-100): line overlap, repeated hotspot collisions, or semantic flags

Scoring guidance:
- `overlap`: 0 (none), 20 (same file only), 40 (same file + overlapping lines)
- `divergence`: 0 (<24h and <=10 commits behind), 10 (1-3 days or <=50 behind), 20 (>3 days or >50 behind)
- `hotspot`: 0 (stable), 8 (moderate churn), 15 (top churn paths touched)
- `ownership`: 0 (single owner/team), 8 (2-3 owners), 15 (cross-team and unclear ownership)
- `semantic`: 0 (none), 5 (minor contract touch), 10 (API/schema/interface breaking risk)

Data sources (preferred order):
1. PR metadata/diff from GitHub CLI or API
2. Line-overlap detection — compare diff hunk ranges across candidate branches (no dedicated tool required):
   ```bash
   # Resolve ONE common base for both candidate branches.
   COMMON_BASE=$(git merge-base <branch-a> <branch-b>)
   git diff -U0 "$COMMON_BASE" <branch-a> -- <file> | grep '^@@'
   git diff -U0 "$COMMON_BASE" <branch-b> -- <file> | grep '^@@'
   # Compare the "-start,count" ranges in this common original file.
   # A missing count means 1. Pure insertions (count=0) use the boundary
   # after start; compare insertion boundaries and edits touching them.
   # Do not compare "+start,count": each branch has different new-line offsets.
   ```
3. Merge simulation (GitHub mergeability/queue simulation when available)
4. Local git history for churn/hotspot and ownership hints

For large-scope merges, propose merge order as:
1. LOW in small batches
2. MEDIUM in smaller batches
3. HIGH one-by-one with explicit checkpoints

## Authorization for risky operations

**Precedence:** an explicit, unambiguous user instruction overrides this gate (same as `oma-scm` SKILL.md Guardrails) — if the user already told you exactly what to do, state what you are doing and proceed without re-confirming. The single exception that always warrants a heads-up is likely-secret material. The gate below applies when the risky condition was NOT explicitly requested by the user.

Stop and ask user confirmation if any of these are true:
- merge conflicts are already present
- history rewrite is required (`--force`, `reset --hard`, destructive restore/clean)
- required checks, required reviews, or CODEOWNERS conditions are not satisfied
- protected/main branch policy could be violated
- release-critical paths are involved and rollback plan is unclear

Additional confirmation triggers:
- `risk_score >= 60`
- batch failure repeated 2+ times
- merge queue is unavailable and manual direct-merge is requested

## Failure and rollback
- On batch failure, bisect once and retry with smaller batch.
- If the second attempt fails, stop and apply the authorization rules above.
- Never continue high-risk merges after repeated failures without explicit approval.
- For protected/main branches, prefer revert-based rollback over history rewrite.
