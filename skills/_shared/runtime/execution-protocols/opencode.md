# Execution Protocol (opencode)

Follow [Execution Policy](../../core/execution-policy.md) and [Agent Result Contract](../result-contract.md). `oma agent spawn` and `oma agent parallel` inject both; native/custom-agent dispatch must read both before starting work. For coordination notes, read [Memory Protocol](../memory-protocol.md).

## Desktop MCP timeout recovery

When a long-lived Desktop MCP client is stuck, use the configured code-intelligence fallback in [Code Intelligence](../../core/code-intelligence.md); file-based state remains available. Repeated calls to the stuck client do not repair it. Report whether a full Desktop relaunch is needed; do not relaunch the app automatically.

Only when Serena is the configured provider: its CLI analysis commands are unavailable (`serena tools` lists/describes tools). Native search is only for paths outside this project or ignored paths; `serena project health-check` can diagnose the project. Do not switch providers or initialize/index a repository as an implicit recovery step.
