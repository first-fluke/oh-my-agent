// OMA_VIDEO_MOCK determinism harness (mirrors the oma-market OMA_MARKET_MOCK
// pattern). When mock mode is on, every provider takes its deterministic
// fallback branch and never touches the network, a subprocess, or a clock — so
// the script.json / render-spec.json stage is byte-identical on replay.

/** True when the deterministic golden harness is active. */
export function isMockMode(): boolean {
  return process.env.OMA_VIDEO_MOCK === "1";
}

/**
 * Deterministic per-word duration in seconds. Used by the estimated voice path
 * so timing.json (and therefore render-spec frame math) is reproducible without
 * a TTS engine or wall clock.
 */
export const ESTIMATED_SECONDS_PER_WORD = 0.35;

/** Stable fps for all compositions; render-spec frame math depends on it. */
export const RENDER_FPS = 30;
