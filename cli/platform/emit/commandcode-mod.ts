import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { emitAgentSkills } from "./agent-skills.js";
import {
  inheritedManifestFields,
  readPackageMetadata,
} from "./package-metadata.js";
import type { CommandcodeModEmitReport } from "./types.js";

/** npm name `cmd mods add` installs. */
export const COMMANDCODE_MOD_PACKAGE_NAME = "oh-my-agent-commandcode";

/** SSOT mod bridge, relative to the oma source dir. */
export const COMMANDCODE_BRIDGE_SOURCE = join(
  ".agents",
  "hooks",
  "variants",
  "commandcode",
  "oma.ts",
);

/** Package-relative mod entry listed under `commandcode.mods`. */
const MOD_ENTRY = join("mods", "oma.ts");

const FILTER_SCRIPT = "filter-test-output.sh";

/**
 * Emit the Command Code mod package (commandcode.ai/docs/mods): a
 * `package.json` carrying the `cmd-mod` keyword and a `commandcode` manifest
 * block, the SSOT bridge as `mods/oma.ts`, the skills tree `commandcode.skills`
 * points at, and `filter-test-output.sh` for the test-filter rewrite.
 *
 * The mod dispatches every hook through the installed `oma` CLI
 * (`oma hook script --vendor commandcode --script <name>`), so the package has
 * no runtime dependencies and needs no build step — Command Code compiles the
 * TypeScript entry with jiti at load. This emits only; publishing is a
 * release step.
 */
export function emitCommandcodeMod(
  repoRoot: string,
  outDir: string,
): CommandcodeModEmitReport {
  const metadata = readPackageMetadata(repoRoot);
  mkdirSync(join(outDir, "mods"), { recursive: true });
  // Replace the emitter-owned skill tree so removed source skills do not linger.
  rmSync(join(outDir, "skills"), { recursive: true, force: true });
  const skills = emitAgentSkills(repoRoot, join(outDir, "skills"));

  const modPath = join(outDir, MOD_ENTRY);
  const bridgeSrc = join(repoRoot, COMMANDCODE_BRIDGE_SOURCE);
  if (existsSync(bridgeSrc)) {
    cpSync(bridgeSrc, modPath, { force: true, dereference: true });
  }

  const filterSrc = join(repoRoot, ".agents", "hooks", "core", FILTER_SCRIPT);
  if (existsSync(filterSrc)) {
    cpSync(filterSrc, join(outDir, FILTER_SCRIPT), {
      force: true,
      dereference: true,
    });
  }

  writeFileSync(join(outDir, "README.md"), readme());

  const manifestPath = join(outDir, "package.json");
  writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        name: COMMANDCODE_MOD_PACKAGE_NAME,
        ...inheritedManifestFields(
          metadata,
          "oh-my-agent hooks and skills for Command Code",
        ),
        type: "module",
        keywords: ["cmd-mod", "cmd-mod-hook", "agent-skills", "oh-my-agent"],
        files: ["mods", "skills", FILTER_SCRIPT, "README.md"],
        commandcode: {
          mods: ["./mods/oma.ts"],
          skills: ["./skills"],
        },
      },
      null,
      2,
    )}\n`,
  );

  const passCount = skills.filter((skill) => skill.validation.valid).length;
  return {
    target: "commandcode-mod",
    outDir,
    manifestPath,
    modPath,
    skills,
    passCount,
    failCount: skills.length - passCount,
  };
}

function readme(): string {
  return `# ${COMMANDCODE_MOD_PACKAGE_NAME}

[oh-my-agent](https://github.com/first-fluke/oh-my-agent) for
[Command Code](https://commandcode.ai) as a mod package: the oma hook bridge
(\`mods/oma.ts\`) plus every oh-my-agent skill (\`skills/\`), loaded together by
one \`cmd mods add\`.

Requires the \`oma\` CLI on PATH (\`npm install -g oh-my-agent\`). Every hook
fails open: without \`oma\` the mod changes nothing.

## Install

\`\`\`bash
cmd mods add ${COMMANDCODE_MOD_PACKAGE_NAME}        # this project
cmd mods add -g ${COMMANDCODE_MOD_PACKAGE_NAME}     # your user
cmd mods add ./path/to/commandcode-mod         # a local checkout or \`oma emit\` output
\`\`\`

Try it without installing: \`cmd --mod ./path/to/commandcode-mod/mods/oma.ts\`.
Review what it registers first: \`cmd mods inspect ./path/to/commandcode-mod\`.

## What the mod does

| Command Code hook | oh-my-agent handler |
| --- | --- |
| \`transformInput\` | keyword-detector (workflow activation) and skill-injector; the prompt passes through unchanged |
| \`appendSystemPrompt\` | injects the detected context into the system prompt |
| \`onSessionStart\` | code-intelligence-primer and state-boundary |
| \`beforeToolCall\` (\`shell_command\`) | scm-guard (blocks staging likely secrets), test-filter (failures-only test output) |
| \`onStop\` | persistent-mode keeps an unfinished workflow running |

Each hook runs \`oma hook script --vendor commandcode --script <name>\`; the
handler logic lives in the installed CLI, so updating \`oma\` updates the
behaviour. A project where \`oma link\` already registered
\`.commandcode/settings.json\` hooks keeps those; this mod adds the prompt and
tool hooks the settings file cannot express.
`;
}
