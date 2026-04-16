---
title: 프로젝트 구조
description: oh-my-agent 설치의 완전한 디렉토리 트리와 모든 파일/디렉토리 설명 — .agents/ (config, skills, workflows, agents, state, results, mcp.json), .claude/ (settings, hooks, skills 심볼릭 링크, agents), .serena/memories/, oh-my-agent 소스 리포지토리 구조.
---

# 프로젝트 구조

oh-my-agent를 설치하면 프로젝트에 세 가지 디렉토리 트리가 추가됩니다: `.agents/` (단일 진실 원천), `.claude/` (IDE 통합 레이어), `.serena/` (런타임 상태). 이 페이지에서는 모든 파일과 그 용도를 설명합니다.

---

## 전체 디렉토리 트리

```
your-project/
├── .agents/                          ← 단일 진실 원천 (SSOT)
│   ├── config/
│   │   └── oma-config.yaml    ← 언어, 시간대, CLI 매핑
│   │
│   ├── skills/
│   │   ├── _shared/                  ← 모든 에이전트가 사용하는 리소스
│   │   │   ├── README.md
│   │   │   ├── core/
│   │   │   │   ├── skill-routing.md
│   │   │   │   ├── context-loading.md
│   │   │   │   ├── prompt-structure.md
│   │   │   │   ├── clarification-protocol.md
│   │   │   │   ├── context-budget.md
│   │   │   │   ├── difficulty-guide.md
│   │   │   │   ├── reasoning-templates.md
│   │   │   │   ├── quality-principles.md
│   │   │   │   ├── vendor-detection.md
│   │   │   │   ├── session-metrics.md
│   │   │   │   ├── common-checklist.md
│   │   │   │   ├── lessons-learned.md
│   │   │   │   └── api-contracts/
│   │   │   │       ├── README.md
│   │   │   │       └── template.md
│   │   │   ├── runtime/
│   │   │   │   ├── memory-protocol.md
│   │   │   │   └── execution-protocols/
│   │   │   │       ├── claude.md
│   │   │   │       ├── gemini.md
│   │   │   │       ├── codex.md
│   │   │   │       └── qwen.md
│   │   │   └── conditional/
│   │   │       ├── quality-score.md
│   │   │       ├── experiment-ledger.md
│   │   │       └── exploration-loop.md
│   │   │
│   │   ├── oma-frontend/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── tech-stack.md
│   │   │       ├── tailwind-rules.md
│   │   │       ├── component-template.tsx
│   │   │       ├── snippets.md
│   │   │       ├── error-playbook.md
│   │   │       ├── checklist.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-backend/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── execution-protocol.md
│   │   │   │   ├── examples.md
│   │   │   │   ├── orm-reference.md
│   │   │   │   ├── checklist.md
│   │   │   │   └── error-playbook.md
│   │   │   └── stack/                 ← /stack-set으로 생성됨
│   │   │       ├── stack.yaml
│   │   │       ├── tech-stack.md
│   │   │       ├── snippets.md
│   │   │       └── api-template.*
│   │   │
│   │   ├── oma-mobile/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── tech-stack.md
│   │   │       ├── snippets.md
│   │   │       ├── screen-template.dart
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-db/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── document-templates.md
│   │   │       ├── anti-patterns.md
│   │   │       ├── vector-db.md
│   │   │       ├── iso-controls.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-design/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── execution-protocol.md
│   │   │   │   ├── anti-patterns.md
│   │   │   │   ├── checklist.md
│   │   │   │   ├── design-md-spec.md
│   │   │   │   ├── design-tokens.md
│   │   │   │   ├── prompt-enhancement.md
│   │   │   │   ├── stitch-integration.md
│   │   │   │   └── error-playbook.md
│   │   │   ├── reference/
│   │   │   │   ├── typography.md
│   │   │   │   ├── color-and-contrast.md
│   │   │   │   ├── spatial-design.md
│   │   │   │   ├── motion-design.md
│   │   │   │   ├── responsive-design.md
│   │   │   │   ├── component-patterns.md
│   │   │   │   ├── accessibility.md
│   │   │   │   └── shader-and-3d.md
│   │   │   └── examples/
│   │   │       ├── design-context-example.md
│   │   │       └── landing-page-prompt.md
│   │   │
│   │   ├── oma-pm/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── examples.md
│   │   │       ├── iso-planning.md
│   │   │       ├── task-template.json
│   │   │       └── error-playbook.md
│   │   │
│   │   ├── oma-qa/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── iso-quality.md
│   │   │       ├── checklist.md
│   │   │       ├── self-check.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-debug/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── common-patterns.md
│   │   │       ├── debugging-checklist.md
│   │   │       ├── bug-report-template.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-tf-infra/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── multi-cloud-examples.md
│   │   │       ├── cost-optimization.md
│   │   │       ├── policy-testing-examples.md
│   │   │       ├── iso-42001-infra.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-dev-workflow/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── validation-pipeline.md
│   │   │       ├── database-patterns.md
│   │   │       ├── api-workflows.md
│   │   │       ├── i18n-patterns.md
│   │   │       ├── release-coordination.md
│   │   │       └── troubleshooting.md
│   │   │
│   │   ├── oma-translator/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── translation-rubric.md
│   │   │       └── anti-ai-patterns.md
│   │   │
│   │   ├── oma-orchestrator/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── subagent-prompt-template.md
│   │   │   │   └── memory-schema.md
│   │   │   ├── scripts/
│   │   │   │   ├── spawn-agent.sh
│   │   │   │   ├── parallel-run.sh
│   │   │   │   └── verify.sh
│   │   │   ├── templates/
│   │   │   └── config/
│   │   │       └── cli-config.yaml
│   │   │
│   │   ├── oma-brainstorm/
│   │   │   └── SKILL.md
│   │   │
│   │   ├── oma-coordination/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       └── examples.md
│   │   │
│   │   └── oma-scm/
│   │       ├── SKILL.md
│   │       ├── config/
│   │       │   └── commit-config.yaml
│   │       └── resources/
│   │           └── conventional-commits.md
│   │
│   ├── workflows/
│   │   ├── orchestrate.md             ← 영구 모드: 자동화된 병렬 실행
│   │   ├── work.md             ← 영구 모드: 단계별 조율
│   │   ├── ultrawork.md              ← 영구 모드: 5단계 품질 워크플로우
│   │   ├── plan.md                   ← PM 태스크 분해
│   │   ├── exec-plan.md              ← 실행 계획 관리
│   │   ├── brainstorm.md             ← 디자인 우선 아이디에이션
│   │   ├── deepinit.md               ← 프로젝트 초기화
│   │   ├── review.md                 ← QA 리뷰 파이프라인
│   │   ├── debug.md                  ← 구조화된 디버깅
│   │   ├── design.md                 ← 7단계 디자인 워크플로우
│   │   ├── scm.md                 ← Conventional commits
│   │   ├── tools.md                  ← MCP 도구 관리
│   │   └── stack-set.md              ← 기술 스택 설정
│   │
│   ├── agents/
│   │   ├── backend-engineer.md        ← 서브에이전트 정의: 백엔드
│   │   ├── frontend-engineer.md       ← 서브에이전트 정의: 프론트엔드
│   │   ├── mobile-engineer.md         ← 서브에이전트 정의: 모바일
│   │   ├── db-engineer.md             ← 서브에이전트 정의: 데이터베이스
│   │   ├── qa-reviewer.md             ← 서브에이전트 정의: QA
│   │   ├── debug-investigator.md      ← 서브에이전트 정의: 디버그
│   │   └── pm-planner.md             ← 서브에이전트 정의: PM
│   │
│   ├── results/plan-{sessionId}.json                      ← 생성된 계획 출력 (/plan으로 생성)
│   ├── state/                         ← 활성 워크플로우 상태 파일
│   │   ├── orchestrate-state.json     ← (워크플로우 활성 시에만 존재)
│   │   ├── ultrawork-state.json
│   │   └── work-state.json
│   ├── results/                       ← 에이전트 결과 파일
│   │   └── result-{agent}.md          ← (완료된 에이전트가 생성)
│   └── mcp.json                       ← MCP 서버 설정
│
├── .claude/                           ← IDE 통합 레이어
│   ├── settings.json                  ← 훅 등록 및 권한
│   ├── hooks/
│   │   ├── triggers.json              ← 키워드-워크플로우 매핑 (11개 언어)
│   │   ├── keyword-detector.ts        ← 자동 감지 로직
│   │   ├── persistent-mode.ts         ← 영구 워크플로우 강제
│   │   └── hud.ts                     ← [OMA] 상태표시줄 인디케이터
│   ├── skills/                        ← 심볼릭 링크 → .agents/skills/
│   │   ├── oma-frontend -> ../../.agents/skills/oma-frontend
│   │   ├── oma-backend -> ../../.agents/skills/oma-backend
│   │   └── ...
│   └── agents/                        ← Claude Code용 서브에이전트 정의
│       ├── backend-engineer.md
│       ├── frontend-engineer.md
│       └── ...
│
└── .serena/                           ← 런타임 상태 (Serena MCP)
    └── memories/
        ├── orchestrator-session.md    ← 세션 ID, 상태, 단계 추적
        ├── task-board.md              ← 태스크 할당 및 상태
        ├── progress-{agent}.md        ← 에이전트별 진행 상황 업데이트
        ├── result-{agent}.md          ← 에이전트별 최종 출력
        ├── session-metrics.md         ← Clarification Debt 및 Quality Score 추적
        ├── experiment-ledger.md       ← 실험 추적 (조건부)
        ├── session-work.md      ← Work 워크플로우 세션 상태
        ├── session-ultrawork.md       ← Ultrawork 워크플로우 세션 상태
        ├── tool-overrides.md          ← 임시 도구 제한 (/tools --temp)
        └── archive/
            └── metrics-{date}.md      ← 보관된 세션 메트릭
```

