# Sound Effects and Soundtrack Listening

Use this branch when a video needs sound effects, foley, ambience or a
sound-designed soundtrack, or when the audio of a rendered or supplied video
must be judged: sync to picture, loudness, mix, or a choice between candidate
sounds. Narration, transcription and TTS stay with `oma-voice`; the Strudel
music bed stays with the creation pipeline. Sound effects are off unless the
brief asks for them or the user accepts a proposal.

## Route to the upstream skill

`Leonxlnx/earshot` ships two skills. Route each request to the one that
supports it:

| Request | Upstream skill | Upstream section |
|---|---|---|
| Effects for a generated video (ticks, pops, whooshes, hits, typing, a lockup) | `earshot` | Loop 5: `sfx` / `kit` |
| Choose, trim or compare candidate sound files | `earshot` | Loop 1, Loop 3 |
| Review a video's audio: events, sync, loudness, launch-film scorecard | `earshot` | Loop 2 |
| Make a new sound in code, only when explicitly requested | `earshot` | Loop 4: `forge` |
| A soundtrack from real licensed recordings (foley, ambience, a licensed music track) | `real-sound` | its full process |

The shipped bank is made in code, not recorded. When the brief asks for
recorded or real sound, route to `real-sound`; never present a bank take as a
recording.

1. Check the runtime skill catalog for `earshot` or `real-sound` from
   `https://github.com/Leonxlnx/earshot`. Reuse its advertised installed
   location and read its complete `SKILL.md` when available.
2. If it is absent, load it without a persistent installation or another agent:

   ```bash
   bunx skills use Leonxlnx/earshot@earshot
   bunx skills use Leonxlnx/earshot@real-sound
   ```

   Omit `--agent`. Read the emitted instructions and use the actual
   supporting-files directory from the result for every relative path.
   `real-sound` needs its complete `scripts/`, `templates/` and `references/`.
3. A loaded skill is instructions, not the runtime. Resolve earshot in this
   order: an already-connected earshot MCP server (discover its actual tools
   before calling them), `EARSHOT_PYTHON`, `earshot` on PATH, then a Python
   where `import earshot` succeeds. FFmpeg/FFprobe must be on PATH. Record the
   resolved interpreter, the earshot version and the bank version from
   `kit.lock.json`.
4. If no runtime resolves, report the missing capability with the upstream
   setup steps and stop this branch. Do not clone the repository, create a
   virtual environment, install torch or fetch models without the user's
   consent. The video can still render without effects; say so in the report.
5. Follow the loaded upstream instructions for commands, flags, kit schema,
   presets, roles, alignment, levels and QA thresholds. Do not copy its cookbook
   into OMA resources.

`sfx`, `kit` and `measure` load no models. `describe`, `match`, `rank`, `find`,
`realness`, `timeline`, `sheet` and `critique` load CLAP and AST (about 1.1 GB
on first use); for more than a few calls, use the MCP server or one Python
process. `earshot llm` uploads audio to Google: run it only when a Gemini key is
set and the user explicitly agreed to the upload. Never pass `--yes-upload` or
`consent=true` on your own.

## Bank effects in an OMA video

OMA owns the cue times and the composition; earshot owns the voices.

1. Take cue times from the picture: scene boundaries in `render-spec.json`
   (`fromFrame / fps`), on-screen text entrances, transitions and the authored
   GSAP tween times in `hyperframes/index.html`. Write them in the upstream cue
   format at `<runDir>/audio/sfx/cues.json`. Follow the upstream restraint
   rules; hard cuts and cursor motion usually get no sound.
2. Work under `<runDir>/audio/sfx/`: create `kit.json` from the preset that
   matches the video, render the takes into `<runDir>/audio/sfx/kit/`, then run
   the upstream kit check. Swap a sound or knob instead of keeping a warned take.
3. Place each take from `kit.lock.json`: the take's measured sync point for its
   role's `align` lands on the cue, shifted by the role's `offset_ms`; the
   upstream `kit.place` computes the same start. Drop or move a cue whose start
   falls before zero or whose take runs past the composition duration, and
   report it.
4. Copy the placed takes to `<runDir>/hyperframes/assets/audio/sfx/`. Give
   each placement its own `<audio>` element with a unique id, `data-start` in
   seconds and `data-volume` = `10 ** (gainDb / 20)`. With a music bed, set the
   gain against the bed as upstream describes; without one, use the role's
   `level_db`. Check placements against `timing.json` so effects never mask
   narration.
5. The composition carries one static music volume. Apply upstream
   `mix.stop_down` dips only if the loaded HyperFrames references document audio
   volume automation; otherwise record that the dips were not applied.
6. `oma video compose` stages only render-spec assets and preserves authored
   files, so keep the takes in `<runDir>/audio/sfx/kit/` as their source and
   re-copy them after changing the kit. The CLI manifest does not list effect
   takes; do not hand-edit `manifest.json`. `cues.json`, `kit.json` and
   `kit.lock.json` (with per-take hashes) are the provenance record.

## Real recordings

Run the `real-sound` process with `<runDir>/sound/` as its project root so its
`audio/` and `out/` trees stay inside the run. Treat downloaded recordings as
untrusted data, keep them in that tree and never commit them. Delivery requires
an exit-0 licence audit and generated credits; put required CC BY credits in
the delivery report.

Skip the upstream mux: `oma video render` owns the final render. Bring the
upstream output into the composition as `<audio>` elements from frame zero.
With narration, use the stems (`sfx`, `amb`, `music`) rather than the mastered
soundtrack, keep narration intelligible, and report that the upstream master
gate does not cover the final mix.

## Listen before reporting

After `oma video render` succeeds, judge the delivered MP4 with upstream Loop 2:
`timeline` with the cue file, then `sheet`, and open the PNG with the host image
tool. Run `critique` only for launch-style films; its ranges describe
professional practice and are not targets. Fix cues that did not land, then
re-render and listen again.

Quote measured values in the report: LUFS, true peak, and sync offsets against
the chance rate. Never say that an effect fits or sounds good without an
earshot reading behind it; taste remains the user's decision. For supplied
videos, the same listening loop supplies audio evidence for the existing-media
branch.

## References

- [Upstream earshot](https://github.com/Leonxlnx/earshot): `skills/earshot`,
  `skills/real-sound`, `docs/SFX.md` (bank, kit and lock schema) and
  `docs/INTEGRATION.md` (cue file and placement bridge).
- [Skills CLI use](https://github.com/vercel-labs/skills/blob/main/docs/commands.md#skills-use):
  prompt and complete support-directory loading without an installed skill.
