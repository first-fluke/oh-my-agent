import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { STANDALONE_HOOK_SCRIPTS } from "../../constants/standalone-hooks.js";
import { standaloneHookSources } from "../hooks-composer/standalone-wrapper.js";
import {
  OPENCODE_BRIDGE_SOURCE,
  OPENCODE_PACKAGE_ENTRY_SOURCE,
} from "../opencode-plugin-composer.js";
import {
  inheritedManifestFields,
  readPackageMetadata,
} from "./package-metadata.js";
import type { OpencodePackageEmitReport } from "./types.js";

/** npm name registered under `plugin` in `opencode.json` / `kilo.json`. */
export const OPENCODE_PACKAGE_NAME = "oh-my-agent-opencode";

/** The bridge, shipped unchanged; the legacy loaders call its default export. */
const BRIDGE = "oma.ts";

/**
 * Package entry (`main`/`exports`): the OpenCode 2.x `{ id, setup }`
 * definition that adapts onto the bridge, plus the legacy function export.
 * Bun runs TypeScript natively, so no build step.
 */
const PACKAGE_ENTRY = "index.ts";

/** Shell helper `test-filter.ts` pipes test runners through; shipped beside the bridge. */
const FILTER_SCRIPT = "filter-test-output.sh";

/**
 * Emit the publishable npm plugin package for the opencode family (Sst
 * opencode and Kilo Code). The package is the per-project bridge install
 * (`installOpencodePlugin`) relocated into an npm layout:
 *
 *  - `index.ts`: the package entry — one default export carrying the
 *    OpenCode 2.x `{ id, setup }` definition (setup adapts the v2
 *    session/tool hooks onto the bridge) and the V1 `server()` object form
 *    Kilo / OpenCode 1.18.29+ require (`server` IS the bridge).
 *  - `oma.ts`: the unchanged SSOT bridge (`.agents/hooks/variants/opencode/`),
 *    so `plugin: ["oh-my-agent-opencode"]` resolves without a per-project
 *    `.opencode/plugins/oma/` copy.
 *  - one generated handler entry per `STANDALONE_HOOK_SCRIPTS` script, the
 *    same `standaloneHookSources` output the per-project install writes; each
 *    dispatches `oma hook script --vendor opencode --script <name>` and
 *    fails open when the oma CLI is not on PATH.
 *  - `filter-test-output.sh`, which `test-filter.ts` references by the
 *    `OMA_HOOK_BRIDGE_DIR` the bridge exports when spawning.
 *
 * opencode and Kilo dispatch with the shared `opencode` identity: both resolve
 * to the Claude output dialect in `runStandaloneHookScript`, so one package
 * serves both hosts. This emits only; publishing is a release step.
 */
export function emitOpencodePackage(
  repoRoot: string,
  outDir: string,
): OpencodePackageEmitReport {
  const metadata = readPackageMetadata(repoRoot);
  mkdirSync(outDir, { recursive: true });

  const files: string[] = [];
  for (const [source, name] of [
    [OPENCODE_PACKAGE_ENTRY_SOURCE, PACKAGE_ENTRY],
    [OPENCODE_BRIDGE_SOURCE, BRIDGE],
  ] as const) {
    const src = join(repoRoot, source);
    if (!existsSync(src)) continue;
    cpSync(src, join(outDir, name), { force: true, dereference: true });
    files.push(name);
  }

  for (const [script, source] of standaloneHookSources("opencode")) {
    writeFileSync(join(outDir, script), source);
    files.push(script);
  }

  const filterSrc = join(repoRoot, ".agents", "hooks", "core", FILTER_SCRIPT);
  if (existsSync(filterSrc)) {
    cpSync(filterSrc, join(outDir, FILTER_SCRIPT), {
      force: true,
      dereference: true,
    });
    files.push(FILTER_SCRIPT);
  }

  writeFileSync(join(outDir, "README.md"), readme());
  files.push("README.md");

  const manifestPath = join(outDir, "package.json");
  writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        name: OPENCODE_PACKAGE_NAME,
        ...inheritedManifestFields(
          metadata,
          "oh-my-agent hook bridge for OpenCode and Kilo Code",
        ),
        type: "module",
        keywords: [
          "opencode",
          "opencode-plugin",
          "kilo",
          "kilocode",
          "oh-my-agent",
        ],
        main: `./${PACKAGE_ENTRY}`,
        exports: { ".": `./${PACKAGE_ENTRY}` },
        files: [
          PACKAGE_ENTRY,
          BRIDGE,
          ...Object.keys(STANDALONE_HOOK_SCRIPTS),
          FILTER_SCRIPT,
          "README.md",
        ],
      },
      null,
      2,
    )}\n`,
  );

  return {
    target: "opencode-package",
    outDir,
    manifestPath,
    files,
  };
}

function readme(): string {
  return `# ${OPENCODE_PACKAGE_NAME}

The [oh-my-agent](https://github.com/first-fluke/oh-my-agent) hook bridge as an
npm plugin for [OpenCode](https://opencode.ai) and [Kilo Code](https://kilo.ai).
It registers the same in-process handlers \`oma link\` installs per project
(\`.opencode/plugins/oma/\`), without copying anything into the project, and
serves both plugin contracts from one default export: the OpenCode 2.x
\`{ id, setup }\` definition and the V1 \`server()\` object form Kilo Code and
OpenCode 1.18.29+ load.

Requires the \`oma\` CLI on PATH (\`npm install -g oh-my-agent\`) and \`bun\`.
Every hook fails open: without \`oma\` the host runs unchanged.

## OpenCode

Add the package to \`plugin\` in \`.opencode/opencode.json\` (project) or
\`~/.config/opencode/opencode.json\` (global). OpenCode installs npm plugins
on startup.

\`\`\`json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["${OPENCODE_PACKAGE_NAME}"]
}
\`\`\`

Pin a release with \`"${OPENCODE_PACKAGE_NAME}@<version>"\`.

## Kilo Code

Kilo reads the same key from \`.kilo/kilo.json\` or
\`~/.config/kilo/kilo.json\`:

\`\`\`json
{
  "$schema": "https://app.kilo.ai/config.json",
  "plugin": ["${OPENCODE_PACKAGE_NAME}"]
}
\`\`\`

## What the bridge does

| OpenCode 2.x hook | Kilo / 1.x hook | oh-my-agent handler |
| --- | --- | --- |
| session \`prompt\` | \`chat.message\` | keyword-detector (workflow activation) and skill-injector |
| session \`context\` | \`experimental.chat.system.transform\` | injects the detected context into the system prompt |
| tool \`execute.before\` (bash) | \`tool.execute.before\` | scm-guard (blocks staging likely secrets), test-filter (failures-only test output) |
| session \`experimental.idle\` | \`session.idle\` event | persistent-mode re-enters an unfinished workflow |

Each handler entry in this package runs
\`oma hook script --vendor opencode --script <name>\`; the handler logic lives
in the installed CLI, so updating \`oma\` updates the behaviour.

A project that already has \`./plugins/oma/oma.ts\` registered by \`oma link\`
does not need this package; keep one or the other.
`;
}
