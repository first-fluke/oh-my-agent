---
title: 소개
description: oh-my-agent 종합 개요입니다. AI 코딩 어시스턴트를 32개 도메인 에이전트, 점진적 스킬 로딩, 크로스 IDE 호환성을 갖춘 전문 엔지니어링 팀으로 만들어 주는 멀티 에이전트 오케스트레이션 프레임워크입니다.
---

# 소개

oh-my-agent은 AI 기반 IDE 및 CLI 도구를 위한 멀티 에이전트 오케스트레이션 프레임워크입니다. 하나의 AI 어시스턴트에 모든 것을 맡기는 대신, 작업을 32개 전문 에이전트에 분배합니다. 각 에이전트는 실제 엔지니어링 팀의 역할을 본떠 만들어졌으며, 고유한 기술 스택 지식, 실행 프로토콜, 에러 플레이북, 품질 체크리스트를 갖추고 있습니다.

전체 시스템은 프로젝트 내부의 이식 가능한 `.agents/` 디렉토리에 존재합니다. Claude Code, Gemini CLI, Codex CLI, Antigravity IDE, Cursor 또는 기타 지원 도구 간에 자유롭게 전환할 수 있으며, 에이전트 설정은 코드와 함께 이동합니다.

---

## 멀티 에이전트 패러다임

기존 AI 코딩 어시스턴트는 범용으로 동작합니다. 프론트엔드, 백엔드, 데이터베이스, 보안, 인프라 모두를 같은 프롬프트 컨텍스트, 같은 수준의 전문성으로 처리합니다. 그래서 다음과 같은 문제가 생깁니다:

- **컨텍스트 희석**: 모든 도메인의 지식을 로딩하면 컨텍스트 윈도우가 낭비됩니다
- **들쭉날쭉한 품질**: 범용 어시스턴트는 어떤 도메인에서든 전문가를 따라갈 수 없습니다
- **조율 부재**: 여러 도메인에 걸친 복잡한 기능이 순차적으로 처리됩니다

oh-my-agent은 전문화로 이를 해결합니다:

1. **각 에이전트는 하나의 도메인에 깊이 특화되어 있습니다.** 프론트엔드 에이전트는 React/Next.js, shadcn/ui, TailwindCSS v4, FSD-lite 아키텍처를 알고 있습니다. 백엔드 에이전트는 Repository-Service-Router 패턴, 파라미터화된 쿼리, JWT 인증을 알고 있습니다. 서로 겹치지 않습니다.

2. **에이전트는 병렬로 실행됩니다.** 백엔드 에이전트가 API를 구축하는 동안 프론트엔드 에이전트는 이미 UI를 생성하고 있습니다. 오케스트레이터가 공유 메모리를 통해 조율합니다.

3. **품질이 기본으로 보장됩니다.** 모든 에이전트에는 도메인별 체크리스트와 에러 플레이북이 있습니다. Charter Preflight가 코드 작성 전에 범위 초과를 미리 잡아냅니다. QA 리뷰는 나중에 덧붙이는 절차가 아니라 핵심 단계입니다.

---

## 전체 32개 에이전트

### 아이디어, 아키텍처 및 기획

| 에이전트 | 역할 | 핵심 기능 |
|-------|------|-----------------|
| **oma-brainstorm** | 디자인 우선 아이디어 탐색 | 사용자 의도를 탐색하고, 트레이드오프 분석과 함께 2-3가지 접근 방식을 제안하며, 코드 작성 전에 설계 문서를 생성합니다. 6단계 워크플로우: Context, Questions, Approaches, Design, Documentation, `/plan` 전환. |
| **oma-architecture** | 시스템 아키텍처 전문가 | 모듈/서비스/오너십 경계, 트레이드오프 분석, 이해관계자 종합. 방법론: 진단 라우팅, design-twice 비교, ATAM 방식 리스크 분석, CBAM 방식 우선순위화, ADR 방식 의사결정 기록. 기본적으로 비용을 고려합니다. |
| **oma-pm** | 프로덕트 매니저 | 요구사항을 의존성이 있는 우선순위 태스크로 분해합니다. API 컨트랙트를 정의합니다. `.agents/results/plan-{sessionId}.json`과 `task-board.md`를 출력합니다. ISO 21500 개념, ISO 31000 리스크 프레이밍, ISO 38500 거버넌스를 지원합니다. |

