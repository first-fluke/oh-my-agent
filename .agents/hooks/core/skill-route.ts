#!/usr/bin/env bun
/**
 * oh-my-agent — Skill Route Recorder
 *
 * Records which OMA skill was routed in a vendor session and WHY, as
 * `skill.routed` L1 events:
 *
 *   source "user-explicit"     — the user named the skill (`/<skill>` or
 *                                `$<skill>`) in the prompt (skill-injector).
 *   source "hook-trigger"      — a triggers.json keyword matched the prompt.
 *                                Recorded as stage "suggested" by skill-injector,
 *                                and again as stage "loaded" when the model
 *                                actually loads the suggested skill.
 *   source "model-description" — the model loaded a skill the hook never
 *                                suggested, i.e. it routed from the skill
 *                                description in its own catalog.
 *
 * The post_tool handler detects a skill load from the vendor tool call: the
 * Claude `Skill` tool, or any tool input (Read path, shell command) naming
 * `skills/<name>/SKILL.md`. Only skills present in `.agents/skills/` count.
 *
 * Events go to the L1 session that owns this work: the active main workflow
 * session when it belongs to this vendor session or has recent non-boundary
 * activity, otherwise a per-vendor-session `skill-routing` session (category
 * `routing`). Prompt text is never recorded — only matched trigger keywords.
 *
 * Never blocks and never injects context; every failure is swallowed.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { agyConversationId, agyProjectDir, isAgyInput } from "./agy-input.ts";
import { emitEvent as appendStateEvent } from "./state-core.ts";
import {
  createSessionId,
  emitEvent,
  type OmaEvent,
  readEvents,
  vendorHomePayload,
} from "./state-emit.ts";
import {
  atomicWriteJson,
  claimActiveSession,
  readIndex,
} from "./state-marker.ts";
import type { HandlerCtx, HandlerResult, HookInput, Vendor } from "./types.ts";
import { getProjectDir } from "./vendor-detect.ts";

export type SkillRouteSource =
  | "user-explicit"
  | "hook-trigger"
  | "model-description";

export type SkillRouteStage = "suggested" | "loaded";

export interface SkillRoute {
  skill: string;
  source: SkillRouteSource;
  stage: SkillRouteStage;
  /** Trigger keywords that matched (hook-trigger only). Never prompt text. */
  matchedTriggers?: string[];
  score?: number;
  /** Tool that loaded the skill (stage "loaded" via post_tool). */
  via?: string;
}

export const ROUTING_WORKFLOW = "skill-routing";
export const ROUTING_CATEGORY = "routing";

/** Mirrors keyword-detector's L1 liveness window (persistent-mode STALE_HOURS). */
export const ROUTE_LIVE_TTL_MS = 2 * 60 * 60 * 1000;

/** Per-vendor-session route memory survives a long working session. */
const ROUTE_STATE_TTL_MS = 12 * 60 * 60 * 1000;

// ── Per-vendor-session state ─────────────────────────────────

interface RouteSessionState {
  routeSid?: string;
  suggested: string[];
  loaded: string[];
  timestamp: number;
}

interface RouteState {
  sessions: Record<string, RouteSessionState>;
}

export function routeStatePath(projectDir: string): string {
  return join(projectDir, ".agents", "state", "skill-routes.json");
}

function readRouteState(projectDir: string): RouteState {
  const path = routeStatePath(projectDir);
  if (!existsSync(path)) return { sessions: {} };
  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as RouteState;
    if (parsed && typeof parsed.sessions === "object" && parsed.sessions) {
      return parsed;
    }
  } catch {
    // corrupted — reset
  }
  return { sessions: {} };
}

function writeRouteState(projectDir: string, state: RouteState): void {
  try {
    atomicWriteJson(routeStatePath(projectDir), state);
  } catch {
    // Route memory failing open only weakens dedup and source attribution.
  }
}

/** Drop expired entries; returns the routing sessions they owned. */
function pruneRouteState(state: RouteState, now: number): string[] {
  const expired: string[] = [];
  for (const [id, entry] of Object.entries(state.sessions)) {
    if (!entry || now - entry.timestamp > ROUTE_STATE_TTL_MS) {
      if (entry?.routeSid) expired.push(entry.routeSid);
      delete state.sessions[id];
    }
  }
  return expired;
}

// ── Session resolution ───────────────────────────────────────

function isEnded(events: OmaEvent[]): boolean {
  return events.some((event) => event.kind === "session.ended");
}

/**
 * Whether a main workflow session should receive routing events.
 *
 * state-boundary appends a `boundary` event to the active main session on
 * every vendor session start, which keeps an abandoned session looking fresh.
 * So freshness is judged on non-boundary events only, and a session created
 * by this very vendor session is always ours.
 */
