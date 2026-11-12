/**
 * Skill routing telemetry (`skill.routed`): which OMA skill was routed in a
 * vendor session and why — user-explicit (`/skill`, `$skill`), hook-trigger
 * (triggers.json keyword, suggested then loaded), or model-description (the
 * model loaded a skill the hook never suggested). Also covers session
 * resolution: a stale main session kept "fresh" only by boundary events must
 * not receive routing records.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { validateEventPayload } from "../../.agents/hooks/core/event-contract.ts";
import {
  closeRoutingSession,
  detectSkillLoad,
  explicitSkillMentions,
  isMainSessionForRouting,
  knownSkillNames,
  ROUTE_LIVE_TTL_MS,
  ROUTING_CATEGORY,
  ROUTING_WORKFLOW,
  recordSkillRoutes,
  resolveRouteSid,
  run,
} from "../../.agents/hooks/core/skill-route.ts";
import {
  createSessionId,
  emitEvent,
  type OmaEvent,
  readEvents,
} from "../../.agents/hooks/core/state-emit.ts";
import {
  readIndex,
  setActiveSession,
} from "../../.agents/hooks/core/state-marker.ts";

const KNOWN = new Set(["oma-design", "oma-image", "oma-translation"]);

let projectDir: string;

function writeSkill(name: string): void {
  const dir = join(projectDir, ".agents", "skills", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), `---\nname: ${name}\n---\n`);
}

function routedEvents(sid: string): OmaEvent[] {
  return readEvents(projectDir, sid).filter((e) => e.kind === "skill.routed");
}

function event(kind: string, ts: string, vendorSid?: string): OmaEvent {
  return {
    eventId: `${kind}-${ts}`,
    ts,
    sid: "s",
    kind,
    writerPid: 1,
    ...(vendorSid ? { vendorSid } : {}),
  };
}

beforeEach(() => {
  projectDir = mkdtempSync(join(tmpdir(), "oma-skill-route-"));
  for (const name of KNOWN) writeSkill(name);
  // `_shared` and directories without SKILL.md are not skills.
  mkdirSync(join(projectDir, ".agents", "skills", "_shared"), {
    recursive: true,
  });
  mkdirSync(join(projectDir, ".agents", "skills", "no-skill-md"), {
    recursive: true,
  });
});

afterEach(() => {
  rmSync(projectDir, { recursive: true, force: true });
});

describe("knownSkillNames", () => {
  it("lists skill directories with a SKILL.md, excluding _shared", () => {
    expect([...knownSkillNames(projectDir)].sort()).toEqual([...KNOWN].sort());
  });
});

describe("detectSkillLoad", () => {
  it("reads the Claude Skill tool name, with or without a plugin prefix", () => {
    expect(detectSkillLoad("Skill", { skill: "oma-design" }, KNOWN)).toBe(
      "oma-design",
    );
    expect(detectSkillLoad("Skill", { skill: "oma:oma-image" }, KNOWN)).toBe(
      "oma-image",
    );
    expect(detectSkillLoad("Skill", { skill: "simplify" }, KNOWN)).toBeNull();
  });

  it("detects a SKILL.md read through a file-read tool", () => {
    expect(
      detectSkillLoad(
        "Read",
        { file_path: "/repo/.agents/skills/oma-design/SKILL.md" },
        KNOWN,
      ),
    ).toBe("oma-design");
    expect(
      detectSkillLoad(
        "read_file",
        { path: ".agents\\skills\\oma-translation\\SKILL.md" },
        KNOWN,
      ),
    ).toBe("oma-translation");
  });

  it("ignores resource reads and unknown skills", () => {
    expect(
      detectSkillLoad(
        "Read",
        {
          file_path:
            "/repo/.agents/skills/oma-design/resources/external-design-skills.md",
        },
        KNOWN,
      ),
    ).toBeNull();
    expect(
      detectSkillLoad(
        "Read",
        { file_path: "/repo/.agents/skills/other/SKILL.md" },
        KNOWN,
      ),
    ).toBeNull();
  });

  it("does not treat an edit that mentions a SKILL.md path as a load", () => {
    // The settings matcher is a union across the chain, so edit tools reach
    // this handler too.
    expect(
      detectSkillLoad(
        "Write",
        {
          file_path: "/repo/docs/notes.md",
          content: "see .agents/skills/oma-design/SKILL.md",
        },
        KNOWN,
      ),
    ).toBeNull();
    expect(
      detectSkillLoad(
        "Edit",
        { file_path: "/repo/.agents/skills/oma-design/SKILL.md" },
        KNOWN,
      ),
    ).toBeNull();
  });

  it("counts shell reads of a SKILL.md but not other shell commands", () => {
    expect(
      detectSkillLoad(
        "Bash",
        { command: "sed -n '1,200p' .agents/skills/oma-image/SKILL.md" },
        KNOWN,
      ),
    ).toBe("oma-image");
    expect(
      detectSkillLoad(
        "Bash",
        { command: "git add .agents/skills/oma-image/SKILL.md" },
        KNOWN,
      ),
    ).toBeNull();
  });
});

describe("explicitSkillMentions", () => {
  it("finds /skill and $skill mentions of known skills", () => {
    expect(
      explicitSkillMentions("/oma-design 랜딩 페이지 만들어줘", KNOWN),
    ).toEqual(["oma-design"]);
    expect(explicitSkillMentions("use $oma-image for the hero", KNOWN)).toEqual(
      ["oma-image"],
    );
  });

  it("ignores paths, unknown names, and mid-word slashes", () => {
    expect(explicitSkillMentions("open /oma-design/resources", KNOWN)).toEqual(
      [],
    );
    expect(explicitSkillMentions("/simplify this", KNOWN)).toEqual([]);
    expect(explicitSkillMentions("and/oma-design", KNOWN)).toEqual([]);
  });
});

describe("isMainSessionForRouting", () => {
  const now = Date.parse("2026-11-12T12:00:00.000Z");
  const old = new Date(now - ROUTE_LIVE_TTL_MS - 60_000).toISOString();
  const fresh = new Date(now - 60_000).toISOString();

  it("rejects a stale session kept fresh only by boundary events", () => {
    const events = [
      event("session.created", old, "vendor-old"),
      event("decision.made", old),
      event("boundary", fresh),
    ];
    expect(isMainSessionForRouting(events, "vendor-new", now)).toBe(false);
  });

  it("accepts a session created by the same vendor session", () => {
    const events = [
      event("session.created", old, "vendor-1"),
      event("boundary", fresh),
    ];
    expect(isMainSessionForRouting(events, "vendor-1", now)).toBe(true);
  });

  it("accepts recent non-boundary activity and rejects ended sessions", () => {
    expect(
      isMainSessionForRouting(
        [event("session.created", old), event("workflow.phase", fresh)],
        undefined,
        now,
      ),
    ).toBe(true);
    expect(
      isMainSessionForRouting(
        [event("session.created", fresh), event("session.ended", fresh)],
        "vendor-1",
        now,
      ),
    ).toBe(false);
  });
});

describe("recordSkillRoutes", () => {
  const ctx = () => ({ projectDir, vendor: "claude", vendorSid: "vendor-1" });

  it("creates a skill-routing session when no workflow session owns the work", async () => {
    await recordSkillRoutes(ctx(), [
      { skill: "oma-design", source: "model-description", stage: "loaded" },
    ]);
    const sid = readIndex(projectDir).active[ROUTING_CATEGORY];
    expect(sid).toBeTruthy();
    const events = readEvents(projectDir, sid as string);
    expect(events[0]?.kind).toBe("session.created");
    expect(events[0]?.payload).toMatchObject({
      workflow: ROUTING_WORKFLOW,
      category: ROUTING_CATEGORY,
    });
    expect(routedEvents(sid as string).map((e) => e.payload)).toEqual([
      {
        skill: "oma-design",
        source: "model-description",
        stage: "loaded",
      },
    ]);
  });

  it("attributes a later load of a hook-suggested skill to hook-trigger", async () => {
    await recordSkillRoutes(ctx(), [
      {
        skill: "oma-design",
        source: "hook-trigger",
        stage: "suggested",
        matchedTriggers: ["landing page"],
        score: 10,
      },
    ]);
    await recordSkillRoutes(ctx(), [
      {
        skill: "oma-design",
        source: "model-description",
        stage: "loaded",
        via: "Skill",
      },
    ]);
    const sid = readIndex(projectDir).active[ROUTING_CATEGORY] as string;
    expect(routedEvents(sid).map((e) => e.payload)).toEqual([
      {
        skill: "oma-design",
        source: "hook-trigger",
        stage: "suggested",
        matchedTriggers: ["landing page"],
        score: 10,
      },
      {
        skill: "oma-design",
        source: "hook-trigger",
        stage: "loaded",
        via: "Skill",
      },
    ]);
  });

  it("records each skill once per stage per vendor session", async () => {
    const load = {
      skill: "oma-image",
      source: "model-description" as const,
      stage: "loaded" as const,
    };
    await recordSkillRoutes(ctx(), [load]);
    expect(await recordSkillRoutes(ctx(), [load])).toEqual([]);
    const sid = readIndex(projectDir).active[ROUTING_CATEGORY] as string;
    expect(routedEvents(sid)).toHaveLength(1);
    // A different vendor session records its own load.
    const other = await recordSkillRoutes(
      { projectDir, vendor: "claude", vendorSid: "vendor-2" },
      [load],
    );
    expect(other).toHaveLength(1);
  });

  it("attaches to the main workflow session created by the same vendor session", async () => {
    const main = createSessionId();
    await emitEvent(projectDir, main, {
      kind: "session.created",
      vendor: "claude",
      vendorSid: "vendor-1",
      payload: { workflow: "work", category: "main" },
    });
    setActiveSession(projectDir, "main", main);

    await recordSkillRoutes(ctx(), [
      { skill: "oma-design", source: "user-explicit", stage: "loaded" },
    ]);
    expect(routedEvents(main)).toHaveLength(1);
    expect(readIndex(projectDir).active[ROUTING_CATEGORY]).toBeUndefined();
  });
});

describe("resolveRouteSid", () => {
  it("reuses a fresh routing slot when no vendor session id is known (CLI emit)", async () => {
    const first = await resolveRouteSid(projectDir, { vendor: "claude" });
    const second = await resolveRouteSid(projectDir, {});
    expect(second).toBe(first);
  });
});

describe("routing session lifecycle", () => {
  const HOUR = 60 * 60 * 1000;
  const ended = (sid: string) =>
    readEvents(projectDir, sid).filter((e) => e.kind === "session.ended");

  it("ends an idle routing session but never a recent or workflow session", async () => {
    const routing = await resolveRouteSid(projectDir, { vendor: "claude" });
    expect(closeRoutingSession(projectDir, routing)).toBe(false);

    const main = createSessionId();
    await emitEvent(projectDir, main, {
      kind: "session.created",
      payload: { workflow: "work", category: "main" },
    });
    const later = Date.now() + 3 * HOUR;
    expect(closeRoutingSession(projectDir, main, later)).toBe(false);
    expect(ended(main)).toEqual([]);

    expect(closeRoutingSession(projectDir, routing, later)).toBe(true);
    expect(ended(routing).map((e) => e.payload)).toEqual([
      { status: "completed", reason: "routing session idle" },
    ]);
    // Idempotent: an ended session is not ended again.
    expect(closeRoutingSession(projectDir, routing, later)).toBe(false);
    expect(readIndex(projectDir).active[ROUTING_CATEGORY]).toBeUndefined();
  });

  it("ends the stale routing slot holder it replaces", async () => {
    const first = await resolveRouteSid(projectDir, {});
    const second = await resolveRouteSid(projectDir, {
      now: Date.now() + 3 * HOUR,
    });
    expect(second).not.toBe(first);
    expect(ended(first)).toHaveLength(1);
    expect(readIndex(projectDir).active[ROUTING_CATEGORY]).toBe(second);
  });

  it("ends a vendor session's routing session once its route memory expires", async () => {
    const load = {
      skill: "oma-image",
      source: "model-description" as const,
      stage: "loaded" as const,
    };
    await recordSkillRoutes(
      { projectDir, vendor: "claude", vendorSid: "vendor-1" },
      [load],
    );
    const first = readIndex(projectDir).active[ROUTING_CATEGORY] as string;
    await recordSkillRoutes(
      {
        projectDir,
        vendor: "claude",
        vendorSid: "vendor-2",
        now: Date.now() + 13 * HOUR,
      },
      [load],
    );
    expect(ended(first)).toHaveLength(1);
    const second = readIndex(projectDir).active[ROUTING_CATEGORY];
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);
  });
});

describe("skill-route run (post_tool)", () => {
  it("records a model-description load and never returns a result", async () => {
    const result = await run(
      {
        kind: "post_tool",
        toolName: "Read",
        toolInput: {
          file_path: join(
            projectDir,
            ".agents/skills/oma-translation/SKILL.md",
          ),
        },
        cwd: projectDir,
      },
      { vendor: "claude", cwd: projectDir, sid: "vendor-9" },
    );
    expect(result).toBeNull();
    const sid = readIndex(projectDir).active[ROUTING_CATEGORY] as string;
    expect(routedEvents(sid).map((e) => e.payload)).toEqual([
      {
        skill: "oma-translation",
        source: "model-description",
        stage: "loaded",
        via: "Read",
      },
    ]);
  });

  it("ignores tools that do not load a skill", async () => {
    await run(
      {
        kind: "post_tool",
        toolName: "Grep",
        toolInput: { pattern: "SKILL.md" },
        cwd: projectDir,
      },
      { vendor: "claude", cwd: projectDir, sid: "vendor-9" },
    );
    expect(readIndex(projectDir).active[ROUTING_CATEGORY]).toBeUndefined();
  });
});

describe("skill.routed payload contract", () => {
  it("requires skill, source, and stage", () => {
    expect(
      validateEventPayload("skill.routed", {
        skill: "oma-design",
        source: "hook-trigger",
        stage: "suggested",
      }),
    ).toEqual([]);
    expect(
      validateEventPayload("skill.routed", { skill: "oma-design" }),
    ).toEqual([
      "payload.source must be a nonblank string",
      "payload.stage must be a nonblank string",
    ]);
  });
});
