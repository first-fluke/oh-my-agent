---
title: "Hướng dẫn: Sinh ảnh"
sidebar_label: Sinh ảnh
description: Hướng dẫn đầy đủ về sinh ảnh trong oh-my-agent, gồm điều phối nhiều vendor qua Codex, Pollinations và Antigravity qua Gemini Code Assist, ảnh tham chiếu, guardrail chi phí, layout đầu ra, troubleshooting và pattern gọi dùng chung.
---

# Sinh ảnh

`oma-image` là router ảnh nhiều vendor của oh-my-agent. Nó sinh ảnh từ prompt ngôn ngữ tự nhiên, dispatch tới CLI vendor mà bạn đã xác thực và ghi manifest cạnh output với input cùng quyết định provider cần để audit hoặc lặp lại run. Output provider live vẫn có thể thay đổi.

Skill kích hoạt với các cụm như "generate an image", "create an image", "make a picture", "draw me …" hoặc "image of …", với tên vendor (`gpt-image`, `nano-banana`, `pollinations`), hoặc khi skill khác cần ảnh như một side effect, chẳng hạn hero shot, thumbnail hay product photo.

> **TL;DR** Bạn cần một trong các điều kiện: `POLLINATIONS_API_KEY` (`flux` / `zimage` miễn phí), `codex login` (gpt-image-2 theo gói ChatGPT của bạn), hoặc `agy` đã đăng nhập. Chạy `oma image doctor`, rồi `oma image generate "<prompt>" --vendor pollinations`. Ảnh và `manifest.json` được ghi vào `.agents/results/images/{timestamp}-{shortid}/`.

---

## Khi nào dùng

- Sinh image, illustration, product photo, concept art hoặc visual hero/landing.
- So sánh cùng một prompt qua nhiều model song song (`--vendor all`).
- Tạo asset bên trong bất kỳ runtime nào tải skill oma (Claude Code, Codex CLI, Antigravity, Cursor và các runtime khác).
- Cho skill khác, như design, marketing hoặc docs, gọi image pipeline như shared infrastructure.

## Khi nào KHÔNG dùng

- Chỉnh sửa hoặc retouch ảnh có sẵn, vì ngoài phạm vi; dùng tool chuyên dụng.
- Sinh video hoặc audio, vì ngoài phạm vi.
- Tạo inline SVG hoặc vector composition từ structured data; dùng skill templating.
- Resize hoặc đổi format đơn giản; dùng image library thay cho generation pipeline.

---

## Tổng quan vendor

Skill ưu tiên CLI: khi CLI native của vendor có thể trả raw image bytes, đường subprocess được ưu tiên hơn API key trực tiếp.

