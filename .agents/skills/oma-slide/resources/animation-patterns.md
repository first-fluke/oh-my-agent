# Animation Patterns — oma-slide

> Effect-to-feeling guide and the stage's slide-transition hook.
> All patterns are CSS-only and live in the slide's `<style>` block.

## Ground Rules

1. Animate `transform` and `opacity` only — they compose on the GPU without layout reflow.
   Do not animate `filter`, `background-position`, `clip-path`, or box dimensions.
2. Keep durations short: **150ms** for micro-interactions, **200–500ms** for entrances.
3. Do not combine more than two animated properties on a single element.
4. Use `animation-fill-mode: both` so elements start in their pre-animated state (no flash).
5. Stagger sibling elements with `animation-delay` increments of 60–80ms.

## 1. Effect-to-Feeling Guide

Choose the entrance that matches the deck's emotional register. Each row is a single
`@keyframes` from the listed start state to `opacity: 1; transform: none`.

| Feeling | Entrance | Start state | Duration · easing | When to use |
|---|---|---|---|---|
| Versatile default | fade-up | `opacity: 0; translateY(20px)` | 400ms · `cubic-bezier(0.22, 0.61, 0.36, 1)` | Any content block; the safest, most readable entrance |
| Dramatic / cinematic | scale-in | `opacity: 0; scale(0.92)` | 450ms · `cubic-bezier(0.34, 1.56, 0.64, 1)` | Opening slides and key reveals; one focal element, never a body-text list |
| Techy / precise | slide-right | `opacity: 0; translateX(-32px)` | 350ms · `cubic-bezier(0.22, 0.61, 0.36, 1)` | Sequential reveals on data slides, step-by-step flows |
| Playful / energetic | scale-pop | `opacity: 0; scale(0.8)`, overshoot to `scale(1.05)` at 70% | 400ms · `cubic-bezier(0.34, 1.56, 0.64, 1)` | Badges, numbers, icons, callouts; not body text (legibility suffers during overshoot) |
| Corporate / polished | fade-up, slower | `opacity: 0; translateY(20px)` | 500ms · `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | B2B pitches, consulting deliverables, investor decks |
| Calm / editorial | fade-only | `opacity: 0` | 500ms · `ease` | White papers, research synthesis, reading-first decks |
| Minimal / restrained | no motion | — | — | Monochrome decks, dense reading-first slides |

## 2. Background Layers

Atmosphere sits on the z-index 0 / 10 layers with `pointer-events: none`; the content layer
at z-index 100 stays the focus. Keep these layers static: a grain overlay (inline SVG
`feTurbulence` data URI at about 4% opacity), scan lines (`repeating-linear-gradient`), or a
vignette (`radial-gradient` to a dark edge). A continuously animated gradient needs
`background-position`, which rule 1 excludes.

## 3. Slide Transition Hint

`deck-stage.js` manages `.active` / `.visible` classes. The shared CSS uses a
350ms crossfade; it does not consume a `--slide-transition-duration` variable.
For instant cuts, place this rule after `viewport-base.css`:

```css
.slide,
.slide.active,
.slide.visible {
  transition: none;
}
```

For longer custom transitions, update the actual transition declarations and the stage's
outgoing-slide cleanup guard together; a standalone custom property will not change either.
