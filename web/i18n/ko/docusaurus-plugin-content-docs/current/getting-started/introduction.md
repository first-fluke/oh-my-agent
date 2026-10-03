---
title: 소개
description: oh-my-agent 종합 개요입니다. AI 코딩 어시스턴트를 33개 스킬 패키지, 12개 서브에이전트 정의, 점진적 스킬 로딩, 크로스 IDE 호환성을 갖춘 전문 엔지니어링 팀으로 만드는 멀티 에이전트 오케스트레이션 프레임워크입니다.
---

# 소개

oh-my-agent은 AI 기반 IDE 및 CLI 도구를 위한 멀티 에이전트 오케스트레이션 프레임워크입니다. 하나의 AI 어시스턴트에 모든 것을 맡기는 대신, 작업을 33개 스킬 패키지와 13개 표준 디스패치 역할로 라우팅합니다. 체크인된 서브에이전트 정의 파일 12개가 구현, 리뷰, 기획, 디버깅, 문서화, 연구, 인프라 페르소나를 제공합니다. `research-explorer.md`는 표준 `explore` 역할에 매핑되고 `orchestrator`는 별도 정의 파일이 없는 런타임 조율 역할입니다.

OMA는 호출하거나 해당 검사를 포함하는 워크플로우를 선택했을 때 기계적 검사를 제공합니다. `oma verify agent <agent-type>`는 선택한 에이전트 유형의 검사를 실행하고, `/ralph`는 아티팩트 기반 검증과 judge 루프를 추가하며, 활성화된 벤더 Stop 훅은 설정된 검사가 실행되는 동안 워크플로우를 유지할 수 있습니다. 스킬 로딩만으로 인수 기준이 생기지 않으며 일반 프롬프트가 모든 워크플로우 게이트를 자동으로 실행하지도 않습니다. 완료 여부는 워크플로우의 인수 기준과 생성된 파일로 판단하세요.

전체 시스템은 프로젝트 내부의 이식 가능한 `.agents/` 디렉토리에 존재합니다. Claude Code, Codex CLI, Antigravity CLI 또는 IDE, Cursor, OpenCode, 기타 지원 도구 사이를 전환해도 에이전트 설정이 코드와 함께 이동합니다.

처음이라면 [빠른 시작](./quick-start.md)부터 읽고 [중요한 기본값](./important-defaults.md)을 확인하세요. 설치는 SSOT와 벤더 통합을 만들며, 첫 점검에는 `oma doctor`, 첫 태스크에는 작은 단일 도메인 변경을 사용하면 됩니다. 조율이 필요한 태스크에서만 `/work`나 `/orchestrate`로 확장하세요.

---

## 멀티 에이전트 패러다임

기존 AI 코딩 어시스턴트는 하나의 프롬프트 컨텍스트에서 프론트엔드, 백엔드, 데이터베이스, 보안, 인프라를 처리하는 경우가 많습니다. 그러면 다음 문제가 생길 수 있습니다.

- **컨텍스트 희석**: 모든 도메인의 지식을 로딩하면 컨텍스트 윈도우가 낭비됩니다
- **소유권 불명확**: 크로스 도메인 태스크에서 각 부분의 경계가 분명하지 않음
- **수동 조율**: 여러 도메인에 걸친 복잡한 기능에는 호스트나 사용자가 선택한 인계가 필요함

oh-my-agent은 전문화로 이를 해결합니다:

1. **각 스킬에는 주된 도메인이 있습니다.** 프론트엔드 스킬은 React/Next.js, shadcn/ui, TailwindCSS v4, FSD-lite 아키텍처를 다룹니다. 백엔드 스킬은 Repository-Service-Router 패턴, 파라미터화된 쿼리, JWT 인증을 다룹니다. 경계에서 도메인이 겹칠 수 있으므로 두 번째 스킬이나 조율 워크플로우가 필요한지는 태스크의 인수 기준으로 판단합니다.

