import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { OMA_VERSION } from "./runtime.mjs";
import {
  createWorkspaceSetup,
  downloadProjectAssets,
  findWorkspace,
  projectArchiveFilter,
} from "./setup.mjs";
import { fakeAgent } from "./test-support.mjs";

async function project(t) {
  const root = await mkdtemp(join(tmpdir(), "oma-dsh-project-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

async function seed(directory) {
  await mkdir(join(directory, "skills", "oma-qa"), { recursive: true });
  await writeFile(
    join(directory, "skills", "oma-qa", "SKILL.md"),
    "---\nname: oma-qa\ndescription: Review code.\n---\nReview the project.\n",
  );
  await writeFile(
    join(directory, "skills", "_version.json"),
    JSON.stringify({ version: OMA_VERSION }),
  );
}

function setup(t, config = {}, prepareProject = seed) {
  const instance = createWorkspaceSetup(config, { prepareProject });
  t.after(() => instance.dispose());
  return instance;
}

test("first use initializes the physical git root with skills and a complete local config", async (t) => {
  const root = await project(t);
  const nested = join(root, "src", "nested");
  await mkdir(join(root, ".git"));
  await mkdir(nested, { recursive: true });
  assert.equal(await setup(t).ensure(fakeAgent(nested)), true);
  const config = await readFile(
    join(root, ".agents", "oma-config.yaml"),
    "utf8",
  );
  assert.match(config, /vendors: \[\]/);
  assert.match(config, /code_intelligence_guard: off/);
  assert.match(
    await readFile(
      join(root, ".agents", "skills", "oma-qa", "SKILL.md"),
      "utf8",
    ),
    /Review the project/,
  );
  await assert.rejects(access(join(nested, ".agents")), { code: "ENOENT" });
  await assert.rejects(access(join(root, ".oma-dsh-setup.lock")), {
    code: "ENOENT",
  });
});

test("existing YAML and CUE projects remain byte-identical without fetching assets", async (t) => {
  for (const marker of ["oma-config.yaml", "oma-config.cue"]) {
    const root = await project(t);
    await mkdir(join(root, ".agents"));
    const text = "user-owned: settings\n";
    await writeFile(join(root, ".agents", marker), text);
    const instance = setup(t, {}, () =>
      assert.fail("existing projects need no download"),
    );
    assert.equal(await instance.ensure(fakeAgent(root)), true);
    assert.equal(await readFile(join(root, ".agents", marker), "utf8"), text);
    await assert.rejects(access(join(root, ".agents", "skills")), {
      code: "ENOENT",
    });
  }
});

test("initialization preserves existing custom skill files in an unmarked .agents directory", async (t) => {
  const root = await project(t);
  await mkdir(join(root, ".agents", "skills", "oma-qa"), { recursive: true });
  const skill = join(root, ".agents", "skills", "oma-qa", "SKILL.md");
  await writeFile(skill, "custom review instructions");
  await setup(t).ensure(fakeAgent(root));
  assert.equal(await readFile(skill, "utf8"), "custom review instructions");
  await access(join(root, ".agents", "oma-config.yaml"));
});

test("nested repositories do not inherit or modify an outer project's OMA setup", async (t) => {
  const root = await project(t);
  await mkdir(join(root, ".agents"));
  await writeFile(join(root, ".agents", "oma-config.yaml"), "outer project\n");
  const inner = join(root, "inner");
  await mkdir(inner);
  await writeFile(join(inner, ".git"), "gitdir: elsewhere\n");
  await setup(t).ensure(fakeAgent(inner));
  await access(join(inner, ".agents", "oma-config.yaml"));
  assert.equal(
    await readFile(join(root, ".agents", "oma-config.yaml"), "utf8"),
    "outer project\n",
  );
});

test("physical aliases and independent plugin instances share one project initialization", async (t) => {
  const root = await project(t);
  const aliases = await project(t);
  const alias = join(aliases, "linked");
  await symlink(root, alias, process.platform === "win32" ? "junction" : "dir");
  let calls = 0;
  const prepare = async (directory) => {
    calls += 1;
    await delay(100);
    await seed(directory);
  };
  const first = setup(t, {}, prepare);
  const second = setup(t, {}, prepare);
  assert.deepEqual(
    await Promise.all([
      first.ensure(fakeAgent(root)),
      first.ensure(fakeAgent(alias)),
      second.ensure(fakeAgent(root)),
    ]),
    [true, true, true],
  );
  assert.equal(calls, 1);
});

test("canceling one agent's wait leaves shared setup available to another agent", async (t) => {
  const root = await project(t);
  const abort = new AbortController();
  let started;
  const ready = new Promise((resolve) => {
    started = resolve;
  });
  let finish;
  const gate = new Promise((resolve) => {
    finish = resolve;
  });
  const instance = setup(t, {}, async (directory) => {
    started();
    await gate;
    await seed(directory);
  });
  const canceled = instance.ensure(fakeAgent(root), abort.signal);
  const rejection = assert.rejects(canceled, /agent canceled/);
  await ready;
  const other = instance.ensure(fakeAgent(root));
  abort.abort(new Error("agent canceled"));
  finish();
  await rejection;
  assert.equal(await other, true);
});

test("plugin disposal aborts setup and leaves no active marker or lock", async (t) => {
  const root = await project(t);
  let started;
  const ready = new Promise((resolve) => {
    started = resolve;
  });
  const instance = setup(t, {}, async (_, signal) => {
    started();
    await delay(10000, undefined, { signal });
  });
  const pending = instance.ensure(fakeAgent(root));
  const rejection = assert.rejects(pending, /abort|cancel/i);
  await ready;
  await instance.dispose();
  await rejection;
  await assert.rejects(access(join(root, ".agents", "oma-config.yaml")), {
    code: "ENOENT",
  });
  await assert.rejects(access(join(root, ".oma-dsh-setup.lock")), {
    code: "ENOENT",
  });
});

test("failed setup is reported consistently and manual initialization recovers without reload", async (t) => {
  const root = await project(t);
  let calls = 0;
  const instance = setup(t, {}, async () => {
    calls += 1;
    throw new Error("download unavailable");
  });
  await assert.rejects(
    instance.ensure(fakeAgent(root)),
    /download unavailable/,
  );
  await assert.rejects(
    instance.ensure(fakeAgent(root)),
    /download unavailable/,
  );
  assert.equal(calls, 1);
  await assert.rejects(access(join(root, ".agents")), { code: "ENOENT" });
  await mkdir(join(root, ".agents"));
  await writeFile(join(root, ".agents", "oma-config.yaml"), "language: en\n");
  assert.equal(await instance.ensure(fakeAgent(root)), true);
});

test("setup timeout drains preparation before releasing the project lock", async (t) => {
  const root = await project(t);
  const instance = setup(t, { setupTimeoutMs: 100 }, (_, signal) =>
    delay(10000, undefined, { signal }),
  );
  await assert.rejects(
    instance.ensure(fakeAgent(root)),
    /timed out after 100 ms/,
  );
  await assert.rejects(access(join(root, ".oma-dsh-setup.lock")), {
    code: "ENOENT",
  });
});

test("automatic setup can be disabled and invalid session directories never trigger setup", async (t) => {
  const root = await project(t);
  const instance = setup(t, { autoSetup: false }, () =>
    assert.fail("setup disabled"),
  );
  assert.equal(await instance.ensure(fakeAgent(root)), false);
  assert.equal(await instance.ensure(fakeAgent(undefined)), false);
  assert.equal(await instance.ensure(fakeAgent("relative")), false);
  assert.equal(
    await findWorkspace({ session: { header: { cwd: root } } }),
    undefined,
  );
  await assert.rejects(access(join(root, ".agents")), { code: "ENOENT" });
  assert.throws(() => createWorkspaceSetup({ autoSetup: "yes" }), /autoSetup/);
  assert.throws(
    () => createWorkspaceSetup({ setupTimeoutMs: 0 }),
    /setupTimeoutMs/,
  );
});

test("uninitialized symlinked .agents directories are not written through", async (t) => {
  const root = await project(t);
  const external = await project(t);
  await symlink(
    external,
    join(root, ".agents"),
    process.platform === "win32" ? "junction" : "dir",
  );
  await assert.rejects(setup(t).ensure(fakeAgent(root)), /project-local/);
  await assert.rejects(access(join(external, "oma-config.yaml")), {
    code: "ENOENT",
  });
});

test("invalid existing config markers are preserved and never report readiness", async (t) => {
  for (const kind of ["directory", "broken-symlink"]) {
    const root = await project(t);
    await mkdir(join(root, ".agents"));
    const marker = join(root, ".agents", "oma-config.yaml");
    if (kind === "directory") await mkdir(marker);
    else await symlink(join(root, "missing-config"), marker);
    await assert.rejects(
      setup(t, {}, () =>
        assert.fail("marker conflicts fail before downloading"),
      ).ensure(fakeAgent(root)),
      /not a usable file.*preserved/,
    );
    assert.equal((await findWorkspace(fakeAgent(root))).initialized, false);
  }
});

test("a competing instance waits while another owner publishes and releases its lock", async (t) => {
  const root = await project(t);
  const lock = join(root, ".oma-dsh-setup.lock");
  await mkdir(lock);
  const instance = setup(t);
  const pending = instance.ensure(fakeAgent(root));
  await delay(20);
  await writeFile(
    join(lock, "owner.json"),
    JSON.stringify({ pid: process.pid, token: "other-instance" }),
  );
  await delay(80);
  await rm(lock, { recursive: true });
  assert.equal(await pending, true);
});

test("archive filter rejects escaping paths, links, and excessive expansion", () => {
  const filter = projectArchiveFilter();
  assert.equal(
    filter(".agents/skills/oma-qa/SKILL.md", { type: "File", size: 100 }),
    true,
  );
  assert.equal(
    filter(".agents/state/secret", { type: "File", size: 100 }),
    false,
  );
  assert.equal(
    filter(".agents/oma-config.yaml", { type: "File", size: 100 }),
    false,
  );
  assert.throws(
    () => filter(".agents/skills/../../escape", { type: "File" }),
    /Unsafe path/,
  );
  assert.throws(
    () => filter(".agents/skills/link", { type: "SymbolicLink" }),
    /Links/,
  );
  assert.throws(
    () =>
      filter(".agents/skills/huge", { type: "File", size: 17 * 1024 * 1024 }),
    /extraction limit/,
  );
});

test("release checksum is checked before extraction and mismatched versions are rejected", async (t) => {
  const root = await project(t);
  const assets = join(root, "assets");
  await mkdir(assets);
  const bytes = Buffer.from("fixture archive");
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const requests = [];
  const fetch = async (url) => {
    requests.push(url);
    return new Response(
      url.endsWith(".sha256") ? `${checksum}  agent-skills.tar.gz\n` : bytes,
    );
  };
  let extracted = 0;
  await downloadProjectAssets(assets, new AbortController().signal, {
    fetch,
    extract: async () => {
      extracted += 1;
      await seed(assets);
    },
  });
  assert.equal(extracted, 1);
  assert.equal(requests.length, 2);
  assert.match(requests[0], /cli-v20\.4\.1\/agent-skills\.tar\.gz\.sha256$/);
  await rm(join(root, "agent-skills.tar.gz"));
  await assert.rejects(
    downloadProjectAssets(assets, new AbortController().signal, {
      fetch: async (url) =>
        new Response(url.endsWith(".sha256") ? "0".repeat(64) : bytes),
      extract: () => assert.fail("untrusted archive must not extract"),
    }),
    /checksum mismatch/,
  );
  await assert.rejects(
    downloadProjectAssets(assets, new AbortController().signal, {
      fetch,
      extract: async () => {
        await writeFile(
          join(assets, "skills", "_version.json"),
          '{"version":"0.0.0"}',
        );
      },
    }),
    /version does not match/,
  );
});
