import { type Node, parseTree } from "jsonc-parser";

/** JSON.parse accepts duplicate keys; contracts and fixtures reject ambiguity. */
export function parseMatrixJson(source: string): unknown {
  const value: unknown = JSON.parse(source);
  const root = parseTree(source);
  if (!root) throw new Error("Missing JSON value");
  const visit = (node: Node, depth: number): void => {
    if (depth > 16) throw new Error("Matrix JSON is too deeply nested");
    if (node.type === "object") {
      const keys = (node.children ?? []).map(
        (property) => property.children?.[0]?.value,
      );
      if (new Set(keys).size !== keys.length)
        throw new Error("Matrix JSON contains duplicate keys");
      for (const property of node.children ?? []) {
        const child = property.children?.[1];
        if (child) visit(child, depth + 1);
      }
    } else if (node.type === "array") {
      for (const child of node.children ?? []) visit(child, depth + 1);
    }
  };
  visit(root, 0);
  return value;
}
