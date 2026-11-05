---
name: tools
description: Manage MCP tools with natural language commands to list, enable, and disable tools and tool groups
disable-model-invocation: true
---

- **Response language: the user's prompt language first, then `language` in `.agents/oma-config.yaml`, then English.**
- Follow `.agents/skills/_shared/core/execution-policy.md` for authorization, clarification, verification, and completion. Execute required steps on the selected path in dependency order; apply documented branch and skip conditions.
- **Read configuration files BEFORE making changes.**

---

> **Vendor note:** This workflow executes inline (no subagent spawning). All vendors use their native file reading tools to inspect MCP and skill configurations.

---

## Step 1: Parse User Command

Parse the request once. With no arguments, treat `/tools` as a status query:

| Command Pattern | Interpretation |
|-----------------|----------------|
| No arguments, "current status", "list", "show" | Query: display status in Step 2, then end |
| "memory tools only", "enable only {group}" | Set only that group's tools in `available_tools` |
| "disable {tool}", "turn off {tool}" | Remove that tool from `available_tools` |
| "enable all", "turn on all", "reset" | Set `available_tools: null` |
| "enable only {tool1}, {tool2}" | Set only specified tools in `available_tools` |

**Group combination support:**
- "memory + file tools" → Merge `memory` + `file-ops` groups
- "all except code analysis" → Exclude `code-analysis` from `all`

---

## Step 2: Read Configuration & Route

1. Read `.agents/mcp.json` (project configuration)
2. Read `~/.gemini/settings.json` if exists (Gemini CLI global settings); optional
3. Resolve the target server, tools, and groups from the parsed request. Handle the conditional input cases below before any update.
4. For a query, display status for each requested MCP server:
   - `available_tools: null` → "All enabled (no restrictions)"
   - `available_tools: [...]` → "N tools enabled" + list
5. For a query, display available groups if `toolGroups` is defined, then end the workflow. For a change request, proceed to Step 3 without printing a separate status report.

**Output example:**
```
Current MCP Tool Status

[serena]
- Status: All enabled (no restrictions)
- Available tools: 15

Available Tool Groups:
- memory: read_memory, write_memory, edit_memory, list_memories, delete_memory
- code-analysis: get_symbols_overview, find_symbol, find_referencing_symbols, search_for_pattern
- code-edit: replace_symbol_body, insert_after_symbol, insert_before_symbol, rename_symbol
- file-ops: list_dir, find_file
- all: All tools (no restrictions)
```

---

## Step 3: Update Configuration

1. **Show before/after diff:**
   ```
   Pending mcp.json changes:

   Before:
   - serena.available_tools: null (all)

   After:
   - serena.available_tools: ["read_memory", "write_memory", "edit_memory", "list_memories", "delete_memory"]
   ```

2. Apply the execution policy: reuse an explicit tool-change request; ask only if the target or intended restriction is unresolved. If the proposed configuration is unchanged, report that and end. Otherwise modify `.agents/mcp.json` and read back the affected values to verify the update.

3. **Completion message:**
   ```
   Done! serena can now only use memory tools.

   Note: Changes will fully apply after IDE/CLI restart.
   Previous settings may continue to apply in current session.
   ```

---

## Conditional Input Handling (before updates)

### Unknown Tool Name
```
'{tool_name}' is an unknown tool.

Similar tools:
- read_memory
- write_memory

Please enter the exact tool name.
```

### Server Conflict
When multiple MCP servers are configured and the request does not identify the target:
```
Multiple MCP servers detected:
- serena
- custom-memory

Which server's tools would you like to modify?
1. serena
2. custom-memory
3. All
```

### Empty Tool List
If disabling all tools was explicitly requested, apply that request. Otherwise explain the empty-list consequence and clarify before writing:
```
Setting available_tools to an empty array will disable all tools for that server.
Are you sure you want to continue? (Y/N)
```

---

## Quick Reference

| Command | Result |
|---------|--------|
| `/tools` | Show current status |
| `/tools memory only` | Enable only memory tools |
| `/tools code analysis + memory` | Enable both groups |
| `/tools all` | Enable all tools (reset) |
| `/tools read_memory, write_memory only` | Enable only specified tools |
| `/tools disable code edit` | Remove that group |

---

**Note:** If IDE/CLI doesn't directly support `available_tools`,
tool usage must be self-restricted at the workflow level.
