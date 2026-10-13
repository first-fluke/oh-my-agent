import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPOSITORY_URL = "https://github.com/first-fluke/oh-my-agent";
const scriptDir = dirname(fileURLToPath(import.meta.url));
const cliDir = resolve(scriptDir, "..");
const rootReadmePath = resolve(cliDir, "..", "README.md");
const cliReadmePath = resolve(cliDir, "README.md");

const IMAGE_EXTENSION = /\.(?:avif|gif|jpe?g|png|svg|webp)$/i;

// Targets in the root README resolve from the repository root, but
// cli/README.md is rendered from cli/ on GitHub and from the npm package page,
// where those paths do not exist. Every relative target therefore becomes an
// absolute repository URL: images use raw/ so they render, links use blob/.
function toRepositoryUrl(target, embedded) {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(target)) return target;
  const [path, fragment] = target.split("#");
  const repoPath = posix.normalize(path).replace(/^\/+/, "");
  if (repoPath.startsWith("..")) return target;
  const kind = embedded ? "raw" : repoPath.endsWith("/") ? "tree" : "blob";
  const base = `${REPOSITORY_URL}/${kind}/main/${repoPath}`;
  return fragment ? `${base}#${fragment}` : base;
}

// Walks back from a link's closing "]" to its opening "[" so a link that wraps
// an image ([![alt](img)](href)) is told apart from the image it contains.
function opensImage(line, closeIndex) {
  let depth = 0;
  for (let i = closeIndex; i >= 0; i--) {
    if (line[i] === "]") depth++;
    else if (line[i] === "[" && --depth === 0) return line[i - 1] === "!";
  }
  return false;
}

function rewriteLine(line) {
  return line
    .replace(
      /\]\(([^)\s]+)((?:\s+"[^"]*")?)\)/g,
      (_, target, title, offset) =>
        `](${toRepositoryUrl(target, opensImage(line, offset))}${title})`,
    )
    .replace(
      /^(\s{0,3}\[[^\]]+]:\s*)(\S+)/,
      (_, label, target) =>
        `${label}${toRepositoryUrl(target, IMAGE_EXTENSION.test(target))}`,
    )
    .replace(
      /\b(src|href)=(["'])([^"']+)\2/g,
      (_, attribute, quote, target) =>
        `${attribute}=${quote}${toRepositoryUrl(target, attribute === "src")}${quote}`,
    );
}

export function rewriteRelativeLinks(markdown) {
  let fence = null;
  return markdown
    .split("\n")
    .map((line) => {
      const marker = /^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];
      if (fence) {
        if (marker?.[0] === fence[0] && marker.length >= fence.length) {
          fence = null;
        }
        return line;
      }
      if (marker) {
        fence = marker;
        return line;
      }
      return rewriteLine(line);
    })
    .join("\n");
}

export function syncReadme() {
  const rootReadme = readFileSync(rootReadmePath, "utf-8");
  const cliReadme = rewriteRelativeLinks(rootReadme);

  mkdirSync(dirname(cliReadmePath), { recursive: true });
  writeFileSync(cliReadmePath, cliReadme);
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  syncReadme();
}
