# Code Intelligence Capability Contract

Use the repository's configured `code_intelligence` capability for code search,
navigation, impact analysis, and contract discovery. Do not name a provider as a
requirement in a workflow or skill.

## Resolve the capability

1. Read the project configuration and discover the provider's actual tools.
2. Use the configured provider when its tools are available for this repository.
3. Do not install, initialize, track, or register a repository from an agent
   session. Project-root tracking and exclude maintenance belong to
   `oma install` / `oma update`; if the provider reports the repository as
   untracked, tell the user to run `oma update`.
4. If the provider is unavailable, has no applicable tool, or times out, use
   native search and scoped file reads. Record the fallback and its limits in
   the result.
5. The `code-intelligence-guard` PreToolUse hook enforces this contract while a
   provider is configured (`providers.code_intelligence_guard: block`, the
   default): native `Grep` / `Glob` and recursive shell search (`rg`, `grep -r`,
   `find -name`, `git grep`) are denied and the reason names the provider tool
   to use. In the fallback case of rule 4, prefix the shell search command with
   `OMA_CI_ALLOW_NATIVE=1`; that prefix is the recorded fallback signal.

The fallback is valid evidence when it covers the requested scope; it is not a
reason to stop independent work or to silently switch to another provider.

## State is independent of code intelligence

Workflow session, progress, result, and lesson artifacts use the configured
file-memory path from `../runtime/memory-protocol.md`. Code-intelligence MCP memory tools
do not own those artifacts and are never required to read or write them.

## Result record

Record one of:

```yaml
code_intelligence:
  provider: configured-provider | native
  mode: available | unavailable | timeout | fallback
  tools: [discovered_tool]
  limitation: null | "reason native fallback was used"
```
