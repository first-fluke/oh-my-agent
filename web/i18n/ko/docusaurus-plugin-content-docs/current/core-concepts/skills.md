---
title: 스킬
description: OMA의 33개 스킬 2계층 아키텍처를 설명하는 완전 가이드입니다. SKILL.md 라우팅, 온디맨드 리소스, 공유·조건부 프로토콜, 벤더 실행, 토큰 측정, 라우팅 메커니즘을 다룹니다.
---

# 스킬

스킬은 디스패치 역할에 도메인 지침을 제공하는 구조화된 지식 패키지입니다. 실행 프로토콜, 기술 스택 레퍼런스, 코드 템플릿, 에러 플레이북, 품질 체크리스트, 스킬이 제공하는 예제를 담으며, 토큰 효율성을 위해 설계된 2계층 아키텍처로 구성됩니다.

---

## 2계층 설계

### Layer 1: SKILL.md (스킬이 라우팅될 때 로딩됨)

모든 스킬의 루트에는 `SKILL.md` 파일이 있습니다. 스킬로 라우팅될 때 컨텍스트 윈도우에 들어옵니다. 주입 훅은 본문이 아니라 **경로 참조**만 전달하므로, 라우팅되지 않은 스킬은 `description` 말고는 비용이 들지 않습니다. 포함 내용:

- **YAML 프론트매터**: `name`과 `description` (라우팅과 표시에 사용)
- **사용 시기 / 사용하지 말아야 할 때**: 명시적 활성화 조건
- **핵심 규칙**: 해당 도메인의 가장 중요한 5-15개 제약
- **아키텍처 개요**: 코드 구조화 방법
- **라이브러리 목록**: 승인된 의존성과 용도
- **참조**: Layer 2 리소스 포인터 (자동으로 로딩되지 않음)

프론트매터 예시:

```yaml
---
name: oma-frontend
description: Frontend specialist for React, Next.js, TypeScript with FSD-lite architecture, shadcn/ui, and design system alignment. Use for UI, component, page, layout, CSS, Tailwind, and shadcn work.
---
```

description 필드는 매우 중요합니다. 스킬 라우팅 시스템이 태스크를 에이전트에 매칭할 때 사용하는 라우팅 키워드가 여기에 포함됩니다.

### Layer 2: resources/ (필요 시 로딩)

`resources/` 디렉토리에는 심층적인 실행 지식이 포함됩니다. 다음 조건에서만 로딩됩니다:
1. 호스트 또는 워크플로우가 스킬을 선택했을 때 (예: 네이티브 스킬 매칭 또는 명시적 명령)
2. 현재 태스크가 해당 레퍼런스의 로딩 조건을 충족할 때

이 필요 시 로딩은 컨텍스트 로딩 가이드(`.agents/skills/_shared/core/context-loading.md`)가 관리하며, 엔트리 지침과 태스크에 따라 선택되는 레퍼런스를 구분합니다.

---

## 파일 구조 예시

```
.agents/skills/oma-frontend/
├── SKILL.md                          ← Layer 1: loaded when routed
└── resources/
    ├── execution-protocol.md         ← Layer 2: step-by-step workflow
    ├── tech-stack.md                 ← Layer 2: detailed technology specs
    ├── angular-rules.md              ← Layer 2: Angular-specific conventions
    ├── snippets.md                   ← Layer 2: copy-paste code patterns
    ├── error-playbook.md             ← Layer 2: error recovery procedures
    └── checklist.md                  ← Layer 2: quality verification checklist

.agents/skills/oma-backend/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── orm-reference.md              ← Domain-specific (ORM queries, N+1, transactions)
│   ├── checklist.md
│   └── error-playbook.md
└── variants/                          ← Shipped language seeds / generated references
    ├── node/
    ├── python/
    └── rust/

.agents/skills/oma-mobile/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── tech-stack.md
│   ├── screen-template.dart
│   ├── screen-template.swift         ← Swift native iOS screen template
│   ├── screen-template.tsx            ← React Native screen template
│   ├── checklist.md
│   └── error-playbook.md
└── variants/                          ← Stack schema and generated platform references
    ├── README.md
    └── stack.schema.json

.agents/skills/oma-design/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── anti-patterns.md
│   ├── checklist.md
│   ├── design-md-spec.md
│   ├── design-tokens.md
│   ├── prompt-enhancement.md
│   ├── stitch-integration.md
│   └── error-playbook.md
└── reference/                         ← Deep reference material
    ├── typography.md
    ├── color-and-contrast.md
    ├── spatial-design.md
    ├── motion-design.md
    ├── responsive-design.md
    ├── component-patterns.md
    ├── accessibility.md
    └── shader-and-3d.md
```

