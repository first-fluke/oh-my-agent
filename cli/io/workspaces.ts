import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

const AGENT_WORKSPACE_KEYWORDS: Record<string, string[]> = {
  frontend: [
    "web",
    "frontend",
    "client",
    "ui",
    "app",
    "dashboard",
    "admin",
    "portal",
  ],
  backend: ["api", "backend", "server", "service", "gateway", "core"],
  mobile: ["mobile", "ios", "android", "native", "rn", "expo"],
};

const WORKSPACE_CANDIDATES: Record<string, string[]> = {
  frontend: [
    "apps/web",
    "apps/frontend",
    "apps/client",
    "packages/web",
    "packages/frontend",
    "frontend",
    "web",
    "client",
  ],
  backend: [
    "apps/api",
    "apps/backend",
    "apps/server",
    "packages/api",
    "packages/backend",
    "backend",
    "api",
    "server",
  ],
  mobile: ["apps/mobile", "apps/app", "packages/mobile", "mobile", "app"],
};

function expandGlobPattern(pattern: string, cwd: string): string[] {
  if (pattern.startsWith("!")) {
    return [];
  }

  const cleanPattern = pattern.replace(/\/\*\*?$/, "").replace(/\/$/, "");

  if (!pattern.includes("*")) {
    const fullPath = path.join(cwd, cleanPattern);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      return [cleanPattern];
    }
    return [];
  }

  const parentDir = path.join(cwd, cleanPattern);
  if (!fs.existsSync(parentDir) || !fs.statSync(parentDir).isDirectory()) {
    return [];
  }

  try {
    const entries = fs.readdirSync(parentDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => `${cleanPattern}/${entry.name}`);
  } catch {
    return [];
  }
}

function parsePnpmWorkspace(cwd: string): string[] {
  const configPath = path.join(cwd, "pnpm-workspace.yaml");
  if (!fs.existsSync(configPath)) return [];

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    const parsed = parseYaml(content) as { packages?: string[] };
    return parsed?.packages ?? [];
  } catch {
    return [];
  }
}

function parsePackageJsonWorkspaces(cwd: string): string[] {
  const configPath = path.join(cwd, "package.json");
  if (!fs.existsSync(configPath)) return [];

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(content) as {
      workspaces?: string[] | { packages?: string[] };
    };

    if (Array.isArray(parsed?.workspaces)) {
      return parsed.workspaces;
    }
    if (parsed?.workspaces && typeof parsed.workspaces === "object") {
      return parsed.workspaces.packages ?? [];
    }
    return [];
  } catch {
    return [];
  }
}

function parseLernaConfig(cwd: string): string[] {
  const configPath = path.join(cwd, "lerna.json");
  if (!fs.existsSync(configPath)) return [];

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(content) as { packages?: string[] };
    return parsed?.packages ?? [];
  } catch {
    return [];
  }
}

function detectNxWorkspaces(cwd: string): string[] {
  const configPath = path.join(cwd, "nx.json");
  if (!fs.existsSync(configPath)) return [];
  return ["apps/*", "libs/*", "packages/*"].flatMap((p) =>
    expandGlobPattern(p, cwd),
  );
}

function detectTurboWorkspaces(cwd: string): string[] {
  const configPath = path.join(cwd, "turbo.json");
  if (!fs.existsSync(configPath)) return [];
  return parsePackageJsonWorkspaces(cwd);
}

function parseMiseConfig(cwd: string): string[] {
  const configPath = path.join(cwd, "mise.toml");
  if (!fs.existsSync(configPath)) return [];

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    const patterns: string[] = [];
    const workspacesMatch = content.match(/workspaces\s*=\s*\[([^\]]+)\]/);
    if (workspacesMatch?.[1]) {
      const items = workspacesMatch[1].match(/"([^"]+)"|'([^']+)'/g);
      if (items) {
        patterns.push(...items.map((s) => s.replace(/["']/g, "")));
      }
    }

    return patterns;
  } catch {
    return [];
  }
}

function getMonorepoWorkspaces(cwd: string): string[] {
  const patterns = new Set<string>();
  const sources = [
    parsePnpmWorkspace(cwd),
    parsePackageJsonWorkspaces(cwd),
    parseLernaConfig(cwd),
    detectNxWorkspaces(cwd),
    detectTurboWorkspaces(cwd),
    parseMiseConfig(cwd),
  ];

  for (const source of sources) {
    for (const pattern of source) {
      patterns.add(pattern);
    }
  }

  const workspaces = new Set<string>();
  for (const pattern of patterns) {
    for (const dir of expandGlobPattern(pattern, cwd)) {
      workspaces.add(dir);
    }
  }

  return [...workspaces];
}

function scoreWorkspaceMatch(workspace: string, agentId: string): number {
  const keywords = AGENT_WORKSPACE_KEYWORDS[agentId];
  if (!keywords) return 0;

  const dirName = path.basename(workspace).toLowerCase();
  const fullPath = workspace.toLowerCase();

  for (let i = 0; i < keywords.length; i++) {
    const keyword = keywords[i];
    if (!keyword) continue;
    if (dirName === keyword) {
      return 100 - i;
    }
    if (dirName.includes(keyword)) {
      return 50 - i;
    }
    if (fullPath.includes(keyword)) {
      return 25 - i;
    }
  }

  return 0;
}

export function detectWorkspace(agentId: string): string {
  const cwd = process.cwd();
  const workspaces = getMonorepoWorkspaces(cwd);

  if (workspaces.length > 0) {
    const scored = workspaces
      .map((ws) => ({ workspace: ws, score: scoreWorkspaceMatch(ws, agentId) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length > 0 && scored[0]) {
      return scored[0].workspace;
    }
  }

  const candidates = WORKSPACE_CANDIDATES[agentId];
  if (candidates) {
    for (const candidate of candidates) {
      const resolved = path.resolve(candidate);
      if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
        return candidate;
      }
    }
  }

  return ".";
}
