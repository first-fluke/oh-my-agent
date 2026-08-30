# Shorts (9:16) — layout spec

Composition id `Shorts`. 1080×1920 (or the spec's dimensions), 30fps.

- **Background**: `background.color` fill (default `#0f1117`); `image`/`video` → full-frame under scenes.
- **Scenes**: each `scenes[i]` → `<Sequence from={fromFrame} durationInFrames>`; visual fills the frame (`objectFit: cover`). `kenBurns: true` → slow zoom 1 → 1.08 over the scene, linear, clamped. `placeholder` / `#hex` src → solid color.
- **On-screen text** (`onScreenText[]`, joined by newlines): top area, `paddingTop: 10%`, centered, 56px, weight 800, white, `textShadow: 0 2px 10px rgba(0,0,0,.8)`, `maxWidth: 86%`. Subtle entrance (opacity 0→1 over ~8 frames) is welcome; no per-letter animation.
- **Captions** (`captions.style === "tiktok"`): bottom, centered, 64px, weight 800, white with shadow, no box, `paddingBottom: safeArea.bottomPct%`, `maxWidth: maxWidthPct%`. Show only the cue active at the current frame.
- **Audio**: `<Audio src={staticFile(audio.narration)}>`; music at `10^(musicGainDb/20)` (default −18 dB).
- **Motion budget**: transform + opacity only; nothing faster than 150 ms; respect the seed for any variation.
