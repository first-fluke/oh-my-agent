import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { migrateUnifySkillConfigs } from "./022-unify-skill-configs.js";

const OMA_CONFIG = "language: en\nmodel_preset: claude\n";

/** The video config exactly as shipped — the "user changed nothing" baseline. */
const PRISTINE_VIDEO = `default_output_dir: .agents/results/videos
default_mode: shorts
default_aspect: auto
default_locale: en
default_captions: tiktok
default_visual: auto
default_voice: none
default_music: none
default_compositor: remotion
default_timeout_sec: 600

providers:
  script:
    order: [agent-script]
  voice:
    order: [oma-voice]
  visual:
    order: [oma-image, pexels, pixelle]
  caption:
    order: [oma-captions]
  capture:
    order: [playwright-web, cap]
  music:
    order: [strudel]
  compositor:
    order: [remotion, mpt]
  pexels:
    enabled: false
    envVar: PEXELS_API_KEY
  pixelle:
    enabled: false
    envVar: RUNNINGHUB_API_KEY

cost:
  guardrail_usd: 0.20

limits:
  max_duration_sec: 180
  max_scenes: 40

naming:
  single_folder_pattern: "{timestamp}-{shortid}-{mode}"
`;

const PRISTINE_VOICE = `notification_profile: null
asset_profile: null
output_dir: .agents/results/voice
auto_notify_after_sec: 60
max_tts_chars: 5000
max_stt_minutes: 30
`;

