---
title: 워크플로우
description: oh-my-agent 14개 워크플로우 완전 레퍼런스 — 슬래시 명령, 영구 vs 비영구 모드, 11개 언어의 트리거 키워드, 단계 및 스텝, 읽기/쓰기 파일, triggers.json과 keyword-detector.ts를 통한 자동 감지 메커니즘, 정보성 패턴 필터링, 영구 모드 상태 관리.
---

# 워크플로우

워크플로우는 슬래시 명령이나 자연어 키워드로 트리거되는 구조화된 다단계 프로세스입니다. 단일 단계 유틸리티부터 복잡한 5단계 품질 게이트까지 에이전트가 태스크에서 어떻게 협업하는지 정의합니다.

14개의 워크플로우가 있으며, 그 중 3개는 영구 워크플로우입니다(상태를 유지하며 실수로 중단할 수 없습니다).

---

## 영구 워크플로우

영구 워크플로우는 모든 태스크가 완료될 때까지 계속 실행됩니다. `.agents/state/`에 상태를 유지하고, 명시적으로 비활성화될 때까지 매 사용자 메시지에 `[OMA PERSISTENT MODE: ...]` 컨텍스트를 재주입합니다.

### /orchestrate

**설명:** 자동화된 CLI 기반 병렬 에이전트 실행. CLI를 통해 서브에이전트를 스폰하고, MCP 메모리를 통해 조율하며, 진행 상황을 모니터링하고, 검증 루프를 실행합니다.

**영구:** 예. 상태 파일: `.agents/state/orchestrate-state.json`.

**트리거 키워드:**
| 언어 | 키워드 |
|----------|----------|
| 공통 | "orchestrate" |
| 영어 | "parallel", "do everything", "run everything" |
| 한국어 | "자동 실행", "병렬 실행", "전부 실행", "전부 해" |
| 일본어 | "オーケストレート", "並列実行", "自動実行" |
| 중국어 | "编排", "并行执行", "自动执行" |
| 스페인어 | "orquestar", "paralelo", "ejecutar todo" |
| 프랑스어 | "orchestrer", "parallèle", "tout exécuter" |
| 독일어 | "orchestrieren", "parallel", "alles ausführen" |
| 포르투갈어 | "orquestrar", "paralelo", "executar tudo" |
| 러시아어 | "оркестровать", "параллельно", "выполнить всё" |
| 네덜란드어 | "orkestreren", "parallel", "alles uitvoeren" |
| 폴란드어 | "orkiestrować", "równolegle", "wykonaj wszystko" |

**단계:**
1. **Step 0 — 준비:** 코디네이션 스킬, 컨텍스트 로딩 가이드, 메모리 프로토콜 읽기. 벤더 감지.
2. **Step 1 — 계획 로딩/생성:** `.agents/plan.json` 확인. 없으면 `/plan`을 먼저 실행하도록 안내.
3. **Step 2 — 세션 초기화:** `user-preferences.yaml` 로딩, CLI 매핑 테이블 표시, 세션 ID(`session-YYYYMMDD-HHMMSS`) 생성, 메모리에 `orchestrator-session.md`와 `task-board.md` 생성.
4. **Step 3 — 에이전트 스폰:** 각 우선순위 티어(P0 먼저, 그 다음 P1...)에 대해 벤더에 맞는 방식으로 에이전트 스폰. MAX_PARALLEL을 초과하지 않음.
5. **Step 4 — 모니터링:** `progress-{agent}.md` 파일 폴링, `task-board.md` 업데이트. 완료, 실패, 크래시 감시.
6. **Step 5 — 검증:** 완료된 에이전트별로 `verify.sh {agent-type} {workspace}` 실행. 실패 시 에러 컨텍스트와 함께 재스폰 (최대 2회 재시도). 2회 재시도 후에도 실패하면 Exploration Loop 활성화: 2-3개 가설 생성, 병렬 실험 스폰, 점수 매기기, 최적 선택.
7. **Step 6 — 수집:** 모든 `result-{agent}.md` 파일 읽기, 요약 정리.
8. **Step 7 — 최종 보고서:** 세션 요약 제시. Quality Score가 측정된 경우 Experiment Ledger 요약 포함 및 교훈 자동 생성.