---

## 스킬별 리소스 유형

| 리소스 유형 | 파일명 패턴 | 목적 | 로딩 시점 |
|--------------|-----------------|---------|-------------|
| **실행 프로토콜** | `execution-protocol.md` | 단계별 워크플로우: 분석 -> 계획 -> 구현 -> 검증 | 선택한 작업에 명령이나 계약 세부 사항이 필요할 때 |
| **기술 스택** | `tech-stack.md` | 상세 기술 사양, 버전, 설정 | 선택한 프레임워크 또는 스택 결정 |
| **에러 플레이북** | `error-playbook.md` | "3 strikes" 에스컬레이션이 있는 복구 절차 | 에러 발생 시에만 |
| **체크리스트** | `checklist.md` | 도메인별 품질 검증 | Verify 단계에서 |
| **스니펫** | `snippets.md` | 복사-붙여넣기 가능한 코드 패턴 | 익숙하지 않은 구현 또는 출력 형태 |
| **예제** | `examples.md` 또는 `examples/` | LLM용 few-shot 입출력 예제 | 익숙하지 않은 구현 또는 출력 형태 |
| **변형** | `variants/` 디렉토리 | 언어/프레임워크별 레퍼런스. backend는 `node`, `python`, `rust` 시드를 제공하고 mobile은 스키마를 제공하며 생성된 플랫폼 레퍼런스를 받을 수 있습니다. | 일치하는 스택이 있을 때 |
| **템플릿** | `component-template.tsx`, `screen-template.dart` | 보일러플레이트 파일 템플릿 | 컴포넌트 생성 시 |
| **도메인 레퍼런스** | `orm-reference.md`, `anti-patterns.md` 등 | 특정 서브태스크를 위한 심층 도메인 지식 | 태스크 유형별 |

---

## 공유 리소스 (_shared/)

모든 에이전트는 `.agents/skills/_shared/`의 공통 기반을 공유합니다. 세 가지 카테고리로 구성됩니다:

### 핵심 리소스 (`.agents/skills/_shared/core/`)

| 리소스 | 목적 | 로딩 시점 |
|----------|---------|-------------|
| **`skill-routing.md`** | 태스크 결과, 담당 영역, 실제 의존성에 따라 라우팅하며, 반드시 거쳐야 하는 에이전트 체인이나 턴 할당량은 없습니다. | 오케스트레이터와 코디네이션 스킬에서 참조 |
| **`context-loading.md`** | 담당 스킬의 엔트리, 조건부 레퍼런스, 런타임 로딩 경계. | 컨텍스트를 구성할 때 |
| **`prompt-structure.md`** | 익숙하지 않은 태스크를 인계할 때 목표, 컨텍스트, 실제 제약 조건, 인수 증거를 담도록 안내하며, 직접 처리하는 태스크에는 필수 템플릿이 없습니다. | PM 에이전트와 모든 워크플로우에서 참조 |
| **`clarification-protocol.md`** | 일상적인 세부 사항은 컨텍스트에서 해결하고, 중요한 정보가 빠졌거나 승인이 필요할 때만 질문합니다. | 요구사항이 모호할 때 |
| **`context-budget.md`** | 파일 크기 추정, 실제 프롬프트 측정, 범위를 좁힌 읽기, 체크포인트. | 긴 태스크 또는 컨텍스트 오버헤드 진단 |
| **`difficulty-guide.md`** | 의존성과 검증 요구 사항에 따라 계획의 깊이와 산출물을 정합니다. | 태스크 분해에 난이도 추정이 필요할 때 |
| **`quality-principles.md`** | 범위, 유지보수성, 증거, 적정 수준의 검증을 다루는 지침. | 품질 중심 워크플로우(ultrawork) 시작 시 |
| **`vendor-detection.md`** | 현재 런타임 환경(Claude Code, Codex CLI, Antigravity, Cursor, Kiro, Qwen, CLI 폴백) 감지 프로토콜. 호스트 마커와 설정된 벤더 상태를 사용합니다. | 워크플로우 시작 시 |
| **`session-metrics.md`** | 대화 페널티 점수나 평가자 페널티 점수가 없는 선택적 세션 증거. | 요청된 회고 또는 중요한 수정 |
| **`common-checklist.md`** | 해당하는 크로스 도메인 검사 항목이며, 전역 줄 수 제한이나 일괄적인 catch 요구는 없습니다. | 관련이 있을 때의 크로스 도메인 리뷰 |
| **`lessons-learned.md`** | 증거로 뒷받침되는 교훈을 버전/트리거 조건과 함께 기록하고 적용하며, 자동 RCA 임계값은 없습니다. | 에러 후 및 세션 종료 시 참조 |
| **`api-contracts/`** | 선택적으로 쓰는 컨트랙트 템플릿입니다. 프로젝트 스키마를 재사용하세요. 생성된 컨트랙트는 스킬 소스 밖에 있습니다. | 크로스 바운더리 작업 계획 시 |

