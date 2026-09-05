import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import pc from "picocolors";
import { SKILLS } from "../constants/index.js";
import { getCoordinationStorePath } from "../io/memory.js";

// ── Types ───────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  label: string;
  category:
    | "root"
    | "skill"
    | "workflow"
    | "shared"
    | "agent"
    | "memory"
    | "resource"
    | "check";
  paths?: string[];
  group?: string;
  subgroup?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: "references" | "implements";
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ── Constants ───────────────────────────────────────────────────

const SKILL_CATS = Object.fromEntries(
  Object.entries(SKILLS).map(([cat, items]) => [
    cat,
    items.map((s: { name: string }) => s.name),
  ]),
);

const AGENT_SKILL_MAP: Record<string, string> = {
  "backend-engineer": "oma-backend",
  "frontend-engineer": "oma-frontend",
  "db-engineer": "oma-db",
  "mobile-engineer": "oma-mobile",
  "pm-planner": "oma-pm",
  "qa-reviewer": "oma-qa",
  "debug-investigator": "oma-debug",
  "architecture-reviewer": "oma-architecture",
  "tf-infra-engineer": "oma-tf-infra",
  "docs-curator": "oma-docs",
};

// ── Helpers ─────────────────────────────────────────────────────

function findSharedRefs(content: string): string[] {
  const refs = new Set<string>();
  for (const m of content.matchAll(
    /_shared\/((?:[a-z][a-z0-9_-]*\/)*[a-z][a-z0-9_-]*)(?:\.md)?(?=[`)\s/}]|$)/gi,
  )) {
    if (m[1]) refs.add(m[1]);
  }
  return [...refs];
}

function tryRead(path: string): string {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return "";
  }
}

function tryDir(dir: string): string[] {
  try {
    return readdirSync(dir).filter((f) => !f.startsWith("."));
  } catch {
    return [];
  }
}

function tryDirEntries(dir: string) {
  try {
    return readdirSync(dir, { withFileTypes: true }).filter(
      (d) => !d.name.startsWith("."),
    );
  } catch {
    return [];
  }
}

type SharedEntry = {
  path: string;
  isDirectory: boolean;
};

function listSharedEntries(dir: string, prefix = ""): SharedEntry[] {
  const entries: SharedEntry[] = [];

  for (const entry of tryDirEntries(dir)) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      entries.push({
        path: relativePath,
        isDirectory: true,
      });
      entries.push(...listSharedEntries(join(dir, entry.name), relativePath));
      continue;
    }

    if (!entry.name.endsWith(".md")) continue;
    entries.push({
      path: relativePath.replace(/\.md$/, ""),
      isDirectory: false,
    });
  }

  return entries;
}

// ── Graph Builder ───────────────────────────────────────────────

export function buildGraph(
  root: string,
  options: { includeChecks?: boolean } = {},
): Graph {
  const nodes: GraphNode[] = [
    { id: "root", label: "oh-my-agent", category: "root" },
  ];
  const seen = new Set<string>();
  const edges: GraphEdge[] = [];

  function edge(from: string, to: string, type: "references" | "implements") {
    const k = `${from}|${to}`;
    if (seen.has(k)) return;
    seen.add(k);
    edges.push({ from, to, type });
  }

  // Skills
  const skillsBase = join(root, ".agents", "skills");
  const categories = {
    ...SKILL_CATS,
    Custom: tryDir(skillsBase).filter(
      (name) =>
        !Object.values(SKILL_CATS).flat().includes(name) &&
        existsSync(join(skillsBase, name, "SKILL.md")),
    ),
  };
  for (const [cat, names] of Object.entries(categories)) {
    for (const name of names) {
      const dir = join(skillsBase, name);
      if (!existsSync(dir)) continue;
      const id = `skill:${name}`;
      nodes.push({
        id,
        label: name,
        category: "skill",
        group: "Skills",
        subgroup: cat,
        paths: [`.agents/skills/${name}/SKILL.md`],
      });
      const content = [
        tryRead(join(dir, "SKILL.md")),
        tryRead(join(dir, "resources", "execution-protocol.md")),
      ].join("\n");
      for (const ref of findSharedRefs(content))
        edge(id, `shared:${ref}`, "references");
    }
  }

  // Workflows
  const wfDir = join(root, ".agents", "workflows");
  for (const f of tryDir(wfDir).filter((f) => f.endsWith(".md"))) {
    const name = f.replace(".md", "");
    const id = `workflow:${name}`;
    nodes.push({
      id,
      label: name,
      category: "workflow",
      group: "Workflows",
      paths: [`.agents/workflows/${f}`],
    });
    for (const ref of findSharedRefs(tryRead(join(wfDir, f))))
      edge(id, `shared:${ref}`, "references");
  }

  // Shared
  const sharedDir = join(skillsBase, "_shared");
  for (const entry of listSharedEntries(sharedDir)) {
    const id = `shared:${entry.path}`;
    nodes.push({
      id,
      label: entry.path,
      category: "shared",
      group: "Shared",
      paths: [
        `.agents/skills/_shared/${entry.path}${entry.isDirectory ? "" : ".md"}`,
      ],
    });
    if (!entry.isDirectory) {
      for (const ref of findSharedRefs(
        tryRead(join(sharedDir, `${entry.path}.md`)),
      )) {
        if (ref !== entry.path) edge(id, `shared:${ref}`, "references");
      }
    }
  }

  // Discover installed agents from the SSOT and every supported vendor.
  for (const vendor of [
    "agents",
    "claude",
    "codex",
    "cursor",
    "qwen",
    "opencode",
    "pi",
  ]) {
    const agentDir = `.${vendor}/agents`;
    for (const file of tryDir(join(root, agentDir)).filter((f) =>
      /\.(md|toml)$/.test(f),
    )) {
      const name = file.replace(/\.(md|toml)$/, "");
      const id = `agent:${name}`;
      const existing = nodes.find((node) => node.id === id);
      if (existing) existing.paths?.push(`${agentDir}/${file}`);
      else
        nodes.push({
          id,
          label: name,
          category: "agent",
          group: "Agents",
          paths: [`${agentDir}/${file}`],
        });
      const skill = AGENT_SKILL_MAP[name];
      if (skill) edge(id, `skill:${skill}`, "implements");
    }
  }

  // Model resource files as dependencies, including custom skill resources.
  const walkFiles = (dir: string): string[] =>
    tryDirEntries(join(root, dir)).flatMap((entry) => {
      if (["node_modules", "dist"].includes(entry.name)) return [];
      const file = `${dir}/${entry.name}`;
      return entry.isDirectory() ? walkFiles(file) : [file];
    });
  for (const skill of nodes.filter((node) => node.category === "skill")) {
    for (const file of walkFiles(`.agents/skills/${skill.label}`)) {
      if (!file.endsWith(".md") || file.endsWith("/SKILL.md")) continue;
      const id = `resource:${file.slice(".agents/skills/".length)}`;
      nodes.push({
        id,
        label: file.slice(".agents/skills/".length),
        category: "resource",
        paths: [file],
      });
    }
  }
  const pathNodes = new Map(
    nodes.flatMap((node) =>
      (node.paths ?? []).map((file) => [file, node.id] as const),
    ),
  );
  for (const node of nodes) {
    for (const file of node.paths ?? []) {
      const content = tryRead(join(root, file));
      for (const ref of findSharedRefs(content))
        edge(node.id, `shared:${ref}`, "references");
      // Role/workflow directives name skills. Mentions in shared guidance or
      // example prose are not dependencies and would expand every context.
      for (const other of nodes.filter(
        (candidate) =>
          candidate.category === "skill" &&
          ["agent", "workflow"].includes(node.category),
      )) {
        if (
          other.id !== node.id &&
          new RegExp(`(?<![\\w-])${other.label}(?![\\w-])`).test(content)
        )
          edge(node.id, other.id, "references");
      }
      // Relative Markdown links and literal paths in backticks.
      for (const match of content.matchAll(/\]\(([^)\s]+)\)|`([^`\s]+)`/g)) {
        const ref = (match[1] ?? match[2] ?? "").split("#")[0] ?? "";
        if (/^[a-z]+:\/\//i.test(ref)) continue;
        const target =
          pathNodes.get(
            normalize(join(dirname(file), ref)).replaceAll("\\", "/"),
          ) ?? pathNodes.get(ref);
        if (target && target !== node.id) edge(node.id, target, "references");
        if (
          options.includeChecks !== false &&
          /^cli\/.+\.test\.[cm]?tsx?$/.test(ref) &&
          existsSync(join(root, ref))
        ) {
          const id = `check:${ref}`;
          if (!nodes.some((node) => node.id === id))
            nodes.push({ id, label: ref, category: "check", paths: [ref] });
          edge(id, node.id, "references");
        }
      }
    }
  }
  // A check edge is only emitted when a test names an actual definition path.
  for (const file of (options.includeChecks === false
    ? []
    : walkFiles("cli")
  ).filter((file) => /\.test\.[cm]?tsx?$/.test(file))) {
    const content = tryRead(join(root, file));
    const targets = [...pathNodes.entries()].filter(([definition]) =>
      content.includes(definition),
    );
    if (!targets.length) continue;
    const id = `check:${file}`;
    if (!nodes.some((node) => node.id === id))
      nodes.push({ id, label: file, category: "check", paths: [file] });
    for (const [, target] of targets) edge(id, target, "references");
  }

  // Project coordination store (canonical path with a legacy fallback)
  const memDir = getCoordinationStorePath(root);
  for (const f of tryDir(memDir).filter((f) => f.endsWith(".md"))) {
    nodes.push({
      id: `memory:${f.replace(".md", "")}`,
      label: f.replace(".md", ""),
      category: "memory",
      group: "Memories",
    });
  }

  const ids = new Set(nodes.map((n) => n.id));
  return {
    nodes,
    edges: edges.filter((e) => ids.has(e.from) && ids.has(e.to)),
  };
}

// ── ASCII Renderer ──────────────────────────────────────────────

export interface GraphSelection extends Graph {
  direction: "dependencies" | "dependents";
  seeds: string[];
  unmatched: string[];
  checks: string[][];
}

/** Cycle-safe reachability. A path can name a definition or a directory. */
export function selectGraph(
  graph: Graph,
  inputs: string[],
  direction: GraphSelection["direction"],
): GraphSelection {
  const seeds = new Set<string>();
  const unmatched: string[] = [];
  for (const raw of inputs) {
    const input = raw
      .replaceAll("\\", "/")
      .replace(/^\.\//, "")
      .replace(/\/$/, "");
    const matches = graph.nodes.filter(
      (node) =>
        node.id === input ||
        node.label === input ||
        node.paths?.some(
          (file) => file === input || file.startsWith(`${input}/`),
        ),
    );
    if (!matches.length) unmatched.push(raw);
    for (const node of matches) seeds.add(node.id);
  }
  const selected = new Set(seeds);
  const queue = [...seeds];
  for (let index = 0; index < queue.length; index++) {
    for (const edge of graph.edges) {
      const from = direction === "dependencies" ? edge.from : edge.to;
      const to = direction === "dependencies" ? edge.to : edge.from;
      if (from !== queue[index] || selected.has(to)) continue;
      selected.add(to);
      queue.push(to);
    }
  }
  const nodes = graph.nodes.filter((node) => selected.has(node.id));
  return {
    direction,
    seeds: [...seeds],
    unmatched,
    nodes,
    edges: graph.edges.filter(
      (edge) => selected.has(edge.from) && selected.has(edge.to),
    ),
    checks: nodes
      .filter((node) => node.category === "check")
      .map((node) => [
        "bun",
        "run",
        "--cwd",
        "cli",
        "test",
        node.label.replace(/^cli\//, ""),
      ]),
  };
}

const CC: Record<string, (s: string) => string> = {
  root: (s) => pc.bold(pc.white(s)),
  skill: pc.green,
  workflow: pc.blue,
  shared: pc.yellow,
  agent: pc.magenta,
  memory: pc.cyan,
};

function col(text: string, cat: string) {
  return (CC[cat] ?? pc.white)(text);
}

// Place colored text at exact display positions
function placeLine(
  ...segments: [pos: number, text: string, displayWidth: number][]
): string {
  const sorted = segments.sort((a, b) => a[0] - b[0]);
  let result = "";
  let cursor = 0;
  for (const [pos, text, width] of sorted) {
    if (pos > cursor) result += " ".repeat(pos - cursor);
    result += text;
    cursor = pos + width;
  }
  return result;
}

function renderOverview(graph: Graph): string[] {
  const o: string[] = [];

  const nSk = graph.nodes.filter((n) => n.category === "skill").length;
  const nWf = graph.nodes.filter((n) => n.category === "workflow").length;
  const nSh = graph.nodes.filter((n) => n.category === "shared").length;
  const nAg = graph.nodes.filter((n) => n.category === "agent").length;
  const nMe = graph.nodes.filter((n) => n.category === "memory").length;

  const skRef = graph.edges.filter(
    (e) => e.from.startsWith("skill:") && e.to.startsWith("shared:"),
  ).length;
  const wfRef = graph.edges.filter(
    (e) => e.from.startsWith("workflow:") && e.to.startsWith("shared:"),
  ).length;
  const agImpl = graph.edges.filter((e) => e.type === "implements").length;
  const shSelf = graph.edges.filter(
    (e) => e.from.startsWith("shared:") && e.to.startsWith("shared:"),
  ).length;

  const skL = `Skills (${nSk})`;
  const wfL = `Workflows (${nWf})`;
  const shL = `Shared (${nSh})`;
  const agL = `Agents (${nAg})`;
  const meL = `Memories (${nMe})`;

  // Column centers
  const C1 = 10;
  const C2 = 29;
  const C3 = 48;
  const MID = 19;

  // Root
  o.push(placeLine([C2 - 5, col("oh-my-agent", "root"), 11]));
  o.push(placeLine([C2, "│", 1]));

  // Branch ┌─────┼─────┐
  const bch: string[] = Array(C3 + 1).fill(" ");
  bch[C1] = "┌";
  bch[C2] = "┼";
  bch[C3] = "┐";
  for (let i = C1 + 1; i < C3; i++) if (i !== C2) bch[i] = "─";
  o.push(bch.join(""));

  // ▼ markers
  o.push(placeLine([C1, "▼", 1], [C2, "▼", 1], [C3, "▼", 1]));

  // Group labels
  o.push(
    placeLine(
      [C1 - (skL.length >> 1), col(skL, "skill"), skL.length],
      [C2 - (wfL.length >> 1), col(wfL, "workflow"), wfL.length],
      [C3 - (meL.length >> 1), col(meL, "memory"), meL.length],
    ),
  );

  // │ down from Skills & Workflows
  o.push(placeLine([C1, "│", 1], [C2, "│", 1]));

  // Ref counts
  const skRefL = `${skRef} refs`;
  const wfRefL = `${wfRef} refs`;
  o.push(
    placeLine(
      [C1 - (skRefL.length >> 1), pc.dim(skRefL), skRefL.length],
      [C2 - (wfRefL.length >> 1), pc.dim(wfRefL), wfRefL.length],
    ),
  );

  o.push(placeLine([C1, "│", 1], [C2, "│", 1]));

  // Merge └───┬───┘
  const mch: string[] = Array(C2 + 1).fill(" ");
  mch[C1] = "└";
  mch[MID] = "┬";
  mch[C2] = "┘";
  for (let i = C1 + 1; i < C2; i++) if (i !== MID) mch[i] = "─";
  o.push(mch.join(""));

  o.push(placeLine([MID, "▼", 1]));

  // Shared
  const shStart = MID - (shL.length >> 1);
  let shLine = placeLine([shStart, col(shL, "shared"), shL.length]);
  if (shSelf > 0) shLine += `  ${pc.dim(`◂── ${shSelf} internal`)}`;
  o.push(shLine);

  o.push("");

  // Agents → Skills
  const agStart = C1 - (agL.length >> 1);
  const implL = `──[${agImpl} implements]──▸`;
  o.push(
    placeLine([agStart, col(agL, "agent"), agL.length]) +
      ` ${pc.dim(implL)} ${col("Skills", "skill")}`,
  );

  return o;
}

export function renderAscii(graph: Graph): string {
  const o: string[] = [];

  // Graph overview
  o.push(...renderOverview(graph));
  o.push("");
  o.push(pc.dim("─".repeat(56)));
  o.push("");

  // Build outgoing edge map + incoming ref counts
  const outMap = new Map<string, GraphEdge[]>();
  const inCount = new Map<string, number>();
  for (const e of graph.edges) {
    if (!outMap.has(e.from)) outMap.set(e.from, []);
    outMap.get(e.from)?.push(e);
    if (e.to.startsWith("shared:"))
      inCount.set(e.to, (inCount.get(e.to) ?? 0) + 1);
  }

  function refs(id: string): string {
    const r = outMap.get(id);
    if (!r?.length) return "";
    const names = r.map(
      (e) =>
        graph.nodes.find((n) => n.id === e.to)?.label.replace(/\.md$/, "") ??
        e.to.split(":")[1],
    );
    const txt =
      names.length > 4
        ? `${names.slice(0, 3).join(", ")} +${names.length - 3}`
        : names.join(", ");
    return ` ${pc.dim("──▸")} ${pc.dim(txt)}`;
  }

  // Detail: Skills
  const skills = graph.nodes.filter((n) => n.category === "skill");
  const subs = [...new Set(skills.map((skill) => skill.subgroup))];
  o.push(pc.bold(`Skills (${skills.length})`));
  for (let gi = 0; gi < subs.length; gi++) {
    const sg = subs[gi];
    const items = skills.filter((s) => s.subgroup === sg);
    if (!items.length) continue;
    const last = gi === subs.length - 1;
    o.push(`${last ? "└─" : "├─"} ${pc.dim(sg ?? "Custom")}`);
    const pre = last ? "   " : "│  ";
    for (const item of items) {
      const c = item === items.at(-1) ? "└─" : "├─";
      o.push(`${pre}${c} ${col(item.label, "skill")}${refs(item.id)}`);
    }
  }
  o.push("");

  // Detail: Workflows
  const wfs = graph.nodes.filter((n) => n.category === "workflow");
  o.push(pc.bold(`Workflows (${wfs.length})`));
  for (const wf of wfs) {
    const c = wf === wfs.at(-1) ? "└─" : "├─";
    o.push(`${c} ${col(wf.label, "workflow")}${refs(wf.id)}`);
  }
  o.push("");

  // Detail: Shared (sorted by incoming refs desc)
  const sh = [...graph.nodes.filter((n) => n.category === "shared")].sort(
    (a, b) => (inCount.get(b.id) ?? 0) - (inCount.get(a.id) ?? 0),
  );
  o.push(pc.bold(`Shared (${sh.length})`));
  for (const s of sh) {
    const c = s === sh.at(-1) ? "└─" : "├─";
    const cnt = inCount.get(s.id) ?? 0;
    const badge = cnt > 0 ? pc.dim(` (${cnt} refs)`) : "";
    o.push(`${c} ${col(s.label, "shared")}${badge}${refs(s.id)}`);
  }
  o.push("");

  // Detail: Claude Agents
  const ags = graph.nodes.filter((n) => n.category === "agent");
  o.push(pc.bold(`Agents (${ags.length})`));
  for (const ag of ags) {
    const c = ag === ags.at(-1) ? "└─" : "├─";
    const impl = graph.edges.find(
      (e) => e.from === ag.id && e.type === "implements",
    );
    const tag = impl
      ? ` ${pc.dim("──▸")} ${col(impl.to.split(":")[1] ?? "", "skill")}`
      : "";
    o.push(`${c} ${col(ag.label, "agent")}${tag}`);
  }
  o.push("");

  // Detail: project coordination store
  const mems = graph.nodes.filter((n) => n.category === "memory");
  o.push(pc.bold(`Memories (${mems.length})`));
  if (!mems.length) {
    o.push(`└─ ${pc.dim("(none)")}`);
  } else {
    for (const mem of mems) {
      const c = mem === mems.at(-1) ? "└─" : "├─";
      o.push(`${c} ${col(mem.label, "memory")}`);
    }
  }

  return o.join("\n");
}
