# cli/ Architecture

See full decision record: [`.agents/results/architecture/adr-cli-refactor-boundaries.md`](../.agents/results/architecture/adr-cli-refactor-boundaries.md).

## Layout

```
cli/
  cli.ts                         composition root (Commander wiring)
  bin/                           published entry
  commands/<name>/               one folder per CLI command
    command.ts                   Commander registration + argument parsing (no logic)
    <name>.ts                    business flow (no Clack, no process.exit)
    ui.ts                        Clack / picocolors prompts (optional)
    internal/                    slice-private helpers (not exported)
  vendors/<vendor>/              per-CLI-vendor adapter (claude, gemini, codex, qwen, antigravity)
    auth.ts
    settings.ts
    index.ts                     Vendor registry (cli/vendors/index.ts)
  platform/                      SSOT installer: writes vendor files from .agents/
  io/                            external I/O adapters (github, tarball, serena, mcp-bridge, http, git)
  cli-kit/                       presentation + framework wrappers (cli-framework, process-signals, frontmatter, time-window, competitors, graph)
  types/  constants/  utils/     shared primitives
  dashboard/                     terminal + web dashboards
  scripts/                       dev/build/release scripts
```

## Rules

1. `commands/<x>` **must not** import from `commands/<y>`. Shared logic belongs in `vendors/`, `platform/`, `io/`, or `cli-kit/`.
2. `command.ts` contains only Commander wiring and argument normalization. No business logic, no Clack, no direct FS/network access.
3. `<name>.ts` (the slice's pure flow) must not import `@clack/prompts` or `picocolors`. Interactive prompts live in `ui.ts`.
4. `vendors/<vendor>/` owns everything vendor-specific. Other packages iterate via the `Vendor` registry in `vendors/index.ts`.
5. `platform/` is the only package that writes vendor files from `.agents/` SSOT.
6. Tests colocate with the unit under test (`<slice>/<name>.test.ts`).

## Path alias

Use `@cli/*` (mapped to `cli/*` in `tsconfig.json`) for cross-slice imports. Example:

```ts
import { claudeAuth } from "@cli/vendors/claude/auth";
import { installSkill } from "@cli/platform/skills-installer";
import { fetchRemoteManifest } from "@cli/platform/manifest";
```

Relative imports are fine **within** a slice (`./internal/foo`). Avoid relative imports that traverse siblings (`../other-slice/...`).

## Boundary enforcement

Biome's built-in `noRestrictedImports` uses exact module names and does not support glob patterns, so cross-slice prevention is enforced by:

1. Code review (ADR-referenced rules).
2. `cli/scripts/check-boundaries.mjs` — grep-based CI check that fails when `commands/<x>` files import from `commands/<y>`.
