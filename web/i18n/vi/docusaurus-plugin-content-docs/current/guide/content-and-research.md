---
title: "Hướng dẫn: Workflow nội dung và nghiên cứu"
sidebar_label: Tổng quan
description: Chọn pathway oh-my-agent phù hợp, kèm prerequisite, cho trích xuất PDF và HWP, voice, nghiên cứu học thuật và web, slide, hình ảnh, video, code explainer, diagram, nghiên cứu thị trường, recap, dịch thuật và viết học thuật.
---

# Workflow nội dung và nghiên cứu {#content-and-research-workflows}

Hướng dẫn này định tuyến công việc về tài liệu, âm thanh, nghiên cứu, media và thuyết trình đến capability sở hữu nó. Bắt đầu từ artifact cần tạo, sau đó dùng command hoặc skill entry point nhỏ nhất để tạo kết quả có thể review. Capability nào có hướng dẫn riêng sẽ có link ở cột cuối; phần còn lại được trình bày ngay trên trang này.

| Nhu cầu | Entry point | Prerequisite | Kết quả đầu tiên | Hướng dẫn |
|---|---|---|---|---|
| Trích xuất PDF | Skill `oma-pdf` hoặc command `uvx opendataloader-pdf` bên dưới | `uv` (cho `uvx`) | Markdown, text, JSON hoặc extraction report ngắn | [bên dưới](#extract-pdf-content) |
| Trích xuất HWP/HWPX/HWPML | Skill `oma-hwp` và `bunx kordoc@latest` | Bun | Markdown hoặc JSON/chunk có cấu trúc | [bên dưới](#extract-hwp-family-documents) |
| Phát hoặc transcript audio | `/oma-voice` | Ứng dụng Voicebox tại `127.0.0.1:17493` | Audio kèm manifest, hoặc `transcript.md` kèm manifest | [bên dưới](#generate-speech-or-transcribe-audio) |
| Tìm và xác minh paper | `oma scholar` | không có; tùy chọn `S2_API_KEY`, `OPENALEX_EMAIL` | Search result, sidecar đã fetch hoặc lint report | [bên dưới](#search-and-validate-scholarly-material) |
| Tìm kiếm web hoặc fetch một trang | Skill `oma-search`, `oma search` | tùy chọn Chrome, Python `curl_cffi`, `yt-dlp`, `gh` (kiểm tra bằng `oma search doctor`) | JSON trên stdout | [CLI Commands: search](../cli-interfaces/commands.md#search) |
| Tạo presentation | Skill `oma-slide` và `oma slide` | Chrome, hoặc `OMA_CHROME_PATH` | HTML slide đã validate và export tùy chọn | [bên dưới](#slides-and-presentations) |
| Tạo hình ảnh | Skill `oma-image`, `oma image generate` | một trong `POLLINATIONS_API_KEY`, `codex login` hoặc `agy` đã đăng nhập | Hình ảnh kèm `manifest.json` dưới `.agents/results/images/` | [Tạo hình ảnh](./image-generation.md) |
| Làm video ngắn, explainer hoặc demo | `/video`, `oma video` | Node.js 22+, FFmpeg, sau đó `oma video doctor --install` | Run directory dưới `.agents/results/videos/`; MP4 sau `oma video render` | [Tạo video](./video-generation.md) |
| Giải thích một thay đổi hoặc một chủ đề trong một trang | `/explain`, `oma explain` | git cho change mode; `gh` cho PR ref | HTML độc lập dưới `.agents/results/explain/` | [Code Explainer](./code-explainer.md) |
| Diagram kiến trúc tương tác | `/architecture`, `oma diagram` | không có; archify được tải ở lần dùng đầu tiên | Mermaid block, kèm `.archify.html` khi archify resolve được | [Diagram Engine](./diagram-engine.md) |
| Nghiên cứu thị trường từ cộng đồng | Skill `oma-market`, `oma market` | Python 3.12+ | Một brief dưới `.agents/results/market/` | [Nghiên cứu thị trường](./market-research.md) |
| Tóm tắt hội thoại agent | `/recap`, `oma recap` | không có | Recap JSON từ CLI; recap Markdown theo ngày từ `/recap` | [bên dưới](#recap-agent-conversations) |
| Dịch hoặc review prose đã localize | Skill `oma-translation` | không có | Text ngôn ngữ đích hoặc review có evidence | [bên dưới](#translate-or-review-localized-content) |
| Soạn hoặc audit prose học thuật | Skill `oma-academic-writing` | không có | Draft, revision hoặc compliance report kèm Claim-Evidence Map | [bên dưới](#draft-or-audit-academic-writing) |

Tên command `oma` trong trang này là public command đã đăng ký. `uvx`, `bunx` và `bun` là external conversion tool được skill sở hữu ghi nhận. Các [skill](../getting-started/glossary.md#skill) còn lại là natural-language hoặc slash-command entry point; không có command standalone `oma pdf`, `oma hwp`, `oma voice`, `oma translation` hoặc `oma academic-writing`.

## Trích xuất nội dung PDF {#extract-pdf-content}

Dùng skill `oma-pdf` khi input là PDF và output cần cấu trúc dễ đọc cho người, LLM hoặc retrieval pipeline. Skill kiểm tra text layer trước khi chọn extraction standard, tagged hoặc hybrid OCR.

Để kiểm tra nhanh text layer, in một khoảng page nhỏ mà không tạo output file:

```bash
uvx opendataloader-pdf "<input.pdf>" -f text --pages 1-3 --to-stdout -q
```

Để trích xuất và chuẩn hóa Markdown:

```bash
OUT=".agents/results/pdf/<document>"
uvx opendataloader-pdf "<input.pdf>" --format markdown --output-dir "$OUT"
uvx mdformat "$OUT/<document>.md"
```

Với tài liệu lớn, chọn page range bằng `--pages`. Nếu text layer đọc được, giữ standard extraction. Nếu tagged structure có nhưng reading order kém, thử lại với `--use-struct-tree`; với table hỏng, thử `--table-method cluster` hoặc `--markdown-with-html` trước khi chuyển sang OCR.

Với PDF scan hoặc dựa trên image, khởi động server hybrid rồi chạy converter hybrid:

```bash
# Terminal 1: leave this local server running while the conversion runs.
uvx --from "opendataloader-pdf[hybrid]" opendataloader-pdf-hybrid \
  --port 5002 --force-ocr --ocr-lang "ko,en"
```

Trong terminal thứ hai, định nghĩa output directory và chạy converter:

```bash
OUT=".agents/results/pdf/<document>"
uvx opendataloader-pdf --hybrid docling-fast --hybrid-mode full \
  "<input.pdf>" --format markdown --output-dir "$OUT"
```

Artifact thành công là Markdown hoặc text file trong output directory đã chọn, kèm page count và quality note nếu có. PDF mã hóa cần bản đã unlock hoặc password. File lớn có thể cần page range và output directory riêng để các lần chạy lặp không ghi đè cùng basename. Không coi OCR guess là source fact; báo bảng không chắc chắn hoặc bị thiếu.

## Trích xuất tài liệu họ HWP {#extract-hwp-family-documents}

Dùng `oma-hwp` cho file `.hwp`, `.hwpx` và `.hwpml`. Skill chạy `kordoc` qua Bun, sau đó post-process Markdown table và Private Use Area glyph khi cần.

```bash
OUT=".agents/results/hwp/<document>.md"
bunx kordoc@latest "<input.hwp>" -o "$OUT"

# The skill's cleanup helper; set this to the project or global oma-hwp skill directory.
HWP_SKILL_DIR=".agents/skills/oma-hwp"
bun "$HWP_SKILL_DIR/resources/flatten-tables.ts" "$OUT"
```

Ở clone mới, helper có thể báo `Cannot find module "turndown"`; chạy `bun install` trong thư mục `resources/` của skill `oma-hwp`, sau đó chạy lại helper.

Dùng output directory rõ ràng cho batch:

```bash
bunx kordoc@latest "./incoming/*.hwpx" -d ".agents/results/hwp"
```

Output mặc định là Markdown. Để có AST có cấu trúc, dùng `bunx kordoc@latest "<input.hwp>" --format json`; để có chunk hướng retrieval, dùng `--format chunks`. Các option conversion `--dedupe-headers`, `--keep-empty-cols` và `--inline-images` điều khiển các trường hợp table và image phổ biến. Kiểm tra heading, table lồng hoặc merge, list, image, footnote và link trong result trước khi chuyển cho skill khác.

`bun` và `bunx` là prerequisite. Output rỗng có thể cho thấy nội dung là scanned image; chuyển trường hợp đó sang workflow có OCR. Tài liệu bị mã hóa hoặc giới hạn DRM có thể vẫn thiếu. Input PDF, DOCX và XLSX thuộc skill tương ứng dù `kordoc` có subcommand authoring và parsing khác.

## Tạo speech hoặc transcript audio {#generate-speech-or-transcribe-audio}

`oma-voice` là MCP-native và dùng local Voicebox server. Gọi trong agent bằng slash command:

```text
/oma-voice "The build is ready for review."
/oma-voice --profile prof_warm_korean "다음 단계 진행 준비됐어요"
/oma-voice transcribe ~/Downloads/standup.m4a
```

TTS nhận tối đa 5.000 ký tự mỗi call và cần Voicebox voice profile. Transcription không cần TTS profile và nhận audio tối đa 30 phút. Công việc TTS và STT được lưu dưới `.agents/results/voice/`; transcription tạo `transcript.md` và `manifest.json`. Notification mode thường nằm trong Voicebox Captures và không ghi audio file cục bộ.

Local MCP endpoint là `http://127.0.0.1:17493/mcp`. Setup lần đầu đăng ký Voicebox với agent, còn Voicebox desktop app cung cấp voice profile. Skill discover tên MCP tool thực tế bằng `tools/list`, rồi gọi `voicebox_speak`, `voicebox_transcribe` hoặc `voicebox_list_profiles`. Nếu TTS không có profile, tạo hoặc chọn một profile trong Voicebox; việc chia request quá dài là quyết định của người dùng vì skill không tự chunk. Nếu server không khả dụng, kiểm tra local health endpoint và restart Voicebox trước khi thử lại.

## Tìm và xác minh tài liệu học thuật {#search-and-validate-scholarly-material}

Dùng CLI `oma scholar` cho Knows sidecar và paper metadata. Search và resolve là discovery operation; `get` lấy record hoặc section đã chọn; `lint` là sharing gate.

```bash
oma scholar search "vision language action" --limit 10
oma scholar search --year-min 2024 "vision language action"
oma scholar resolve "Attention Is All You Need"
oma scholar get "10.48550/arXiv.1706.03762"
oma scholar get --section statements "knows:generated/reconvla/1.0.0"
oma scholar lint paper.knows.yaml
oma scholar lint --lenient paper.knows.yaml
oma scholar lint --fail-on-warning paper.knows.yaml
```

Knows được thử trước, với OpenAlex và Semantic Scholar làm fallback. `--section` có thể yêu cầu `statements`, `evidence`, `relations`, `artifacts` hoặc `citation`. Dùng `--lenient` khi dangling cross-record reference được mong đợi trong local assembly; dùng `--fail-on-warning` cho strict CI gate. Search result hoặc sidecar đã fetch là evidence cho discovery, không phải claim rằng paper hỗ trợ mọi kết luận. Tạo hoặc sửa sidecar trong agent, sau đó chạy `oma scholar lint` trước khi chia sẻ.

Nếu remote service timeout, thử lại query rộng hơn hoặc cho phép fallback của CLI; `--always-fallback` truy vấn OpenAlex và Semantic Scholar ngay cả khi Knows có kết quả. HTTP 429 từ Semantic Scholar có thể là anonymous-pool limit; thử lại sau, hoặc đặt `S2_API_KEY`. Đặt `OPENALEX_EMAIL` (và tùy chọn `OPENALEX_API_KEY`) để định danh request tới OpenAlex. Nếu sidecar có lỗi provenance enum, dùng `tool`, `person` hoặc `org`; nếu relation-density warning còn, chỉ thêm evidence relation được source hỗ trợ.

## Slide và presentation {#slides-and-presentations}

Dùng `oma-slide` khi deliverable là presentation có fixed stage. Authoring skill ghi HTML fragment ở 1920×1080; CLI validate geometry, bundle deck và export.

```bash
DECK_DIR=".agents/results/slides/<session-id>"
oma slide create --output-dir "$DECK_DIR"
# author slide-01.html and meta.json in "$DECK_DIR"
oma slide validate --workspace "$DECK_DIR" --output json
oma slide preview --workspace "$DECK_DIR"
oma slide bundle --workspace "$DECK_DIR"
```

Chỉ export sau khi validate:

```bash
oma slide export pdf --workspace "$DECK_DIR" --output-file "$DECK_DIR/out/deck.pdf" --mode capture
oma slide export png --workspace "$DECK_DIR" --output-dir "$DECK_DIR/out/png" --resolution 1080p
oma slide export pptx --workspace "$DECK_DIR" --output-file "$DECK_DIR/out/deck.pptx"
```

Dùng `--slide <file>` cho single-slide check và `--report-file <path>` cùng JSON output khi process khác cần findings. `slide import pptx <file>` bắt đầu import workflow; `slide asset fetch-video <url>` tải video asset; `slide style list|preview|get <slug>` xem style. PPTX output được raster-backed nên không có editable text hoặc shape layer. Validation và export cần Chrome/puppeteer; đặt `OMA_CHROME_PATH` khi executable không tự discover được. Nếu validation không hội tụ sau ba vòng auto-fix, dùng geometry finding đã báo để sửa fragment bị ảnh hưởng.

## Recap hội thoại agent {#recap-agent-conversations}

Dùng `/recap` (hoặc yêu cầu agent tạo recap) cho work summary dựa trên evidence; nó chạy `oma recap` để thu thập lịch sử. Calendar date và rolling window là hai input khác nhau:

```bash
# A calendar day
oma recap --date "$(date +%F)" --json

# A rolling 24-hour window ending now
oma recap --json

# A rolling multi-day window, capped at 30 days
oma recap --window 7d --tool claude,codex --json
```

Các command này in ra lịch sử đã thu thập (mặc định là text trên terminal, JSON với `--json`, hoặc Mermaid gantt chart với `--mermaid`), còn `--graph` mở graph tương tác trong trình duyệt; bản thân CLI không ghi file nào. `/recap` lưu recap Markdown dưới `.agents/results/recap/`, thường là `{date}.md` cho daily recap hoặc `{start-date}~{end-date}.md` cho range. Recap nhóm theo nội dung công việc, đánh dấu riêng work được yêu cầu và đang tiến hành so với work đã hoàn tất, đồng thời ghi tool history bị thiếu. Dùng `--top` hoặc `--sort` khi report cần phạm vi hẹp hơn. Nếu CLI không khả dụng, skill có thể dùng Claude-history fallback đã ghi nhận, nhưng phải nêu rõ source coverage bị giảm.

Dùng `oma retro` cho engineering retrospective dựa trên git. Nó trả lời câu hỏi khác với conversation recap và có thể so sánh các window liền kề bằng `--compare`.

## Dịch hoặc review nội dung đã localize {#translate-or-review-localized-content}

Dùng `oma-translation` cho UI string, documentation, report, marketing copy hoặc academic prose. Gọi bằng natural language hoặc entry point skill `/oma-translation`; không có public `oma translation` command.

Đưa cho skill source, target locale, content type và cho biết đây là translation, review hay source-diff synchronization. Skill load language profile phù hợp từ resource khi có, giữ placeholder, link, Markdown structure và protected syntax, đồng thời tuân theo sibling translation và glossary của project. Với tài liệu dài hoặc review, skill cũng áp translation rubric. Nếu không có target profile, dùng shared rule và chỉ báo giới hạn đó một lần.

Với documentation, dịch stable English page sau khi anchor và command example đã ổn định. Giữ nguyên CLI name, flag, path, environment variable và code block; dịch phần giải thích xung quanh và kiểm tra structure của target page với English. Meaning nguồn mơ hồ cần được nêu rõ thay vì tự đoán.

## Soạn hoặc audit academic writing {#draft-or-audit-academic-writing}

Dùng `oma-academic-writing` cho essay, report, literature review, analysis, executive summary, conclusion và revision tiếng Anh. Chọn một mode và cung cấp rubric hoặc source constraint:

```text
Draft a literature review in draft mode from these sources. Include a Claim-Evidence Map.
Revise this section in revise mode against the quoted rubric below.
Review this draft in review mode and return the compliance report with recommended fixes.
```

`draft` trả prose, Writing Notes và Claim-Evidence Map. `revise` trả các block gốc và đã sửa cùng thay đổi cụ thể. `review` trả finding PASS/FAIL cho sentence structure, verb, hedging, specificity, anti-AI pattern, paragraph clarity, rhythm và claim-evidence alignment. Skill đọc toàn bộ draft hiện có cho revise/review, làm yếu hoặc xóa claim không được hỗ trợ và chuyển output không phải tiếng Anh cho `oma-translation` sau English pass.

Dùng `oma scholar` để discovery source và sidecar evidence trước khi soạn. Nếu thiếu citation hoặc rubric, đánh dấu claim là pending hoặc hỏi constraint còn thiếu; không lấp khoảng trống bằng source bịa. Artifact hoàn tất hữu ích là prose cùng evidence map hoặc audit report, thay vì một đoạn “polished” chung chung không truy được support.

## Checklist khôi phục {#recovery-checklist}

| Triệu chứng | Hành động tiếp theo |
|---|---|
| Output rỗng hoặc sai cấu trúc | Kiểm tra input type, sau đó chọn tagged, table hoặc OCR mode cho PDF; với HWP, kiểm tra Bun và xem source có page chỉ chứa image không. |
| Local skill không kết nối được | Kiểm tra local service hoặc CLI sở hữu (`Voicebox`, `Chrome`, `uvx`, `bunx`) trước khi đổi content request. |
| Research result ít thông tin | Mở rộng query, kiểm tra fallback/source status và giữ uncertainty trong report. |
| Slide export thất bại | Chạy `oma slide validate --workspace <dir> --output json`, sửa geometry hoặc font finding rồi export lại. |
| Recap nói quá mức về completion | Kiểm tra lại receipt và artifact; prompt hoặc tool invocation tự nó không phải bằng chứng hoàn tất. |
| Translation làm đổi code syntax | Khôi phục protected name và chạy lại structure check trước khi review prose. |
| Academic prose có claim không được hỗ trợ | Xóa hoặc hedge claim, thêm evidence qua scholar path và chạy lại Claim-Evidence Map. |

## Bước tiếp theo {#next-steps}

- [Tạo hình ảnh](./image-generation.md), [Tạo video](./video-generation.md), [Code Explainer](./code-explainer.md), [Diagram Engine](./diagram-engine.md) và [Nghiên cứu thị trường](./market-research.md) — hướng dẫn cho các capability trong bảng trên
- [CLI Commands](../cli-interfaces/commands.md) và [CLI Options](../cli-interfaces/options.md) — toàn bộ CLI path và option alias đã đăng ký
- [Tham chiếu cấu hình](./configuration-reference.md) — các config section `pdf`, `hwp`, `voice` và `scholar`