---

## .agents/ — 진실의 원천

핵심 디렉토리입니다. 에이전트에 필요한 모든 것이 여기에 있습니다. 에이전트 동작과 관련된 유일한 디렉토리이며, 다른 모든 디렉토리는 여기서 파생됩니다.

### config/

**`oma-config.yaml`** — 중앙 설정 파일로 다음을 포함합니다:
- `language`: 응답 언어 코드 (en, ko, ja, zh, es, fr, de, pt, ru, nl, pl)
- `date_format`: 타임스탬프 형식 문자열 (기본값: `YYYY-MM-DD`)
- `timezone`: 시간대 식별자 (기본값: `UTC`)
- `default_cli`: 기본 CLI 벤더 (gemini, claude, codex, qwen)
- `agent_cli_mapping`: 에이전트별 CLI 라우팅 오버라이드

### skills/

에이전트 전문성이 담겨 있는 곳입니다. 총 15개 디렉토리: 14개 에이전트 스킬 + 1개 공유 리소스 디렉토리.

**`_shared/`** — 모든 에이전트가 사용하는 리소스:
- `core/` — 라우팅, 컨텍스트 로딩, 프롬프트 구조, 명확화 프로토콜, 컨텍스트 예산, 난이도 평가, 추론 템플릿, 품질 원칙, 벤더 감지, 세션 메트릭, 공통 체크리스트, 학습된 교훈, API 컨트랙트 템플릿
- `runtime/` — CLI 서브에이전트용 메모리 프로토콜, 벤더별 실행 프로토콜 (claude, gemini, codex, qwen)
- `conditional/` — 품질 점수 측정, 실험 원장 추적, 탐색 루프 프로토콜 (트리거 시에만 로드됨)

