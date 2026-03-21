# TF Infra Agent — Examples

## Example 1: GCP Cloud Run Service with Cloud SQL

**Input:** "Cloud Run에 API 서비스를 배포하고 Cloud SQL PostgreSQL 연결해줘"

**Output:**
- Files created: `compute.tf`, `database.tf`, `networking.tf`, `iam.tf`, `outputs.tf`
- Cloud provider: GCP (detected from existing `provider "google"`)
- Resources: Cloud Run service, Cloud SQL PostgreSQL, VPC connector, service account
- Key decisions:
  - VPC connector for private Cloud SQL access
  - Dedicated service account with minimal permissions
  - Cloud SQL Auth Proxy sidecar for secure connection
  - Environment-based sizing: `db-f1-micro` (dev) vs `db-custom-4-16384` (prod)

## Example 2: AWS ECS Fargate with GitHub OIDC

**Input:** "GitHub Actions에서 ECS Fargate로 배포할 수 있게 OIDC 설정해줘"

**Output:**
- Files created: `cicd-auth.tf`, `iam.tf`
- Cloud provider: AWS (detected from existing `aws_*` resources)
- Resources: OIDC provider, IAM role with trust policy, ECR/ECS permissions
- Key decisions:
  - Trust policy scoped to specific repo and branch
  - Permissions limited to ECR push + ECS task update only
  - No long-lived access keys

## Example 3: Terraform Plan Review

**Input:** "이 terraform plan 결과 리뷰해줘"

**Output:**
- Summary: 3 to add, 1 to change, 1 to destroy
- Risk: HIGH — `aws_db_instance` will be destroyed and recreated (engine version change)
- Recommendation: Use `lifecycle { prevent_destroy = true }` or manual migration
- Checklist: backup verified, maintenance window set, rollback plan documented
