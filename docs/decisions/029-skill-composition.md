# 16개 상위 스킬 구성 트리

Status: 원본 스킬 정의 기준 구성 문서. 선택된 연결과 실제 설치·실행 검증 상태를 구분한다.

기준일: 2026-10-27

## 읽는 방법

각 상위 스킬 아래에 실제로 연결되는 하위 스킬, CLI, MCP, 자체 스펙을 기록한다. API와 호스트 기능은 별도 가지로 표시한다. 가지는 실행 순서가 아니다. `conditional`과 `optional` 연결은 해당 작업에서만 사용한다.

- `skills`: 하위 지침을 로딩해 따르는 관계(`load-and-follow`) 또는 작업 이관(`handoff`). 두 방식을 구분하며, 별도 에이전트 실행을 전제하지 않는다. 단순 관련 링크와 범위 밖 요청 안내는 제외한다.
- `CLI`: 호출하는 명령, 런타임, 외부 엔진.
- `MCP`: 직접 사용하는 서버와 기능. 다른 스킬을 통한 연결은 간접 연결로 표시한다.
- `OMA-owned specs`: OMA가 유지하는 입력·출력 규약, 라우팅 기준, 프로필, 검증 기준. Markdown 규약도 포함한다.
- `API / host`: MCP를 거치지 않는 외부 API와 호스트 도구.
- `capabilities`: 프로젝트 설정에 따라 전송 방식이 결정되는 기능. MCP 여부를 이 문서에서 고정하지 않는다.

`none declared`는 현재 스킬 정의에 연결이 없다는 뜻이다. 설치 여부, 인증, 도달 가능성, 실행 품질을 검증했다는 뜻은 아니다. 외부 표준의 소유권과 OMA의 로컬 호환 규칙을 구분한다.

이 저장소의 원본은 `.agents/skills/`다. `skills/`는 해당 원본에서 생성하는 포터블 배포물이며, 아래 근거 링크는 이 배포물의 대응 파일을 가리킨다. 원본과 생성물은 함께 동기화한다. 근거 링크는 이 문서 위치를 기준으로 한다.

## oma-market

근거: [SKILL.md](../../skills/oma-market/SKILL.md), [의도 분류](../../skills/oma-market/resources/intent-rules.md), [출력 규약](../../skills/oma-market/resources/output-laws.md).

```text
oma-market
├── skills
│   └── last30days upstream SKILL.md: load-and-follow contract
├── CLI
│   ├── oma market resolve / run / update / detect-trap
│   └── resolved upstream Python entrypoint
├── MCP
│   └── none declared
└── OMA-owned specs
    ├── intent-rules.md: pain / trend / competitor / discovery
    ├── frameworks/: selected analysis framework
    └── output-laws.md / checklist.md: brief and evidence checks
```

조사 절차와 기본 출력 계약은 upstream 스킬을 읽고 따른다. Python 엔진의 실행은 CLI 가지에 해당한다. 별도 에이전트로 dispatch하는 관계는 아니다. OMA는 의도 선택, 분석 틀, 결과 검증을 관리하며, 엔진은 현재 정의의 managed-latest 정책을 따른다.

## oma-search

근거: [SKILL.md](../../skills/oma-search/SKILL.md), [실행 경로](../../skills/oma-search/resources/execution-protocol.md), [출처·근거 규약](../../skills/oma-search/resources/trust-registry.md), [provider 설정](../capability-providers.md).

```text
oma-search
├── skills
│   └── none delegated in the current scope
├── CLI
│   ├── oma search providers / web: registered provider selection
│   ├── oma search code / gh / glab: remote code
│   └── oma search fetch: known-URL retrieval
├── MCP
│   └── Context7: library resolution and documentation queries
├── API / host
│   ├── native runtime web search and page retrieval
│   └── Brave Search / Exa Search: selected API provider
├── capabilities
│   └── configured code intelligence: direct local-code handoff
└── OMA-owned specs
    ├── intent-rules.md: route selection
    ├── execution-protocol.md: selected-channel invocation
    └── trust-registry.md / checklist.md: provenance and inspected evidence
```

