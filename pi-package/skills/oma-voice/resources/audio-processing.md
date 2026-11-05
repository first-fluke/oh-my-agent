# Existing Audio and Timed Speech

Load for conversion, speech duration fitting, loudness processing, or dubbing
audio. These are local FFmpeg operations, not new `oma` CLI subcommands.
Video cuts and placement belong to `oma-video`.

## Source and targets

Keep the source and raw TTS generation. Write separate working/output files
under the requested destination or `.agents/results/voice/<run>/`. Use
`ffmpeg -n` to avoid replacing an unrelated output.

Inspect the audio stream before selecting operations:

```bash
ffprobe -v error -select_streams a:0 \
  -show_entries stream=codec_name,sample_rate,channels,start_time,duration:format=duration \
  -of json "$INPUT"
```

Use the brief's time window, channel layout, sample rate, and delivery profile.
If no conversion is requested, preserve those properties. Keep source stream
offsets when handing audio to a video timeline. A container duration can include
other streams or padding; use decoded audio duration for speech fitting.

## Generating speech for a window

Resolve an available language-capable Voicebox profile before synthesizing.
Run host-local Voicebox calls on the host, even when the media work is in a
container; transfer the fetched WAV into that workspace. A failed container
loopback probe is not evidence that the host service is unavailable. Do not
launch the app, expose its port, download a model, or substitute a provider
outside existing authorization.

Measure the raw utterance, including its audible beginning and ending. Prefer
generation pacing appropriate to the window before stretching the waveform.
Changing the transcript, repeating words, or truncating speech is not duration
control unless the user requested those edits.

For a modest pitch-preserving adjustment, set `TEMPO` to raw speech duration
divided by target speech duration. Use the duration of the actual input WAV:
if leading/trailing silence has been removed, point `INPUT` at that trimmed
working copy before calculating the ratio. Do not use an unpadded duration
with a file that still contains padding.

```bash
ffmpeg -hide_banner -n -i "$INPUT" -map 0:a:0 \
  -af "atempo=${TEMPO},asetpts=PTS-STARTPTS" \
  -c:a pcm_f32le "$FITTED_WAV"
```

For ratios outside one filter's useful range, compose supported `atempo`
factors rather than replacing sample-rate metadata. Large changes can still
damage pronunciation and rhythm: change generation pacing or retain the
unresolved timing constraint instead of forcing a fit. Only trim identified
leading/trailing silence; pad unused time with silence after speech ends.
Keep a segment's unpadded speech duration distinct from its timeline slot.

When choosing pacing or processing parameters, compare the raw and processed
speech through an available audio inspection tool, focusing on pronunciation,
rhythm, and clipped beginnings/endings. Engine names, pitch variation, ASR
agreement, and loudness measurements do not establish naturalness. If speech
quality cannot be assessed, state that limit. Preserve the raw asset so a
different setting can be tried without repeated lossy encodes.

## Loudness and format

Apply only a requested or stated delivery profile. Set `TARGET_I`,
`TARGET_LRA`, `TARGET_TP`, `SAMPLE_RATE`, and `CHANNELS` from that profile.
Measure the actual fitted/edited input, not a different raw generation:

```bash
ffmpeg -hide_banner -nostats -i "$INPUT" -map 0:a:0 \
  -af "loudnorm=I=${TARGET_I}:LRA=${TARGET_LRA}:TP=${TARGET_TP}:print_format=json" \
  -f null - 2> "$LOUDNESS_LOG"
```

Use the final JSON block's `input_i`, `input_lra`, `input_tp`, `input_thresh`,
and `target_offset` as the corresponding `MEASURED_*` and `OFFSET` values:

```bash
ffmpeg -hide_banner -n -i "$INPUT" -map 0:a:0 \
  -af "loudnorm=I=${TARGET_I}:LRA=${TARGET_LRA}:TP=${TARGET_TP}:measured_I=${MEASURED_I}:measured_LRA=${MEASURED_LRA}:measured_TP=${MEASURED_TP}:measured_thresh=${MEASURED_THRESH}:offset=${OFFSET}:linear=true:print_format=json" \
  -ar "$SAMPLE_RATE" -ac "$CHANNELS" -c:a pcm_s24le "$OUTPUT_WAV" \
  2> "$NORMALIZATION_LOG"
```

Do not pass non-finite measurements from a silent asset into the second pass
or amplify silence into a replacement voice. FFmpeg can fall back to dynamic
normalization when linear-mode conditions are not met; record the actual
mode and measured result. Set the output sample rate explicitly because the
normalizer can change it. Encode the requested delivery format once from
the PCM working asset; do not repeatedly transcode a lossy result.

## Handoff and recovery

Pass the processed audio and its intended position to `oma-video` for muxing.
A shorter audio file must not shorten the original video automatically.
For basic conversion, no TTS profile, transcript, or model is needed.

Persist `manifest.json` with `skill: "oma-voice"`, `mode: "process"`,
`source_path`, `output_path`, `operations` and their parameters,
`duration_sec`, `sample_rate_hz`, `channels`, and `created_at`. Include
Voicebox generation/profile/engine identifiers only when they are real.
Record requested constraints that could not be met without changing speech.

| Failure mechanism | Recovery |
|---|---|
| Timing correction changes pitch | Use pitch-preserving tempo processing; do not relabel the sample rate |
| Speech sounds distorted after fitting | Return to the raw utterance and adjust pacing or the allowed window |
| Silence gives infinite loudness measurements | Stop normalization of that input; locate the missing or silent source |
| An asset plays but its duration differs from its report | Read duration and stream properties from the actual output file |
| Voicebox is unreachable but an input WAV exists | Process the WAV locally; resolve synthesis availability only if new speech is needed |

## Command reference

- [FFmpeg atempo](https://ffmpeg.org/ffmpeg-filters.html#atempo)
- [FFmpeg loudnorm](https://ffmpeg.org/ffmpeg-filters.html#loudnorm)
- [FFprobe options](https://ffmpeg.org/ffprobe.html)
