import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { parse } from "yaml";
import {
  promptProviders,
  reportProviderSetup,
  saveProviders,
} from "./provider-preferences.js";

const prompts = vi.hoisted(() => ({
  select: vi.fn(),
  text: vi.fn(),
  isCancel: vi.fn((value) => typeof value === "symbol"),
  cancel: vi.fn(),
  log: { info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@clack/prompts", () => prompts);
let root: string;
let config: string;
beforeEach(() => {
  vi.clearAllMocks();
  root = mkdtempSync(join(tmpdir(), "oma-provider-install-"));
  mkdirSync(join(root, ".agents"));
  config = join(root, ".agents", "oma-config.yaml");
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  vi.restoreAllMocks();
});

it("defaults unattended fresh installs to Serena and Agent Memory without external setup", async () => {
  const selection = await promptProviders(root, true, vi.fn());
  expect(selection).toEqual({
    providers: {
      web: "native",
      code_intelligence: "serena",
      semantic_memory: "agentmemory",
    },
  });
  expect(prompts.select).not.toHaveBeenCalled();
  expect(prompts.text).not.toHaveBeenCalled();
  saveProviders(root, selection);
  expect(parse(readFileSync(config, "utf8"))).toEqual(selection);
});

it("offers both alternatives interactively with the existing defaults preselected", async () => {
  prompts.select
    .mockResolvedValueOnce("gortex")
    .mockResolvedValueOnce("honcho")
    .mockResolvedValueOnce("native");
  prompts.text
    .mockResolvedValueOnce("http://127.0.0.1:8000")
    .mockResolvedValueOnce("my-team");
  const selection = await promptProviders(root, false, vi.fn());
  expect(prompts.select.mock.calls.map(([arg]) => arg.initialValue)).toEqual([
    "serena",
    "agentmemory",
    "native",
  ]);
  expect(selection).toEqual({
    providers: {
      web: "native",
      code_intelligence: "gortex",
      semantic_memory: "honcho",
    },
    honcho: {
      base_url: "http://127.0.0.1:8000",
      workspace_id: "my-team",
      recall_mode: "messages",
    },
  });
  saveProviders(root, selection);
  expect(parse(readFileSync(config, "utf8"))).toEqual(selection);
});

it("retains saved selections, Honcho credentials and hybrid recall on reinstall", async () => {
  writeFileSync(
    config,
    "# user settings\nproviders:\n  docs: context7\n  code_intelligence: gortex\n  semantic_memory: honcho\nhoncho:\n  base_url: https://api.honcho.dev\n  workspace_id: saved\n  api_key_vault: existing-key\n  recall_mode: hybrid\ncustom_field: keep\n",
  );
  const selection = await promptProviders(root, true, vi.fn());
  expect(selection.providers).toEqual({
    web: "native",
    code_intelligence: "gortex",
    semantic_memory: "honcho",
  });
  expect(selection.honcho).toMatchObject({
    workspace_id: "saved",
    api_key_vault: "existing-key",
    recall_mode: "hybrid",
  });
  saveProviders(root, selection);
  const saved = readFileSync(config, "utf8");
  expect(saved).toContain("# user settings");
  expect(parse(saved)).toMatchObject({
    providers: { docs: "context7" },
    custom_field: "keep",
  });
});

it("explicit flags override saved choices and preserve inactive Honcho settings", async () => {
  writeFileSync(
    config,
    "providers: {code_intelligence: gortex, semantic_memory: honcho}\nhoncho: {workspace_id: saved}\n",
  );
  const selection = await promptProviders(root, true, vi.fn(), {
    codeIntelligence: "serena",
    semanticMemory: "none",
  });
  saveProviders(root, selection);
  expect(parse(readFileSync(config, "utf8"))).toEqual({
    providers: {
      web: "native",
      code_intelligence: "serena",
      semantic_memory: "none",
    },
    honcho: { workspace_id: "saved" },
  });
});

it("supports unattended Honcho connection flags without prompting for secrets", async () => {
  const selection = await promptProviders(root, true, vi.fn(), {
    semanticMemory: "honcho",
    honchoUrl: "https://honcho.example.com",
    honchoWorkspace: "team",
  });
  expect(selection.honcho).toEqual({
    base_url: "https://honcho.example.com",
    workspace_id: "team",
    recall_mode: "messages",
  });
  expect(prompts.text).not.toHaveBeenCalled();
});

it("rejects malformed config and incompatible connection options before writing", async () => {
  await expect(
    promptProviders(root, true, vi.fn(), { honchoWorkspace: "team" }),
  ).rejects.toThrow("require --semantic-memory honcho");
  await expect(
    promptProviders(root, true, vi.fn(), {
      semanticMemory: "honcho",
      honchoWorkspace: "../bad",
    }),
  ).rejects.toThrow();
  writeFileSync(config, "providers: [bad]\n");
  await expect(promptProviders(root, true, vi.fn())).rejects.toThrow();
  expect(readFileSync(config, "utf8")).toBe("providers: [bad]\n");
});

it("cancellation cleans up the download and exits without saving provider choices", async () => {
  const cleanup = vi.fn();
  prompts.select.mockResolvedValue(Symbol("cancel"));
  vi.spyOn(process, "exit").mockImplementation(() => {
    throw new Error("exit");
  });
  await expect(promptProviders(root, false, cleanup)).rejects.toThrow("exit");
  expect(cleanup).toHaveBeenCalledOnce();
  expect(prompts.text).not.toHaveBeenCalled();
});

it("selects Brave explicitly and preserves its credential references on reinstall", async () => {
  writeFileSync(
    config,
    "brave: {api_key_env: CUSTOM_BRAVE, api_key_vault: team-key}\n",
  );
  const selected = await promptProviders(root, true, vi.fn(), {
    webSearch: "brave",
  });
  saveProviders(root, selected);
  expect(parse(readFileSync(config, "utf8"))).toMatchObject({
    providers: { web: "brave" },
    brave: { api_key_env: "CUSTOM_BRAVE", api_key_vault: "team-key" },
  });
  expect((await promptProviders(root, true, vi.fn())).providers.web).toBe(
    "brave",
  );
});

it("selects Exa explicitly and preserves its credential references on reinstall", async () => {
  writeFileSync(
    config,
    "# existing references\nexa: {api_key_env: CUSTOM_EXA, api_key_vault: team-exa}\nbrave: {api_key_env: CUSTOM_BRAVE, api_key_vault: team-brave}\n",
  );
  const fetcher = vi.spyOn(globalThis, "fetch");
  const selected = await promptProviders(root, true, vi.fn(), {
    webSearch: "exa",
  });
  saveProviders(root, selected);
  const saved = readFileSync(config, "utf8");
  expect(saved).toContain("# existing references");
  expect(parse(saved)).toMatchObject({
    providers: { web: "exa" },
    exa: { api_key_env: "CUSTOM_EXA", api_key_vault: "team-exa" },
    brave: { api_key_env: "CUSTOM_BRAVE", api_key_vault: "team-brave" },
  });
  expect((await promptProviders(root, true, vi.fn())).providers.web).toBe(
    "exa",
  );
  expect(prompts.select).not.toHaveBeenCalled();
  expect(prompts.text).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
});

it("preserves inactive Exa credential references when switching to native search", async () => {
  writeFileSync(
    config,
    "providers: {web: exa}\nexa: {api_key_env: CUSTOM_EXA, api_key_vault: team-exa}\n",
  );
  const selection = await promptProviders(root, true, vi.fn(), {
    webSearch: "native",
  });
  saveProviders(root, selection);
  expect(parse(readFileSync(config, "utf8"))).toMatchObject({
    providers: { web: "native" },
    exa: { api_key_env: "CUSTOM_EXA", api_key_vault: "team-exa" },
  });
});

it.each(["brave", "exa"])(
  "offers Native first with Brave and Exa and selects %s interactively",
  async (provider) => {
    prompts.select.mockReset().mockResolvedValue(provider);
    const selected = await promptProviders(root, false, vi.fn(), {
      codeIntelligence: "serena",
      semanticMemory: "agentmemory",
    });
    expect(prompts.select).toHaveBeenCalledWith(
      expect.objectContaining({
        initialValue: "native",
        options: [
          expect.objectContaining({ value: "native" }),
          expect.objectContaining({ value: "brave" }),
          expect.objectContaining({ value: "exa" }),
        ],
      }),
    );
    expect(selected.providers.web).toBe(provider);
    expect(prompts.text).not.toHaveBeenCalled();
  },
);

it("preselects saved Exa for interactive reinstall", async () => {
  writeFileSync(config, "providers: {web: exa}\n");
  prompts.select.mockReset().mockResolvedValue("exa");
  const selected = await promptProviders(root, false, vi.fn(), {
    codeIntelligence: "serena",
    semanticMemory: "agentmemory",
  });
  expect(prompts.select).toHaveBeenCalledWith(
    expect.objectContaining({ initialValue: "exa" }),
  );
  expect(selected.providers.web).toBe("exa");
});

it("reports Exa key setup without requesting or testing a secret", () => {
  const fetcher = vi.spyOn(globalThis, "fetch");
  reportProviderSetup({
    providers: {
      web: "exa",
      code_intelligence: "serena",
      semantic_memory: "agentmemory",
    },
  });
  expect(prompts.log.info).toHaveBeenCalledWith(
    expect.stringContaining("EXA_API_KEY"),
  );
  expect(prompts.log.info).toHaveBeenCalledWith(
    expect.stringContaining("oma vault store exa-search"),
  );
  expect(prompts.text).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
});
