import { PRESETS } from "../../constants/index.js";

/** Resolve explicit presets before install migrations, locks, or downloads. */
export function resolvePresetSkills(preset?: string): string[] | undefined {
  if (preset === undefined) return undefined;
  if (!Object.hasOwn(PRESETS, preset)) {
    throw new Error(
      `Unknown skill preset ${JSON.stringify(preset)}. Choose one of: ${Object.keys(PRESETS).join(", ")}`,
    );
  }
  return [...(PRESETS[preset] ?? [])];
}
