import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const skillsRoot = fileURLToPath(new URL("../../../skills/", import.meta.url));

// Execute the shipped Python helpers against isolated Git repositories.
// Git hooks are disabled inside the fixtures; no app checks or installs run.
const regressionScript = String.raw`import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SKILLS = Path(sys.argv[1])

def load(name, path):
    spec = importlib.util.spec_from_file_location(name, SKILLS / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

affected = load("affected_checks", "oma-dev-workflow/resources/affected-checks.py")
hotspots = load("hotspots", "oma-refactor/resources/hotspots.py")

def git(repo, *args):
    return subprocess.run(["git", "-C", str(repo), "-c", "core.hooksPath=/dev/null",
                           "-c", "user.name=OMA regression", "-c", "user.email=oma@example.invalid",
                           *args], check=True, capture_output=True, text=True).stdout

class RecipeRegression(unittest.TestCase):
    def test_shared_unknown_and_app_paths(self):
        self.assertEqual(affected.affected_apps(["apps/api/routes.ts"]), ["api"])
        self.assertEqual(affected.affected_apps(["packages/shared/types.ts"]), list(affected.APPS))
        self.assertEqual(affected.affected_apps(["mise.toml"]), list(affected.APPS))
        self.assertEqual(affected.affected_apps(["apps/web/space\nand tab\t.ts"]), ["web"])
        self.assertEqual(affected.affected_apps([]), [])

    def test_complete_branch_diff_survives_documentation_final_commit(self):
        with tempfile.TemporaryDirectory(prefix="oma-affected-test-") as directory:
            repo=Path(directory)
            git(repo, "init", "-b", "main")
            (repo/"README.md").write_text("base")
            git(repo,"add",".");git(repo,"commit","-m","initial")
            git(repo,"checkout","-b","feature")
            (repo/"apps/web").mkdir(parents=True)
            (repo/"apps/web/view.ts").write_text("changed")
            git(repo,"add",".");git(repo,"commit","-m","feature")
            (repo/"README.md").write_text("documentation last")
            git(repo,"add",".");git(repo,"commit","-m","docs")
            self.assertNotIn("apps/web/view.ts", git(repo,"diff","--name-only","HEAD~1"))
            paths=affected.changed_paths(repo,base="main")
            self.assertIn("apps/web/view.ts",paths)
            self.assertIn("web",affected.affected_apps(paths))
            self.assertIsNone(affected.changed_paths(repo,base="unavailable-target"))

    def test_staged_first_commit_works_and_preserves_unusual_paths(self):
        with tempfile.TemporaryDirectory(prefix="oma-staged-test-") as directory:
            repo=Path(directory);git(repo,"init","-b","main")
            (repo/"apps/api").mkdir(parents=True)
            path="apps/api/a space\nand-tab\t.py"
            (repo/path).write_text("example")
            git(repo,"add",".")
            self.assertEqual(affected.changed_paths(repo,staged=True),[path])

    def test_git_churn_and_measurement_do_not_execute_filenames(self):
        with tempfile.TemporaryDirectory(prefix="oma-hotspot-test-") as directory:
            repo=Path(directory);git(repo,"init","-b","main")
            marker=repo/"UNEXPECTED_COMMAND"
            filename="$(touch UNEXPECTED_COMMAND) space\nand-tab\t.ts"
            (repo/filename).write_text("example")
            git(repo,"add",".");git(repo,"commit","-m","unusual filename")
            self.assertEqual(hotspots.churn(repo)[filename],1)
            tool=repo/"fake-lizard"
            tool.write_text("#!/usr/bin/env python3\nimport json, sys\nprint(json.dumps(sys.argv[1:]))\n")
            tool.chmod(0o700)
            argv=json.loads(hotspots.measure(repo,filename,str(tool)))
            self.assertEqual(argv,["-C","999",str((repo/filename).resolve())])
            self.assertFalse(marker.exists())
            self.assertIsNone(hotspots.measure(repo,"../outside",str(tool)))

unittest.main(argv=[sys.argv[0], "RecipeRegression." + sys.argv[2]], verbosity=2)
`;

function runRegression(name: string) {
  const result = spawnSync(
    "python3",
    ["-c", regressionScript, skillsRoot, name],
    {
      encoding: "utf8",
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    },
  );
  expect(result.error, result.stderr || result.stdout).toBeUndefined();
  expect(result.status, result.stderr || result.stdout).toBe(0);
}

describe("skill recipe helpers", () => {
  it("includes all apps for shared, root, and unknown changes", () => {
    runRegression("test_shared_unknown_and_app_paths");
  });

  it("checks the whole branch even when the last commit only changes docs", () => {
    runRegression(
      "test_complete_branch_diff_survives_documentation_final_commit",
    );
  });

  it("handles staged changes before the first commit and preserves file names", () => {
    runRegression("test_staged_first_commit_works_and_preserves_unusual_paths");
  });

  it("passes hostile file names as single arguments without executing them", () => {
    runRegression("test_git_churn_and_measurement_do_not_execute_filenames");
  });
});

