import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  inspectMarketplacePackage,
  parseInstallUrl,
  recordMarketplaceLink,
  verifyInstallPage,
  verifyMarketplaceLink,
} from "./marketplace.mjs";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "oma-marketplace-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  function put(path, content) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  put(
    ".cursor-plugin/plugin.json",
    JSON.stringify({
      name: "oma",
      displayName: "oh-my-agent",
      version: "1.0.0",
      description: "OMA skills",
      author: { name: "First Fluke", email: "our.first.fluke@gmail.com" },
      repository: "https://github.com/first-fluke/oh-my-agent",
      homepage: "https://firstfluke.com/oh-my-agent",
      logo: "logo.png",
      skills: ["skills", ".cursor-plugin/skills"],
      agents: "agents",
      rules: "rules",
      mcpServers: "mcp.json",
    }),
  );
  for (const name of ["oma-first", "oma-bootstrap"])
    put(
      `${name === "oma-bootstrap" ? ".cursor-plugin/skills" : "skills"}/${name}/SKILL.md`,
      `---\nname: ${name}\ndescription: >\n  Use this skill\n  for its task.\n---\n# Instructions\n`,
    );
  put("agents/qa.md", "# QA\n");
  put("rules/project.md", "# Rules\n");
  put("logo.png", "logo");
  put("mcp.json", JSON.stringify({ mcpServers: {} }));
  return { root, put };
}

const page = (name = "oh-my-agent", extra = "", pluginId = "123") =>
  `<html><h1>${name} for Grok Bot</h1><p>Published by First Fluke on the Cursor Marketplace. By clicking “Add to Grok Bot”, you accept the terms.</p><a href="grokbot://app/v1/plugin/add?id=${pluginId}">Add to Grok Bot</a>${extra}</html>`;
const names = ["oma", "oh-my-agent", "Oh My Agent"];

test("preflight reports the complete package and public publisher application fields", (t) => {
  const { root } = fixture(t);
  const result = inspectMarketplacePackage(root);
  assert.deepEqual(result.package.skills, ["oma-bootstrap", "oma-first"]);
  assert.equal(result.package.agents, 1);
  assert.equal(result.submission.organizationHandle, "first-fluke");
  assert.equal(result.submission.contactEmail, "our.first.fluke@gmail.com");
});

test("missing assets and mismatched skill metadata fail preflight", (t) => {
  const { root, put } = fixture(t);
  rmSync(join(root, "logo.png"));
  assert.throws(() => inspectMarketplacePackage(root), /Missing plugin asset/);
  put("logo.png", "logo");
  put(
    "skills/oma-first/SKILL.md",
    "---\nname: other\ndescription: wrong directory\n---\n",
  );
  assert.throws(() => inspectMarketplacePackage(root), /Invalid skill name/);
});

test("native installation verifier rejects wrong identity, hidden identities and incomplete pages", () => {
  assert.throws(
    () =>
      verifyInstallPage(
        page("pstack", "<script>oh-my-agent</script>"),
        names,
        "123",
      ),
    /does not identify/,
  );
  assert.throws(
    () =>
      verifyInstallPage(
        "<script><h1>oh-my-agent for Grok Bot</h1></script><p>Cursor Marketplace Add to Grok Bot</p>",
        names,
        "123",
      ),
    /does not identify/,
  );
  assert.throws(
    () =>
      verifyInstallPage(
        "<h1>oh-my-agent for Grok Bot</h1><p>Published by First Fluke on the Cursor Marketplace.</p>",
        names,
        "123",
      ),
    /missing/,
  );
  assert.throws(
    () =>
      verifyInstallPage(
        page().replace("Published by First Fluke", "Published by Someone Else"),
        names,
        "123",
      ),
    /publisher/,
  );
  assert.throws(
    () =>
      verifyInstallPage(page("oh-my-agent", "Plugin Not Found"), names, "123"),
    /missing/,
  );
  assert.equal(
    verifyInstallPage(page(), names, "123"),
    "oh-my-agent for Grok Bot",
  );
});

test("native action must be an actual matching Grok Bot deep-link anchor", () => {
  const action =
    '<a href="grokbot://app/v1/plugin/add?id=123">Add to Grok Bot</a>';
  assert.throws(
    () => verifyInstallPage(page().replace(action, ""), names, "123"),
    /missing/,
  );
  assert.throws(
    () =>
      verifyInstallPage(
        page().replace(action, "<button>Add to Grok Bot</button>"),
        names,
        "123",
      ),
    /missing/,
  );
  assert.throws(
    () =>
      verifyInstallPage(
        page().replace('href="grokbot:', 'data-href="grokbot:'),
        names,
        "123",
      ),
    /missing/,
  );
  assert.throws(
    () => verifyInstallPage(page("oh-my-agent", "", "999"), names, "123"),
    /missing/,
  );
  assert.throws(
    () =>
      verifyInstallPage(
        page().replace('id=123"', 'id=123&redirect=evil"'),
        names,
        "123",
      ),
    /missing/,
  );
  assert.equal(
    verifyInstallPage(page(), names, "123"),
    "oh-my-agent for Grok Bot",
  );
});

test("only official numeric native install URLs are accepted", () => {
  assert.deepEqual(parseInstallUrl("https://x.ai/bot/plugin/123/"), {
    url: "https://x.ai/bot/plugin/123",
    pluginId: "123",
  });
  for (const value of [
    "https://x.ai/bot/plugin/oma",
    "https://x.ai.evil.test/bot/plugin/123",
    "http://x.ai/bot/plugin/123",
    "https://x.ai/bot/plugin/123?redirect=evil",
    "https://a@x.ai/bot/plugin/123",
  ])
    assert.throws(() => parseInstallUrl(value));
});

test("HTTP success is insufficient and redirected plugin identity is rejected", async () => {
  await assert.rejects(
    verifyMarketplaceLink(
      "https://x.ai/bot/plugin/123",
      names,
      async () => new Response("Plugin Not Found", { status: 200 }),
    ),
    /does not identify/,
  );
  await assert.rejects(
    verifyMarketplaceLink("https://x.ai/bot/plugin/123", names, async () => ({
      ok: true,
      url: "https://x.ai/bot/plugin/999",
      text: async () => page(),
    })),
    /different plugin/,
  );
});

test("failed live verification never changes the website installation config", async (t) => {
  const { root, put } = fixture(t);
  const configPath = join(root, "marketplace.json");
  const original = '{"pluginId":null,"verifiedAt":null}\n';
  put("marketplace.json", original);
  await assert.rejects(
    recordMarketplaceLink("https://x.ai/bot/plugin/123", names, {
      configPath,
      fetchImpl: async () => new Response(page("pstack")),
    }),
    /does not identify/,
  );
  assert.equal(readFileSync(configPath, "utf8"), original);
});

test("recording activates only the exact ID validated on the native install page", async (t) => {
  const { root } = fixture(t);
  const configPath = join(root, "marketplace.json");
  const result = await recordMarketplaceLink(
    "https://x.ai/bot/plugin/123",
    names,
    { configPath, fetchImpl: async () => new Response(page()) },
  );
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  assert.equal(config.pluginId, "123");
  assert.equal(config.verifiedAt, result.recordedAt);
  assert.ok(Number.isFinite(Date.parse(config.verifiedAt)));
});
