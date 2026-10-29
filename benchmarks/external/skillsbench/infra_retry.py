"""Permit one replacement for a specific ungraded dependency failure."""

import hashlib
import json
from pathlib import Path


SIMPO_ATTEMPT = "attempt-20261021T195505Z"
SIMPO_FINISHED = 1792612695.265194
SIMPO_RECEIPT_SHA256 = "d08ba907490562c4450feb45ea28840abfae5bde8272a210befcac77eb2f6557"
SIMPO_LOG_SHA256 = "3479d12422f7c1abc28c712c171f7ceb5e49f974188deef4860eabb1a7959ffd"


def repaired_ungraded_attempt(task, row, run_dir):
    """Read-only, fail-closed eligibility; never retries a scored/model failure."""
    if (task != "simpo-code-reproduction" or row.get("status") != "verifier_error"
            or row.get("finished_at") != SIMPO_FINISHED or "reward" in row):
        return False
    task_dir = Path(run_dir) / "tasks" / task
    attempt = task_dir / SIMPO_ATTEMPT
    try:
        receipt_bytes = (attempt / "receipt.json").read_bytes()
        if hashlib.sha256(receipt_bytes).hexdigest() != SIMPO_RECEIPT_SHA256:
            return False
        receipt = json.loads(receipt_bytes)
        if (receipt.get("task") != task or receipt.get("status") != "verifier_error"
                or receipt.get("agent_status") != "completed" or receipt.get("setup_status") != "completed"
                or receipt.get("verifier_status") != "error" or receipt.get("finished_at") != SIMPO_FINISHED
                or Path(receipt["attempt_dir"]).resolve() != attempt.resolve()
                or "reward" in receipt or "official_ctrf_groups" in receipt or "pytest_cases" in receipt):
            return False
        if (attempt / "verifier/ctrf.json").exists():
            return False
        log = (attempt / "verifier.log").read_bytes()
        return hashlib.sha256(log).hexdigest() == SIMPO_LOG_SHA256
    except (OSError, ValueError, KeyError, TypeError):
        return False
