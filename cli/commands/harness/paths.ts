import { existsSync, realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";

export function isPathInside(parent: string, child: string): boolean {
  const relativePath = relative(resolve(parent), resolve(child));
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !isAbsolute(relativePath))
  );
}

export function resolveInside(
  parent: string,
  requestedPath: string,
  label: string,
): string {
  if (isAbsolute(requestedPath)) {
    throw new Error(`${label} must be relative to its workspace`);
  }
  const resolved = resolve(parent, requestedPath);
  if (!isPathInside(parent, resolved)) {
    throw new Error(`${label} escapes its workspace`);
  }
  return resolved;
}

export function assertExistingPathInside(
  parent: string,
  target: string,
  label: string,
): void {
  const realParent = realpathSync(parent);
  let existing = target;
  while (!existsSync(existing) && existing !== dirname(existing)) {
    existing = dirname(existing);
  }
  if (!existsSync(existing)) {
    throw new Error(`${label} has no existing parent`);
  }
  if (!isPathInside(realParent, realpathSync(existing))) {
    throw new Error(`${label} escapes its workspace through a symbolic link`);
  }
}

export function assertDirectory(path: string, label: string): void {
  if (!existsSync(path) || !statSync(path).isDirectory()) {
    throw new Error(`${label} is not a directory: ${path}`);
  }
}
