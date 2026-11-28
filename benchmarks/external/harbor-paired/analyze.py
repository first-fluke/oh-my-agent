#!/usr/bin/env python3
"""Paired analysis of Harbor control/treatment jobs written by run.py.

Scoring rules, fixed before the first trial:
- A trial with a verifier reward is scored by that reward; pass means reward >= 1.
- An agent timeout or agent crash without a reward is a failed trial.
- A trial blocked by model quota, provider refusal, or environment/verifier
  errors is invalid. A task counts only when both arms have a valid trial.
- A treatment trial whose OMA install failed is invalid in the primary
  analysis and a failure in the `oma_setup_failure_as_fail` sensitivity row.
"""

from __future__ import annotations

import argparse
import json
import math
import random
import re
import statistics
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

QUOTA_PATTERNS = [
    r"you['’]ve hit your usage limit",
    r"(?:usage|weekly|daily) limit (?:reached|exceeded)",
    r"exceeded (?:your|the|current) (?:usage |available )?quota",
    r"insufficient_quota",
    r"usage_limit_reached",
    r"rate_limit_exceeded",
    r"rate limit (?:reached|exceeded)",
    r"too many requests",
    r"\b401\b.*unauthorized",
    r"content (?:was|has been) flagged for possible cybersecurity risk",
    # Claude Code
    r"hit your (?:usage |session |weekly |\w+ )?limit",
    r"usage limit reached",
    r"rate_limit_error",
    r"credit balance is too low",
    r"invalid api key",
    r"oauth token (?:has )?(?:expired|been revoked)",
    r"authentication_error",
    r"please run /login",
    r"overloaded_error",
    r"api error: 5\d\d",
]
AGENT_SIDE_FAILURES = {"AgentTimeoutError", "NonZeroAgentExitCodeError"}
AGENT_LOGS = {"codex": "codex.txt", "claude": "claude-code.txt"}


def model_blocked(log_path: Path) -> bool:
    """True when the agent ended on a provider error, not on a completed turn.

    Only terminal and error events are searched: model text and tool output can
    echo the same phrases.
    """
    if not log_path.is_file():
        return False
    completed, candidates = False, []
    for line in log_path.read_text(errors="replace").splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            candidates.append(line)
            continue
        kind = event.get("type") if isinstance(event, dict) else None
        failed = kind in {"error", "turn.failed"} or (
            kind == "result" and (event.get("is_error") is True or str(event.get("subtype", "")).startswith("error"))
        )
        if kind in {"turn.completed", "turn.failed", "result"}:
            completed = not failed
        if failed:
            # Keep non-ASCII literal: the limit message uses a curly apostrophe.
            candidates.append(json.dumps(event, ensure_ascii=False))
    if completed:
        return False
    return any(re.search(p, text, re.IGNORECASE) for text in candidates for p in QUOTA_PATTERNS)


def seconds(span: dict | None) -> float | None:
    if not span or not span.get("started_at") or not span.get("finished_at"):
        return None
    parse = lambda value: datetime.fromisoformat(value.replace("Z", "+00:00"))  # noqa: E731
    return (parse(span["finished_at"]) - parse(span["started_at"])).total_seconds()


def activation(trial_dir: Path, host: str = "codex") -> dict:
    """Evidence that OMA was loaded, read from the agent's own logs."""
    log = trial_dir / "agent" / AGENT_LOGS[host]
    text = log.read_text(errors="replace") if log.is_file() else ""
    sessions = "".join(
        p.read_text(errors="replace") for p in (trial_dir / "agent" / "sessions").rglob("*.jsonl")
    ) if (trial_dir / "agent" / "sessions").is_dir() else ""
    skills = set(re.findall(r"skills/(oma-[a-z-]+)/SKILL\.md", text))
    if host == "claude":
        # Claude Code loads a skill through its Skill tool, not by reading the file.
        skills |= set(re.findall(r'"name":\s*"Skill",\s*"input":\s*\{\s*"skill":\s*"(oma-[a-z-]+)"', text))
        report = trial_dir / "agent" / "setup" / "oma-install-report.txt"
        installed = report.read_text(errors="replace") if report.is_file() else ""
        return {
            # Claude Code does not log the instruction files it loads; the
            # install report shows AGENTS.md was in the working directory.
            "agents_md_loaded": "AGENTS.md=present" in installed,
            "session_hook_ran": "OMA SERENA PRIMER" in text or "OMA SERENA PRIMER" in sessions,
            "skills_read": sorted(skills),
            "serena_tool_calls": len(re.findall(r'"type":\s*"tool_use"[^{}]*"name":\s*"mcp__serena__', text)),
        }
    return {
        "agents_md_loaded": "_shared/core/execution-policy.md" in sessions,
        "session_hook_ran": "OMA SERENA PRIMER" in sessions,
        "skills_read": sorted(skills),
        "serena_tool_calls": len(re.findall(r'"server":\s*"serena"', text)),
    }


