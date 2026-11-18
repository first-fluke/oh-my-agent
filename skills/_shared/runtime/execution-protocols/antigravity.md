# Execution Protocol (Antigravity)

Follow [Execution Policy](../../core/execution-policy.md) and [Agent Result Contract](../result-contract.md). `oma agent spawn` and `oma agent parallel` inject both; native/custom-agent dispatch must read both before starting work. For coordination notes, read [Memory Protocol](../memory-protocol.md).

## Headless dispatch

For agy subagents (`oma agent spawn` runs them over `agy acp`), ordinary stdout is not a durable completion record. Writable runs must produce the injected structured claim; read-only runs return the exact stdout JSON contract. Missing claims or failed checks cannot be reported as completed.
