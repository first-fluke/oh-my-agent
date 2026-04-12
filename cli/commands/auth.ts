import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { isGhAuthenticated } from "../lib/github.js";

export function isClaudeAuthenticated(): boolean {
  try {
    const output = execSync("claude auth status", {
      stdio: ["pipe", "pipe", "ignore"],
      encoding: "utf-8",
    });
    const parsed = JSON.parse(output);
    return parsed.loggedIn === true;
  } catch {
    return false;
  }
}

export function isGeminiAuthenticated(): boolean {
  const credsPath = join(homedir(), ".gemini", "oauth_creds.json");
  if (!existsSync(credsPath)) return false;
  try {
    const creds = JSON.parse(readFileSync(credsPath, "utf-8"));
    return !!(creds.access_token && creds.refresh_token);
  } catch {
    return false;
  }
}

export function isCodexAuthenticated(): boolean {
  const authPath = join(homedir(), ".codex", "auth.json");
  if (!existsSync(authPath)) return false;
  try {
    const auth = JSON.parse(readFileSync(authPath, "utf-8"));
    return !!auth.tokens?.access_token;
  } catch {
    return false;
  }
}

export function isQwenAuthenticated(): boolean {
  const settingsPath = join(homedir(), ".qwen", "settings.json");
  if (!existsSync(settingsPath)) return false;
  try {
    const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    return !!settings.security?.auth?.selectedType;
  } catch {
    return false;
  }
}

export async function checkAuthStatus(jsonMode = false): Promise<void> {
  const github = isGhAuthenticated();

  const gemini = isGeminiAuthenticated();
  const claude = isClaudeAuthenticated();
  const codex = isCodexAuthenticated();
  const qwen = isQwenAuthenticated();

  const results = {
    github,
    gemini,
    claude,
    codex,
    qwen,
  };

  if (jsonMode) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  p.intro(pc.bgMagenta(pc.white(" 🔐 oh-my-agent auth status ")));

  const icon = (auth: boolean) => (auth ? "✅" : "❌");
  const label = (auth: boolean) =>
    auth ? pc.green("Authenticated") : pc.red("Not Authenticated");

  const rows = [
    ["GitHub", github],
    ["Gemini CLI", gemini],
    ["Claude CLI", claude],
    ["Codex CLI", codex],
    ["Qwen CLI", qwen],
  ] as const;

  p.note(
    rows
      .map(([name, auth]) => `${icon(auth)} ${name.padEnd(12)} ${label(auth)}`)
      .join("\n"),
    "Authentication Status",
  );

  p.outro(
    `Use ${pc.cyan("gemini auth")}, ${pc.cyan("claude auth")}, etc. to login.`,
  );
}
