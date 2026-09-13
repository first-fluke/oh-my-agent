/** Format a value for display. legacyFormat was removed in favor of this. */
export function formatValue(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}
export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
