# Quality Principles

Use these principles for implementation and review decisions. Authorization, clarification, verification, and completion follow `execution-policy.md`.

- Establish the requested behavior from the task, repository, and relevant tests. State material assumptions; compare alternatives when an unresolved design choice changes the outcome.
- Prefer an implementation that solves the current problem without speculative features. Preserve useful existing abstractions and project conventions; line count alone is not a reason to rewrite working code.
- Keep edits within the requested scope. Preserve unrelated work and avoid turning an adjacent issue into an unrequested refactor.
- Verify the affected behavior with meaningful evidence. Reproduce bugs before fixing where feasible; use characterization tests for behavior-preserving refactors. Use the project's test approach and relevant static or manual checks when appropriate.
- Report what the evidence supports and what remains unverified. Re-run checks after relevant changes or failures, not to fill a fixed review count.

`test-approach.md` defines the plan's test evidence contract. `common-checklist.md` provides optional cross-domain review prompts.
