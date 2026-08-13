# TF Infra Agent: Error Recovery Playbook

## State Lock Error
**Symptom:** `Error acquiring the state lock`
**Recovery:**
1. Check who holds the lock: `terraform force-unlock <LOCK_ID>` (use with caution)
2. Verify no other terraform process is running
3. If stale lock, confirm and force-unlock

## Resource Already Exists
**Symptom:** `Error: already exists` on create
**Recovery:**
1. Import the existing resource. On Terraform >= 1.5, prefer a config-driven `import` block (plannable and reviewable):
   ```hcl
   import {
     to = aws_s3_bucket.assets
     id = "my-existing-bucket"
   }
   ```
   On older versions, use the CLI: `terraform import <resource_type>.<name> <id>`
2. Verify imported state matches config: `terraform plan`
3. Adjust config if drift exists
4. For refactors, use `moved` blocks (rename/move without recreate) and `removed` blocks (TF >= 1.7, drop from state without destroying)

## Permission Denied
**Symptom:** `AccessDenied`, `403 Forbidden`, `insufficient permissions`
**Recovery:**
1. Check current identity:
   - AWS: `aws sts get-caller-identity`
   - GCP: `gcloud auth list`
   - Azure: `az account show`
   - OCI: `oci iam region list`
2. Verify IAM policies attached to the identity
3. Add missing permissions following least privilege

## Provider Version Conflict
**Symptom:** `Incompatible provider version` or `Could not retrieve the list of available versions`
**Recovery:**
1. Update version constraint in `versions.tf`
2. Run `terraform init -upgrade`
3. Review changelog for breaking changes

## Drift Detected
**Symptom:** `terraform plan` shows unexpected changes on existing resources
**Recovery:**
1. Run `terraform plan -refresh-only` to review drift (the standalone `terraform refresh` command is deprecated — it updates state without confirmation)
2. If the detected changes are correct, sync state with `terraform apply -refresh-only`
3. If manual changes exist, decide: import to state or revert manual change

## Wrong Provider Configuration
**Symptom:** Resources targeting wrong region/project/subscription
**Recovery:**
1. Check `provider.tf` for region/project/subscription settings
2. Check `backend.tf` for state configuration
3. Use provider aliases for multi-region setups

## Module Source Error
**Symptom:** `Module not found` or `Failed to download module`
**Recovery:**
1. Check module source path (local) or registry URL (remote)
2. For git sources, verify access credentials
3. Run `terraform init` to re-download modules

## General Principles
- After 3 consecutive failures on the same issue, try a fundamentally different approach
- Check cloud provider status pages for service outages
- Never modify `terraform.tfstate` manually; use `terraform state mv` / `terraform state rm` for state surgery
- Always backup state before destructive operations: `terraform state pull > backup.tfstate`
