import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { stageCodexConfigHome } from "./protected-codex-home.js";
import { prepareProtectedTextWorkspace } from "./protected-text.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function nativeHome(config = 'model = "selected-model"\n') {
  const root = mkdtempSync(join(tmpdir(), "oma-native-auth-fixture-"));
  roots.push(root);
  writeFileSync(join(root, "config.toml"), config);
  writeFileSync(join(root, "auth.json"), "synthetic native login");
  return root;
}

describe("protected Codex native config home", () => {
  it.each([undefined, "file"])(
    "references native config and %s file storage in a private per-call home",
    (store) => {
      const source = nativeHome(
        'model = "selected-model"\nmodel_provider = "native-provider"\n' +
          (store ? `cli_auth_credentials_store = "${store}"\n` : ""),
      );
      const prepared = stageCodexConfigHome({ CODEX_HOME: source });
      const staged = prepared.env.CODEX_HOME as string;
      roots.push(staged);
      expect(staged).not.toBe(source);
      expect(statSync(staged).mode & 0o777).toBe(0o700);
      for (const file of ["config.toml", "auth.json"]) {
        expect(lstatSync(join(staged, file)).isSymbolicLink()).toBe(true);
        expect(readlinkSync(join(staged, file))).toBe(join(source, file));
      }
      // Synthetic refresh follows the native reference, as ordinary CLI auth does.
      writeFileSync(join(staged, "auth.json"), "synthetic refreshed login");
      prepared.cleanup();
      expect(existsSync(staged)).toBe(false);
      expect(readFileSync(join(source, "auth.json"), "utf8")).toBe(
        "synthetic refreshed login",
      );
      expect(readFileSync(join(source, "config.toml"), "utf8")).toContain(
        'model_provider = "native-provider"',
      );
    },
  );

  it.each(["keyring", "auto", "ephemeral"])(
    "rejects %s storage without changing its canonical home",
    (store) => {
      const source = nativeHome(`cli_auth_credentials_store = "${store}"`);
      expect(() => stageCodexConfigHome({ CODEX_HOME: source })).toThrow(
        "requires native file credential storage",
      );
      expect(readFileSync(join(source, "auth.json"), "utf8")).toBe(
        "synthetic native login",
      );
    },
  );

  it("rejects malformed config and absent login without a billing fallback", () => {
    const source = nativeHome("[invalid");
    expect(() => stageCodexConfigHome({ CODEX_HOME: source })).toThrow(
      "valid native config.toml",
    );
    writeFileSync(join(source, "config.toml"), "");
    rmSync(join(source, "auth.json"));
    expect(() => stageCodexConfigHome({ CODEX_HOME: source })).toThrow(
      "no API-key or vendor fallback",
    );
  });

  it("stages only the Codex profile and keeps the prompt and model request intact", () => {
    const source = nativeHome();
    const invocation = {
      command: "node",
      args: ["constant bridge"],
      env: { CODEX_HOME: source },
      protectedProfile: "codex-app-server-text-v1",
      input: '{"model":"selected-model","prompt":"literal text"}',
    };
    const prepared = prepareProtectedTextWorkspace(invocation);
    roots.push(prepared.invocation.env.CODEX_HOME as string);
    expect(prepared.invocation.input).toBe(invocation.input);
    expect(prepared.invocation.env.CODEX_HOME).not.toBe(source);
    prepared.cleanup();
    const claude = { ...invocation, protectedProfile: "claude-text-v1" };
    expect(prepareProtectedTextWorkspace(claude).invocation).toBe(claude);
  });
});