### 런타임 리소스 (`.agents/skills/_shared/runtime/`)

| 리소스 | 목적 |
|----------|---------|
| **`memory-protocol.md`** | CLI 서브에이전트용 메모리 파일 형식과 연산. On Start, During Execution, On Completion 프로토콜을 설정 가능한 메모리 도구(read/write/edit)로 정의합니다. 실험 추적 확장 포함. |
| **`execution-protocols/claude.md`** | Claude Code 전용 실행 패턴. 벤더가 claude일 때 `oma agent spawn`이 주입합니다. |
| **`execution-protocols/antigravity.md`** | Antigravity CLI(`agy`) 전용 실행 패턴. |
| **`execution-protocols/codex.md`** | Codex CLI 전용 실행 패턴. |
| **`execution-protocols/commandcode.md`** | CommandCode 실행 패턴. |
| **`execution-protocols/grok.md`** | Grok 실행 패턴. |
| **`execution-protocols/kimi.md`** | Kimi Code 실행 패턴. |
| **`execution-protocols/kiro.md`** | Kiro 실행 패턴. |
| **`execution-protocols/opencode.md`** | OpenCode 확장 실행 패턴. |
| **`execution-protocols/pi.md`** | pi 확장 실행 패턴. |
| **`execution-protocols/qwen.md`** | Qwen CLI 전용 실행 패턴. |

벤더별 실행 프로토콜은 CLI로 스폰된 에이전트에 `oma agent spawn`이 자동으로 주입합니다. 네이티브 서브에이전트는 선택된 벤더의 통합 규칙을 사용합니다.

### 조건부 리소스 (`.agents/skills/_shared/conditional/`)

실행 중 특정 조건이 충족될 때만 로딩됩니다:

| 리소스 | 트리거 조건 | 로딩 주체 |
|----------|-------------------|-----------|
| **`quality-score.md`** | 정의된 기준선이나 실험 비교가 필요할 때 | 오케스트레이터 (QA 에이전트 프롬프트에 전달) |
| **`experiment-ledger.md`** | IMPL 기준선 수립 후 첫 실험 기록 | 오케스트레이터 (인라인, 기준선 측정 후) |
| **`exploration-loop.md`** | 복구가 반복해서 실패했고, 예산 범위에서 대안을 시험해 볼 가치가 있을 때 | 오케스트레이터 (인라인, 가설 에이전트 스폰 전) |

이 리소스는 각자의 트리거 조건에 해당할 때까지 로딩이 보류됩니다. 난이도만으로는 주입되지 않습니다.

---

## skill-routing.md를 통한 스킬 라우팅 방법

스킬 라우팅 맵은 태스크가 에이전트에 매칭되는 방법을 정의합니다:

### 단순 라우팅 (단일 도메인)

"Tailwind CSS로 로그인 폼을 만들어줘"라는 프롬프트는 `UI`, `component`, `form`, `Tailwind` 키워드에 매칭되어 **oma-frontend**로 라우팅됩니다.

### 복합 요청 라우팅

멀티 도메인 요청은 정해진 실행 순서를 따릅니다:

| 요청 패턴 | 실행 순서 |
|----------------|----------------|
| "풀스택 앱 만들어줘" | oma-pm -> (oma-backend + oma-frontend) 병렬 -> oma-qa |
| "모바일 앱 만들어줘" | oma-pm -> (oma-backend + oma-mobile) 병렬 -> oma-qa |
| "버그 수정하고 리뷰해줘" | oma-debug -> oma-qa |
| "랜딩 페이지 디자인하고 구현해줘" | oma-design -> oma-frontend |
| "기능 아이디어가 있어" | oma-brainstorm -> oma-pm -> 관련 에이전트 -> oma-qa |
| "자동으로 전부 해줘" | oma-orchestration (내부: oma-pm -> 각 에이전트 -> oma-qa) |

### 에이전트 간 의존성 규칙

**병렬 실행 가능 (의존성 없음):**
- oma-backend + oma-frontend (API 컨트랙트가 사전 정의된 경우)
- oma-backend + oma-mobile (API 컨트랙트가 사전 정의된 경우)
- oma-frontend + oma-mobile (서로 독립)

