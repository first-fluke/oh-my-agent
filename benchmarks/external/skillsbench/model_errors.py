"""Identify terminal provider restrictions without copying credentials to receipts."""

import json
import re


QUOTA_PATTERNS = [
    r"you['’]ve hit your usage limit",
    r"(?:usage|weekly|daily) limit (?:reached|exceeded)",
    r"exceeded (?:your|the|current) (?:usage |available )?quota",
    r"insufficient_quota",
    r"usage_limit_reached",
    r"rate_limit_exceeded",
    r"rate limit (?:reached|exceeded)",
    r"too many requests",
]


PROVIDER_ACCESS_PATTERNS = [r"content (?:was|has been) flagged for possible cybersecurity risk"]


def _terminal_failure(log_path, patterns):
    terminal = None
    candidates = []
    for line in log_path.read_text(errors="replace").splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            # Plain CLI stderr is allowed; structured tool output is excluded.
            candidates.append(line)
            continue
        event_type = event.get("type") if isinstance(event, dict) else None
        if event_type in {"turn.completed", "turn.failed"}:
            terminal = event_type
        if event_type in {"error", "turn.failed"}:
            candidates.append(json.dumps(event, ensure_ascii=False))
    if terminal == "turn.completed":
        return False
    return any(re.search(pattern, text, re.IGNORECASE) for text in candidates for pattern in patterns)


def terminal_quota_failure(log_path):
    return _terminal_failure(log_path, QUOTA_PATTERNS)


def terminal_provider_access_failure(log_path):
    return _terminal_failure(log_path, PROVIDER_ACCESS_PATTERNS)