2. **에이전트는 병렬로 실행할 수 있습니다.** 백엔드 에이전트가 API를 구축하는 동안 프론트엔드 에이전트는 별도 워크스페이스에서 작업할 수 있습니다. 오케스트레이터는 파일로 보존되는 실행 범위 파일과 실행 기록으로 조율합니다.

3. **품질 지침이 포함됩니다.** 스킬에는 도메인 체크리스트, 에러 플레이북, Charter 규칙이 들어갑니다. Charter Preflight는 코드 작성 전에 범위를 좁히고, QA 리뷰는 선택한 워크플로우에 포함되거나 사용자가 요청할 때 실행됩니다.

---

## 현재 카탈로그: 스킬 33개, 정의 12개, 워크플로우 21개

카탈로그는 혼동하기 쉬운 세 가지 대상을 분리합니다.

- **스킬**은 `.agents/skills/*/SKILL.md` 아래의 도메인 지식 패키지 33개입니다. 자연어 의도에서 라우팅되고 리소스를 점진적으로 로드합니다.
- **에이전트 정의**는 `.agents/agents/` 아래의 파일 12개입니다. 벤더 네이티브 서브에이전트 페르소나를 제공하고 하나 이상의 스킬을 참조합니다.
- **워크플로우**는 `.agents/workflows/` 아래의 프로세스 정의 21개입니다. 4개(`orchestrate`, `work`, `ultrawork`, `ralph`)는 지속 워크플로우이고 나머지는 보고서까지 실행한 뒤 지속 모드를 유지하지 않습니다.

아래 섹션은 자세한 스킬 카탈로그를 유지합니다. 이름이나 설명이 달라질 때는 실제 `SKILL.md` 프론트매터를 기준으로 삼으세요.

체크인된 정의 파일 12개는 별칭을 통해 런타임 역할 13개를 담당합니다. `research-explorer.md`는 `explore`에 매핑되고 `orchestrator`는 런타임 전용입니다. 나머지 정의 파일은 [에이전트](../core-concepts/agents.md)에 나열된 역할에 매핑됩니다.

### 아이디어, 아키텍처 및 기획

| 에이전트 | 역할 | 핵심 기능 |
|-------|------|-----------------|
| **oma-brainstorm** | 디자인 우선 아이디어 탐색 | 사용자 의도를 탐색하고, 트레이드오프 분석과 함께 2-3가지 접근 방식을 제안하며, 코드 작성 전에 설계 문서를 생성합니다. 6단계 워크플로우: Context, Questions, Approaches, Design, Documentation, `/plan` 전환. |
| **oma-architecture** | 시스템 아키텍처 전문가 | 모듈/서비스/오너십 경계, 트레이드오프 분석, 이해관계자 종합. 방법론: 진단 라우팅, design-twice 비교, ATAM 방식 리스크 분석, CBAM 방식 우선순위화, ADR 방식 의사결정 기록. 기본적으로 비용을 고려합니다. |
| **oma-pm** | 프로덕트 매니저 | 요구사항을 의존성이 있는 우선순위 태스크로 분해합니다. API 컨트랙트를 정의합니다. `.agents/results/plan-{sessionId}.json`과 세션 범위 task board를 출력합니다. ISO 21500 개념, ISO 31000 리스크 프레이밍, ISO 38500 거버넌스를 지원합니다. |

### 구현

