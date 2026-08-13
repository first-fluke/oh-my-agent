#!/usr/bin/env bun
/**
 * Measure the on-disk context footprint of OMA skills, per loading tier.
 *
 * The README and docs quote token figures for progressive disclosure. This
 * script is the source of those numbers so they can be re-derived instead of
 * copied. Run it after adding or growing a skill:
 *
 *   bun scripts/measure-skill-context.ts
 *   bun scripts/measure-skill-context.ts --skills oma-pm,oma-backend --json
 *
 * Tiers mirror `.agents/skills/_shared/core/context-loading.md`, which is the
 * policy an agent actually follows. They are real states, not hypotheticals:
 *
 *   routed    SKILL.md alone — what reading the routed skill costs
 *   simple    + execution-protocol.md          (Simple task)
 *   medium    + examples.md                    (Medium task)
 *   complex   + tech-stack.md, snippets.md    (Complex task; path varies by
 *             skill — see TIERS for the candidates tried)
 *   all       SKILL.md + every file under resources/ — the ceiling progressive
 *             disclosure avoids. Not a configuration anyone can select; it is
 *             the upper bound, so treat "savings vs all" as a bound, not a
 *             measured alternative.
 *
 * Token counts are ESTIMATES: bytes / BYTES_PER_TOKEN. Markdown prose in
 * English lands near 4 bytes/token; tables and code fences tokenize worse, so
 * these read slightly low. For exact counts use a tokenizer against the target
 * model.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** Rough English-markdown ratio. Documented as an estimate, never as exact. */
const BYTES_PER_TOKEN = 4;

const SKILLS_DIR = join(".agents", "skills");

/**
 * Vendored dependency trees that live under a skill's resources/ but are never
 * read into context (binaries, node_modules-style trees). Counting them would
 * inflate the "all" ceiling into meaninglessness — oma-video/resources/remotion
 * alone is ~754MB across ~9k files.
 */
const VENDORED = [join("resources", "remotion")];

/** Files that exist on disk but are never read into context. */
const JUNK = new Set([".DS_Store", "Thumbs.db"]);

/**
 * Tier definitions. Each entry adds one logical document, given as candidate
 * paths because a skill's stack references can live in three places:
 *
 *   stack/            generated per project by `/stack-set` — the real load path
 *   resources/        flat, for skills whose stack is not generated (oma-frontend)
 *   {variant}/        shipped seeds `/stack-set` adapts from (oma-backend/mobile)
 *
 * First match wins, so an installed project measures its generated `stack/`. A
 * fresh checkout of this repo has no `stack/`, so the variant seed stands in as a
 * size proxy — the Complex tier there is an estimate of what generation would
 * produce, not a file any agent loads yet.
 *
 * A logical document with no matching candidate is reported as missing rather
 * than silently contributing 0 — that asymmetry is what makes tiers collapse
 * into each other, and it should be visible.
 */
const TIERS: Array<{
  name: string;
  adds: Array<{ doc: string; at: string[] }>;
}> = [
  { name: "routed", adds: [{ doc: "SKILL.md", at: ["SKILL.md"] }] },
  {
    name: "simple",
    adds: [
      {
        doc: "execution-protocol",
        at: [join("resources", "execution-protocol.md")],
      },
    ],
  },
  {
    name: "medium",
    adds: [{ doc: "examples", at: [join("resources", "examples.md")] }],
  },
  {
    name: "complex",
    adds: [
      {
        doc: "tech-stack",
        at: [
          join("stack", "tech-stack.md"),
          join("resources", "tech-stack.md"),
          join("{variant}", "tech-stack.md"),
        ],
      },
      {
        doc: "snippets",
        at: [
          join("stack", "snippets.md"),
          join("resources", "snippets.md"),
          join("{variant}", "snippets.md"),
        ],
      },
    ],
  },
];

interface SkillMeasurement {
  skill: string;
  /** Cumulative bytes per tier, in TIERS order plus "all". */
  tiers: Record<string, number>;
  /** Files counted under resources/, excluding vendored trees. */
  resourceFiles: number;
  /** Bytes skipped as vendored, reported so the exclusion is never silent. */
  vendoredBytes: number;
  /** Logical tier documents with no matching path in this skill. */
  missing: string[];
}

/**
 * Representative variant directory for skills that split resources per stack.
 * Alphabetically first, so the result is deterministic; stacks are mutually
 * exclusive so exactly one is loaded in a real run.
 */
function variantDir(skillDir: string): string | null {
  const base = join(skillDir, "variants");
  if (!existsSync(base)) return null;
  const dirs = readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  return dirs.length > 0 ? join("variants", dirs[0] as string) : null;
}

function isVendored(relPath: string): boolean {
  return VENDORED.some((v) => relPath === v || relPath.startsWith(`${v}/`));
}

/** Sum file sizes under `dir`, returning [counted, vendored, fileCount]. */
function walkResources(
  skillDir: string,
  sub: string,
): [number, number, number] {
  const abs = join(skillDir, sub);
  if (!existsSync(abs)) return [0, 0, 0];
  let counted = 0;
  let vendored = 0;
  let files = 0;
  for (const entry of readdirSync(abs, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const rel = join(sub, entry.name);
    if (entry.isDirectory()) {
      if (isVendored(rel)) {
        vendored += dirBytes(join(skillDir, rel));
        continue;
      }
      const [c, v, f] = walkResources(skillDir, rel);
      counted += c;
      vendored += v;
      files += f;
      continue;
    }
    if (!entry.isFile() || JUNK.has(entry.name)) continue;
    counted += statSync(join(skillDir, rel)).size;
    files++;
  }
  return [counted, vendored, files];
}

function dirBytes(dir: string): number {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) total += dirBytes(p);
    else if (entry.isFile()) total += statSync(p).size;
  }
  return total;
}