### 구현

| 에이전트 | 역할 | 기술 스택 및 리소스 |
|-------|------|----------------------|
| **oma-frontend** | UI/UX 전문가 | React, Next.js, TypeScript, TailwindCSS v4, shadcn/ui, FSD-lite 아키텍처. 라이브러리: luxon (날짜), ahooks (훅), es-toolkit (유틸), Jotai (클라이언트 상태), TanStack Query (서버 상태), @tanstack/react-form + Zod (폼), better-auth (인증), nuqs (URL 상태). 리소스: `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `component-template.tsx`, `snippets.md`, `error-playbook.md`, `checklist.md`, `examples/`. |
| **oma-backend** | API 및 서버 전문가 | 클린 아키텍처 (Router-Service-Repository-Models). 스택 불문이며, 프로젝트 매니페스트에서 Python/Node.js/Rust/Go/Java/Elixir/Ruby/.NET을 감지합니다. 인증에 JWT + Argon2id 사용. 리소스: `execution-protocol.md`, `orm-reference.md`, `examples.md`, `checklist.md`, `error-playbook.md`. 언어별 `stack/` 레퍼런스 생성을 위한 `/stack-set` 지원. |
| **oma-mobile** | 크로스 플랫폼 모바일 | Flutter, Dart, Riverpod/Bloc 상태 관리, 인터셉터를 붙인 Dio로 API 호출, GoRouter 네비게이션. 클린 아키텍처: domain-data-presentation. Material Design 3 (Android) + iOS HIG. 60fps 목표. Swift 네이티브 iOS도 지원: SwiftUI + `@Observable` (iOS 17+), API 클라이언트용 Apple `swift-openapi-generator`, `App/Core/Features/Shared` 프로젝트 레이아웃. 리소스: `execution-protocol.md`, `tech-stack.md`, `snippets.md`, `screen-template.dart`, `screen-template.swift`, `checklist.md`, `error-playbook.md`. `variants/swift-ios/`의 변형 레퍼런스(`/stack-set`으로 생성). |
| **oma-db** | 데이터베이스 아키텍처 | SQL, NoSQL, 벡터 데이터베이스 모델링. 스키마 설계 (기본 3NF), 정규화, 인덱싱, 트랜잭션, 용량 계획, 백업 전략. ISO 27001/27002/22301 인식 설계 지원. 리소스: `execution-protocol.md`, `document-templates.md`, `anti-patterns.md`, `vector-db.md`, `iso-controls.md`, `checklist.md`, `error-playbook.md`. |

### 디자인

| 에이전트 | 역할 | 핵심 기능 |
|-------|------|-----------------|
| **oma-design** | 디자인 시스템 전문가 | 토큰, 타이포그래피, 컬러 시스템, 모션 디자인 (motion/react, GSAP, Three.js), 반응형 우선 레이아웃, WCAG 2.2 준수가 포함된 DESIGN.md를 생성합니다. 7단계 워크플로우: Setup, Extract, Enhance, Propose, Generate, Audit, Handoff. 안티 패턴("AI slop") 방지 적용. 선택적 Stitch MCP 통합. 리소스: `design-md-spec.md`, `design-tokens.md`, `anti-patterns.md`, `prompt-enhancement.md`, `stitch-integration.md`, 그리고 `reference/` 디렉토리(타이포그래피, 컬러, 공간, 모션, 반응형, 컴포넌트, 접근성, 셰이더 가이드). |

### 인프라, DevOps 및 관측성

| 에이전트 | 역할 | 핵심 기능 |
|-------|------|-----------------|
| **oma-tf-infra** | Infrastructure-as-code | 멀티 클라우드 Terraform (AWS, GCP, Azure, Oracle Cloud). OIDC 우선 인증, 최소 권한 IAM, Policy-as-code (OPA/Sentinel), 비용 최적화. ISO/IEC 42001 AI 제어, ISO 22301 연속성, ISO/IEC/IEEE 42010 아키텍처 문서화 지원. 리소스: `multi-cloud-examples.md`, `cost-optimization.md`, `policy-testing-examples.md`, `iso-42001-infra.md`, `checklist.md`. |
| **oma-dev-workflow** | 모노레포 태스크 자동화 | mise task runner, CI/CD 파이프라인, 데이터베이스 마이그레이션, 릴리스 조율, git hooks, pre-commit 검증. 리소스: `validation-pipeline.md`, `database-patterns.md`, `api-workflows.md`, `i18n-patterns.md`, `release-coordination.md`, `troubleshooting.md`. |
| **oma-observability** | 의도 기반 관측성 라우터 | MELT+P 시그널 커버리지(metrics/logs/traces/profiles/cost/audit/privacy), 전송 계층 튜닝(UDP/MTU, OTLP gRPC vs HTTP, Collector 토폴로지, 샘플링), W3C Trace Context 전파, SLO 관리와 burn-rate 알람, 인시던트 포렌식(6차원 국소화), 메타 관측성(자체 건강성, 클록 동기화, 카디널리티, 보관). CNCF 우선; Fluentd 사용 중단(Fluent Bit 또는 OTel Collector 사용). |

### 품질 및 디버깅

| 에이전트 | 역할 | 핵심 기능 |
|-------|------|-----------------|
| **oma-qa** | 품질 보증 | 보안 감사 (OWASP Top 10), 성능 분석, 접근성 (WCAG 2.1 AA), 코드 품질 리뷰. 심각도: CRITICAL/HIGH/MEDIUM/LOW(파일:라인 및 수정 코드 포함). ISO/IEC 25010 품질 특성 및 ISO/IEC 29119 테스트 정렬 지원. 리소스: `execution-protocol.md`, `iso-quality.md`, `checklist.md`, `self-check.md`, `error-playbook.md`. |
| **oma-debug** | 버그 진단 및 수정 | 재현 우선 방법론. 근본 원인 분석, 최소 수정, 필수 회귀 테스트, 유사 패턴 스캔. 심볼 추적에 Serena MCP 사용. 리소스: `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`. |
| **oma-refactor** | 동작을 보존하는 리팩터링 | 특성화 테스트 안전망으로 게이팅하는 안전한 점진적 구조 개선. 핫스팟 타기팅(복잡도 × 변경 빈도), 코드 스멜과 SATD 선별, 실패 시 미카도 방식 되돌리기, 상태 변경에는 expand-contract, 리팩터링만 담는 커밋(동작 변경을 섞지 않음). 엔진 우선 변환(IDE rename, jscodeshift/ast-grep)과 `uvx lizard` / `uvx radon` 기반 지표를 씁니다. 성공 기준은 가독성이며 지표는 대리 지표일 뿐입니다. |

### 현지화, 조율 및 Git

| 에이전트 | 역할 | 핵심 기능 |
|-------|------|-----------------|
| **oma-translator** | 컨텍스트 인식 번역 | 4단계 번역 방법: 원문 분석, 의미 추출, 대상 언어로 재구성, 검증. 톤, 레지스터, 도메인 용어를 유지합니다. 안티 AI 패턴 감지. 배치 번역(i18n 파일) 지원. 출판 품질을 위한 선택적 7단계 정제 모드. 대상 언어별 프로파일(`resources/lang/{code}.md`)에 레지스터 체계, 타이포그래피, 언어별 번역체 규칙이 들어 있습니다. 리소스: `translation-rubric.md`, `anti-ai-patterns.md`, `lang/{ko,ja,zh,en}.md`. |
| **oma-orchestrator** | 자동화된 멀티 에이전트 조율자 | CLI 서브에이전트를 병렬 스폰하고, MCP 메모리를 통해 조율하며, 진행 상황을 모니터링하고, 검증 루프를 실행합니다. 설정: MAX_PARALLEL (기본 3), MAX_RETRIES (기본 2), POLL_INTERVAL (기본 30초). 에이전트 간 리뷰 루프와 Clarification Debt 모니터링 포함. 리소스: `subagent-prompt-template.md`, `memory-schema.md`. |
| **oma-coordination** | 수동 멀티 에이전트 워크플로우 가이드 | CLI `oma agent:spawn`으로 PM, 프론트엔드, 백엔드, 모바일, QA 에이전트를 단계별로 조율합니다. 항상 PM 분해로 시작하고, 같은 우선순위 태스크를 별도 워크스페이스에서 병렬로 스폰하고, `progress-{agent}.md`를 모니터링하고, 프론트엔드와 모바일 작업 전에 API·데이터 컨트랙트를 맞추고, QA 리뷰로 마무리합니다. `oma-orchestrator`의 수동 대응물입니다. |
| **oma-scm** | 형상관리(SCM) + Git | 브랜치 전략, 머지/리베이스/충돌 해결, 워크트리, 베이스라인, 릴리스 상태 추적을 다룹니다. 또한 안전한 스테이징과 Conventional Commit 메시지 생성도 지원합니다. Co-Author: `First Fluke <our.first.fluke@gmail.com>`. |

### 검색, 회고 및 문서 처리

| 에이전트 | 역할 | 핵심 기능 |
|-------|------|-----------------|
| **oma-search** | 의도 기반 검색 라우터 | 쿼리를 Context7(문서), 네이티브 웹 검색, `gh`/`glab`(코드), Serena(로컬)로 라우팅. 모든 비로컬 결과에 도메인 신뢰도 점수. Fail-forward 라우팅(docs→web→fetch). 플래그: `--docs`, `--code`, `--web`, `--strict`, `--wide`, `--gitlab`. |
| **oma-recap** | 크로스 도구 작업 회고 | Claude, Codex, Qwen, Cursor의 대화 이력을 분석합니다. 자연어 날짜/범위 입력을 해석하고, 도구+세션별로 그룹화하며, 테마를 추출하고, 스탠드업, 주간 회고, 작업 로그를 위한 일/기간 요약을 렌더링합니다. |
| **oma-hwp** | HWP/HWPX/HWPML → Markdown | `bunx kordoc@latest`를 통한 한글 워드프로세서 문서 변환. 헤딩, 표(중첩 포함), 각주, 하이퍼링크, 이미지 보존. `flatten-tables.ts` 후처리기로 Hancom Private Use Area 문자 제거. |
| **oma-pdf** | PDF → Markdown | `uvx opendataloader-pdf`를 통한 PDF 문서 변환. 헤딩, 표, 목록, 이미지 보존; 스캔된 PDF용 OCR 하이브리드 모드; `uvx mdformat`으로 출력 정규화. |

### 학술 및 연구 글쓰기

| 에이전트 | 역할 | 핵심 기능 |
|-------|------|-----------------|
| **oma-academic-writer** | 출판 수준 영어 산문 | 에세이, 보고서, 요약문, 결론, 문헌 검토를 작성하고 수정하고 감사합니다. 네 가지 프로토콜을 동시에 강제합니다. 문장 구조(4가지 유형, 길이와 도입부 변화), 동사(일반 동사를 금지하고 등급화된 학술 코퍼스에서 대체), 헤징(근거의 강도에 맞춘 표현), 안티 AI 준수입니다. 판단에 앞서 인용을 요구하는 루브릭 게이트, 주장-근거 맵, 역방향 아웃라이닝을 지원합니다. 모드: `draft` / `revise` / `review`. |
| **oma-scholar** | 연구 논문 사이드카 도우미 | Knows `.knows.yaml` 사이드카 스펙(v0.9.0 / `paper@1`)으로 학술 논문을 검색하고, 생성하고, 검증하고, 리뷰하고, 비교합니다. 주장·근거·관계에 토큰 효율적으로 접근합니다(주장만 볼 때 약 700토큰, 전체 PDF는 약 10K). knows.academy를 대상으로 `oma scholar search/resolve/get/lint`를 제공하며, 2026년 이전 논문은 OpenAlex로 자동 폴백합니다. 날조 방지 원칙에 따라 모르는 필드는 추측하지 않고 생략합니다. |

### 보안

| 에이전트 | 역할 | 핵심 기능 |
|-------|------|-----------------|
| **oma-deepsec** | 에이전트 기반 취약점 스캐너 드라이버 | Vercel의 `deepsec`(`bunx deepsec`)을 엔드 투 엔드로 운용합니다. `.deepsec/` 워크스페이스를 `init`하고, 프로젝트에 밀착한 `INFO.md`를 작성하고, 비용을 의식한 `scan` / `process` / `triage` / `revalidate` / `export` 패스를 실행하고, 2-잡 CI 패턴과 `process --diff`로 PR을 게이팅하고, 커스텀 매처를 작성합니다. 전체 패스 전에 `--limit 50 --concurrency 5`로 보정하고 예상 비용을 먼저 제시합니다. 스캔 비용은 약 25달러에서 1,200달러 이상까지 벌어집니다. 에이전트 백엔드는 `codex`(gpt-5.5) 또는 `claude`(claude-opus-4-8)입니다. |

### 문서화 및 메타 도구

| 에이전트 | 역할 | 핵심 기능 |
|-------|------|-----------------|
| **oma-docs** | 문서 드리프트 탐지기 | `verify` 모드는 `docs/**/*.md`에서 깨진 참조(파일 경로, CLI 명령, 설정 키, 환경 변수, 스크립트)를 결정론적으로 검사하고 0 또는 1로 종료합니다. `sync` 모드는 git diff를 후보 문서와 연결해 호스트 LLM이 적용할 패치 제안을 문서별 확인과 함께 작성합니다(절대 자동 적용하지 않습니다). URL 검사는 `lychee`에 위임하고, CLI는 구조화된 JSON을 내보내며, 종합은 전부 호스트 LLM이 합니다(벤더 SDK를 호출하지 않습니다). `.agents/`는 절대 수정하지 않습니다. |
| **oma-skill-creator** | SSL-lite 스킬 작성 전문가 | 네 가지 필수 섹션(Scheduling / Structural Flow / Logical Operations / References)을 갖춘 SSL-lite 형식으로 OMA 스킬을 만들고, 갱신하고, 감사합니다. 스킬 유형을 분류하고, 인라인 정규 경로를 정확히 하나만 넣고, `When NOT to use`의 교차 라우팅을 강제하며, `oma skills audit`으로 설명 충돌을 잡습니다(TF-IDF 코사인 60% 이상 경고, 75% 이상 실패). 긴 변형 설명은 `resources/`로 밀어냅니다. |

### 시장 조사

| 에이전트 | 역할 | 핵심 기능 |
|-------|------|-----------------|
| **oma-market** | 커뮤니티 신호 인텔리전스 | 의도를 분류하고(pain / trend / competitor / discovery), `oma market harvest`에 내장된 소스별 페처로 키가 필요 없는 커뮤니티 소스(Reddit, HN, Bluesky, Mastodon, GitHub, Grounding, 그리고 `yt-dlp`가 설치되면 YouTube)에 병렬로 요청합니다(네트워크 I/O는 전부 harvest 안에서만 일어납니다). 이어서 결정론적 CLI 연산으로 점수를 매기고, 융합하고(RRF k=60), 클러스터링합니다(엔티티 중첩 + MMR). 의도에 따라 프레임워크를 자동 선택하고(SWOT / Porter's 5F / PESTEL), `detect-trap` 사전 점검을 필수로 거치며, 환경 키가 없는 유료 소스는 자동으로 건너뜁니다. 결과는 LAW를 준수하는 브리프 하나를 `.agents/results/market/{slug}-{YYYYMMDD}.md`에 내보냅니다. |

### 미디어 및 콘텐츠 생성

| 에이전트 | 역할 | 핵심 기능 |
|-------|------|-----------------|
| **oma-image** | 멀티 벤더 이미지 라우터 | 인증 상태를 인지해 Codex(ChatGPT OAuth 기반 `gpt-image-2`, CLI 우선), Antigravity(`agy` CLI + Gemini Code Assist 기반 `gemini-2.5-flash-image`, 일명 nano-banana), Pollinations(무료 `flux` / `zimage`)로 병렬 디스패치합니다. 생성 전에 명확화와 보강 프로토콜을 거치고, 참조 이미지를 최대 10개까지 받으며, 비용 가드레일(0.20달러 이상이면 확인)과 재현용 `manifest.json`을 제공합니다. CLI는 `oma image generate/doctor/list-vendors`입니다. |
| **oma-slide** | 애니메이션이 풍부한 HTML 덱 생성기 | 1920×1080 고정 스테이지에서 "AI slop"을 피한 개성 있는 발표 덱을 작성한 뒤, 지오메트리를 결정론적으로 검증하고 단일 파일 HTML로 묶고 `oma slide` CLI로 PDF/PNG/PPTX로 내보냅니다. 스타일 프리셋과 과감한 템플릿, CJK는 Pretendard 규칙, `prefers-reduced-motion`과 눈에 보이는 포커스 필수, 최대 3회 자동 수정 검증 루프를 제공합니다. 이미지는 `oma-image`에 위임하며, Canva MCP 내보내기와 가져오기를 선택적으로 지원합니다. |
| **oma-video** | 숏폼·설명·데모 라우터 | 키가 선택 사항인 3계층 라우터(CLI 우선 / MCP / 안내형)로 완성된 `.mp4`를 생성합니다. 세 가지 모드는 숏폼과 릴스(9:16), 설명 영상(README·코드·데이터 기반 16:9), 데모와 워크스루(화면 캡처 파일 또는 감독하에 진행하는 헤디드 웹 캡처)입니다. 결정론적 에셋 버스(`script.json` → `timing.json` → `render-spec.json`)를 거쳐 벤더링된 Remotion 컴포지터로 넘깁니다. `oma-voice` 내레이션, `oma-image`와 `oma-slide` 비주얼, 키가 필요 없는 자막을 조합하며, 캡처는 사람이 개입하고 자격 증명을 자동화하지 않습니다. |
| **oma-voice** | 로컬 우선 TTS와 STT | Voicebox MCP 서버로 온디바이스 음성 생성과 전사를 수행합니다. 클라우드도, API 키도, 호출당 비용도 없습니다. 모드는 알림(작업 완료·차단 알림 오디오), 에셋 TTS(복제 또는 프리셋 프로필로 mp3/wav 보이스오버 생성), 전사(오디오 → Markdown)입니다. `voicebox_speak`와 `voicebox_transcribe` MCP 도구를 쓰고, TTS는 5000자, STT는 30분 상한이며, 생성마다 `manifest.json`을 남깁니다. |

---

## 점진적 로딩 모델

oh-my-agent은 컨텍스트 윈도우 소진을 방지하기 위해 2계층 스킬 아키텍처를 사용합니다:

**Layer 1: SKILL.md (~800바이트, 항상 로딩됨):**
에이전트의 정체성, 라우팅 조건, 핵심 규칙, "언제 사용할지 / 언제 사용하지 말아야 할지" 가이드가 포함됩니다. 에이전트가 작업 중이 아닐 때는 이것만 로딩됩니다.

**Layer 2: resources/ (필요 시 로딩):**
실행 프로토콜, 기술 스택 레퍼런스, 코드 스니펫, 에러 플레이북, 체크리스트, 예제가 포함됩니다. 에이전트가 태스크를 수행할 때만 로딩되며, 그때도 특정 태스크 유형에 해당하는 리소스만 로딩됩니다(`context-loading.md`의 난이도 평가 및 태스크-리소스 매핑 기반).

이 설계는 모든 것을 미리 로딩하는 것에 비해 약 75%의 토큰을 절약합니다. Flash 티어 모델(128K 컨텍스트)의 경우, 총 리소스 예산은 약 3,100 토큰으로 컨텍스트 윈도우의 2.4%에 불과합니다.

---

## .agents/: 단일 진실 원천(SSOT)

oh-my-agent에 필요한 모든 것은 `.agents/` 디렉토리에 있습니다:

```
.agents/
├── config/                 # oma-config.yaml
├── skills/                 # 33개 스킬 디렉토리 (32개 에이전트 + _shared)
│   ├── _shared/            # 모든 에이전트가 사용하는 핵심 리소스
│   └── oma-{agent}/        # 에이전트별 SKILL.md + resources/
├── workflows/              # 16개 워크플로우 정의
├── agents/                 # 12개 서브에이전트 정의
├── results/plan-{sessionId}.json               # 생성된 계획 출력
├── state/                  # 활성 워크플로우 상태 파일
├── results/                # 에이전트 결과 파일
└── mcp.json                # MCP 서버 설정
```

`.claude/` 디렉토리는 IDE 통합 레이어로만 존재합니다. `.agents/`를 가리키는 심볼릭 링크와 키워드 감지용 훅, HUD 상태바가 포함됩니다. `.serena/memories/` 디렉토리는 오케스트레이션 세션 중 런타임 상태를 보관합니다.

이 아키텍처 덕분에 에이전트 설정은 다음 성질을 갖습니다:
- **이식 가능**: 재설정 없이 IDE를 전환할 수 있습니다
- **버전 관리 가능**: `.agents/`를 코드와 함께 커밋합니다
- **공유 가능**: 팀원이 동일한 에이전트 설정을 그대로 받습니다

---

## 지원 IDE 및 CLI 도구

oh-my-agent은 스킬/프롬프트 로딩을 지원하는 모든 AI 기반 IDE 또는 CLI와 함께 작동합니다:

| 도구 | 통합 방식 | 병렬 에이전트 |
|------|-------------------|----------------|
| **Claude Code** | 네이티브 스킬 + Agent 도구 | Task 도구를 통한 완전한 병렬 처리 |
| **Gemini CLI** | `.agents/skills/`에서 스킬 자동 로딩 | `oma agent:spawn` |
| **Codex CLI** | 스킬 자동 로딩 | 모델 중재 병렬 요청 |
| **Antigravity IDE** | 스킬 자동 로딩 | `oma agent:spawn` |
| **Cursor** | `.cursor/` 통합을 통한 스킬 | 수동 스폰 |
| **OpenCode** | 스킬 + 인프로세스 플러그인 브릿지 + 생성된 서브에이전트 (`.opencode/agents/`) | `oma agent:spawn -m opencode` |
| **Kimi Code CLI** | `~/.kimi-code/`의 훅과 스킬(동의를 받아 HOME에 기록하며, SSOT `.agents/skills/`도 네이티브로 읽습니다), 프로젝트 범위 Serena MCP | `oma agent:spawn -m kimi` |

에이전트 스폰은 벤더 감지 프로토콜을 통해 각 벤더에 자동으로 적응합니다. 이 프로토콜은 벤더별 마커를 확인합니다(예: Claude Code의 `Agent` 도구, Codex CLI의 `apply_patch`).

---

## 스킬 라우팅 시스템

프롬프트를 전송하면 oh-my-agent은 스킬 라우팅 맵(`.agents/skills/_shared/core/skill-routing.md`)을 사용하여 어떤 에이전트가 처리할지 결정합니다:

| 도메인 키워드 | 라우팅 대상 |
|----------------|-----------|
| API, endpoint, REST, GraphQL, database, migration | oma-backend |
| auth, JWT, login, register, password | oma-backend |
| UI, component, page, form, screen (웹) | oma-frontend |
| style, Tailwind, responsive, CSS | oma-frontend |
| mobile, iOS, Android, Flutter, React Native, Swift, SwiftUI, app | oma-mobile |
| bug, error, crash, broken, slow | oma-debug |
| review, security, performance, accessibility | oma-qa |
| UI design, design system, landing page, DESIGN.md | oma-design |
| brainstorm, ideate, explore, idea | oma-brainstorm |
| plan, breakdown, task, sprint | oma-pm |
| automatic, parallel, orchestrate | oma-orchestrator |

여러 도메인에 걸친 복잡한 요청의 경우, 라우팅은 정해진 실행 순서를 따릅니다. 예를 들어, "풀스택 앱을 만들어줘"는 oma-pm (계획) -> oma-backend + oma-frontend (병렬 구현) -> oma-qa (리뷰) 순서로 라우팅됩니다.

---

## HUD 상태바

Claude Code에서 실행 시, oh-my-agent은 상태바에 지속적으로 `[OMA]` 표시기를 보여줍니다:
- 모델명 (예: Opus, Sonnet)
- 컨텍스트 사용량 색상 코딩 (초록 < 70%, 노랑 70-85%, 빨강 > 85%)
- 활성 워크플로우 상태 (지속적 워크플로우 실행 중인 경우)

HUD는 `.claude/hooks/hud.ts`에서 Claude Code의 `statusLine` 훅 기능을 사용합니다.

---

## 자동 워크플로우 감지

워크플로우를 트리거하기 위해 `/command`를 입력할 필요가 없습니다. oh-my-agent의 `UserPromptSubmit` 훅이 자연어 입력을 `.claude/hooks/triggers.json`에 정의된 키워드 트리거와 대조합니다. 11개 언어를 지원합니다 (한국어, 영어, 일본어, 중국어, 스페인어, 프랑스어, 독일어, 포르투갈어, 러시아어, 네덜란드어, 폴란드어).

- **실행 의도 입력** (예: "인증 기능 계획해줘") → 자동으로 워크플로우 로드
- **정보 요청 입력** (예: "orchestrate가 뭐야?") → 필터링, 워크플로우를 트리거하지 않음
- **명시적 `/command`** → 중복 방지를 위해 훅이 감지 건너뜀
- **지속적 워크플로우**는 "workflow done"이라고 말할 때까지 매 메시지마다 컨텍스트 재주입

---

## 크로스 벤더 지원

oh-my-agent은 Claude Code에 한정되지 않습니다. 훅 모델을 쓰는 모든 벤더가 동일한 `oma hook` ABI를 공유합니다.

| 벤더 | 훅 전달 방식 | StatusLine |
|--------|--------------|------------|
| **Claude Code** | `oma-hook.sh --vendor claude --event UserPromptSubmit` / `PreToolUse` / `Stop` | `bun .claude/hooks/hud.ts` (직접 호출, 변경 없음) |
| **Codex CLI** | `oma-hook.sh --vendor codex --event UserPromptSubmit` / `PreToolUse` / `Stop` | 없음 |
| **Gemini CLI** | `oma-hook.sh --vendor gemini --event BeforeAgent` / `BeforeTool` / `AfterAgent` | 없음 |
| **Qwen Code** | `oma-hook.sh --vendor qwen --event UserPromptSubmit` / `PreToolUse` / `Stop` | `ui.statusLine`을 통한 `bun` 경로 |
| **Cursor** | `oma-hook.sh --vendor cursor --event beforeSubmitPrompt` / `preToolUse` | 없음 |
| **Grok** | `oma-hook.sh --vendor grok --event UserPromptSubmit` / `Stop` | 없음 |
| **Kiro** | `oma-hook.sh --vendor kiro --event userPromptSubmit` / `preToolUse` / `stop` | 없음 |
| **Kimi Code** | `oma-hook.sh --vendor kimi --event UserPromptSubmit` / `PreToolUse` / `Stop` (`~/.kimi-code/config.toml`의 글로벌 전용 TOML `[[hooks]]`) | 없음 |
| **Antigravity** | `oma-hook.sh --vendor antigravity --event PreInvocation` / `PreToolUse` / `Stop` | 없음 |
| **pi** | 인프로세스 브릿지(`installPiExtension`)를 쓰며 `oma hook`을 거치지 않습니다 | 없음 |

스킬과 워크플로우는 모든 벤더에서 `.agents/`를 통해 자동 로드됩니다. 벤더 감지는 자동으로 이루어지며, 에이전트는 감지된 런타임 환경에 맞춰 스폰 방식을 바꿉니다.

---

## 다음 단계

- **[설치](./installation.md)**: 세 가지 설치 방법, 프리셋, CLI 설정, 검증
- **[에이전트](/docs/core-concepts/agents)**: 32개 에이전트와 Charter Preflight 심층 분석
- **[스킬](/docs/core-concepts/skills)**: 2계층 아키텍처 설명
- **[워크플로우](/docs/core-concepts/workflows)**: 트리거와 단계가 포함된 16개 워크플로우
- **[사용 가이드](/docs/guide/usage)**: 단일 태스크부터 전체 오케스트레이션까지 실제 예제
