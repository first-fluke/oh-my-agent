import fs from "node:fs";
import path from "node:path";
import color from "picocolors";

export interface ExplainValidationIssue {
  rule: string;
  severity: "error" | "warning";
  message: string;
}

export interface ExplainFileResult {
  file: string;
  valid: boolean;
  issues: ExplainValidationIssue[];
}

export interface ExplainValidationReport {
  valid: boolean;
  totalFiles: number;
  passedFiles: number;
  failedFiles: number;
  results: ExplainFileResult[];
}

export interface ExplainValidateOptions {
  file?: string;
  dir?: string;
  format?: "json" | "concise";
  outFile?: string;
}

function findHtmlFiles(dirPath: string, visited = new Set<string>()): string[] {
  let realDir = dirPath;
  try {
    realDir = fs.realpathSync(dirPath);
  } catch {
    return [];
  }
  if (visited.has(realDir) || !fs.existsSync(dirPath)) {
    return [];
  }
  visited.add(realDir);

  const results: string[] = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isSymbolicLink()) {
      try {
        const realTarget = fs.realpathSync(fullPath);
        if (fs.statSync(realTarget).isDirectory()) {
          results.push(...findHtmlFiles(fullPath, visited));
        } else if (realTarget.endsWith(".html")) {
          results.push(fullPath);
        }
      } catch {
        // Skip broken symlinks
      }
    } else if (entry.isDirectory()) {
      results.push(...findHtmlFiles(fullPath, visited));
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".html") &&
      // An archify sidecar is archify's own document, checked by archify.
      !entry.name.endsWith(".archify.html")
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

export function validateHtmlContent(
  filePath: string,
  html: string,
): ExplainFileResult {
  const issues: ExplainValidationIssue[] = [];
  const basename = path.basename(filePath);

  // 1. Check filename format {YYYY-MM-DD}-{slug}.html
  const filenamePattern = /^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.html$/i;
  if (!filenamePattern.test(basename)) {
    issues.push({
      rule: "filename-format",
      severity: "error",
      message: `Filename '${basename}' does not match format {YYYY-MM-DD}-{slug}.html`,
    });
  }

  // 2. Check code container compliance: <pre> tags or white-space: pre / pre-wrap
  const hasPreTag = /<pre[\s>]/i.test(html);
  const hasWhiteSpacePre = /white-space:\s*(pre|pre-wrap)/i.test(html);
  if (!hasPreTag && !hasWhiteSpacePre) {
    issues.push({
      rule: "code-container-compliance",
      severity: "error",
      message:
        "Missing code container formatting (<pre> tags or white-space: pre/pre-wrap)",
    });
  }

  // 3. Exclude code containers (<pre>, <code>) for resource and secret checks
  const sanitizedHtml = html
    .replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, "")
    .replace(/<code\b[^>]*>[\s\S]*?<\/code>/gi, "");

  // 4. Check self-contained rule (no live external resource loads including media)
  const hasExternalScript =
    /<script\b[^>]*\bsrc=["'](https?:)?\/\/[^"']+["']/i.test(sanitizedHtml);
  const hasExternalLink =
    /<link\b[^>]*\bhref=["'](https?:)?\/\/[^"']+["']/i.test(sanitizedHtml);
  const hasExternalImport =
    /@import\s+(?:url\(['"]?(https?:)?\/\/[^'"]+['"]?\)|['"](https?:)?\/\/[^'"]+['"])/i.test(
      sanitizedHtml,
    );
  const hasExternalUrl = /url\(['"]?(https?:)?\/\/[^'")]+['"]?\)/i.test(
    sanitizedHtml,
  );
  const hasExternalMedia =
    /<(img|iframe|video|audio|embed|object)\b[^>]*(src|data)=["'](https?:)?\/\/[^"']+["']/i.test(
      sanitizedHtml,
    );

  if (
    hasExternalScript ||
    hasExternalLink ||
    hasExternalImport ||
    hasExternalUrl ||
    hasExternalMedia
  ) {
    issues.push({
      rule: "self-contained",
      severity: "error",
      message:
        "External resource load detected (live external script, stylesheet, image, media, @import, or url)",
    });
  }

  // 5. Check quiz script presence (<script> tag with quiz logic)
  const scriptBlocks = html.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) || [];
  const hasQuizScript = scriptBlocks.some((script) =>
    /quiz|checkAnswer|questions|score|selectOption/i.test(script),
  );
  if (!hasQuizScript) {
    issues.push({
      rule: "quiz-script-presence",
      severity: "error",
      message: "Quiz script missing or no quiz logic found in <script> tag",
    });
  }

  // 6. Check secret scan (flag potential API key / token assignments outside code blocks)
  const secretPatterns = [
    /\bsk-[a-zA-Z0-9_-]{20,}\b/,
    /\bghp_[a-zA-Z0-9]{36}\b/,
    /\bgithub_pat_[a-zA-Z0-9_]{30,}\b/,
    /\bxox[baprs]-[a-zA-Z0-9_-]{10,}\b/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\b(?:api_key|api-key|secret|password|token|auth[-_]?token|bearer[-_]?token|access[-_]?token|private[-_]key|connection[-_]string)\s*[:=]\s*["']?[A-Za-z0-9\-_]{16,}["']?/i,
  ];

  const hasSecret = secretPatterns.some((pattern) =>
    pattern.test(sanitizedHtml),
  );
  if (hasSecret) {
    issues.push({
      rule: "secret-scan",
      severity: "error",
      message: "Potential API key or secret token detected outside code blocks",
    });
  }

  const valid = issues.filter((i) => i.severity === "error").length === 0;
  return {
    file: filePath,
    valid,
    issues,
  };
}