**순차 실행 필수:**
- oma-brainstorm -> oma-pm (설계가 기획에 앞서야 함)
- oma-pm -> 모든 다른 에이전트 (기획이 우선)
- 구현 에이전트 -> oma-qa (구현 후 리뷰)
- oma-backend -> oma-frontend/oma-mobile (사전 정의된 API 컨트랙트가 없는 경우)

**QA는 항상 마지막**입니다. 단, 사용자가 특정 파일의 리뷰만 요청한 경우는 예외입니다.

---

## 토큰 절약 계산 {#token-savings-math}

절약을 주장하기 전에 먼저 측정하세요:

```bash
bun scripts/measure-skill-context.ts
bun scripts/measure-skill-context.ts --skills oma-pm,oma-backend,oma-frontend --json
oma agent context backend --difficulty Simple
```

이 스크립트는 파일 크기 시나리오별로 UTF-8 바이트를 4로 나눈 추정치를 보고합니다. `routed`는 엔트리만 포함하고, `simple`, `medium`, `complex`는 비교를 위해 가상의 프로토콜, 예제, 스택 파일을 더합니다. 이 이름은 스크립트 호환성을 위해 유지한 것이며, 미리 로딩하라는 지시가 아닙니다. `all`은 리소스 크기의 상한이며, 런타임 구성이 아닙니다. 새로 받은 체크아웃에서는 플랫폼 시드 하나를 크기 대리 지표로 쓸 수도 있으며, 모든 플랫폼을 로딩하지는 않습니다.

컨텍스트 명령은 실제로 주입되는 태스크 컨텍스트를 표시합니다. 대화의 나머지 부분이나 호스트/런타임 지침 전체는 포함하지 않습니다. 지정한 모델에서 전체 입력 토큰, 지연 시간, 비용을 측정하려면 조립된 프롬프트나 사용량 텔레메트리를 사용하세요. 저장소 크기나 생성된 미러 개수로 이 값을 추정하지 마세요.

## 태스크별 리소스 로딩

어떤 난이도든 담당 스킬에서 시작합니다. 그래프는 레퍼런스 인덱스이며, 인접해 있다고 해서 다른 전문 스킬, 에러 플레이북, 조건부 실험 워크플로우를 로딩해도 되는 것은 아닙니다.

로더는 Simple / Medium / Complex에 각각 추정 토큰 1,500 / 4,000 / 8,000의 소프트 예산을 적용합니다. 예산을 초과하는 엔트리는 그대로 유지하고 초과분을 보고합니다. 보조 레퍼런스는 태스크 트리거가 확정된 뒤 명시적으로 선택하지 않는 한 계속 보류됩니다. 필수 엔트리를 관련 없는 더 작은 문서로 대체하는 일은 없습니다.

검증은 태스크의 위험도와 프로젝트 요구 사항에 맞춰 수행합니다. 난이도 레이블이 있다고 해서 전체 테스트 스위트나 고정된 사전 점검 응답이 필요한 것은 아니며, 이미 승인된 작업을 다시 승인받아야 하는 것도 아닙니다.

## 컨텍스트 로딩 태스크 맵 (에이전트별)

다음은 태스크에 필요할 때 찾아볼 레퍼런스의 예시입니다. 담당 스킬의 최신 인덱스를 사용해 해당하는 섹션만 선택하세요:

### Backend 에이전트

| 태스크 유형 | 필수 리소스 |
|-----------|-------------------|
| CRUD API 생성 | 있을 때 일치하는 `variants/{node,python,rust}/snippets.md` |
| 인증 | 있을 때 일치하는 variant `snippets.md` + `tech-stack.md` |
| DB 마이그레이션 | 있을 때 일치하는 variant `snippets.md` |
| 성능 최적화 | `orm-reference.md`와 스킬이 제공하는 일치하는 예제 |
| 기존 코드 수정 | 프로젝트 코드 인텔리전스 프로바이더와 관련 실행 리소스 |

### Frontend 에이전트

| 태스크 유형 | 필수 리소스 |
|-----------|-------------------|
| 컴포넌트 생성 | snippets.md + 프로젝트의 기존 컴포넌트 패턴 |
| 폼 구현 | snippets.md (form + Zod) |
| API 통합 | snippets.md (TanStack Query) |
| 스타일링 | tailwind-rules.md |
| 페이지 레이아웃 | snippets.md (grid) |

### Design 에이전트

