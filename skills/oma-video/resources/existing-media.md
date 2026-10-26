# Existing Video Analysis and Editing

Use this branch for processing a supplied video or a real, already-rendered
video. Work in a new run directory and retain the source. Audio-only requests
stay with `oma-voice`. The OMA creation CLI, providers, asset bus and
`render-spec.json` remain separate from the upstream editing project format.

## Resolve the upstream skill

1. Check the runtime skill catalog for `ffmpeg-skill` from
   `https://github.com/kajisho5/ffmpeg-skill`. Reuse its advertised installed
   location and read its complete `SKILL.md` when available.
2. If it is absent or its support bundle is incomplete, load it without a
   persistent installation or another agent:

   ```bash
   bunx skills use kajisho5/ffmpeg-skill@ffmpeg-skill
   ```

   Omit `--agent`. Read the emitted skill instructions and use the actual
   supporting-files directory from the result for every relative path. Do not
   guess a cache path or treat successful prompt output as a completed edit.
3. Confirm that the supporting directory retains the complete package layout:
   `SKILL.md`, `package.json`, all of `scripts/` including the `_common/` package,
   `templates/` and `references/`. Scripts import sibling modules and use files
   outside their own directory. An entry file or selected scripts alone are not
   a usable bundle. Record the resolved source, version and support path with
   the run; report an incomplete bundle rather than assembling guessed files.
4. Follow the loaded upstream instructions for the selected operation. They
   own the script and flag selection, command recipes, templates, editing
   `project.json`, and probe/check/look workflow. Consult the selected script's
   help or the requested reference instead of copying the cookbook here.
   Do not start every job with `doctor`; follow the upstream failure-diagnosis
   order. The standalone `bunx ffmpeg-skill` installer is not this loading path.
5. An already-connected upstream MCP server is an optional execution surface.
   Discover its actual tools and argument schemas before calling it. Retain
   `mcp/server.py` and the complete script bundle when using that surface; its
   contract comes from the same scripts. Do not configure a server or invent
   tool names merely because a requested tool was not listed initially.

The upstream package needs local Python and FFmpeg/FFprobe, plus the encoders,
filters, fonts or optional transcription engine required by the chosen
operation. A loaded skill does not establish those capabilities. If a requested
operation or evidence is not supported by the loaded scripts or connected MCP,
report the missing capability. Do not invent a raw FFmpeg command fallback.

## Retain source-timeline evidence

Before deciding from the media, retain the measurements exposed by the upstream
probe and selected operation: actual stream indexes, rotation, dimensions, time
bases, start times, channel layout, duration and any measured frame timestamps.
Keep source PTS alongside time measured from the clip's start when available.
Frame number divided by nominal FPS is not a source timestamp for VFR or
nonzero-start media.

Express selected audio and video on one source timeline and preserve their
relative start offset. Map a detector's resampled audio clock back to that
common timeline before applying intervals to video. Record the conversion and
any gap, padding or frame/sample boundary adjustment; do not independently reset
each stream's first retained sample to zero.

The loaded upstream tools may not expose an exact source-PTS or frame inventory.
Contact-sheet labels and requested extraction times do not establish that
inventory. If the task requires exact mapping that the available tools cannot
prove, state the limitation and retain the evidence they do provide. Do not
fabricate source PTS, silently substitute nominal-FPS arithmetic, or claim exact
sampling from an approximate extraction.

## Select samples and interpret the picture

Resolve the sampling definition before extracting:

| Definition | Meaning |
|---|---|
| Codec keyframes | Decoder-marked random-access frames; encoding-dependent |
| I-pictures | Intra-coded pictures; not necessarily random-access frames |
| Scene changes | Visual-change candidates under a stated source-dependent threshold |
| Time sampling | Source frames selected under the requested interval or timestamp policy |

These are different sets. If an ambiguous "key frames" request changes the
result materially, resolve its meaning; otherwise state the selected method.
Choose an operation actually exposed by the loaded skill. An exact timestamp
grid additionally needs nearest-source-frame evidence; a contact sheet does
not prove it. Report unsupported sampling rather than silently changing its
definition. Keep the selection parameters and each image's supported timestamp
mapping. Image numbering alone carries no timing.

