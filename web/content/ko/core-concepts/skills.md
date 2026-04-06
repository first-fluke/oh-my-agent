---
title: 스킬
description: oh-my-agent 2계층 스킬 아키텍처 완전 가이드 — SKILL.md 설계, 필요 시 리소스 로딩, 모든 공유 리소스 설명, 조건부 프로토콜, 스킬별 리소스 유형, 벤더 실행 프로토콜, 토큰 절약 계산, 스킬 라우팅 메커니즘.
---

# 스킬

스킬은 각 에이전트에 도메인 전문성을 부여하는 구조화된 지식 패키지입니다. 단순한 프롬프트가 아닌 실행 프로토콜, 기술 스택 레퍼런스, 코드 템플릿, 에러 플레이북, 품질 체크리스트, few-shot 예제를 포함하며, 토큰 효율성을 위해 설계된 2계층 아키텍처로 구성되어 있습니다.

---

## 2계층 설계

### Layer 1: SKILL.md (~800바이트, 항상 로딩됨)

모든 스킬의 루트에는 `SKILL.md` 파일이 있습니다. 스킬이 참조될 때 항상 컨텍스트 윈도우에 로딩됩니다. 포함 내용:

- **YAML 프론트매터** — `name`과 `description` (라우팅과 표시에 사용)
- **사용 시기 / 사용하지 말아야 할 때** — 명시적 활성화 조건
- **핵심 규칙** — 해당 도메인의 가장 중요한 5-15개 제약
- **아키텍처 개요** — 코드 구조화 방법
- **라이브러리 목록** — 승인된 의존성과 용도
- **참조** — Layer 2 리소스 포인터 (자동으로 로딩되지 않음)

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
1. 에이전트가 명시적으로 호출될 때 (`/command` 또는 에이전트 skills 필드를 통해)
2. 특정 리소스가 현재 태스크 유형과 난이도에 필요할 때

이 필요 시 로딩은 컨텍스트 로딩 가이드(`.agents/skills/_shared/core/context-loading.md`)에 의해 관리되며, 에이전트별로 태스크 유형을 필수 리소스에 매핑합니다.

---

## 파일 구조 예시

```
.agents/skills/oma-frontend/
├── SKILL.md                          ← Layer 1: 항상 로딩됨 (~800바이트)
└── resources/
    ├── execution-protocol.md         ← Layer 2: 단계별 워크플로우
    ├── tech-stack.md                 ← Layer 2: 상세 기술 사양
    ├── tailwind-rules.md             ← Layer 2: Tailwind 전용 규칙
    ├── component-template.tsx        ← Layer 2: React 컴포넌트 템플릿
    ├── snippets.md                   ← Layer 2: 복사-붙여넣기 코드 패턴
    ├── error-playbook.md             ← Layer 2: 에러 복구 절차
    ├── checklist.md                  ← Layer 2: 품질 검증 체크리스트
    └── examples/                     ← Layer 2: few-shot 입출력 예제
        └── examples.md

.agents/skills/oma-backend/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── examples.md
│   ├── orm-reference.md              ← 도메인별 (ORM 쿼리, N+1, 트랜잭션)
│   ├── checklist.md
│   └── error-playbook.md
└── stack/                             ← /stack-set으로 생성 (언어별)
    ├── stack.yaml
    ├── tech-stack.md
    ├── snippets.md
    └── api-template.*

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
├── reference/                         ← 심층 참조 자료
│   ├── typography.md
│   ├── color-and-contrast.md
│   ├── spatial-design.md
│   ├── motion-design.md
│   ├── responsive-design.md
│   ├── component-patterns.md
│   ├── accessibility.md
│   └── shader-and-3d.md
└── examples/
    ├── design-context-example.md
    └── landing-page-prompt.md
```

---

## 스킬별 리소스 유형

