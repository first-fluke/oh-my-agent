import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type AgentVendor, runAgent } from "../../utils/agent-spawn.ts";
import {
  collectGitContext,
  formatContextForPrompt,
} from "../../utils/git-context.ts";
import { parseAgentJson, withParseRetry } from "./agent-json.ts";
import type { EnglishDraft, JapaneseDraft, SkipPayload } from "./types.ts";

/** Retry an author/translator/reviewer agent when its output is unparseable. */
function generateJapaneseWithRetry(
  label: string,
  run: () => string,
): JapaneseDraft | SkipPayload {
  return withParseRetry(run, parseJapaneseDraft, {
    attempts: 3,
    onRetry: (n, total, err) =>
      console.warn(
        `[ja/qiita] ${label} output unparseable (attempt ${n}/${total}): ${err.message}; retrying`,
      ),
  });
}

const GITHUB_URL = "https://github.com/first-fluke/oh-my-agent";
const QIITA_ITEMS = "https://qiita.com/api/v2/items";

function qiitaApiKey(): string {
  const apiKey = process.env.QIITA_API_KEY;
  if (!apiKey) {
    throw new Error(
      "QIITA_API_KEY is not set. Export it in ~/.zshenv or your shell rc.",
    );
  }
  return apiKey;
}

function qiitaDir(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../qiita");
}

function readSoul(): string {
  return readFileSync(resolve(qiitaDir(), "SOUL.md"), "utf8");
}

function readReviewGuide(): string {
  return readFileSync(resolve(qiitaDir(), "REVIEW.md"), "utf8");
}

export function buildWeeklyJapanesePrompt(
  soul: string,
  gitContext: string,
): string {
  return [
    "You are drafting a Qiita post for the oh-my-agent project.",
    "Follow the author voice guide below EXACTLY. Summarize the git context as a weekly update in natural Japanese.",
    "",
    "## Author voice guide (SOUL.md)",
    soul,
    "",
    "## Git context",
    gitContext,
    "",
    "## Output requirements",
    "- Output JSON ONLY (no markdown fence, no commentary).",
    '- Schema: { "title": string, "body": string, "tags": string[1..5], "source_url": string }.',
    `- source_url must be: ${GITHUB_URL}`,
    "- body must include required sections from SOUL.md.",
    "- Installation block must follow SOUL.md exactly.",
    `- body must end with footer per SOUL.md including: ${GITHUB_URL}`,
    "- Do not use em-dashes in Japanese prose.",
    '- If the git context shows no meaningful changes, return { "skip": true, "reason": "<one line>" }.',
  ].join("\n");
}

export function prepareWeeklyJapanesePrompt(
  since: string,
): { prompt: string } | SkipPayload {
  const ctx = collectGitContext(since);
  if (ctx.commitCount === 0) {
    return { skip: true, reason: "no commits in range" };
  }
  return {
    prompt: buildWeeklyJapanesePrompt(readSoul(), formatContextForPrompt(ctx)),
  };
}

export function generateWeeklyJapanese(
  since: string,
  vendor?: AgentVendor,
  prompt?: string,
): JapaneseDraft | SkipPayload {
  const prepared = prompt ? { prompt } : prepareWeeklyJapanesePrompt(since);
  if ("skip" in prepared) return prepared;
  return generateJapaneseWithRetry("author", () =>
    runAgent({ vendor, prompt: prepared.prompt, timeoutMs: 10 * 60 * 1000 }),
  );
}

export function buildTranslatePrompt(
  soul: string,
  english: EnglishDraft,
): string {
  const sourceUrl = english.source_url ?? GITHUB_URL;
  return [
    "Rewrite the following dev.to article as a Qiita post in natural Japanese.",
    "Use this only for --sync mode (existing dev.to article). Follow SOUL.md voice.",
    "",
    "## Author voice guide (SOUL.md)",
    soul,
    "",
    "## Source article metadata",
    `title: ${english.title}`,
    `url: ${sourceUrl}`,
    `tags: ${english.tags.join(", ")}`,
    "",
    "## Source body (Markdown)",
    english.body_markdown,
    "",
    "## Output requirements",
    "- Output JSON ONLY (no markdown fence, no commentary).",
    '- Schema: { "title": string, "body": string, "tags": string[1..5], "source_url": string }.',
    `- source_url must be exactly: ${sourceUrl}`,
    "- title must be a faithful translation of the source title above: same claim, no added facts (version numbers, dates, counts) and none dropped. Do not retitle the article.",
    `- body footer must include 原文（英語）: ${sourceUrl} and: ${GITHUB_URL}`,
    "- Preserve all code blocks verbatim.",
    "- Do not use em-dashes in Japanese prose.",
    '- If the article is empty or untranslatable, return { "skip": true, "reason": "<one line>" }.',
  ].join("\n");
}

