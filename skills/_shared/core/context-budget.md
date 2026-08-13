# Context Budget Management

The context window is finite. Especially with Flash-tier models, unnecessary loading directly degrades performance.
Follow this guide to use context efficiently.

---

## Core Principles

1. **No full file reads**: Read only necessary functions/classes
2. **No duplicate reads**: Do not re-read files already read
3. **Lazy resource loading**: Load resources only when needed
4. **Maintain records**: Note read files and symbols in progress
5. **Run functions over data, don't read data into context**: when a scene
   processes bulk data (harvest results, logs, transcripts, large JSON), do the
   processing through a deterministic tool/CLI stage (`CALL_TOOL`) and bring
   back only a summary plus the artifact path. Streaming raw data through the
   context spends tokens reading what a program could have computed — the
   `oma market` pipe stages (harvest → score → fuse → cluster stay in JSON;
   only the rendered brief path returns) are the reference pattern.

---

## File Reading Strategy

### When Using Serena MCP (Recommended)

```
Bad: read_file("app/api/todos.py")          ← entire file 500 lines
Good: find_symbol("create_todo")             ← just that function 30 lines
Good: get_symbols_overview("app/api")        ← function list only
Good: find_referencing_symbols("TodoService") ← usage only
```

### When Reading Files Without Serena

```
Bad: Read entire file at once
Good: Check first 50 lines (imports + class definitions) → read additional functions as needed
```

---

## What Loading Actually Costs

Measured from the installed skill tree, not estimated. Re-derive with:

```bash
bun scripts/measure-skill-context.ts
```

Token figures are approximations (bytes ÷ 4 for English markdown) and read
slightly low for tables and code fences.

| File | Median | Range | Present in |
|------|-------:|-------|-----------:|
| `SKILL.md` | ~3,150 | 1,540-7,580 | 33/33 |
| `execution-protocol.md` | ~1,560 | 650-3,650 | 19/33 |
| `snippets.md` | ~3,120 | 2,960-7,950 | 3/33 |
| `examples.md` | ~1,320 | 380-4,010 | 6/33 |
| `error-playbook.md` | ~920 | 700-2,730 | 11/33 |
| `checklist.md` | ~560 | 280-3,830 | 17/33 |
| `tech-stack.md` | ~960 | 300-1,940 | 3/33 |

Typical loads for one agent:

| Task difficulty | Files | Median cost |
|-----------------|-------|------------:|
| Simple | `SKILL.md` + `execution-protocol.md` | ~4,000 |
| Complex | + `tech-stack.md` + `snippets.md` | ~9,000 |

On a 128K-context model a Simple load is ~3% of the window and leaves ~124K to
work in; a Complex load is ~7% and leaves ~119K. On 1M-context models the
pressure is negligible, but unnecessary loading still diverts attention.

**`SKILL.md` is the floor and the largest single item.** It is loaded whenever
the skill is routed to, so it dominates every tier — trimming it beats trimming
any resource. The enforced ceiling is `oma skills audit`'s focus check:

> `SKILL.md` body > **25,000 characters** (~6,250 tokens) → `[WARN] bundle`
> (`FOCUS_BODY_WARN_THRESHOLD` in `cli/commands/skills/audit.ts`)

Run `oma skills audit` after editing a `SKILL.md`. Two skills currently exceed
it (`oma-video`, `oma-translator`); the fix is splitting the skill or pushing
detail into `resources/`, not raising the threshold.

> Earlier revisions of this file listed a "~3,100 token total resource budget"
> with `SKILL.md` at ~800 tokens. No skill has ever met that: the smallest
> `SKILL.md` is 1,540 tokens and every one of the 33 exceeded the 800 figure.
> Budgets that nothing can satisfy get ignored, so the numbers above describe
> what loading costs, and the audit threshold is the limit that is actually
> checked.

---

## Tracking Read Files (Record in Progress)

Agents record read files/symbols when updating progress:

```markdown
## Turn 3 Progress

### Read Files
- app/api/todos.py: create_todo(), update_todo() (find_symbol)
- app/models/todo.py: Todo class (find_symbol)
- app/schemas/todo.py: entire file (short file, 40 lines)

### Not Yet Read
- app/services/todo_service.py (will read next turn)
- tests/test_todos.py (reference after implementation)

### Work Completed
- Added priority field to TodoCreate schema
```

This approach:
- Prevents reading the same file twice
- Clarifies what to do next turn
- Allows Orchestrator to understand agent state

---

## Large File Handling Strategy

### Files Over 500 Lines

1. Use `get_symbols_overview` to understand structure
2. Read only necessary symbols with `find_symbol`
3. Never read the entire file

### Complex Components (React/Flutter)

1. Read only props/state definitions first
2. Read render/build methods only when modification needed
3. Skip style sections unless they are modification targets

### Test Files

1. Read only after implementation is complete (unnecessary before)
2. Check only existing test patterns (first 1-2 test functions)
3. Write remaining tests following the pattern

---

## Context Overflow Symptoms & Responses

| Symptom | Meaning | Response |
|---------|---------|----------|
| Forgetting previously read code | Context window exhausted | Note key info in progress, make re-referenceable |
| Re-reading the same file | Tracking gap | Check "Read Files" list in progress |
| Output suddenly becomes shorter | Output tokens insufficient | Write only essentials, omit extra explanations |
| Ignoring instructions | Forgot SKILL.md content | Re-reference only execution-protocol essentials |

---

## Context Anxiety Detection & Reset Protocol

Long-running agents degrade in quality as context fills up. Rather than passively
responding to symptoms, agents must actively detect and reset.
Detection is the **Orchestrator's responsibility** via external observation.
Individual agents do NOT self-monitor for anxiety; they focus on their task.

### Detection (Orchestrator Only)

The Orchestrator monitors agent progress files and triggers reset when needed.

#### Trigger Conditions

| Condition | Detection Method | Action |
|-----------|-----------------|--------|
| Turn budget exhaustion | Agent consumed >= 80% of `expected_turns` AND acceptance criteria < 50% complete | **Context Reset** |
| Progress stall | No progress file update for 3+ consecutive monitoring cycles | **Context Reset** |
| Shallow output | Result file contains stub markers or TODO placeholders | **Re-spawn with explicit instruction** |

The Orchestrator checks these conditions during PHASE 4 (Monitor) polling.

### Context Reset Procedure

When a trigger fires, the Orchestrator executes:

1. **Checkpoint**: Save agent's current state
   ```
   Write(".agents/state/memories/checkpoint-{agent-id}.md", content)
   ```
   Content (assembled by Orchestrator from progress file):
   - Completed items with file paths
   - Remaining items with acceptance criteria
   - Key decisions made so far

2. **Terminate**: Stop the current agent run

3. **Re-spawn**: Start a fresh agent with the checkpoint as context
   - **Claude Code**: New Agent tool call with checkpoint in prompt
   - **CLI agents**: write the checkpoint to a file and pass that file through the required prompt operand: `oma agent:spawn {agent-id} {checkpoint-file} {session-id} -w {workspace}`

4. **Resume**: New agent reads checkpoint, continues from remaining items only

### Standalone Agent Mode (no Orchestrator)

When an agent runs outside orchestration (e.g., direct `/backend` invocation),
the Sprint Gate in `difficulty-guide.md` serves as the safety net.
At each Sprint Gate, the agent checks:
- [ ] Current sprint deliverable complete
- [ ] lint/test pass
- If sprint took 2x expected turns → write checkpoint and inform user:
  "Sprint exceeded turn budget. Checkpoint saved. Re-invoke to continue."