**`oma-{agent}/`** — 에이전트별 스킬 디렉토리. 각각 다음을 포함합니다:
- `SKILL.md` (~800바이트) — 레이어 1: 항상 로드됨. 아이덴티티, 라우팅, 핵심 규칙.
- `resources/` — 레이어 2: 온디맨드. 실행 프로토콜, 예제, 체크리스트, 오류 플레이북, 기술 스택, 스니펫, 템플릿.
- 일부 에이전트는 추가 하위 디렉토리를 가집니다: `stack/` (oma-backend, /stack-set으로 생성), `reference/` (oma-design), `examples/` (oma-design), `scripts/` (oma-orchestrator), `config/` (oma-orchestrator, oma-scm).

### workflows/

슬래시 명령 동작을 정의하는 14개의 Markdown 파일. 각 파일에는 다음이 포함됩니다:
- `description`이 포함된 YAML 프론트매터
- 필수 규칙 섹션 (응답 언어, 단계 순서, MCP 도구 요구사항)
- 벤더 감지 지시사항
- 단계별 실행 프로토콜
- 게이트 정의 (영구 워크플로우용)

영구 워크플로우: `orchestrate.md`, `work.md`, `ultrawork.md`.
비영구: `plan.md`, `exec-plan.md`, `brainstorm.md`, `deepinit.md`, `review.md`, `debug.md`, `design.md`, `scm.md`, `tools.md`, `stack-set.md`.

