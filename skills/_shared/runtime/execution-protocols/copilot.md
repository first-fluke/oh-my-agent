# Execution Protocol (GitHub Copilot CLI)

Follow [Execution Policy](../../core/execution-policy.md) and [Agent Result Contract](../result-contract.md). `oma agent spawn` and `oma agent parallel` inject both; native/custom-agent dispatch must read both before starting work. For coordination notes, read [Memory Protocol](../memory-protocol.md).

Custom agents live in `.github/agents/<name>.md` and skills in `.github/skills/`. Repository instructions come from `AGENTS.md`; oma hooks are registered in `.github/hooks/oma.json`.