def test_fraction(trial_dir: Path) -> float | None:
    """Share of verifier test cases passed; rewards are all-or-nothing."""
    path = trial_dir / "verifier" / "ctrf.json"
    try:
        summary = json.loads(path.read_text())["results"]["summary"]
        return summary["passed"] / summary["tests"] if summary["tests"] else None
    except (OSError, ValueError, KeyError, TypeError):
        return None


def load_trials(run_dir: Path) -> list[dict]:
    host = json.loads((run_dir / "plan.json").read_text()).get("host", "codex")
    trials = []
    for result_path in sorted((run_dir / "jobs").glob("b*-*/*/result.json")):
        job = result_path.parent.parent.name
        if ".interrupted-" in job:
            continue
        batch, arm = job[1:].split("-", 1)
        data = json.loads(result_path.read_text())
        trial_dir = result_path.parent
        exception = data.get("exception_info") or {}
        exception_type = exception.get("exception_type")
        message = str(exception.get("exception_message") or "")
        rewards = (data.get("verifier_result") or {}).get("rewards")
        reward, invalid = None, None
        if model_blocked(trial_dir / "agent" / AGENT_LOGS[host]):
            invalid = "model_quota"
        elif "OMA setup failed" in message:
            invalid = "oma_setup_failed"
        elif rewards is not None:
            reward = float(rewards.get("reward", 0.0))
        elif exception_type in AGENT_SIDE_FAILURES:
            reward = 0.0
        else:
            invalid = exception_type or "no_reward"
        usage = data.get("agent_result") or {}
        trials.append(
            {
                "batch": int(batch),
                "arm": arm,
                "task": str(data.get("task_name", "")).split("/")[-1],
                "trial": data.get("trial_name"),
                "reward": reward,
                "invalid_reason": invalid,
                "exception_type": exception_type,
                "test_fraction": test_fraction(trial_dir) if reward is not None else None,
                "agent_seconds": seconds(data.get("agent_execution")),
                "setup_seconds": seconds(data.get("agent_setup")),
                "cost_usd": usage.get("cost_usd"),
                "input_tokens": usage.get("n_input_tokens"),
                "output_tokens": usage.get("n_output_tokens"),
                "activation": activation(trial_dir, host) if arm == "treatment" else None,
            }
        )
    return trials


def wilson(passes: float, n: int) -> list[float]:
    if n == 0:
        return [0.0, 0.0]
    z, p = 1.959964, passes / n
    centre = (p + z * z / (2 * n)) / (1 + z * z / n)
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / (1 + z * z / n)
    return [round(max(0.0, centre - half), 4), round(min(1.0, centre + half), 4)]


def exact_two_sided(k: int, n: int) -> float:
    """Exact binomial test against p = 0.5 (McNemar / sign test)."""
    if n == 0:
        return 1.0
    tail = sum(math.comb(n, i) for i in range(0, min(k, n - k) + 1)) / 2**n
    return min(1.0, 2 * tail)


def bootstrap(pairs: list[tuple[float, float]], seed: int = 20261125, rounds: int = 10000) -> list[float]:
    if not pairs:
        return [0.0, 0.0]
    rng, n, deltas = random.Random(seed), len(pairs), []
    for _ in range(rounds):
        sample = [pairs[rng.randrange(n)] for _ in range(n)]
        deltas.append(sum(t - c for c, t in sample) / n)
    deltas.sort()
    return [round(deltas[int(0.025 * rounds)], 4), round(deltas[int(0.975 * rounds) - 1], 4)]


def paired(per_task: dict[str, dict[str, list[float]]]) -> dict:
    tasks = sorted(t for t, arms in per_task.items() if arms.get("control") and arms.get("treatment"))
    passes = {t: {a: statistics.fmean(1.0 if r >= 1 else 0.0 for r in per_task[t][a]) for a in ("control", "treatment")} for t in tasks}
    rewards = {t: {a: statistics.fmean(per_task[t][a]) for a in ("control", "treatment")} for t in tasks}
    n = len(tasks)
    control_only = [t for t in tasks if passes[t]["control"] > passes[t]["treatment"]]
    treatment_only = [t for t in tasks if passes[t]["treatment"] > passes[t]["control"]]
    c_rate = sum(passes[t]["control"] for t in tasks) / n if n else 0.0
    t_rate = sum(passes[t]["treatment"] for t in tasks) / n if n else 0.0
    return {
        "paired_tasks": n,
        "control_pass_rate": round(c_rate, 4),
        "control_pass_ci95": wilson(c_rate * n, n),
        "treatment_pass_rate": round(t_rate, 4),
        "treatment_pass_ci95": wilson(t_rate * n, n),
        "delta_pass_rate": round(t_rate - c_rate, 4),
        "delta_pass_ci95_bootstrap": bootstrap([(passes[t]["control"], passes[t]["treatment"]) for t in tasks]),
        "delta_mean_reward": round(sum(rewards[t]["treatment"] - rewards[t]["control"] for t in tasks) / n, 4) if n else 0.0,
        "both_pass": sum(1 for t in tasks if passes[t]["control"] >= 1 and passes[t]["treatment"] >= 1),
        "both_fail": sum(1 for t in tasks if passes[t]["control"] <= 0 and passes[t]["treatment"] <= 0),
        "control_only_pass": control_only,
        "treatment_only_pass": treatment_only,
        "exact_p_two_sided": round(exact_two_sided(len(treatment_only), len(control_only) + len(treatment_only)), 4),
    }


