# Policy and Testing Examples

OPA policies, Sentinel rules, and infrastructure testing patterns.

## OPA (Open Policy Agent)

### Required Tags Policy
```rego
# policies/required_tags.rego — OPA >= 1.0
package terraform.tags

# Map-shaped tags only; ASG uses repeated tag blocks and needs a separate rule.
# Extend this allowlist only after validating the exact provider plan schema.
taggable := {"aws_instance", "aws_s3_bucket"}

deny contains msg if {
    resource := input.resource_changes[_]
    resource.mode == "managed"
    resource.type in taggable
    resource.change.after != null # ignore pure deletions
    tags := object.get(resource.change.after, "tags", {})
    required := {"Environment", "Project", "Owner", "CostCenter"}
    missing := required - object.keys(tags)
    count(missing) > 0
    msg := sprintf("Resource %s missing tags: %v", [resource.address, missing])
}
```

### Encryption Policy
```rego
# policies/encryption_required.rego
package terraform.encryption

# Require the project's configured SSE-KMS algorithm on explicit encryption
# resources. Bucket creation and existing remote configuration need separate
# coverage; a change-only plan cannot prove the full estate is encrypted.
deny contains msg if {
    resource := input.resource_changes[_]
    resource.type == "aws_s3_bucket_server_side_encryption_configuration"
    resource.change.after != null
    rule := resource.change.after.rule[_]
    encryption := rule.apply_server_side_encryption_by_default[_]
    encryption.sse_algorithm != "aws:kms"
    msg := sprintf("%s must use aws:kms", [resource.address])
}
```

Also verify every bucket created by the module has a corresponding encryption
resource (use module tests or the complete planned values/configuration). Unknown
planned values need explicit handling; field presence in the deprecated inline
bucket attribute is not proof of the required algorithm/key.

### Cost Control Policy
```rego
# policies/cost_control.rego
package terraform.cost

deny contains msg if {
    resource := input.resource_changes[_]
    resource.type == "aws_instance"
    resource.change.after != null
    resource.change.after.tags.Environment == "dev"
    instance_type := resource.change.after.instance_type
    not startswith(instance_type, "t3.")
    msg := sprintf("Dev EC2 %s uses disallowed type %s", [resource.address, instance_type])
}
```

### Combined Plan Decision
```rego
# policies/guardrails.rego
package terraform.guardrails

deny contains msg if { msg := data.terraform.tags.deny[_] }
deny contains msg if { msg := data.terraform.encryption.deny[_] }
deny contains msg if { msg := data.terraform.cost.deny[_] }
```

Run policy unit tests, then evaluate the actual plan. Evaluating a deny set without
an exit-code flag does not gate CI. Query individual members with `--fail-defined`
so an empty set passes and any violation fails.

## Sentinel (Terraform Cloud)

### Require Encryption

Use the current `tfplan/v2` or `tfconfig/v2` import and match
`aws_s3_bucket_server_side_encryption_configuration` to the project's bucket
resources. Check the required algorithm/key and deletion/unknown-value cases.
Do not copy an inline `aws_s3_bucket.server_side_encryption_configuration`
existence check as an encryption guarantee; validate this rule against fixtures
from the exact provider/plan version before enabling a Sentinel gate.

### Restrict Instance Types
```hcl
# restrict_instance_types.sentinel
import "tfplan"

allowed_types = ["t3.micro", "t3.small", "t3.medium"]

main = rule {
  all tfplan.resources.aws_instance as _, instances {
    all instances as _, instance {
      instance.applied.instance_type in allowed_types
    }
  }
}
```

## Native `terraform test` (Terraform >= 1.6)

Prefer the built-in HCL test framework for module tests before reaching for Terratest.

```hcl
# tests/vpc.tftest.hcl
variables {
  name       = "test-vpc"
  cidr_block = "10.0.0.0/16"
}

run "creates_vpc_with_expected_cidr" {
  command = plan

  assert {
    condition     = google_compute_network.main.name == "test-vpc"
    error_message = "VPC name does not match input"
  }
}

run "apply_and_verify_outputs" {
  command = apply

  assert {
    condition     = length(output.private_subnet_ids) == 2
    error_message = "Expected 2 private subnets"
  }
}
```

Run with `terraform test`. `command = plan` runs assertion-only checks without creating resources; `command = apply` provisions real (or mocked, via `mock_provider`) resources and destroys them afterward.

## Terratest (Go)

