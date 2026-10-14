---
title: 사용 가이드
sidebar_label: 기본 사용법
description: OMA 사용 가이드입니다. 독자 관점의 태스크 선택, 단일 스킬과 멀티 도메인 예제, 워크플로우, 자동 감지, 33개 스킬 패키지 전체, CLI 병렬 실행, 대시보드, 기본값, 복구 방법을 다룹니다.
---

# oh-my-agent 사용법

## 빠른 시작

1. 선택한 AI IDE 또는 CLI에서 프로젝트를 엽니다 (Claude Code, Codex CLI, Cursor, Antigravity, OpenCode, Kimi, Kiro, Qwen 또는 지원되는 다른 호스트)
2. 선택한 호스트가 `.agents/skills/`의 [스킬](../getting-started/glossary.md#skill)을 읽을 수 있고, 활성화된 훅은 자연어 키워드로 [워크플로우](../getting-started/glossary.md#workflow)를 감지할 수 있습니다
3. 원하는 것을 자연어로 설명하면 호스트 또는 선택한 워크플로우가 관련 스킬로 라우팅합니다
4. 멀티 에이전트 작업에는 `/work` 또는 `/orchestrate`를 사용합니다

단일 도메인 태스크에는 특별한 구문이 필요 없습니다. [스킬과 워크플로우 선택 가이드](/docs/core-concepts/workflows#choosing-a-skill-or-workflow)를 참고해 단일 스킬, `/work`, `/orchestrate`, `/ultrawork`, `/ralph` 중에서 선택합니다. 설정 방법은 [빠른 시작](../getting-started/quick-start.md)을 보고, 프로바이더를 바꾸기 전에는 [중요한 기본값](../getting-started/important-defaults.md)을 확인하세요.

## 가이드 선택

| 태스크 | 시작 방법 | 가이드 |
|-----------|------------|-------|
| 한 도메인의 변경 하나 | 일반 프롬프트(스킬 라우팅) | [단일 스킬](./single-skill.md) |
| API, UI, 모바일, 데이터베이스에 걸친 기능 | `/work`(단계별) 또는 `/orchestrate`(자동) | [멀티 에이전트 프로젝트](./multi-agent-project.md) |
| 에러 메시지가 있는 버그 | `/debug`와 함께 에러 및 재현 단계 전달 | [버그 수정](./bug-fixing.md) |
| 실행 중인 에이전트 지켜보기 | `oma dashboard terminal` | [대시보드 모니터링](./dashboard-monitoring.md) |
| 에이전트 결과 감사 또는 재개 | `oma agent resume SESSION_ID --dry-run` | [결과 확인과 재개](./agent-results-and-resume.md) |
| 무언가 실패함 | `oma doctor --json` | [문제 해결](./troubleshooting.md) |

---

## 예제 1: 단순 단일 태스크

**입력:**
```text
Create a login form component with email and password fields, client-side validation, and accessible labels using Tailwind CSS
```

**진행 과정:**

1. 호스트가 요청을 `oma-frontend`로 라우팅합니다 ("form", "component", "Tailwind CSS" 같은 키워드가 라우팅 신호입니다)
2. Layer 1 (SKILL.md)이 이미 로딩됨 (에이전트 정체성, 핵심 규칙, 라이브러리 목록)
3. Layer 2 리소스가 필요 시 로딩됩니다:
   - `execution-protocol.md`: 4단계 워크플로우 (분석, 계획, 구현, 검증)
   - `snippets.md`: 폼과 Zod 유효성 검사 패턴, 그리고 스킬이 제공하는 경우 기존 컴포넌트 패턴
4. 에이전트가 **CHARTER_CHECK**를 출력합니다:
   ```text
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: frontend
   - Must NOT do: backend API, database, mobile screens
   - Success criteria: email/password validation, accessible labels, keyboard-friendly
   - Assumptions: React + TypeScript, shadcn/ui, TailwindCSS v4, @tanstack/react-form + Zod
   ```
<!-- oma-docs:ignore-start -->
5. 에이전트가 구현합니다:
   - `src/features/auth/components/login-form.tsx`에 TypeScript React 컴포넌트
   - `src/features/auth/utils/login-validation.ts`에 Zod 유효성 검사 스키마
   - `src/features/auth/utils/__tests__/login-validation.test.ts`에 Vitest 테스트
   - `src/features/auth/components/skeleton/login-form-skeleton.tsx`에 로딩 스켈레톤
<!-- oma-docs:ignore-end -->
6. 에이전트가 체크리스트를 실행합니다: 접근성 (ARIA 레이블, 시맨틱 HTML, 키보드 네비게이션), 모바일 뷰포트, 성능 (CLS 없음), error boundaries

**예상 결과:** 프로젝트가 해당 검사를 지원하면 범위가 정해진 TypeScript React 컴포넌트와 유효성 검사, 테스트, 접근성 근거가 생성됩니다. 실제로 생성되는 파일과 실행되는 검사는 프롬프트와 선택한 워크플로우에 따라 달라집니다.

---

## 예제 2: 멀티 도메인 프로젝트

**입력:**
```text
Build a TODO app with user authentication, task CRUD, and a mobile companion app
```

**진행 과정:**

1. 이 요청은 프론트엔드, 백엔드, 모바일 작업에 걸쳐 있습니다. 호스트 에이전트는 이 범위를 바탕으로 조율 방식을 추천할 수 있습니다.
2. 키워드 감지 훅이 활성화되어 있으면 "Build a TODO app"이 설정된 `/orchestrate` 패턴과 일치해 워크플로우가 활성화될 수 있습니다. 훅은 텍스트를 대조할 뿐이며, 요청을 멀티 도메인으로 분류하지는 않습니다. 원하는 워크플로우는 명시적인 명령으로 선택하세요.

**`/work` 사용 (단계별 사용자 제어):**

```text
/work Build a TODO app with user authentication, task CRUD, and a mobile app
```

3. **Step 1, PM 에이전트가 계획:**
   - 도메인 식별: backend (auth API, task CRUD), frontend (login, task list UI), mobile (Flutter 앱)
   - API 컨트랙트 정의: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /tasks`, `POST /tasks`, `PUT /tasks/:id`, `DELETE /tasks/:id`
   - 우선순위 티어별 태스크 분해 생성 (낮은 티어가 먼저 실행됨):
     - Tier 1: Backend auth API, Backend task CRUD API
     - Tier 2: Frontend login/register, Frontend task list, Mobile auth screens, Mobile task list
     - Tier 3: QA review
   - `.agents/results/plan-{sessionId}.json`에 저장

4. **Step 2, 계획 리뷰:** 에이전트가 계획을 제시하고 기존 승인 범위 안에서 계속 진행합니다. 중요한 미결정 사항이 있거나 새로운 승인이 필요한 경우에만 확인합니다.

5. **Step 3, 우선순위 티어별 에이전트 스폰:**
   ```bash
   # Tier 1 (parallel). Task IDs come from .agents/results/plan-session-todo-01.json
   oma agent spawn backend "JWT auth API + task CRUD endpoints" session-todo-01 --task-id api-auth -w ./apps/api &
   oma agent spawn db "User and task schema design" session-todo-01 --task-id db-schema &
   wait

   # Tier 2 (parallel, after tier 1 completes)
   oma agent spawn frontend "Login, register, task list UI" session-todo-01 --task-id web-ui -w ./apps/web &
   oma agent spawn mobile "Auth and task screens" session-todo-01 --task-id mobile-ui -w ./apps/mobile &
   wait
   ```

   `--task-id`는 세션 계획에 있는 태스크 `id`와 일치해야 합니다. 생략하면 태스크 ID가 에이전트 ID로 기본 설정되며, 계획이 있는 세션은 계획에 없는 ID를 거부합니다(`Unknown plan task`). 계획 없이 진행하는 임시 세션에서는 생략해도 됩니다.

6. **Step 4, QA 에이전트가 리뷰:**
   - 보안: OWASP Top 10 준수 (JWT 유효성 검사, CSRF, SQL injection 검사)
   - 성능: N+1 쿼리 검사, 페이지네이션 확인
   - 접근성: 모든 프론트엔드 컴포넌트에서 WCAG 2.2 AA
   - 크로스 도메인: 프론트엔드, 모바일, 백엔드 간 API 컨트랙트 정렬

7. **Step 5, 반복:** QA에서 CRITICAL 이슈를 발견하면 QA 보고서와 함께 담당 에이전트를 재스폰합니다.

---

## 예제 3: 버그 수정

**입력:**
```text
There's a bug. Clicking the save button shows "Cannot read property 'map' of undefined" in the task list
```

**진행 과정:**

1. `oma-debug`가 자동 활성화 (키워드: "bug", "error", "Cannot read property")
2. **Step 1, 수집:** 에러 메시지와 컨텍스트 캡처
<!-- oma-docs:ignore-start -->
3. **Step 2, 재현:** MCP `search_for_pattern`이 `src/features/tasks/components/task-list.tsx`에서 `.map()` 호출을 찾음
<!-- oma-docs:ignore-end -->
4. **Step 3, 진단:** MCP `find_referencing_symbols`로 데이터 흐름 추적:
   - `useQuery` 훅이 API에서 태스크를 가져옴
   - 컴포넌트가 데이터 도착 전에 렌더링
   - 로딩 상태에서 `tasks`가 `undefined`
   - 근본 원인: `.map()` 전 로딩 상태 검사 누락
5. **Step 4, 수정 제안:** 로딩 상태 검사와 null 가드를 추가하는 최소 변경 제시
6. **Step 5, 구현:**
   - 데이터 페칭 중 로딩 스켈레톤 추가
   - null 검사 추가: `tasks?.map()` 또는 로딩 상태에 대한 early return
   - `tasks`가 undefined일 때 컴포넌트가 올바르게 렌더링되는지 확인하는 회귀 테스트 작성
7. **Step 6, 유사 패턴 스캔:** MCP `search_for_pattern`이 잠재적으로 undefined인 배열에 대한 다른 `.map()` 호출 검색
   - `user-list.tsx`, `comment-list.tsx`, `notification-list.tsx`에서 유사한 3개 패턴 발견
   - 동일한 수정 패턴을 사전 적용
8. **Step 7, 문서화:** 근본 원인, 수정, 예방 조치와 함께 버그 리포트를 메모리에 기록

---

## 예제 4: 디자인 시스템

**입력:**
```text
Design a dark premium landing page for my B2B SaaS analytics product
```

**진행 과정:**

1. `oma-design`이 활성화 (키워드: "design", "landing page", "dark", "premium")
2. **Phase 1, SETUP:** `.design-context.md` 확인. 없으면 질문:
   - 서비스가 지원하는 언어는? (영어만 / + CJK)
   - 대상 사용자? (B2B, 기술 사용자, 25-45세)
   - 브랜드 성격? (전문적 / 프리미엄)
   - 미적 방향? (다크 프리미엄)
   - 참조 사이트? (사용자가 예시 제공)
   - 접근성? (WCAG AA)
3. **Phase 3, ENHANCE:** 프롬프트가 모호하면 섹션별 사양으로 변환
4. **Phase 4, PROPOSE:** 3가지 디자인 방향 제시:
   - **방향 A: "Midnight Observatory"**: 짙은 네이비(#0f1729), 시안 액센트(#22d3ee), Inter + JetBrains Mono, 벤토 그리드 레이아웃, 스크롤 드리븐 리빌
   - **방향 B: "Carbon Interface"**: 중성 그레이(#18181b), 앰버 액센트(#f59e0b), 시스템 폰트, 체스 레이아웃, 호버 드리븐 마이크로 인터랙션
   - **방향 C: "Deep Space"**: 순수 다크(#0a0a0a), 에메랄드 액센트(#10b981), Geist + Geist Mono, 풀 블리드 섹션, 입장 애니메이션
5. **Phase 5, GENERATE:** 선택된 방향을 기반으로 생성:
   - 6개 섹션(타이포그래피, 컬러, 스페이싱, 모션, 컴포넌트, 접근성)이 포함된 `DESIGN.md`
   - CSS 커스텀 프로퍼티
   - Tailwind config 확장
   - shadcn/ui 테마 변수
6. **Phase 6, AUDIT:** 반응형(320px 최소), WCAG 2.2, Nielsen 휴리스틱, AI slop 감지 검사 실행
7. **Phase 7, HANDOFF:** "디자인 완료. oma-frontend로 구현하려면 `/orchestrate`를 실행하세요."

---

## 예제 5: CLI 병렬 실행

```bash
# Single agent for a simple task
oma agent spawn frontend "Add dark mode toggle to the header" session-ui-01

# Three agents in parallel for a full-stack feature
oma agent spawn backend "Implement notification API with WebSocket support" session-notif-01 -w ./apps/api &
oma agent spawn frontend "Build notification center with real-time updates" session-notif-01 -w ./apps/web &
oma agent spawn mobile "Add push notification screens and in-app notification list" session-notif-01 -w ./apps/mobile &
wait

# After editing .agents/agents/ or workflows, regenerate vendor-native files
oma link claude codex antigravity

# Monitor while agents work (separate terminal)
oma dashboard terminal        # Terminal UI with live table
oma dashboard web             # Web UI; prints http://127.0.0.1:9847/

# After implementation, run QA
oma agent spawn qa "Review notification feature across all platforms" session-notif-01

# Check session statistics after completion
oma stats get
```

현재 런타임이 `.agents/oma-config.yaml`의 대상 벤더와 일치하면, 워크플로우는 네이티브 서브에이전트를 우선 써야 합니다.

- Claude Code -> `.claude/agents/*.md`
- Codex CLI -> `.codex/agents/*.toml`
- Qwen Code -> `.qwen/agents/*.md`(Agent 도구의 `subagent_type`으로 선택)
- Antigravity CLI/IDE -> `agy`를 통한 `oma agent spawn`

크로스 벤더 작업과 `model_preset: free`에서는 `oma agent spawn`을 사용합니다. 네이티브 디스패치에서도 검증 증거를 기록하려면 [결과 수명 주기](./agent-results-and-resume.md)를 따라야 합니다.

---

## 예제 6: 최대 품질을 위한 ultrawork

**입력:**
```text
/ultrawork Build a payment processing module with Stripe integration
```

**진행 과정 (5개 단계, 17스텝, 12개 격리된 리뷰 스텝):**

**Phase 1, PLAN (Steps 1-4, PM 에이전트 인라인):**
- Step 1: 태스크 분해, API 컨트랙트, 의존성이 포함된 계획 생성
- Step 2: 계획 리뷰 (완전성 검사. 모든 요구사항이 매핑되었는지?)
- Step 3: 메타 리뷰 (리뷰가 충분했는지 자체 검증)
- Step 4: 과잉 엔지니어링 리뷰 (MVP 초점, 불필요한 복잡성 제거)
- PLAN_GATE: 계획 문서화, 가정 나열, 작업 범위 승인

**Phase 2, IMPL (Step 5, Dev 에이전트 스폰):**
- 백엔드 에이전트가 Stripe 통합 구현 (웹훅, 멱등성, 에러 처리)
- 프론트엔드 에이전트가 체크아웃 플로우와 결제 상태 UI 구축
- Step 5.2: 정의된 측정 비교가 필요할 때만 기준선 기록
- IMPL_GATE: 산출물을 생성하지 않는 해당 검사와 테스트 통과, 계획된 파일만 수정. 빌드 검사는 명시적으로 요청한 경우에만 실행합니다.

**Phase 3, VERIFY (Steps 6-8, QA 에이전트 스폰):**
- Step 6: 정렬 리뷰 (구현이 계획과 일치하는지?)
- Step 7: 보안/버그 리뷰 (OWASP, npm audit, Stripe 보안 모범 사례)
- Step 8: 개선/회귀 리뷰 (도입된 회귀 없음)
- VERIFY_GATE: CRITICAL 0건, HIGH 0건, 해당하는 프로젝트 측정 목표 충족

**Phase 4, REFINE (Steps 9-13, Refactor 에이전트 스폰):**
- Step 9: 대용량 파일(> 500줄)과 함수(> 50줄) 분할
- Step 10: 통합/재사용 리뷰 (중복 로직 제거)
- Step 11: 부작용 리뷰 (`find_referencing_symbols`로 연쇄 영향 추적)
- Step 12: 전체 변경 리뷰 (네이밍 일관성, 스타일 정렬)
- Step 13: 데드 코드 정리
- REFINE_GATE: 해결되지 않은 측정 회귀 없음, 코드 정리

**Phase 5, SHIP (Steps 14-17, QA 에이전트 스폰):**
- Step 14: 코드 품질 리뷰 (lint, 타입, 커버리지)
- Step 15: UX 플로우 검증 (엔드투엔드 결제 사용자 여정)
- Step 16: 관련 이슈 리뷰 (최종 연쇄 영향 검사)
- Step 17: 배포 준비 (시크릿 관리, 마이그레이션 스크립트, 롤백 계획)
- SHIP_GATE: 모든 검사를 통과하고 기존 승인을 적용합니다. 게시나 배포에는 해당 행동에 대한 승인이 필요합니다.

---

## 모든 워크플로우 명령

| 명령 | 유형 | 기능 | 사용 시기 |
|---------|------|-------------|-------------|
| `/orchestrate` | 지속 | 계획을 불러오거나 생성한 뒤 병렬 실행을 위임하고 모니터링·검증합니다 | 자동 병렬 조율에 적합한 독립 태스크 |
| `/work` | 지속 | 승인된 범위 안에서 단계별 멀티 도메인 계획, 구현, QA를 진행합니다 | 여러 도메인에 걸쳐 조율된 전달이 필요한 기능 |
| `/ultrawork` | 지속 | 5단계, 17스텝 품질 워크플로우와 12개 격리된 리뷰 체크포인트를 실행합니다 | 최대 품질이 필요한 전달, 프로덕션에 중요한 코드 |
| `/plan` | 비지속 | PM 주도 태스크 분해, API 컨트랙트, `docs/plans/work/`의 추적 계획 아티팩트(순번 `NNN-name.md`, 수명 주기를 나타내는 Status 필드)를 만듭니다 | 복잡한 멀티 에이전트 작업 전, 진행과 결정 로그를 추적해야 하는 복잡한 기능 |
| `/brainstorm` | 비지속 | 2~3가지 접근 방식 제안을 포함한 디자인 우선 아이디어를 탐색합니다 | 구현 접근 방식을 정하기 전 |
| `/deepinit` | 비지속 | 전체 프로젝트 초기화(AGENTS.md, ARCHITECTURE.md, docs/)를 수행합니다 | 기존 코드베이스에 oh-my-agent를 설정할 때 |
| `/review` | 비지속 | OWASP 보안, 성능, 접근성, 코드 품질을 검토하는 QA 파이프라인입니다 | 코드 병합 전 또는 배포 전 리뷰 |
| `/security` | 비지속 | `oma-security`로 애플리케이션 소스, 에이전트 스킬, MCP 컴포넌트를 스캔하고, 테스트 배포를 대상으로 범위가 지정된 웹 침투 테스트를 실행하며, 발견 사항을 검증하고 보안 게이트를 구성합니다 | 릴리스 전, 또는 변경에 보안 스캔이나 게이트가 필요할 때 |
| `/debug` | 비지속 | 재현, 진단, 수정, 회귀 테스트, 패턴 스캔을 포함한 구조화된 디버깅을 수행합니다 | 버그와 오류를 조사할 때 |
| `/design` | 비지속 | 토큰이 포함된 DESIGN.md를 만드는 7단계 디자인 워크플로우입니다 | 디자인 시스템, 랜딩 페이지, UI 재설계 |
| `/scm` | 비지속 | Git의 SCM 워크플로우(브랜치·머지·충돌·워크트리·베이스라인)와 type/scope 자동 감지 및 기능별 분할을 갖춘 Conventional Commit 생성 | 코드 변경 후 또는 저장소 형상 관리 태스크를 처리할 때 |
| `/tools` | 비지속 | MCP 도구 가시성을 관리합니다(그룹 활성화·비활성화) | 에이전트가 사용할 MCP 도구를 제어할 때 |
| `/stack-set` | 비지속 | 프로젝트 기술 스택을 자동 감지해 백엔드 또는 모바일(Swift/Flutter/RN) 레퍼런스를 생성합니다 | 언어별 코딩 규칙을 설정할 때 |
| `/architecture` | 비지속 | 아키텍처 진단, 비교, 결정 기록을 수행합니다 | 경계를 검토하거나 아키텍처를 선택할 때 |
| `/convert` | 비지속 | 문서 변환을 알맞은 스킬로 전달합니다 | HWP/HWPX 또는 PDF 원본 파일을 변환할 때 |
| `/docs` | 비지속 | 문서 검증과 diff 대상 동기화 제안을 수행합니다 | 문서를 현재 코드베이스와 대조할 때 |
| `/explain` | 비지속 | 오프라인 HTML 코드 변경 설명서를 만들고 검증합니다 | diff, PR, 브랜치 또는 커밋 범위를 설명할 때 |
| `/recap` | 비지속 | 지원되는 AI 도구 이력에서 작업을 요약합니다 | 일일 또는 기간별 회고 |
| `/schedule` | 비지속 | 반복 에이전트 작업을 등록합니다 | 야간 회고, 스캔 또는 정기 관리 작업 |
| `/video` | 비지속 | 스크립트, 내레이션, 시각 자료로 재현 가능한 영상을 구성합니다 | 숏폼, 설명 영상, 데모 |
| `/ralph` | 지속 | 프롬프트로 지시한 judge와 루프 안전장치를 갖춘 ultrawork를 반복 실행합니다 | 기계적인 완료 기준을 통과할 때까지 반복하라는 명시적 요청 |

---

## 자동 감지 예제

oh-my-agent은 11개 언어에서 워크플로우 키워드를 감지합니다. 자연어가 워크플로우를 트리거하는 예제:

| 입력 | 감지된 워크플로우 | 언어 |
|----------|------------------|----------|
| "plan the authentication feature" | `/plan` | 영어 |
| "do everything in parallel" | `/orchestrate` | 영어 |
| "review the code for security" | `/review` | 영어 |
| "brainstorm some ideas for the dashboard" | `/brainstorm` | 영어 |
| "design a landing page for our product" | `/design` | 영어 |
| "fix the login bug" | `/debug` | 영어 |
| "계획 세워줘" | `/plan` | 한국어 |
| "버그 수정해줘" | `/debug` | 한국어 |
| "디자인 시스템 만들어줘" | `/design` | 한국어 |
| "자동으로 실행해" | `/orchestrate` | 한국어 |
| "コードレビューして" | `/review` | 일본어 |
| "計画を立てて" | `/plan` | 일본어 |
| "修复这个 bug" | `/debug` | 중국어 |
| "设计一个着陆页" | `/design` | 중국어 |
| "revisar código" | `/review` | 스페인어 |
| "diseña la página" | `/design` | 스페인어 |
| "debuggen" | `/debug` | 독일어 |
| "coordonner étape par étape" | `/work` | 프랑스어 |
| "don't stop until it's done" | `/ralph` | 영어 |
| "끝까지 해" | `/ralph` | 한국어 |
| "最後までやって" | `/ralph` | 일본어 |

**정보성 쿼리는 필터링됩니다:**

| 입력 | 결과 |
|----------|--------|
| "what is orchestrate?" | 워크플로우 트리거 안 함 (정보성 패턴: "what is") |
| "explain how /plan works" | 워크플로우 트리거 안 함 (정보성 패턴: "explain") |
| "어떻게 사용해?" | 워크플로우 트리거 안 함 (정보성 패턴: "어떻게") |
| "レビューとは何ですか" | 워크플로우 트리거 안 함 (정보성 패턴: "とは") |

---

## 33개 스킬 전체: 빠른 참조

설치 프로그램의 `all` 프리셋은 현재 레지스트리를 따릅니다. 아래 표는 현재 모든 스킬을 주 용도별로 묶은 것이며, 각 스킬은 경계에서 다른 스킬과 조율할 수 있습니다.

| 스킬 | 적합한 용도 | 주요 출력 |
|-------|---------|---------------|
| **oma-academic-writing** | 학술 초안, 수정, AI 문체 검토 | 출판용 문장과 주장·근거 수정 |
| **oma-architecture** | 시스템 경계, 트레이드오프, ADR | 아키텍처 권고 또는 결정 기록 |
| **oma-backend** | API, 인증, 서버 로직, 마이그레이션 | 라우터·서비스·리포지토리 변경과 검증 |
| **oma-brainstorm** | 모호한 아이디어와 접근 방식 비교 | `docs/plans/designs/` 설계 문서 |
| **oma-coordination** | 수동 멀티 에이전트 조율 | 단계별 태스크와 핸드오프 안내 |
| **oma-db** | 스키마, ERD, 쿼리 튜닝, 용량 계획 | 스키마 문서, 마이그레이션, 복구 계획 |
| **oma-debug** | 버그 재현과 근본 원인 분석 | 최소 수정, 회귀 근거, 유사 패턴 스캔 |
| **oma-security** | 소스, 에이전트 스킬, MCP 보안 스캔과 범위가 지정된 웹 침투 테스트 | 검증된 발견 사항과 스캔 게이트 설정 |
| **oma-design** | 디자인 시스템, 랜딩 페이지, 토큰 | `DESIGN.md`, 토큰, 컴포넌트 안내 |
| **oma-dev-workflow** | CI/CD, 모노레포, 마이그레이션, 릴리스 자동화 | 워크플로우 설정과 릴리스 검사 |
| **oma-docs** | 깨진 참조와 문서 드리프트 | 검증 보고서 또는 diff 대상 동기화 후보 |
| **oma-explanation** | diff, PR, 브랜치, 커밋 설명 | Background, Intuition, Code, Quiz가 있는 오프라인 HTML 설명서 |
| **oma-frontend** | UI 컴포넌트, 폼, 페이지, Angular/React 스타일링 | 프론트엔드 변경과 관련 검사 |
| **oma-hwp** | HWP/HWPX/HWPML 변환 | 헤딩, 표, 이미지, 링크가 있는 Markdown |
| **oma-image** | 이미지 생성과 시각 자료 | 매니페스트가 포함된 재현 가능한 이미지 실행 |
| **oma-market** | 문제점, 트렌드, 경쟁사, 발견 조사 | 프레임워크가 포함된 LAW 준수 조사 브리프 |
| **oma-mobile** | Flutter, React Native, Swift iOS 작업 | 모바일 화면, 상태, 플랫폼 통합, 테스트 |
| **oma-observability** | 트레이스, 메트릭, 로그, 프로파일, SLO, 장애 포렌식 | 계층형 관측성 권고 또는 구현 안내 |
| **oma-orchestration** | 자동 병렬 에이전트 실행 | 조율된 계획, 메모리 갱신, 결과 수집 |
| **oma-pdf** | PDF 변환과 OCR 인식 추출 | 읽기 순서, 표, 목록, 이미지가 있는 Markdown |
| **oma-pm** | 요구사항, 태스크 분해, API 컨트랙트 | `.agents/results/plan-{sessionId}.json`과 태스크 보드 |
| **oma-qa** | 보안, 성능, 접근성, 품질 검토 | 심각도와 수정 근거가 있는 발견 사항 보고서 |
| **oma-recap** | 여러 도구의 작업 회고 | `.agents/results/recap/`의 일일 또는 기간별 회고 |
| **oma-refactor** | 동작을 보존하는 구조 개선 | 특성화 테스트와 품질 근거가 있는 리팩터링 |
| **oma-scholar** | 학술 검색과 논문 사이드카 | 검증된 `.knows.yaml` 사이드카 작업 |
| **oma-scm** | Git 브랜치, 워크트리, 베이스라인, 커밋 위생 | SCM 계획 또는 Conventional Commit 출력 |
| **oma-search** | 신뢰도 점수가 있는 문서, 웹, 코드, 로컬 검색 | 신뢰 라벨이 붙은 라우팅 검색 결과 |
| **oma-skill-creation** | OMA 스킬 생성과 감사 | SSL-lite 스킬 파일과 `oma skill audit` 결과 |
| **oma-slide** | HTML 발표 자료와 내보내기 | 검증된 번들 HTML, PDF, PNG, PPTX |
| **oma-tf-infra** | Terraform 인프라, IAM, 정책 코드 | Terraform 모듈, 계획, 제어 항목 |
| **oma-translation** | UI, 문서, 마케팅 현지화 | 맥락을 보존한 번역 콘텐츠 |
| **oma-video** | 숏폼, 설명 영상, 데모 | 에셋과 매니페스트가 있는 재현 가능한 영상 실행 |
| **oma-voice** | 로컬 TTS, STT, 보이스오버 | 매니페스트가 있는 오디오 또는 전사 산출물 |

---

## 대시보드 설정

```bash
oma dashboard terminal   # live table in this terminal; Ctrl+C to exit
oma dashboard web        # prints http://127.0.0.1:9847/; open it in a browser
```

두 명령 모두 현재 디렉토리의 `.agents/state/memories/`를 감시합니다. 다른 프로젝트를 감시하려면 `--project-root <path>`를 전달하거나 `MEMORIES_DIR`를 설정하세요. 에이전트 테이블에는 네 개의 열이 있습니다.

| 열 | 출처 |
|--------|--------|
| Agent | `task-board.md` 또는 메모리 파일에서 발견한 에이전트 이름 |
| Status | 터미널 기호: ● 실행 중(초록), ✓ 완료(시안), ✗ 실패(빨강), ○ 차단됨(노랑), ◌ 대기 중(흐림) |
| Turn | 에이전트의 `progress-<agent>*.md` 파일에 있는 `turn: N` |
| Task | 태스크 보드 또는 에이전트 파일의 태스크 텍스트 |

테이블 아래에는 두 대시보드 모두 가장 최근에 수정된 메모리 파일 다섯 개의 최신 활동을 보여줍니다. 레이아웃, 데이터 출처, 복구 단계는 [대시보드 모니터링](./dashboard-monitoring.md)에 있습니다.

---

## 핵심 개념 설명

### 점진적 공개

스킬은 토큰을 절약하기 위해 2계층으로 로딩됩니다. Layer 1(`SKILL.md`)은 호스트가 스킬을 라우팅할 때 컨텍스트에 들어가며, 주입기는 본문이 아니라 경로를 전달합니다. Layer 2(`resources/`)는 태스크에 필요할 때만 읽습니다. 난이도는 읽을 파일 목록이 아니라 소프트 예산을 정합니다. 절약 폭은 스킬과 태스크에 따라 달라지므로 수치를 가정하지 말고 측정하세요. 측정 스크립트와 그 추정치가 무엇을 포함하는지는 [토큰 절약 계산](../core-concepts/skills.md#token-savings-math)을 참고하세요.

### 토큰 최적화

점진적 공개 외에도 oh-my-agent은 다음을 통해 토큰을 최적화합니다:
- **컨텍스트 예산 관리**: 전체 파일 읽기 없음. `read_file` 대신 `find_symbol` 사용
- **지연 리소스 로딩**: 에러 플레이북은 에러 시에만, 체크리스트는 검증 시에만 로딩
- **난이도 기반 분기**: Simple 태스크는 분석을 건너뛰고 최소 체크리스트 사용
- **진행 추적**: 에이전트가 읽은 파일을 기록하여 재읽기 방지

### CLI 스폰

`oma agent spawn`을 실행하면 CLI가:
1. 명시적 옵션, 에이전트 오버라이드, 모델 프리셋, 설정된 폴백 순으로 역할의 벤더를 결정합니다
2. `.agents/skills/_shared/runtime/execution-protocols/{vendor}.md`에서 벤더별 실행 프로토콜을 주입합니다
3. SKILL.md 핵심 규칙, 실행 프로토콜, 태스크 관련 리소스를 사용하여 에이전트 프롬프트를 구성합니다
4. 독립 CLI 프로세스로 에이전트를 스폰합니다
5. 실행은 `.agents/state/agent-runs/`에 구조화된 실행 기록을 남기고 클레임 경로를 주입합니다
6. 에이전트가 구조화된 클레임을 작성하며, 사람이 읽는 진행·결과 Markdown 파일은 보조 기록입니다

### 프로젝트 메모리 저장소

에이전트는 `.agents/state/memories/`의 영속 파일로 조율됩니다(오래된 프로젝트는 레거시 `.serena/memories/` 경로로 폴백). 오케스트레이터는 실행 범위가 지정된 세션·태스크 보드 파일을 작성합니다. Markdown 진행·결과 출력이 활성화되면 각 실행은 `progress-{agentId}-{taskId}-{runId}-{sessionId}.md`와 `result-{agentId}-{taskId}-{runId}-{sessionId}.md`를 기록하며, CLI 스폰에서는 `.agents/state/agent-runs/` 아래의 구조화된 실행 기록과 클레임이 기준입니다. 에이전트는 네이티브 파일 도구로 이 파일들을 읽고 쓰며, 도구 매핑은 `.agents/mcp.json → memoryConfig.tools`에서 설정할 수 있습니다.

### 워크스페이스

<!-- oma-docs:ignore-start -->
`agent spawn`의 `-w` 플래그는 에이전트를 특정 디렉토리로 격리합니다. 이는 병렬 실행에서 매우 중요합니다. 워크스페이스 격리 없이 두 에이전트가 동시에 같은 파일을 수정하여 충돌이 발생할 수 있습니다. 표준 워크스페이스 레이아웃: `./apps/api` (backend), `./apps/web` (frontend), `./apps/mobile` (mobile).
<!-- oma-docs:ignore-end -->

---

## 팁

1. **프롬프트를 구체적으로 작성하세요.** "JWT 인증, React 프론트엔드, Express 백엔드, PostgreSQL이 포함된 TODO 앱을 만들어줘"가 "앱을 만들어줘"보다 더 좋은 결과를 냅니다.

2. **병렬 에이전트에는 워크스페이스를 사용하세요.** 동시 실행 에이전트 간 파일 충돌을 방지하기 위해 항상 `-w ./path`를 전달하세요.

3. **구현 에이전트 스폰 전에 API 컨트랙트를 확정하세요.** 프론트엔드와 백엔드 에이전트가 엔드포인트 형태에 합의하도록 먼저 `/plan`을 실행하세요.

4. **적극적으로 모니터링하세요.** 모든 에이전트가 끝난 뒤에 문제를 발견하기보다, 대시보드 터미널을 열어 두고 실패하는 에이전트를 조기에 잡으세요.

5. **재스폰으로 반복하세요.** 에이전트 출력이 적절하지 않으면 원래 태스크에 수정 컨텍스트를 추가하여 재스폰하세요. 처음부터 다시 시작하지 마세요.

6. **작업에 맞는 조율 방식을 선택하세요.** 단일 도메인은 단일 스킬로 시작합니다. 조율이나 명시적인 품질 검토 절차가 필요하면 [선택 가이드](/docs/core-concepts/workflows#choosing-a-skill-or-workflow)를 참고합니다.

7. **모호한 아이디어에는 `/plan` 전에 `/brainstorm`을 사용하세요.** 브레인스토밍이 PM 에이전트가 태스크로 분해하기 전에 의도와 접근 방식을 명확히 합니다.

8. **새 코드베이스에서 `/deepinit`을 실행하세요.** 모든 에이전트가 프로젝트 구조를 이해하는 데 도움이 되는 AGENTS.md와 ARCHITECTURE.md를 생성합니다.

9. **`model_preset`을 설정하세요.** `auto`로 시작하거나 `claude`, `antigravity`, `codex`, `qwen`, `cursor`, `kiro`, `mixed` 같은 고정 프리셋을 선택하고, 로컬 게이트웨이와 함께 `free`를 쓸 수도 있습니다. 세밀하게 제어하려면 `agents:` 오버라이드를 추가하세요. [에이전트별 모델](./per-agent-models.md)을 참고하세요.

10. **전체 리뷰 절차가 명시적으로 필요할 때 `/ultrawork`를 사용하세요.** 5단계 워크플로우는 12개 격리된 리뷰 스텝을 실행합니다. 스킬 로딩만으로는 이 검사들이 실행되지 않습니다.

---

## 문제 해결 {#troubleshooting}

자주 발생하는 문제는 아래와 같습니다. 에러 메시지, 실행 결과 실패, 스케줄, 훅에 관해서는 [문제 해결](./troubleshooting.md)을 참고하세요.

| 문제 | 원인 | 해결 방법 |
|---------|-------|-----|
| IDE에서 스킬이 감지되지 않음 | `.agents/skills/`가 누락되었거나 `SKILL.md` 파일이 없음 | 설치 프로그램 실행(`bunx oh-my-agent@latest`), `.claude/skills/`의 심볼릭 링크 확인, IDE 재시작 |
| 스폰 시 CLI를 찾을 수 없음 | 선택한 AI CLI가 설치되지 않았거나 `PATH` 밖에 있음 | `which <selected-cli>`(예: `claude`, `codex`, `agy`, `qwen`, `kiro-cli`)를 실행하거나, 새 셸을 열거나, 설치 가이드에 따라 설치 |
| 에이전트가 충돌하는 코드 생성 | 워크스페이스 격리 없음 | 별도 워크스페이스 사용: `-w ./apps/api`, `-w ./apps/web` |
| 대시보드에 "No agents detected yet" 표시 | 에이전트가 아직 메모리에 쓰지 않았거나, 대시보드가 다른 디렉토리를 감시함 | 첫 진행 파일을 기다리고, 프로젝트 루트에서 실행하거나 `--project-root <path>` 전달 |
| `oma dashboard web`이 "port 9847 is already in use"로 종료됨 | 다른 프로세스가 포트를 점유 중 | `DASHBOARD_PORT=8080 oma dashboard web` |
| QA 보고서에 50개 이상 이슈 | 대규모 코드베이스의 첫 리뷰에서는 정상 | CRITICAL과 HIGH 심각도에 집중. MEDIUM/LOW는 향후 스프린트를 위해 문서화. |
| 자동 감지가 잘못된 워크플로우 트리거 | 키워드 모호성 | 자연어 대신 명시적 `/command` 사용. 개선을 위해 오탐 보고. |
| 지속 워크플로우가 중단되지 않음 | 상태 파일이 여전히 존재 | 채팅에서 "workflow done"이라고 말하거나 `.agents/state/`에서 상태 파일 수동 삭제 |
| 에이전트가 HIGH 명확화로 차단됨 | 요구사항이 너무 모호 | 에이전트가 요청한 구체적인 답변 제공 후 재실행 |
| MCP 도구가 작동하지 않음 | Serena가 설정되지 않았거나 실행 중이지 않음 | `oma doctor`로 MCP 설정 확인 |
| 에이전트가 실행 예산을 초과함 | 한 번의 실행으로 처리하기에는 태스크가 너무 복잡함 | 태스크를 분해하거나, 태스크 경계가 명확한 워크플로우를 사용하거나, 더 좁은 인수 계약으로 다시 시도 |
| 에이전트에 잘못된 CLI 사용 | `model_preset`이 설정되지 않았거나 에이전트 오버라이드 누락 | `oma install`로 설정하거나 `oma-config.yaml`에서 `model_preset` 설정. [에이전트별 모델](./per-agent-models.md) 참고. |

---

## 다음 단계

- 한 도메인의 변경 하나: [단일 스킬](./single-skill.md)
- 여러 도메인에 걸친 기능: [멀티 에이전트 프로젝트](./multi-agent-project.md)
- 에러 메시지가 있는 버그: [버그 수정](./bug-fixing.md)
- 실행 지켜보기: [대시보드 모니터링](./dashboard-monitoring.md)
- 에이전트 결과 감사 또는 재개: [결과 확인과 재개](./agent-results-and-resume.md)
- 무언가 실패함: [문제 해결](./troubleshooting.md)
- 프로젝트 통합 세부사항: [통합 가이드](./integration.md)
- 이 가이드에서 쓰는 용어: [용어집](../getting-started/glossary.md)
