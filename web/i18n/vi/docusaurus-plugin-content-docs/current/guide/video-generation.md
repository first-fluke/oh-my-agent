---
title: "Hướng dẫn: Tạo video"
sidebar_label: Tạo video
description: Hướng dẫn đầy đủ về tạo video oh-my-agent — router ba tầng không bắt buộc key, kết hợp script, narration, visual, caption và HyperFrames compositor được quản lý vào các run directory có thể tái lập cho shorts, explainer và demo.
---

# Tạo video {#video-generation}

`oma-video` là video router của oh-my-agent. Từ một brief một dòng, nó kết hợp script, narration, visual và caption, sau đó ghi plan vào run directory. Provider stage không bắt buộc key và có thể dùng fallback local hoặc deterministic; MP4 thật vẫn cần compositor hoạt động và composition hợp lệ.

Skill tự kích hoạt với keyword như *video*, *shorts*, *reels*, *explainer*, *demo*, *walkthrough*, *screencast*, hoặc khi skill khác cần video làm side effect.

---

## Khi nào nên dùng {#when-to-use}

- Biến brief, README, code hoặc data thành clip ngắn.
- Tạo narrated explainer hoặc demo/walkthrough recording.
- Bất kỳ pipeline tái lập nào dạng “brief → `.mp4`” muốn chạy lại xác định.

## Khi nào KHÔNG nên dùng {#when-not-to-use}

- Ảnh still đơn lẻ → dùng [`oma-image`](/docs/guide/image-generation).
- Live screen broadcast / streaming → ngoài phạm vi (capture được giám sát, không stream).
- Audio narration độc lập → dùng `oma-voice`.

---

## Các mode nhìn nhanh {#modes-at-a-glance}

| Mode | Aspect | Nó kết hợp gì |
|------|--------|------------------|
| `shorts` | 9:16 | Clip dọc short-form (script → narration → visual → caption). |
| `explainer` | 16:9 | Explainer ngang từ README, code hoặc data brief. |
| `demo` | derived | Walkthrough từ recording do người dùng cung cấp qua `--capture`; `--source web --url` cung cấp context cho headed capture được giám sát và không bao giờ tự động login. |

Mode chọn mặc định hợp lý; truyền flag liên quan khi cần giá trị khác.

---

## Bắt đầu nhanh {#quick-start}

```bash
# Key-optional short — script, captions, and a local render when the toolchain is ready
oma video generate "three quick tips for better focus" --mode shorts -y

# 16:9 explainer in Korean
oma video generate "what oh-my-agent does" --mode explainer --aspect 16:9 --locale ko -y

# Demo from a human recording (you control login and capture)
oma video generate "product walkthrough" --mode demo --capture ./capture.mp4 --polish
```

Mỗi run in run directory của nó. `--seed` cố định input planning deterministic; live provider output và capture footage vẫn có thể thay đổi. Render lại run directory hiện có khi cần dùng lại render spec và asset đã lưu.

Tool khác gọi shell tới `oma video generate --output json` sẽ parse JSON envelope từ stdout: `{exitCode, runDir, manifestPath, scriptPath, renderSpecPath, warnings, error}`. Không có key `outputs` — đọc output/asset path từ manifest tại `manifestPath`.

---

## Tham chiếu CLI {#cli-reference}

```
oma video generate <brief...> [options]
oma video doctor [--install|--upgrade|--install-mpt|--install-strudel]  # toolchain readiness / provisioning
oma video compose <runDir>       # prepare HTML project and authoring contract
oma video render <runDir>        # re-render from render-spec.json (deterministic)
oma video provider list         # provider availability + key/fallback status
```

### Flag chính {#key-flags}