| 태스크 유형 | 필수 리소스 |
|-----------|-------------------|
| 디자인 시스템 생성 | reference/typography.md + reference/color-and-contrast.md + reference/spatial-design.md + design-md-spec.md |
| 랜딩 페이지 디자인 | reference/component-patterns.md + reference/motion-design.md + prompt-enhancement.md |
| 디자인 감사 | checklist.md + anti-patterns.md |
| 디자인 토큰 내보내기 | design-tokens.md |
| 3D / 셰이더 효과 | reference/shader-and-3d.md + reference/motion-design.md |
| 접근성 리뷰 | reference/accessibility.md + checklist.md |

### QA 에이전트

| 태스크 유형 | 필수 리소스 |
|-----------|-------------------|
| 보안 리뷰 | checklist.md (Security 섹션) |
| 성능 리뷰 | checklist.md (Performance 섹션) |
| 접근성 리뷰 | checklist.md (Accessibility 섹션) |
| 전체 감사 | checklist.md (전체) + self-check.md |
| 정의된 지표 비교 | quality-score.md (조건부) |

---

## 오케스트레이터 프롬프트 구성

오케스트레이터가 서브에이전트 프롬프트를 구성할 때, 태스크 관련 리소스만 포함합니다:

1. 담당 스킬의 SKILL.md 경로 (CLI 디스패치가 이미 본문을 주입합니다)
2. 필요할 때 선택한 작업의 execution-protocol 섹션
3. 특정 태스크 유형에 매칭되는 리소스 (위 맵에서)
4. 관찰된 실패 이후에만 해당 error-playbook 섹션
5. Memory Protocol (CLI 모드)

이렇게 대상을 좁힌 구성은 불필요한 리소스 로딩을 방지하여, 실제 작업에 사용할 수 있는 서브에이전트의 컨텍스트를 극대화합니다.

---

## 세션 증거와 회고 리뷰

세션 기록은 중요한 수정, 스코프 변경, 재작업, 판정을 거친 리뷰 발견 사항을 증거와 함께 남깁니다. 필요한 명확화에는 페널티가 없습니다. 이전의 CD와 EA 가중 점수, 그리고 임계값을 넘으면 RCA를 요구하던 규칙은 제거되었습니다. 이들은 CLI가 계산하는 지표가 아니라 프롬프트 지침이었습니다.

가능하면 기존 태스크 결과를 사용하세요. 설정된 코디네이션 저장소 아래에 두는 별도의 `session-metrics-{sessionId}.md`는 선택 사항입니다. 반복된 실패나 요청된 회고는 교훈을 남길 근거가 될 수 있지만, 일반적인 검사 실패나 이의가 제기된 발견 사항이 자동으로 교훈이 되는 것은 아닙니다. 과거 로그는 보존하고, 새 형식으로 다시 쓰지 마세요.

`oma stats`는 생산성과 기록된 사용량/비용 요약을 보고합니다. `oma retro`는 실제로 발생한 게이트, 블로커, 결정 누락 이벤트를 묶어 제안으로 정리합니다. 둘 다 이 Markdown 산출물에서 CD/EA 점수를 계산하지 않습니다.

## 태스크 분해와 컨텍스트 복구

의존성, 그리고 독립적으로 검증 가능한 동작을 중심으로 계획하세요. 고정된 스프린트 수, 파일 수, 턴 추정치가 리뷰 깊이나 완료 여부를 결정하지는 않습니다. 테스트와 에러 처리는 검증 대상 동작과 함께 두세요.

정체나 유용한 컨텍스트 손실이 관찰되면, 재개하거나 다시 디스패치하기 전에 완료한 작업, 남은 기준, 관련 경로, 검증 증거를 저장하세요. 기존 작업은 보존하고, 진행 중인 시도를 중복해서 실행하지 마세요. 턴/진행 비율만으로는 리셋이 필요하지 않습니다.

## 조건부 측정과 탐색

정의된 기준선이나 실험 비교가 있으면 측정 지침이 활성화되지만, 테스트나 린트가 있다는 것만으로는 활성화되지 않습니다. 비교 가능한 지표는 단위, 방법, 리비전, 증거와 함께 기록하세요. 필수 정확성 검사와 보안 검사는 독립적으로 유지됩니다. OMA에는 기본 종합 공식도, 문자 등급 게이트도, 점수에 따라 시작되는 롤백도 없습니다.

실제 실험은 가설, 기준선과 후보의 증거, 필수 검사, 결정, 소유한 파일을 기록합니다. 반복된 실패는 기존 복구 예산 안에서 다른 메커니즘을 시험해 볼 근거가 될 수 있습니다. 실험 변경은 격리하고, 관련 없는 수정은 보존하며, 게이트를 재개하기 전에 통합된 후보를 검증하세요.
