import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pc from "picocolors";
import { SKILLS } from "./skills.js";

// ── Types ───────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  label: string;
  category: "root" | "skill" | "workflow" | "shared" | "agent" | "memory";
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
  Object.entries(SKILLS).map(([cat, items]) => [cat, items.map((s) => s.name)]),
);

const AGENT_SKILL_MAP: Record<string, string> = {
  "backend-engineer": "oma-backend",
  "frontend-engineer": "oma-frontend",
  "db-engineer": "oma-db",
  "mobile-engineer": "oma-mobile",
  "pm-planner": "oma-pm",
  "qa-reviewer": "oma-qa",
  "debug-investigator": "oma-debug",
};

// ── Helpers ─────────────────────────────────────────────────────

function findSharedRefs(content: string): string[] {
  const refs = new Set<string>();
  for (const m of content.matchAll(/_shared\/([a-z][a-z0-9_-]*)/gi)) {
    refs.add(m[1]);
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

// ── Graph Builder ───────────────────────────────────────────────

export function buildGraph(root: string): Graph {
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
  for (const [cat, names] of Object.entries(SKILL_CATS)) {
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
    nodes.push({ id, label: name, category: "workflow", group: "Workflows" });
    for (const ref of findSharedRefs(tryRead(join(wfDir, f))))
      edge(id, `shared:${ref}`, "references");
  }

  // Shared
  const sharedDir = join(skillsBase, "_shared");
  for (const entry of tryDirEntries(sharedDir)) {
    const name = entry.isDirectory()
      ? entry.name
      : entry.name.replace(".md", "");
    const id = `shared:${name}`;
    nodes.push({
      id,
      label: name,
      category: "shared",
      group: "Shared",
    });
    if (!entry.isDirectory() && entry.name.endsWith(".md")) {
      for (const ref of findSharedRefs(tryRead(join(sharedDir, entry.name)))) {
        if (ref !== name) edge(id, `shared:${ref}`, "references");
      }
    }
  }

  // Claude Agents
  const claudeDir = join(root, ".claude", "agents");
  for (const f of tryDir(claudeDir).filter((f) => f.endsWith(".md"))) {
    const name = f.replace(".md", "");
    const id = `agent:${name}`;
    nodes.push({
      id,
      label: name,
      category: "agent",
      group: "Claude Agents",
    });
    const skill = AGENT_SKILL_MAP[name];
    if (skill) edge(id, `skill:${skill}`, "implements");
  }

  // Serena Memories
  const memDir = join(root, ".serena", "memories");
  for (const f of tryDir(memDir).filter((f) => f.endsWith(".md"))) {
    nodes.push({
      id: `memory:${f.replace(".md", "")}`,
      label: f.replace(".md", ""),
      category: "memory",
      group: "Serena Memories",
    });
  }

  const ids = new Set(nodes.map((n) => n.id));
  return {
    nodes,
    edges: edges.filter((e) => ids.has(e.from) && ids.has(e.to)),
  };
}

// ── ASCII Renderer ──────────────────────────────────────────────

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
  const subs = Object.keys(SKILL_CATS);
  o.push(pc.bold(`Skills (${skills.length})`));
  for (let gi = 0; gi < subs.length; gi++) {
    const sg = subs[gi];
    const items = skills.filter((s) => s.subgroup === sg);
    if (!items.length) continue;
    const last = gi === subs.length - 1;
    o.push(`${last ? "└─" : "├─"} ${pc.dim(sg)}`);
    const pre = last ? "   " : "│  ";
    for (let i = 0; i < items.length; i++) {
      const c = i === items.length - 1 ? "└─" : "├─";
      o.push(`${pre}${c} ${col(items[i].label, "skill")}${refs(items[i].id)}`);
    }
  }
  o.push("");

  // Detail: Workflows
  const wfs = graph.nodes.filter((n) => n.category === "workflow");
  o.push(pc.bold(`Workflows (${wfs.length})`));
  for (let i = 0; i < wfs.length; i++) {
    const c = i === wfs.length - 1 ? "└─" : "├─";
    o.push(`${c} ${col(wfs[i].label, "workflow")}${refs(wfs[i].id)}`);
  }
  o.push("");

  // Detail: Shared (sorted by incoming refs desc)
  const sh = [...graph.nodes.filter((n) => n.category === "shared")].sort(
    (a, b) => (inCount.get(b.id) ?? 0) - (inCount.get(a.id) ?? 0),
  );
  o.push(pc.bold(`Shared (${sh.length})`));
  for (let i = 0; i < sh.length; i++) {
    const c = i === sh.length - 1 ? "└─" : "├─";
    const cnt = inCount.get(sh[i].id) ?? 0;
    const badge = cnt > 0 ? pc.dim(` (${cnt} refs)`) : "";
    o.push(`${c} ${col(sh[i].label, "shared")}${badge}${refs(sh[i].id)}`);
  }
  o.push("");

  // Detail: Claude Agents
  const ags = graph.nodes.filter((n) => n.category === "agent");
  o.push(pc.bold(`Claude Agents (${ags.length})`));
  for (let i = 0; i < ags.length; i++) {
    const c = i === ags.length - 1 ? "└─" : "├─";
    const impl = graph.edges.find(
      (e) => e.from === ags[i].id && e.type === "implements",
    );
    const tag = impl
      ? ` ${pc.dim("──▸")} ${col(impl.to.split(":")[1], "skill")}`
      : "";
    o.push(`${c} ${col(ags[i].label, "agent")}${tag}`);
  }
  o.push("");

  // Detail: Serena Memories
  const mems = graph.nodes.filter((n) => n.category === "memory");
  o.push(pc.bold(`Serena Memories (${mems.length})`));
  if (!mems.length) {
    o.push(`└─ ${pc.dim("(none)")}`);
  } else {
    for (let i = 0; i < mems.length; i++) {
      const c = i === mems.length - 1 ? "└─" : "├─";
      o.push(`${c} ${col(mems[i].label, "memory")}`);
    }
  }

  return o.join("\n");
}
