# Existing Video Analysis and Editing

Use this branch for an existing clip. Work in a new run directory; retain the
source. The commands below use `input`, `run_dir`, and `output` as shell variables
set to the actual paths. Numeric parameters come from the request or the source
analysis described below, not from a preferred output count or duration.

## Inspect the source timeline

```bash
ffprobe -v error -show_format -show_streams -of json "$input" \
  > "$run_dir/source.json"
ffprobe -v error -select_streams v:0 -show_frames \
  -show_entries frame=pts_time,best_effort_timestamp_time,key_frame,pict_type \
  -of json "$input" > "$run_dir/source-frames.json"
```

Use the actual stream indexes, rotation, dimensions, time bases, start times,
channel layout, and duration. Do not infer frame timestamps from frame number
divided by nominal FPS: variable-rate sources and nonzero starts break that
conversion. Keep source PTS alongside any time measured from the clip's start.
For audio/video edits, express both streams on one source timeline; preserve
their relative start offset. A detector's resampled audio clock must be mapped
back to that timeline before applying its intervals to the video.

## Extract and analyze frames

Choose the requested sampling definition before extracting:

| Definition | Selection | What it measures |
|---|---|---|
| Codec keyframes | Decoder key-frame marking (`-skip_frame nokey` before `-i`) | Random-access frames; encoding-dependent |
| I-pictures | `select='eq(pict_type,I)'` | Intra-coded pictures; not necessarily random-access frames |
| Scene changes | `select='gt(scene,SCENE_SCORE)'` | Visual-change candidates; threshold depends on source |
| Time sampling | `select='isnan(prev_selected_t)+gte(t-prev_selected_t,INTERVAL_SEC)'` | First source frame followed by frames at least the interval apart |

Codec keyframes, scene changes, and time samples are different sets. If the
request uses "key frames" ambiguously and the choice changes the deliverable,
resolve that definition. Otherwise state the selected method. A requested exact
timestamp grid needs nearest-source-frame selection against the PTS inventory;
the interval expression above does not promise that grid.

Set `media_select` to the selected `select=...` expression after substituting
numeric parameters. For decoder keyframes use `media_select=showinfo`, add
`-skip_frame nokey` before `-i`, and omit the extra `,showinfo` below.

```bash
ffmpeg -n -copyts -i "$input" -map 0:v:0 -an \
  -vf "${media_select},showinfo" -fps_mode passthrough \
  "$run_dir/frame-%06d.png" 2> "$run_dir/frames.log"
```

Associate each output file with the corresponding `showinfo` frame and source
PTS; image numbering alone carries no timing. Preserve the selection expression
and parameters with that mapping. The number of extracted frames follows the
chosen method and clip, rather than an expected answer size.

For visual counts, run the available vision tool on the actual selected images.
Record counts per source timestamp and mark occluded or uncertain instances.
Distinguish visible instances in one frame from unique identities across time;
the latter needs tracking or explicit identity matching. Never sum frame counts
to claim a unique-object total. Sparse samples cannot establish that an event
never appeared between them; refine the relevant time range when that is the
question. If detection is unavailable, retain the frames and report the missing
analysis rather than manufacture counts.

## Select silence or speech cuts

Amplitude-based silence, absence of speech, and unwanted content are separate
criteria. Music can be loud without speech; speech can be quiet; a pause can
carry a meaningful visual event. Use the user's criterion to decide which
intervals are removable. A long introduction is not automatically removable.

For amplitude candidates, choose `noise_db` from the requested threshold or
measured room tone and quiet speech, and `min_silence_sec` from the requested
pause policy. Inspect channels separately when one channel contains speech
that a downmix could mask. This command analyzes the selected audio stream:

```bash
ffmpeg -copyts -i "$input" -map 0:a:0 -vn \
  -af "silencedetect=noise=${noise_db}dB:duration=${min_silence_sec}" \
  -f null - 2> "$run_dir/silence.log"
```

If the source has no audio stream, report that absence; it supplies no silence
measurements. For speech-driven cuts, use an available VAD or transcription
provider that actually returns timed regions. `oma-voice` transcription may
return only text; check the discovered tool's response before using it as a
timing source. Do not invent word or segment times. Keep the model, channel,
sample rate, thresholds, and time-origin conversion with the intervals.
Missing transcript words are not evidence of silence. A second detector is
useful only for resolving a concrete ambiguity, not for increasing the cuts.

Reconcile candidate intervals as part of constructing the edit:

1. Convert detector results to source time, clip them to media bounds, sort
   them, and merge overlapping intervals of the same classification. Close an
   open trailing silence at the actual audio end; missing audio beyond that end
   is not measured silence.
2. Expand speech regions by context padding appropriate to the request and
   pronunciation, bounded by the source. Subtract these protected regions from
   amplitude candidates so breaths and word boundaries are not clipped merely
   because they are quiet.
3. Where VAD, level detection, or visible context disagree, listen to the disputed
   interval with its adjacent phrase and inspect the corresponding video.
   Retain it when the evidence cannot establish the requested removal criterion;
   record the unresolved interval. Detector agreement alone does not establish
   that background sound or a visual pause is unwanted.
