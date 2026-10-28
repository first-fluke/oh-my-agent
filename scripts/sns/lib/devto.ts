import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type AgentVendor, runAgent } from "../../utils/agent-spawn.ts";
import {
  collectGitContext,
  formatContextForPrompt,
} from "../../utils/git-context.ts";
import { parseAgentJson, withParseRetry } from "./agent-json.ts";
import type { EnglishDraft, SkipPayload } from "./types.ts";

const GITHUB_URL = "https://github.com/first-fluke/oh-my-agent";
const DEVTO_ENDPOINT = "https://dev.to/api/articles";
const DEVTO_ME = "https://dev.to/api/articles/me";

export interface DevtoArticleSummary {
  id: number;
  title: string;
  url: string;
  tag_list: string[];
}

export interface DevtoArticle extends DevtoArticleSummary {
  body_markdown: string;
  // dev.to's single-article endpoint returns `tags` as an array and
  // `tag_list` as a comma-separated string, the reverse of the list endpoint.
  tags?: string[];
}

function normalizeArticleTags(article: DevtoArticle): string[] {
  if (Array.isArray(article.tags)) return article.tags;
  if (Array.isArray(article.tag_list)) return article.tag_list;
  if (typeof article.tag_list === "string") {
    return article.tag_list
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
}

function devtoApiKey(): string {
  const apiKey = process.env.DEVTO_API_KEY;
  if (!apiKey) {
    throw new Error(
      "DEVTO_API_KEY is not set. Export it in ~/.zshenv or your shell rc.",
    );
  }
  return apiKey;
}

function readSoul(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(resolve(here, "../devto/SOUL.md"), "utf8");
}

export function buildWeeklyPrompt(soul: string, gitContext: string): string {
  return [
    "You are drafting a dev.to post for the oh-my-agent project.",
    "Follow the author voice guide below EXACTLY. Choose one concrete developer problem supported by the git context and explain its reproduction, repair, and checks.",
    "",
    "## Author voice guide (SOUL.md)",
    soul,
    "",
    "## Git context",
    gitContext,
    "",
    "## Output requirements",
    "- Output JSON ONLY (no markdown fence, no commentary).",
    '- Schema: { "title": string, "tags": string[3 or 4], "body_markdown": string }.',
    "- Tags must be lowercase alphanumeric, no '#' prefix, no spaces.",
    "- Lead with the reader's task or failure. Do not turn the post into a release digest or require a product-name prefix in its title.",
    "- body_markdown must follow the problem, evidence, repair, checks, and next-task structure from SOUL.md.",
    "- Cite concrete source files or commits for the case. Only report executed checks, outcomes, counts, or timings when the supplied context contains that evidence; otherwise state what remains unverified.",
    "- Inspect the relevant changed files when the git summary lacks the code needed to explain the example. Commit messages and diff statistics alone do not establish a working repair.",
    "- Choose the smallest supported entry path from SOUL.md. A skill-only example must not imply that loading instructions installs CLI dependencies or hooks.",
    "- Include one matching task guide from SOUL.md so the reader can try the method on their own change.",
    `- End with the GitHub link: ${GITHUB_URL}.`,
    "- Do not use em-dashes anywhere.",
    '- If the git context has no supported, useful developer example, return { "skip": true, "reason": "<one line>" } instead of filling a weekly quota.',
  ].join("\n");
}

export function parseEnglishDraft(raw: string): EnglishDraft | SkipPayload {
  const parsed = parseAgentJson(raw) as Record<string, unknown>;
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
  return {
    title: parsed.title,
    tags: parsed.tags.map((tag) => String(tag)),
    body_markdown: parsed.body_markdown,
  };
}

export function articleToEnglishDraft(article: DevtoArticle): EnglishDraft {
  return {
    title: article.title,
    tags: normalizeArticleTags(article),
    body_markdown: article.body_markdown,
    source_url: article.url,
  };
}

export async function fetchDevtoList(
  count: number,
): Promise<DevtoArticleSummary[]> {
  const response = await fetch(`${DEVTO_ME}?per_page=${count}`, {
    headers: { "api-key": devtoApiKey() },
  });
  if (!response.ok) {
    throw new Error(
      `dev.to list API ${response.status}: ${await response.text()}`,
    );
  }
  const json = (await response.json()) as DevtoArticleSummary[];
  return json.slice(0, count);
}

export async function fetchDevtoArticle(id: number): Promise<DevtoArticle> {
  const response = await fetch(`${DEVTO_ENDPOINT}/${id}`, {
    headers: { "api-key": devtoApiKey() },
  });
  if (!response.ok) {
    throw new Error(
      `dev.to article API ${response.status}: ${await response.text()}`,
    );
  }
  return (await response.json()) as DevtoArticle;
}

export function prepareWeeklyEnglishPrompt(
  since: string,
): { prompt: string } | SkipPayload {
  const ctx = collectGitContext(since);
  if (ctx.commitCount === 0) {
    return { skip: true, reason: "no commits in range" };
  }
  const soul = readSoul();
  return { prompt: buildWeeklyPrompt(soul, formatContextForPrompt(ctx)) };
}

export function generateWeeklyEnglish(
  since: string,
  vendor?: AgentVendor,
  prompt?: string,
): EnglishDraft | SkipPayload {
  const prepared = prompt ? { prompt } : prepareWeeklyEnglishPrompt(since);
  if ("skip" in prepared) return prepared;
  // The author agent occasionally returns non-JSON; retry before giving up so a
  // single flaky response does not silently drop the whole weekly publish.
  return withParseRetry(
    () => runAgent({ vendor, prompt: prepared.prompt }),
    parseEnglishDraft,
    {
      attempts: 3,
      onRetry: (n, total, err) =>
        console.warn(
          `[en/dev.to] author output unparseable (attempt ${n}/${total}): ${err.message}; retrying`,
        ),
    },
  );
}

export async function publishToDevto(
  draft: EnglishDraft,
  publish: boolean,
): Promise<{ url?: string; id?: number }> {
  const response = await fetch(DEVTO_ENDPOINT, {
    method: "POST",
    headers: {
      "api-key": devtoApiKey(),
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
    throw new Error(`dev.to API ${response.status}: ${await response.text()}`);
  }
  return (await response.json()) as { url?: string; id?: number };
}
