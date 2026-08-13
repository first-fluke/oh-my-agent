# DB Agent - Live Schema & Data Migration Playbook

Use this file when a schema or data change must be applied to a live database: altering hot tables, backfilling data, changing types, splitting/merging tables, or cutting over to a new structure.

Scope boundary: `oma-refactor` plans the code-side expand-contract sequence and routes the **database mechanics** here. This file owns lock behavior, backfill execution, cutover verification, and rollback of the data layer.

## Core Position

- Deployment, not commit, is the unit of incrementality for stateful change.
- `git revert` does not restore data. Every phase must be independently deployable and reversible until the contract step.
- Never ship a destructive schema change in the same deploy as the code that requires it.
- A migration that cannot state its lock impact on the largest affected table is not ready to run.

## Expand-Contract for Schemas

Run live changes in four separately deployed phases:

1. **Expand** - additive only
   - Add new columns as nullable (or with a non-volatile default), new tables, new indexes
   - Old code keeps working untouched; new structures are invisible to it
2. **Migrate** - dual-write + backfill
   - New code writes to both old and new structures
   - Batched backfill copies historical data (see below)
   - Verify parity: row counts, checksums, or sampled field comparison between old and new
3. **Switch** - move reads
   - Flip reads to the new structure behind a feature flag
   - Keep dual-write and the old read path available for instant rollback
   - Soak: hold the flag on for an agreed window while monitoring errors and drift
4. **Contract** - remove old
   - Only after the soak window passes and no consumer reads the old structure
   - Drop old columns/tables in a later, separate deploy; take a final backup first

Rollback rule per phase: Expand -> drop the additions; Migrate -> stop dual-write, keep old as truth; Switch -> flip the flag back; Contract -> restore from backup only (this is why contract waits).

## Lock-Aware DDL

Know what each statement locks on your engine and version before running it against a hot table.

- Always set a lock timeout so DDL waits fail fast instead of queueing behind long transactions and blocking all traffic behind them (e.g. PostgreSQL `SET lock_timeout = '2s'` + retry loop).
- PostgreSQL highlights:
  - `CREATE INDEX CONCURRENTLY` instead of plain `CREATE INDEX` on live tables (not inside a transaction)
  - Add `NOT NULL` via `CHECK (... IS NOT NULL) NOT VALID` then `VALIDATE CONSTRAINT` (validation takes a weaker lock)
  - Column type changes that rewrite the table (`ALTER TYPE`) need a dual-column expand-contract instead
  - Adding a column with a constant default is metadata-only on modern versions; volatile defaults rewrite
- MySQL highlights:
  - Check whether the change supports `ALGORITHM=INSTANT` or `INPLACE`; anything forcing `COPY` on a hot table should go through an online schema change tool (gh-ost, pt-online-schema-change)
- Any engine:
  - Run risky DDL at low-traffic windows even when "online"
  - One DDL concern per migration file; do not mix heavy DDL and DML in one transaction

## Batched Backfill

- Batch by primary-key range with a bounded batch size; never one `UPDATE ... WHERE new_col IS NULL` over the whole table
- Make each batch idempotent and record a checkpoint (last key processed) so the job is resumable after failure
- Throttle between batches and watch replication lag; pause when lag exceeds the agreed threshold
- Do not wrap the whole backfill in one transaction: long transactions block vacuum/purge and hold locks
- Backfill runs as application-level code or a migration job, not inside the DDL migration file

## Cutover Verification

Before the switch phase:

- Parity check old vs new (counts, checksums, or sampled diffs) with results recorded
- Read-path comparison in shadow mode where feasible (serve old, compare new, log mismatches)
- Confirm every consumer of the old structure is identified: application paths, reports, ETL, triggers, views

## Migration Hygiene

- Prefer forward-only migrations; if down migrations exist, they must be tested, not decorative
- Test the migration against production-scale data volume, not an empty dev schema
- Record expected duration and lock impact in the migration description
- Schema change management and traceability requirements from `resources/iso-controls.md` apply: approvals for destructive changes, audit trail of who ran what when

## Failure Modes Quick Table

| Failure | Cause | Prevention |
| --- | --- | --- |
| Site-wide stall during DDL | DDL queued behind a long transaction, everything queues behind the DDL | lock timeout + retry, kill long transactions first |
| Backfill causes outage | unbatched update, lock escalation, replication lag | bounded batches, throttle, lag monitoring |
| Cannot roll back after cutover | old structure dropped too early | contract only after soak window + final backup |
| Data drift between old and new | dual-write bug or missed writer | parity checks before switch, single write path per field owner |
| Migration dies halfway | non-idempotent steps, no checkpoint | idempotent batches, resumable checkpointing, transactional DDL where the engine supports it |