| 리소스 유형 | 파일명 패턴 | 목적 | 로딩 시점 |
|--------------|-----------------|---------|-------------|
| **실행 프로토콜** | `execution-protocol.md` | 단계별 워크플로우: 분석 -> 계획 -> 구현 -> 검증 | 항상 (SKILL.md와 함께) |
| **기술 스택** | `tech-stack.md` | 상세 기술 사양, 버전, 설정 | Complex 태스크 |
| **에러 플레이북** | `error-playbook.md` | "3 strikes" 에스컬레이션이 있는 복구 절차 | 에러 발생 시에만 |
| **체크리스트** | `checklist.md` | 도메인별 품질 검증 | Verify 단계에서 |
| **스니펫** | `snippets.md` | 복사-붙여넣기 가능한 코드 패턴 | Medium/Complex 태스크 |
| **예제** | `examples.md` 또는 `examples/` | LLM용 few-shot 입출력 예제 | Medium/Complex 태스크 |
| **변형** | `stack/` 디렉토리 | 언어/프레임워크별 레퍼런스 (`/stack-set`으로 생성) | 스택이 있을 때 |
| **템플릿** | `component-template.tsx`, `screen-template.dart` | 보일러플레이트 파일 템플릿 | 컴포넌트 생성 시 |
| **도메인 레퍼런스** | `orm-reference.md`, `anti-patterns.md` 등 | 특정 서브태스크를 위한 심층 도메인 지식 | 태스크 유형별 |

---

## 공유 리소스 (_shared/)

모든 에이전트는 `.agents/skills/_shared/`의 공통 기반을 공유합니다. 세 가지 카테고리로 구성됩니다:

### 핵심 리소스 (`.agents/skills/_shared/core/`)

