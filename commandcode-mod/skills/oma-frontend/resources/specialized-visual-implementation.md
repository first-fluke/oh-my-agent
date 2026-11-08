# Specialized Visual Implementation

Load this resource only when a requested implementation needs one of the extensions below.
General visual direction and implementation are separate stages: `oma-design` may use Taste or Impeccable to establish the visual intent; `oma-frontend` integrates the selected implementation provider into the existing application.
Do not load another design rulebook just because a GPU effect or scroll mechanism is needed.
Preserve the project's animation choice and the new-project Motion default.

## Choose by the requested effect

| Condition | Implementation route | Do not select it for |
|---|---|---|
| A named canvas/GPU effect over live HTML or a shader/3D-object component | CanvasUI registry item for the component, renderer and framework | General layout, form controls, design-system planning, or a native screen |
| A cinematic journey where scrolling seeks through connected pre-rendered camera clips | ScrollWorld skill and complete support bundle | Ordinary parallax, an entrance animation, a dashboard, or arbitrary real-time 3D navigation |
| The project already uses GSAP, or the user has selected GSAP for a concrete API/task | Only the needed official GSAP skills | Replacing existing Motion/CSS merely because the GSAP guide recommends itself |

Keep the extension local to the target route/component.
A request for a visual effect does not authorize a framework migration, unrelated dependencies, a full-page redesign, or a second media-production chain.

## Shared handoff and loading contract

Before implementation, carry these inputs from the request and project:
- Target route/component, existing stack, visual intent and normative tokens.
- Interaction and content that must survive; requested devices and input methods.
- The chosen extension, renderer/API where relevant, and who owns its lifecycle.
- Existing approved media, generation permissions, deadline, retry/cost/download limits, and performance constraints.
- Build authorization and available browser/device evidence.

Use the provider's actual source or selected skill, rather than treating this resource's summary as its implementation manual.
Keep complete returned support files and resolve their relative references from the returned skill directory.
Keep cwd at the target application when running authorized provider scripts.
A load without `--agent` reads instructions into the current runtime; do not install plugins, hooks or provider-agent definitions as an activation step.
Do not vendor provider code, packages, registries or skill manuals into OMA.

User instructions, project authority and OMA execution policy remain above the external procedure.
Preserve settled user choices; do not restart an interview or ask again for an already-authorized action.
Loading a provider does not authorize an installation, build, paid generation or change to a global provider default.
Use existing approved assets when generation is outside scope.
Record source identity, selected item/skill, relevant references, outputs and verification limits.

## CanvasUI: registry component implementation

CanvasUI is a source-copy component registry, not a skill or AI canvas editor.
It supplies WebGL/WebGPU effects; the documentation site's Next.js application and newsletter backend are not consumer requirements.

### Load the selected implementation

1. Select one named component and its actual target framework: React, Solid, Preact, Vue, Svelte or vanilla.
2. Select the renderer from target capabilities and requirements. WebGL is the ordinary registry variant; choose the explicit WebGPU variant only when that requirement is justified.
3. Resolve the complete shadcn-compatible registry item through the project's existing authorized registry tools/CLI.
   Names have the form `@canvas-ui/<component>-<framework>[-webgpu]`, for example `@canvas-ui/liquid-react` or `@canvas-ui/liquid-react-webgpu`.
4. Inspect the returned source, installation target and dependencies before applying it.
   The generated item inlines its engine and shared helpers; a demo fragment alone is not the implementation.
5. Apply it inside the target product under its license and existing file conventions.
   Keep strict primitives intact and wrap the effect at the appropriate client boundary.

Registry source: `https://canvasui.dev/r/{name}.json`.
For a framework without a supplied wrapper, consider a scoped vanilla adapter; do not invent an unsupported registry suffix or replace the framework.

### Runtime and outputs

- Inputs: live HTML/content or supplied object assets, a component's typed options, renderer and framework.
- Outputs: the selected component/adapter, necessary project dependencies, source/license provenance and observed behavior.
- WebGL effects require working browser GPU capabilities; some require float render targets.
- WebGPU variants add `vgpu`; object variants can add `three` and fetch model/decoder assets.
- HTML-in-canvas is an experimental capability. Check the actual API, GPU initialization and DOM-preserving fallback rather than promising support from a browser version alone.
- No AI account or inference API key is needed for the component itself. Do not configure the site's Resend/Turnstile services.

