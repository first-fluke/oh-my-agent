---
title: "Hướng dẫn: Sinh ảnh"
description: Hướng dẫn đầy đủ về sinh ảnh trong oh-my-agent — điều phối đa vendor qua Codex (gpt-image-2), Pollinations (flux/zimage, miễn phí) và Gemini, cùng với ảnh tham chiếu, guardrail chi phí, layout đầu ra, troubleshooting và pattern gọi dùng chung.
---

# Sinh ảnh

`oma-image` là router ảnh đa vendor cho oh-my-agent. Nó sinh ảnh từ prompt ngôn ngữ tự nhiên, điều phối đến CLI vendor mà bạn đã xác thực, và ghi một manifest tất định cạnh đầu ra để mọi lần chạy đều có thể tái lập.

Skill tự kích hoạt khi gặp các từ khóa như *image*, *illustration*, *visual asset*, *concept art*, hoặc khi một skill khác cần ảnh như side-effect (hero shot, thumbnail, ảnh sản phẩm).

---

## Khi nào dùng

- Sinh ảnh, illustration, ảnh sản phẩm, concept art, hero/landing visual
- So sánh cùng một prompt qua nhiều model song song (`--vendor all`)
- Tạo asset từ trong workflow của editor (Claude Code, Codex, Gemini CLI)
- Để skill khác (design, marketing, docs) gọi pipeline ảnh như hạ tầng dùng chung

## Khi nào KHÔNG dùng

- Chỉnh sửa hoặc retouch ảnh có sẵn — ngoài phạm vi (dùng công cụ chuyên dụng)
- Sinh video hoặc audio — ngoài phạm vi
- Sinh SVG inline / vector composition từ dữ liệu có cấu trúc — dùng skill templating
- Resize / chuyển định dạng đơn giản — dùng thư viện ảnh, không phải pipeline sinh ảnh

---

## Nhìn nhanh các vendor

Skill ưu tiên CLI: khi CLI native của vendor có thể trả về raw image bytes, đường subprocess được ưu tiên hơn so với API key trực tiếp.

