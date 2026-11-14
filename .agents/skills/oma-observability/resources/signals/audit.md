# Audit Signal Reference

## 1. Scope & Distinction

Audit trails answer **who did what when**; tamper-evident evidence for compliance, legal hold, and forensic investigation. They are a distinct signal from both operational logs (`logs.md`) and privacy records (`privacy.md`).

### Integrity and privacy requirements

| Dimension        | Audit                                  | Privacy                                |
|------------------|----------------------------------------|----------------------------------------|
| Retention goal   | Preserve required evidence for the applicable schedule | Minimize collection and assess erasure grounds/exceptions |
| Storage model    | Tamper protection; WORM when required by the selected control | Controls that honor eligible erasure and justified retention |
| Consumers        | Auditors, legal, compliance officers   | Data subjects, DPO, engineering |
| Default posture  | Collect necessary evidence; expire under a justified schedule | Collect only justified personal data |

Audit and privacy are separate concerns, but both apply to personal data in an audit trail. Specify the legal basis, required evidence, access controls, retention period, and erasure exceptions together.

### Distinction from operational logs (`logs.md`)

| Dimension       | Operational logs                    | Audit events                           |
|-----------------|-------------------------------------|----------------------------------------|
| Retention       | Purpose-specific operational schedule | Law/contract/evidence-specific schedule (Section 7) |
| Consumers       | On-call engineers, SRE              | Auditors, legal, compliance            |
| Mutability      | May be rotated and purged           | Protected against unauthorized alteration; WORM when required |
| Storage         | Loki / Elasticsearch / ClickHouse   | Access-controlled evidence store with selected integrity/retention controls |
| Primary tools   | Fluent Bit, OTel Collector          | Falco, auditd, pgaudit, audit pipeline |

Cross-ref `../meta-observability.md` (Section D: Retention Matrix) for unified policy across all signals.

---

## 2. Regulatory Drivers

| Framework | Relevant controls | Audit requirement |
|-----------|-------------------|-------------------|
| **SOC 2 (Type I/II)** | CC7.2 monitoring activities; CC7.3 incident response | Evidence supporting the selected monitoring/response controls; scope and protection depend on the engagement |
| **ISO/IEC 27001:2022** | A.8.15 logging; A.8.16 monitoring | Log protection, log administrator access control |
| **ISO/IEC 27002:2022** | 8.15 logging controls | Protect logs from tampering and unauthorized access |
| **HIPAA Security Rule** | §164.312(b) audit controls; §164.316(b) documentation | Audit mechanisms for ePHI; retain required security documentation for 6 years, not a blanket 6-year rule for every raw log |
| **PCI DSS v4.0** | Requirement 10; track and monitor all access to cardholder data | 1 year online + offline retention; tamper detection |
| **GDPR Art. 30** | Records of processing activities | Audit of data processing operations |

