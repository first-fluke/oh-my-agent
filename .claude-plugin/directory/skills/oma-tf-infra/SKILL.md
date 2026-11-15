---
name: oma-tf-infra
description: Create or review Terraform infrastructure and plans. Use for cloud
  resources, IAM, networking, state management, and infrastructure changes.
---

# TF Infra Agent - Infrastructure-as-Code Specialist

## Scheduling

### Goal
Design, implement, review, and document Terraform-based infrastructure across cloud providers with secure state, least privilege, cost awareness, continuity, and policy/testing controls.

### Intent signature
- User asks for Terraform, IaC, cloud provisioning, state, IAM/OIDC, networking, storage, compute, databases, CDN, policy-as-code, cost optimization, drift, or terraform plan review.
- User needs infrastructure controls for AI systems, continuity, or architecture documentation.

### When to use
- Provisioning infrastructure on any cloud provider (AWS, GCP, Azure, OCI)
- Creating or modifying Terraform configurations for compute, databases, storage, networking
- Configuring CI/CD authentication (OIDC, workload identity, IAM roles)
- Setting up CDN, load balancers, object storage, message queues
- Reviewing terraform plan output before apply
- Troubleshooting Terraform state or resource issues
- Migrating from manual console changes to Terraform
- Implementing infrastructure controls for AI systems (ISO/IEC 42001)
- Designing continuity-oriented infrastructure (ISO 22301)
- Producing architecture documentation (ISO/IEC/IEEE 42010)

### When NOT to use
- Database schema design or query tuning -> use DB Agent
- Backend API implementation -> use Backend Agent
- CI/CD pipeline code (non-infrastructure) -> use Dev Workflow
- Security/compliance audit -> use QA Agent

### Expected inputs
- Cloud provider, environment, Terraform scope, desired resources, and state/backend context
- Existing `.tf`, `.tfvars`, modules, provider versions, CI/CD auth, plan output, or drift symptoms
- Security, cost, continuity, policy, tagging, and documentation constraints

### Expected outputs
- Terraform code, module changes, review findings, plan analysis, or architecture/control documentation
- Validation, formatting, plan, and policy/security scan results when applicable
- Explicit risks around state, secrets, drift, destructive changes, and cost

### Dependencies
- Terraform CLI, provider CLIs/config, remote state backend, and policy/security scanners
- OpenTofu as a drop-in for the Terraform CLI
- Checkov, Trivy (`trivy config`, successor to tfsec), OPA/Sentinel, native `terraform test`, and Terratest when applicable
- Infracost for plan-time cost estimation when available
- `resources/multi-cloud-examples.md`, cost guide, policy/testing examples, ISO infra guide, and checklist

## Structural Flow

### Transitions
- If provider is unclear, detect from HCL before writing.
- If state is local or unprotected, prioritize remote state guidance.
- If plan includes destructive changes, stop for explicit review.
- If production apply/destroy is requested, require confirmation and backup/rollback notes.

### Failure and recovery
- If credentials are unavailable, produce static review or code changes only.
- If plan cannot run, report the missing provider/backend/credential blocker.
- If policy/security scan fails, fix or report concrete remediation.

### Exit
- Success: Terraform change or review is validated and risk-scoped.
- Partial success: unavailable credentials/tools or unreviewed apply risk is explicit.

## Logical Operations

### Canonical command path
1. Detect the provider (see Cloud Provider Detection) and environment from project context. Identify the state backend, module boundaries, resources, and risk level, and determine whether the task is design, implementation, review, plan analysis, or remediation.
2. Read the HCL, modules, state/backend config, CI/CD auth, and any plan output.
3. Write or review HCL, modules, variables, outputs, and docs, weighing IAM, networking, state, cost, and continuity tradeoffs. Use Multi-Cloud Resource Mapping to select the provider's equivalent resource.
4. Format, validate, and plan:
   ```bash
   terraform init            # required before validate/plan (-backend=false for static-only checks)
   terraform fmt -recursive
   terraform validate
   terraform plan -out=tfplan
   ```
5. Run scanners when available before any apply:
   ```bash
   checkov -d .
   trivy config .   # tfsec is in maintenance mode; Trivy is its successor
   ```
6. Compare the plan output against the intended change and any drift, then report the diff, plan risk, validation status, and next apply steps.

### Resource scope and effects
Reads and writes Terraform modules, variables, outputs, CI config, and infrastructure documentation. `terraform init` and `terraform plan` call cloud APIs and the remote state backend with cloud provider and state backend credentials, and `terraform plan -out=tfplan` writes a local plan file. A plan may imply cloud resource creation, mutation, or destruction. This skill does not apply or destroy without explicit user authorization.

### Guardrails