| Vendor | Strategy | Models | Trigger | Chi phí |
|---|---|---|---|---|
| `pollinations` | HTTP trực tiếp | Miễn phí: `flux`, `zimage`. Cần credit: `qwen-image`, `wan-image`, `gpt-image-2`, `klein`, `kontext`, `gptimage`, `gptimage-large` | Đã đặt `POLLINATIONS_API_KEY` (đăng ký miễn phí tại https://enter.pollinations.ai) | Miễn phí cho `flux` / `zimage` |
| `codex` | Ưu tiên CLI — `codex exec` qua ChatGPT OAuth | `gpt-image-2` | `codex login` (không cần API key) | Tính vào gói ChatGPT của bạn |
| `gemini` | Ưu tiên CLI → fallback API trực tiếp | `gemini-2.5-flash-image`, `gemini-3.1-flash-image-preview` | `gemini auth login` hoặc `GEMINI_API_KEY` + billing | Tắt mặc định; cần billing |

`pollinations` là vendor mặc định vì `flux` / `zimage` miễn phí, nên việc tự kích hoạt theo từ khóa là an toàn.

---

## Quick Start

```bash
# Free, zero-config — uses pollinations/flux
oma image generate "minimalist sunrise over mountains"

# Compare every authenticated vendor in parallel
oma image generate "cat astronaut" --vendor all

# Specific vendor + size + count, skip cost prompt
oma image generate "logo concept" --vendor codex --size 1024x1024 -n 3 -y

# Cost estimate without spending
oma image generate "test prompt" --dry-run

# Inspect authentication and install status per vendor
oma image doctor

# List registered vendors and the models each one supports
oma image list-vendors
```

`oma img` là alias cho `oma image`.

---

## Slash Command (Trong editor)

```text
/oma-image a red apple on white background
/oma-image --vendor all --size 1536x1024 jeju coastline at sunset
/oma-image -n 3 --quality high --out ./hero "minimalist dashboard hero illustration"
```

Slash command được forward đến cùng pipeline `oma image generate` — mọi flag CLI đều hoạt động ở đây.

---

## CLI Reference

```bash
oma image generate "<prompt>"
  [--vendor auto|codex|pollinations|gemini|all]
  [-n 1..5]
  [--size 1024x1024|1024x1536|1536x1024|auto]
  [--quality low|medium|high|auto]
  [--out <dir>] [--allow-external-out]
  [-r <path>]...
  [--timeout 180] [-y] [--no-prompt-in-manifest]
  [--dry-run] [--format text|json]

oma image doctor
oma image list-vendors
```

### Flag chính

| Flag | Mục đích |
|---|---|
| `--vendor <name>` | `auto`, `pollinations`, `codex`, `gemini`, hoặc `all`. Với `all`, mọi vendor được yêu cầu đều phải xác thực (strict). |
| `-n, --count <n>` | Số ảnh mỗi vendor, 1–5 (giới hạn theo wall-time). |
| `--size <size>` | Tỷ lệ: `1024x1024` (vuông), `1024x1536` (dọc), `1536x1024` (ngang), hoặc `auto`. |
| `--quality <level>` | `low`, `medium`, `high`, hoặc `auto` (mặc định của vendor). |
| `--out <dir>` | Thư mục đầu ra. Mặc định `.agents/results/images/{timestamp}/`. Đường dẫn ngoài `$PWD` cần `--allow-external-out`. |
| `-r, --reference <path>` | Tối đa 10 ảnh tham chiếu (PNG/JPEG/GIF/WebP, ≤ 5 MB mỗi ảnh). Có thể lặp lại hoặc phân tách bằng dấu phẩy. Hỗ trợ trên `codex` và `gemini`; bị từ chối trên `pollinations`. |
| `-y, --yes` | Bỏ qua prompt xác nhận chi phí cho run ước tính ≥ `$0.20`. Cũng có thể qua `OMA_IMAGE_YES=1`. |
| `--no-prompt-in-manifest` | Lưu SHA-256 của prompt thay vì raw text trong `manifest.json`. |
| `--dry-run` | In kế hoạch và ước tính chi phí mà không tốn chi phí. |
| `--format text\|json` | Định dạng đầu ra CLI. JSON là bề mặt tích hợp cho các skill khác. |
| `--strategy <list>` | Escalation chỉ dành cho Gemini, ví dụ `mcp,stream,api`. Override `vendors.gemini.strategies`. |

---

## Ảnh tham chiếu

Đính kèm tối đa 10 ảnh tham chiếu để dẫn dắt style, danh tính chủ thể hoặc bố cục.

```bash
oma image generate -r ~/Downloads/otter.jpeg "same otter in dramatic lighting" --vendor codex
oma image generate -r a.png -r b.png "blend these styles" --vendor gemini
oma image generate -r a.png,b.png "blend these styles" --vendor gemini
```

| Vendor | Hỗ trợ tham chiếu | Cách thực hiện |
|---|---|---|
| `codex` (gpt-image-2) | Có | Truyền `-i <path>` cho `codex exec` |
| `gemini` (2.5-flash-image) | Có | Inline base64 `inlineData` trong request |
| `pollinations` | Không | Bị từ chối với exit code 4 (cần URL hosting) |

### Ảnh được đính kèm nằm ở đâu

- **Claude Code** — `~/.claude/image-cache/<session>/N.png`, hiển thị trong system message dưới dạng `[Image: source: <path>]`. Phạm vi session: copy sang vị trí lâu dài nếu muốn tái sử dụng sau này.
- **Antigravity** — thư mục upload của workspace (IDE hiển thị đường dẫn chính xác)
- **Codex CLI làm host** — phải truyền tường minh; attachment trong cuộc hội thoại không được forward

Khi user đính kèm ảnh và yêu cầu sinh hoặc chỉnh sửa ảnh dựa trên nó, agent gọi **bắt buộc** phải forward qua `--reference <path>` thay vì mô tả bằng văn xuôi. Nếu CLI cục bộ quá cũ và không hỗ trợ `--reference`, hãy chạy `oma update` rồi thử lại.

---

## Layout đầu ra

Mỗi run ghi vào `.agents/results/images/` với thư mục có timestamp và hash suffix:

```
.agents/results/images/
├── 20260424-143052-ab12cd/                 # single-vendor run
│   ├── pollinations-flux.jpg
│   └── manifest.json
└── 20260424-143122-7z9kqw-compare/         # --vendor all run
    ├── codex-gpt-image-2.png
    ├── pollinations-flux.jpg
    └── manifest.json
```

`manifest.json` ghi lại vendor, model, prompt (hoặc SHA-256 của nó), size, quality và chi phí — mọi run đều có thể tái lập chỉ từ manifest.

---

## Chi phí, an toàn và hủy bỏ

1. **Guardrail chi phí** — run được ước tính ≥ `$0.20` sẽ yêu cầu xác nhận. Bypass bằng `-y` hoặc `OMA_IMAGE_YES=1`. Mặc định `pollinations` (flux/zimage) miễn phí, nên prompt được bỏ qua tự động cho nó.
2. **An toàn đường dẫn** — đường dẫn đầu ra ngoài `$PWD` cần `--allow-external-out` để tránh ghi bất ngờ.
3. **Có thể hủy** — `Ctrl+C` (SIGINT/SIGTERM) hủy mọi lệnh gọi provider đang chạy và orchestrator cùng lúc.
4. **Đầu ra tất định** — `manifest.json` luôn được ghi cạnh ảnh.
5. **Tối đa `n` = 5** — giới hạn theo wall-time, không phải quota.
6. **Exit code** — căn chỉnh với `oma search fetch`: `0` ok, `1` general, `2` safety, `3` not-found, `4` invalid-input, `5` auth-required, `6` timeout.

---

## Quy trình clarification

Trước khi gọi `oma image generate`, agent gọi chạy checklist này. Nếu thiếu gì đó và không suy luận được, nó hỏi trước hoặc khuếch đại prompt và hiển thị bản mở rộng để duyệt.

**Bắt buộc:**
- **Subject** — đối tượng chính trong ảnh là gì? (vật thể, người, cảnh)
- **Setting / backdrop** — nó ở đâu?

**Khuyến nghị mạnh (hỏi nếu thiếu và không suy luận được):**
- **Style** — photorealistic, illustration, 3D render, oil painting, concept art, flat vector?
- **Mood / lighting** — tươi sáng vs trầm, ấm vs lạnh, kịch tính vs tối giản
- **Bối cảnh sử dụng** — hero image, icon, thumbnail, ảnh sản phẩm, poster?
- **Tỷ lệ khung hình** — vuông, dọc hay ngang

Với prompt ngắn như *"a red apple"*, agent **không** hỏi thêm. Thay vào đó nó khuếch đại inline và hiển thị cho user:

> User: "a red apple"
> Agent: "I'll generate this as: *a single glossy red apple centered on a clean white background, soft studio lighting, photorealistic, shallow depth of field, 1024×1024*. Shall I proceed, or would you like a different style/composition?"

Khi user đã viết một creative brief đầy đủ (≥ 2 trong: subject + style + lighting + composition), prompt của họ được tôn trọng nguyên văn — không clarification, không amplification.

**Ngôn ngữ đầu ra.** Prompt sinh ảnh được gửi cho provider bằng tiếng Anh (image model được train chủ yếu trên caption tiếng Anh). Nếu user viết bằng ngôn ngữ khác, agent dịch và hiển thị bản dịch trong lúc amplification để user có thể sửa nếu hiểu sai.

---

## Gọi dùng chung (từ skill khác)

Các skill khác gọi sinh ảnh như hạ tầng dùng chung:

```bash
oma image generate "<prompt>" --format json
```

JSON manifest ghi ra stdout bao gồm output path, vendor, model và chi phí — dễ parse và chain.

---

## Cấu hình

- **Project config:** `config/image-config.yaml`
- **Biến môi trường:**
  - `OMA_IMAGE_DEFAULT_VENDOR` — override vendor mặc định (mặc định là `pollinations`)
  - `OMA_IMAGE_DEFAULT_OUT` — override thư mục đầu ra mặc định
  - `OMA_IMAGE_YES` — `1` để bypass xác nhận chi phí
  - `POLLINATIONS_API_KEY` — bắt buộc cho vendor pollinations (đăng ký miễn phí)
  - `GEMINI_API_KEY` — bắt buộc khi vendor gemini fallback về API trực tiếp
  - `OMA_IMAGE_GEMINI_STRATEGIES` — thứ tự escalation phân tách bằng dấu phẩy cho gemini (`mcp,stream,api`)

---

## Troubleshooting

| Triệu chứng | Nguyên nhân khả năng | Khắc phục |
|---|---|---|
| Exit code `5` (auth-required) | Vendor được chọn chưa xác thực | Chạy `oma image doctor` để xem vendor nào cần đăng nhập. Sau đó `codex login` / đặt `POLLINATIONS_API_KEY` / `gemini auth login`. |
| Exit code `4` ở `--reference` | `pollinations` từ chối tham chiếu, hoặc file quá lớn / sai định dạng | Chuyển sang `--vendor codex` hoặc `--vendor gemini`. Mỗi tham chiếu phải ≤ 5 MB và là PNG/JPEG/GIF/WebP. |
| `--reference` không được nhận diện | CLI cục bộ đã cũ | Chạy `oma update` rồi thử lại. Không fallback về mô tả văn xuôi. |
| Xác nhận chi phí chặn automation | Run được ước tính ≥ `$0.20` | Truyền `-y` hoặc đặt `OMA_IMAGE_YES=1`. Tốt hơn: chuyển sang `pollinations` miễn phí. |
| `--vendor all` hủy ngay lập tức | Một trong các vendor được yêu cầu chưa xác thực (strict mode) | Xác thực vendor còn thiếu, hoặc chọn một `--vendor` cụ thể. |
| Đầu ra ghi vào thư mục bất ngờ | Mặc định là `.agents/results/images/{timestamp}/` | Truyền `--out <dir>`. Đường dẫn ngoài `$PWD` cần `--allow-external-out`. |
| Gemini không trả về image bytes | Vòng lặp agentic của Gemini CLI không phát raw `inlineData` ra stdout (tính đến 0.38) | Provider tự động fallback về API trực tiếp. Đặt `GEMINI_API_KEY` và đảm bảo có billing. |

---

## Liên quan

- [Skills](/docs/core-concepts/skills) — kiến trúc skill hai tầng cấp năng lượng cho `oma-image`
- [CLI Commands](/docs/cli-interfaces/commands) — tham chiếu lệnh `oma image` đầy đủ
- [CLI Options](/docs/cli-interfaces/options) — ma trận option toàn cục