**읽는 파일:** `.agents/plan.json`, `.agents/config/user-preferences.yaml`, `progress-{agent}.md`, `result-{agent}.md`.
**쓰는 파일:** `orchestrator-session.md`, `task-board.md` (메모리), 최종 보고서.

**사용 시기:** 자동화된 조율과 최대 병렬성이 필요한 대규모 프로젝트.

---

### /coordinate

**설명:** 단계별 멀티 도메인 조율. PM이 먼저 계획하고, 각 게이트에서 사용자 확인과 함께 에이전트가 실행한 후, QA 리뷰와 이슈 수정이 이어집니다.

**영구:** 예. 상태 파일: `.agents/state/coordinate-state.json`.

**트리거 키워드:**
| 언어 | 키워드 |
|----------|----------|
| 공통 | "coordinate", "step by step" |
| 한국어 | "코디네이트", "단계별" |
| 일본어 | "コーディネート", "ステップバイステップ" |
| 중국어 | "协调", "逐步" |
| 스페인어 | "coordinar", "paso a paso" |
| 프랑스어 | "coordonner", "étape par étape" |
| 독일어 | "koordinieren", "schritt für schritt" |

**단계:**
1. **Step 0 — 준비:** 스킬, 컨텍스트 로딩, 메모리 프로토콜 읽기. 세션 시작 기록.
2. **Step 1 — 요구사항 분석:** 관련 도메인 식별. 단일 도메인이면 직접 에이전트 사용 제안.
3. **Step 2 — PM 에이전트 기획:** PM이 요구사항 분해, API 컨트랙트 정의, 우선순위 태스크 분해 생성, `.agents/plan.json`에 저장.
4. **Step 3 — 계획 리뷰:** 사용자에게 계획 제시. **진행 전 반드시 확인 필요.**
5. **Step 4 — 에이전트 스폰:** 우선순위 티어별 스폰, 같은 티어 내 병렬, 별도 워크스페이스.
6. **Step 5 — 모니터링:** 진행 파일 폴링, 에이전트 간 API 컨트랙트 정렬 확인.
7. **Step 6 — QA 리뷰:** 보안(OWASP), 성능, 접근성, 코드 품질을 위한 QA 에이전트 스폰.
8. **Step 6.1 — Quality Score** (조건부): 기준선 측정 및 기록.
9. **Step 7 — 반복:** CRITICAL/HIGH 이슈 발견 시 담당 에이전트 재스폰. 2회 시도 후에도 같은 이슈 지속 시 Exploration Loop 활성화.

**사용 시기:** 단계별 제어와 각 게이트에서 사용자 승인이 필요한 멀티 도메인 기능.

---

### /ultrawork

**설명:** 품질에 집착하는 워크플로우. 5단계, 17개 스텝, 그 중 11개가 리뷰 스텝. 모든 단계에는 진행 전 통과해야 하는 게이트가 있습니다.

**영구:** 예. 상태 파일: `.agents/state/ultrawork-state.json`.

**트리거 키워드:**
| 언어 | 키워드 |
|----------|----------|
| 공통 | "ultrawork", "ulw" |

**단계 및 스텝:**

| 단계 | 스텝 | 에이전트 | 리뷰 관점 |
|-------|-------|-------|-------------------|
| **PLAN** | 1-4 | PM 에이전트 (인라인) | 완전성, 메타 리뷰, 과잉 엔지니어링/단순성 |
| **IMPL** | 5 | Dev 에이전트 (스폰) | 구현 |
| **VERIFY** | 6-8 | QA 에이전트 (스폰) | 정렬, 안전성 (OWASP), 회귀 방지 |
| **REFINE** | 9-13 | Debug 에이전트 (스폰) | 파일 분할, 재사용성, 연쇄 영향, 일관성, 데드 코드 |
| **SHIP** | 14-17 | QA 에이전트 (스폰) | 코드 품질 (lint/커버리지), UX 흐름, 관련 이슈, 배포 준비 |