export function isMainSessionForRouting(
  events: OmaEvent[],
  vendorSid: string | undefined,
  now: number = Date.now(),
): boolean {
  if (events.length === 0 || isEnded(events)) return false;
  if (vendorSid && vendorSid !== "unknown") {
    const created = events.find((event) => event.kind === "session.created");
    if (created?.vendorSid === vendorSid) return true;
  }
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    if (!event || event.kind === "boundary") continue;
    const ts = Date.parse(event.ts);
    return Number.isFinite(ts) && now - ts < ROUTE_LIVE_TTL_MS;
  }
  return false;
}

function isUsableRoutingSession(projectDir: string, sid: string): boolean {
  const events = readEvents(projectDir, sid);
  return events.length > 0 && !isEnded(events);
}

/**
 * End an idle `skill-routing` session. Nothing else ends these sessions, and
 * `oma state archive` skips open ones, so without this they accumulate.
 * Recently active and workflow sessions are never touched. Written through
 * state-core directly: closing is bookkeeping, not a memory observation.
 */
export function closeRoutingSession(
  projectDir: string,
  sid: string,
  now: number = Date.now(),
): boolean {
  try {
    const events = readEvents(projectDir, sid);
    if (events.length === 0 || isEnded(events)) return false;
    // Still receiving events (e.g. CLI emits without a vendor sid): keep open.
    if (isMainSessionForRouting(events, undefined, now)) return false;
    const created = events.find((event) => event.kind === "session.created");
    if (created?.payload?.workflow !== ROUTING_WORKFLOW) return false;
    appendStateEvent(projectDir, sid, {
      kind: "session.ended",
      payload: { status: "completed", reason: "routing session idle" },
    });
    return true;
  } catch {
    return false;
  }
}

async function createRoutingSession(
  projectDir: string,
  vendor: string | undefined,
  vendorSid: string | undefined,
  now: number,
): Promise<string> {
  const sid = createSessionId();
  await emitEvent(projectDir, sid, {
    kind: "session.created",
    ...(vendor ? { vendor } : {}),
    ...(vendorSid ? { vendorSid } : {}),
    payload: {
      workflow: ROUTING_WORKFLOW,
      category: ROUTING_CATEGORY,
      ...(vendor ? vendorHomePayload(vendor) : {}),
    },
  });
  // Lets `oma state emit --category routing` find it without a vendor sid.
  const previous = readIndex(projectDir).active[ROUTING_CATEGORY];
  const claimed = claimActiveSession(
    projectDir,
    ROUTING_CATEGORY,
    sid,
    (existing) =>
      isMainSessionForRouting(readEvents(projectDir, existing), undefined, now),
  );
  // The claim only replaces a stale holder; end it so it can be archived.
  if (claimed && previous && previous !== sid) {
    closeRoutingSession(projectDir, previous, now);
  }
  return sid;
}

export interface ResolveRouteSidOptions {
  vendor?: string;
  vendorSid?: string;
  /** Previously created routing session for this vendor session, if known. */
  knownRouteSid?: string;
  now?: number;
}

/**
 * Resolve (creating when needed) the L1 session that receives routing events
 * and route-selection decisions. Shared by the hooks and
 * `oma state emit --category routing`.
 */
export async function resolveRouteSid(
  projectDir: string,
  options: ResolveRouteSidOptions = {},
): Promise<string> {
  const { vendor, vendorSid, knownRouteSid, now = Date.now() } = options;
  const index = readIndex(projectDir);

  const main = index.active.main;
  if (
    main &&
    isMainSessionForRouting(readEvents(projectDir, main), vendorSid, now)
  ) {
    return main;
  }

  if (knownRouteSid && isUsableRoutingSession(projectDir, knownRouteSid)) {
    return knownRouteSid;
  }

  // Without a vendor session id (CLI emit), reuse the claimed routing slot
  // while it is fresh; an abandoned one is replaced, not appended to.
  if (!vendorSid || vendorSid === "unknown") {
    const routing = index.active[ROUTING_CATEGORY];
    if (
      routing &&
      isMainSessionForRouting(readEvents(projectDir, routing), undefined, now)
    ) {
      return routing;
    }
  }

  return createRoutingSession(projectDir, vendor, vendorSid, now);
}

// ── Recording ────────────────────────────────────────────────

export interface RecordContext {
  projectDir: string;
  vendor: Vendor | string;
  vendorSid?: string;
  now?: number;
}

/**
 * Append `skill.routed` events, deduplicated per vendor session and stage.
 * A "loaded" model-description record is re-attributed to hook-trigger when
 * the hook suggested the skill earlier in this vendor session.
 * Returns the records actually written. Never throws.
 */
