import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type AgentVendor, runAgent } from "../../utils/agent-spawn.ts";
import {
  collectGitContext,
  formatContextForPrompt,
} from "../../utils/git-context.ts";

interface CliArgs {
  since: string;
  vendor?: AgentVendor;
  publish: boolean;
  dryRun: boolean;
}

const GITHUB_URL = "https://github.com/first-fluke/oh-my-agent";
const DEVTO_ENDPOINT = "https://dev.to/api/articles";

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    since: "1 week ago",
    publish: false,
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--since" && argv[i + 1]) {
      args.since = argv[i + 1] as string;
      i += 1;
    } else if (arg?.startsWith("--since=")) {
      args.since = arg.slice("--since=".length);
    } else if (arg === "--vendor" && argv[i + 1]) {
      args.vendor = argv[i + 1] as AgentVendor;
      i += 1;
    } else if (arg?.startsWith("--vendor=")) {
      args.vendor = arg.slice("--vendor=".length) as AgentVendor;
    } else if (arg === "--publish") {
      args.publish = true;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    }
  }
  return args;
}

function readSoul(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(resolve(here, "SOUL.md"), "utf8");
}

function buildPrompt(soul: string, gitContext: string): string {
  return [
    "You are drafting a dev.to post for the oh-my-agent project.",
    "Follow the author voice guide below EXACTLY. Then summarize the git context as a weekly update.",
    "",
    "## Author voice guide (SOUL.md)",
    soul,
    "",
    "## Git context",
    gitContext,
    "",
    "## Output requirements",
    `- Output JSON ONLY (no markdown fence, no commentary).`,
    `- Schema: { "title": string, "tags": string[3 or 4], "body_markdown": string }.`,
    `- Tags must be lowercase alphanumeric, no '#' prefix, no spaces.`,
    `- body_markdown must include the required sections from SOUL.md.`,
    `- Installation block must follow SOUL.md exactly (canonical curl one-liner, no substitutes).`,
    `- End with the GitHub link: ${GITHUB_URL}.`,
    `- Do not use em-dashes anywhere.`,
    `- If the git context shows no meaningful changes, return { "skip": true, "reason": "<one line>" } instead.`,
  ].join("\n");
}

interface DraftPayload {
  title: string;
  tags: string[];
  body_markdown: string;
}

interface SkipPayload {
  skip: true;
  reason: string;
}

function parseAgentOutput(raw: string): DraftPayload | SkipPayload {
  const trimmed = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const parsed = JSON.parse(trimmed);
  if (parsed && parsed.skip === true) {
    return { skip: true, reason: String(parsed.reason ?? "no changes") };
  }
  if (
    !parsed ||
    typeof parsed.title !== "string" ||
    !Array.isArray(parsed.tags) ||
    typeof parsed.body_markdown !== "string"
  ) {
    throw new Error(
      "Agent output missing required fields (title, tags, body_markdown).",
    );
  }
  return parsed as DraftPayload;
}

async function publishToDevto(
  draft: DraftPayload,
  publish: boolean,
): Promise<void> {
  const apiKey = process.env.DEVTO_API_KEY;
  if (!apiKey) {
    throw new Error(
      "DEVTO_API_KEY is not set. Export it in ~/.zshenv or your shell rc.",
    );
  }
  const response = await fetch(DEVTO_ENDPOINT, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      article: {
        title: draft.title,
        body_markdown: draft.body_markdown,
        published: publish,
        tags: draft.tags,
      },
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`dev.to API ${response.status}: ${text}`);
  }
  const json = (await response.json()) as { url?: string; id?: number };
  const where = publish ? "published" : "saved as draft";
  console.log(`dev.to: ${where} (${json.url ?? `id=${json.id}`})`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  console.log(`Collecting git context (since=${args.since})...`);
  const ctx = collectGitContext(args.since);
  if (ctx.commitCount === 0) {
    console.log("No commits in range. Aborting.");
    return;
  }
  console.log(
    `Found ${ctx.commitCount} commits across ${ctx.changedFiles.length} files.`,
  );

  const soul = readSoul();
  const prompt = buildPrompt(soul, formatContextForPrompt(ctx));
  console.log(`Spawning agent (vendor=${args.vendor ?? "auto"})...`);
  const raw = runAgent({ vendor: args.vendor, prompt });

  const draftPath = join(tmpdir(), `devto-draft-${Date.now()}.json`);
  writeFileSync(draftPath, raw);
  console.log(`Raw agent output: ${draftPath}`);

  const parsed = parseAgentOutput(raw);
  if ("skip" in parsed) {
    console.log(`Agent skipped post: ${parsed.reason}`);
    return;
  }
  console.log(`Draft title: ${parsed.title}`);
  console.log(`Draft tags: ${parsed.tags.join(", ")}`);

  if (args.dryRun) {
    const out = join(tmpdir(), `devto-draft-${Date.now()}.md`);
    writeFileSync(out, parsed.body_markdown);
    console.log(`Dry run. Body written to: ${out}`);
    return;
  }

  await publishToDevto(parsed, args.publish);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