export function parseJapaneseDraft(raw: string): JapaneseDraft | SkipPayload {
  const parsed = parseAgentJson(raw) as Record<string, unknown>;
  if (parsed && parsed.skip === true) {
    return { skip: true, reason: String(parsed.reason ?? "skipped") };
  }
  if (
    !parsed ||
    typeof parsed.title !== "string" ||
    typeof parsed.body !== "string" ||
    !Array.isArray(parsed.tags) ||
    typeof parsed.source_url !== "string"
  ) {
    throw new Error(
      "Agent output missing required fields (title, body, tags, source_url).",
    );
  }
  const tags = parsed.tags.map((tag) => String(tag)).filter(Boolean);
  if (tags.length === 0) {
    throw new Error("Agent output must include at least one tag.");
  }
  return {
    title: parsed.title,
    body: parsed.body,
    tags: tags.slice(0, 5),
    source_url: parsed.source_url,
  };
}

export function prepareTranslatePrompt(english: EnglishDraft): string {
  return buildTranslatePrompt(readSoul(), english);
}

export function translateToJapanese(
  english: EnglishDraft,
  vendor?: AgentVendor,
  prompt?: string,
): JapaneseDraft | SkipPayload {
  const resolved = prompt ?? prepareTranslatePrompt(english);
  return generateJapaneseWithRetry("translate", () =>
    runAgent({ vendor, prompt: resolved, timeoutMs: 10 * 60 * 1000 }),
  );
}

export function buildWeeklyReviewPrompt(
  reviewGuide: string,
  soul: string,
  gitContext: string,
  draft: JapaneseDraft,
): string {
  return [
    "Review and revise the Japanese Qiita draft below against the git context.",
    "Follow the review protocol EXACTLY. Return the polished draft, not a review report.",
    "",
    "## Review protocol (REVIEW.md)",
    reviewGuide,
    "",
    "## Author voice reference (SOUL.md)",
    soul,
    "",
    "## Git context (source of truth)",
    gitContext,
    "",
    "## Japanese draft to revise",
    JSON.stringify(draft, null, 2),
    "",
    "## Output requirements",
    "- Output JSON ONLY (no markdown fence, no commentary).",
    '- Schema: { "title": string, "body": string, "tags": string[1..5], "source_url": string }.',
    `- source_url must remain: ${draft.source_url}`,
    "- Facts must match the git context.",
    "- Do not use em-dashes in Japanese prose.",
    '- If the draft is unsalvageable, return { "skip": true, "reason": "<one line>" }.',
  ].join("\n");
}

export function buildSyncReviewPrompt(
  reviewGuide: string,
  soul: string,
  english: EnglishDraft,
  draft: JapaneseDraft,
): string {
  return [
    "Review and revise the Japanese Qiita draft below against the English dev.to source.",
    "Follow the review protocol EXACTLY. Return the polished draft, not a review report.",
    "",
    "## Review protocol (REVIEW.md)",
    reviewGuide,
    "",
    "## Author voice reference (SOUL.md)",
    soul,
    "",
    "## English source (dev.to)",
    `title: ${english.title}`,
    `tags: ${english.tags.join(", ")}`,
    "",
    english.body_markdown,
    "",
    "## Japanese draft to revise",
    JSON.stringify(draft, null, 2),
    "",
    "## Output requirements",
    "- Output JSON ONLY (no markdown fence, no commentary).",
    '- Schema: { "title": string, "body": string, "tags": string[1..5], "source_url": string }.',
    `- source_url must remain: ${draft.source_url}`,
    "- title must stay a faithful translation of the English source title: same claim, no added facts (version numbers, dates, counts). Revise it only to fix a mistranslation.",
    "- Preserve all code blocks verbatim from the English source.",
    "- Do not use em-dashes in Japanese prose.",
    '- If the draft is unsalvageable, return { "skip": true, "reason": "<one line>" }.',
  ].join("\n");
}

export function prepareWeeklyReviewPrompt(
  gitContext: string,
  draft: JapaneseDraft,
): string {
  return buildWeeklyReviewPrompt(
    readReviewGuide(),
    readSoul(),
    gitContext,
    draft,
  );
}

export function prepareSyncReviewPrompt(
  english: EnglishDraft,
  draft: JapaneseDraft,
): string {
  return buildSyncReviewPrompt(readReviewGuide(), readSoul(), english, draft);
}

export function reviewJapaneseDraft(
  _draft: JapaneseDraft,
  vendor?: AgentVendor,
  prompt?: string,
): JapaneseDraft | SkipPayload {
  if (!prompt) {
    throw new Error("reviewJapaneseDraft requires a pre-built review prompt.");
  }
  return generateJapaneseWithRetry("review", () =>
    runAgent({ vendor, prompt, timeoutMs: 10 * 60 * 1000 }),
  );
}

export async function publishToQiita(
  draft: JapaneseDraft,
  publish: boolean,
): Promise<{ id: string; url: string }> {
  const response = await fetch(QIITA_ITEMS, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${qiitaApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: draft.title,
      body: draft.body,
      tags: draft.tags.map((name) => ({ name })),
      private: !publish,
      coedit: true,
    }),
  });
  if (!response.ok) {
    throw new Error(`Qiita API ${response.status}: ${await response.text()}`);
  }
  return (await response.json()) as { id: string; url: string };
}
