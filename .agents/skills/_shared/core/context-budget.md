# Context Budget Management

The context window is finite. Especially with Flash-tier models, unnecessary loading directly degrades performance.
Follow this guide to use context efficiently.

---

## Core Principles

1. **No full file reads** — Read only necessary functions/classes
2. **No duplicate reads** — Do not re-read files already read
3. **Lazy resource loading** — Load resources only when needed
4. **Maintain records** — Note read files and symbols in progress

---

## File Reading Strategy

### When Using Serena MCP (Recommended)

```
❌ Bad: read_file("app/api/todos.py")          ← entire file 500 lines
✅ Good: find_symbol("create_todo")             ← just that function 30 lines
✅ Good: get_symbols_overview("app/api")        ← function list only
✅ Good: find_referencing_symbols("TodoService") ← usage only
```

### When Reading Files Without Serena

```
❌ Bad: Read entire file at once
✅ Good: Check first 50 lines (imports + class definitions) → read additional functions as needed
```

---

## Resource Loading Budget

### Flash-tier Models (128K context)

| Category | Budget | Notes |
|----------|--------|-------|
| SKILL.md | ~800 tokens | Auto-loaded |
| execution-protocol.md | ~500 tokens | Always loaded |
| Task resource 1 | ~500 tokens | Selected by difficulty |
| Task resource 2 | ~500 tokens | Complex only |
| error-playbook.md | ~800 tokens | On error only |
| **Total resource budget** | **~3,100 tokens** | ~2.4% of total |
| **Working budget** | **~125K tokens** | Everything else |

### Pro-tier Models (1M+ context)

| Category | Budget | Notes |
|----------|--------|-------|
| Resource budget | ~5,000 tokens | Can load generously |
| Working budget | ~1M tokens | Large files possible |

Pro has less budget pressure, but unnecessary loading still diverts attention.

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