export async function recordSkillRoutes(
  ctx: RecordContext,
  routes: SkillRoute[],
): Promise<SkillRoute[]> {
  if (routes.length === 0) return [];
  try {
    const now = ctx.now ?? Date.now();
    const key = ctx.vendorSid || "unknown";
    // Without a vendor session id every session would share one entry, so
    // dedup and source memory would leak across unrelated sessions.
    const tracked = key !== "unknown";
    const state = readRouteState(ctx.projectDir);
    for (const expired of pruneRouteState(state, now)) {
      closeRoutingSession(ctx.projectDir, expired, now);
    }
    const entry: RouteSessionState = (tracked && state.sessions[key]) || {
      suggested: [],
      loaded: [],
      timestamp: now,
    };

    const written: SkillRoute[] = [];
    for (const route of routes) {
      const seen = route.stage === "suggested" ? entry.suggested : entry.loaded;
      if (seen.includes(route.skill)) continue;
      const resolved: SkillRoute =
        route.stage === "loaded" &&
        route.source === "model-description" &&
        entry.suggested.includes(route.skill)
          ? { ...route, source: "hook-trigger" }
          : route;
      seen.push(route.skill);
      written.push(resolved);
    }
    if (written.length === 0) return [];

    const sid = await resolveRouteSid(ctx.projectDir, {
      vendor: ctx.vendor,
      vendorSid: ctx.vendorSid,
      knownRouteSid: entry.routeSid,
      now,
    });
    if (tracked) {
      if (sid !== readIndex(ctx.projectDir).active.main) entry.routeSid = sid;
      entry.timestamp = now;
      state.sessions[key] = entry;
      writeRouteState(ctx.projectDir, state);
    }

    for (const route of written) {
      await emitEvent(ctx.projectDir, sid, {
        kind: "skill.routed",
        vendor: ctx.vendor,
        ...(ctx.vendorSid ? { vendorSid: ctx.vendorSid } : {}),
        causalityKey: `skill-route:${route.skill}`,
        payload: { ...route },
      });
    }
    return written;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[oma] skill route record failed: ${message}\n`);
    return [];
  }
}

// ── Load detection ───────────────────────────────────────────

/**
 * Skill names under `.agents/skills/` that have a SKILL.md. Same discovery
 * rule as skill-injector's discoverSkills (kept local to avoid an import
 * cycle: skill-injector records its suggestions through this module).
 */
export function knownSkillNames(projectDir: string): Set<string> {
  const names = new Set<string>();
  const skillsDir = join(projectDir, ".agents", "skills");
  try {
    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
      if (existsSync(join(skillsDir, entry.name, "SKILL.md"))) {
        names.add(entry.name);
      }
    }
  } catch {
    // No skills directory — nothing to attribute.
  }
  return names;
}

/**
 * Skills the user named explicitly: `/<skill>` (slash invocation) or
 * `$<skill>` (Codex skill mention), at the start or after whitespace. Only
 * names present in `knownSkills` count, so paths and prices do not match.
 * Callers strip code blocks first.
 */
export function explicitSkillMentions(
  prompt: string,
  knownSkills: ReadonlySet<string>,
): string[] {
  const found: string[] = [];
  for (const match of prompt.matchAll(
    /(?:^|\s)[/$]([a-z][a-z0-9_-]{0,40})(?![\w/-])/gi,
  )) {
    const name = match[1]?.toLowerCase();
    if (name && knownSkills.has(name) && !found.includes(name)) {
      found.push(name);
    }
  }
  return found;
}

const SKILL_FILE_PATTERN = /skills\/([A-Za-z0-9_.-]+)\/SKILL\.md\b/g;

/**
 * File-read tools across vendors (lowercased). The post_tool settings matcher
 * is a union across the whole handler chain, so edit tools reach this handler
 * too — writing a doc that mentions a SKILL.md path is not a skill load.
 */
const READ_TOOLS = new Set([
  "read",
  "read_file",
  "readfile",
  "view",
  "view_file",
  "fs_read",
]);

/** Shell tools across vendors (lowercased). */
const SHELL_TOOLS = new Set([
  "bash",
  "shell",
  "run_shell_command",
  "run_command",
  "exec_command",
]);

/** A shell command only loads a skill when a file reader opens the SKILL.md. */
const SHELL_READ_PATTERN =
  /(?:^|[\s;&|(])(?:cat|sed|head|tail|less|more|bat|nl|awk|type|get-content)\b[^;&|]*skills\/[A-Za-z0-9_.-]+\/SKILL\.md/i;

function firstKnownSkillPath(
  text: string,
  knownSkills: ReadonlySet<string>,
): string | null {
  for (const match of text.replace(/\\/g, "/").matchAll(SKILL_FILE_PATTERN)) {
    const name = match[1];
    if (name && knownSkills.has(name)) return name;
  }
  return null;
}

/**
 * Identify the OMA skill a tool call loads, or null. Claude's `Skill` tool
 * names the skill directly (optionally plugin-prefixed, `plugin:skill`);
 * other vendors load a skill by reading `skills/<name>/SKILL.md` through a
 * file-read tool or a file-reading shell command.
 */
export function detectSkillLoad(
  toolName: string,
  toolInput: Record<string, unknown>,
  knownSkills: ReadonlySet<string>,
): string | null {
  const tool = toolName.toLowerCase();
  if (tool === "skill") {
    const raw = toolInput.skill ?? toolInput.name;
    if (typeof raw !== "string") return null;
    const name = raw.trim().replace(/^\//, "").split(":").pop() ?? "";
    return knownSkills.has(name) ? name : null;
  }
  if (READ_TOOLS.has(tool)) {
    for (const key of ["file_path", "path", "absolute_path", "target_file"]) {
      const value = toolInput[key];
      if (typeof value !== "string") continue;
      const name = firstKnownSkillPath(value, knownSkills);
      if (name) return name;
    }
    return null;
  }
  if (SHELL_TOOLS.has(tool)) {
    const command = toolInput.command ?? toolInput.cmd;
    const text = Array.isArray(command)
      ? command.filter((part) => typeof part === "string").join(" ")
      : command;
    if (typeof text !== "string") return null;
    const normalized = text.replace(/\\/g, "/");
    if (!SHELL_READ_PATTERN.test(normalized)) return null;
    return firstKnownSkillPath(normalized, knownSkills);
  }
  return null;
}

// ── Pure handler (canonical ABI) ─────────────────────────────

/**
 * post_tool recorder. Returns null always: routing telemetry must never alter
 * the model's context or block a tool.
 */
export async function run(
  input: HookInput,
  ctx: HandlerCtx,
): Promise<HandlerResult | null> {
  if (input.kind !== "post_tool") return null;
  const projectDir = ctx.cwd;
  if (!projectDir) return null;
  // Cheap pre-filter before touching the filesystem.
  const tool = input.toolName.toLowerCase();
  if (tool !== "skill") {
    if (!READ_TOOLS.has(tool) && !SHELL_TOOLS.has(tool)) return null;
    const toolInput = input.toolInput ?? {};
    const hasSkillFile = Object.values(toolInput).some(
      (value) =>
        (typeof value === "string" && value.includes("SKILL.md")) ||
        (Array.isArray(value) &&
          value.some(
            (part) => typeof part === "string" && part.includes("SKILL.md"),
          )),
    );
    if (!hasSkillFile) return null;
  }

  const known = knownSkillNames(projectDir);
  if (known.size === 0) return null;
  const skill = detectSkillLoad(input.toolName, input.toolInput, known);
  if (!skill) return null;

  await recordSkillRoutes(
    { projectDir, vendor: ctx.vendor, vendorSid: ctx.sid },
    [
      {
        skill,
        source: "model-description",
        stage: "loaded",
        via: input.toolName,
      },
    ],
  );
  return null;
}

// ── Standalone entry (direct bun invocation / vendor hook subprocess) ──

async function main() {
  const raw = readFileSync(0, "utf-8");
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    process.exit(0);
  }

  const toolCall = parsed.toolCall as
    | { name?: unknown; args?: unknown }
    | undefined;
  const isAgy = isAgyInput(parsed) || typeof toolCall?.name === "string";
  const vendor: Vendor = isAgy ? "antigravity" : "claude";
  const projectDir = isAgy
    ? agyProjectDir(parsed) || ((parsed.cwd as string | undefined) ?? "")
    : getProjectDir(vendor, parsed);
  const sid = isAgy
    ? (agyConversationId(parsed) ?? undefined)
    : ((parsed.session_id as string | undefined) ??
      (parsed.sessionId as string | undefined));
  const toolName = isAgy
    ? String(toolCall?.name ?? "")
    : String(parsed.tool_name ?? parsed.toolName ?? "");
  const toolInput = (
    isAgy ? toolCall?.args : (parsed.tool_input ?? parsed.toolInput)
  ) as Record<string, unknown> | undefined;

  await run(
    {
      kind: "post_tool",
      toolName,
      toolInput: toolInput ?? {},
      cwd: projectDir,
    },
    { vendor, cwd: projectDir, sid },
  );
  if (isAgy) console.log("{}");
  process.exit(0);
}

if (import.meta.main) {
  main().catch(() => process.exit(0));
}
