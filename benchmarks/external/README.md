# External benchmarks

This directory holds benchmark tracks that are **not** part of the generated
[`benchmarks/README.md`](../README.md) scoreboard.

The main scoreboard compares Claude Code harnesses on one prompt with a fixed
model. External tracks may use different models, executors, task sets, and
scoring, so their numbers are **not comparable** to the main table. Keep them
separate and link the methodology instead of merging scores.

| Track | What it measures | Report |
|---|---|---|
| Main harness benchmark | OMA vs vanilla / omc / ecc / superpowers on one build prompt | [`benchmarks/README.md`](../README.md) |
| Harness² external | Agent task success on JobBench / LAB / WorkBuddy-Bench via OpenCode or Codex | [`harness2/README.md`](harness2/README.md) |

External tracks are opt-in and manual. They are not release gates and do not
auto-update any README.