`docs`·`web`·`code`·`fetch`를 요청 목적과 입력에 따라 선택한다. 웹 검색은 설정된 native·Brave·Exa 중 하나를 사용하고, 알려진 URL 읽기는 별도로 실행한다. 로컬 코드는 설정된 코드 탐색 도구로 직접 넘긴다. 일반 결과는 출처·원문 확인 상태·근거를 기록하며 숫자 도메인 점수는 선택적 진단으로 남긴다. Provider 등록이나 키 존재가 실제 API 호출 성공을 뜻하지 않는다.

## oma-scholar

근거: [SKILL.md](../../skills/oma-scholar/SKILL.md), [sidecar 규약](../../skills/oma-scholar/resources/sidecar-spec.md), [API 경로](../../skills/oma-scholar/resources/api-endpoints.md).

```text
oma-scholar
├── skills
│   └── none delegated in the current scope
├── CLI
│   └── oma scholar search / resolve / get / lint
├── MCP
│   └── none declared
├── API / host
│   └── Knows / OpenAlex / Semantic Scholar
└── OMA-owned specs
    ├── sidecar-spec.md: local production-compatibility profile
    ├── api-endpoints.md / fallback-providers.md
    └── execution-protocol.md / checklist.md
```

Knows의 `.knows.yaml`은 upstream 규격이다. OMA가 유지하는 것은 로컬 생성·lint의 호환 범위와 연결 규칙이다. 로컬 lint 결과와 upstream 전체 schema 준수 여부를 구분한다.

## oma-pdf

근거: [SKILL.md](../../skills/oma-pdf/SKILL.md), [변환 절차](../../skills/oma-pdf/resources/execution-protocol.md).

```text
oma-pdf
├── skills
│   └── none delegated in the current scope
├── CLI
│   ├── uvx opendataloader-pdf
│   ├── opendataloader-pdf-hybrid: optional OCR / hybrid path
│   └── uvx mdformat
├── MCP
│   └── none declared
└── OMA-owned specs
    ├── execution-protocol.md: text / tagged / OCR routing
    ├── config/pdf-config.yaml: shipped defaults
    └── extraction structure and output checks in SKILL.md
```

현재 범위는 PDF 추출이다. 일반 변환·구조 기반 변환·OCR 선택과 결과 검증을 관리한다. hybrid 실행은 `opendataloader-pdf[hybrid]`의 console script를 사용한다.

## oma-hwp

근거: [SKILL.md](../../skills/oma-hwp/SKILL.md), [변환 절차](../../skills/oma-hwp/resources/execution-protocol.md), [후처리](../../skills/oma-hwp/resources/flatten-tables.ts).

```text
oma-hwp
├── skills
│   └── none delegated in the current scope
├── CLI
│   ├── bunx kordoc@latest: extraction; or configured pinned version
│   └── bun <skill_dir>/resources/flatten-tables.ts: local post-processing
├── MCP
│   └── none declared
└── OMA-owned specs
    ├── execution-protocol.md: format and output selection
    ├── troubleshooting.md / config/hwp-config.yaml
    └── GFM table and Hancom PUA cleanup rules
```

외부 엔진 kordoc과 OMA 소유 후처리를 구분한다. kordoc의 다른 문서 형식·생성·편집 기능은 현재 이 상위 스킬의 지원 범위에 포함하지 않는다.

## oma-design

근거: [SKILL.md](../../skills/oma-design/SKILL.md), [외부 스킬 선택](../../skills/oma-design/resources/external-design-skills.md), [실행 계약](../../skills/oma-design/resources/execution-protocol.md), [DESIGN.md 규약](../../skills/oma-design/resources/design-md-spec.md), [후보 검토](../design-skill-candidates.md).