function sizeOf(path: string): number {
  return existsSync(path) ? statSync(path).size : 0;
}

function measureSkill(skill: string): SkillMeasurement {
  const dir = join(SKILLS_DIR, skill);
  const variant = variantDir(dir);
  const tiers: Record<string, number> = {};
  const missing: string[] = [];
  let cumulative = 0;

  for (const tier of TIERS) {
    for (const { doc, at } of tier.adds) {
      const resolved = at
        .map((c) => (variant ? c.replace("{variant}", variant) : c))
        .filter((c) => !c.includes("{variant}"))
        .find((c) => existsSync(join(dir, c)));
      if (resolved === undefined) missing.push(doc);
      else cumulative += sizeOf(join(dir, resolved));
    }
    tiers[tier.name] = cumulative;
  }

  const [counted, vendoredBytes, resourceFiles] = walkResources(
    dir,
    "resources",
  );
  // The ceiling includes one variant's files: the other stacks are never
  // loaded in the same run, so summing all of them would overstate it.
  const [variantBytes, , variantFiles] = variant
    ? walkResources(dir, variant)
    : [0, 0, 0];
  tiers.all = sizeOf(join(dir, "SKILL.md")) + counted + variantBytes;
  return {
    skill,
    tiers,
    resourceFiles: resourceFiles + variantFiles,
    vendoredBytes,
    missing,
  };
}

function listSkills(): string[] {
  return readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("_"))
    .map((e) => e.name)
    .filter((n) => existsSync(join(SKILLS_DIR, n, "SKILL.md")))
    .sort();
}

function tok(bytes: number): number {
  return Math.round(bytes / BYTES_PER_TOKEN);
}

function main(): void {
  const argv = process.argv.slice(2);
  const jsonMode = argv.includes("--json");
  const skillsFlag = argv.indexOf("--skills");
  const skills =
    skillsFlag !== -1 && argv[skillsFlag + 1]
      ? (argv[skillsFlag + 1] as string).split(",").map((s) => s.trim())
      : listSkills();

  if (!existsSync(SKILLS_DIR)) {
    console.error(
      `${SKILLS_DIR} not found — run from the repository root (or an oma-installed project).`,
    );
    process.exit(1);
  }

  const measured = skills.map(measureSkill);
  const tierNames = [...TIERS.map((t) => t.name), "all"];

  if (jsonMode) {
    console.log(
      JSON.stringify(
        {
          unit: "bytes",
          bytesPerToken: BYTES_PER_TOKEN,
          note: "`tiers` are BYTES; `tiersTokens` divides by bytesPerToken and is an estimate",
          skills: measured.map((m) => ({
            ...m,
            tiersTokens: Object.fromEntries(
              Object.entries(m.tiers).map(([k, v]) => [k, tok(v)]),
            ),
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  const pad = Math.max(...measured.map((m) => m.skill.length), 5);
  console.log(
    `Estimated tokens per loading tier (bytes / ${BYTES_PER_TOKEN}). Cumulative.\n`,
  );
  console.log(
    `${"skill".padEnd(pad)}  ${tierNames
      .map((t) => t.padStart(8))
      .join("")}  files`,
  );
  for (const m of measured) {
    console.log(
      `${m.skill.padEnd(pad)}  ${tierNames
        .map((t) => String(tok(m.tiers[t] ?? 0)).padStart(8))
        .join("")}  ${String(m.resourceFiles).padStart(5)}`,
    );
  }

  const totals = Object.fromEntries(
    tierNames.map((t) => [
      t,
      measured.reduce((s, m) => s + (m.tiers[t] ?? 0), 0),
    ]),
  ) as Record<string, number>;

  console.log(
    `\n${"TOTAL".padEnd(pad)}  ${tierNames
      .map((t) => String(tok(totals[t] ?? 0)).padStart(8))
      .join("")}`,
  );

  const all = totals.all ?? 0;
  if (all > 0) {
    console.log("\nShare of the `all` ceiling:");
    for (const t of tierNames.slice(0, -1)) {
      const v = totals[t] ?? 0;
      console.log(
        `  ${t.padEnd(8)} ${((100 * v) / all).toFixed(1).padStart(5)}%  ` +
          `(avoids ${(100 - (100 * v) / all).toFixed(1)}% of it)`,
      );
    }
  }

  const drifted = measured.filter((m) => m.missing.length > 0);
  if (drifted.length > 0) {
    console.log(
      "\nTier documents absent from the skill (tiers collapse where this happens):",
    );
    for (const m of drifted) {
      console.log(`  ${m.skill.padEnd(pad)} missing ${m.missing.join(", ")}`);
    }
  }

  const vendored = measured.reduce((s, m) => s + m.vendoredBytes, 0);
  if (vendored > 0) {
    console.log(
      `\nExcluded as vendored (never read into context): ${(
        vendored / 1024 / 1024
      ).toFixed(1)} MB across ${VENDORED.join(", ")}`,
    );
  }
}

main();