export async function runExplainValidate(
  opts: ExplainValidateOptions = {},
): Promise<number> {
  const format = opts.format === "json" ? "json" : "concise";
  let filesToValidate: string[] = [];

  if (opts.file) {
    if (!fs.existsSync(opts.file)) {
      const report: ExplainValidationReport = {
        valid: false,
        totalFiles: 1,
        passedFiles: 0,
        failedFiles: 1,
        results: [
          {
            file: opts.file,
            valid: false,
            issues: [
              {
                rule: "file-exists",
                severity: "error",
                message: `File not found: ${opts.file}`,
              },
            ],
          },
        ],
      };
      outputReport(report, format, opts.outFile);
      return 1;
    }
    filesToValidate = [opts.file];
  } else {
    const searchDir = opts.dir || path.join(".agents", "results", "explain");
    filesToValidate = findHtmlFiles(searchDir);

    if (filesToValidate.length === 0) {
      const report: ExplainValidationReport = {
        valid: false,
        totalFiles: 1,
        passedFiles: 0,
        failedFiles: 1,
        results: [
          {
            file: searchDir,
            valid: false,
            issues: [
              {
                rule: "directory-scan",
                severity: "error",
                message: `No HTML files found under '${searchDir}'`,
              },
            ],
          },
        ],
      };
      outputReport(report, format, opts.outFile);
      return 1;
    }
  }

  const results: ExplainFileResult[] = [];
  for (const filePath of filesToValidate) {
    const html = fs.readFileSync(filePath, "utf-8");
    results.push(validateHtmlContent(filePath, html));
  }

  const passedFiles = results.filter((r) => r.valid).length;
  const failedFiles = results.length - passedFiles;
  const valid = failedFiles === 0 && results.length > 0;

  const report: ExplainValidationReport = {
    valid,
    totalFiles: results.length,
    passedFiles,
    failedFiles,
    results,
  };

  outputReport(report, format, opts.outFile);
  return valid ? 0 : 1;
}

function outputReport(
  report: ExplainValidationReport,
  format: "json" | "concise",
  outFile?: string,
): void {
  if (outFile) {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2), "utf-8");
  }

  if (format === "json") {
    console.log(JSON.stringify(report, null, 2));
  } else {
    if (report.valid) {
      console.log(
        color.green(
          `✔ Explain validation passed: ${report.passedFiles}/${report.totalFiles} file(s) valid`,
        ),
      );
    } else {
      console.log(
        color.red(
          `✖ Explain validation failed: ${report.failedFiles}/${report.totalFiles} file(s) failed`,
        ),
      );
      for (const res of report.results) {
        if (!res.valid || res.issues.length > 0) {
          console.log(color.yellow(`File: ${res.file}`));
          for (const issue of res.issues) {
            console.log(
              `  - [${issue.severity}] ${issue.rule}: ${issue.message}`,
            );
          }
        }
      }
    }
  }
}