```text
oma-design
├── skills
│   ├── dammyjay93/interface-design@interface-design: conditional admin / SaaS / internal tool direction
│   ├── Leonxlnx/taste-skill@design-taste-frontend: conditional other web art direction
│   ├── pbakaus/impeccable@impeccable: conditional selected critique / audit / polish / extract / document
│   ├── oma-frontend / oma-mobile: platform-specific implementation handoff
│   └── oma-image: conditional original visual assets
├── CLI
│   ├── bunx skills use <selected repository>@<skill>: catalog fallback, without --agent
│   ├── selected upstream launcher: only when the operation requires its runtime
│   └── getdesign: optional, requested reference data
├── MCP
│   └── Stitch: optional, requested design-source operation
├── OMA-owned specs
│   ├── external-design-skills.md: task selection and complete support-directory loading
│   ├── DESIGN.md / .design-context.md / semantic token contracts
│   ├── brand, content, URLs, analytics, CJK and accessibility constraints
│   ├── shared ui-interaction-quality.md: adopted motion / interaction acceptance rules
│   └── affected-result verification and platform handoff
└── Upstream-owned specs
    ├── selected SKILL.md and operation references
    └── visual methods, scripts, launchers and their runtime requirements
```

현재 작업에 맞는 공급자 하나를 선택해 지침과 지원 파일을 읽고 따른다. 관리자·대시보드·SaaS 제품 화면·내부 도구의 방향은 Interface Design을 먼저 선택한다. 그 밖의 새로운 웹 시각 방향과 승인된 전면 개편은 Taste, 기존 UI의 평가·감사·마감·추출은 화면 종류와 관계없이 해당 Impeccable 작업으로 연결한다. 기존 결정을 문서나 토큰 계약에 옮기는 작업은 외부 공급자 없이 처리할 수 있다.

Interface Design이 읽는 `.interface-design/system.md` 문맥에는 canonical `DESIGN.md`의 결정을 제공한다. 해당 upstream 문서가 이미 있으면 프로젝트 입력으로 읽고 충돌을 기록하며, 승인된 변경은 `DESIGN.md`에 반영한다. 별도 영구 문서나 plugin command 설치를 요구하지 않는다.

일반적인 타이포그래피·색상·간격·모션·시각 금지 목록을 OMA에 복제하지 않는다. OMA는 프로젝트의 브랜드·사실·언어·변경 범위·출력 규약·검증 근거를 유지한다. 구현은 기존 스택을 유지하는 플랫폼 스킬로 넘긴다. 외부 설치기·hook·엔진 다운로드·별도 에이전트 실행은 지침 로딩에 포함되지 않는다. 공급자의 빌드 요구나 반복 확인 절차보다 현재 사용자 지시와 실행 정책이 우선한다.

CanvasUI·Scroll World·GSAP는 다음 frontend 구현 경로로 연결한다. Emil의 작업별 지침에서 선별한 원칙은 공유 상호작용 품질 규약으로 흡수한다. Hallmark·Magic UI·OpenDesign은 [검토 목록](../design-skill-candidates.md)에 남긴다. 스킬의 전체 지원 묶음 확인과 실제 UI 생성·브라우저·접근성 실행 검증을 구분한다.

## oma-frontend

근거: [SKILL.md](../../skills/oma-frontend/SKILL.md), [조건부 구현 확장](../../skills/oma-frontend/resources/specialized-visual-implementation.md), [공유 상호작용 품질](../../skills/_shared/ui-interaction-quality.md).