| 에이전트 | 역할 | 기술 스택 및 리소스 |
|-------|------|----------------------|
| **oma-frontend** | UI/UX 전문가 | React, Next.js, TypeScript, TailwindCSS v4, shadcn/ui, FSD-lite 아키텍처. 라이브러리: luxon (날짜), ahooks (훅), es-toolkit (유틸), Jotai (클라이언트 상태), TanStack Query (서버 상태), @tanstack/react-form + Zod (폼), better-auth (인증), nuqs (URL 상태). 리소스: `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `snippets.md`, `angular-rules.md`, `error-playbook.md`, `checklist.md`. |
| **oma-backend** | API 및 서버 전문가 | 클린 아키텍처 (Router-Service-Repository-Models). 스택 불문이며, 프로젝트 매니페스트에서 Python/Node.js/Rust/Go/Java/Elixir/Ruby/.NET을 감지합니다. 인증에 JWT + Argon2id 사용. 리소스: `execution-protocol.md`, `orm-reference.md`, `checklist.md`, `error-playbook.md`. 언어별 `stack/` 레퍼런스 생성을 위한 `/stack-set` 지원. |
| **oma-mobile** | 크로스 플랫폼 모바일 | Flutter, Dart, Riverpod/Bloc 상태 관리, 인터셉터를 붙인 Dio로 API 호출, GoRouter 네비게이션. 클린 아키텍처: domain-data-presentation. Material Design 3 (Android) + iOS HIG. 60fps 목표. Swift 네이티브 iOS도 지원: SwiftUI + `@Observable` (iOS 17+), API 클라이언트용 Apple `swift-openapi-generator`, `App/Core/Features/Shared` 프로젝트 레이아웃. 리소스: `execution-protocol.md`, `tech-stack.md`, `screen-template.dart`, `screen-template.swift`, `screen-template.tsx`, `checklist.md`, `error-playbook.md`; 플랫폼별 variant는 `/stack-set`이 실체화합니다. |
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
| **oma-qa** | 품질 보증 | 보안 감사 (OWASP Top 10), 성능 분석, 접근성 (WCAG 2.2 AA), 코드 품질 리뷰. 심각도: CRITICAL/HIGH/MEDIUM/LOW(파일:라인 및 수정 코드 포함). ISO/IEC 25010 품질 특성 및 ISO/IEC 29119 테스트 정렬 지원. 리소스: `execution-protocol.md`, `iso-quality.md`, `checklist.md`, `self-check.md`, `error-playbook.md`. |
| **oma-debug** | 버그 진단 및 수정 | 재현 우선 방법론. 근본 원인 분석, 최소 수정, 필수 회귀 테스트, 유사 패턴 스캔. 심볼 추적에 Serena MCP 사용. 리소스: `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`. |
| **oma-refactor** | 동작을 보존하는 리팩터링 | 특성화 테스트 안전망으로 게이팅하는 안전한 점진적 구조 개선. 핫스팟 타기팅(복잡도 × 변경 빈도), 코드 스멜과 SATD 선별, 실패 시 미카도 방식 되돌리기, 상태 변경에는 expand-contract, 리팩터링만 담는 커밋(동작 변경을 섞지 않음). 엔진 우선 변환(IDE rename, jscodeshift/ast-grep)과 `uvx lizard` / `uvx radon` 기반 지표를 씁니다. 성공 기준은 가독성이며 지표는 대리 지표일 뿐입니다. |

### 현지화, 조율 및 Git

| 에이전트 | 역할 | 핵심 기능 |
|-------|------|-----------------|
| **oma-translation** | 컨텍스트 인식 번역 | 6장면 흐름: Prepare, Acquire, Reason, Act, Verify, Finalize. 번역 방법은 보호 구문과 의미를 읽고, 레지스터를 선택하고, 대상 언어로 재구성하고, 필요한 경우 저자 문체를 보존하는 네 단계입니다. 대상 언어별 프로파일(`resources/lang/{code}.md`)에 레지스터와 타이포그래피 규칙이 들어 있습니다. 리소스: `translation-rubric.md`, `anti-ai-patterns.md`, `lang/{ko,ja,zh,en}.md`. |
| **oma-orchestration** | 자동화된 멀티 에이전트 조율자 | CLI 서브에이전트를 병렬 스폰하고, 파일로 보존되는 세션·태스크 보드·진행·결과 파일을 통해 조율하며, 검증 루프를 모니터링합니다. 설정: MAX_PARALLEL (기본 3), MAX_RETRIES (기본 2), POLL_INTERVAL (기본 30초). 에이전트 간 리뷰 루프와 선택적 세션 증거 포함. 리소스: `subagent-prompt-template.md`, `memory-schema.md`. |
| **oma-coordination** | 수동 멀티 에이전트 워크플로우 가이드 | CLI `oma agent spawn`으로 PM, 프론트엔드, 백엔드, 모바일, QA 에이전트를 단계별로 조율합니다. PM 분해로 시작하고 같은 우선순위 태스크를 별도 워크스페이스에서 스폰하며 실행 범위가 지정된 진행·결과 파일을 모니터링하고 프론트엔드와 모바일 작업 전에 API·데이터 컨트랙트를 맞춘 뒤 QA 리뷰로 마무리합니다. `oma-orchestration`의 수동 대응물입니다. |
| **oma-scm** | 형상관리(SCM) + Git | 브랜치 전략, 머지/리베이스/충돌 해결, 워크트리, 베이스라인, 릴리스 상태 추적을 다룹니다. 안전한 스테이징과 Conventional Commit 메시지를 안내하며 co-author trailer는 활성화된 `scm.co_author` 설정에서 가져옵니다. |

### 검색, 회고 및 문서 처리

| 에이전트 | 역할 | 핵심 기능 |
|-------|------|-----------------|
| **oma-search** | 의도 기반 검색 라우터 | 쿼리를 Context7(문서), 네이티브 웹 검색, `gh`/`glab`(코드), Serena(로컬)로 라우팅. 모든 비로컬 결과에 도메인 신뢰도 점수. Fail-forward 라우팅(docs→web→fetch). 플래그: `--docs`, `--code`, `--web`, `--strict`, `--wide`, `--gitlab`. |
| **oma-recap** | 크로스 도구 작업 회고 | Grok, Claude, Codex, Gemini, Qwen, Cursor, Antigravity의 대화 이력을 분석합니다. 자연어 날짜/범위 입력을 해석하고, 도구+세션별로 그룹화하며, 테마를 추출하고, 일/기간 요약을 렌더링하며 CLI가 요청 범위를 30일로 제한한 경우 이를 기록합니다. |
| **oma-hwp** | HWP/HWPX/HWPML → Markdown | `bunx kordoc@latest`를 통한 한글 워드프로세서 문서 변환. 헤딩, 표(중첩 포함), 각주, 하이퍼링크, 이미지 보존. `flatten-tables.ts` 후처리기로 Hancom Private Use Area 문자 제거. |
| **oma-pdf** | PDF → Markdown | `uvx opendataloader-pdf`를 통한 PDF 문서 변환. 헤딩, 표, 목록, 이미지 보존; 스캔된 PDF용 OCR 하이브리드 모드; `uvx mdformat`으로 출력 정규화. |

### 학술 및 연구 글쓰기

| 에이전트 | 역할 | 핵심 기능 |
|-------|------|-----------------|
| **oma-academic-writing** | 출판 수준 영어 산문 | 에세이, 보고서, 요약문, 결론, 문헌 검토를 작성하고 수정하고 감사합니다. 네 가지 프로토콜을 동시에 강제합니다. 문장 구조(4가지 유형, 길이와 도입부 변화), 동사(일반 동사를 금지하고 등급화된 학술 코퍼스에서 대체), 헤징(근거의 강도에 맞춘 표현), 안티 AI 준수입니다. 판단에 앞서 인용을 요구하는 루브릭 게이트, 주장-근거 맵, 역방향 아웃라이닝을 지원합니다. 모드: `draft` / `revise` / `review`. |
| **oma-scholar** | 연구 논문 사이드카 도우미 | Knows `.knows.yaml` 사이드카 스펙(v0.9.0 / `paper@1`)으로 학술 논문을 검색하고, 생성하고, 검증하고, 리뷰하고, 비교합니다. 주장·근거·관계에 토큰 효율적으로 접근합니다(주장만 볼 때 약 700토큰, 전체 PDF는 약 10K). knows.academy를 대상으로 `oma scholar search/resolve/get/lint`를 제공하며, 2026년 이전 논문은 OpenAlex로 자동 폴백합니다. 날조 방지 원칙에 따라 모르는 필드는 추측하지 않고 생략합니다. |

### 보안

| 에이전트 | 역할 | 핵심 기능 |
|-------|------|-----------------|
| **oma-deepsec** | 에이전트 기반 취약점 스캐너 드라이버 | Vercel의 `deepsec`(`bunx deepsec`)을 엔드 투 엔드로 운용합니다. `.deepsec/` 워크스페이스를 `init`하고, 프로젝트에 밀착한 `INFO.md`를 작성하고, 비용을 의식한 `scan` / `process` / `triage` / `revalidate` / `export` 패스를 실행하고, 2-잡 CI 패턴과 `process --diff`로 PR을 게이팅하고, 커스텀 매처를 작성합니다. 큰 패스 전에 `--limit 50 --concurrency 5`로 보정하고 유료 작업 전에 비용을 제시합니다. 비용은 저장소 크기와 백엔드에 따라 달라집니다. 에이전트 백엔드는 `codex`(gpt-5.5) 또는 `claude`(claude-opus-4-8)입니다. |

### 문서화 및 메타 도구

| 에이전트 | 역할 | 핵심 기능 |
|-------|------|-----------------|
| **oma-docs** | 문서 드리프트 탐지기 | `verify` 모드는 `docs/**/*.md`에서 깨진 참조(파일 경로, CLI 명령, 설정 키, 환경 변수, 스크립트)를 결정론적으로 검사하고 0 또는 1로 종료합니다. `sync` 모드는 git diff를 후보 문서와 연결해 호스트 LLM이 적용할 패치 제안을 문서별 확인과 함께 작성합니다(절대 자동 적용하지 않습니다). URL 검사는 `lychee`에 위임하고, CLI는 구조화된 JSON을 내보내며, 종합은 전부 호스트 LLM이 합니다(벤더 SDK를 호출하지 않습니다). `.agents/`는 절대 수정하지 않습니다. |
| **oma-explanation** | 코드 변경 설명기 | diff, PR, 브랜치, 커밋 범위를 Background, Intuition, Code, Quiz 섹션이 있는 오프라인 HTML 설명서로 변환합니다. `/explain` 워크플로우가 최종 산출물을 검증하고 `.agents/results/explain/` 아래에 기록합니다. |
| **oma-skill-creation** | SSL-lite 스킬 작성 전문가 | 네 가지 필수 섹션(Scheduling / Structural Flow / Logical Operations / References)을 갖춘 SSL-lite 형식으로 OMA 스킬을 만들고, 갱신하고, 감사합니다. 스킬 유형을 분류하고, 인라인 정규 경로를 정확히 하나만 넣고, `When NOT to use`의 교차 라우팅을 강제하며, `oma skill audit`으로 설명 충돌을 잡습니다(TF-IDF 코사인 60% 이상 경고, 75% 이상 실패). 긴 변형 설명은 `resources/`로 밀어냅니다. |

### 시장 조사

| 에이전트 | 역할 | 핵심 기능 |
|-------|------|-----------------|
| **oma-market** | 커뮤니티 신호 인텔리전스 | 의도를 분류하고(pain / trend / competitor / discovery), `oma market harvest`에 내장된 소스별 페처로 키가 필요 없는 커뮤니티 소스(Reddit, HN, Bluesky, Mastodon, GitHub, Grounding, 그리고 `yt-dlp`가 설치되면 YouTube)에 병렬로 요청합니다(네트워크 I/O는 전부 harvest 안에서만 일어납니다). 이어서 결정론적 CLI 연산으로 점수를 매기고, 융합하고(RRF k=60), 클러스터링합니다(엔티티 중첩 + MMR). 의도에 따라 프레임워크를 자동 선택하고(SWOT / Porter's 5F / PESTEL), `detect-trap` 사전 점검을 필수로 거치며, 환경 키가 없는 유료 소스는 자동으로 건너뜁니다. 결과는 LAW를 준수하는 브리프 하나를 `.agents/results/market/{slug}-{YYYYMMDD}.md`에 내보냅니다. |

### 미디어 및 콘텐츠 생성

| 에이전트 | 역할 | 핵심 기능 |
|-------|------|-----------------|
| **oma-image** | 멀티 벤더 이미지 라우터 | 인증 상태를 인지해 Codex(ChatGPT OAuth 기반 `gpt-image-2`, CLI 우선), `agy` CLI와 Gemini Code Assist를 통한 Antigravity Gemini 계열 “nano-banana” 모델(정확한 모델은 내부 선택), Pollinations(무료 `flux` / `zimage`)로 병렬 디스패치합니다. 생성 전에 명확화와 보강 프로토콜을 거치고, 참조 이미지를 최대 10개까지 받으며, 비용 가드레일(0.20달러 이상이면 확인)과 재현용 `manifest.json`을 제공합니다. CLI는 `oma image generate`, `oma image doctor`, `oma image vendor list`입니다. |
| **oma-slide** | 애니메이션이 풍부한 HTML 덱 생성기 | 1920×1080 고정 스테이지에서 "AI slop"을 피한 개성 있는 발표 덱을 작성한 뒤, 지오메트리를 결정론적으로 검증하고 단일 파일 HTML로 묶고 `oma slide` CLI로 PDF/PNG/PPTX로 내보냅니다. 스타일 프리셋과 과감한 템플릿, CJK는 Pretendard 규칙, `prefers-reduced-motion`과 눈에 보이는 포커스 필수, 최대 3회 자동 수정 검증 루프를 제공합니다. 이미지는 `oma-image`에 위임하며, Canva MCP 내보내기와 가져오기를 선택적으로 지원합니다. |
| **oma-video** | 숏폼·설명·데모 라우터 | `oma video` CLI로 숏폼·릴스(9:16), 설명 영상(16:9), 사람이 녹화하는 데모(16:9)를 만듭니다. 결정론적 에셋 버스(`script.json` → `timing.json` → `render-spec.json`)가 관리되는 HyperFrames 컴포지터로 이어지며, 에셋 프로바이더는 로컬 폴백을 사용할 수 있지만 컴포지션·도구 체인·렌더 오류는 실행을 실패시킵니다. 사람의 캡처 과정에서 자격 증명을 자동화하지 않습니다. |
| **oma-voice** | 로컬 우선 TTS와 STT | Voicebox MCP 서버로 클라우드 호출이나 호출당 비용 없이 온디바이스 알림, 에셋 TTS, 전사를 수행합니다. TTS 기본 출력은 WAV이고 로컬에서 MP3로 변환할 수 있으며, 전사는 오디오 경로나 base64를 받습니다. TTS 호출은 5000자, STT 입력은 30분으로 제한되며 저장된 에셋·전사 실행은 매니페스트를 기록합니다. |

---

## 점진적 로딩 모델

oh-my-agent은 컨텍스트 윈도우 소진을 방지하기 위해 2계층 스킬 아키텍처를 사용합니다:

**Layer 1: SKILL.md (스킬이 라우팅될 때 로딩됨):**
에이전트의 정체성, 라우팅 조건, 핵심 규칙, "언제 사용할지 / 언제 사용하지 말아야 할지" 가이드가 포함됩니다. 에이전트가 작업 중이 아닐 때 로딩되는 것은 이것뿐입니다.

**Layer 2: resources/ (필요 시 로딩):**
실행 프로토콜, 기술 스택 레퍼런스, 코드 스니펫, 에러 플레이북, 체크리스트, 예제가 포함됩니다. 에이전트가 태스크를 수행할 때만 로딩되며, 그때도 특정 태스크 유형에 해당하는 리소스만 로딩됩니다(`context-loading.md`의 난이도 평가 및 태스크-리소스 매핑 기반).

이 구조로 절약되는 컨텍스트 양은 스킬과 태스크에 따라 달라지므로, 수치를 가정하지 말고 측정하세요. 측정 스크립트와 그 추정치가 무엇을 포함하는지는 [토큰 절약 계산](../core-concepts/skills.md#token-savings-math)을 참고하세요.

---

## .agents/: 단일 진실 원천(SSOT)

oh-my-agent에 필요한 모든 것은 `.agents/` 디렉토리에 있습니다:

```
.agents/
├── oma-config.yaml         # Shared preferences and provider/model settings
├── oma-config.cue          # Optional schema-backed configuration
├── skills/                 # 33 skill directories + _shared resources
│   ├── _shared/            # Core resources used by all agents
│   └── oma-{skill}/         # Per-skill SKILL.md + resources/variants
├── workflows/              # 21 workflow definitions
├── agents/                 # 12 subagent definitions
├── results/plan-{sessionId}.json               # Generated plan output
├── state/                  # Active workflow state files
├── results/                # Agent result files
└── mcp.json                # MCP server configuration
```

`.claude/` 디렉토리는 IDE 통합 레이어로만 존재합니다. `.agents/`를 가리키는 심볼릭 링크와 키워드 감지용 훅, HUD 상태바가 포함됩니다. 오케스트레이션 중 런타임 조율 상태는 `.agents/state/memories/`에 보관하며, 오래된 프로젝트에서는 레거시 `.serena/memories/`로 폴백합니다.

이 아키텍처 덕분에 에이전트 설정은 다음 성질을 갖습니다:
- **이식 가능**: 재설정 없이 IDE를 전환할 수 있습니다
- **버전 관리 가능**: `.agents/`를 코드와 함께 커밋합니다
- **공유 가능**: 팀원이 동일한 에이전트 설정을 그대로 받습니다

---

## 지원 IDE 및 CLI 도구

oh-my-agent은 선택한 AI IDE와 CLI의 네이티브 스킬·프롬프트 로딩 또는 생성된 통합 파일을 통해 작동합니다:

| 도구 | 통합 방식 | 병렬 에이전트 |
|------|-------------------|----------------|
| **Claude Code** | 네이티브 스킬 + Agent 도구 | Task 도구를 통한 완전한 병렬 처리 |
| **Antigravity CLI/IDE** | `agy`용 스킬과 MCP 설정 투영 | `oma agent spawn` |
| **Codex CLI** | 스킬 자동 로딩 | 모델 중재 병렬 요청 |
| **Cursor** | `.cursor/` 통합을 통한 스킬 | 수동 스폰 |
| **OpenCode** | 스킬 + 인프로세스 플러그인 브릿지 + 생성된 서브에이전트 (`.opencode/agents/`) | `oma agent spawn --vendor opencode` |
| **Kimi Code CLI** | `~/.kimi-code/`의 훅과 스킬(동의를 받아 HOME에 기록하며, SSOT `.agents/skills/`도 네이티브로 읽습니다), 프로젝트 범위 Serena MCP | `oma agent spawn --vendor kimi` |

에이전트 스폰은 선택한 벤더와 활성 설정에 맞춰 조정됩니다. 같은 벤더 런타임은 네이티브 서브에이전트를 사용할 수 있고, 벤더가 다르면 `oma agent spawn`으로 폴백합니다. 디스패치 규칙은 [병렬 실행](../core-concepts/parallel-execution.md)을 참고하세요.

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
| automatic, parallel, orchestrate | oma-orchestration |

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

워크플로우를 트리거하기 위해 `/command`를 입력할 필요가 없습니다. oh-my-agent의 훅 시스템이 `.agents/hooks/core/triggers.json`에 정의된 키워드 트리거와 자연어 입력을 대조하며, 이 정의는 모든 벤더가 공유합니다. 11개 언어를 지원합니다 (한국어, 영어, 일본어, 중국어, 스페인어, 프랑스어, 독일어, 포르투갈어, 러시아어, 네덜란드어, 폴란드어).

- **실행 의도 입력** (예: "인증 기능 계획해줘") → 자동으로 워크플로우 로드
- **정보 요청 입력** (예: "orchestrate가 뭐야?") → 필터링, 워크플로우를 트리거하지 않음
- **명시적 `/command`** → 중복 방지를 위해 훅이 감지 건너뜀
- **지속적 워크플로우**는 "workflow done"이라고 말할 때까지 매 메시지마다 컨텍스트 재주입

---

## 크로스 벤더 지원

oh-my-agent은 Claude Code에 한정되지 않습니다. 훅을 지원하는 벤더는 동일한 `oma hook run` ABI를 공유하고, 확장 벤더는 인프로세스 브리지를 사용합니다.

| 벤더 | 훅 전달 방식 | StatusLine |
|--------|--------------|------------|
| **Claude Code** | `oma-hook.sh --vendor claude --event UserPromptSubmit` / `PreToolUse` / `Stop` | `bun .claude/hooks/hud.ts` (직접 호출, 변경 없음) |
| **Codex CLI** | `oma-hook.sh --vendor codex --event UserPromptSubmit` / `PreToolUse` / `Stop` | 없음 |
| **Qwen Code** | `oma-hook.sh --vendor qwen --event UserPromptSubmit` / `PreToolUse` / `Stop` | `ui.statusLine`을 통한 `bun` 경로 |
| **Cursor** | `oma-hook.sh --vendor cursor --event beforeSubmitPrompt` / `preToolUse` | 없음 |
| **Grok** | `oma-hook.sh --vendor grok --event UserPromptSubmit` / `Stop` | 없음 |
| **Kiro** | `oma-hook.sh --vendor kiro --event userPromptSubmit` / `preToolUse` / `stop` | 없음 |
| **Kimi Code** | `oma-hook.sh --vendor kimi --event UserPromptSubmit` / `PreToolUse` / `Stop` (`~/.kimi-code/config.toml`의 글로벌 전용 TOML `[[hooks]]`) | 없음 |
| **Antigravity** | `oma-hook.sh --vendor antigravity --event PreInvocation` / `PreToolUse` / `Stop` | 없음 |
| **pi** | 인프로세스 브릿지(`installPiExtension`)를 쓰며 `oma hook run`을 거치지 않습니다 | 없음 |

`.agents/` 디렉토리는 소스 오브 트루스입니다. 설치 과정은 선택한 벤더에 스킬, 워크플로우, 훅, 에이전트 정의를 연결하거나 투영하며, 벤더마다 지원 범위가 다릅니다. 같은 벤더의 네이티브 서브에이전트와 CLI로 스폰한 크로스 벤더 에이전트 모두 이 소스를 읽습니다.

---

## 다음 단계

- **[설치](./installation.md)**: 세 가지 설치 방법, 프리셋, CLI 설정, 검증
- **[에이전트](/docs/core-concepts/agents)**: 33개 스킬, 13개 디스패치 역할, Charter Preflight 심층 분석
- **[스킬](/docs/core-concepts/skills)**: 2계층 아키텍처 설명
- **[워크플로우](/docs/core-concepts/workflows)**: 트리거와 단계가 포함된 21개 워크플로우
- **[사용 가이드](/docs/guide/usage)**: 단일 태스크부터 전체 오케스트레이션까지 실제 예제
