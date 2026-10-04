# Refactor Governance

Use the target project's documented conventions. These examples do not create
organization policy or change the authority of repository instructions.

## G-1. Budget
Use an agreed refactoring budget when the organization has one. A small scoped
refactor does not require introducing a capacity floor or measurement platform.

## G-2. Budget usage
Distinguish preparatory work required by a feature from separately planned debt
repayment when the project tracks those costs.

## G-3. Outcomes
Use measured delivery, reliability and maintenance outcomes to adjust an adopted
budget in either direction. Do not infer fixed cost percentages without evidence.

## G-4. Metrics
Select work by observed change difficulty and defects. Metrics support decisions;
they do not require splitting code or spending a fixed quota.

## G-5. File size
Follow an existing size gate if present. File length is a review signal; split by
responsibility when that improves navigation and coupling. Do not add a 500-line
CI gate or demand an ADR for an unrelated scoped edit. For a useful split map,
keep a short entry-file comment listing related paths and roles current.

## G-6. Test tools
Use the repository's existing test runner and coverage commands, including Jest,
Vitest, unittest, pytest, XCTest, Swift Testing, cargo test, or go test as applicable.
An unlisted language does not block refactoring or require an ADR. Add coverage or
mutation instrumentation only when relevant to the task and available in the
project; a runner migration is separate work.
