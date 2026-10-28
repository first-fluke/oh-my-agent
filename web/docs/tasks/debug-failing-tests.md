---
title: Debug a failing test
description: Reproduce a test failure, isolate its cause, make a bounded fix, and verify a regression with the project's existing test runner.
---

# Debug a failing test

Use `oma-debug` when you have a failing command, a stack trace, or a repeatable incorrect result.

## Load the skill

Ask your coding agent to run this command and read its instructions and support directory:

```bash
bunx skills use first-fluke/oh-my-agent@oma-debug
```

## Provide the input

- The exact failing command and complete relevant failure output.
- Expected behavior, checkout/ref, runtime version, and required local services.
- The files or recent change you suspect, plus the permitted edit scope.

## Give the task

This concrete example uses this repository's plugin-bootstrap regression fixtures. Use your own failing command for another project.

```text
Use oma-debug to investigate the plugin-bootstrap test failure. Reproduce it with:
bun run --cwd cli test --project scripts --maxWorkers 1 plugin-bootstrap.test.ts
Expected behavior: a Bash installer runs through Bash, each project has its own
wiring receipt, and failed wiring never records readiness. Establish the failure
before editing. If the test already passes, report that result rather than
inventing a repair. Limit changes to the bootstrap and relevant regression tests.
Re-run the failing case and related hook fixtures; report commands and exits.
```

## Check the result

Expect the reproduced failure, its causal path, the scoped patch, and a regression test tied to that failure. The report should separate an unavailable environment from a diagnosed code defect.

Check that the regression fails for the original behavior and passes with the fix. Re-run the stated command in the same environment, then inspect related-test results. If reproduction remains blocked, expect the exact blocker and the weaker evidence available.

## Dependencies and next step

The agent uses your project's test runner and configured source-navigation tools. The example requires existing Bun and repository development dependencies. These plugin fixtures are skipped on Windows; use a failing test supported by your platform. Skill loading does not install dependencies or repair a missing service.

See the [plugin-hook repair example](../examples/plugin-hook-repair.md) for the actual source change and fixture boundaries. For managed execution or project hooks, [choose a runtime setup](../getting-started/choose-setup.md#install-a-skill-preset) that includes `oma-debug`.
