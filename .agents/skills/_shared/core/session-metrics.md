# Session Metrics & Clarification Debt Tracking

Tracks per-session agent performance metrics, with emphasis on **Clarification Debt (CD)** — the cost of unclear requirements, scope creep, and charter violations.

---

## Why Track This?

Agents that frequently require re-direction consume more tokens and user time than agents that "get it right" the first time. CD tracking enables:

1. **Pattern Detection**: Identify which agents/task-types cause the most re-work
2. **Prompt Improvement**: Data-driven refinement of task descriptions
3. **Escalation Triggers**: Automatic RCA requirements when thresholds exceeded

---

## Clarification Debt (CD) Scoring

| Event Type | Points | Description |
|------------|--------|-------------|
| `clarify` | +10 | Simple clarification question (expected for MEDIUM uncertainty) |
| `correct` | +25 | Intent misunderstanding requiring direction change |
| `redo` | +40 | Scope/charter violation requiring rollback and restart |
| `blocked` | +0 | Agent correctly stopped and asked (this is GOOD behavior) |

### Scoring Modifiers

| Condition | Modifier |
|-----------|----------|
| Charter not read before action | +15 |
| Allowlist violation (file outside scope) | +20 |
| Same error type repeated in session | x1.5 |

---

## Thresholds & Actions

| Threshold | Scope | Action |
|-----------|-------|--------|
| CD >= 50 | Single session | **MANDATORY**: Add RCA to `lessons-learned.md` |
| CD >= 30 | Same agent, 3 consecutive sessions | **REVIEW**: Examine agent prompt template |
| CD >= 80 | Single session | **ESCALATE**: Halt session, request user re-specification |
| `redo` count >= 2 | Single session | **PAUSE**: Orchestrator requests explicit scope confirmation |

---

## Session Log Format

Orchestrator maintains this log in `.serena/memories/session-metrics.md` during execution.

```markdown
## Session: {SESSION_ID}
Started: {ISO timestamp}
Request: "{original user request, first 100 chars}..."

### Events

| Turn | Agent | Event | Points | Detail |
|------|-------|-------|--------|--------|
| 5 | backend | correct | 25 | Changed from REST to GraphQL per user correction |
| 12 | frontend | clarify | 10 | Asked about dark mode preference |
| 18 | backend | redo | 40 | Auth approach rejected, restarting with OAuth |

### Summary
- Total CD: 75
- Agents: backend (65), frontend (10)
- Threshold breached: YES (CD >= 50)
- RCA Required: YES
```

---

## Event Recording Protocol

### For Orchestrator

When user sends a correction/clarification during session:

1. **Classify** the event type:
   - Is user answering a question agent asked? → `clarify`
   - Is user correcting a misunderstanding? → `correct`
   - Is user rejecting work and asking for restart? → `redo`

2. **Record** via MCP memory:
   ```
   [EDIT]("session-metrics.md", append event row)
   ```

3. **Check threshold** after each event:
   - If CD >= 80: Pause and request re-specification
   - If `redo` >= 2: Request explicit scope confirmation

### For QA Agent (Post-Session)

At session end, if total CD >= 50:

1. **Generate RCA** with this format:
   ```markdown
   ### {date}: {agent} - CD threshold breach ({score} points)
   - **Problem**: {what triggered the corrections}
   - **Root Cause**: {why the misunderstanding occurred}
   - **Fix Applied**: {how it was resolved}
   - **Prevention**: {prompt/process change to prevent recurrence}
   ```

2. **Append** to `lessons-learned.md` in the relevant domain section

---

## Integration Points

| Component | How It Uses Session Metrics |
|-----------|----------------------------|
| **Orchestrator** | Records events, checks thresholds, triggers pauses |
| **QA Agent** | Reviews session metrics, generates RCA if needed |
| **Dashboard** | Displays real-time CD score (optional) |
| **Retro Command** | Aggregates CD across sessions for trend analysis |

---

## Example: Healthy vs Unhealthy Session

### Healthy Session (CD = 10)
```
Turn 3: frontend asked about icon library preference → clarify (+10)
Turn 15: All tasks completed successfully
Total CD: 10 ✅
```

### Unhealthy Session (CD = 95)
```
Turn 2: backend assumed REST, user wanted GraphQL → correct (+25)
Turn 8: backend used wrong auth method → correct (+25)
Turn 12: frontend built wrong layout → redo (+40)
Turn 14: Charter not checked before redo → modifier (+15, but capped)
Total CD: 95 ❌ → RCA REQUIRED
```

---

## Quality Score Tracking (Extension)

When Quality Score measurement is active (see `quality-score.md`), the session log includes score progression.

### Score Progression (appended to session log)

```markdown
### Quality Score Progression

| Checkpoint | Phase | Composite | Grade | Delta |
|-----------|-------|-----------|-------|-------|
| Baseline | IMPL end | 72 | C | — |
| Post-VERIFY | VERIFY end | 78 | B | +6 |
| Post-REFINE | REFINE end | 84 | B | +6 |
| Final | SHIP | 86 | B | +2 |
```

### Experiment Summary (appended to session log)

```markdown
### Experiment Summary
- Total experiments: {N}
- Kept: {N} ({%})
- Discarded: {N} ({%})
- Exploration rounds: {N} (max 2 per session)
- Net score improvement: {start} → {final} (delta: {+N})
```

This data is sourced from the Experiment Ledger at session end (see `experiment-ledger.md`).

---

## Metrics Retention

- **Active session**: `.serena/memories/session-metrics.md`
- **Completed sessions**: Archived to `.serena/memories/archive/metrics-{date}.md`
- **Retention**: 30 days (configurable)
- **Aggregation**: `oh-my-ag stats` command summarizes trends
