# DB Agent - Error Playbook

## Symptom: Relational model is breaking 3NF everywhere
- Re-check whether reporting columns, derived values, and snapshots are being mixed into OLTP tables
- Split transactional source-of-truth from read models or marts
- Keep denormalization only where query cost justifies it

## Symptom: NoSQL model keeps requiring cross-document joins
- Re-evaluate aggregate boundaries and access patterns
- If strong cross-entity consistency dominates, switch recommendation toward relational storage

## Symptom: Isolation level is unclear
- Start from anomaly prevention required by the business flow
- Document what must be prevented: dirty read, non-repeatable read, phantom, lost update
- Choose the lowest level that still blocks unacceptable anomalies

## Symptom: Capacity estimate is unreliable
- Separate online traffic, batch traffic, retention, and backup retention
- Estimate by object first, then aggregate to tablespace and disk totals
- Add growth and reindex/maintenance headroom

## Symptom: Backup plan exists but restore confidence is low
- Add restore drill frequency
- Define sample recovery scenarios and max tolerable data loss
- Distinguish snapshot/full backup from incremental/log-based recovery

## Symptom: Deadlocks in production
- Read the engine's deadlock log to identify the two lock cycles, not just the victim
- Enforce consistent lock ordering: all transactions touch shared tables/rows in the same order
- Shorten transactions: move reads, external calls, and computation outside the transaction boundary
- Index foreign keys involved in the cycle; unindexed FK checks escalate to scans and widen lock footprints
- Add bounded retry with backoff at the application layer for the surviving unavoidable cases

## Symptom: Replication lag growing
- Look for long-running transactions on the primary holding back apply/vacuum
- Check for unbatched bulk writes (backfills, cascading deletes) and throttle them per `resources/migration-playbook.md`
- Verify large-table DML has supporting indexes on the replica side
- If reads require read-your-writes, route those sessions to the primary or gate on replica LSN/GTID instead of hoping lag stays low

## Symptom: Connection pool exhausted
- Compare app pool size x instance count against the DB's max connections; oversubscription starves everyone
- Hunt leaked connections: sessions idle-in-transaction, missing release on error paths
- Scope sessions to the request/transaction, never to long-lived objects (see backend rule: no shared mutable ORM sessions)
- Front high-instance-count deployments with a server-side pooler (e.g. pgbouncer) instead of raising max connections

## Symptom: Migration failed midway
- Determine what actually applied: transactional DDL engines roll back cleanly; others leave partial state to inspect object-by-object
- Make migration steps idempotent (`IF NOT EXISTS`, guarded DML) so re-running is safe
- Resume batched backfills from their checkpoint rather than restarting from zero
- If the failure was a lock timeout, that is the playbook working: retry at a quieter window per `resources/migration-playbook.md`
