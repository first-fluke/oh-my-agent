# TF Infra Agent - ISO/IEC 42001 / ISO 22301 / ISO/IEC/IEEE 42010 Guide

Use this file when the task involves AI systems and the user wants infrastructure controls or audit-friendly recommendations aligned with ISO/IEC 42001, continuity and recovery guidance aligned with ISO 22301, or infrastructure architecture documentation guidance aligned with ISO/IEC/IEEE 42010.

## Scope

This guide is for:

- **infrastructure controls** that support AI governance
- **continuity and recovery controls** for infrastructure resilience
- **architecture description guidance** for infrastructure decisions

It does **not** replace:

- organizational policy
- model governance
- human oversight design
- AI risk management process ownership

Those belong primarily to PM, QA, backend, or security governance work.

## What to Cover

The SKILL.md guardrails already require least privilege, private connectivity, encryption, logging, and tagging. Add these standard-specific points:

| Lens | Infrastructure points to document |
|---|---|
| ISO/IEC 42001 (AI systems) | Who can reach model endpoints, vector stores, and training/prompt data stores; where prompts, embeddings, and outputs are stored and how long they are retained; audit trail of infrastructure changes (plan/apply evidence in CI); tenant segmentation when AI data is multi-tenant |
| ISO 22301 (continuity) | Critical services and their RTO/RPO assumptions; backup scope covering canonical data stores, not only derived indexes; embedding-index rebuild strategy; tested restore; failover and cross-zone/region strategy; dependency chain for identity, DNS, storage, and network |
| ISO/IEC/IEEE 42010 (architecture description) | Stakeholders and their concerns; the views that answer them (context, deployment, network boundary, identity and trust, resilience, observability); interfaces, constraints, and decision rationale |

## Output Pattern

When relevant, add a short section like:

```md
## ISO/IEC 42001 / ISO 22301 / 42010 Notes
- Access control:
- Network boundary:
- Encryption:
- Logging / auditability:
- Monitoring / alerting:
- Backup / retention:
- Continuity / RTO / RPO:
- Failover / dependency view:
- Stakeholders / concerns / views:
- Gaps:
- Recommended Terraform changes:
```

## Guardrails

- Do not claim ISO/IEC 42001 compliance from Terraform alone
- Do not claim ISO 22301 compliance from backup settings alone
- Do not expand this skill into full AI governance process design
- Do not turn 42010 into paperwork without architectural value
- Keep suggestions concrete and infra-implementable
- If the gap is organizational rather than infrastructural, say so explicitly
