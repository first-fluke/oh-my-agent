# PLAN Phase Protocol

Execution guide for PLAN Phase (Steps 1-4) in ultrawork workflow. Use `.agents/workflows/ultrawork/resources/phase-gates.md` for canonical criteria and `.agents/workflows/ultrawork.md` for reviewer dispatch; this resource does not start additional reviews.

---

## Step 1: Create Plan

### Tasks
- Define scope, features, architecture
- Resolve material assumptions from context; compare alternatives for unresolved decisions

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
- [ ] The assigned fresh reviewer checks Step 2 findings against plan criteria and evidence
- [ ] Uncovered requirements or unsupported findings are identified
- [ ] The verdict follows the canonical PLAN_GATE and CCR dispatch contract

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
- [ ] Material assumptions documented
- [ ] Alternatives considered for unresolved major decisions
- [ ] Over-engineering review completed
- [ ] Execution policy applied; existing authorization reused

**Gate failure → Return to Step 1 to revise plan**