| Flag | Mục đích |
|------|---------|
| `--mode <m>` | `shorts` \| `explainer` \| `demo`. |
| `--aspect <a>` | `9:16` \| `16:9` \| `1:1` \| `auto`. |
| `--locale <lang>` | Language tag của narration/caption. |
| `--captions <s>` | `tiktok` \| `lower-third` \| `none` (alignment không cần key). |
| `--visual <m>` | `auto` \| `generate` \| `stock` \| `aigc` \| `slide`. |
| `--voice <profile>` | Narration voice hoặc `none` (mặc định; bỏ qua để video silent với caption timing ước tính). |
| `--music <mode>` | `upbeat`, `calm`, `cinematic`, `lofi`, `piano` hoặc `none`. |
| `--compositor <c>` | `hyperframes` (mặc định) \| `mpt`. |
| `--capture <path>` | Recording path input cho demo mode (`--source file`). |
| `--source <k>` | Demo capture source: `file` hoặc `web` (mặc định: `file`). |
| `--url <url>` | URL đích cho `--source web` (local, staging hoặc production); không thay thế `--capture` khi cần recording. |
| `--device <name>` | Device frame cho web capture; ghi đè aspect sizing. |
| `--ready-selector <css>` | CSS selector cần chờ trước web capture. |
| `--show-cursor` | Overlay cursor thấy được trong web capture. |
| `--polish` | Overlay HyperFrames composition lên footage đã capture. |
| `--capture-timeout <sec>` | Hard ceiling cho live web capture. |
| `--capture-stop <mode>` | Stop không tương tác cho CI: `duration:<sec>` hoặc `selector:<css>`. |
| `--output-dir <path>` | Output base directory. Paths outside `$PWD` require `--allow-external-output`. |
| `--allow-external-output` | Permit output paths outside `$PWD`. |
| `--max-usd <n>` | Maximum estimated cost before confirmation. |
| `--duration <sec>` | Target length, or `auto`. |
| `--seed <n>` | Deterministic seed. |
| `--dry-run` | Emit script / render-spec / manifest, skip rendering. |
| `--script <path>` | Agent-authored `script.json` để inject (ghi đè skeleton; điều khiển narration, on-screen text và visual prompt theo scene). |
| `-y, --yes` | Bỏ qua cost-confirmation prompt. |
| `--output <f>` | CLI output: `text` (mặc định) hoặc `json`. |
| `--no-brief-in-manifest` | Lưu SHA-256 của brief thay vì brief thô. |

---

## Provider không bắt buộc key {#key-optional-providers}

Provider stage resolve tới **real branch** và, khi stage hỗ trợ, **deterministic fallback**. Key thiếu vì vậy vẫn có thể để planned run với timing ước tính hoặc asset local. Compositor là final stage bắt buộc và không có placeholder fallback thông thường:

| Capability | Real branch | Fallback |
|------------|-------------|----------|
| script | LLM khi có key | outline xác định từ brief |
| voice | `oma-voice` (Voicebox, local) | timing ước tính, không audio |
| visual | `oma-image` / `oma-slide` / stock | placeholder asset |
| caption | forced alignment không cần key | word timing ước tính |
| capture | supervised browser web capture (`--source web`) hoặc recording cung cấp (`--source file --capture`) | guided protocol “tự record” |
| compositor | HyperFrames (được quản lý) hoặc MoneyPrinterTurbo | không có compositor fallback; run thất bại kèm diagnostics |

Không tự động hóa credential: người dùng thực hiện mọi login trên màn hình trong lúc capture; URL và query token được mask trong log và manifest.

Caption render dưới dạng **static windowed cue** — một caption line hoạt động ở frame hiện tại, được CSS wrap, không có per-word animation.

---

## Toolchain và `doctor` {#toolchain-and-doctor}

Heavy toolchain (`node_modules` của project HyperFrames được quản lý, Pretendard font nhúng, MoneyPrinterTurbo checkout, capture browser, Chrome Headless Shell) được **provision on demand**, không ship trong package. Plain `doctor` chỉ report — không cài gì:

```bash
oma video doctor
```

Nó báo cáo `node`, `chromium`, `ffmpeg`, `ffprobe`, `hyperframes-toolchain`, `hyperframes-skills`, `pretendard-font`, `mpt-project`, `voicebox`, `oma-image`, `pixelle` và `cap`, đồng thời in install hint cho thứ còn thiếu. Baseline yêu cầu Node.js 22+, HyperFrames toolchain cùng Chrome browser của nó, FFmpeg/FFprobe và `oma-image`. MP4 thật còn cần HTML đã được author.

Dùng install flag để provision toolchain:

```bash
oma video doctor --install             # warm the latest HyperFrames toolchain + Chrome Headless Shell + Pretendard + heygen-com/hyperframes
oma video doctor --upgrade             # force a latest-version check now
oma video doctor --install-mpt         # MoneyPrinterTurbo checkout (clone + venv + deps) for --compositor mpt
```

