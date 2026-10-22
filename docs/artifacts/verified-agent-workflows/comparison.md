# Recovery policy comparison

Historical comparison. The manuscript now uses [the active recovery and incremental-cache comparison](review-comparison.md), which gives every policy the same dependency-stop behavior and executes OMA's scheduler. This earlier experiment and its raw records are retained unchanged for provenance.

Run `python3 compare.py` from this directory. It requires the same Python, Node.js and npm environment as `demo.py`. No model credentials, model calls, agent dispatch or software compilation are used. Each execution retains commands, exit codes, stdout, stderr, fixture hashes and policy outputs under `work/comparison-<timestamp>/`.

## Question and policies

What decisions do three explicitly defined recovery policies make when the same verified project is changed?

| Policy | Initial acceptance | Recovery |
|---|---|---|
| Last success | Execute every declared check and persist successful task statuses. | Reload those statuses and reuse successful tasks without inspecting file changes. |
| Rerun all | Use the same declared checks. | Execute every declared check again. A failure remains failed until a caller supplies a repair and retries. No artifact-hash validation is added. |
| OMA 20.10.3 | Begin a run, execute the declared checks, and finish with a structured claim and reported artifact. | Call `oma agent resume --dry-run` and retain its task decisions and reasons. |

The two reference policies are authored, deliberately explicit baselines. They are not implementations or evaluations of LangGraph, ExoFlow, SWE-agent or OpenHands. Their prevalence in real deployments is not measured. A richer baseline could add the same contract and freshness checks as OMA.

## Shared fixture and procedure

The driver imports `demo.py` to construct the same limiter, usage and documentation tasks. All policies use the same project directory, declared checks and contract. The limiter initially has the correct `<` boundary condition. Both the baseline seed checks and OMA's verification must pass before recovery probes start.

Four probes run in order: unchanged files; an extra file outside the declared inputs; a source edit from `<` to `<=`; and restoration of the source followed by an edit to the reported limiter artifact. Each probe observes the original completed runs. OMA is queried in dry-run mode, and the last-success file is unchanged. Thus the fourth probe does not inherit the third probe's failed recheck statuses. The unrelated file remains present in the last two probes.

At each probe, the driver reloads the persisted baseline success statuses, runs all three declared checks, and obtains OMA's recovery decision. It hashes all declared inputs, the plan and reported artifacts before and after to verify that none of the policy probes changed the compared fixture. Complete OMA responses, including decision reasons, are retained. The rerun-all policy executes the usage test even when the limiter test fails, so each probe reports every test outcome.

## Observed results

Captured with OMA 20.10.3. Task order below is limiter / usage / docs. Full [summary](evidence/comparison-summary.json) and [command transcript](evidence/comparison-transcript.json) are retained, including the driver hashes.

| Probe | Last success | Rerun all | OMA dry run |
|---|---|---|---|
| Unchanged | reused / reused / reused | completed / completed / completed | reused / reused / reused |
| Unrelated file added | reused / reused / reused | completed / completed / completed | reused / reused / reused |
| Source changed to the failing boundary condition | reused / reused / reused | failed / failed / completed | ready / ready / reused |
| Source restored; limiter report changed | reused / reused / reused | completed / completed / completed | blocked / blocked / reused |

Rerun-all executed 12 recovery check commands across the four probes. Last-success reuse and OMA dry-run executed none at that stage. Initial verification is separate: three direct baseline checks and three OMA verification commands. These counts do not include future OMA work and do not measure wall-clock savings.

The source edit changed only `src/limit.mjs` among the original inputs; the final probe restored that file's original hash and changed only the limiter report among the original tracked files. The unrelated file persisted. Fixture hashes before and after each policy probe matched. Captured transcript and driver hashes were verified before copying results into `evidence/`.

## Interpretation limits

This compares recovery decisions on one deterministic fixture. It does not measure autonomous repair, false-completion rates on a sampled workload, engineering effort, user preference, runtime improvement or token cost. OMA's dry run executes no acceptance tests; a `ready` decision requests future work, whereas rerun-all's `failed` or `completed` reports a freshly executed test. These are different stages, so command counts are not end-to-end savings.

The altered artifact is a report, not the limiter implementation. Product tests can correctly pass while that report has changed. OMA's block is evidence-consistency enforcement; it is not evidence that the product code is incorrect or that the report's new content is harmful. Last-success reuse after the broken source edit is stale because the current boundary and usage tests fail.

The comparison supplements the video's nine observations. The existing video has not been edited to present these new results.
