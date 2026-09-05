# Visual Scoring Prompt (Chrome DevTools MCP)

You are evaluating a generated 3D Creative Learning Platform MVP for children.
The current working directory contains a project produced by an AI coding harness.

Your job: start the dev server, capture screenshots, and score the UX.

## Steps

### 1. Detect and start dev server

- Read `package.json` to find the dev script (`npm run dev`, `pnpm dev`, `yarn dev`, or `bun dev`).
- If no dev script exists, run `npm install` first, then check again.
- Start the dev server in the background.
- Detect the actual port from the dev server output (Next.js → 3000, Vite → 5173, custom → check stdout).
- Wait until the server responds (poll the URL with curl/fetch up to 60 seconds).

### 2. Capture screenshots via Chrome DevTools MCP

Navigate Chrome to the dev server URL and capture these screenshots. Save them to
`screenshots/` in the current directory.

| Filename | What to capture |
|---|---|
| `01-landing.png` | Initial page load (landing or onboarding) |
| `02-world-builder.png` | The 3D world builder workspace (navigate via UI if needed) |
| `03-ai-panel.png` | AI creative partner / sidebar (open it if collapsed) |
| `04-gallery.png` | Gallery or sharing view |

If a route does not exist, save a screenshot of the closest equivalent and note it.

### 3. Score the UX

For each item below, give an integer score from **0 to 5** based on what you see in the screenshots
and the running app:

| ID | Criterion |
|---|---|
| `3d-canvas` | Three.js Canvas actually renders something visible |
| `3d-place` | Can place objects in the scene |
| `3d-move-rotate` | Can move / rotate / scale objects |
| `3d-color-texture` | Color or texture modification works |
| `3d-env-theme` | Environment theme selection works |
| `3d-animation` | Animation or interaction triggers |
| `ai-panel` | AI sidebar / guide UI is visible |
| `ai-prompt` | Idea prompting input is functional |
| `ai-whatif` | What-if questions are generated |
| `onboard-flow` | Onboarding screen / flow exists |
| `onboard-simple` | Onboarding completable within 1 minute |
| `play-enter` | Explore-the-world mode reachable |
| `play-interact` | Objects react to clicks |
| `save-load` | Save / load project works |
| `gallery-view` | Gallery screen exists |
| `ux-child` | Child-friendly: big buttons, minimal text |
| `ux-responsive` | Desktop and tablet layouts both look reasonable |
| `ux-no-clutter` | UI is clean, not cluttered |
| `ux-visual-guide` | Visual guidance, icons, not text-heavy |
| `test-meaningful` | Test files contain meaningful assertions, not just snapshot tests |

### 4. Output

Output a single JSON object to stdout (no markdown fences, no commentary):

```json
{
  "harness": "<harness id>",
  "model": "claude-opus-4-6",
  "dev_server": {
    "command": "...",
    "port": 0,
    "started": true
  },
  "screenshots": [
    "screenshots/01-landing.png",
    "screenshots/02-world-builder.png",
    "screenshots/03-ai-panel.png",
    "screenshots/04-gallery.png"
  ],
  "scores": {
    "3d-canvas":        { "score": 0, "note": "" },
    "3d-place":         { "score": 0, "note": "" }
  },
  "overall_impression": "..."
}
```

### 5. Cleanup

Stop the dev server before exiting.

## Constraints

- Do NOT modify the project source code.
- Do NOT install missing dependencies beyond `npm install`.
- If the build fails or the dev server cannot start, score everything 0 and explain in `overall_impression`.
- Use the Chrome DevTools MCP tools (`navigate_page`, `take_screenshot`, etc.).
