import { spawn } from "node:child_process";
import color from "picocolors";
import { findChromeExecutable } from "../search/strategies/browser.js";

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
  hint?: string;
}

async function checkBinary(
  bin: string,
  args: string[],
  hint?: string,
): Promise<CheckResult> {
  return new Promise((resolve) => {
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      out += chunk.toString();
    });
    child.on("error", () =>
      resolve({
        name: bin,
        ok: false,
        detail: "not found",
        hint,
      }),
    );
    child.on("close", (code: number | null) => {
      if (code === 0) {
        resolve({
          name: bin,
          ok: true,
          detail: out.trim().split("\n")[0] ?? "",
        });
      } else {
        resolve({ name: bin, ok: false, detail: `exit code ${code}`, hint });
      }
    });
  });
}

async function checkOptionalDep(
  pkgName: string,
  hint?: string,
): Promise<CheckResult> {
  try {
    await import(pkgName);
    return { name: pkgName, ok: true, detail: "installed" };
  } catch {
    return {
      name: pkgName,
      ok: false,
      detail: "not installed",
      hint: hint ?? `bun add ${pkgName}`,
    };
  }
}

export async function runSlideDoctor(): Promise<number> {
  const checks: CheckResult[] = [];

  // System Chrome / Chromium (required for validate, pdf, png)
  const chromePath = findChromeExecutable();
  checks.push({
    name: "chrome",
    ok: Boolean(chromePath),
    detail: chromePath ?? "not found",
    hint: chromePath
      ? undefined
      : "Install Google Chrome, Chromium, or set OMA_CHROME_PATH",
  });

  // yt-dlp (required for fetch-video)
  checks.push(
    await checkBinary(
      "yt-dlp",
      ["--version"],
      "Install with: pip install yt-dlp  OR  brew install yt-dlp",
    ),
  );

  // Optional Node.js deps (lazy-loaded only when their subcommand runs)
  checks.push(
    await checkOptionalDep(
      "pptxgenjs",
      "bun add --optional pptxgenjs  (required for: oma slide pptx)",
    ),
  );

  // Print table
  const nameWidth = Math.max(...checks.map((c) => c.name.length)) + 2;
  console.log(color.bold("\noma slide doctor — dependency status\n"));

  for (const check of checks) {
    const mark = check.ok ? color.green("✓") : color.yellow("!");
    const name = check.name.padEnd(nameWidth);
    const detail = check.ok
      ? color.dim(check.detail)
      : color.yellow(check.detail);
    console.log(`  ${mark} ${name} ${detail}`);
    if (!check.ok && check.hint) {
      console.log(`      ${color.cyan("→")} ${check.hint}`);
    }
  }

  const missing = checks.filter((c) => !c.ok);
  const required = ["chrome", "yt-dlp"];
  const missingRequired = missing.filter((c) => required.includes(c.name));
  const missingOptional = missing.filter((c) => !required.includes(c.name));

  console.log();
  if (missingRequired.length > 0) {
    console.log(
      color.yellow(
        `${missingRequired.length} required dependency(ies) missing — some subcommands will fail.`,
      ),
    );
  }
  if (missingOptional.length > 0) {
    console.log(
      color.dim(
        `${missingOptional.length} optional dep(s) not installed — install when you need those subcommands.`,
      ),
    );
  }
  if (missing.length === 0) {
    console.log(color.green("All dependencies present."));
  }

  return missingRequired.length > 0 ? 1 : 0;
}
