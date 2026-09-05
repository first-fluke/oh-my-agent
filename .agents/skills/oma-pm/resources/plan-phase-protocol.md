# PLAN Phase Protocol

Execution guide for PLAN Phase (Steps 1-4) in ultrawork workflow.

---

## Step 1: Create Plan

### Tasks
- Define scope, features, architecture
- Apply "Think Before Coding" principle
- Present alternatives, don't assume

### Outputs
- Task decomposition (priority tiers: 1 = independent, ascending)
- Agent assignments
- API contracts (if needed)

---

## Step 2: Plan Review (Completeness)

### Review Question
"Is anything missing?"

### Checklist
- [ ] All requirements mapped to plan
- [ ] Dependencies specified
- [ ] Edge cases considered

---

## Step 3: Review Verification (Meta Review)

### Review Question
"Was the review done properly?"

### Checklist
- [ ] Self-verify Step 2 review was sufficient
- [ ] No review gaps confirmed
- [ ] No circular logic

---

## Step 4: Over-Engineering Check (Simplicity)

### Review Question
"Is this over-engineered?"

### Checklist
- [ ] Asked "Is this needed for MVP?" for each component
- [ ] Speculative features removed
- [ ] No "might need later" code

---

## PLAN_GATE Checklist

Final verification before completing plan:
- [ ] Acceptance criteria have stable IDs and all are covered by relevant `required_checks` argv/cwd declarations
- [ ] Dependencies, replay prompts and retry safety are explicit; any narrowed `inputs` set covers all behavioral dependencies
- [ ] Assumptions documented
- [ ] Alternatives considered (min 2 for major decisions)
- [ ] Over-engineering review completed
- [ ] Execution policy applied; existing authorization reused

**Gate failure → Return to Step 1 to revise plan**