def summarize(run_dir: Path) -> dict:
    frozen = json.loads((run_dir / "plan.json").read_text())
    meta = {task["name"]: task for task in frozen["tasks"]}
    trials = load_trials(run_dir)
    per_task: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    sensitivity: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    for trial in trials:
        if trial["reward"] is not None:
            per_task[trial["task"]][trial["arm"]].append(trial["reward"])
            sensitivity[trial["task"]][trial["arm"]].append(trial["reward"])
        elif trial["invalid_reason"] == "oma_setup_failed":
            sensitivity[trial["task"]][trial["arm"]].append(0.0)
    primary = paired(per_task)
    paired_names = {t for t, arms in per_task.items() if arms.get("control") and arms.get("treatment")}

    def group(key: str) -> dict:
        out = {}
        for value in sorted({str(meta[t].get(key)) for t in paired_names if t in meta}):
            subset = {t: per_task[t] for t in paired_names if t in meta and str(meta[t].get(key)) == value}
            row = paired(subset)
            out[value] = {k: row[k] for k in ("paired_tasks", "control_pass_rate", "treatment_pass_rate", "delta_pass_rate")}
        return out

    def economics(arm: str) -> dict:
        rows = [t for t in trials if t["arm"] == arm and t["task"] in paired_names and t["reward"] is not None]
        pick = lambda key: [t[key] for t in rows if t[key] is not None]  # noqa: E731
        mean = lambda values: round(statistics.fmean(values), 4) if values else None  # noqa: E731
        median = lambda values: round(statistics.median(values), 4) if values else None  # noqa: E731
        return {
            "trials": len(rows),
            "mean_test_fraction": mean(pick("test_fraction")),
            "mean_agent_seconds": mean(pick("agent_seconds")),
            "median_agent_seconds": median(pick("agent_seconds")),
            "mean_setup_seconds": mean(pick("setup_seconds")),
            "mean_cost_usd": mean(pick("cost_usd")),
            "total_cost_usd": round(sum(pick("cost_usd")), 2),
            "mean_input_tokens": mean(pick("input_tokens")),
            "mean_output_tokens": mean(pick("output_tokens")),
        }

    treatment = [t for t in trials if t["arm"] == "treatment" and t["activation"] and t["reward"] is not None]
    skills = Counter(skill for t in treatment for skill in t["activation"]["skills_read"])
    return {
        "plan": {
            "host": frozen.get("host", "codex"),
            "agent_version": frozen.get("agent_version") or frozen.get("codex_version"),
            **{k: frozen[k] for k in ("dataset", "dataset_tree_sha256", "harbor_version", "model", "reasoning_effort", "oma_version", "attempts_per_task", "seed")},
        },
        "tasks_in_dataset": len(frozen["tasks"]),
        "eligibility": frozen.get("eligibility"),
        "eligible_tasks": frozen.get("eligible_tasks", len(frozen["tasks"])),
        "ineligible_tasks": sorted(t["name"] for t in frozen["tasks"] if not t.get("eligible", True)),
        "trials": len(trials),
        "primary": primary,
        "oma_setup_failure_as_fail": {k: v for k, v in paired(sensitivity).items() if not k.endswith("_only_pass")},
        "by_difficulty": group("difficulty"),
        "by_category": group("category"),
        "economics": {arm: economics(arm) for arm in ("control", "treatment")},
        "treatment_activation": {
            "scored_trials": len(treatment),
            "agents_md_loaded": sum(t["activation"]["agents_md_loaded"] for t in treatment),
            "session_hook_ran": sum(t["activation"]["session_hook_ran"] for t in treatment),
            "read_at_least_one_skill": sum(bool(t["activation"]["skills_read"]) for t in treatment),
            "made_serena_call": sum(t["activation"]["serena_tool_calls"] > 0 for t in treatment),
            "skills_read": dict(skills.most_common()),
        },
        "invalid_trials": [
            {k: t[k] for k in ("task", "arm", "invalid_reason", "exception_type")} for t in trials if t["invalid_reason"]
        ],
        "per_task": {
            task: {
                arm: {
                    "rewards": per_task[task].get(arm),
                    "test_fractions": [
                        round(t["test_fraction"], 3)
                        for t in trials
                        if t["task"] == task and t["arm"] == arm and t["test_fraction"] is not None
                    ],
                }
                for arm in ("control", "treatment")
            }
            for task in sorted(per_task)
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, help="write summary.json here as well as stdout")
    args = parser.parse_args()
    summary = summarize(args.run_dir.expanduser().resolve())
    text = json.dumps(summary, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(text)
    print(text)


if __name__ == "__main__":
    main()