**게이트 정의:**
- **PLAN_GATE:** 계획 문서화, 가정 나열, 대안 검토, 과잉 엔지니어링 리뷰 완료, 사용자 확인.
- **IMPL_GATE:** 빌드 성공, 테스트 통과, 계획된 파일만 수정, 기준선 Quality Score 기록(측정 시).
- **VERIFY_GATE:** 구현이 요구사항과 일치, CRITICAL 0건, HIGH 0건, 회귀 없음, Quality Score >= 75.
- **REFINE_GATE:** 대용량 파일/함수(> 500줄 / > 50줄) 없음, 통합 기회 포착, 부작용 확인, 코드 정리, Quality Score 비회귀.
- **SHIP_GATE:** 품질 검사 통과, UX 확인, 관련 이슈 해결, 배포 체크리스트 완료, 최종 Quality Score >= 75(비음수 델타), 사용자 최종 승인.

**게이트 실패 동작:**
- 첫 번째 실패: 관련 스텝으로 돌아가 수정 후 재시도.
- 같은 이슈에서 두 번째 실패: Exploration Loop 활성화.

**조건부 기능 확장:** Quality Score 측정, Keep/Discard 결정, Experiment Ledger, 가설 탐색, 자동 학습(폐기된 실험에서 얻은 교훈).

**REFINE 건너뛰기 조건:** 50줄 미만의 Simple 태스크.

**사용 시기:** 최대 품질 제공. 포괄적인 리뷰를 거쳐 프로덕션 준비 상태가 필요할 때.

---

## 비영구 워크플로우

### /plan

**설명:** PM 주도 태스크 분해. 요구사항 분석, 기술 스택 선택, 의존성이 있는 우선순위 태스크 분해, API 컨트랙트 정의.

**트리거 키워드:**
| 언어 | 키워드 |
|----------|----------|
| 공통 | "task breakdown" |
| 영어 | "plan" |
| 한국어 | "계획", "요구사항 분석", "스펙 분석" |
| 일본어 | "計画", "要件分析", "タスク分解" |
| 중국어 | "计划", "需求分析", "任务分解" |

**단계:** 요구사항 수집 -> 기술 실현 가능성 분석 (MCP 코드 분석) -> API 컨트랙트 정의 -> 태스크 분해 -> 사용자 리뷰 -> 계획 저장.

**출력:** `.agents/plan.json`, 메모리 기록, 복잡한 계획은 선택적으로 `docs/exec-plans/active/`.

**실행:** 인라인 (서브에이전트 스폰 없음). `/orchestrate` 또는 `/coordinate`에서 소비.

---

### /exec-plan

**설명:** `docs/exec-plans/`에 실행 계획을 일급 리포지토리 아티팩트로 생성, 관리, 추적합니다.

**트리거 키워드:** 없음 (자동 감지에서 제외, 명시적 호출 필수).

**단계:** 준비 -> 범위 분석(복잡도 평가: Simple/Medium/Complex) -> 실행 계획 생성(`docs/exec-plans/active/`에 마크다운) -> API 컨트랙트 정의(크로스 바운더리 시) -> 사용자 리뷰 -> 실행 전달(`/orchestrate` 또는 `/coordinate`로) -> 완료(`completed/`로 이동).

**출력:** `docs/exec-plans/active/{plan-name}.md`.

**사용 시기:** 결정 로깅이 포함된 추적 실행이 필요한 복잡한 기능에 `/plan` 이후.

---

### /brainstorm

**설명:** 디자인 우선 아이디어 탐색. 의도를 탐색하고, 제약을 명확히 하며, 접근 방식을 제안하고, 기획 전에 승인된 설계 문서를 생성합니다.