Run the host vision tool on the actual extracted images for visual analysis.
Record counts per supported source timestamp, with occluded or uncertain
instances marked. Visible instances in one frame and unique identities across
time are different claims; identity totals need tracking or explicit matching.
Never sum frame counts to claim a unique-object total. Sparse samples cannot
establish that an event never appeared between them; refine the relevant range
when that is the question. If vision is unavailable, retain the images and
report the missing interpretation. Mechanical measurements do not establish
subject identity, interesting content or visual quality.

## Decide which intervals may be removed

Amplitude-based silence, absence of speech and unwanted content are separate
criteria. Music can be loud without speech; speech can be quiet; a pause can
carry a meaningful visual event. Use the user's criterion to decide removals.
A long introduction is not automatically removable.

Choose amplitude thresholds from the request or measured room tone and quiet
speech, and minimum silence from the requested pause policy. Inspect channels
separately when a downmix could mask speech. With no audio stream there are no
audio-silence measurements. For speech-driven edits, require timed VAD or
transcription regions from an available provider. `oma-voice` may return only
text; inspect its response before treating it as a timing source. Missing words
are not evidence of silence. Never invent word or segment times. Retain the
model, channel, sample rate, thresholds and time-origin conversion.

Before handing intervals to the upstream edit operation:

1. Map measured candidates to source time, clip to media bounds, sort and merge
   overlaps of the same classification. Close an open trailing silence at the
   actual audio end; absent audio beyond that end is not measured silence.
2. Protect measured speech with request-appropriate context padding bounded by
   the source. Subtract these protected regions from amplitude candidates so
   quiet breaths and word boundaries are not removed solely for their level.
3. Listen to disputed regions with their adjacent phrase and inspect the video
   when detectors or context disagree. Retain and identify unresolved regions
   when the evidence cannot establish the requested removal criterion.
4. Apply the requested minimum removal length after reconciliation. Save the
   accepted removals, their reasons and the complementary keep intervals.
   This mapping must also govern captions and other retained tracks.

## Apply one edit timeline

Pass the accepted intervals and required stream relationships to the supported
upstream operation. Keep audio and video on the same edit mapping; removing
silence from audio alone while retaining an unchanged picture shifts sync.
Keyframe-constrained stream-copy cuts and frame/sample-accurate boundaries are
different results. Record the precision and any adjusted boundary, gap or
padding. An empty keep list needs an explicit empty-result decision.

Retained subtitle and additional audio tracks need the same mapping. Do not
silently drop them or keep their old timing. If the loaded operation cannot
preserve the required A/V offset, boundary precision or selected streams,
report that limitation rather than claiming a synchronized result.

For multi-step editing, let upstream own its `project.json` and templates.
OMA's creation `script.json`, `timing.json` and `render-spec.json` are distinct
contracts. Do not pass one format as the other or imply that an adapter exists.

## Assemble a dubbed clip

Use `oma-voice` for transcription, synthesis and utterance fitting, and
`oma-translation` for spoken translation. Timing must come from the supplied
timeline or a provider that returns measured regions; plain transcript text
has no timing. Return the fitted audio to this branch for placement through a
supported upstream operation.

When the user requests an unchanged picture, preserve its encoded video stream
and use a compatible container where the supported tool permits it. Do not
silently transcode it. Put source and dub on an explicit common clock, retaining
nonzero PTS and the intended leading and inter-utterance gaps. A delayed
container start alone is not proof that the dub contains the required silence.

Do not truncate the picture to conceal a short dub. Resolve missing coverage
through utterance fitting or request-appropriate silence padding. Preserve or
mix background audio only as requested. If the upstream operation cannot keep
the picture, coverage, container compatibility or offset requested, report the
unsupported requirement before claiming success.

## Return evidence in the requested format

Retain the upstream exit status, output probe, delivery checks and any required
contact-sheet path and actual inspection result. Interpret them against the
requested edit. File existence or successful decoding alone does not establish
correct cut choices, visual counts or natural speech. Report unresolved timing,
coverage, capability and visual-inspection limits.

Use the user's requested report or file format. The upstream's default report
layout does not override that request; keep its probe/check/look evidence even
when presenting it in a different shape. Do not claim an image was inspected
when no image-viewing tool was available.

## References

- [Upstream ffmpeg-skill](https://github.com/kajisho5/ffmpeg-skill): the loaded
  `SKILL.md`, its conditional references, scripts, templates and MCP contract.
- [Skills CLI use](https://github.com/vercel-labs/skills/blob/main/docs/commands.md#skills-use):
  prompt and complete support-directory loading without an installed skill.