| Vendor | Strategy | Models | Trigger | Chi phí |
|---|---|---|---|---|
| `pollinations` | Direct HTTP | Miễn phí: `flux`, `zimage`. Cần credit: `qwen-image`, `wan-image`, `gpt-image-2`, `klein`, `kontext`, `gptimage`, `gptimage-large` | Đã đặt `POLLINATIONS_API_KEY` (đăng ký miễn phí tại [enter.pollinations.ai](https://enter.pollinations.ai)) | Miễn phí với `flux` / `zimage` |
| `codex` | CLI-first qua `codex exec` (ChatGPT OAuth) | `gpt-image-2` | `codex login`, không cần API key | Tính vào gói ChatGPT |
| `antigravity` | CLI `agy` qua thuê bao Gemini Code Assist | Model do `agy` chọn nội bộ | Đã cài và đăng nhập `agy` | Không tính phí từng ảnh qua Code Assist |

Cách `--vendor` chọn vendor cho một run:

| `--vendor` | Vendor được chạy | Thư mục output | Exit 5 khi |
|---|---|---|---|
| `auto` (mặc định) | mọi vendor vượt health check | `{timestamp}-{shortid}-compare/` khi có từ hai vendor trở lên chạy | không vendor nào healthy |
| `all` | mọi vendor được bật | `{timestamp}-{shortid}-compare/` khi có từ hai vendor trở lên chạy | bất kỳ vendor được yêu cầu nào không healthy |
| `codex`, `pollinations` hoặc `antigravity` | vendor đó | `{timestamp}-{shortid}/` | vendor đó không healthy |

Mode vendor tích hợp sẵn là `auto`: nó chạy song song **mọi** provider vượt health check. Truyền `--vendor pollinations` để chỉ dùng đường miễn phí. Model `flux` và `zimage` của Pollinations miễn phí theo ảnh nhưng vẫn cần `POLLINATIONS_API_KEY`; Codex và Antigravity cần đăng nhập riêng. Ước tính có phí vẫn dùng guardrail xác nhận chi phí.

---

## Bắt đầu nhanh

Trước lần sinh đầu tiên, kiểm tra provider sẵn sàng và xác thực một path được hỗ trợ:

```bash
oma image doctor

# Pollinations: create a free account and export its key.
export POLLINATIONS_API_KEY="<pollinations-key>"

# Or authenticate an alternative provider instead.
codex login
# Sign in to Gemini Code Assist for `agy` when using --vendor antigravity.
```

```bash
# Runs every vendor whose health check passes; cost and auth depend on those vendors.
oma image generate "minimalist sunrise over mountains"

# Stay on the free Pollinations path.
oma image generate "minimalist sunrise over mountains" --vendor pollinations

# Run all configured vendors; every selected vendor must be healthy or the command stops.
oma image generate "cat astronaut" --vendor all

# Specific vendor + size + count, skip cost prompt
oma image generate "logo concept" --vendor codex --size 1024x1024 -n 3 -y

# Cost estimate without spending
oma image generate "test prompt" --dry-run

# List registered vendors and their default model (supported models: oma image doctor)
oma image vendor list
```

Một run thành công ở text mode in tiến độ như sau (path chỉ mang tính minh họa):

```text
[oma image] using: pollinations
[oma image] pollinations generating... 5s
[oma image] pollinations ok (7.4s) -> /path/to/project/.agents/results/images/20261014-101500-ab12cd/pollinations-flux-ab12cd.jpg
[oma image] manifest: /path/to/project/.agents/results/images/20261014-101500-ab12cd/manifest.json
```

---

## Dùng như một skill

`oma-image` là skill tự kích hoạt từ ngôn ngữ tự nhiên và cũng có thể gọi tường minh. Có ba entry point.

### 1. Ngôn ngữ tự nhiên (tự kích hoạt)

Trong bất kỳ runtime nào tải skill oma (Claude Code, Codex CLI, Antigravity, Cursor và các runtime khác), chỉ cần mô tả ảnh. Các cụm như "generate an image", "make a picture", "draw me …" hoặc "image of …" sẽ kích hoạt skill; runtime chọn skill theo mô tả cũng có thể dùng skill này cho yêu cầu như "concept art" hoặc "hero shot".

Không cần nhớ CLI flag. Nói bằng ngôn ngữ tự nhiên, skill sẽ ánh xạ sang option phù hợp:

| Bạn nói | Skill suy luận |
|---|---|
| “use codex” / “with gpt-image-2” / “free flux” | `--vendor codex` / `--vendor pollinations` |
| “compare across vendors” / “side by side” | `--vendor all` |
| “portrait” / “landscape” / “1024×1536” | `--size 1024x1536` / `--size 1536x1024` |
| “high quality” / “draft” | `--quality high` / `--quality low` |
| “three variations” / “give me 3” | `-n 3` |
| “save to ./hero” / “output to docs/assets” | `--output-dir <dir>` |
| Ảnh đính kèm + “make it nighttime” | `-r <attached path>` |
| “just estimate the cost” / “dry run” | `--dry-run` |

Ví dụ:

> “Generate a minimalist sunrise over mountains for the landing hero, landscape, high quality.”
> “Compare a ceramic mug product photo across all vendors, three variations each.”
> “Use codex to make this otter photo dramatic and nighttime.” (kèm ảnh tham chiếu)

Agent [xử lý brief](#clarification-protocol), lấp chỗ trống bằng giá trị mặc định rồi gọi `oma image generate` với flag suy luận. Dùng slash command khi muốn kiểm soát trực tiếp giá trị flag.

### 2. Slash command tường minh

```text
/oma-image a red apple on white background
/oma-image --vendor all --size 1536x1024 jeju coastline at sunset
/oma-image -n 3 --quality high --output-dir ./hero "minimalist dashboard hero illustration"
```

Mọi CLI flag (`--vendor`, `-n`, `--size`, `-r`, `--dry-run`, …) đều hoạt động trong slash command và được forward vào cùng pipeline `oma image generate`.

### 3. Từ skill khác (shared infrastructure)

Skill khác, như design, marketing hoặc docs, gọi pipeline như shared infrastructure với JSON output:

```bash
oma image generate "<prompt>" --output json
```

Với `--output json`, stdout là một JSON object `{exitCode, manifestPath, runs}`; mỗi phần tử trong `runs` báo vendor, status và file output. Đọc `manifestPath` để có bản ghi đầy đủ. `--dry-run` in header văn bản `[oma image] dry-run plan:` trước plan, nên hãy bỏ qua dòng đó khi parse.

---

## Tham chiếu CLI

```bash
oma image generate "<prompt>"
  [--vendor auto|codex|pollinations|antigravity|all]
  [-n 1..5]
  [--size WxH|auto]
  [--quality low|medium|high|auto]
  [--output-dir <dir>] [--allow-external-output]
  [-r <path>]...
  [--timeout <duration>] [-y] [--no-prompt-in-manifest]
  [--dry-run] [--output text|json]

oma image doctor
oma image vendor list
```

### Flag chính

| Flag | Mục đích |
|---|---|
| `--vendor <name>` | `auto`, `pollinations`, `codex`, `antigravity` hoặc `all`. Với `all`, mọi vendor được yêu cầu phải healthy, tức strict. |
| `-n, --count <n>` | Số ảnh mỗi vendor, 1 đến 5, bị giới hạn theo wall-time. Mặc định 1. |
| `--size <size>` | `WxH` với mỗi cạnh là bội số của 16 trong khoảng 16 đến 3840 và tỷ lệ khung hình từ 1:3 đến 3:1 (ví dụ `512x512`, `1024x1024`, `1024x1536`, `1536x1024`), hoặc `auto`. Mặc định `1024x1024`. |
| `--quality <level>` | `low`, `medium`, `high` hoặc `auto` (mặc định). |
| `--output-dir <dir>` | Thư mục output; file được ghi thẳng vào đó. Mặc định `.agents/results/images/{timestamp}-{shortid}/`. Path ngoài `$PWD` cần `--allow-external-output`. |
| `--allow-external-output` | Cho phép output directory nằm ngoài `$PWD`. |
| `--model <name>` | Ghi đè model cho **mọi** vendor trong run, nên hãy kết hợp với một `--vendor` (ví dụ `--vendor pollinations --model zimage`). `antigravity` bỏ qua flag này vì `agy` chọn model. |
| `-r, --reference <path>` | Tối đa 10 ảnh tham chiếu (PNG/JPEG/GIF/WebP, ≤ 5 MB mỗi ảnh). Có thể lặp hoặc phân tách bằng comma. Hỗ trợ Codex và Antigravity; Pollinations từ chối. |
| `-y, --yes` | Bỏ qua prompt xác nhận cho run ước tính ≥ `$0.20`. Cũng có thể dùng `OMA_IMAGE_YES=1`. |
| `--no-prompt-in-manifest` | Lưu SHA-256 của prompt thay vì raw text trong `manifest.json`. |
| `--dry-run` | In plan và cost estimate mà không tiêu tiền. |
| `--output text\|json` | Định dạng output CLI. JSON là bề mặt tích hợp cho skill khác. |
| `--timeout <duration>` | Timeout cho từng ảnh. Mặc định 180 giây. |

---

## Ảnh tham chiếu

Đính kèm tối đa 10 ảnh tham chiếu để định hướng style, identity của subject hoặc composition.

```bash
oma image generate -r ~/Downloads/otter.jpeg "same otter in dramatic lighting" --vendor codex
oma image generate -r a.png -r b.png "blend these styles" --vendor antigravity
oma image generate -r a.png,b.png "blend these styles" --vendor antigravity
```

| Vendor | Hỗ trợ tham chiếu | Cách thực hiện |
|---|---|---|
| `codex` (`gpt-image-2`) | Có | Truyền `-i <path>` vào `codex exec` |
| `antigravity` | Có | Copy reference vào thư mục theo run và cấp quyền cho `agy` |
| `pollinations` | Không | Từ chối với exit code 4, cần URL hosting |

### Ảnh đính kèm nằm ở đâu

- **Claude Code:** `~/.claude/image-cache/<session>/N.png`, hiện trong system message dạng `[Image: source: <path>]`. Phạm vi session; muốn dùng lại sau thì copy đến vị trí bền vững.
- **Antigravity:** thư mục upload của workspace, IDE hiển thị path chính xác.
- **Codex CLI làm host:** phải truyền tường minh; attachment trong hội thoại không được forward.

Khi user đính kèm ảnh và yêu cầu sinh hoặc edit dựa trên ảnh đó, agent gọi phải forward qua `--reference <path>` thay vì mô tả bằng prose. Nếu local CLI quá cũ và không hỗ trợ `--reference`, chạy `oma update` rồi retry.

---

## Layout output

Mặc định mỗi run ghi vào một thư mục có timestamp và hash suffix dưới `.agents/results/images/`; với `--output-dir`, file được ghi thẳng vào thư mục đó:

```text
.agents/results/images/
├── 20260424-143052-ab12cd/                 # one vendor ran
│   ├── pollinations-flux-ab12cd.jpg        # -1, -2, ... suffixes when -n > 1
│   └── manifest.json
└── 20260424-143122-7z9kqw-compare/         # two or more vendors ran
    ├── codex-gpt-image-2-7z9kqw.png
    ├── pollinations-flux-7z9kqw.jpg
    ├── antigravity-7z9kqw.jpg              # no model segment: agy picks the model
    └── manifest.json
```

`manifest.json` ghi vendor, model, prompt hoặc SHA-256, size, quality và cost để request có thể audit và lặp lại. Nó không đảm bảo pixel giống hệt provider live.

---

## Chi phí, an toàn và hủy

1. **Guardrail chi phí:** run ước tính ≥ `$0.20` sẽ hỏi xác nhận; nếu không có terminal tương tác, run thoát với code 1 kèm thông báo nêu `--yes`. Bypass bằng `-y` hoặc `OMA_IMAGE_YES=1`. Chỉ `--vendor pollinations` với `flux` / `zimage` chắc chắn miễn phí; `auto` cũng có thể bao gồm Codex đã đăng nhập.
2. **An toàn path:** output path ngoài `$PWD` cần `--allow-external-output` để tránh ghi ngoài ý muốn.
3. **Có thể hủy:** `Ctrl+C` (SIGINT/SIGTERM) hủy mọi provider call đang chạy và orchestrator.
4. **Run record ổn định:** `manifest.json` luôn được ghi cạnh ảnh.
5. **Tối đa `n` = 5:** giới hạn wall-time, không phải quota.
6. **Exit code:** phù hợp với `oma search fetch`: `0` ok, `1` general, `2` safety, `3` not-found, `4` invalid-input, `5` auth-required, `6` timeout.

---

## Cách agent xử lý brief {#clarification-protocol}

Agent dùng những gì bạn nói và lấp chỗ trống bằng giá trị sáng tạo mặc định hợp lý cho bối cảnh, style, ánh sáng và tỷ lệ khung hình. Agent chỉ đặt câu hỏi khi một lựa chọn còn thiếu sẽ làm thay đổi đáng kể kết quả, và không dừng lại chờ duyệt prompt mở rộng khi bạn đã yêu cầu sinh ảnh. Cách diễn đạt tường minh, chữ trên ảnh và ý định dùng ảnh tham chiếu được giữ nguyên như bạn đưa ra.

| Bạn nói | Điều xảy ra |
|---|---|
| “a red apple” | Sinh ngay; agent tự điền bối cảnh, style, ánh sáng và kích thước |
| “a red apple as a flat vector icon, 512x512” | Style và kích thước của bạn được dùng đúng như đã nêu |
| “something for the homepage” | Một câu hỏi về chủ thể, vì nó làm thay đổi kết quả |

Để xem chính xác nội dung đã gửi tới provider, kiểm tra field `prompt` trong `manifest.json` (lưu dưới dạng SHA-256 khi dùng `--no-prompt-in-manifest`).

---

## Cấu hình

- **Project config:** section `image:` của `.agents/oma-config.yaml`. Legacy `config/image-config.yaml` không còn được đọc.
- **Biến môi trường:**
  - `OMA_IMAGE_DEFAULT_VENDOR`: ghi đè vendor mặc định đã cấu hình (`auto`). Bản thân flag `--vendor` mặc định là `auto`, nên hãy truyền `--vendor` cho từng lệnh khi cần một vendor cụ thể.
  - `OMA_IMAGE_DEFAULT_OUT`: ghi đè output directory mặc định.
  - `OMA_IMAGE_YES`: `1` để bypass xác nhận chi phí.
  - `POLLINATIONS_API_KEY`: bắt buộc cho vendor Pollinations, đăng ký miễn phí.

---

## Troubleshooting

| Triệu chứng | Nguyên nhân khả năng | Cách khắc phục |
|---|---|---|
| Exit code `5` (auth-required) | Vendor đã chọn chưa được xác thực | Chạy `oma image doctor` để xem vendor cần đăng nhập, rồi `codex login`, đăng nhập `agy` hoặc đặt `POLLINATIONS_API_KEY`. |
| Exit code `4` ở `--reference` | Pollinations từ chối reference, hoặc file quá lớn/sai format | Chuyển sang `--vendor codex` hoặc `--vendor antigravity`. Mỗi reference tối đa 5 MB và phải là PNG/JPEG/GIF/WebP. |
| Không nhận diện `--reference` | Local CLI đã cũ | Chạy `oma update` rồi retry, không fallback về mô tả prose. |
| Xác nhận chi phí chặn automation | Run ước tính ≥ `$0.20` | Truyền `-y` hoặc đặt `OMA_IMAGE_YES=1`; có thể chuyển sang Pollinations miễn phí. |
| `--vendor all` abort ngay | Một vendor yêu cầu chưa healthy, do strict mode | Cài/đăng nhập vendor thiếu hoặc chọn `--vendor` cụ thể. |
| Output ghi nhầm thư mục | Mặc định là `.agents/results/images/{timestamp}-{shortid}/` | Truyền `--output-dir <dir>`. Path ngoài `$PWD` cần `--allow-external-output`. |
| `--out path "…" is outside $PWD. Use --allow-external-out to override.` (exit 1) | `--output-dir` trỏ ra ngoài project | Chạy lại với `--allow-external-output` (thông báo vẫn hiển thị tên flag cũ), hoặc chọn thư mục bên trong project. |
| Nhiều vendor cùng chạy và thư mục kết thúc bằng `-compare` | `--vendor auto` chạy mọi vendor healthy | Truyền một `--vendor` để chỉ chạy một vendor. |
| Antigravity fail dù health pass | `agy --version` chỉ chứng minh đã cài, không chứng minh đã đăng nhập | Đăng nhập Gemini Code Assist, rồi thử lại với `oma image doctor` và `--vendor antigravity`. |

---

## Bước tiếp theo

- [Tạo video](./video-generation.md): `oma-video` dùng lại `oma-image` làm visual provider
- [Workflow nội dung và nghiên cứu](./content-and-research.md): các khả năng nội dung khác và điều kiện tiên quyết của chúng
- [Skills](../core-concepts/skills.md): kiến trúc skill hai tầng cấp năng lượng cho `oma-image`
- [CLI Commands: image](../cli-interfaces/commands.md#image): tham chiếu lệnh `oma image` đầy đủ
- [CLI Options](../cli-interfaces/options.md): ma trận option toàn cục
