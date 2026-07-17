# Architecture Agent - Examples

## Example 1: Recommendation Mode

**Request**: "Should this notifications subsystem become a separate service?"

**Good Output Shape**:
- Problem framing
- Current constraints
- Option A: keep in monolith, extract internal module
- Option B: dedicated service
- Comparison table
- Recommendation
- Risks and validation steps

## Example 2: ATAM-style Mode

**Request**: "Review this architecture for reliability and scaling tradeoffs."

**Good Output Shape**:
- Quality attribute scenarios
- Architectural approaches under review
- Sensitivity points
- Tradeoff points
- Risks / non-risks
- Prioritized recommendations

## Example 3: CBAM-style Mode

**Request**: "Which architecture refactor should we invest in first next quarter?"

**Good Output Shape**:
- Candidate investments
- Estimated benefit
- Estimated implementation cost
- Operational impact
- Priority ranking
- Recommended sequence

## Example 4: Diagnostic Mode

**Request**: "This code works, but every small change touches five files and I hate it."

**Good Output Shape**:
- Symptom summary
- Likely architecture cause
- Why this is an architecture problem instead of a bug/QA issue
- Selected next mode: Recommendation or ATAM-style

## Example 5: ADR Mode

**Request**: "Write an ADR for choosing event-driven processing over synchronous orchestration."

**Good Output Shape**:
- Context
- Decision
- Alternatives considered
- Consequences
- Follow-up validation

## Example 6: Filled ADR (abridged)

A concrete anchor for the quality bar — note the specific tradeoffs, the superseded reference, and the executable validation:

```md
# ADR: async-order-fulfillment

- Status: Accepted
- Date: 2026-03-02
- Supersedes: none

## Context
Order placement calls inventory, payment, and shipping synchronously; p99 is 4.1s
and a shipping-provider outage on 2026-02-14 failed 100% of checkouts for 40 min.
Constraint: payment capture must stay synchronous (PCI flow owned by the gateway).

## Decision
Keep payment in the request path. Move inventory reservation and shipping label
creation to consumers of an `order.placed` event on the existing queue. The order
row is written in `PENDING_FULFILLMENT` before the event is published (outbox table).

## Alternatives Considered
- Full saga incl. payment: rejected — payment gateway contract requires sync capture.
- Parallel sync fan-out: cuts p99 to ~1.8s but keeps the shipping outage as a
  checkout outage; rejected because availability, not latency, drove this ADR.

## Consequences
- Checkout p99 bounded by payment (~900ms); shipping outages degrade to delayed
  fulfillment instead of failed orders.
- New failure mode: stuck `PENDING_FULFILLMENT` orders — needs a reconciliation job.
- Team must operate a DLQ; on-call runbook required before rollout.

## Follow-up Validation
- Load test: checkout p99 < 1.2s at 2x peak with shipping consumer paused.
- Chaos check: kill shipping consumer 30 min; zero failed checkouts, all orders
  fulfilled after recovery.
- Fitness function: dependency-cruiser rule — `checkout/` may not import `shipping/`.
```