const sessionRegressionScript = [
  "import assert from 'node:assert/strict';",
  "import { readFileSync } from 'node:fs';",
  "import { join } from 'node:path';",
  "",
  "// Run only JavaScript bodies from the reviewed recipe against controlled doubles.",
  "// No framework installation, template compilation, or network requests occur.",
  "const skillsRoot = process.argv[1];",
  "function between(source, start, end) {",
  "  const offset = source.indexOf(start);",
  "  assert.notEqual(offset, -1, start);",
  "  const tail = source.slice(offset + start.length);",
  "  const limit = tail.indexOf(end);",
  "  assert.notEqual(limit, -1, end);",
  "  return tail.slice(0, limit);",
  "}",
  "for (const filename of ['api-template.ts', 'snippets.md']) {",
  "  const source = readFileSync(join(skillsRoot, 'oma-mobile/variants/react-native', filename), 'utf8');",
  "  const guardBody = between(source,",
  "    'operation: (version: number) => Promise<T>): Promise<T> {\\n', '\\n}\\n');",
  "  let state = { accountId: 'A', sessionVersion: 1, accessToken: 'token-A', isAuthenticated: true };",
  "  const useAuthStore = { getState: () => state };",
  "  const guard = new Function('useAuthStore', 'return (accountId, version, operation) => {' + guardBody + '}')(useAuthStore);",
  "  let adapterCalls = 0;",
  "  state = { accountId: 'B', sessionVersion: 2, accessToken: 'token-B', isAuthenticated: true };",
  "  await assert.rejects(guard('A', 1, async () => { adapterCalls++; }), /retired session/);",
  "  assert.equal(adapterCalls, 0, 'old hook must not send through new credentials');",
  "",
  "  // The guard passed while A was current; Axios dispatch was queued until B.",
  "  state = { accountId: 'A', sessionVersion: 1, accessToken: 'token-A', isAuthenticated: true };",
  "  const config = await guard('A', 1, async (version) => ({",
  "    _sessionVersion: version, _accountId: 'A', headers: { set: () => { adapterCalls++; } },",
  "  }));",
  "  state = { accountId: 'B', sessionVersion: 2, accessToken: 'token-B', isAuthenticated: true };",
  "  const interceptorBody = between(source,",
  "    'apiClient.interceptors.request.use((config: SessionRequest) => {\\n', '\\n});');",
  "  class CanceledError extends Error {}",
  "  const interceptor = new Function('useAuthStore', 'axios', 'return (config) => {' + interceptorBody + '}')(useAuthStore, { CanceledError });",
  "  assert.throws(() => interceptor(config), CanceledError);",
  "  assert.equal(config._sessionVersion, 1, 'expected version must survive request setup');",
  "  assert.equal(adapterCalls, 0);",
  "  assert.throws(() => interceptor({ ...config, _sessionVersion: 2 }), CanceledError);",
  "  assert.equal(adapterCalls, 0, 'read/write dispatch must also preserve account identity');",
  "  for (const functionName of ['fetchTodos', 'fetchTodo', 'createTodo', 'toggleTodo', 'deleteTodo']) {",
  "    const functionTail = source.slice(source.indexOf('export async function ' + functionName + '('));",
  "    const body = functionTail.slice(0, functionTail.indexOf('\\n}'));",
  "    assert.match(body, /const config: SessionRequestConfig = \\{ _accountId: accountId, _sessionVersion: sessionVersion(?:, signal)? \\}/);",
  "    assert.match(body, /apiClient\\.(?:get<Todo(?:\\[\\])?>|post<Todo>|patch<Todo>|delete)\\([^;]+, config\\)/);",
  "  }",
  "",
  "  // Queue B login while A is still visible, then handle A refresh failure.",
  "  state = { accountId: 'A', sessionVersion: 1, accessToken: 'token-A', isAuthenticated: true };",
  "  let queue = Promise.resolve();",
  "  const transition = (operation) => {",
  "    const next = queue.then(operation);",
  "    queue = next.catch(() => undefined);",
  "    return next;",
  "  };",
  "  let credentialsDeleted = 0;",
  "  const clearBody = between(source,",
  "    'clearToken: (expectedVersion) => transition(async () => {\\n', '\\n  }),');",
  "  const clearToken = new Function('transition', 'get', 'set', 'resetAccountQueryCache', 'Keychain',",
  "    'return (expectedVersion) => transition(async () => {' + clearBody + '})')(",
  "      transition, () => state, (values) => { state = { ...state, ...values }; }, async () => {},",
  "      { resetGenericPassword: async () => { credentialsDeleted++; } },",
  "    );",
  "  const login = transition(async () => {",
  "    state = { accountId: 'B', sessionVersion: 2, accessToken: 'token-B', isAuthenticated: true };",
  "  });",
  "  assert.equal(state.sessionVersion, 1);",
  "  const staleClear = clearToken(1);",
  "  await Promise.all([login, staleClear]);",
  "  assert.equal(state.accountId, 'B');",
  "  assert.equal(state.accessToken, 'token-B');",
  "  assert.equal(credentialsDeleted, 0, 'stale refresh must not delete new credentials');",
  "  console.log(filename + ': stale mutation, delayed interceptor, queued refresh/logout PASS');",
  "}",
].join("\n");

describe("account session recipe", () => {
  it("fences stale hooks, delayed dispatch, and queued refresh failures", () => {
    const result = spawnSync(
      "node",
      ["--input-type=module", "-e", sessionRegressionScript, skillsRoot],
      {
        encoding: "utf8",
        timeout: 30_000,
        maxBuffer: 1024 * 1024,
      },
    );
    expect(result.error, result.stderr || result.stdout).toBeUndefined();
    expect(result.status, result.stderr || result.stdout).toBe(0);
  });
});