```text
oma-frontend
├── fixed project stack
│   └── existing React / Next.js / Angular, tokens, primitives, state and i18n
├── conditional implementation extensions
│   ├── CanvasUI: selected component / framework / renderer from its registry
│   ├── oso95/scroll-world@scroll-world: requested video-scroll scene and complete support bundle
│   └── greensock/gsap-skills: selected GSAP API / framework skill subset
├── skills
│   ├── oma-image / oma-video: conditional scroll-scene assets
│   └── oma-design: project visual contract when relevant
└── OMA-owned specs
    ├── specialized-visual-implementation.md: eligibility, acquisition and runtime checks
    ├── shared ui-interaction-quality.md: adopted Emil-derived functional principles
    └── existing frontend stack, lifecycle, accessibility and verification rules
```

이 세 경로는 이미 정한 디자인을 구현하는 기능 확장이다. 필요한 기능이 선택됐을 때만 해당 registry나 스킬 묶음을 읽는다. 시각 방향 공급자 하나를 고르는 규칙과 구분하며, 기존 스택과 기본 애니메이션 선택을 교체하지 않는다. 공유 상호작용 규약도 관련 작업에서만 읽고, Emil의 전체 스킬 묶음이나 라이브러리 추천 목록을 기본 지침으로 적재하지 않는다.

## oma-image

근거: [SKILL.md](../../skills/oma-image/SKILL.md), [provider 선택](../../skills/oma-image/resources/vendor-matrix.md), [호출 규약](../../skills/oma-image/resources/invocation.md).

```text
oma-image
├── skills
│   └── none delegated in the current scope
├── CLI
│   ├── oma image generate / doctor / vendor list
│   └── codex exec / agy: conditional provider subprocesses
├── MCP
│   └── none declared
├── API / host
│   └── Pollinations HTTP; native image tools through provider subprocesses
└── OMA-owned specs
    ├── vendor-matrix.md / invocation.md
    ├── prompt-tips.md / checklist.md
    └── image config and output manifest contract
```

현재는 OMA image CLI가 provider 연결을 맡는다. 상세 호출 규약의 Gemini 계열 경로는 Antigravity(`agy`, Gemini Code Assist)다. 직접 Gemini API/CLI 경로는 deprecated로 표시되어 있다. 별도 외부 이미지 스킬을 설치·호출하는 연결은 현재 정의에 없다.

## oma-voice