`--install` cũng fetch Pretendard font nhúng (pinned release) vào shared toolchain cache — đây là một phần của determinism boundary. Khi network failure, command cảnh báo và render fallback sang system font; khác biệt về browser và OS vẫn có thể ảnh hưởng đến output đã encode.

---

## Bố cục output {#output-layout}

```
.agents/results/videos/{timestamp}-{shortid}-{mode}/
├── script.json          # scenes + narration
├── render-spec.json     # the deterministic render contract
├── timing.json          # per-segment timing (voicebox-stt or estimated)
├── captions.srt / .vtt
├── audio/narration-*.wav
├── visuals/scene-*.{png,svg,…}
├── hyperframes/         # index.html, AUTHORING.md, local assets and toolchain link
├── {mode}-{slug}.mp4    # the rendered output (slug derived from the script title)
└── manifest.json        # providers, assets, cost, warnings
```

`render-spec.json` + asset là determinism boundary; live capture được ghi là `nondeterministic` trong manifest.

---

## Khắc phục sự cố {#troubleshooting}

| Triệu chứng | Nguyên nhân / cách sửa |
|---------|-------------|
| Không tạo MP4 | Compositor, composition hoặc toolchain check thất bại. Chạy `oma video doctor`, sau đó `oma video compose <runDir>` và sửa composition được báo trước khi chạy lại `oma video render <runDir>`. |
| Narration im lặng (`source: estimated`) | Voicebox không truy cập được; khởi động `oma-voice` server hoặc chấp nhận timing ước tính. |
| `--source web` in guided protocol thay vì record | Không có TTY hoặc browser capture runtime không khả dụng → guided fallback. Dùng interactive terminal với capture runtime đã provision và `--capture-stop`, hoặc truyền file đã record bằng `--capture`. |
| Render chậm ở lần đầu | HyperFrames browser / MPT checkout đang được provision một lần; run sau dùng lại cache. |

---

## HyperFrames luôn mới nhất — bạn author composition {#always-latest-hyperframes-you-author-the-composition}

oh-my-agent **không ship HyperFrames composition code**. Mỗi run có project riêng tại `<runDir>/hyperframes/`, được scaffold bởi `oma video compose` trên npm HyperFrames mới nhất (toolchain cache `~/.cache/oma-video/hyperframes/<version>/`, dùng chung qua symlink `node_modules`) cùng [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) tại HEAD (`~/.cache/oma-video/hyperframes-skills/`). Agent author generated composition source theo `AUTHORING.md` của scaffold, skill và mode spec trong `.agents/skills/oma-video/resources/hyperframes-authoring/`.

```bash
oma video generate "…"                     # → render-spec.json + <runDir>/hyperframes/ (composition pending)
oma video compose <runDir> --output json   # refresh scaffold / print the contract (idempotent)
#   author hyperframes/index.html as instructed by AUTHORING.md
oma video render <runDir> --output json    # lint → npx hyperframes render → ffprobe; exit 1 on any failure
```

- Latest-version check (npm + GitHub) bị giới hạn bởi `video.hyperframes.check_interval_min` (mặc định 60; `0` = mỗi compose). `oma update` tuân theo interval; `oma video doctor --upgrade` force check; offline run dùng cached toolchain và báo `stale`.
- Tính tái lập nằm trong run dir: `render-spec.json`, authored composition source và toolchain version ghi trong generated HyperFrames package metadata. Render lại cùng run dùng lại render contract; run mới kiểm tra HyperFrames mới nhất.
- Lint hoặc render failure **không** bị che bằng placeholder (chỉ tồn tại khi `OMA_VIDEO_MOCK=1`): `oma video render` thoát 1 kèm diagnostics và agent sửa composition bằng skill mới nhất. Hỏng trên HyperFrames release mới là composition bug, không phải lý do pin.

```yaml
video:
  hyperframes:
    check_interval_min: 60    # 0 = check on every compose
```

## Liên quan {#related}

- [`/video` workflow](/docs/core-concepts/workflows) — pipeline brief → script → asset → render-spec → HyperFrames.
- [Tạo hình ảnh](/docs/guide/image-generation) — still-image router được dùng lại như video visual provider.