**트리거 키워드:**
| 언어 | 키워드 |
|----------|----------|
| 공통 | "brainstorm" |
| 영어 | "ideate", "explore design" |
| 한국어 | "브레인스토밍", "아이디어", "설계 탐색" |
| 일본어 | "ブレインストーミング", "アイデア", "設計探索" |
| 중국어 | "头脑风暴", "创意", "设计探索" |

**단계:** 프로젝트 컨텍스트 탐색 -> 명확화 질문(한 번에 하나씩) -> 트레이드오프와 함께 2-3가지 접근 방식 제안 -> 섹션별 설계 제시(각 단계에서 사용자 승인) -> `docs/plans/`에 설계 문서 저장 -> 전환: `/plan` 제안.

**규칙:** 설계 승인 전 구현이나 기획 금지. 코드 출력 없음. YAGNI.

---

### /deepinit

**설명:** 전체 프로젝트 초기화. 기존 코드베이스를 분석하고, AGENTS.md, ARCHITECTURE.md, 구조화된 `docs/` 지식 베이스를 생성합니다.

**트리거 키워드:**
| 언어 | 키워드 |
|----------|----------|
| 공통 | "deepinit" |
| 한국어 | "프로젝트 초기화" |
| 일본어 | "プロジェクト初期化" |
| 중국어 | "项目初始化" |

**단계:** 준비 -> 코드베이스 분석 -> ARCHITECTURE.md 생성 -> `docs/` 지식 베이스 생성 -> 루트 AGENTS.md 생성 -> 경계 AGENTS.md 파일 생성 -> 기존 하네스 업데이트 -> 검증.

**출력:** AGENTS.md, ARCHITECTURE.md, docs/ 디렉토리 내 다양한 문서.

---

### /review

**설명:** 전체 QA 리뷰 파이프라인. 보안 감사(OWASP Top 10), 성능 분석, 접근성 검사(WCAG 2.1 AA), 코드 품질 리뷰.

**트리거 키워드:**
| 언어 | 키워드 |
|----------|----------|
| 공통 | "code review", "security audit", "security review" |
| 영어 | "review" |
| 한국어 | "리뷰", "코드 검토", "보안 검토" |
| 일본어 | "レビュー", "コードレビュー", "セキュリティ監査" |
| 중국어 | "审查", "代码审查", "安全审计" |

**단계:** 리뷰 범위 식별 -> 자동화 보안 검사 -> 수동 보안 리뷰(OWASP Top 10) -> 성능 분석 -> 접근성 리뷰 -> 코드 품질 리뷰 -> QA 보고서 생성.

**선택적 수정-검증 루프** (`--fix`): QA 보고서 후 CRITICAL/HIGH 이슈를 수정하기 위해 도메인 에이전트를 스폰, QA 재실행, 최대 3회 반복.

---

### /debug

**설명:** 회귀 테스트 작성과 유사 패턴 스캔이 포함된 구조화된 버그 진단 및 수정.

**트리거 키워드:**
| 언어 | 키워드 |
|----------|----------|
| 공통 | "debug" |
| 영어 | "fix bug", "fix error", "fix crash" |
| 한국어 | "디버그", "버그 수정", "에러 수정", "버그 찾아", "버그 고쳐" |
| 일본어 | "デバッグ", "バグ修正", "エラー修正" |
| 중국어 | "调试", "修复 bug", "修复错误" |

**단계:** 에러 정보 수집 -> 재현 -> 근본 원인 진단 -> 최소 수정 제안(사용자 확인 필수) -> 수정 적용 + 회귀 테스트 작성 -> 유사 패턴 스캔 -> 메모리에 버그 문서화.

**서브에이전트 스폰 기준:** 에러가 여러 도메인에 걸치거나, 스캔 범위 > 10파일이거나, 깊은 의존성 추적이 필요한 경우.

---

### /design

**설명:** 토큰, 컴포넌트 패턴, 접근성 규칙이 포함된 DESIGN.md를 생성하는 7단계 디자인 워크플로우.