### VPC Module Test
```go
// vpc_test.go
package test

import (
  "testing"
  "github.com/gruntwork-io/terratest/modules/terraform"
  "github.com/stretchr/testify/assert"
)

func TestVpcModule(t *testing.T) {
  terraformOptions := &terraform.Options{
    TerraformDir: "../modules/vpc",
    Vars: map[string]interface{}{
      "name":               "test-vpc",
      "cidr_block":          "10.0.0.0/16",
      "availability_zones":  []string{"us-east-1a", "us-east-1b"},
    },
  }

  defer terraform.Destroy(t, terraformOptions)
  terraform.InitAndApply(t, terraformOptions)

  vpcId := terraform.Output(t, terraformOptions, "vpc_id")
  assert.NotEmpty(t, vpcId)

  privateSubnets := terraform.OutputList(t, terraformOptions, "private_subnet_ids")
  assert.Equal(t, 2, len(privateSubnets))
}
```

### Database Module Test
```go
// database_test.go
package test

import (
  "testing"
  "github.com/gruntwork-io/terratest/modules/terraform"
  "github.com/stretchr/testify/assert"
)

func TestDatabaseModule(t *testing.T) {
  terraformOptions := &terraform.Options{
    TerraformDir: "../modules/database",
    Vars: map[string]interface{}{
      "identifier":     "test-db",
      "engine":         "postgres",
      "instance_class": "db.t3.micro",
    },
  }

  defer terraform.Destroy(t, terraformOptions)
  terraform.InitAndApply(t, terraformOptions)

  endpoint := terraform.Output(t, terraformOptions, "endpoint")
  assert.Contains(t, endpoint, "rds.amazonaws.com")
}
```

## Kitchen-Terraform (Ruby)

### VPC Controls
```ruby
# controls/vpc.rb
control 'vpc-exists' do
  describe aws_vpc('vpc-12345678') do
    it { should exist }
    its('cidr_block') { should eq '10.0.0.0/16' }
  end
end

control 'subnets-exist' do
  describe aws_subnets do
    its('subnet_ids.count') { should be >= 2 }
  end
end
```

### Security Group Controls
```ruby
# controls/security_group.rb
control 'no-ssh-from-internet' do
  aws_security_groups.group_ids.each do |sg_id|
    describe aws_security_group(sg_id) do
      it { should_not allow_in(port: 22, ipv4_range: '0.0.0.0/0') }
    end
  end
end
```

## CI/CD Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/terraform.yml
name: Terraform

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        
      - name: Terraform Format
        run: terraform fmt -check -recursive
        
      - name: Terraform Validate
        run: |
          terraform init -backend=false
          terraform validate
          
      - name: Run TFLint
        uses: terraform-linters/setup-tflint@v4
        with:
          tflint_version: latest
      - run: tflint --init && tflint
        
      - name: Run Checkov
        uses: bridgecrewio/checkov-action@master
        with:
          directory: .
          framework: terraform
          
      - name: Setup OPA
        uses: open-policy-agent/setup-opa@v2
        with:
          version: v1.0.1

      # Configure project-specific workload identity and backend credentials
      # before this planning step. Never put secrets in the plan artifact.
      - name: Run OPA Tests
        run: |
          terraform init -reconfigure
          terraform plan -out=tfplan
          terraform show -json tfplan > tfplan.json
          opa test policies/ --verbose
          opa eval --fail-defined --data policies/ --input tfplan.json "data.terraform.guardrails.deny[_]"
```

### Validation Script
```bash
#!/bin/bash
# validate.sh

set -e

echo "Running Terraform validation..."

# Format check
echo "  → Checking format..."
terraform fmt -check -recursive

# Initialize
echo "  → Initializing..."
terraform init -backend=false

# Validate
echo "  → Validating..."
terraform validate

# Security scan with Checkov
echo "  → Running Checkov..."
checkov -d . --framework terraform --quiet

# Lint with TFLint
echo "  → Running TFLint..."
tflint --init
tflint

# Plan and OPA check (if policies exist)
if [ -d "policies" ]; then
  echo "  → Running OPA policy checks..."
  # Requires explicitly configured backend/auth for this project.
  terraform init -reconfigure
  terraform plan -out=tfplan
  terraform show -json tfplan > tfplan.json
  opa test policies/
  opa eval --fail-defined --data policies/ --input tfplan.json "data.terraform.guardrails.deny[_]"
fi

echo "All validation passed!"
```
