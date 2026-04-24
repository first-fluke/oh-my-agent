# Prompt Tips

Good prompts are specific about scene, subject, lighting, and style. Both `gpt-image-2` (codex) and `gemini-2.5-flash-image` (gemini) respond well to the same structural cues.

## Structure

```
Scene/backdrop → Subject → Details → Constraints
```

Example: `minimalist product photography: single white ceramic coffee cup on dark marble surface, steam rising softly, dramatic side lighting`

## Do's

- **Lighting**: "warm golden hour side light", "overcast diffused", "backlit with rim light"
- **Camera**: "shallow depth of field", "aerial view", "close-up macro", "35mm film grain"
- **Style**: "photorealistic", "oil painting", "3D render", "concept art", "isometric vector"
- **Mood**: "serene", "dramatic", "moody", "vibrant", "washed-out"
- **Resolution cue**: "ultra detailed", "8K", "high fidelity"

## Don'ts

- Avoid vague prompts like "a nice picture" — both models produce generic output.
- Don't stack contradicting styles ("photorealistic cel-shaded 3D").
- Skip negative prompts — neither `gpt-image-2` nor `gemini-2.5-flash-image` treats them as first-class.

## Examples

| Category | Prompt |
|----------|--------|
| Product | `Elegant perfume bottle on reflective black surface, studio lighting, luxury brand catalog style` |
| Landscape | `Aerial drone shot of Jeju coastline, turquoise water meeting volcanic rock, golden hour` |
| Food | `Overhead flat-lay of Korean bibimbap in stone pot, steam rising, vibrant vegetables, dark wood table` |
| Architecture | `Modern minimalist house with floor-to-ceiling windows overlooking misty mountain valley` |
| Portrait | `Professional headshot, soft natural window light, shallow depth of field, neutral background` |
| UI Mockup | `iPhone 15 Pro mockup showing a fitness app dashboard, clean UI, dark mode, floating on gradient background` |
| Concept | `Lone astronaut on crater edge of Mars, looking at Earth rising on the horizon, cinematic, volumetric dust` |

## Vendor Nuances

- **Codex (`gpt-image-2`)** — prefers slightly longer, descriptive prompts. Quality flag `high` noticeably sharpens fine detail but doubles generation time.
- **Gemini (`gemini-2.5-flash-image`)** — robust on CJK-composed scenes ("hanok", "cherry blossom"); slightly stronger on illustrated/painterly styles.

## Comparing Output

`--vendor all` generates the same prompt on both providers and writes both PNGs into a `…-compare/` folder with a single `manifest.json`. Use it for A/B picking when starting a new visual style.