근거: [SKILL.md](../../skills/oma-voice/SKILL.md), [음성 처리](../../skills/oma-voice/resources/audio-processing.md), [생성·전사 절차](../../skills/oma-voice/resources/execution-protocol.md), [VoiceStudio 백엔드](../../skills/oma-voice/resources/voicestudio.md), [upstream VoiceStudio](https://github.com/debpalash/VoiceStudio).

```text
oma-voice
├── skills
│   └── debpalash/VoiceStudio@voicestudio: conditional VoiceStudio backend
├── CLI
│   ├── bunx skills use debpalash/VoiceStudio@voicestudio: catalog fallback
│   └── ffmpeg / ffprobe: existing-audio processing
├── MCP
│   ├── Voicebox: TTS / STT / profile discovery
│   └── VoiceStudio: optional already-connected, discovered tool surface
├── API / host
│   ├── Voicebox REST: health and generated-audio retrieval
│   └── VoiceStudio REST: health, OpenAI-compatible speech / transcription
└── OMA-owned specs
    ├── execution-protocol.md / audio-processing.md
    ├── voicestudio.md: voice.backend resolution, routing, consent
    ├── config/voice-config.yaml / checklist.md
    └── audio and transcript manifest contracts
```

음성 백엔드는 `voice.backend`(`auto`·`voicebox`·`voicestudio`)로 고른다. `auto`는 Voicebox를 먼저, 꺼져 있으면 VoiceStudio를 사용하며, 명시한 백엔드는 다른 백엔드로 넘어가지 않는다. VoiceStudio의 엔드포인트·인증·클로닝·더빙 절차는 upstream `voicestudio` skill이 소유하고, OMA는 모드·길이 제한·출력 경로·manifest와 클로닝·모델 다운로드 동의를 관리한다. oma-video 나레이션 provider도 같은 설정을 읽는다.

기존 음성 가공은 Voicebox 없이 수행할 수 있다. TTS·STT와 기존 파일 가공을 분리한다. MCP tool 이름은 실제 discovery 결과로 해결한다.

## oma-video

근거: [SKILL.md](../../skills/oma-video/SKILL.md), [기존 영상 처리](../../skills/oma-video/resources/existing-media.md), [효과음·사운드 청취](../../skills/oma-video/resources/sound-design.md), [script 규약](../../skills/oma-video/resources/script-schema.md), [upstream ffmpeg-skill](https://github.com/kajisho5/ffmpeg-skill), [upstream earshot](https://github.com/Leonxlnx/earshot).

```text
oma-video
├── skills
│   ├── kajisho5/ffmpeg-skill: conditional supplied / rendered-video processing
│   ├── Leonxlnx/earshot@earshot: conditional bank SFX / kit and audio listening
│   ├── Leonxlnx/earshot@real-sound: conditional licensed-recording soundtrack
│   ├── oma-image: conditional stills / diagrams
│   ├── oma-slide: conditional explainer frames
│   ├── oma-voice: conditional transcription / TTS / duration fitting
│   └── oma-translation: conditional spoken-text translation
├── CLI
│   ├── bunx skills use kajisho5/ffmpeg-skill@ffmpeg-skill: catalog fallback
│   ├── bunx skills use Leonxlnx/earshot@earshot / @real-sound: catalog fallback
│   ├── earshot runtime (resolved checkout / PATH / EARSHOT_PYTHON): sfx, kit, timeline, sheet, critique
│   ├── python3 <support_dir>/scripts/<selected>.py: upstream operations
│   ├── oma video generate / compose / render / doctor / provider list
│   ├── selected HyperFrames / MPT compositor toolchain
│   └── ffmpeg / ffprobe: upstream runtime and OMA render validation
├── MCP
│   ├── ffmpeg-skill: optional already-connected, discovered tool surface
│   ├── earshot: optional already-connected, discovered tool surface
│   └── Voicebox / VoiceStudio: indirect through oma-voice (voice.backend)
├── API / host
│   └── selected asset providers; host vision for actual extracted images
├── OMA-owned specs
│   ├── script-schema.md: creation script input
│   ├── script.json / timing.json / render-spec.json / manifest.json contracts
│   ├── existing-media.md: routing, source timeline, vision and speech intent
│   ├── sound-design.md: earshot routing, cue times, composition placement, listening evidence
│   ├── vendor-matrix.md: creation providers
│   └── hyperframes-authoring/: creation composition rules
└── Upstream-owned specs
    ├── SKILL.md: mechanical editing and probe / check / look workflow
    ├── earshot SKILL.md / real-sound SKILL.md: sound bank, kit schema, levels, listening loops
    ├── scripts/ and complete _common/ package: flags and execution contract
    └── templates/ and project.json: upstream edit format
```

입력되거나 이미 렌더링된 영상의 편집 실행은 runtime skill catalog의 `ffmpeg-skill`을 우선 사용한다. 없거나 지원 파일이 불완전하면 `bunx skills use`를 `--agent` 없이 실행하고, 반환된 전체 지침과 지원 디렉터리를 사용한다. Python 스크립트와 `_common/` 전체, `templates/`, `references/`, `package.json`을 함께 유지하며 OMA에 vendoring하지 않는다. 연결된 MCP는 실제 discovery 결과로만 사용한다.

OMA는 원본 PTS·VFR·A/V offset의 근거, 샘플링 정의, 비전 해석, speech와 amplitude에 따른 편집 의도, 자막·더빙의 공통 타임라인을 관리한다. upstream이 정확한 프레임·PTS 근거를 제공하지 않으면 한계를 기록한다. contact sheet 시각이나 명목 FPS로 정확한 PTS를 만들어내지 않는다. 음성만의 작업은 `oma-voice`로 유지한다.

효과음·사운드 디자인·영상 오디오 청취는 earshot이 지원하는 기능이면 upstream으로 라우팅한다. 생성된 영상의 효과음은 `earshot` skill의 내장 뱅크 `sfx`/`kit`을, 실제 녹음이 필요하면 `real-sound`를, 싱크·라우드니스 검토는 `timeline`/`sheet`/`critique`를 사용한다. skill은 runtime skill catalog를 우선하고 없으면 `bunx skills use`로 불러오되, earshot Python runtime은 사용자 동의 없이 설치하지 않는다. OMA는 render-spec과 composition에서 cue 시각을 정하고, `kit.lock.json`의 측정 싱크 지점으로 HyperFrames `<audio>`를 배치하며, 측정값 기반 보고를 담당한다. 효과음 take는 CLI manifest에 들어가지 않으므로 `cues.json`·`kit.json`·`kit.lock.json`을 출처 기록으로 둔다.

새 영상 생성은 기존 OMA CLI와 asset bus를 사용한다. OMA `render-spec.json`과 upstream `project.json`은 별도 규약이다. 외부 스킬의 script·flag·template·검증 cookbook을 OMA 리소스에 복제하지 않는다. 사용자가 출력 형식을 지정하면 그 형식 안에서 실제 probe/check/look 근거와 미검증 범위를 전달한다.

생성용 하위 연결은 [생성 절차](../../skills/oma-video/resources/execution-protocol.md)에 선언되어 있으며, [provider 매트릭스](../../skills/oma-video/resources/vendor-matrix.md)의 deferred 표시와 실제 설치·동작 여부를 함께 확인해야 한다. Pexels·Pixelle·Cap·Strudel과 `oma-captions`를 현재 설치되거나 완성된 하위 스킬로 표시하지 않는다. HyperFrames·MPT는 구성 가능한 compositor 경로이며 설치 완료를 뜻하지 않는다.

## oma-slide

근거: [SKILL.md](../../skills/oma-slide/SKILL.md), [stage 규약](../../skills/oma-slide/resources/fixed-stage.md), [Canva 연결](../../skills/oma-slide/resources/canva-integration.md), [native PPTX route](../../skills/oma-slide/resources/native-pptx.md), [upstream ppt-master](https://github.com/hugohe3/ppt-master).

```text
oma-slide
├── skills
│   ├── hugohe3/ppt-master: conditional native-pptx route (load-and-follow)
│   ├── oma-image: conditional generated-image assets; upstream Path B on the native-pptx route
│   └── oma-hwp / oma-pdf: optional native-pptx source pre-conversion
├── CLI
│   ├── oma slide: create / validate / preview / bundle / export / style
│   ├── bunx skills use hugohe3/ppt-master@ppt-master: catalog fallback
│   ├── python3 <support_dir>/scripts/<selected>.py: upstream operations
│   └── uv venv / uv pip install -r <support_dir>/requirements.txt: consented only
├── MCP
│   ├── Canva: optional import / export
│   └── chrome-devtools: optional aesthetic screenshot review
├── API / host
│   ├── remote style templates: conditional design.md retrieval
│   └── font CDN resources: conditional validation / export access
├── OMA-owned specs
│   ├── fixed-stage.md: 1920 x 1080 and validator contract
│   ├── generation-protocol.md: route selection / design-doctrine.md
│   ├── style-presets.md / selection-index.json / animation-patterns.md
│   ├── native-pptx.md: upstream loading, substitutions, delivery
│   └── canva-integration.md / checklist.md
└── Upstream-owned specs (native-pptx)
    ├── SKILL.md / workflows/routing.md: routes, BLOCKING gates, Confirm UI
    ├── workflows/ and references/: route procedures and authoring rules
    ├── scripts/: SVG → DrawingML export, quality checks, attribution guard
    └── templates/: brand / style / layout / deck / chart / icon catalogs
```

외부 출처의 preset은 현재 vendored 리소스다. 원본 스킬을 런타임에 설치·호출하는 연결과 구분한다. Canva와 시각 검토 도구는 선택적 연결이다.

편집 가능한 PPTX, 기존 PPTX 수정, 문서→덱, 템플릿 생성, 나레이션 덱 요청은 `native-pptx` route로 보낸다. runtime skill catalog의 `ppt-master`를 우선 사용하고, 없거나 지원 파일이 불완전하면 `bunx skills use`를 `--agent` 없이 실행해 반환된 전체 지침과 지원 디렉터리를 사용한다. `scripts/`, `workflows/`, `references/`, `templates/`, `LICENSE`, `SPONSORS*`를 함께 유지하며 OMA에 vendoring하거나 수정하지 않는다. upstream attribution guard가 통과해야 실행한다.

OMA는 route 선택, 인터프리터·`init --dir`·이미지 경로·원본 전처리 치환, 전달 요약만 관리한다. AI 이미지는 upstream Path B(host-native)로 기록하고 `oma-image`로 생성한다. Python 패키지는 사용자 동의 후에만 설치한다. 그 밖의 절차와 게이트는 upstream이 소유한다.

## oma-explanation

근거: [SKILL.md](../../skills/oma-explanation/SKILL.md), [초안 규약](../../skills/oma-explanation/resources/draft-format.md), [HTML 계약](../../skills/oma-explanation/resources/html-contract.md).

```text
oma-explanation
├── skills
│   └── none delegated in the current scope
├── CLI
│   ├── oma explain render / lint / components / patch / validate
│   ├── git / gh: conditional change and PR input
│   └── oma diagram resolve: optional archify sidecar route
├── MCP
│   └── no fixed server declared
├── capabilities
│   └── configured code intelligence: conditional, transport-dependent
└── OMA-owned specs
    ├── draft-format.md: Markdown input language
    ├── document-structure.md: explanation content
    ├── html-contract.md: standalone output and validation
    └── shared diagram-engine.md: optional diagram integration
```

설명 초안과 렌더러의 역할을 구분한다. archify는 opt-in 연결이며, 기본 HTML과 선택적 sidecar의 결과를 각각 기록한다.

## oma-recap

근거: [SKILL.md](../../skills/oma-recap/SKILL.md), [출력 형식](../../skills/oma-recap/resources/output-formats.md).

```text
oma-recap
├── skills
│   └── none delegated in the current scope
├── CLI
│   ├── oma recap --json: normalized conversation history
│   └── jq: conditional Claude-history fallback
├── MCP
│   └── none declared
└── OMA-owned specs
    ├── date / timezone / window resolution in SKILL.md
    ├── output-formats.md: daily and multi-day summaries
    └── requested / in-progress / completed evidence rules
```

이력 수집은 CLI가 맡고, 요약은 현재 상위 스킬을 수행하는 에이전트가 작성한다. 별도 외부 요약 스킬은 채택되어 있지 않다.

## oma-docs

근거: [SKILL.md](../../skills/oma-docs/SKILL.md), [명령 규약](../../skills/oma-docs/resources/commands.md).

```text
oma-docs
├── skills
│   └── oma-translation: conditional authorized localization correction
├── CLI
│   ├── oma docs verify / sync / i18n / lint
│   ├── git: diff-based candidate selection
│   └── lychee: optional URL verification
├── MCP
│   └── none declared
└── OMA-owned specs
    ├── commands.md: modes, reports and generated outputs
    ├── reference / drift / patch evidence rules in SKILL.md
    └── shared execution policy for edit scope
```

현재 범위는 저장소 문서의 참조 검증·동기화·번역 drift다. CLI 결과와 에이전트가 작성하는 해석·패치를 구분한다.

## oma-translation

근거: [SKILL.md](../../skills/oma-translation/SKILL.md), [문체 스킬 연결](../../skills/oma-translation/resources/style-skills.md), [번역 rubric](../../skills/oma-translation/resources/translation-rubric.md).

```text
oma-translation
├── skills
│   ├── blader/humanizer: conditional English prose-style pass
│   └── epoko77-ai/im-not-ai / humanize-korean: conditional Korean prose-style pass
├── CLI
│   ├── bunx skills use: retrieve selected English or Korean skill instructions
│   ├── git clone: fallback for incomplete Korean execution resources
│   └── upstream Korean Python scripts: runtime-specific routing and gates
├── MCP
│   └── no translation-specific server selected
├── API / host
│   └── host file tools
├── capabilities
│   └── configured code intelligence: conditional, transport-dependent
└── OMA-owned specs
    ├── lang/ko.md / ja.md / zh.md / en.md: target profiles
    ├── style-skills.md: selection, acquisition and translation boundary
    ├── translation-rubric.md: translation quality
    ├── anti-ai-patterns.md: remaining target-language routes
    ├── protected tokens, glossary and structure rules
    └── shared anti-ai-prose.md for remaining targets; translation_voice configuration
```

영어 문체 교정에는 [blader/humanizer](https://github.com/blader/humanizer), 한국어 문체 교정에는 [epoko77-ai/im-not-ai](https://github.com/epoko77-ai/im-not-ai)를 선택했다. 대상 언어의 primary subtag로 선택하며 짧은 독립 UI 문자열은 기존 경량 경로를 유지한다. OMA는 번역 의미·용어·placeholder·구조·수정 범위를 검증한다. 다른 언어는 기존 프로필과 공유 진단을 사용한다.

두 언어 모두 `bunx skills use`로 지침을 로딩한다. 한국어는 runtime별 하위 경로를 명시하고 참조·역할·검증 스크립트가 실행 가능한지 확인한다. 현재 upstream의 일부 launcher는 원래 저장소 루트를 참조하므로, 임시 bundle에 실행 자원이 부족할 때 전체 checkout으로 보완한다. 선택과 로딩 기록이 실제 윤문·게이트 통과를 뜻하지 않는다.

## oma-academic-writing

근거: [SKILL.md](../../skills/oma-academic-writing/SKILL.md), [학술 글쓰기 검사](../../skills/oma-academic-writing/resources/anti-ai-checklist.md), [hedging 규약](../../skills/oma-academic-writing/resources/hedging-guide.md).

```text
oma-academic-writing
├── skills
│   ├── oma-scholar: conditional source-discovery handoff
│   └── oma-translation: conditional agreed non-English handoff
├── CLI
│   └── no academic-writing-specific CLI selected
├── MCP
│   └── no academic-writing-specific server selected
├── API / host
│   └── host draft, rubric and evidence-file tools
└── OMA-owned specs
    ├── anti-ai-checklist.md / sentence-structure-reference.md
    ├── academic-verb-tiers.md / hedging-guide.md
    └── rubric, Claim-Evidence Map and draft / revise / review contracts
```

조건부 전환 후보다. 현재는 자체 규약을 읽은 에이전트가 수행한다.

작업 트리 관찰: `abstract-guide.md`는 조사 시점에 미추적 리소스다. 위의 유지 대상 스펙 목록과 구분하며, 이 문서에서 채택 여부를 결정하지 않는다.

## 갱신 규칙

상위 스킬의 연결이 바뀌면 해당 가지와 근거 링크를 함께 갱신한다. 연결마다 구현 식별자, 선택 조건, 버전·설치 정책, OMA가 유지하는 규약을 관리한다. 아직 정하지 않은 값은 미선정으로 남긴다.

교체 후보는 각 상위 스킬 아래 별도로 기록하고, 검증 근거와 선택 상태를 붙인다. 실제 정의에 반영된 뒤 현재 구성으로 옮긴다. 이 문서는 구성 관리 문서이며 런타임 manifest로 사용하지 않는다.
