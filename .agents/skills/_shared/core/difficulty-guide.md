# Difficulty Assessment & Protocol Branching

All agents assess task difficulty at the start and apply the appropriate protocol depth.

## Difficulty Assessment Criteria

### Simple
- Single file change
- Clear requirements (e.g., "change button color", "add field")
- Repeating existing patterns
- **Expected turns**: 3-5

### Medium
- 2-3 file changes
- Some design decisions needed
- Applying existing patterns to new domains
- **Expected turns**: 8-15

### Complex
- 4+ file changes
- Architecture decisions required
- Introducing new patterns
- Dependencies on other agent outputs
- **Expected turns**: 15-25

---

## Protocol Branching

### Simple → Fast Track
1. ~~Step 1 (Analyze)~~: Skip — proceed directly to implementation
2. Step 3 (Implement): Implementation
3. Step 4 (Verify): Minimal checklist items only

### Medium → Standard Protocol
1. Step 1 (Analyze): Brief
2. Step 2 (Plan): Brief
3. Step 3 (Implement): Full
4. Step 4 (Verify): Full

### Complex → Extended Protocol
1. Step 1 (Analyze): Full + explore existing code with Serena
2. Step 2 (Plan): Full + record plan in progress
3. **Step 2.5 (Checkpoint)**: Record plan in `progress-{agent-id}.md`
4. Step 3 (Implement): Full
5. **Step 3.5 (Mid-check)**: Update progress at 50% implementation + verify direction
6. Step 4 (Verify): Full + also execute `../_shared/core/common-checklist.md`

---

## Difficulty Misjudgment Recovery

- Started as Simple but more complex than expected → Switch to Medium protocol, record in progress
- Started as Medium but architecture decisions needed → Upgrade to Complex
- Started as Complex but actually simple → Just finish quickly (minimal overhead)