**트리거 키워드:**
| 언어 | 키워드 |
|----------|----------|
| 공통 | "design system", "DESIGN.md", "design token" |
| 영어 | "design", "landing page", "ui design", "color palette", "typography", "dark theme", "responsive design", "glassmorphism" |
| 한국어 | "디자인", "랜딩페이지", "디자인 시스템", "UI 디자인" |
| 일본어 | "デザイン", "ランディングページ", "デザインシステム" |
| 중국어 | "设计", "着陆页", "设计系统" |

**단계:** SETUP -> EXTRACT (선택적) -> ENHANCE -> PROPOSE (2-3가지 방향) -> GENERATE (DESIGN.md + 토큰) -> AUDIT -> HANDOFF.

**필수:** 모든 출력은 반응형 우선 (모바일 320-639px, 태블릿 768px+, 데스크탑 1024px+).

---

### /commit

**설명:** 자동 기능별 분할이 포함된 Conventional Commits 생성.

**트리거 키워드:** 없음 (자동 감지에서 제외).

**단계:** 변경사항 분석 -> 기능 분리 -> 유형 결정 -> 범위 결정 -> 설명 작성 -> 즉시 커밋 실행.

**규칙:** `git add -A` 금지. 시크릿 커밋 금지. HEREDOC 사용. Co-Author: `First Fluke <our.first.fluke@gmail.com>`.

---

### /setup

**설명:** 대화형 프로젝트 설정.

**트리거 키워드:** 없음 (자동 감지에서 제외).

**단계:** 언어 설정 -> CLI 설치 상태 확인 -> MCP 연결 상태(Serena Command 또는 SSE 모드) -> 에이전트-CLI 매핑 -> 요약 -> 리포지토리 스타 안내.

**출력:** `.agents/config/user-preferences.yaml`.

---

### /tools

**설명:** MCP 도구 가시성 및 제한 관리.

**트리거 키워드:** 없음 (자동 감지에서 제외).

**기능:** 현재 MCP 도구 상태 표시, 도구 그룹 활성화/비활성화, 영구 또는 임시 변경, 자연어 파싱.

**도구 그룹:**
- memory: read_memory, write_memory, edit_memory, list_memories, delete_memory
- code-analysis: get_symbols_overview, find_symbol, find_referencing_symbols, search_for_pattern
- code-edit: replace_symbol_body, insert_after_symbol, insert_before_symbol, rename_symbol
- file-ops: list_dir, find_file

---

### /stack-set

**설명:** 프로젝트 기술 스택을 자동 감지하고 백엔드 스킬을 위한 언어별 레퍼런스를 생성합니다.

**트리거 키워드:** 없음 (자동 감지에서 제외).

**단계:** 감지(매니페스트 스캔) -> 확인 -> 생성(`stack/`) -> 검증.

**출력:** `.agents/skills/oma-backend/stack/`에 파일 생성.

---

## 스킬 vs. 워크플로우

| 측면 | 스킬 | 워크플로우 |
|--------|--------|-----------|
| **정의** | 에이전트 전문성 (에이전트가 아는 것) | 오케스트레이션 프로세스 (에이전트가 협업하는 방법) |
| **위치** | `.agents/skills/oma-{name}/` | `.agents/workflows/{name}.md` |
| **활성화** | 스킬 라우팅 키워드를 통한 자동 활성화 | 슬래시 명령 또는 트리거 키워드 |
| **범위** | 단일 도메인 실행 | 다단계, 종종 멀티 에이전트 |
| **예시** | "React 컴포넌트 만들어줘" | "기능 계획 -> 구현 -> 리뷰 -> 커밋" |

---

## 자동 감지: 동작 원리

### 훅 시스템

oh-my-agent는 각 사용자 메시지가 처리되기 전에 실행되는 `UserPromptSubmit` 훅을 사용합니다:

