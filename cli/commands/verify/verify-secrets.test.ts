import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkHardcodedSecrets } from "./codebase-checks.js";
import { collectVerifyReport } from "./report.js";

describe("hardcoded secret verification", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "oma-verify-secrets-"));
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  function source(path: string, content: string): void {
    const file = join(workspace, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  }

  it.each(["py", "ts", "tsx", "js", "dart"])(
    "detects secrets in %s source without revealing their values",
    (extension) => {
      source(`src/config.${extension}`, 'api_key = "abcdef1234567890"');
      const result = checkHardcodedSecrets(workspace);
      expect(result.status).toBe("fail");
      expect(result.message).toContain(`config.${extension}`);
      expect(result.message).not.toContain("abcdef1234567890");
    },
  );

  it("detects single-quoted secrets and whitespace around assignments", () => {
    source("src/auth.ts", "const token\t=\t'abcdef1234567890';");
    expect(checkHardcodedSecrets(workspace).status).toBe("fail");
  });

  it("detects prefixed token and secret names", () => {
    source("src/auth.ts", 'const access_token = "abcdef1234567890";');
    expect(checkHardcodedSecrets(workspace).status).toBe("fail");
  });

  it.each([
    'let enabled=true,token="abcdef1234567890";',
    'const [token="abcdef1234567890"] = values;',
  ])("detects compact and destructured assignments: %s", (content) => {
    source("src/auth.ts", content);
    expect(checkHardcodedSecrets(workspace).status).toBe("fail");
  });

  it("does not exclude production paths or values containing test or example", () => {
    source("src/latest.ts", 'const secret = "exampletest1234567890";');
    expect(checkHardcodedSecrets(workspace).status).toBe("fail");
  });

  it.each([
    "node_modules/package/config.ts",
    ".git/config.ts",
    "tests/config.ts",
    "__tests__/config.ts",
    "examples/config.ts",
    "src/config.test.ts",
    "src/config.spec.ts",
  ])("excludes fixture or dependency path %s", (path) => {
    source(path, 'const secret = "abcdef1234567890";');
    expect(checkHardcodedSecrets(workspace).status).toBe("pass");
  });

  it("accepts source without hardcoded secrets", () => {
    source("src/config.ts", "const api_key = process.env.API_KEY;");
    expect(checkHardcodedSecrets(workspace).status).toBe("pass");
  });

  it("does not mistake a query parameter for a secret assignment", () => {
    source(
      "src/client.ts",
      "const url = '/?token='+encodeURIComponent(AUTH_TOKEN); status='connected';",
    );
    expect(checkHardcodedSecrets(workspace).status).toBe("pass");
  });

  it("fails when the source cannot be inspected", () => {
    expect(checkHardcodedSecrets(join(workspace, "missing"))).toMatchObject({
      status: "fail",
      message: expect.stringContaining("Could not scan"),
    });
  });

  it("makes the verification report fail when a secret is found", () => {
    source("src/config.ts", 'const password = "abcdef1234567890";');
    expect(collectVerifyReport("qa", workspace).ok).toBe(false);
  });
});