4. Apply the requested minimum removal length after reconciling overlaps and
   context. Form the keep intervals as the ordered complement of the accepted
   removals. Save both interval lists and the reason for each removal so the
   resulting time mapping can be used for captions and other tracks.

## Apply one edit timeline to video and audio

For accurate cuts, decode and re-encode both selected streams with the same
keep intervals. Applying `silenceremove` only to audio shifts it against the
unchanged video. Stream-copy seeking is constrained by codec access points and
is unsuitable when the requested boundary lies between them.

The example below retains two intervals `[start0,end0)` and `[start1,end1)` on
the input timeline exposed by FFmpeg. Set those values from the accepted keep
list. For a source with nonzero timestamps, explicitly retain them with
`-copyts` and use source PTS boundaries, or record the common offset used to
normalize them. Do not independently erase the streams' initial offsets.

```bash
ffmpeg -n -i "$input" -filter_complex \
  "[0:v:0]split=2[vi0][vi1];[0:a:0]asplit=2[ai0][ai1];
   [vi0]trim=start=${start0}:end=${end0},setpts=PTS-${start0}/TB[v0];
   [ai0]atrim=start=${start0}:end=${end0},asetpts=PTS-${start0}/TB[a0];
   [vi1]trim=start=${start1}:end=${end1},setpts=PTS-${start1}/TB[v1];
   [ai1]atrim=start=${start1}:end=${end1},asetpts=PTS-${start1}/TB[a1];
   [v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]" \
  -map '[v]' -map '[a]' -fps_mode vfr \
  -c:v libx264 -pix_fmt yuv420p -c:a aac "$output"
```

This example assumes both streams cover the intervals and the chosen cut
boundaries align with their actual frame/sample timestamps. It subtracts one
common boundary from both streams rather than shifting each stream's first
retained packet independently. For an arbitrary boundary, select actual source
frame/sample boundaries or explicitly represent the gap with padding before
concat, whose segments must start at zero. Likewise pad a late-starting or
early-ending stream while preserving its relative offset; resetting its first
available sample to zero would erase the gap. Record any boundary adjustment
and its frame/sample precision. Adapt the
number of branches to the keep list; for a video without audio use `a=0` and
omit audio branches. Empty keep lists require an explicit empty-result decision.
Choose installed codecs and a compatible container. Additional requested audio
or subtitle tracks need the same edit mapping rather than silently dropping or
retaining their old timing.

## Assemble a dubbed clip

Use `oma-voice` for transcription, synthesis, and utterance fitting, and
`oma-translation` when a spoken translation is needed. Obtain interval timing
from the supplied timeline or a provider that returns it; plain transcript text
has no timing. Return the fitted audio to this branch. When the user asks to
preserve the picture, map the source video
explicitly and copy its encoded stream:

```bash
ffmpeg -n -i "$input" -i "$dub_audio" \
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac "$output"
```

This example uses a zero-based source timeline and a zero-based dub track.
Leading and inter-utterance silence are actual audio samples in the track,
not merely a delayed container start timestamp. For nonzero source/dub PTS,
first map both inputs to an explicit common clock and apply the intended
offset; default input normalization can otherwise remove that delay.
Do not add `-shortest` to conceal a short dub: it can truncate the picture.
Resolve missing coverage through utterance fitting or request-appropriate
silence padding. Preserve or mix background audio only as requested. If the
container cannot carry the source video codec, choose a compatible container
or report the need for transcoding before claiming the picture was preserved.

Media file existence does not establish decodeability or content accuracy.
For an edited result, `ffprobe` exposes its actual streams and timing, while
`ffmpeg -v error -i "$output" -map 0:v:0 -map '0:a?' -f null -` exposes decode
errors. Interpret those observations against the operation performed; successful
decoding does not prove visual counts, speech naturalness, or correct cut choices.

## Tool references

- [FFprobe output sections](https://ffmpeg.org/ffprobe.html#Main-options): stream,
  frame, and JSON inventory.
- [FFmpeg select](https://ffmpeg.org/ffmpeg-filters.html#select_002c-aselect),
  [showinfo](https://ffmpeg.org/ffmpeg-filters.html#showinfo), and
  [silencedetect](https://ffmpeg.org/ffmpeg-filters.html#silencedetect): selection,
  timestamps, and amplitude candidates.
- [FFmpeg trim](https://ffmpeg.org/ffmpeg-filters.html#trim),
  [atrim](https://ffmpeg.org/ffmpeg-filters.html#atrim),
  [setpts/asetpts](https://ffmpeg.org/ffmpeg-filters.html#setpts_002c-asetpts), and
  [concat](https://ffmpeg.org/ffmpeg-filters.html#concat): interval assembly.
- [FFmpeg stream selection](https://ffmpeg.org/ffmpeg.html#Stream-selection) and
  [timestamp options](https://ffmpeg.org/ffmpeg.html#Advanced-options): explicit
  mapping, stream copy, and time handling.