Sources: [iso.org/standard/27001](https://www.iso.org/standard/27001) · [aicpa.org SOC 2](https://www.aicpa.org/soc2) · [hhs.gov HIPAA](https://www.hhs.gov/hipaa/for-professionals/security/index.html) · [pcisecuritystandards.org PCI DSS v4.0](https://www.pcisecuritystandards.org)

---

## 3. Audit Event Categories

| Category | Examples | Regulatory driver |
|----------|----------|-------------------|
| **Authentication** | Login success/failure, MFA challenge, password change, session create/destroy | SOC 2 CC7.2, ISO A.8.15 |
| **Authorization** | Permission grants, role changes, scope escalation, RBAC mutations | SOC 2 CC7.2, PCI DSS 10.2 |
| **Data access** | Read/create/update/delete of regulated data (PII, CHD, PHI) | HIPAA §164.312(b), PCI DSS 10.2 |
| **Administrative** | Config changes, user provisioning, API key lifecycle, certificate rotation | ISO A.5.25, SOC 2 CC7.3 |
| **Security events** | IDS/IPS alerts, anomalous kernel syscalls (Falco), policy violations | SOC 2 CC7.3, ISO A.8.16 |
| **System events** | Kernel audit (Linux auditd), container lifecycle events | ISO A.8.15; cross-ref `logs.md §8 OS-Level Log Sources` |

---

## 4. Required Attributes per Audit Event

Every audit event MUST carry these fields. The names below are this skill's audit schema: OTel defines no audit-event convention. Where a registry attribute exists for the same meaning (`user.id`, `client.address`), use it and confirm its stability in the semconv registry.

| Attribute | Type | Description |
|-----------|------|-------------|
| `user.id` | string | Authenticated identity; pseudonymized or hashed; never plain email (PII) |
| `actor.type` | enum | `user` \| `service_account` \| `system` |
| `action` | string | Verb: `read`, `write`, `delete`, `approve`, `login`, `logout` |
| `resource.type` | string | What was acted on: `order`, `user_record`, `api_key`, `rbac_role` |
| `resource.id` | string | Identifier of the affected resource |
| `event.outcome` | enum | `success` \| `failure` \| `denied` |
| `ip.address` | string | Source IP; may be PII; cross-ref `privacy.md §5 PII Handling Rules by Field` |
| `timestamp` | ISO 8601 UTC | Event time; required for chain ordering (Section 6) |
| `trace_id` | 32-char hex | Correlation with operational trace; cross-ref `../incident-forensics.md` |

```json
{
  "timestamp": "2026-04-21T09:15:32.847Z",
  "actor.type": "user",
  "user.id": "sha256:a3f8c2...",
  "action": "delete",
  "resource.type": "user_record",
  "resource.id": "rec_9f2k1",
  "event.outcome": "success",
  "ip.address": "203.0.113.42",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "service.name": "user-management-api",
  "deployment.environment.name": "production"
}
```

Minimize before write: personal data written to a locked (WORM) store cannot be erased until the lock expires, so an erasure request against it can only be answered with a documented retention exception. Pseudonymize `user.id`, decide `ip.address` handling per `privacy.md`, and keep free-text fields out of audit events.

---

## 5. Immutable WORM Storage (Write-Once-Read-Many)

Select tamper protection and retention controls for the applicable obligation. These frameworks do not establish a universal WORM requirement for every audit log. WORM can implement a selected immutability requirement; document why it is needed before locking records.

| Platform | Mechanism | Key constraint |
|----------|-----------|----------------|
| **AWS S3** | Object Lock; Compliance mode | Cannot delete even by root or AWS support |
| **GCS** | Retention Policy with locked bucket | Lock is irreversible once applied |
| **Azure Blob** | Immutability policy (time-based retention) | Legal hold override available |
| **On-premises** | WORM tape, compliance appliances | Hardware write-protect; chain of custody required |

S3 Object Lock Compliance mode example for a record class whose approved retention is 7 years (not a default for all audit data):

```json
{
  "ObjectLockConfiguration": {
    "ObjectLockEnabled": "Enabled",
    "Rule": {
      "DefaultRetention": {
        "Mode": "COMPLIANCE",
        "Years": 7
      }
    }
  }
}
```

`COMPLIANCE` mode prevents deletion by any principal, including the AWS account root, during the retention period. Use it only when that irreversible behavior matches the approved requirement. `GOVERNANCE` allows privileged override and may suit a different control; choose the mode explicitly.

---

## 6. Tamper Evidence (Cryptographic Integrity)

WORM prevents deletion; tamper evidence proves no records were silently modified or omitted.

**Hash chain:** each event record includes `prev_hash`; the SHA-256 of the previous event. Any insertion, deletion, or modification breaks the chain.

```
event_N.hash = SHA256(event_N.payload + event_{N-1}.hash)
```

**Merkle root anchoring:** daily, compute the Merkle root of all events in the period. Anchor this root to an external transparency log; detached from the audit system; so the anchoring timestamp is independently verifiable.

| Tool | Type | Notes |
|------|------|-------|
| **rekor** (sigstore) | OSS transparency log | OpenSSF project; append-only; publicly verifiable |
| **IBM LinuxONE** | Hardware-backed ledger | Enterprise on-prem |

Source: [github.com/sigstore/rekor](https://github.com/sigstore/rekor)

**Verification schedule:** run chain integrity check weekly (automated), and before any compliance audit. Verification failure is a CRITICAL security event; trigger incident response.

---

## 7. Evidence-Specific Retention Policy

Map each record class to its legal/contractual requirement and purpose. HIPAA required security documentation, PCI audit history, and SOC 2 engagement evidence have different scopes; one period does not prove all compliance. Set an approved retention schedule and erasure/legal-hold exceptions before configuring lifecycle or Object Lock. The table below is a 7-year example only for a record class that needs that period.

| Tier | Duration | Storage | Cost tier |
|------|----------|---------|-----------|
| Hot (recent, searchable) | 90 days | Elasticsearch / Loki | $$$ |
| Warm (searchable, compressed) | 1 year | ClickHouse / archive index | $$ |
| Cold (WORM, immutable) | 7 years | S3 Glacier Deep Archive (Object Lock Compliance) | $ |

**Legal hold:** when an active investigation or litigation hold is active, suppress automated expiry for all affected records regardless of tier. Implement via S3 Object Lock legal hold or equivalent.

**Lifecycle policy:** apply S3 Lifecycle rules to transition objects automatically. Compliance mode Object Lock must be set at write time; it cannot be applied retroactively.

---

## 8. Falco Integration (CNCF Graduated)

Falco provides runtime security detection: anomalous kernel syscalls, container escapes, file access violations, and Kubernetes API abuse.

Source: [falco.org](https://falco.org)

**Deployment:** Falco DaemonSet on every node. Output JSON events → audit pipeline.

Custom Falco rule example (detect secret access in production namespace):

```yaml
- rule: K8s Secret Access in Production
  desc: Detect any read of a Kubernetes secret in the production namespace
  condition: >
    ka.verb=get and ka.target.resource=secrets
    and ka.target.namespace=production
    and not ka.user.name startswith "system:"
  output: >
    Secret accessed (user=%ka.user.name secret=%ka.target.name
    ns=%ka.target.namespace ua=%ka.user-agent)
  priority: WARNING
  source: k8saudit
  tags: [audit, pci_dss, hipaa]
```

**Pipeline integration:** Falco JSON output → `filelogreceiver` (OTel Collector) → audit logs pipeline → the audit evidence store selected in Section 5. Apply the same hash chain enrichment as application audit events before writing.

---

## 9. Kubernetes Audit Logs

Kubernetes API server audit logs record every API call; essential for cluster-admin accountability, secret access auditing, and RBAC change tracking.

| Audit level | Records | Use case |
|-------------|---------|----------|
| `None` | Nothing | Exclude noisy, low-value paths |
| `Metadata` | Method, URL, user, timestamp | Default for most resources |
| `Request` | + request body | Selected non-secret mutations (e.g., RBAC), after assessing sensitive fields |
| `RequestResponse` | + response body | Selected non-secret operations whose bodies are necessary and safe to retain |

Put the Secret metadata-only exception before broader body-recording rules; Kubernetes audit policies use the first matching rule. Do not record Secret `data`/`stringData` or credential response bodies in the audit archive.

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  - level: Metadata
    resources:
      - group: ""
        resources: ["secrets"]
  # Add narrowly scoped, reviewed non-secret rules here.
  - level: Metadata
```

Feed Kubernetes audit logs into the audit pipeline separately from operational logs. Tag with `source: k8s_apiserver` for routing. Source: <https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/>.

---

## 10. Database Audit Logs

| Database | Extension / feature | Notes |
|----------|---------------------|-------|
| PostgreSQL | `pgaudit` extension | Log SELECT, DDL, DML per role |
| MySQL | Enterprise Audit plugin | JSON output; filter by user/schema |
| MongoDB | Audit system (Enterprise) | Filter by action type and collection |
| AWS RDS | Built-in audit logging | Enable via parameter group |
| GCP Cloud SQL | `cloudsql.enable_pgaudit` | Same pgaudit under the hood |
| Azure SQL | Unified Audit Log | Native, sends to Storage/Log Analytics |

Database audit events feed the same audit pipeline as application events. Normalize to the attribute schema in Section 4 before storage.

---

## 11. Access Control on Audit Data

Audit data must be readable by auditors and legal; and not writable by anyone after initial ingest.

- Separate RBAC role: `audit-reader` is distinct from `operations-engineer` and `developer`
- Auditors have read-only access, scoped to approved time ranges
- No single engineer can both produce audit events and modify audit storage
- Cross-ref `privacy.md §11 Backend Access Control (RBAC on Observability Data)` for principle of least privilege patterns

---

## 12. Cross-Signal Correlation

Every audit event carries `trace_id`. During an incident:

1. Start from the audit event (who did what)
2. Pivot via `trace_id` to the operational trace (what the system did)
3. Join with logs (`logs.md §5 Trace ID Injection Rules`) for execution detail
4. Reference `../incident-forensics.md` for the full MRA playbook

Audit events are the authoritative source of truth for incident timelines; operational traces provide the execution context.

---

## 13. References

1. ISO/IEC 27001:2022; <https://www.iso.org/standard/27001>
2. ISO/IEC 27002:2022; <https://www.iso.org/standard/27002>
3. AICPA SOC 2 Common Criteria: <https://www.aicpa.org/soc2>
4. HIPAA Security Rule §164.312(b): <https://www.hhs.gov/hipaa/for-professionals/security/index.html>
5. PCI DSS v4.0 Requirement 10: <https://www.pcisecuritystandards.org>
6. GDPR Art. 30: <https://gdpr-info.eu/art-30-gdpr/>
7. Falco: <https://falco.org>
8. sigstore rekor: <https://github.com/sigstore/rekor>
9. OTel semconv attribute registry: <https://opentelemetry.io/docs/specs/semconv/registry/attributes/>
10. `../standards.md` · `../matrix.md` · `../meta-observability.md` · `../incident-forensics.md` · `privacy.md` · `logs.md`