1. **`triggers.json`** (`.claude/hooks/triggers.json`): 11개 언어에 대한 키워드-워크플로우 매핑을 정의합니다.
2. **`keyword-detector.ts`** (`.claude/hooks/keyword-detector.ts`): 사용자 입력을 트리거 키워드와 대조하고, 언어별 매칭을 존중하며, 워크플로우 활성화 컨텍스트를 주입하는 TypeScript 로직.
3. **`persistent-mode.ts`** (`.claude/hooks/persistent-mode.ts`): 활성 상태 파일을 확인하고 영구 워크플로우 실행을 강제합니다.

### 감지 흐름

1. 사용자가 자연어 입력을 타이핑
2. 훅이 명시적 `/command`가 있는지 확인 (있으면 감지 건너뛰기)
3. 훅이 `triggers.json` 키워드 목록에 대해 입력 스캔
4. 매칭이 발견되면, 입력이 정보성 패턴에 해당하는지 확인
5. 정보성이면 필터링 — 워크플로우 트리거 안 함
6. 행동 가능하면, 컨텍스트에 `[OMA WORKFLOW: {workflow-name}]` 주입
7. 에이전트가 해당 워크플로우 파일 로딩

### 정보성 패턴 필터링

`triggers.json`의 `informationalPatterns` 섹션은 명령이 아닌 질문을 나타내는 구문을 정의합니다:

| 언어 | 정보성 패턴 |
|----------|----------------------|
| 영어 | "what is", "what are", "how to", "how does", "explain", "describe", "tell me about" |
| 한국어 | "뭐야", "무엇", "어떻게", "설명해", "알려줘" |
| 일본어 | "とは", "って何", "どうやって", "説明して" |
| 중국어 | "是什么", "什么是", "怎么", "解释" |

입력이 워크플로우 키워드와 정보성 패턴 모두에 매칭되면, 정보성 패턴이 우선합니다.

### 제외된 워크플로우

자동 감지에서 제외되며 명시적 `/command`로만 호출: `/commit`, `/setup`, `/tools`, `/stack-set`, `/exec-plan`.

---

## 영구 모드 메커니즘

### 상태 파일

영구 워크플로우(orchestrate, ultrawork, coordinate)는 `.agents/state/`에 상태 파일을 생성합니다:

```
.agents/state/
├── orchestrate-state.json
├── ultrawork-state.json
└── coordinate-state.json
```

이 파일에는 워크플로우 이름, 현재 단계/스텝, 세션 ID, 타임스탬프, 대기 중인 상태가 포함됩니다.

### 강화

영구 워크플로우가 활성인 동안 `persistent-mode.ts` 훅이 모든 사용자 메시지에 `[OMA PERSISTENT MODE: {workflow-name}]`를 주입합니다.

### 비활성화

"workflow done"(또는 설정 언어의 동등 표현)이라고 말하면:
1. `.agents/state/`에서 상태 파일 삭제
2. 영구 모드 컨텍스트 주입 중지
3. 정상 동작으로 복귀

모든 스텝이 완료되고 마지막 게이트를 통과하면 자연스럽게 종료될 수도 있습니다.

---

## 일반적인 워크플로우 시퀀스

### 빠른 기능
```
/plan → 출력 리뷰 → /exec-plan
```

### 복잡한 멀티 도메인 프로젝트
```
/coordinate → PM 기획 → 사용자 확인 → 에이전트 스폰 → QA 리뷰 → 이슈 수정 → 배포
```

### 최대 품질 제공
```
/ultrawork → PLAN (4개 리뷰 스텝) → IMPL → VERIFY (3개 리뷰 스텝) → REFINE (5개 리뷰 스텝) → SHIP (4개 리뷰 스텝)
```

### 버그 조사
```
/debug → 재현 → 근본 원인 → 최소 수정 → 회귀 테스트 → 유사 패턴 스캔
```

### 디자인에서 구현까지
```
/brainstorm → 설계 문서 → /plan → 태스크 분해 → /orchestrate → 병렬 구현 → /review → /commit
```

### 새 코드베이스 설정
```
/deepinit → AGENTS.md + ARCHITECTURE.md + docs/ → /setup → CLI 및 MCP 설정
```