| 리소스 | 목적 | 로딩 시점 |
|----------|---------|-------------|
| **`skill-routing.md`** | 태스크 키워드를 올바른 에이전트에 매핑합니다. Skill-Agent Mapping 테이블, Complex Request Routing 패턴, Inter-Agent Dependency Rules, Escalation Rules, Turn Limit Guide가 포함됩니다. | 오케스트레이터와 코디네이션 스킬에서 참조 |
| **`context-loading.md`** | 어떤 태스크 유형과 난이도에 어떤 리소스를 로딩할지 정의합니다. 에이전트별 태스크-유형-리소스 매핑 테이블과 조건부 프로토콜 로딩 트리거가 포함됩니다. | 워크플로우 시작 시 (Step 0 / Phase 0) |
| **`prompt-structure.md`** | 모든 태스크 프롬프트에 포함되어야 할 네 가지 요소를 정의합니다: Goal, Context, Constraints, Done When. PM, 구현, QA 에이전트용 템플릿이 포함됩니다. 안티 패턴(Goal만으로 시작) 목록도 있습니다. | PM 에이전트와 모든 워크플로우에서 참조 |
| **`clarification-protocol.md`** | 불확실성 수준(LOW/MEDIUM/HIGH)과 각각에 대한 조치를 정의합니다. 불확실성 트리거, 에스컬레이션 템플릿, 에이전트 유형별 필수 검증 항목, 서브에이전트 모드 동작이 포함됩니다. | 요구사항이 모호할 때 |
| **`context-budget.md`** | 토큰 예산 관리. 파일 읽기 전략(`read_file`이 아닌 `find_symbol` 사용), 모델 티어별 리소스 로딩 예산(Flash: ~3,100 토큰 / Pro: ~5,000 토큰), 대용량 파일 처리, 컨텍스트 오버플로 증상을 정의합니다. | 워크플로우 시작 시 |
| **`difficulty-guide.md`** | Simple/Medium/Complex 태스크 분류 기준. 예상 턴 수, 프로토콜 분기(Fast Track / Standard / Extended), 오판 복구를 정의합니다. | 태스크 시작 시 (Step 0) |
| **`reasoning-templates.md`** | 일반적인 의사결정 패턴을 위한 구조화된 추론 빈칸 채우기 템플릿(예: Exploration Loop에서 사용하는 Exploration Decision 템플릿 #6). | 복잡한 의사결정 시 |
| **`quality-principles.md`** | 모든 에이전트에 적용되는 4가지 보편적 품질 원칙. | 품질 중심 워크플로우(ultrawork) 시작 시 |
| **`vendor-detection.md`** | 현재 런타임 환경(Claude Code, Codex CLI, Gemini CLI, Antigravity, CLI Fallback) 감지 프로토콜. 마커 확인 사용: Agent 도구 = Claude Code, apply_patch = Codex, @-syntax = Gemini. | 워크플로우 시작 시 |
| **`session-metrics.md`** | Clarification Debt (CD) 점수 및 세션 메트릭 추적. 이벤트 유형(clarify +10, correct +25, redo +40), 임계값(CD >= 50 = RCA, CD >= 80 = 일시 중지), 통합 포인트를 정의합니다. | 오케스트레이션 세션 중 |
| **`common-checklist.md`** | Complex 태스크의 최종 검증 시 적용되는 범용 품질 체크리스트(에이전트별 체크리스트에 추가). | Complex 태스크의 Verify 단계 |
| **`lessons-learned.md`** | 과거 세션 학습 저장소, Clarification Debt 위반과 폐기된 실험에서 자동 생성됩니다. 도메인 섹션별로 구성됩니다. QA Evaluation Lessons로 평가자 사각지대를 추적합니다. | 에러 후 및 세션 종료 시 참조 |
| **`evaluator-tuning.md`** | 반자동 QA 프롬프트 튜닝 프로토콜. Evaluation Accuracy (EA) 이벤트를 추적하고, EA >= 30일 때 튜닝을 트리거하며, QA 체크리스트와 실행 프로토콜에 대한 패치 제안을 생성합니다. 튜닝 로그와 `good_catch` 이벤트를 통한 긍정적 강화를 포함합니다. | `oma retro`가 EA 임계값 위반 감지 시 |
| **`api-contracts/`** | API 컨트랙트 템플릿과 생성된 컨트랙트를 포함하는 디렉토리. `template.md`는 엔드포인트별 형식(method, path, request/response 스키마, 인증, 에러)을 정의합니다. | 크로스 바운더리 작업 계획 시 |

### 런타임 리소스 (`.agents/skills/_shared/runtime/`)

| 리소스 | 목적 |
|----------|---------|
| **`memory-protocol.md`** | CLI 서브에이전트용 메모리 파일 형식과 연산. On Start, During Execution, On Completion 프로토콜을 설정 가능한 메모리 도구(read/write/edit)로 정의합니다. 실험 추적 확장 포함. |
| **`execution-protocols/claude.md`** | Claude Code 전용 실행 패턴. 벤더가 claude일 때 `oma agent:spawn`에 의해 주입됩니다. |
| **`execution-protocols/gemini.md`** | Gemini CLI 전용 실행 패턴. |
| **`execution-protocols/codex.md`** | Codex CLI 전용 실행 패턴. |
| **`execution-protocols/qwen.md`** | Qwen CLI 전용 실행 패턴. |

벤더별 실행 프로토콜은 `oma agent:spawn`에 의해 자동 주입됩니다 — 에이전트가 수동으로 로딩할 필요가 없습니다.

### 조건부 리소스 (`.agents/skills/_shared/conditional/`)

실행 중 특정 조건이 충족될 때만 로딩됩니다:

| 리소스 | 트리거 조건 | 로딩 주체 | 예상 토큰 |
|----------|-------------------|-----------|----------------|
| **`quality-score.md`** | 품질 측정을 지원하는 워크플로우에서 VERIFY 또는 SHIP 단계 시작 | 오케스트레이터 (QA 에이전트 프롬프트에 전달) | ~250 |
| **`experiment-ledger.md`** | IMPL 기준선 수립 후 첫 실험 기록 | 오케스트레이터 (인라인, 기준선 측정 후) | ~250 |
| **`exploration-loop.md`** | 동일 이슈에서 같은 게이트가 두 번 실패 | 오케스트레이터 (인라인, 가설 에이전트 스폰 전) | ~250 |

예산 영향: 3개 모두 로딩 시 약 750 토큰. 조건부 로딩이므로 일반적인 세션에서는 1-2개만 로딩됩니다. Flash 티어 예산은 약 3,100 토큰 할당 내에 유지됩니다.

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
| "자동으로 전부 해줘" | oma-orchestrator (내부: oma-pm -> 에이전트들 -> oma-qa) |

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

## 토큰 절약 계산

5개 에이전트 오케스트레이션 세션(pm, backend, frontend, mobile, qa)을 고려합니다:

**점진적 공개 없이:**
- 각 에이전트가 모든 리소스를 로딩: 에이전트당 ~4,000 토큰
- 합계: 5 x 4,000 = 작업 전 20,000 토큰 소비

**점진적 공개 적용:**
- 모든 에이전트의 Layer 1만: 5 x 800 = 4,000 토큰
- 활성 에이전트(보통 한 번에 1-2개)에만 Layer 2 로딩: +1,500 토큰
- 합계: ~5,500 토큰

**절약: 약 72-75%**

Flash 티어 모델에서 작업에 사용할 수 있는 토큰이 108K인 것과 125K인 것의 차이입니다. 복잡한 태스크에서는 상당한 차이입니다.

---

## 태스크 난이도별 리소스 로딩

난이도 가이드는 태스크를 세 가지 수준으로 분류하며, Layer 2의 로딩 범위를 결정합니다:

### Simple (예상 3-5턴)

단일 파일 변경, 명확한 요구사항, 기존 패턴 반복.

로딩: `execution-protocol.md`만. 분석을 건너뛰고 최소 체크리스트로 구현 직접 진행.

### Medium (예상 8-15턴)

2-3개 파일 변경, 일부 설계 결정 필요, 새로운 도메인에 패턴 적용.

로딩: `execution-protocol.md` + `examples.md`. 간략한 분석과 전체 검증이 포함된 표준 프로토콜.

### Complex (예상 15-25턴)

4개 이상 파일 변경, 아키텍처 결정 필요, 새로운 패턴 도입, 다른 에이전트와의 의존성.

로딩: `execution-protocol.md` + `examples.md` + `tech-stack.md` + `snippets.md`. 체크포인트, 중간 실행 진행 기록, `common-checklist.md`를 포함한 전체 검증이 있는 확장 프로토콜.

---

## 컨텍스트 로딩 태스크 맵 (에이전트별)

컨텍스트 로딩 가이드는 상세한 태스크-유형-리소스 매핑을 제공합니다. 주요 매핑:

### Backend 에이전트

| 태스크 유형 | 필수 리소스 |
|-----------|-------------------|
| CRUD API 생성 | stack/snippets.md (route, schema, model, test) |
| 인증 | stack/snippets.md (JWT, password) + stack/tech-stack.md |
| DB 마이그레이션 | stack/snippets.md (migration) |
| 성능 최적화 | examples.md (N+1 예제) |
| 기존 코드 수정 | examples.md + Serena MCP |

### Frontend 에이전트

| 태스크 유형 | 필수 리소스 |
|-----------|-------------------|
| 컴포넌트 생성 | snippets.md + component-template.tsx |
| 폼 구현 | snippets.md (form + Zod) |
| API 통합 | snippets.md (TanStack Query) |
| 스타일링 | tailwind-rules.md |
| 페이지 레이아웃 | snippets.md (grid) + examples.md |

### Design 에이전트

| 태스크 유형 | 필수 리소스 |
|-----------|-------------------|
| 디자인 시스템 생성 | reference/typography.md + reference/color-and-contrast.md + reference/spatial-design.md + design-md-spec.md |
| 랜딩 페이지 디자인 | reference/component-patterns.md + reference/motion-design.md + prompt-enhancement.md + examples/landing-page-prompt.md |
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
| 품질 점수 측정 | quality-score.md (조건부) |

---

## 오케스트레이터 프롬프트 구성

오케스트레이터가 서브에이전트 프롬프트를 구성할 때, 태스크 관련 리소스만 포함합니다:

1. 에이전트 SKILL.md의 Core Rules 섹션
2. `execution-protocol.md`
3. 특정 태스크 유형에 매칭되는 리소스 (위 맵에서)
4. `error-playbook.md` (항상 포함 — 복구가 필수적)
5. Serena Memory Protocol (CLI 모드)

이 타겟팅된 구성은 불필요한 리소스 로딩을 방지하여, 실제 작업에 사용할 수 있는 서브에이전트의 컨텍스트를 극대화합니다.

---

## Clarification Debt & 세션 메트릭 (상세)

Clarification Debt (CD)는 세션 중 불명확한 요구사항의 비용을 측정합니다. 오케스트레이터가 모든 사용자 수정을 추적하고 점수화합니다:

| 이벤트 유형 | 점수 | 설명 |
|------------|------|------|
| `clarify` | +10 | 단순 명확화 질문 (MEDIUM 불확실성에서 예상됨) |
| `correct` | +25 | 의도 오해로 방향 전환 필요 |
| `redo` | +40 | 스코프/차터 위반으로 롤백 및 재시작 필요 |
| `blocked` | +0 | 에이전트가 올바르게 중단하고 질문 (좋은 행동 — 페널티 없음) |

**수정자:** 차터 미확인 (+15), 허용 목록 위반 (+20), 동일 에러 반복 (x1.5).

**임계값과 적용:**
- **CD >= 50** → `lessons-learned.md`에 필수 RCA 항목 추가
- **CD >= 80** → 세션 중단, 사용자가 요구사항 재명세 필요
- **`redo` >= 2** → 오케스트레이터 일시 중지, 명시적 스코프 확인 요청
- **동일 에이전트에서 3회 연속 세션 CD >= 30** → 에이전트 프롬프트 템플릿 검토

세션 로그는 `.serena/memories/session-metrics.md`에 이벤트별 행(턴, 에이전트, 이벤트 유형, 점수, 상세)과 요약 섹션으로 유지됩니다.

---

## 평가자 정확도 & QA 튜닝

QA 에이전트는 추적된 판단 오류를 통해 개선됩니다. CD(실시간)와 달리, Evaluator Accuracy (EA)는 회고적 메트릭입니다 — 대부분의 오류는 세션 종료 후 발견됩니다.

**EA 이벤트 유형:**

| 이벤트 | 점수 | 발견 시점 |
|--------|------|----------|
| `false_negative` | +30 | 다음 세션 또는 프로덕션 — QA가 놓친 버그 |
| `false_positive` | +15 | 세션 중 — 구현 에이전트가 QA 소견에 성공적으로 이의 제기 |
| `severity_mismatch` | +10 | 세션 중 또는 회고 — 잘못된 심각도 할당 |
| `missed_stub` | +20 | 런타임 검증이 표시 전용 기능 포착 |
| `good_catch` | -10 | QA가 비명백한 버그 포착 (긍정적 보상 신호) |

**EA는 3세션 롤링 윈도우로 계산됩니다.** 임계값:
- **EA >= 30** → `oma retro`가 QA 패턴을 리뷰 플래그 (튜닝 제안)
- **EA >= 50** → 튜닝 필수: QA execution-protocol.md 업데이트
- **`false_negative` >= 3** (윈도우 내) → QA checklist.md에 탐지 패턴 추가
- **`good_catch` >= 5** (윈도우 내) → 성공 패턴 문서화 및 전파

전체 튜닝 루프는 `evaluator-tuning.md`에 정의: 세션이 EA 이벤트 축적 → 임계값이 `oma retro` 트리거 → 보고서가 오류를 분류하고 패치 제안 → 사용자 검토·승인 → QA 체크리스트/프로토콜에 패치 적용 → 다음 3세션에서 검증.

---

## 복잡한 태스크의 스프린트 분해

복잡한 태스크(4+ 파일, 아키텍처 결정)는 단일 긴 실행 대신 스프린트 기반 실행을 사용합니다:

1. **분해** — 2-4개의 기능 중심 스프린트로, 각각 독립적으로 테스트 가능
2. **목표** — 스프린트당 5-8턴
3. **스프린트 게이트** — 각 스프린트 후:
   - 스프린트 산출물 완료?
   - 린트/테스트 통과?
   - 스프린트가 예상 턴의 2배 소요 시 → 체크포인트 작성, 사용자에게 알림
4. **계속** — 게이트 통과 시 다음 스프린트로

**예시:** "JWT 인증 + CRUD API + 테스트" 태스크 분해:
- 스프린트 1: 사용자 모델 + 인증 엔드포인트 (회원가입/로그인)
- 스프린트 2: CRUD 엔드포인트 + 유효성 검사
- 스프린트 3: 테스트 + 에러 처리

**난이도 오판 복구:** Simple로 시작했지만 더 복잡하면, 실행 중간에 Medium 또는 Complex 프로토콜로 업그레이드하고 progress에 변경 기록.

---

## 컨텍스트 리셋 프로토콜

장시간 실행 에이전트는 컨텍스트가 채워지면서 품질이 저하됩니다. 오케스트레이터(에이전트 자체가 아님)가 이를 모니터링하고 리셋을 트리거합니다.

**트리거 조건 (오케스트레이터가 모니터링 중 확인):**

| 조건 | 감지 | 조치 |
|------|------|------|
| 턴 예산 소진 | 에이전트가 예상 턴의 >= 80% 소비 AND 수용 기준 < 50% 완료 | 컨텍스트 리셋 |
| 진행 정체 | 3+ 연속 모니터링 주기 동안 progress 파일 업데이트 없음 | 컨텍스트 리셋 |
| 얕은 출력 | 결과 파일에 스텁 마커 또는 TODO 플레이스홀더 포함 | 명시적 지시로 재스폰 |

**리셋 절차:**
1. **체크포인트** — 에이전트의 현재 상태 저장 (완료 항목, 남은 항목, 핵심 결정)
2. **종료** — 현재 에이전트 실행 중지
3. **재스폰** — 체크포인트를 컨텍스트로 새 에이전트 시작
4. **재개** — 새 에이전트가 체크포인트를 읽고 남은 항목만 계속

독립 실행 에이전트(오케스트레이터 없음)의 경우, `difficulty-guide.md`의 스프린트 게이트가 안전망 역할 — 스프린트가 예상 턴의 2배 소요 시 체크포인트를 작성하고 사용자에게 알립니다.
