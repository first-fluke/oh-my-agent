import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type AgentVendor, runAgent } from "../../utils/agent-spawn.ts";
import { parseAgentJson, withParseRetry } from "./agent-json.ts";
import type { EnglishDraft, PortugueseDraft, SkipPayload } from "./types.ts";

/** Retry a translator/reviewer agent when its output is unparseable. */
function generatePortugueseWithRetry(
  label: string,
  run: () => string,
): PortugueseDraft | SkipPayload {
  return withParseRetry(run, parsePortugueseDraft, {
    attempts: 3,
    onRetry: (n, total, err) =>
      console.warn(
        `[pt/tabnews] ${label} output unparseable (attempt ${n}/${total}): ${err.message}; retrying`,
      ),
  });
}

const GITHUB_URL = "https://github.com/first-fluke/oh-my-agent";
const TABNEWS_BASE = "https://www.tabnews.com.br";
const TABNEWS_SESSIONS = `${TABNEWS_BASE}/api/v1/sessions`;
const TABNEWS_CONTENTS = `${TABNEWS_BASE}/api/v1/contents`;

function tabnewsCredentials(): { email: string; password: string } {
  const email = process.env.TABNEWS_EMAIL;
  const password = process.env.TABNEWS_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "TABNEWS_EMAIL and TABNEWS_PASSWORD must be set. Export them in ~/.zshenv or your shell rc.",
    );
  }
  return { email, password };
}

function tabnewsDir(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../tabnews");
}

function readSoul(): string {
  return readFileSync(resolve(tabnewsDir(), "SOUL.md"), "utf8");
}

function readReviewGuide(): string {
  return readFileSync(resolve(tabnewsDir(), "REVIEW.md"), "utf8");
}

// TabNews has no API-key dashboard: authenticate with email + password to mint
// a session token, then send it as the `session_id` cookie on writes.
let cachedSession: string | undefined;

export async function getTabnewsSession(): Promise<string> {
  if (cachedSession) return cachedSession;
  const { email, password } = tabnewsCredentials();
  const response = await fetch(TABNEWS_SESSIONS, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error(
      `TabNews session API ${response.status}: ${await response.text()}`,
    );
  }
  const json = (await response.json()) as { token?: string };
  if (!json.token) {
    throw new Error("TabNews session API returned no token.");
  }
  cachedSession = json.token;
  return cachedSession;
}

export function buildTranslatePrompt(
  soul: string,
  english: EnglishDraft,
): string {
  const sourceUrl = english.source_url ?? GITHUB_URL;
  return [
    "Rewrite the following dev.to article as a TabNews post in natural Brazilian Portuguese (pt-BR).",
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
    '- Schema: { "title": string, "body": string, "source_url": string }.',
    "- TabNews has NO tags; do not emit a tags field.",
    `- source_url must be exactly: ${sourceUrl}`,
    "- title must be a faithful translation of the source title above: same claim, no added facts (version numbers, dates, counts) and none dropped. Do not retitle the article.",
    `- body footer must include Texto original (em ingles): ${sourceUrl} and: ${GITHUB_URL}`,
    "- Preserve all code blocks verbatim.",
    "- Do not use em-dashes in Portuguese prose.",
    '- If the article is empty or untranslatable, return { "skip": true, "reason": "<one line>" }.',
  ].join("\n");
}

export function parsePortugueseDraft(
  raw: string,
): PortugueseDraft | SkipPayload {
  const parsed = parseAgentJson(raw) as Record<string, unknown>;
  if (parsed && parsed.skip === true) {
    return { skip: true, reason: String(parsed.reason ?? "skipped") };
  }
  if (
    !parsed ||
    typeof parsed.title !== "string" ||
    typeof parsed.body !== "string" ||
    typeof parsed.source_url !== "string"
  ) {
    throw new Error(
      "Agent output missing required fields (title, body, source_url).",
    );
  }
  return {
    title: parsed.title,
    body: parsed.body,
    source_url: parsed.source_url,
  };
}

export function prepareTranslatePrompt(english: EnglishDraft): string {
  return buildTranslatePrompt(readSoul(), english);
}

export function translateToPortuguese(
  english: EnglishDraft,
  vendor?: AgentVendor,
  prompt?: string,
): PortugueseDraft | SkipPayload {
  const resolved = prompt ?? prepareTranslatePrompt(english);
  return generatePortugueseWithRetry("translate", () =>
    runAgent({ vendor, prompt: resolved, timeoutMs: 10 * 60 * 1000 }),
  );
}

export function buildSyncReviewPrompt(
  reviewGuide: string,
  soul: string,
  english: EnglishDraft,
  draft: PortugueseDraft,
): string {
  return [
    "Review and revise the Brazilian Portuguese TabNews draft below against the English dev.to source.",
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
    "## Portuguese draft to revise",
    JSON.stringify(draft, null, 2),
    "",
    "## Output requirements",
    "- Output JSON ONLY (no markdown fence, no commentary).",
    '- Schema: { "title": string, "body": string, "source_url": string }.',
    `- source_url must remain: ${draft.source_url}`,
    "- title must stay a faithful translation of the English source title: same claim, no added facts (version numbers, dates, counts). Revise it only to fix a mistranslation.",
    "- Preserve all code blocks verbatim from the English source.",
    "- Do not use em-dashes in Portuguese prose.",
    '- If the draft is unsalvageable, return { "skip": true, "reason": "<one line>" }.',
  ].join("\n");
}

export function prepareSyncReviewPrompt(
  english: EnglishDraft,
  draft: PortugueseDraft,
): string {
  return buildSyncReviewPrompt(readReviewGuide(), readSoul(), english, draft);
}

export function reviewPortugueseDraft(
  _draft: PortugueseDraft,
  vendor?: AgentVendor,
  prompt?: string,
): PortugueseDraft | SkipPayload {
  if (!prompt) {
    throw new Error(
      "reviewPortugueseDraft requires a pre-built review prompt.",
    );
  }
  return generatePortugueseWithRetry("review", () =>
    runAgent({ vendor, prompt, timeoutMs: 10 * 60 * 1000 }),
  );
}

export async function publishToTabnews(
  draft: PortugueseDraft,
  publish: boolean,
): Promise<{ id?: string; url?: string }> {
  const session = await getTabnewsSession();
  const response = await fetch(TABNEWS_CONTENTS, {
    method: "POST",
    headers: {
      Cookie: `session_id=${session}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: draft.title,
      body: draft.body,
      source_url: draft.source_url,
      status: publish ? "published" : "draft",
    }),
  });
  if (!response.ok) {
    throw new Error(`TabNews API ${response.status}: ${await response.text()}`);
  }
  const json = (await response.json()) as {
    id?: string;
    owner_username?: string;
    slug?: string;
  };
  const url =
    json.owner_username && json.slug
      ? `${TABNEWS_BASE}/${json.owner_username}/${json.slug}`
      : undefined;
  return { id: json.id, url };
}
