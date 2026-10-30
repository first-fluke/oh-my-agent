---
title: "가이드: 콘텐츠 및 리서치 워크플로우"
sidebar_label: 개요
description: PDF와 HWP 추출, 음성, 학술 및 웹 리서치, 슬라이드, 이미지, 영상, 코드 설명서, 다이어그램, 시장 조사, 리캡, 번역, 학술 글쓰기에 맞는 oh-my-agent 경로와 전제 조건을 선택합니다.
---

# 콘텐츠 및 리서치 워크플로우 {#content-and-research-workflows}

먼저 필요한 산출물을 정하고, 검토 가능한 결과를 만드는 가장 작은 명령이나 스킬 진입점을 선택하세요. 별도 가이드가 있는 기능은 마지막 열에서 확인할 수 있습니다.

| 필요한 작업 | 진입점 | 전제 조건 | 첫 결과 | 가이드 |
|---|---|---|---|---|
| PDF 추출 | `oma-pdf` 스킬 또는 아래의 `uvx opendataloader-pdf` 명령 | `uv`(`uvx`용) | Markdown, 텍스트, JSON 또는 짧은 추출 보고서 | [아래](#extract-pdf-content) |
| HWP/HWPX/HWPML 추출 | `oma-hwp` 스킬과 `bunx kordoc@latest` | Bun | Markdown 또는 구조화된 JSON/청크 | [아래](#extract-hwp-family-documents) |
| 음성 생성 또는 전사 | `/oma-voice` | `127.0.0.1:17493`에서 실행 중인 Voicebox 앱 또는 `127.0.0.1:3900`의 VoiceStudio | 오디오와 매니페스트 또는 `transcript.md`와 매니페스트 | [아래](#generate-speech-or-transcribe-audio) |
| 논문 검색 및 검증 | `oma scholar` | 없음. 선택적으로 `S2_API_KEY`, `OPENALEX_EMAIL` | 검색 결과, 가져온 사이드카 또는 린트 보고서 | [아래](#search-and-validate-scholarly-material) |
| 웹 검색 또는 페이지 가져오기 | `oma-search` 스킬, `oma search` | 선택적으로 Chrome, Python `curl_cffi`, `yt-dlp`, `gh`(`oma search doctor`로 확인) | stdout의 JSON | [CLI 명령: search](../cli-interfaces/commands.md#search) |
| 프레젠테이션 제작 | `oma-slide` 스킬과 `oma slide` | Chrome 또는 `OMA_CHROME_PATH` | 검증된 HTML 슬라이드와 선택적 내보내기 파일 | [아래](#slides-and-presentations) |
| 이미지 생성 | `oma-image` 스킬, `oma image generate` | `POLLINATIONS_API_KEY`, `codex login`, 로그인된 `agy` 중 하나 | `.agents/results/images/` 아래의 이미지와 `manifest.json` | [이미지 생성](./image-generation.md) |
| 숏폼, 설명, 데모 영상 제작 | `/video`, `oma video` | Node.js 22 이상, FFmpeg, 이후 `oma video doctor --install` | `.agents/results/videos/` 아래의 실행 디렉토리, `oma video render` 후에는 MP4 | [영상 생성](./video-generation.md) |
| 변경 사항이나 주제를 한 페이지로 설명 | `/explain`, `oma explain` | 변경 모드에는 git, PR 참조에는 `gh` | `.agents/results/explain/` 아래의 독립 실행형 HTML | [코드 설명서](./code-explainer.md) |
| 인터랙티브 아키텍처 다이어그램 | `/architecture`, `oma diagram` | 없음. archify는 처음 사용할 때 가져옵니다 | Mermaid 블록, archify가 해석되면 `.archify.html`도 생성 | [다이어그램 엔진](./diagram-engine.md) |
| 커뮤니티 시장 조사 | `oma-market` 스킬, `oma market` | Python 3.12 이상 | `.agents/results/market/` 아래의 브리프 | [시장 조사](./market-research.md) |
| 에이전트 대화 요약 | `/recap`, `oma recap` | 없음 | CLI에서는 리캡 JSON, `/recap`에서는 날짜가 붙은 Markdown 리캡 | [아래](#recap-agent-conversations) |
| 현지화된 문장 번역 또는 검토 | `oma-translation` 스킬 | 없음 | 대상 언어 텍스트 또는 증거 기반 검토 | [아래](#translate-or-review-localized-content) |
| 학술 문장 초안 또는 검토 | `oma-academic-writing` 스킬 | 없음 | Claim-Evidence Map이 포함된 초안, 수정본 또는 준수 보고서 | [아래](#draft-or-audit-academic-writing) |

이 페이지의 `oma` 명령 이름은 등록된 공개 명령입니다. `uvx`, `bunx`, `bun`은 담당 스킬이 문서화하는 외부 변환 도구입니다. 나머지 [스킬](../getting-started/glossary.md#skill)은 자연어 또는 슬래시 명령 진입점이며 독립적인 `oma pdf`, `oma hwp`, `oma voice`, `oma translation`, `oma academic-writing` 명령은 없습니다.

## PDF 콘텐츠 추출 {#extract-pdf-content}

입력이 PDF이고 사람이 읽을 구조, LLM 입력 또는 검색 파이프라인이 필요한 경우 `oma-pdf` 스킬을 사용합니다. 스킬은 텍스트 계층을 먼저 확인한 뒤 표준, tagged, hybrid OCR 추출 중 하나를 선택합니다.

텍스트 계층을 빠르게 확인하려면 출력 파일을 만들지 않고 작은 페이지 범위를 출력합니다.

```bash
uvx opendataloader-pdf "<input.pdf>" -f text --pages 1-3 --to-stdout -q
```

Markdown 추출 및 정규화:

```bash
OUT=".agents/results/pdf/<document>"
uvx opendataloader-pdf "<input.pdf>" --format markdown --output-dir "$OUT"
uvx mdformat "$OUT/<document>.md"
```

큰 문서에는 `--pages`로 페이지 범위를 정합니다. 텍스트 계층이 읽기 좋으면 표준 추출을 유지합니다. tagged 구조는 있지만 읽기 순서가 나쁘면 `--use-struct-tree`로 재시도하고, 표가 깨졌으면 OCR로 바꾸기 전에 `--table-method cluster` 또는 `--markdown-with-html`을 시도합니다.

스캔했거나 이미지 기반인 PDF는 hybrid 서버를 먼저 시작한 뒤 변환기를 실행합니다.

```bash
# Terminal 1: leave this local server running while the conversion runs.
uvx --from "opendataloader-pdf[hybrid]" opendataloader-pdf-hybrid \
  --port 5002 --force-ocr --ocr-lang "ko,en"
```

두 번째 터미널에서 출력 디렉토리를 정의하고 변환기를 실행합니다.

```bash
OUT=".agents/results/pdf/<document>"
uvx opendataloader-pdf --hybrid docling-fast --hybrid-mode full \
  "<input.pdf>" --format markdown --output-dir "$OUT"
```

성공한 산출물은 선택한 출력 디렉토리의 Markdown 또는 텍스트 파일이며 페이지 수와 품질 메모가 함께 제공됩니다. 암호화된 PDF에는 잠금 해제된 사본이나 비밀번호가 필요합니다. 큰 파일은 반복 실행이 같은 basename을 덮어쓰지 않도록 페이지 범위와 출력 디렉토리를 나눠야 할 수 있습니다. OCR 추측을 원본의 사실로 취급하지 말고 불확실하거나 누락된 표를 보고합니다.

## HWP 계열 문서 추출 {#extract-hwp-family-documents}

`.hwp`, `.hwpx`, `.hwpml` 파일에는 `oma-hwp`를 사용합니다. 이 스킬은 Bun으로 `kordoc`을 실행한 다음 필요할 때 Markdown 표와 Private Use Area 글리프를 후처리합니다.

```bash
OUT=".agents/results/hwp/<document>.md"
bunx kordoc@latest "<input.hwp>" -o "$OUT"

# The skill's cleanup helper; set this to the project or global oma-hwp skill directory.
HWP_SKILL_DIR=".agents/skills/oma-hwp"
bun "$HWP_SKILL_DIR/resources/flatten-tables.ts" "$OUT"
```

새 클론에서는 도우미가 `Cannot find module "turndown"`을 보고할 수 있습니다. `oma-hwp` 스킬의 `resources/` 디렉토리에서 `bun install`을 실행한 다음 도우미를 다시 실행합니다.

배치에는 명시적인 출력 디렉토리를 사용합니다.

```bash
bunx kordoc@latest "./incoming/*.hwpx" -d ".agents/results/hwp"
```

기본 출력은 Markdown입니다. 구조화된 AST가 필요하면 `bunx kordoc@latest "<input.hwp>" --format json`을, 검색 지향 청크가 필요하면 `--format chunks`를 사용합니다. `--dedupe-headers`, `--keep-empty-cols`, `--inline-images` 변환 옵션은 일반적인 표와 이미지 문제를 제어합니다. 결과를 다른 스킬에 넘기기 전에 제목, 중첩 또는 병합된 표, 목록, 이미지, 각주, 링크를 확인합니다.

`bun`과 `bunx`가 전제 조건입니다. 빈 출력은 스캔된 이미지 콘텐츠를 의미할 수 있으므로 OCR이 가능한 워크플로우로 보냅니다. 암호화되었거나 DRM으로 제한된 자료는 불완전한 상태로 남을 수 있습니다. PDF, DOCX, XLSX 입력은 `kordoc`에 다른 작성·파싱 하위 명령이 있더라도 해당 스킬에 맡깁니다.

## 음성 생성 또는 오디오 전사 {#generate-speech-or-transcribe-audio}

`oma-voice`는 로컬 Voicebox 서버를 사용하는 MCP 네이티브 기능입니다. 에이전트에서 슬래시 명령으로 호출합니다.

```text
/oma-voice "The build is ready for review."
/oma-voice --profile prof_warm_korean "다음 단계 진행 준비됐어요"
/oma-voice transcribe ~/Downloads/standup.m4a
```

TTS는 호출당 최대 5,000자를 받고 Voicebox 음성 프로필이 필요합니다. 전사는 TTS 프로필이 필요하지 않으며 최대 30분 오디오를 받습니다. 저장하는 TTS와 STT 작업은 `.agents/results/voice/` 아래에 기록되며, 전사는 `transcript.md`와 `manifest.json`을 만듭니다. 알림 모드는 보통 Voicebox Captures에 남고 로컬 오디오 파일을 만들지 않습니다.

로컬 MCP 엔드포인트는 `http://127.0.0.1:17493/mcp`입니다. 첫 사용 설정은 에이전트에 Voicebox를 등록하며, Voicebox 데스크톱 앱이 음성 프로필을 제공합니다. 스킬은 `tools/list`로 실제 MCP 도구 이름을 찾은 다음 `voicebox_speak`, `voicebox_transcribe`, `voicebox_list_profiles`를 호출합니다. TTS에 프로필이 없으면 Voicebox에서 프로필을 만들거나 선택합니다. 긴 요청을 나눌지는 사용자가 결정하며 스킬은 자동으로 청크를 나누지 않습니다. 서버를 사용할 수 없으면 로컬 health 엔드포인트를 확인하고 Voicebox를 다시 시작한 뒤 재시도합니다.

Voicebox 대신 [VoiceStudio](https://github.com/debpalash/VoiceStudio)를 쓰려면 `.agents/oma-config.yaml`의 `voice.backend`를 `voicestudio`로 설정하세요. `auto`로 두면 Voicebox가 실행 중이 아닐 때 VoiceStudio를 사용합니다. 스킬은 upstream `voicestudio` 스킬을 불러오고 VoiceStudio 프로필 ID를 사용하며, 목소리를 클로닝하거나 디자인하거나 모델을 내려받기 전에 확인을 받습니다. `oma video` 내레이션도 같은 설정을 따릅니다.

## 학술 자료 검색 및 검증 {#search-and-validate-scholarly-material}

Knows 사이드카와 논문 메타데이터에는 `oma scholar` CLI를 사용합니다. search와 resolve는 발견 작업이고, `get`은 레코드나 선택한 섹션을 가져오며, `lint`는 공유 게이트입니다.

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

Knows를 먼저 시도하고 OpenAlex와 Semantic Scholar로 폴백합니다. `--section`은 `statements`, `evidence`, `relations`, `artifacts`, `citation`을 요청할 수 있습니다. 로컬 조립 중 연결되지 않은 레코드 간 참조가 예상되면 `--lenient`를 사용하고, 엄격한 CI 게이트에는 `--fail-on-warning`을 사용합니다. 검색 결과나 가져온 사이드카는 발견을 위한 증거이지 논문이 모든 결론을 지지한다는 주장이 아닙니다. 에이전트에서 사이드카를 만들거나 수정한 뒤 공유하기 전에 `oma scholar lint`를 실행합니다.

원격 서비스가 시간 초과되면 더 넓은 질의로 재시도하거나 CLI의 폴백을 허용합니다. `--always-fallback`을 사용하면 Knows에 결과가 있어도 OpenAlex와 Semantic Scholar를 함께 조회합니다. Semantic Scholar의 429는 익명 풀 제한일 수 있으므로 나중에 재시도하거나 `S2_API_KEY`를 설정합니다. OpenAlex 요청에 신원을 밝히려면 `OPENALEX_EMAIL`(선택적으로 `OPENALEX_API_KEY`)을 설정합니다. 사이드카에 provenance enum 오류가 있으면 `tool`, `person`, `org` 중 하나를 사용합니다. relation-density 경고가 남으면 원본이 뒷받침하는 경우에만 지원되는 증거 관계를 추가합니다.

## 슬라이드 및 프레젠테이션 {#slides-and-presentations}

고정 스테이지 프레젠테이션 결과물에는 `oma-slide`를 사용합니다. 작성 스킬은 1920×1080 HTML 조각을 만들고, CLI는 기하를 검증하고 덱을 번들링하고 내보냅니다.

```bash
DECK_DIR=".agents/results/slides/<session-id>"
oma slide create --output-dir "$DECK_DIR"
# author slide-01.html and meta.json in "$DECK_DIR"
oma slide validate --workspace "$DECK_DIR" --output json
oma slide preview --workspace "$DECK_DIR"
oma slide bundle --workspace "$DECK_DIR"
```

검증 후에만 내보냅니다.

```bash
oma slide export pdf --workspace "$DECK_DIR" --output-file "$DECK_DIR/out/deck.pdf" --mode capture
oma slide export png --workspace "$DECK_DIR" --output-dir "$DECK_DIR/out/png" --resolution 1080p
oma slide export pptx --workspace "$DECK_DIR" --output-file "$DECK_DIR/out/deck.pptx"
```

단일 슬라이드 검사에는 `--slide <file>`을 사용하고, 다른 프로세스가 결과를 필요로 하면 JSON 출력과 함께 `--report-file <path>`를 사용합니다. `slide import pptx <file>`은 가져오기 워크플로우를 시작하며, `slide asset fetch-video <url>`은 동영상 자산을 다운로드합니다. `slide style list|preview|get <slug>`는 스타일을 확인합니다. PPTX 출력은 래스터 기반이므로 편집 가능한 텍스트나 도형 레이어를 제공하지 않습니다. 검증과 내보내기에는 Chrome/puppeteer가 필요하며 실행 파일을 찾지 못하면 `OMA_CHROME_PATH`를 설정합니다. 세 번의 자동 수정 뒤에도 검증이 수렴하지 않으면 보고된 기하 문제를 사용해 영향을 받은 조각을 수정합니다.

## 에이전트 대화 리캡 {#recap-agent-conversations}

증거 기반 작업 요약에는 `/recap`을 사용하거나 에이전트에게 리캡을 요청합니다. 이 경로는 `oma recap`을 실행해 이력을 수집합니다. 달력 날짜와 이동 시간 창은 서로 다른 입력입니다.

```bash
# A calendar day
oma recap --date "$(date +%F)" --json

# A rolling 24-hour window ending now
oma recap --json

# A rolling multi-day window, capped at 30 days
oma recap --window 7d --tool claude,codex --json
```

이 명령은 수집한 이력을 출력합니다(기본은 터미널 텍스트, `--json`이면 JSON, `--mermaid`면 Mermaid 간트 차트). `--graph`를 사용하면 대신 브라우저에서 인터랙티브 그래프를 엽니다. CLI 자체는 파일을 쓰지 않습니다. `/recap`은 Markdown 리캡을 `.agents/results/recap/` 아래에 저장하며, 하루 리캡은 보통 `{date}.md`, 범위는 `{start-date}~{end-date}.md`입니다. 리캡은 작업 내용별로 묶고 요청·진행 중 작업과 완료 작업을 구분하며 누락된 도구 이력을 기록합니다. 보고서를 더 좁게 봐야 하면 `--top` 또는 `--sort`를 사용합니다. CLI를 사용할 수 없으면 스킬이 문서화된 Claude 이력 폴백을 사용할 수 있지만 줄어든 소스 범위를 밝혀야 합니다.

git 기반 엔지니어링 회고에는 `oma retro`를 사용합니다. 이는 대화 리캡과 다른 질문에 답하며 인접한 시간 창을 `--compare`로 비교할 수 있습니다.

## 현지화된 콘텐츠 번역 또는 검토 {#translate-or-review-localized-content}

UI 문자열, 문서, 보고서, 마케팅 문구, 학술 산문에는 `oma-translation`을 사용합니다. 자연어 또는 `/oma-translation` 스킬 진입점으로 호출하며 독립적인 `oma translation` 공개 명령은 없습니다.

스킬에 원문, 대상 로케일, 콘텐츠 유형, 작업이 번역인지 검토인지 소스 diff 동기화인지 전달합니다. 사용 가능한 경우 스킬 리소스에서 일치하는 언어 프로필을 하나 읽고 플레이스홀더, 링크, Markdown 구조, 보호된 구문을 보존하며 프로젝트의 형제 번역과 용어집을 따릅니다. 긴 문서나 검토에는 번역 루브릭도 적용합니다. 대상 프로필이 없으면 공통 규칙을 사용하고 그 한계를 한 번 보고합니다.

문서 작업에서는 앵커와 명령 예시가 정리된 안정적인 영어 페이지를 번역합니다. CLI 이름, 플래그, 경로, 환경 변수, 코드 블록은 그대로 두고 주변 설명을 번역하며, 대상 페이지 구조를 영어와 비교합니다. 원문 의미가 모호하면 임의로 추측하지 말고 표시합니다.

## 학술 글쓰기 초안 또는 검토 {#draft-or-audit-academic-writing}

영어 에세이, 보고서, 문헌 검토, 분석, 경영진 요약, 결론, 수정에는 `oma-academic-writing`을 사용합니다. 하나의 모드를 선택하고 루브릭 또는 원문 제약을 제공합니다.

```text
Draft a literature review in draft mode from these sources. Include a Claim-Evidence Map.
Revise this section in revise mode against the quoted rubric below.
Review this draft in review mode and return the compliance report with recommended fixes.
```

`draft`는 산문, Writing Notes, Claim-Evidence Map을 반환합니다. `revise`는 원문·수정 블록과 구체적인 변경을 반환합니다. `review`는 문장 구조, 동사, 헤징, 구체성, anti-AI 패턴, 문단 명료성, 리듬, 주장과 증거의 정렬에 대해 PASS/FAIL을 반환합니다. 스킬은 revise/review에서 기존 초안을 처음부터 끝까지 읽고, 뒷받침되지 않는 주장을 약화하거나 제거하며, 영어 단계 뒤 비영어 출력은 `oma-translation`으로 넘깁니다.

초안을 쓰기 전에 소스 발견과 사이드카 증거에는 `oma scholar`를 사용합니다. 인용이나 루브릭이 없으면 주장을 pending으로 표시하거나 필요한 제약을 요청합니다. 빈칸을 가짜 소스로 채우지 않습니다. 유용한 완료 산출물은 추적 가능한 증거 맵 또는 감사 보고서가 포함된 산문이며, 근거 없는 일반적인 “다듬은” 문장이 아닙니다.

## 복구 체크리스트 {#recovery-checklist}

| 증상 | 다음 조치 |
|---|---|
| 출력이 비어 있거나 구조가 깨짐 | 입력 유형을 확인한 다음 PDF에는 tagged, table, OCR 모드를 선택하고 HWP에는 Bun과 이미지 전용 페이지 여부를 확인합니다. |
| 로컬 스킬이 연결되지 않음 | 콘텐츠 요청을 바꾸기 전에 소유 로컬 서비스 또는 CLI(`Voicebox`, `Chrome`, `uvx`, `bunx`)를 확인합니다. |
| 리서치 결과가 빈약함 | 질의를 넓히고 폴백/소스 상태를 확인하며 불확실성을 보고서에 보존합니다. |
| 슬라이드 내보내기 실패 | `oma slide validate --workspace <dir> --output json`을 실행하고 기하 또는 글꼴 결과를 수정한 다음 다시 내보냅니다. |
| 리캡이 완료를 과장함 | 실행 기록과 산출물을 다시 확인합니다. 프롬프트나 도구 호출만으로는 완료 증거가 아닙니다. |
| 번역으로 코드 구문이 바뀜 | 보호된 이름을 복원하고 구조 검사를 다시 실행한 뒤 산문 품질을 검토합니다. |
| 학술 산문에 근거 없는 주장이 있음 | 주장을 제거하거나 완화하고 scholar 경로로 증거를 추가한 뒤 Claim-Evidence Map을 다시 실행합니다. |

## 다음 단계 {#next-steps}

- [이미지 생성](./image-generation.md), [영상 생성](./video-generation.md), [코드 설명서](./code-explainer.md), [다이어그램 엔진](./diagram-engine.md), [시장 조사](./market-research.md): 위 표에 있는 기능별 가이드
- [CLI 명령](../cli-interfaces/commands.md)과 [CLI 옵션](../cli-interfaces/options.md): 등록된 전체 CLI 경로와 옵션 별칭
- [설정 레퍼런스](./configuration-reference.md): `pdf`, `hwp`, `voice`, `scholar` 설정 섹션
