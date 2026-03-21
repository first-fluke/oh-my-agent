# Skill Routing Map

Routing rules for oma-orchestrator and oma-coordination to assign tasks to the correct agent.

## Progressive Disclosure

Skills use two-stage loading to optimize context usage:

1. **Stage 1 (always loaded)**: `name` and `description` from SKILL.md frontmatter
2. **Stage 2 (on match)**: Full SKILL.md body loaded only when the description matches the user's request

Match the user's request keywords against each skill's `description`. Load full instructions only for matched skills.

---

## Keyword → Skill Mapping

| User Request Keywords | Primary Skill | Notes |
|----------------------|---------------|-------|
| API, endpoint, REST, GraphQL, database, migration | **oma-backend** | |
| auth, JWT, login, register, password | **oma-backend** | Auth UI task can also be created for frontend |
| UI, component, page, form, screen (web) | **oma-frontend** | |
| style, Tailwind, responsive, CSS | **oma-frontend** | |
| mobile, iOS, Android, Flutter, React Native, app | **oma-mobile** | |
| offline, push notification, camera, GPS | **oma-mobile** | |
| bug, error, crash, broken, slow | **oma-debug** | |
| review, security, performance | **oma-qa** | |
| accessibility, WCAG, a11y | **oma-qa** | |
| brainstorm, ideate, design, explore, idea, concept | **oma-brainstorm** | Run before oma-pm |
| plan, breakdown, task, sprint | **oma-pm** | |
| automatic, parallel, orchestrate | **oma-orchestrator** | |
| workflow, guide, manual, step-by-step | **oma-coordination** | |

---

## Complex Request Routing

| Request Pattern | Execution Order |
|----------------|-----------------|
| "Create a fullstack app" | oma-pm → (oma-backend + oma-frontend) parallel → oma-qa |
| "Create a mobile app" | oma-pm → (oma-backend + oma-mobile) parallel → oma-qa |
| "Fullstack + mobile" | oma-pm → (oma-backend + oma-frontend + oma-mobile) parallel → oma-qa |
| "Fix bug and review" | oma-debug → oma-qa |
| "Add feature and test" | oma-pm → relevant agent → oma-qa |
| "I have an idea for a feature" | oma-brainstorm → oma-pm → relevant agents → oma-qa |
| "Let's design something new" | oma-brainstorm → oma-pm → relevant agents → oma-qa |
| "Do everything automatically" | oma-orchestrator (internally oma-pm → agents → oma-qa) |
| "I'll manage manually" | oma-coordination |

---

## Inter-Agent Dependency Rules

### Parallel Execution Possible (No Dependencies)
- oma-backend + oma-frontend (when API contract is pre-defined)
- oma-backend + oma-mobile (when API contract is pre-defined)
- oma-frontend + oma-mobile (independent of each other)

### Sequential Execution Required
- oma-brainstorm → oma-pm (design comes before planning)
- oma-pm → all other agents (planning comes first)
- implementation agent → oma-qa (review after implementation complete)
- implementation agent → oma-debug (debugging after implementation complete)
- oma-backend → oma-frontend/oma-mobile (when executing parallel without API contract)

### QA Is Always Last
- oma-qa runs after all implementation tasks are complete
- Exception: Can run immediately if user requests review of specific files only

---

## Escalation Rules

| Situation | Escalation Target |
|-----------|------------------|
| Agent finds bug in different domain | Create task for oma-debug |
| QA finds CRITICAL issue | Re-run relevant domain agent |
| Architecture change needed | Request re-planning from oma-pm |
| Performance issue found (during implementation) | Current agent fixes, oma-debug if severe |
| API contract mismatch | oma-orchestrator re-runs oma-backend |

---

## Turn Limit Guide by Agent

| Agent | Default Turns | Max Turns (including retries) |
|-------|--------------|------------------------------|
| oma-pm | 10 | 15 |
| oma-backend | 20 | 30 |
| oma-frontend | 20 | 30 |
| oma-mobile | 20 | 30 |
| oma-debug | 15 | 25 |
| oma-qa | 15 | 20 |