### agents/

Task 도구(Claude Code) 또는 CLI를 통해 에이전트를 스폰할 때 사용하는 7개의 서브에이전트 정의 파일. 각 파일은 다음을 정의합니다:
- 프론트매터: `name`, `description`, `skills` (로드할 스킬)
- 실행 프로토콜 참조
- 차터 사전검증 (CHARTER_CHECK) 템플릿
- 아키텍처 요약
- 도메인별 규칙 (10개 규칙)
- 명시 사항: "`.agents/` 파일을 절대 수정하지 않는다"

### plan-\{sessionId\}.json

`/plan` 워크플로우에 의해 생성됩니다. 에이전트 할당, 우선순위, 의존성, 인수 기준이 포함된 구조화된 태스크 분해를 포함합니다. `/orchestrate`, `/work`, `/exec-plan`에서 사용됩니다.

### state/

영구 워크플로우의 활성 워크플로우 상태 파일. 이 JSON 파일은 영구 워크플로우가 실행 중일 때만 존재합니다. 삭제하거나("workflow done"이라고 말하면) 워크플로우가 비활성화됩니다.

### results/

에이전트 결과 파일. 완료된 에이전트가 상태(completed/failed), 요약, 변경된 파일, 인수 기준 체크리스트를 기록합니다. 오케스트레이터가 수집 시, 대시보드가 모니터링 시 읽습니다.

### mcp.json

다음을 포함하는 MCP 서버 설정:
- 서버 정의 (Serena 등)
- 메모리 설정: `memoryConfig.provider`, `memoryConfig.basePath`, `memoryConfig.tools` (읽기/쓰기/편집 도구 이름)
- `/tools` 관리를 위한 도구 그룹 정의

---

## .claude/ — IDE 통합

이 디렉토리는 oh-my-agent를 Claude Code와 기타 IDE에 연결합니다.

### settings.json

Claude Code용 훅과 권한을 등록합니다. 훅 스크립트와 그 트리거 조건(예: `UserPromptSubmit`)에 대한 참조를 포함합니다.

### hooks/

**`triggers.json`** — 키워드-워크플로우 매핑. 다음을 정의합니다:
- `workflows`: 워크플로우 이름에서 `{ persistent: boolean, keywords: { language: [...] } }`로의 매핑
- `informationalPatterns`: 질문을 나타내는 문구 (자동 감지에서 필터링됨)
- `excludedWorkflows`: 명시적 `/command` 호출이 필요한 워크플로우
- `cjkScripts`: CJK 스크립트를 사용하는 언어 코드 (ko, ja, zh)

**`keyword-detector.ts`** — 다음을 수행하는 TypeScript 훅:
1. 트리거 키워드에 대해 사용자 입력 스캔
2. 정보성 패턴 확인
3. 컨텍스트에 `[OMA WORKFLOW: ...]` 또는 `[OMA PERSISTENT MODE: ...]` 주입

