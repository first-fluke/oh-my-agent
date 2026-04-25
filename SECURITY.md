# Security

## Reporting vulnerabilities

Please email security issues to our maintainers rather than opening a public issue.
See CONTRIBUTING.md for general contribution policies.

## Configuration trust

`oma-config.yaml` is a code-equivalent file. The `vendors:` and `models:` blocks
let you specify arbitrary binary paths (`command:`), subcommands, CLI flags, and
environment variables. When `oma` runs, it executes those binaries with those
arguments under your user account.

**Treat `oma-config.yaml` the same way you treat a Makefile or shell script:**

- Review the file before running `oma` in a project you did not author.
- Do not commit secrets, tokens, or credentials into `oma-config.yaml`.
- Do not run `oma` against an untrusted project without inspecting its
  `.agents/oma-config.yaml` first.

## Backup directories

Migration 008 writes `.agents/.backup-pre-008-<timestamp>-<pid>/` directories
containing copies of config files that existed before the migration. These may
include user-edited content. Delete or rotate them according to your retention
policy once you have verified the migration result.
