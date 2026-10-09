/** Bind installed definitions without moving project output or state references. */
export function bindDefinitionPaths(
  content: string,
  definitionsRoot: string,
): string {
  return content.replace(
    /\.agents\/(?=(?:skills|workflows|rules|agents|config|hooks|protocols)\/|oma-config\.|mcp\.json)/g,
    () => `${definitionsRoot}/`,
  );
}
