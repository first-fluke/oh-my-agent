# Deepsec workspace and setup

Load for a source setup request or a missing workspace. Reuse existing `.deepsec/` state.

## Select the setup path

Record the package version, target root, selected agent/model route, authorization and limits in the engine receipt. Prefer a locked local executable; examples use `npx deepsec` as the upstream spelling, not permission to fetch a floating version.

Inspect `--version`, `init --help`, and `setup --help` first. Read the installed `.deepsec/node_modules/deepsec/SKILL.md` and `dist/docs/` when present. Installed help takes precedence over these examples.

Current upstream `init` can authenticate, study the repository, scan and run paid analysis. A plain initialization command is not a scaffold-only operation.

For configuration files alone, from the target root:

```bash
npx deepsec init --scaffold-only
```

This does not install dependencies, select/authenticate a model or perform an AI review. Review the scaffold and lock the selected dependency through the target's package manager when setup is authorized. Do not build the target application.

For a setup plan without applying it, if supported:

```bash
npx deepsec init --plan --output json
```

Run the one-shot setup/analysis only under an existing scope and spend authorization. Pass that authorization's numeric `--max-cost-usd` and duration `--max-duration` values; do not invent an unlimited default. Headless execution needs explicit answers and an inspected output format. Credential presence is not spend authorization.

## Project context and coverage

Check the configured project ID and resolved root before analyzing. Review `data/<id>/INFO.md` or its `infoMarkdown` override for the actual trust boundaries: callers, authentication/authorization, tenant ownership, secret handling, ingress families and relevant safeguards. Keep it project-specific, with representative paths and small examples instead of generic CWE descriptions.

Setup may generate surface inventory and data-only matchers. Inspect the recorded coverage and exclusions. Preserve `generatedMatchersPlugin` when adding a project plugin. Missing ingress coverage is a gap even if scan candidates exist.

When setup stops, save its printed state/inventory/proposal paths and exact resume command. Repair only the recorded coverage or credential problem, then resume. Do not delete native data to bypass a coverage checkpoint or repeat paid phases already completed.

## Setup evidence

Save version/help, redacted configuration, generated-file digests, setup summary, selected route and any native exit. An init budget/input stop has its own exit semantics; do not interpret it using the diff findings contract.

Keep `.env.local`, authentication material and native data out of commits. Review configuration/matchers before any separately authorized commit. Setup success records preparation/coverage, not confirmed vulnerabilities or runtime proof.

Sources: [getting started](https://github.com/vercel-labs/deepsec/blob/main/docs/getting-started.md), [configuration](https://github.com/vercel-labs/deepsec/blob/main/docs/configuration.md), [architecture](https://github.com/vercel-labs/deepsec/blob/main/docs/architecture.md).
