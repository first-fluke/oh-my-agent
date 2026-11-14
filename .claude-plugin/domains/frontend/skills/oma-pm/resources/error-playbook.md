# PM Agent - Error Recovery Playbook

When you encounter a failure during planning, follow these recovery steps.

---

## Requirements Ambiguous

**Symptoms**: User request is vague ("Make me a good app", "Make it better")

1. Break down what you DO understand
2. List specific assumptions you're making
3. Create plan based on reasonable assumptions
4. Mark assumptions clearly: `Assumption: [description]`
5. **NEVER do this**: Create tasks whose ambiguity is left unstated. If you cannot even state a reasonable assumption for a task, stop and ask instead of planning it (agents will lose direction)

---

## Existing Codebase Unknown

**Symptoms**: Planning for an existing project but don't know the architecture

1. Use the configured provider to inspect source structure, following `../../_shared/core/code-intelligence.md`
2. Look for framework indicators: `package.json`, `pyproject.toml`, `pubspec.yaml`
3. Check for existing patterns: search for `@app.get|@app.post` (FastAPI) with the configured provider or native tools
4. If unavailable, inspect paths outside this project or ignored paths with native search; record any remaining architecture assumptions in the plan

---

## Task Decomposition Too Granular or Too Coarse

**Self-check**:
- Each task is completable by a single agent and has its own testable acceptance criteria
- Merge tasks that cannot be verified separately or that deliver one outcome ("Implement user auth API" is one task, not five)
- Split a task that spans more than one agent domain, bundles independently deliverable outcomes, or reaches into another task's internal state instead of its public contract
- If unsure: err on the side of fewer, larger tasks

---

## Dependency Deadlock

**Symptoms**: Task A depends on B, B depends on A (circular)

1. Identify the cycle
2. Break it by defining an API contract or shared interface first
3. Create a tier-1 task: "Define API contracts" (no dependencies), and shift the formerly-circular tasks to tier 2+
4. Both tasks then depend on the contract, not on each other

---

## Tech Stack Decision Unclear

**Symptoms**: Multiple valid options, no clear winner

1. Check existing codebase first; consistency wins over "better" tech
2. If greenfield: take the default from the owning domain skill's tech-stack reference
   - Frontend: `oma-frontend/resources/tech-stack.md`
   - Backend: `oma-backend/variants/{node,python,rust}/tech-stack.md`
   - Mobile: `oma-mobile/resources/tech-stack.md`
3. Record the choice in the plan's `architecture_decisions` entry (`decision`, `rationale`, `alternatives_considered`)

---

## Workflow State / Quota Issues

Same as the `oma-backend` playbook: see the "Rate Limit / Quota Error (LLM runtime)" and "Workflow State Unavailable" sections in `../../oma-backend/resources/error-playbook.md`.

---

## General Principles

- **Plans are not code**: They don't need to be perfect. Agents can adjust during execution
- **Blocked**: When planning cannot proceed without a missing fact or decision, save the current plan state and report `blocked` with the exact missing input
- **No code writing**: PM only plans; delegate implementation to other agents
