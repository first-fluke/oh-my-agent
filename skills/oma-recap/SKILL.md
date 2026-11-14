---
name: oma-recap
description: Summarize AI conversation histories for a specified date or period.
  Use for daily work recaps and cross-tool activity summaries.
---

# AI Tool Conversation History Summary

Analyze AI tool conversation histories for a given period and generate themed work summaries.

## Scheduling

### Goal
Collect AI tool conversation history for a date or window and synthesize it into a themed, project-oriented recap with saved Markdown output.

### Intent signature
- User asks for daily recap, weekly/monthly summary, standup notes, work log, tool usage pattern, or AI conversation history analysis.
- User wants conversation histories grouped by work content rather than raw chronological logs.

### When to use
- Summarizing a day or period of work activity
- Understanding the overall flow of work across multiple AI tools
- Analyzing tool-switching patterns between sessions
- Preparing daily standups, weekly retros, or work logs

### When NOT to use
- Git commit-based code change retrospective -> use `oma retro`
- Real-time agent monitoring -> use `oma dashboard terminal`
- Productivity metrics -> use `oma stats get`

### Expected inputs
- Date, relative date, time window, or tool filter
- Conversation history available through `oma recap --json` or fallback sources
- Desired daily or multi-day recap scope

### Expected outputs
- Markdown recap saved to `.agents/results/recap/{date}.md` or range filename
- TL;DR, overview, themes/projects, miscellaneous or side projects, and tool usage patterns
- User-facing summary in the response language

### Dependencies
- `oma recap --json`
- Optional Claude fallback history at `~/.claude/history.jsonl`
- `.agents/oma-config.yaml` for language behavior

### Control-flow features
- Branches by date resolution, window length, available tool history, and daily vs multi-day output shape
- Reads local history data and writes Markdown recap files

## Structural Flow

### Entry
1. Resolve requested date or window.
2. Collect normalized conversation history.
3. Decide daily versus multi-day output structure.

### Transitions
- If no date is specified, use today via `--date` (bare `--window` is a rolling window ending now, not calendar-aligned).
- If window is 3 days or longer, group by project instead of day chronology; a shorter window uses the daily format once per calendar day.
- If CLI is unavailable, use Claude fallback only and report scope limits.
- If tasks are under threshold, group them into Miscellaneous or Side Projects.

### Failure and recovery
- If history is unavailable, report missing source and requested range.
- If timestamps are ambiguous, use configured timezone and state assumption.
- If extracted data is sparse, produce a concise recap and note limited coverage.

### Exit
- Success: recap file exists and summary is displayed.
- Partial success: missing tools/history or fallback-only coverage is explicit.

## Logical Operations

### Actions
| Action | SSL primitive | Evidence |
|--------|---------------|----------|
| Resolve date/window | `INFER` | Natural-language date rules |
| Collect history | `CALL_TOOL` | `oma recap --json` or `jq` fallback |
| Read extracted records | `READ` | Conversation history |
| Group and classify themes/projects | `INFER` | Time/content rules plus prompt, progress, completion, receipt, or artifact evidence |
| Validate output shape | `VALIDATE` | Daily or multi-day template |
| Write recap | `WRITE` | `.agents/results/recap/` |
| Report summary | `NOTIFY` | Displayed recap |

### Tools and instruments
- `oma recap --json`
- `jq` fallback for Claude history
- Markdown output templates

### Canonical command path
```bash
oma recap --date YYYY-MM-DD --json
oma recap --window 7d --json
oma recap --json  # rolling last 24h, not "today"
```

### Resource scope
| Scope | Resource target |
|-------|-----------------|
| `LOCAL_FS` | Conversation history and recap output files |
| `PROCESS` | `oma recap`, `jq`, date commands |
| `USER_DATA` | Conversation prompts and project activity |
| `MEMORY` | Theme grouping and summary notes |

### Preconditions
- Requested time range can be resolved.
- At least one history source is available.

### Effects and side effects
- Writes recap Markdown under `.agents/results/recap/`.
- Reads local conversation history data.

### Guardrails

1. **Evidence status**: A prompt alone proves a request, not a result. Mark work **completed** only with an explicit completion/result message, a receipt, or an artifact that supports the stated outcome. Mark it **in progress** with progress evidence; otherwise call it **requested**. Do not infer completion from a tool invocation or elapsed time.
2. **TL;DR required**: Top 3 supported outcomes. Use "completed" only when the evidence-status rule permits it; otherwise summarize requested or in-progress work plainly. Project name + status/outcome. No tool names or unnecessary detail.
3. **Overview**: After TL;DR, describe the flow. Start with "I" as subject and preserve evidence status.
4. **Daily (windows under 3 days)**: themes by time block (15+ min), one dated block per calendar day. Rest goes to "Miscellaneous".
5. **Multi-day (3d+)**: sections by project, ordered by activity. Read like a sprint report, not a daily log.
6. **2-4 bullets per theme/project**: Concise essentials only. Don't enumerate every step.
7. **Themes by content**: Group by actual work, not by tool.
8. **Time range (daily only)**: `(AM/PM/Evening HH:MM~HH:MM)`. AM: ~12:00, PM: 12:00~18:00, Evening: 18:00~.
9. **Response language**: the user's prompt language first, then `language` in `.agents/oma-config.yaml`, then English.
10. **No em dashes**: Use commas, periods, or parentheses instead of `—` (em dash).

