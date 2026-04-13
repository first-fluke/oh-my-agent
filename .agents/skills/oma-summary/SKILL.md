---
name: oma-summary
description: Analyze conversation histories from multiple AI tools (Claude, Codex, Gemini, Qwen, Cursor) and generate themed daily/period work summaries. Filter by date or time window.
---

# AI Tool Conversation History Summary

Analyze AI tool conversation histories for a given period and generate themed work summaries.

## When to use
- Summarizing a day or period of work activity
- Understanding the overall flow of work across multiple AI tools
- Analyzing tool-switching patterns between sessions
- Preparing daily standups, weekly retros, or work logs

## When NOT to use
- Git commit-based code change retrospective -> use `oma retro`
- Real-time agent monitoring -> use `oma dashboard`
- Productivity metrics -> use `oma stats`

## Process

### 1. Resolve Date

Determine the target date or window from the user's natural language input. Default is today.

**Resolution rules:**
- Relative day references (today, yesterday, day before yesterday, etc.) → calculate `--date YYYY-MM-DD`
- Specific date mentions (month + day, or full date) → convert to `--date YYYY-MM-DD`
- Relative weekday references (last Monday, this Friday, etc.) → calculate the date
- Period references (this week, last 3 days, past 2 weeks, etc.) → convert to `--window Nd`
- No date specified → today (`--window 1d`)

### 2. Collect Data

Extract normalized conversation history via CLI.

```bash
# Default (today, all tools)
oma summary --json

# Time window
oma summary --window 7d --json

# Specific date
oma summary --date 2026-04-10 --json

# Tool filter
oma summary --tool claude,gemini --json
```

**Fallback when CLI is not installed** — process Claude history only via inline jq:

```bash
TARGET_DATE=$(date +%Y-%m-%d)
TZ=Asia/Seoul start_ts=$(date -j -f "%Y-%m-%d %H:%M:%S" "${TARGET_DATE} 00:00:00" +%s)000
end_ts=$((start_ts + 86400000))

TZ=Asia/Seoul jq -r --argjson start "$start_ts" --argjson end "$end_ts" '
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
- Group by **work content**, not by tool

**Cross-tool analysis:**
- Track workflow when multiple tools are used in the same time window
- Example: "Designed in Gemini -> Implemented in Claude -> Reviewed in Codex"
- Derive insights from tool-switching patterns

**Extract from each theme:**
- Core work performed
- Key decisions made
- Tool combinations used
- Artifacts produced (docs, code, config, etc.)

### 4. Output Format

Save results to `.agents/results/summary/{date}.md` and display simultaneously.

Output in the following markdown format. **Response language follows `language` setting in `.agents/oma-config.yaml`.**

```markdown
## {date/period} Work Summary

> **TL;DR**
> - {What I accomplished 1 — project name + outcome}
> - {What I accomplished 2}
> - {What I accomplished 3}

### Daily Overview
2-3 sentence summary of the entire day's flow. Written from "I did X" perspective.
Focus on outcomes and progress, not tool ratios or technical details.

### {Theme 1} (AM 09:36~11:30) [Claude, Gemini]
- Core work performed
- Key decisions
- Cross-tool workflow (if applicable)
- 2-4 bullets per theme

### {Theme 2} (PM 13:33~15:21) [Codex]
- Core work performed
- Key decisions

### Miscellaneous
- Brief summary of sub-15-minute tasks

### Tool Usage Patterns
- Tool usage ratios and primary purposes
- Notable tool-switching patterns
```

### 5. Save Results

Save to `.agents/results/summary/{date}.md`.
For window ranges, use `{start-date}~{end-date}.md` format.

```bash
# Example paths
.agents/results/summary/2026-04-12.md
.agents/results/summary/2026-04-06~2026-04-12.md
```

## Core Rules

1. **TL;DR required**: Top 3 lines of "what I accomplished". Project name + outcome. No tool names or technical details.
2. **Daily Overview**: After TL;DR, describe the flow. Start with "I" as subject.
3. **Summary first**: Only 15+ minute work gets its own theme. Rest goes to "Miscellaneous".
4. **2-4 bullets per theme**: Concise essentials only. Don't enumerate every step.
5. **Themes by content**: Group by actual work, not by tool.
6. **Tool tags**: Show tools used in theme title as `[Claude, Gemini]`.
7. **Time range**: Include time range in theme title as `(AM/PM/Evening HH:MM~HH:MM)`. Criteria — AM: ~12:00, PM: 12:00~18:00, Evening: 18:00~.
8. **Save results**: Write markdown to `.agents/results/summary/`.
9. **Response language**: Follows `language` setting in `.agents/oma-config.yaml` if configured.
