# Architecture Agent - Execution Protocol

## Step 0: Prepare
1. Assess difficulty using `../../_shared/core/difficulty-guide.md`
2. Clarify the decision:
   - What is being decided?
   - What constraints already exist?
   - What would make this decision successful?
3. Identify scope:
   - single component/module
   - subsystem
   - cross-cutting system architecture
4. Choose the lightest fitting methodology via `methodology-selection.md`

## Step 1: Frame the Problem
- Separate symptoms from decisions
- Name the architecture concern explicitly:
  - boundary / ownership
  - API shape / caller burden
  - reliability / consistency / scaling
  - migration / investment prioritization
- Record constraints, quality attributes, and non-goals

## Step 2: Gather Context
- Read prior artifacts in `.agents/results/architecture/` first:
  - note decisions that constrain this one
  - if this decision replaces one, plan to mark the old ADR superseded — never silently contradict it
- Analyze only the code and docs relevant to the decision
  - prefer symbol-aware tools (serena MCP: `get_symbols_overview`, `find_symbol`, `find_referencing_symbols`, `search_for_pattern`) when available
- Map existing architecture:
  - key modules or services
  - ownership boundaries
  - integration points
  - current pain points
- If context is vague, start in Diagnostic Mode before deeper analysis

## Step 3: Decide Consultation Depth
- **Simple**: no stakeholder consultation, analyze inline
- **Medium**: consult 1-3 stakeholder agents via `stakeholder-synthesis.md`
- **Complex**: perform a structured stakeholder sweep, then synthesize

## Step 4: Run the Selected Method

### Diagnostic Mode
- Convert vague pain into a concrete architecture problem
- Route into Recommendation, Design-Twice, ATAM-style, or CBAM-style mode

### Recommendation Mode
- Define 2-3 options when the decision is material
- Compare on:
  - boundary clarity
  - quality attributes
  - implementation cost
  - operational cost
  - future change cost

### Design-Twice Mode
- Force at least two materially different options
- Avoid superficial variations on the same decomposition
- Compare and synthesize if needed

### ATAM-style Mode
- Identify quality attribute scenarios
- Write each scenario as stimulus → environment → response measure
  (e.g., "traffic spikes to 5x baseline [stimulus] during a regional failover [environment] → p99 stays under 800ms [response measure]")
- Surface sensitivity points, tradeoff points, risks, and non-risks
- Prioritize architectural concerns by impact

### CBAM-style Mode
- Compare candidate investments
- Estimate benefit, cost, and sequencing value
- Score benefit and cost on a shared 1-5 scale (1 = minimal, 5 = very high) so rankings are comparable across runs
- Tag each estimate with its confidence (low / medium / high) instead of implying false precision
- Recommend a prioritized investment path

### ADR Mode
- Produce a concise decision artifact after analysis

### Transition planning (any mode)
- If the recommended option requires restructuring a live system (service extraction, sync → event-driven, datastore split), append a Transition Plan section using `migration-patterns.md`
- If the change breaks a published API contract, apply `api-evolution.md`

## Step 5: Synthesize
- Summarize stakeholder perspectives
- Separate:
  - agreements
  - tensions
  - assumptions
- Make an explicit recommendation
- If a decision is still user-owned, frame the options and tradeoffs clearly

## Step 6: Verify
- Run `checklist.md`
- Confirm the recommendation is:
  - method-appropriate
  - cost-aware
  - scoped correctly
  - explicit about risks and assumptions
- Make validation executable where possible: propose an architecture fitness function or dependency rule (dependency-cruiser, import-linter, ArchUnit, or equivalent) that fails CI when the decision is violated — a validation step no one can run will not be run

## Step 7: Document
- Save the durable artifact to `.agents/results/architecture/`
- Filename patterns (kebab-case topic, no sequence numbers):
  - `adr-<topic>.md`
  - `architecture-recommendation-<topic>.md`
  - `architecture-review-<topic>.md`
  - `cbam-<topic>.md`
  - `diagnosis-<topic>.md`
- Rerunning the same topic updates the existing file; record the revision in the ADR `Status` line rather than creating a copy
- ADR lifecycle: `Status` is `Proposed`, `Accepted`, or `Superseded by <adr-file>`; when a new ADR replaces an old one, update the old ADR's `Status` in the same run
- When running as a dispatched subagent, ALSO write the run report to `.agents/results/result-architecture.md` per the agent protocol; the report links to the durable artifact, it does not replace it
- Emit and verify the completion decision event:

```bash
oma state:emit "decision.made" '{"subject":"architecture.adr-complete","decision":"<one-line decision>","rationale":"<one-line rationale>"}'
oma state:verify --workflow architecture --checkpoint adr-complete
```

## Escalation
- If the question is really about task sequencing -> hand off to oma-pm
- If the decision is really infra implementation -> hand off to oma-tf-infra
- If the issue is primarily code correctness -> hand off to oma-debug
- If the issue is primarily security/performance/accessibility verification -> hand off to oma-qa