### Lifecycle, fallback and verification

Own the engine instance at mount and call its `destroy()` at teardown.
Remove owned observers/listeners and release GPU resources; do not leave duplicate instances after remount.
Preserve the visible, interactive DOM when native capture, WebGL or WebGPU fails.
Respect reduced motion and verify that the fallback still exposes the content and primary action.
Check the selected route at representative sizes, with keyboard/touch input, resizing/zoom, reduced motion and GPU failure.
Measure target-specific frame/memory behavior when performance is material; source-level cleanup checks do not prove device performance.

CanvasUI's checked license is **MIT + Commons Clause**.
Retain notices and check the selected item's current license: product use and redistribution of the components themselves have different terms.
Do not repackage its component collection inside OMA.

Official sources: [registry generator](https://github.com/DavidHDev/canvas-ui/blob/a04a99b235299ee79a123a16ccb2e6cf9da74b6b/src/lib/registry.ts), [engine lifecycle](https://github.com/DavidHDev/canvas-ui/blob/a04a99b235299ee79a123a16ccb2e6cf9da74b6b/src/lib/Liquid/LiquidVanilla.ts), [HTML-in-canvas](https://github.com/DavidHDev/canvas-ui/blob/a04a99b235299ee79a123a16ccb2e6cf9da74b6b/src/lib/html-in-canvas.ts), [license](https://github.com/DavidHDev/canvas-ui/blob/a04a99b235299ee79a123a16ccb2e6cf9da74b6b/LICENSE.md).

## ScrollWorld: pre-rendered video scrubbing

Select this route only for the connected camera-flight experience.
It seeks through video; it does not implement a freely navigable WebGL world and does not require GSAP.

Load the complete external skill:

```sh
bunx skills use oso95/scroll-world@scroll-world
```

Read the returned SKILL.md and the applicable support files from its returned directory:
- `references/scrub-engine.js`: browser engine and configuration.
- `references/index-template.html`: integration example.
- `references/pipeline.md`: authorized media extraction/encoding steps.
- `references/prompts.md`: generation inputs and camera continuity.
- `references/knockout.py`: optional image-helper contract; loading it does not authorize image processing.

### Inputs, production handoff and outputs

Inputs are brand/content, ordered scenes, camera direction, supplied stills/clips/connectors, target aspect ratios and an approved asset budget.
Existing valid assets permit integration without generating new media.
When new stills or video are needed, hand their explicit requirements to `oma-image` / `oma-video` within the already-authorized provider and cost scope.
Do not inherit upstream's default biller, automatic installer or quoted prices as OMA defaults.
Recheck actual provider capabilities/costs before an authorized batch.
Use one bounded calibration before a costly batch when costs or seam behavior are unknown; do not silently generate a second portrait chain.

The asset handoff must identify scene stills, dive clips, connector endpoints, posters, intended sizes/codecs and provenance.
A full chain has N dives and up to N−1 connectors; desktop and portrait production are distinct scopes.
Confirm seams against the actual adjacent rendered frames.
Outputs are approved media plus an app-local integration/configuration, a lifecycle adapter where needed, and evidence of continuity and fallback.

The browser config consumes `sections` with still/clip/content fields, optional mobile variants, connector URLs and scroll-distance settings.
The engine uses DOM/video/fetch/RAF and Blob URLs. Fetch/CORS, decoded-video memory, seek cost and asset bytes belong in the implementation budget.

### Existing SPA integration requires cleanup work

The checked upstream `mountScrollWorld` adds global listeners and a recurring RAF, creates Blob URLs, and provides no destroy/dispose return.
Do not mount that function unchanged in a route that can unmount or mount twice.
Adapt the target integration's mount contract to expose the owned handles and a disposer.
A wrapper that only removes the container cannot clean up the upstream closure's RAF, listeners or Blob URLs.
Provide a target-app lifecycle integration that:
- Cancels owned RAF/timers and removes owned listeners.
- Aborts pending media requests, pauses/releases videos and revokes created Blob URLs.
- Removes only owned DOM/styles and prevents duplicate mounting.
- Scopes the engine's injected CSS and fixed layers, including its global html/body rules.
- Preserves application navigation, scrolling, focus and unrelated animation instances.

Reduced motion uses posters instead of loading clips.
Verify that path, failed/blocked video fetch, first-frame poster continuity, fast scroll seek behavior, back navigation and unmount/remount.
If live preference changes are supported, adapt them explicitly; the upstream reduced-motion value is captured at mount.
Phone seeking/priming and optional mobile source branches in code are not evidence of a real iOS/device pass.
State exactly which browser/device or emulation produced the evidence.

Official sources: [skill and complete flow](https://github.com/oso95/scroll-world/blob/71cc36d3bb150248ae36a2c552f9cbf88802a79c/skills/scroll-world/SKILL.md), [actual engine/config/lifecycle](https://github.com/oso95/scroll-world/blob/71cc36d3bb150248ae36a2c552f9cbf88802a79c/skills/scroll-world/references/scrub-engine.js), [media pipeline](https://github.com/oso95/scroll-world/blob/71cc36d3bb150248ae36a2c552f9cbf88802a79c/skills/scroll-world/references/pipeline.md).

## GSAP: chosen API guidance

Enter only after GSAP is already used or explicitly selected for the target.
The external skills' recommendation to default to GSAP does not replace the project's Motion/CSS choice.
Load the few relevant skills, then read and follow their complete returned instructions:

| Need | Actual skill selector |
|---|---|
| Core tween/easing/matchMedia API | `greensock/gsap-skills@gsap-core` |
| React/Next.js lifecycle | `greensock/gsap-skills@gsap-react` |
| ScrollTrigger pin/scrub/refresh | `greensock/gsap-skills@gsap-scrolltrigger` |
| Timeline sequencing | `greensock/gsap-skills@gsap-timeline` |
| A named extra plugin | `greensock/gsap-skills@gsap-plugins` |
| GSAP utility API | `greensock/gsap-skills@gsap-utils` |
| A GSAP performance problem | `greensock/gsap-skills@gsap-performance` |
| Vue/Svelte or other framework lifecycle | `greensock/gsap-skills@gsap-frameworks` |

For a React ScrollTrigger task, the relevant initial set is core + react + scrolltrigger:

```sh
bunx skills use greensock/gsap-skills@gsap-core
bunx skills use greensock/gsap-skills@gsap-react
bunx skills use greensock/gsap-skills@gsap-scrolltrigger
```

A smaller task loads a smaller set.
When a skill returns a support directory, resolve its references there; a SKILL-only result need not have one.
Loading these guides does not install `gsap`, `@gsap/react`, plugins or example applications.

### Runtime, outputs and verification

Inputs are the selected API/plugin, existing dependency versions, target elements, lifecycle, timeline/scroll behavior and reduced-motion result.
Outputs are scoped application code, an explicit teardown and relevant interaction/performance evidence.
Run DOM-dependent GSAP work on the client, after target nodes exist.
Use a scoped `useGSAP`/context in React, context-safe delayed callbacks and matching cleanup; revert on unmount/update where appropriate.
Outside React, use the framework's own mount/unmount lifecycle and revert the owned GSAP context.
Remove custom listeners/timers as well as animation objects.
Kill/revert only the route's owned animations/triggers, never unrelated instances globally.

Choose a meaningful reduced-motion/static result with `gsap.matchMedia()` or the project's equivalent.
Verify endpoint state, interruption/reversal where needed, touch/keyboard behavior, hydration, remount cleanup and responsive layout.
For ScrollTrigger, verify scroller ownership, pin geometry and refresh after relevant layout/assets change.
Keep test/build execution within authorization; do not install/build the supplier's examples to consume a guide.

Official sources: [core](https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-core/SKILL.md), [React](https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-react/SKILL.md), [ScrollTrigger](https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-scrolltrigger/SKILL.md).

## Motion principles and handoff evidence

Use [shared interaction quality](../references/_shared/ui-interaction-quality.md) for purpose, frequency, interruption, compositor cost, input feedback and reduced motion.
The absorbed Emil guidance informs those project-level decisions; it is not an automatic extra external-skill chain or library picker.
A CSS/Motion implementation that already satisfies the request remains valid.

Report the chosen extension and item/skills, actual target changes, asset/dependency effects, cleanup ownership and verification performed.
Separate support loading, source inspection, asset generation, runtime execution and browser/device results.
Unavailable media or a skipped runtime check is an explicit limitation, not a rendered pass.
