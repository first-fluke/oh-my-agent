#!/usr/bin/env python3
"""Compare a full OMA SkillsBench run with the public per-task results registry.

The OMA run has no bare-agent arm of its own. The public registry (the data
behind skillsbench.ai) records, per task, how a bare harness and the same
harness with the task's curated skills scored over three trials. Matching the
two task by task gives a reference, not a controlled comparison: the registry's
Codex rows use an older model and the official runner.

No model is called. Download the registry first:
  curl -fsSL -o registry.json https://raw.githubusercontent.com/benchflow-ai/\
skillsbench-trajectories/<commit>/website-data/results-registry.json
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import statistics
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent


def mean(rows: list[dict], key: str) -> float | None:
    return round(statistics.fmean(row[key] for row in rows), 3) if rows else None


def skills_read(attempt_dir: Path) -> tuple[list[str], list[str]]:
    """OMA skills and other skills whose SKILL.md the agent opened."""
    log = attempt_dir / "agent.log"
    oma, other = set(), set()
    if not log.is_file():
        return [], []
    for line in log.read_text(errors="replace").splitlines():
        try:
            item = json.loads(line).get("item") or {}
        except (ValueError, AttributeError):
            continue
        if item.get("type") != "command_execution":
            continue
        for name in re.findall(r"skills/([a-z0-9_-]+)/SKILL\.md", item.get("command", "")):
            (oma if name.startswith("oma-") else other).add(name)
    return sorted(oma), sorted(other)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--registry", type=Path, required=True)
    parser.add_argument("--run-dir", type=Path, default=HERE / "results" / "full-v1.1-20261021")
    parser.add_argument("--harness", default="Codex", help="registry harness to use as the reference")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    registry = json.loads(args.registry.read_text())
    reference: dict[str, dict[str, dict]] = defaultdict(dict)
    for row in registry:
        if row["harness"] == args.harness:
            reference[row["task"]][row["condition"]] = row
    models = sorted({row["model"] for row in registry if row["harness"] == args.harness})
    run = json.loads((args.run_dir / "receipt.json").read_text())
    metadata = {t["task"]: t["config"]["metadata"] for t in json.loads((args.run_dir / "inventory.json").read_text())}

    rows = []
    for task, result in run["tasks"].items():
        ref = reference.get(task)
        if result.get("status") != "scored" or not ref:
            continue
        task_receipt = json.loads((args.run_dir / "tasks" / task / "receipt.json").read_text())
        oma_skills, other_skills = skills_read(Path(task_receipt.get("attempt_dir", "")))
        rows.append(
            {
                "task": task,
                "category": metadata[task].get("category"),
                "oma_pass": 1.0 if result["reward"] >= 1 else 0.0,
                "oma_reward": result["reward"],
                "bare_pass": ref["No Skills"]["perfectCount"] / ref["No Skills"]["trials"],
                "curated_pass": ref["With Skills"]["perfectCount"] / ref["With Skills"]["trials"],
                "oma_skills_read": oma_skills,
                "other_skills_read": other_skills,
            }
        )

    def block(subset: list[dict]) -> dict:
        return {
            "tasks": len(subset),
            "oma_pass": mean(subset, "oma_pass"),
            "reference_bare_pass": mean(subset, "bare_pass"),
            "reference_curated_skills_pass": mean(subset, "curated_pass"),
        }

    by_category: dict[str, list[dict]] = defaultdict(list)
    by_skill: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        by_category[row["category"]].append(row)
        for skill in row["oma_skills_read"]:
            by_skill[skill].append(row)
    summary = {
        "registry_sha256": hashlib.sha256(args.registry.read_bytes()).hexdigest(),
        "reference": {"harness": args.harness, "models": models, "trials_per_task": 3},
        "oma_run": {key: run.get(key) for key in ("condition", "model", "reasoning_effort", "oma_snapshot_version", "global_plugins")},
        "comparable": False,
        "why_not_comparable": "Different model generation and run path; one OMA trial per task; host plugins were available to the OMA run.",
        "overall": block(rows),
        "oma_skill_read": block([r for r in rows if r["oma_skills_read"]]),
        "no_oma_skill_read": block([r for r in rows if not r["oma_skills_read"]]),
        "non_oma_skill_read": sum(1 for r in rows if r["other_skills_read"]),
        "by_category": {k: block(v) for k, v in sorted(by_category.items(), key=lambda kv: -len(kv[1]))},
        "by_oma_skill": {k: block(v) for k, v in sorted(by_skill.items(), key=lambda kv: -len(kv[1]))},
        "failed_where_reference_bare_always_passed": sorted(r["task"] for r in rows if r["bare_pass"] == 1 and not r["oma_pass"]),
        "passed_where_reference_bare_never_passed": sorted(r["task"] for r in rows if r["bare_pass"] == 0 and r["oma_pass"]),
    }
    text = json.dumps(summary, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(text)
    print(text)


if __name__ == "__main__":
    main()