**`persistent-mode.ts`** — `.agents/state/`의 활성 상태 파일을 확인하고 영구 워크플로우 실행을 강제합니다.

**`hud.ts`** — 상태 바에 `[OMA]` 인디케이터를 렌더링하여 모델명, 컨텍스트 사용량 (색상 코드: 녹색/노란색/빨간색), 활성 워크플로우 상태를 표시합니다.

### skills/

`.agents/skills/`를 가리키는 심볼릭 링크. `.claude/skills/`에서 읽는 IDE에 스킬을 노출하면서 `.agents/`를 단일 진실 원천으로 유지합니다.

### agents/

Claude Code의 Agent 도구용으로 포맷된 서브에이전트 정의. 스킬 파일을 참조하며 CHARTER_CHECK 템플릿을 포함합니다.

---

## .serena/memories/ — 런타임 상태

오케스트레이션 세션 중 에이전트가 진행 상황을 기록하는 곳입니다. 이 디렉토리는 실시간 업데이트를 위해 대시보드가 감시합니다.

| 파일 | 소유자 | 목적 |
|------|--------|------|
| `orchestrator-session.md` | 오케스트레이터 | 세션 메타데이터: ID, 상태, 시작 시간, 현재 단계 |
| `task-board.md` | 오케스트레이터 | 태스크 할당: 에이전트, 태스크, 우선순위, 상태, 의존성 |
| `progress-{agent}.md` | 해당 에이전트 | 턴별 업데이트: 수행한 작업, 읽은/수정한 파일, 현재 상태 |
| `result-{agent}.md` | 해당 에이전트 | 최종 출력: 완료 상태, 요약, 변경된 파일, 인수 기준 |
| `session-metrics.md` | 오케스트레이터 | Clarification Debt 이벤트, Quality Score 진행 상황 |
| `experiment-ledger.md` | 오케스트레이터/QA | Quality Score 활성 시 실험 행 |
| `session-work.md` | Work 워크플로우 | Work 전용 세션 상태 |
| `session-ultrawork.md` | Ultrawork 워크플로우 | Ultrawork 전용 단계 추적 |
| `tool-overrides.md` | /tools 워크플로우 | 임시 도구 제한 (세션 범위) |
| `archive/metrics-{date}.md` | 시스템 | 보관된 세션 메트릭 (30일 보존) |

메모리 파일 경로와 도구 이름은 `.agents/mcp.json`의 `memoryConfig`를 통해 설정할 수 있습니다.

---

## oh-my-agent 소스 리포지토리 구조

oh-my-agent 자체를 개발하는 경우(단순 사용이 아닌), 리포지토리는 모노레포입니다:

```
oh-my-agent/
├── cli/                  ← CLI 도구 소스 (TypeScript, bun으로 빌드)
│   ├── src/              ← 소스 코드
│   ├── package.json
│   └── install.sh        ← 부트스트랩 설치 프로그램
├── web/                  ← 문서 사이트 (Next.js)
│   └── content/
│       └── en/           ← 영어 문서 페이지
├── action/               ← 자동화된 스킬 업데이트용 GitHub Action
├── docs/                 ← 번역된 README 및 사양서
├── .agents/              ← 소스 리포에서는 편집 가능 (이것이 소스이므로)
├── .claude/              ← IDE 통합
├── .serena/              ← 개발 런타임 상태
├── CLAUDE.md             ← Claude Code용 프로젝트 지시사항
└── package.json          ← 루트 워크스페이스 설정
```

소스 리포에서는 `.agents/` 수정이 허용됩니다 (이것이 소스 리포 자체에 대한 SSOT 예외입니다). `.agents/`를 수정하지 않는다는 규칙은 소비자 프로젝트에 적용되며, oh-my-agent 리포지토리에는 적용되지 않습니다.

개발 명령어:
- `bun run test` — CLI 테스트 (vitest)
- `bun run lint` — 린트
- `bun run build` — CLI 빌드
- 커밋은 conventional commit 형식을 따라야 합니다 (commitlint 강제)
