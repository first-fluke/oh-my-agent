# Cost Optimization

Load when sizing resources or reviewing the cost of a plan. This file covers the
choices where a wrong default is expensive or hard to undo. Ordinary sizing,
lifecycle, and tagging HCL follows the provider documentation and the project's
existing modules.

## Levers

| Lever | Apply when | Watch for |
|---|---|---|
| Environment-based sizing | One module serves dev, staging, and prod | Size from a per-environment map in `locals`. Vary capacity, HA, and retention; keep backups and encryption on in every environment |
| Commitments (Reserved Instances, Savings Plans, CUDs) | Steady production baseline | Most are purchased outside Terraform. GCP resource-based CUDs are the exception (below) |
| Spot capacity | Fault-tolerant, restartable workloads | Keep an On-Demand base and diversify instance types |
| Schedules | Dev/test capacity sits idle off-hours | Every scale-down needs a matching scale-up; set the time zone explicitly |
| Storage lifecycle rules | Logs, artifacts, and backups with a known retention | Colder tiers carry minimum-duration and retrieval charges; expire incomplete multipart uploads |
| Cost allocation tags/labels | Every taggable resource | GCP label values must be lowercase label IDs, not email addresses |
| Budgets and alerts | Each account, project, or subscription | Take the budget period from variables; a hardcoded start date goes stale |

## GCP committed use discounts are binding

```hcl
# Resource-based CUDs can be purchased directly via Terraform.
# WARNING: commitments are binding contracts — they cannot be updated
# or deleted once created. Review amounts carefully before apply.
resource "google_compute_region_commitment" "cud" {
  name   = "app-cud"
  region = var.region
  plan   = "TWELVE_MONTH" # or THIRTY_SIX_MONTH

  resources {
    type   = "VCPU"
    amount = "4"
  }
  resources {
    type   = "MEMORY"
    amount = "16"
  }
}
```

Treat a commitment in a plan as a destructive-risk change: stop for explicit
review before apply.

## AWS Spot through a mixed instances policy

```hcl
resource "aws_launch_template" "spot" {
  name_prefix   = "spot-"
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = "t3.medium"

  # Mixed policy controls On-Demand/Spot distribution; omit InstanceMarketOptions.
}

resource "aws_autoscaling_group" "spot" {
  # ...
  mixed_instances_policy {
    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.spot.id
      }

      override { instance_type = "t3.medium" }
      override { instance_type = "t3a.medium" }
      override { instance_type = "m5.large" }
    }

    instances_distribution {
      on_demand_base_capacity                  = 1
      on_demand_percentage_above_base_capacity = 0
      spot_allocation_strategy                 = "price-capacity-optimized"
    }
  }
}
```

The provider default for `spot_allocation_strategy` is `lowest-price`, which has
the highest interruption risk; set the strategy explicitly.

## GCP Spot VMs

```hcl
# Spot VMs are the recommended successor to preemptible VMs (no 24h limit).
# `preemptible = true` alone creates a legacy preemptible VM;
# `provisioning_model = "SPOT"` is what makes it a Spot VM.
resource "google_compute_instance" "worker" {
  # ...
  scheduling {
    preemptible                 = true
    automatic_restart           = false
    provisioning_model          = "SPOT"
    instance_termination_action = "STOP"
  }
}
```

## Cost estimation before apply

Use Infracost to turn `terraform plan` into a monthly cost estimate, locally or
as a CI diff comment:

```bash
infracost breakdown --path .          # cost of current config
infracost diff --path . --compare-to infracost-base.json  # cost delta for a change
```

Estimate every plan that adds or resizes resources. When Infracost is
unavailable, use the provider's pricing calculator and report the estimate as
unverified.