describe("migration 022: unify skill configs", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(os.tmpdir(), "oma-022-"));
    mkdirSync(join(tmp, ".agents"), { recursive: true });
    writeFileSync(join(tmp, ".agents", "oma-config.yaml"), OMA_CONFIG, "utf8");
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  function writeSkillConfig(relative: string, content: string): string {
    const full = join(tmp, ".agents", "skills", ...relative.split("/"));
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, content, "utf8");
    return full;
  }

  function readOmaConfig(): Record<string, unknown> {
    const raw = readFileSync(join(tmp, ".agents", "oma-config.yaml"), "utf8");
    return parseYaml(raw) as Record<string, unknown>;
  }

  it("writes nothing on a fresh install where no skill config was edited", () => {
    writeSkillConfig("oma-video/config/video-config.yaml", PRISTINE_VIDEO);
    const voice = writeSkillConfig(
      "oma-voice/config/voice-config.yaml",
      PRISTINE_VOICE,
    );

    const actions = migrateUnifySkillConfigs.up(tmp);

    const config = readOmaConfig();
    expect(config.video).toBeUndefined();
    expect(config.voice).toBeUndefined();
    // Agent-read configs are the shipped defaults their SKILL.md falls back to,
    // so an unmodified one stays put; the video CLI keeps its defaults in TS.
    expect(existsSync(voice)).toBe(true);
    expect(
      existsSync(
        join(tmp, ".agents/skills/oma-video/config/video-config.yaml"),
      ),
    ).toBe(false);
    expect(actions).toContain(
      "removed unmodified .agents/skills/oma-video/config/video-config.yaml",
    );
  });

  it("migrates only the keys the user changed", () => {
    writeSkillConfig(
      "oma-video/config/video-config.yaml",
      PRISTINE_VIDEO.replace("default_mode: shorts", "default_mode: explainer")
        .replace("max_scenes: 40", "max_scenes: 12")
        .replace("guardrail_usd: 0.20", "guardrail_usd: 1.50"),
    );

    migrateUnifySkillConfigs.up(tmp);

    const video = readOmaConfig().video as Record<string, unknown>;
    expect(video).toEqual({
      default_mode: "explainer",
      cost: { guardrail_usd: 1.5 },
      limits: { max_scenes: 12 },
    });
    // Everything untouched stays out, so upstream default changes keep landing.
    expect(video.default_aspect).toBeUndefined();
    expect(video.providers).toBeUndefined();
  });

  it("keeps a modified legacy file for the deprecation window", () => {
    const path = writeSkillConfig(
      "oma-voice/config/voice-config.yaml",
      PRISTINE_VOICE.replace(
        "notification_profile: null",
        "notification_profile: narrator",
      ),
    );

    migrateUnifySkillConfigs.up(tmp);

    expect(existsSync(path)).toBe(true);
    expect(readOmaConfig().voice).toEqual({ notification_profile: "narrator" });
  });

  it("drops keys that are not preferences", () => {
    writeSkillConfig(
      "oma-video/config/video-config.yaml",
      `${PRISTINE_VIDEO.replace(
        "  pexels:\n    enabled: false",
        "  pexels:\n    enabled: true",
      )}language: ko\n`,
    );
    writeSkillConfig(
      "oma-hwp/config/hwp-config.yaml",
      `format: markdown
version:
  channel: latest
  pinned: "4.1.0"
output:
  default_location: cwd
supported_formats:
  - hwp
`,
    );

    migrateUnifySkillConfigs.up(tmp);

    const config = readOmaConfig();
    // pexels.enabled is recomputed from the environment; language is a root key.
    expect(config.video).toBeUndefined();
    expect(config.hwp).toEqual({ output: { default_location: "cwd" } });
  });

  it("renames provider envVar to the oma-config spelling", () => {
    writeSkillConfig(
      "oma-video/config/video-config.yaml",
      PRISTINE_VIDEO.replace("envVar: PEXELS_API_KEY", "envVar: MY_PEXELS_KEY"),
    );

    migrateUnifySkillConfigs.up(tmp);

    expect(readOmaConfig().video).toEqual({
      providers: { pexels: { env_var: "MY_PEXELS_KEY" } },
    });
  });

  it("flattens scholar api.base_url and ignores protocol shape", () => {
    writeSkillConfig(
      "oma-scholar/config/scholar-config.yaml",
      `api:
  base_url: https://knows.internal
  endpoints:
    search: /api/proxy/search
  timeout_seconds: 30
lint:
  fail_on_warning: true
`,
    );

    migrateUnifySkillConfigs.up(tmp);

    expect(readOmaConfig().scholar).toEqual({
      base_url: "https://knows.internal",
    });
  });

  it("maps a non-claude active_vendor to default_cli", () => {
    writeSkillConfig(
      "oma-orchestrator/config/cli-config.yaml",
      "active_vendor: codex\nvendors:\n  codex:\n    command: codex\n",
    );

    const actions = migrateUnifySkillConfigs.up(tmp);

    expect(readOmaConfig().default_cli).toBe("codex");
    // The vendors: block is a shipped capability registry, not a preference.
    expect(
      existsSync(
        join(tmp, ".agents/skills/oma-orchestrator/config/cli-config.yaml"),
      ),
    ).toBe(true);
    expect(actions.some((a) => a.includes("default_cli: codex"))).toBe(true);
  });

  it("leaves a default active_vendor alone", () => {
    writeSkillConfig(
      "oma-orchestrator/config/cli-config.yaml",
      "active_vendor: claude\nvendors: {}\n",
    );

    migrateUnifySkillConfigs.up(tmp);

    expect(readOmaConfig().default_cli).toBeUndefined();
  });

  it("folds .agents/config/models.yaml into the inline models block", () => {
    mkdirSync(join(tmp, ".agents", "config"), { recursive: true });
    writeFileSync(
      join(tmp, ".agents", "config", "models.yaml"),
      `models:
  my-fast:
    cli: antigravity
    cli_model: "Gemini 3.6 Flash (Medium)"
`,
      "utf8",
    );

    migrateUnifySkillConfigs.up(tmp);

    expect(readOmaConfig().models).toEqual({
      "my-fast": {
        cli: "antigravity",
        cli_model: "Gemini 3.6 Flash (Medium)",
      },
    });
    // Kept for the deprecation window — the registry still reads it and it wins.
    expect(existsSync(join(tmp, ".agents", "config", "models.yaml"))).toBe(
      true,
    );
  });

  it("never rewrites a section the user already has", () => {
    writeSkillConfig(
      "oma-video/config/video-config.yaml",
      PRISTINE_VIDEO.replace("default_mode: shorts", "default_mode: explainer"),
    );
    writeFileSync(
      join(tmp, ".agents", "oma-config.yaml"),
      `${OMA_CONFIG}video:\n  default_mode: demo\n`,
      "utf8",
    );

    const actions = migrateUnifySkillConfigs.up(tmp);

    expect(
      (readOmaConfig().video as Record<string, unknown>).default_mode,
    ).toBe("demo");
    expect(
      actions.some((a) =>
        a.includes("oma-config already has a `video:` section"),
      ),
    ).toBe(true);
  });

  it("is idempotent across repeated runs", () => {
    writeSkillConfig(
      "oma-video/config/video-config.yaml",
      PRISTINE_VIDEO.replace("default_mode: shorts", "default_mode: explainer"),
    );

    const first = migrateUnifySkillConfigs.up(tmp);
    const afterFirst = readFileSync(
      join(tmp, ".agents", "oma-config.yaml"),
      "utf8",
    );

    const second = migrateUnifySkillConfigs.up(tmp);
    const afterSecond = readFileSync(
      join(tmp, ".agents", "oma-config.yaml"),
      "utf8",
    );

    expect(first.length).toBeGreaterThan(0);
    expect(afterSecond).toBe(afterFirst);
    expect(second.every((a) => a.startsWith("kept "))).toBe(true);
  });

  it("does nothing when no legacy config exists", () => {
    expect(migrateUnifySkillConfigs.up(tmp)).toEqual([]);
    expect(readFileSync(join(tmp, ".agents", "oma-config.yaml"), "utf8")).toBe(
      OMA_CONFIG,
    );
  });

  it("keeps the legacy file when oma-config.yaml is missing", () => {
    rmSync(join(tmp, ".agents", "oma-config.yaml"));
    const path = writeSkillConfig(
      "oma-voice/config/voice-config.yaml",
      PRISTINE_VOICE.replace("max_tts_chars: 5000", "max_tts_chars: 9000"),
    );

    const actions = migrateUnifySkillConfigs.up(tmp);

    expect(existsSync(path)).toBe(true);
    expect(actions.some((a) => a.includes("oma-config.yaml is missing"))).toBe(
      true,
    );
  });
});
