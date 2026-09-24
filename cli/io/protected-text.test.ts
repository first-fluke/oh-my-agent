import { execFileSync } from "node:child_process";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CODEX_TEXT_BRIDGE } from "./protected-codex.js";
import {
  getProtectedTextCapability,
  protectTextInvocation,
} from "./protected-text.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function fakeCodex(mode = "success") {
  const root = mkdtempSync(join(tmpdir(), "oma-codex-contract-"));
  roots.push(root);
  const trace = join(root, "requests.jsonl");
  const command = join(root, "codex");
  writeFileSync(
    command,
    `#!/usr/bin/env node
const { appendFileSync } = require('node:fs');
const { createInterface } = require('node:readline');
const mode = ${JSON.stringify(mode)};
if (process.argv.includes('--version')) { console.log(mode === 'version' ? 'codex-cli 0.153.0' : 'codex-cli 0.154.0'); process.exit(0); }
const startup = {};
for(let i=2;i<process.argv.length;i++) if(process.argv[i] === '-c') { const flag=process.argv[++i]; const pos=flag.indexOf('='); startup[flag.slice(0,pos)]=JSON.parse(flag.slice(pos+1)); }
if(mode === 'requirements') startup['features.hooks']=true;
function send(value) { process.stdout.write(JSON.stringify(value) + '\\n'); }
createInterface({ input: process.stdin }).on('line', line => {
 const r = JSON.parse(line);
 appendFileSync(${JSON.stringify(trace)}, JSON.stringify(r) + '\\n');
 if (r.method === 'initialize') send({ id:r.id, result:{} });
 if (r.method === 'config/read') send({ id:r.id, result: { config: {
   ...startup,
   model: 'configured-model', model_provider: 'openai', model_reasoning_effort: 'high',
   default_permissions: mode.startsWith('custom') ? 'locked' : undefined,
   cli_auth_credentials_store: mode === 'storage' ? 'keyring' : 'file',
   mcp_servers: { privateKnowledge: { command: 'must-not-run' } }
 } } });
 if (r.method === 'thread/start') send({ id:r.id, result:{
   thread:{id:'thread-1'}, model:r.params.model, modelProvider:r.params.modelProvider,
   approvalPolicy: mode === 'approval' ? 'on-request' : 'never',
   sandbox:{type:'readOnly', networkAccess:false}, runtimeWorkspaceRoots:[],
   activePermissionProfile: mode === 'custom' ? {id:'locked'} : undefined,
   instructionSources: mode === 'instructions' ? ['/hidden/SKILL.md'] : []
 } });
 if (r.method === 'turn/start') {
   send({id:r.id,result:{turn:{id:'turn-1'}}});
   if (mode === 'timeout') return;
   if (mode === 'request') { send({id:'provider-request',method:'item/tool/call',params:{}}); return; }
   send({method:'item/completed',params:{threadId:'thread-1',turnId:'turn-1',item:
     mode === 'tool' ? {type:'commandExecution'} : {type:'agentMessage',text:'NO_ACTION',phase:mode === 'commentary' ? 'commentary' : 'final_answer'} }});
   send({method:'turn/completed',params:{threadId:'thread-1',turn:{id:'turn-1',status:mode === 'failed' ? 'failed' : 'completed'}}});
 }
});
`,
  );
  chmodSync(command, 0o755);
  return { root, command, trace };
}
function runFake(
  fake: ReturnType<typeof fakeCodex>,
  timeoutMs = 10_000,
  watchdogMs = timeoutMs + 2_000,
) {
  return execFileSync(process.execPath, ["--eval", CODEX_TEXT_BRIDGE], {
    cwd: fake.root,
    input: JSON.stringify({
      command: fake.command,
      prompt: "@/hidden/fixture\ntraining evidence",
      timeoutMs,
    }),
    encoding: "utf8",
    timeout: watchdogMs,
    stdio: ["pipe", "pipe", "pipe"],
  });
}
function requests(
  fake: ReturnType<typeof fakeCodex>,
): Array<{ method: string; params: Record<string, unknown> }> {
  return readFileSync(fake.trace, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
}

describe("protected text capability", () => {
  it("exposes implemented profiles and keeps unsupported vendors closed", () => {
    expect(getProtectedTextCapability("codex").supported).toBe(true);
    expect(getProtectedTextCapability("claude").supported).toBe(true);
    for (const vendor of ["qwen", "gemini", "cursor", "unknown"]) {
      expect(getProtectedTextCapability(vendor).supported).toBe(false);
      expect(() =>
        protectTextInvocation(
          { command: vendor, args: [], env: {} },
          vendor,
          "prompt",
        ),
      ).toThrow("unavailable");
    }
  });

  it("keeps native Codex auth and model while removing untrusted dispatch arguments", () => {
    const invocation = protectTextInvocation(
      {
        command: "codex",
        args: [
          "-m",
          "selected-model",
          "--agent",
          "persona",
          "--add-dir",
          "/hidden",
        ],
        env: {
          CODEX_HOME: "/configured-login",
          NODE_OPTIONS: "--require /hook.js",
        },
      },
      "codex",
      "prompt",
    );
    expect(invocation.env.CODEX_HOME).toBe("/configured-login");
    expect(invocation.env.NODE_OPTIONS).toBeUndefined();
    expect(invocation.args.join(" ")).not.toContain("/configured-login");
    expect(JSON.parse(invocation.input ?? "")).toMatchObject({
      command: "codex",
      model: "selected-model",
      prompt: "prompt",
    });
    expect(invocation.input).not.toContain("persona");
    expect(invocation.input).not.toContain("/hidden");
  });

  it("sends literal text through a fresh, empty-capability Codex thread", () => {
    const fake = fakeCodex();
    expect(runFake(fake)).toBe("NO_ACTION");
    const entries = requests(fake);
    const start = entries.find((r) => r.method === "thread/start")?.params;
    expect(start).toMatchObject({
      model: "configured-model",
      modelProvider: "openai",
      ephemeral: true,
      environments: [],
      dynamicTools: [],
      selectedCapabilityRoots: [],
      runtimeWorkspaceRoots: [],
      allowProviderModelFallback: false,
    });
    expect(start?.config).toMatchObject({
      mcp_servers: { privateKnowledge: { enabled: false } },
      "features.hooks": false,
      "features.apps": false,
      "skills.include_instructions": false,
      web_search: "disabled",
    });
    expect(
      entries.find((r) => r.method === "turn/start")?.params,
    ).toMatchObject({
      effort: "high",
      environments: [],
      input: [
        {
          type: "text",
          text: "@/hidden/fixture\ntraining evidence",
          text_elements: [],
        },
      ],
    });
  });

  it.each(["instructions", "approval", "requirements", "storage"])(
    "rejects invalid %s provenance before sending the prompt",
    (mode) => {
      const fake = fakeCodex(mode);
      expect(() => runFake(fake)).toThrow();
      expect(requests(fake).some((r) => r.method === "turn/start")).toBe(false);
      expect(readFileSync(fake.trace, "utf8")).not.toContain(
        "training evidence",
      );
    },
  );

  it.each(["request", "tool", "failed", "commentary"])(
    "does not accept a successful-looking answer after %s",
    (mode) => {
      expect(() => runFake(fakeCodex(mode))).toThrow();
    },
  );

  it("preserves a configured custom permission profile", () => {
    const fake = fakeCodex("custom");
    expect(runFake(fake)).toBe("NO_ACTION");
    const start = requests(fake).find(
      (r) => r.method === "thread/start",
    )?.params;
    expect(start?.permissions).toBe("locked");
    expect(start).not.toHaveProperty("sandbox");
    const wrong = fakeCodex("custom-wrong");
    expect(() => runFake(wrong)).toThrow();
    expect(requests(wrong).some((r) => r.method === "turn/start")).toBe(false);
  });

  it("rejects an unverified CLI version without starting app-server", () => {
    const fake = fakeCodex("version");
    expect(() => runFake(fake)).toThrow();
    expect(() => readFileSync(fake.trace)).toThrow();
  });

  it("terminates a stalled server within the request budget", () => {
    // Assert the bridge's own deadline fired. A wall-clock assertion also
    // measures process startup and scheduler delays outside this contract.
    expect(() => runFake(fakeCodex("timeout"), 200, 10_000)).toThrow(
      "Protected Codex dispatch failed: timeout",
    );
  });
});