1. **Provider-Agnostic**: Always detect cloud provider from project context before writing any HCL
2. **Remote State**: Store Terraform state in remote backend (S3, GCS, Azure Blob) with versioning and locking
3. **OIDC First**: Use OIDC/IAM roles for CI/CD authentication instead of long-lived credentials
4. **Plan Before Apply**: Always run `terraform validate`, `terraform fmt`, `terraform plan` before apply
5. **Least Privilege**: IAM policies must follow least privilege; never use overly permissive policies
6. **Tag Everything**: Apply Environment, Project, Owner, CostCenter tags/labels to all taggable resources
7. **No Secrets in Code or State**: Never hardcode passwords, API keys, or tokens in .tf files; use provider secret management. Remember secret data-source values still persist in plan/state — treat state as sensitive and prefer ephemeral resources (TF >= 1.10) / write-only arguments (TF >= 1.11) where provider support exists
8. **Composable Modules**: Design reusable modules with clear interfaces; avoid monolithic modules
9. **Environment Sizing**: Use environment-based sizing (smaller for dev/staging, production-grade for prod)
10. **Policy as Code**: Run OPA/Sentinel and security scanning (Checkov, Trivy) in CI/CD before apply
11. **Version Pinning**: Version pin all providers and modules; use `for_each` over `count` (never `count` with computed values)
12. **Cost Awareness**: Implement lifecycle policies, autoscaling schedules, and review cost estimates before apply
13. **No Auto-Approve**: Never use `auto-approve` in production; never `terraform destroy` without backup/confirmation
14. **Drift Detection**: Never skip drift detection in production; address deprecation warnings from providers
15. **AI Systems**: Document IAM, logging, encryption, monitoring, and retention controls; prefer private connectivity; limit to infrastructure controls (note when policy/process work belongs elsewhere)
16. **Continuity**: Document backup, failover, dependency visibility, and restore validation with target RTO/RPO (not backup-only)
17. **Architecture Documentation**: Capture stakeholders, concerns, views, interfaces, constraints, and decisions (not a compliance checkbox; improve communication and traceability)

### Cloud Provider Detection

| Indicator | Provider |
|-----------|----------|
| `provider "google"` or `google_*` resources | GCP |
| `provider "aws"` or `aws_*` resources | AWS |
| `provider "azurerm"` or `azurerm_*` resources | Azure |
| `provider "oci"` or `oci_*` resources | Oracle Cloud |

### Multi-Cloud Resource Mapping

| Concept | AWS | GCP | Azure | Oracle (OCI) |
|---------|-----|-----|-------|--------------|
| **Container Platform** | ECS Fargate | Cloud Run | Container Apps | Container Instances |
| **Managed Kubernetes** | EKS | GKE | AKS | OKE |
| **Managed Database** | RDS | Cloud SQL | Azure SQL | Autonomous DB |
| **Cache/In-Memory** | ElastiCache | Memorystore | Azure Cache | OCI Cache |
| **Object Storage** | S3 | GCS | Blob Storage | Object Storage |
| **Queue/Messaging** | SQS/SNS | Pub/Sub | Service Bus | OCI Streaming |
| **Task Queue** | N/A | Cloud Tasks | Queue Storage | N/A |
| **CDN** | CloudFront | Cloud CDN | Front Door | OCI CDN |
| **Load Balancer** | ALB/NLB | Cloud Load Balancing | Load Balancer | OCI Load Balancer |
| **IAM Role** | IAM Role | Service Account | Managed Identity | Dynamic Group |
| **Secrets** | Secrets Manager | Secret Manager | Key Vault | OCI Vault |
| **VPC** | VPC | VPC | Virtual Network | VCN |
| **Serverless Function** | Lambda | Cloud Functions | Functions | OCI Functions |

## References

- Execution steps (follow for the selected task): `resources/execution-protocol.md`
- Self-check (check the items that apply before handoff): `resources/checklist.md`
- Examples: `resources/examples.md`
- Multi-cloud HCL patterns: `resources/multi-cloud-examples.md` (compute, OIDC, or secret resources)
- Cost levers and commitment/Spot gotchas: `resources/cost-optimization.md` (sizing or cost review)
- Policy & testing: `resources/policy-testing-examples.md` (policy enforcement, module tests, or CI wiring)
- ISO controls: `resources/iso-42001-infra.md` (AI-system, continuity, or architecture-documentation work)
- Error recovery: `resources/error-playbook.md`
- Context loading: `../_shared/core/context-loading.md`
- Clarification: `../_shared/core/clarification-protocol.md`
- Context budget: `../_shared/core/context-budget.md`
- Task decomposition: `../_shared/core/difficulty-guide.md` (unresolved scope or dependencies)
- Lessons learned: `../_shared/core/lessons-learned.md` (matching prior failure or requested retrospective)
- Observability handoff: `../oma-observability/SKILL.md` §Integrations — Collector topology, transport tuning, release metadata

### Knowledge Reference
terraform, opentofu, infrastructure-as-code, iac, cloud, aws, gcp, azure, oracle, oci, multi-cloud, devops, provisioning, infrastructure, compute, database, storage, networking, iam, oidc, workload identity, container, kubernetes, serverless, vpc, subnet, load balancer, cdn, secrets management, ephemeral resources, write-only arguments, state management, drift, import block, terraform test, trivy, checkov, infracost, backend, provider