### Process

### 1. Resolve Date

Determine the target date or window from the user's natural language input. Default is today.

**Resolution rules:**
- Relative day references (today, yesterday, day before yesterday, etc.) → calculate `--date YYYY-MM-DD`
- Specific date mentions (month + day, or full date) → convert to `--date YYYY-MM-DD`
- Relative weekday references (last Monday, this Friday, etc.) → calculate the date
- Period references (this week, last 3 days, past 2 weeks, etc.) → convert to `--window Nd`
- No date specified → today, resolved to `--date YYYY-MM-DD`
- The CLI caps windows at 30 days (longer values are trimmed with a warning) — when a requested period gets capped, say so in the recap

### 2. Collect Data

Extract normalized conversation history via CLI.

```bash
# Today (calendar day, all tools); other date and window forms are in the canonical command path
oma recap --date $(date +%F) --json

# Tool filter (supported: grok, claude, codex, gemini, qwen, cursor, antigravity)
oma recap --tool claude,codex --json
```

**Fallback when CLI is not installed**: process Claude history only via inline jq. The fallback returns prompts only, so every item is **requested** unless a separate artifact or receipt supports more; state that limit in the recap.

```bash
# Uses the system timezone; export TZ=<zone> first to override, and state the
# timezone assumption in the recap (per the Failure and recovery rules).
TARGET_DATE=$(date +%Y-%m-%d)
# macOS/BSD date: advance the calendar date, then parse both local midnights.
next_date=$(date -j -v+1d -f "%Y-%m-%d %H:%M:%S" "${TARGET_DATE} 12:00:00" +%Y-%m-%d)
start_ts=$(date -j -f "%Y-%m-%d %H:%M:%S" "${TARGET_DATE} 00:00:00" +%s)000
end_ts=$(date -j -f "%Y-%m-%d %H:%M:%S" "${next_date} 00:00:00" +%s)000
# Linux/GNU date alternatives (replace all three lines above):
# next_date=$(date -d "${TARGET_DATE} 12:00:00 tomorrow" +%Y-%m-%d)
# start_ts=$(date -d "${TARGET_DATE} 00:00:00" +%s)000
# end_ts=$(date -d "${next_date} 00:00:00" +%s)000
# Do not add a fixed 24 hours: DST calendar days can have 23 or 25 hours.

jq -r --argjson start "$start_ts" --argjson end "$end_ts" '
  select(.timestamp >= $start and .timestamp < $end and .display != null and .display != "") |
  {
    time: (.timestamp / 1000 | localtime | strftime("%H:%M")),
    project: (.project | split("/") | .[-1]),
    prompt: (.display | gsub("\n"; " ") | if length > 150 then .[0:150] + "..." else . end)
  }
' ~/.claude/history.jsonl
```

### 3. Theme Analysis and Grouping

Read **all** extracted data and analyze with the following criteria:

**Grouping rules:**
- Only classify as a separate theme if the work spans **15+ minutes** (based on timestamp gaps and prompt count)
- Merge consecutive prompts on the same topic into one theme
- Collect sub-15-minute tasks into a "Miscellaneous" section
- Classify each item as requested, in progress, or completed per the evidence-status guardrail

**Cross-tool analysis:**
- Track workflow when multiple tools are used in the same time window
- Example: "Designed in Antigravity -> Implemented in Claude -> Reviewed in Codex"
- Derive insights from tool-switching patterns

**Extract from each theme:**
- Core work performed
- Key decisions made
- Tool combinations used
- Artifacts produced (docs, code, config, etc.)

### 4. Output Format

Use the markdown templates in `resources/output-formats.md`: the daily format
for a single date or a window under 3 days, the multi-day format with its
grouping rules for 3 days or longer.

### 5. Save Results

Save to `.agents/results/recap/{date}.md` and display the recap as well.
For window ranges, use `{start-date}~{end-date}.md` format.

```bash
# Example paths
.agents/results/recap/2026-04-12.md
.agents/results/recap/2026-04-06~2026-04-12.md
```

## References

- Output format templates: `resources/output-formats.md`
- Recap CLI: `oma recap --json`
- Language config: `.agents/oma-config.yaml`
- Claude fallback history: `~/.claude/history.jsonl`