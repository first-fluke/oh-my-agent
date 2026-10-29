"""Read unmodified official grader artifacts without inventing task scores."""

import json
import math
from pathlib import Path
import re


def read_grade(attempt):
    attempt = Path(attempt)
    verifier_dir = attempt / "verifier"
    logs = [attempt / "verifier.log"] + [path for path in verifier_dir.rglob("*")
                                               if path.is_file() and path.suffix in {".txt", ".log"}]
    text = "\n".join(path.read_text(errors="replace") for path in logs if path.exists())
    text = re.sub(r"\x1b\[[0-9;]*m", "", text)
    collection_errors = [r"ERROR collecting", r"errors? during collection", r"ERROR: file or directory not found",
                         r"pytest: error:", r"fixture ['\"][^'\"]+['\"] not found", r"no tests ran"]
    if any(re.search(pattern, text, re.IGNORECASE) for pattern in collection_errors):
        raise RuntimeError("Official verifier failed to collect or initialize its tests; reward is not a task score")
    summaries = []
    for line in text.splitlines():
        if re.search(r"\bin \d+(?:\.\d+)?s(?:\s|=|$)", line):
            counts = {kind: int(count) for count, kind in re.findall(r"(\d+) (passed|failed|errors?|skipped|xfailed|xpassed)", line)}
            if counts:
                summaries.append(counts)
    result = {}
    expected_reward = None
    report = verifier_dir / "ctrf.json"
    if report.exists():
        data = json.loads(report.read_text())
        summary = data.get("results", {}).get("summary", {})
        if not summary.get("tests"):
            raise RuntimeError("Official CTRF report contains no test cases")
        result["official_ctrf_groups"] = summary
    elif not summaries:
        # The Scala task has an official custom evaluator rather than pytest.
        if "EVALUATION SUMMARY" in text and re.search(r"Overall Score: \d+/25", text):
            result["custom_evaluator"] = "official-scala-tokenizer-evaluation-summary"
        elif "Testing Wyckoff Position Analysis" in text:
            total = re.search(r"^Total tests: (\d+)\s*$", text, re.MULTILINE)
            passed = re.search(r"^Passed: (\d+)\s*$", text, re.MULTILINE)
            failed = re.search(r"^Failed: (\d+)\s*$", text, re.MULTILINE)
            if not total or not passed or not failed or int(total[1]) <= 0 or int(passed[1]) + int(failed[1]) != int(total[1]):
                raise RuntimeError("Incomplete official Wyckoff custom-evaluator case counts")
            result["custom_evaluator"] = "official-wyckoff-position-analysis"
            result["custom_cases"] = {"total": int(total[1]), "passed": int(passed[1]), "failed": int(failed[1])}
            expected_reward = round(int(passed[1]) / int(total[1]), 2)
        elif "=== Anti-cheat checks ===" in text and re.search(r"^REWARD=\d+(?:\.\d+)?$", text, re.MULTILINE):
            pieces = re.split(r"^=== (.+?) ===\s*$", text, flags=re.MULTILINE)
            groups = {pieces[index]: re.findall(r"^\s*(PASS|FAIL|ERROR): test_\w+", pieces[index + 1], flags=re.MULTILINE)
                      for index in range(1, len(pieces), 2)}
            anti = groups.get("Anti-cheat checks", [])
            bugs = [next((cases for name, cases in groups.items() if name.startswith(f"Bug {number}:")), []) for number in [1, 2, 3]]
            if not anti or not all(bugs):
                raise RuntimeError("Incomplete official TRL anti-cheat/weighted-group case evidence")
            expected_reward = round(sum(weight for weight, cases in zip([0.35, 0.25, 0.40], bugs) if all(case == "PASS" for case in cases)), 4) if all(case == "PASS" for case in anti) else 0.0
            result["custom_evaluator"] = "official-trl-weighted-bug-groups"
            result["custom_groups"] = groups
        else:
            raise RuntimeError("No executed-case report or recognized official evaluator summary; reward is unverified")
    if summaries:
        result["pytest_cases"] = summaries[-1]
    reward = float((verifier_dir / "reward.txt").read_text().strip())
    if not math.isfinite(reward) or not 0 <= reward <= 1:
        raise RuntimeError(f"Official verifier emitted an invalid normalized reward: {reward}")
    if expected_reward is not None and not math.isclose(reward, expected_reward, abs_tol=1e-6):
        raise RuntimeError("Official reward disagrees with its custom evaluator's completed-case report")
    result["reward"] = reward
    return result
