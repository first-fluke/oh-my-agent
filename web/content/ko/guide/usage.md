---
title: 사용 가이드
description: oh-my-agent 종합 사용 가이드 — 빠른 시작, 단일 태스크부터 멀티 도메인 프로젝트, 버그 수정, 디자인 시스템, CLI 병렬 실행, ultrawork까지의 상세 실제 예제. 모든 워크플로우 명령, 다국어 자동 감지 예제, 14개 스킬과 사용 사례, 대시보드 설정, 핵심 개념, 팁, 문제 해결.
---

# oh-my-agent 사용법

## 빠른 시작

1. AI 기반 IDE에서 프로젝트를 엽니다 (Claude Code, Gemini CLI, Cursor, Antigravity 등)
2. `.agents/skills/`에서 스킬이 자동 감지됩니다
3. 원하는 것을 자연어로 설명합니다 — oh-my-agent가 적절한 에이전트로 라우팅합니다
4. 멀티 에이전트 작업에는 `/work` 또는 `/orchestrate`를 사용합니다

이것이 전체 워크플로우입니다. 단일 도메인 태스크에는 특별한 구문이 필요 없습니다.

---

## 예제 1: 단순 단일 태스크

**입력:**
```
Create a login form component with email and password fields, client-side validation, and accessible labels using Tailwind CSS
```

**진행 과정:**

1. `oma-frontend` 스킬이 자동 활성화됩니다 (키워드: "form", "component", "Tailwind CSS")
2. Layer 1 (SKILL.md)이 이미 로딩됨 — 에이전트 정체성, 핵심 규칙, 라이브러리 목록
3. Layer 2 리소스가 필요 시 로딩됩니다:
   - `execution-protocol.md` — 4단계 워크플로우 (분석, 계획, 구현, 검증)
   - `snippets.md` — 폼 + Zod 유효성 검사 패턴
   - `component-template.tsx` — React 컴포넌트 구조
4. 에이전트가 **CHARTER_CHECK**를 출력합니다:
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: frontend
   - Must NOT do: backend API, database, mobile screens
   - Success criteria: email/password validation, accessible labels, keyboard-friendly
   - Assumptions: React + TypeScript, shadcn/ui, TailwindCSS v4, @tanstack/react-form + Zod
   ```
5. 에이전트가 구현합니다:
   - `src/features/auth/components/login-form.tsx`에 TypeScript React 컴포넌트
   - `src/features/auth/utils/login-validation.ts`에 Zod 유효성 검사 스키마
   - `src/features/auth/utils/__tests__/login-validation.test.ts`에 Vitest 테스트
   - `src/features/auth/components/skeleton/login-form-skeleton.tsx`에 로딩 스켈레톤
6. 에이전트가 체크리스트를 실행합니다: 접근성 (ARIA 레이블, 시맨틱 HTML, 키보드 네비게이션), 모바일 뷰포트, 성능 (CLS 없음), error boundaries

**출력:** TypeScript, 유효성 검사, 테스트, 접근성을 갖춘 프로덕션 레디 React 컴포넌트 — 단순한 제안이 아닙니다.

---

## 예제 2: 멀티 도메인 프로젝트

**입력:**
```
Build a TODO app with user authentication, task CRUD, and a mobile companion app
```

**진행 과정:**

1. 키워드 감지가 이것을 멀티 도메인으로 식별 (frontend + backend + mobile)
2. 워크플로우 명령을 사용하지 않았다면 oh-my-agent가 `/work` 또는 `/orchestrate`를 제안

**`/work` 사용 (단계별 사용자 제어):**

```
/work Build a TODO app with user authentication, task CRUD, and a mobile app
```

3. **Step 1 — PM 에이전트가 계획:**
   - 도메인 식별: backend (auth API, task CRUD), frontend (login, task list UI), mobile (Flutter 앱)
   - API 컨트랙트 정의: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /tasks`, `POST /tasks`, `PUT /tasks/:id`, `DELETE /tasks/:id`
   - 우선순위별 태스크 분해 생성:
     - P0: Backend auth API, Backend task CRUD API
     - P1: Frontend login/register, Frontend task list, Mobile auth screens, Mobile task list
     - P2: QA review
   - `.agents/results/plan-{sessionId}.json`에 저장

4. **Step 2 — 사용자가 계획을 리뷰하고 확인**

5. **Step 3 — 우선순위별 에이전트 스폰:**
   ```bash
   # P0 티어 (병렬)
   oma agent:spawn backend "JWT auth API + task CRUD endpoints" session-todo-01 -w ./apps/api &
   oma agent:spawn db "User and task schema design" session-todo-01 &
   wait

   # P1 티어 (P0 완료 후 병렬)
   oma agent:spawn frontend "Login, register, task list UI" session-todo-01 -w ./apps/web &
   oma agent:spawn mobile "Auth and task screens" session-todo-01 -w ./apps/mobile &
   wait
   ```

6. **Step 4 — QA 에이전트가 리뷰:**
   - 보안: OWASP Top 10 준수 (JWT 유효성 검사, CSRF, SQL injection 검사)
   - 성능: N+1 쿼리 검사, 페이지네이션 확인
   - 접근성: 모든 프론트엔드 컴포넌트에서 WCAG 2.1 AA
   - 크로스 도메인: 프론트엔드, 모바일, 백엔드 간 API 컨트랙트 정렬

7. **Step 5 — 반복:** QA에서 CRITICAL 이슈를 발견하면 QA 보고서와 함께 담당 에이전트를 재스폰.

---

## 예제 3: 버그 수정

**입력:**
```
There's a bug — clicking the save button shows "Cannot read property 'map' of undefined" in the task list
```

**진행 과정:**

1. `oma-debug`가 자동 활성화 (키워드: "bug", "error", "Cannot read property")
2. **Step 1 — 수집:** 에러 메시지와 컨텍스트 캡처
3. **Step 2 — 재현:** MCP `search_for_pattern`이 `src/features/tasks/components/task-list.tsx`에서 `.map()` 호출을 찾음
4. **Step 3 — 진단:** MCP `find_referencing_symbols`로 데이터 흐름 추적:
   - `useQuery` 훅이 API에서 태스크를 가져옴
   - 컴포넌트가 데이터 도착 전에 렌더링
   - 로딩 상태에서 `tasks`가 `undefined`
   - 근본 원인: `.map()` 전 로딩 상태 검사 누락
5. **Step 4 — 수정 제안:** 최소 변경 제시 — 로딩 상태 검사와 null 가드 추가
6. **Step 5 — 구현:**
   - 데이터 페칭 중 로딩 스켈레톤 추가
   - null 검사 추가: `tasks?.map()` 또는 로딩 상태에 대한 early return
   - `tasks`가 undefined일 때 컴포넌트가 올바르게 렌더링되는지 확인하는 회귀 테스트 작성
7. **Step 6 — 유사 패턴 스캔:** MCP `search_for_pattern`이 잠재적으로 undefined인 배열에 대한 다른 `.map()` 호출 검색
   - `user-list.tsx`, `comment-list.tsx`, `notification-list.tsx`에서 유사한 3개 패턴 발견
   - 동일한 수정 패턴을 사전 적용
8. **Step 7 — 문서화:** 근본 원인, 수정, 예방 조치와 함께 버그 리포트를 메모리에 기록

---

## 예제 4: 디자인 시스템

**입력:**
```
Design a dark premium landing page for my B2B SaaS analytics product
```

**진행 과정:**

1. `oma-design`이 활성화 (키워드: "design", "landing page", "dark", "premium")
2. **Phase 1 — SETUP:** `.design-context.md` 확인. 없으면 질문:
   - 서비스가 지원하는 언어는? (영어만 / + CJK)
   - 대상 사용자? (B2B, 기술 사용자, 25-45세)
   - 브랜드 성격? (전문적 / 프리미엄)
   - 미적 방향? (다크 프리미엄)
   - 참조 사이트? (사용자가 예시 제공)
   - 접근성? (WCAG AA)
3. **Phase 3 — ENHANCE:** 프롬프트가 모호하면 섹션별 사양으로 변환
4. **Phase 4 — PROPOSE:** 3가지 디자인 방향 제시:
   - **방향 A: "Midnight Observatory"** — 짙은 네이비(#0f1729), 시안 액센트(#22d3ee), Inter + JetBrains Mono, 벤토 그리드 레이아웃, 스크롤 드리븐 리빌
   - **방향 B: "Carbon Interface"** — 중성 그레이(#18181b), 앰버 액센트(#f59e0b), 시스템 폰트, 체스 레이아웃, 호버 드리븐 마이크로 인터랙션
   - **방향 C: "Deep Space"** — 순수 다크(#0a0a0a), 에메랄드 액센트(#10b981), Geist + Geist Mono, 풀 블리드 섹션, 입장 애니메이션
5. **Phase 5 — GENERATE:** 선택된 방향을 기반으로 생성:
   - 6개 섹션(타이포그래피, 컬러, 스페이싱, 모션, 컴포넌트, 접근성)이 포함된 `DESIGN.md`
   - CSS 커스텀 프로퍼티
   - Tailwind config 확장
   - shadcn/ui 테마 변수
6. **Phase 6 — AUDIT:** 반응형(320px 최소), WCAG 2.2, Nielsen 휴리스틱, AI slop 감지 검사 실행
7. **Phase 7 — HANDOFF:** "디자인 완료. oma-frontend로 구현하려면 `/orchestrate`를 실행하세요."

---

## 예제 5: CLI 병렬 실행

```bash
# 단일 에이전트 — 단순 태스크
oma agent:spawn frontend "Add dark mode toggle to the header" session-ui-01

# 3개 에이전트 병렬 — 풀스택 기능
oma agent:spawn backend "Implement notification API with WebSocket support" session-notif-01 -w ./apps/api &
oma agent:spawn frontend "Build notification center with real-time updates" session-notif-01 -w ./apps/web &
oma agent:spawn mobile "Add push notification screens and in-app notification list" session-notif-01 -w ./apps/mobile &
wait

# 에이전트 작업 중 모니터링 (별도 터미널)
oma dashboard        # 실시간 테이블이 있는 터미널 UI
oma dashboard:web    # http://localhost:9847의 웹 UI

# 구현 후 QA 실행
oma agent:spawn qa "Review notification feature across all platforms" session-notif-01

# 완료 후 세션 통계 확인
oma stats
```

---

## 예제 6: Ultrawork — 최대 품질

**입력:**
```
/ultrawork Build a payment processing module with Stripe integration
```

**진행 과정 (5개 단계, 17스텝, 11개 리뷰 스텝):**

**Phase 1 — PLAN (Steps 1-4, PM 에이전트 인라인):**
- Step 1: 태스크 분해, API 컨트랙트, 의존성이 포함된 계획 생성
- Step 2: 계획 리뷰 — 완전성 검사 (모든 요구사항이 매핑되었는지?)
- Step 3: 메타 리뷰 — 리뷰가 충분했는지 자체 검증
- Step 4: 과잉 엔지니어링 리뷰 — MVP 초점, 불필요한 복잡성 제거
- PLAN_GATE: 계획 문서화, 가정 나열, 사용자 확인

**Phase 2 — IMPL (Step 5, Dev 에이전트 스폰):**
- 백엔드 에이전트가 Stripe 통합 구현 (웹훅, 멱등성, 에러 처리)
- 프론트엔드 에이전트가 체크아웃 플로우와 결제 상태 UI 구축
- Step 5.2: 기준선 Quality Score 측정 (테스트, lint, typecheck)
- IMPL_GATE: 빌드 성공, 테스트 통과, 계획된 파일만 수정

**Phase 3 — VERIFY (Steps 6-8, QA 에이전트 스폰):**
- Step 6: 정렬 리뷰 — 구현이 계획과 일치하는지?
- Step 7: 보안/버그 리뷰 — OWASP, npm audit, Stripe 보안 모범 사례
- Step 8: 개선/회귀 리뷰 — 도입된 회귀 없음
- VERIFY_GATE: CRITICAL 0건, HIGH 0건, Quality Score >= 75

**Phase 4 — REFINE (Steps 9-13, Debug 에이전트 스폰):**
- Step 9: 대용량 파일(> 500줄)과 함수(> 50줄) 분할
- Step 10: 통합/재사용 리뷰 — 중복 로직 제거
- Step 11: 부작용 리뷰 — `find_referencing_symbols`로 연쇄 영향 추적
- Step 12: 전체 변경 리뷰 — 네이밍 일관성, 스타일 정렬
- Step 13: 데드 코드 정리
- REFINE_GATE: Quality Score 비회귀, 코드 정리

**Phase 5 — SHIP (Steps 14-17, QA 에이전트 스폰):**
- Step 14: 코드 품질 리뷰 — lint, 타입, 커버리지
- Step 15: UX 플로우 검증 — 엔드투엔드 결제 사용자 여정
- Step 16: 관련 이슈 리뷰 — 최종 연쇄 영향 검사
- Step 17: 배포 준비 — 시크릿 관리, 마이그레이션 스크립트, 롤백 계획
- SHIP_GATE: 모든 검사 통과, 사용자 최종 승인

---

## 모든 15개 워크플로우 명령

| 명령 | 유형 | 기능 | 사용 시기 |
|---------|------|-------------|-------------|
| `/orchestrate` | 영구 | 자동화된 병렬 에이전트 실행, 모니터링, 검증 루프 | 최대 병렬성이 필요한 대규모 프로젝트 |
| `/work` | 영구 | 각 게이트에서 사용자 승인이 포함된 단계별 멀티 도메인 조율 | 제어가 필요한 멀티 에이전트 기능 |
| `/ultrawork` | 영구 | 5단계, 17스텝 품질 워크플로우, 11개 리뷰 체크포인트 | 최대 품질 제공, 프로덕션 크리티컬 코드 |
| `/plan` | 비영구 | PM 주도 태스크 분해와 API 컨트랙트 정의 | 복잡한 멀티 에이전트 작업 전 |
| `/exec-plan` | 비영구 | 리포지토리 아티팩트로 실행 계획 생성 및 추적 | 추적 진행과 결정 로그가 필요한 복잡한 기능 |
| `/brainstorm` | 비영구 | 2-3가지 접근 방식 제안이 포함된 디자인 우선 아이디어 탐색 | 구현 접근 방식 확정 전 |
| `/deepinit` | 비영구 | 전체 프로젝트 초기화 — AGENTS.md, ARCHITECTURE.md, docs/ | 기존 코드베이스에 oh-my-agent 설정 |
| `/review` | 비영구 | QA 파이프라인: OWASP 보안, 성능, 접근성, 코드 품질 | 코드 머지 전, 배포 전 리뷰 |
| `/debug` | 비영구 | 구조화된 디버깅: 재현, 진단, 수정, 회귀 테스트, 스캔 | 버그와 에러 조사 |
| `/design` | 비영구 | 토큰이 포함된 DESIGN.md를 생성하는 7단계 디자인 워크플로우 | 디자인 시스템, 랜딩 페이지, UI 재설계 |
| `/scm` | 비영구 | 브랜치/머지/충돌/워크트리/베이스라인을 다루는 SCM Git 워크플로 + 자동 type/scope 감지와 기능 분할이 포함된 Conventional Commit | 코드 변경 완료 후 또는 저장소 형상관리 작업 시 |
| `/tools` | 비영구 | MCP 도구 가시성 관리 (그룹 활성화/비활성화) | 에이전트가 사용할 수 있는 MCP 도구 제어 |
| `/stack-set` | 비영구 | 프로젝트 기술 스택 자동 감지 및 백엔드 레퍼런스 생성 | 언어별 코딩 규칙 설정 |
| `/ralph` | 영구 | ultrawork를 감싸는 자기 참조 완료 루프와 독립 심판 | 검증 가능한 기준이 통과할 때까지 에이전트가 계속 작업해야 할 때 |

---

## 자동 감지 예제

oh-my-agent는 11개 언어에서 워크플로우 키워드를 감지합니다. 자연어가 워크플로우를 트리거하는 예제:

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

## 14개 스킬 — 빠른 참조

| 스킬 | 적합한 용도 | 주요 출력 |
|-------|---------|---------------|
| **oma-brainstorm** | "아이디어가 있어", 접근 방식 탐색 | `docs/plans/`의 설계 문서 |
| **oma-pm** | "이거 계획해줘", 태스크 분해 | `.agents/results/plan-{sessionId}.json`, `task-board.md` |
| **oma-frontend** | UI 컴포넌트, 폼, 페이지, 스타일링 | React/TypeScript 컴포넌트, Vitest 테스트 |
| **oma-backend** | API, 인증, 서버 로직, 마이그레이션 | 엔드포인트, 모델, 서비스, 테스트 |
| **oma-db** | 스키마 설계, ERD, 쿼리 튜닝, 용량 계획 | 스키마 문서, 마이그레이션 스크립트, 용어집 |
| **oma-mobile** | 모바일 앱, 플랫폼 기능 | Flutter 화면, 상태 관리, 테스트 |
| **oma-design** | 디자인 시스템, 랜딩 페이지, 토큰 | `DESIGN.md`, CSS/Tailwind 토큰, 컴포넌트 사양 |
| **oma-qa** | 보안 감사, 성능, 접근성 | CRITICAL/HIGH/MEDIUM/LOW 발견 사항이 포함된 QA 보고서 |
| **oma-debug** | 버그 조사, 근본 원인 분석 | 수정된 코드 + 회귀 테스트 + 유사 패턴 수정 |
| **oma-tf-infra** | 클라우드 인프라 프로비저닝 | Terraform 모듈, IAM 정책, 비용 추정 |
| **oma-dev-workflow** | CI/CD, 모노레포 태스크, 릴리스 자동화 | mise.toml 설정, 파이프라인 정의 |
| **oma-translator** | 다국어 콘텐츠, i18n 파일 | 톤과 레지스터를 유지하는 번역 텍스트 |
| **oma-orchestrator** | 자동화된 병렬 에이전트 실행 | 여러 에이전트의 오케스트레이션 결과 |
| **oma-scm** | Git 커밋 | 적절한 type/scope의 Conventional Commits |

---

## 대시보드 설정

### 터미널 대시보드

```bash
oma dashboard
```

터미널에서 실시간 업데이트 테이블 표시:
- 세션 ID와 전체 상태 (RUNNING / COMPLETED / FAILED)
- 에이전트별 행: 상태, 턴 수, 최근 활동, 경과 시간
- `.serena/memories/`를 감시하여 실시간 진행 업데이트

### 웹 대시보드

```bash
oma dashboard:web
# http://localhost:9847 열림
```

기능:
- WebSocket을 통한 실시간 업데이트 (수동 새로고침 불필요)
- 연결 끊김 시 자동 재연결
- 에이전트 상태를 색상으로 구분하는 세션 표시 (초록=완료, 노랑=실행 중, 빨강=실패)
- 진행 및 결과 파일에서의 활동 로그 스트리밍
- 과거 세션 데이터

### 권장 레이아웃

3개 터미널 사용:
1. **대시보드 터미널:** `oma dashboard` — 지속적 모니터링
2. **명령 터미널:** 에이전트 스폰 명령, 워크플로우 명령
3. **빌드 터미널:** 테스트 실행, 빌드 로그, git 작업

---

## 핵심 개념 설명

### 점진적 공개

스킬은 토큰을 절약하기 위해 2계층으로 로딩됩니다. Layer 1 (SKILL.md, ~800바이트)은 항상 존재합니다. Layer 2 (resources/)는 에이전트가 작업할 때만, 태스크 난이도에 맞는 리소스만 로딩됩니다. 이를 통해 모든 것을 미리 로딩하는 것 대비 약 75%의 토큰을 절약합니다. Flash 티어 모델(128K 컨텍스트)에서 108K가 아닌 약 125K 토큰을 실제 작업에 활용할 수 있습니다.

### 토큰 최적화

점진적 공개 외에도 oh-my-agent는 다음을 통해 토큰을 최적화합니다:
- **컨텍스트 예산 관리** — 전체 파일 읽기 없음; `read_file` 대신 `find_symbol` 사용
- **지연 리소스 로딩** — 에러 플레이북은 에러 시에만, 체크리스트는 검증 시에만 로딩
- **난이도 기반 분기** — Simple 태스크는 분석을 건너뛰고 최소 체크리스트 사용
- **진행 추적** — 에이전트가 읽은 파일을 기록하여 재읽기 방지

### CLI 스폰

`oma agent:spawn`을 실행하면 CLI가:
1. 벤더를 해석 (5단계 우선순위 사용)
2. `.agents/skills/_shared/runtime/execution-protocols/{vendor}.md`에서 벤더별 실행 프로토콜 주입
3. SKILL.md 핵심 규칙, 실행 프로토콜, 태스크 관련 리소스를 사용하여 에이전트 프롬프트 구성
4. 독립 CLI 프로세스로 에이전트 스폰
5. 에이전트가 `.serena/memories/progress-{agent}.md`에 진행 상황 기록
6. 완료 시 `.serena/memories/result-{agent}.md`에 최종 결과 기록

### Serena 메모리

에이전트는 `.serena/memories/`의 공유 메모리 파일을 통해 조율됩니다. 오케스트레이터가 `orchestrator-session.md`(세션 상태)와 `task-board.md`(태스크 할당)를 작성합니다. 각 에이전트는 자체 `progress-{agent}.md`(턴별 업데이트)와 `result-{agent}.md`(최종 출력)를 작성합니다. 메모리 도구는 설정 가능합니다 — 기본값은 Serena MCP의 `read_memory`, `write_memory`, `edit_memory`입니다.

### 워크스페이스

`agent:spawn`의 `-w` 플래그는 에이전트를 특정 디렉토리로 격리합니다. 이는 병렬 실행에서 매우 중요합니다 — 워크스페이스 격리 없이 두 에이전트가 동시에 같은 파일을 수정하여 충돌이 발생할 수 있습니다. 표준 워크스페이스 레이아웃: `./apps/api` (backend), `./apps/web` (frontend), `./apps/mobile` (mobile).

---

## 팁

1. **프롬프트를 구체적으로 작성하세요.** "JWT 인증, React 프론트엔드, Express 백엔드, PostgreSQL이 포함된 TODO 앱을 만들어줘"가 "앱을 만들어줘"보다 더 좋은 결과를 냅니다.

2. **병렬 에이전트에는 워크스페이스를 사용하세요.** 동시 실행 에이전트 간 파일 충돌을 방지하기 위해 항상 `-w ./path`를 전달하세요.

3. **구현 에이전트 스폰 전에 API 컨트랙트를 확정하세요.** 프론트엔드와 백엔드 에이전트가 엔드포인트 형태에 합의하도록 먼저 `/plan`을 실행하세요.

4. **적극적으로 모니터링하세요.** 모든 에이전트가 끝난 뒤에 문제를 발견하기보다, 대시보드 터미널을 열어 두고 실패하는 에이전트를 조기에 잡으세요.

5. **재스폰으로 반복하세요.** 에이전트 출력이 적절하지 않으면 원래 태스크에 수정 컨텍스트를 추가하여 재스폰하세요. 처음부터 다시 시작하지 마세요.

6. **불확실하면 `/work`로 시작하세요.** 각 게이트에서 사용자 확인과 함께 단계별 안내를 제공합니다.

7. **모호한 아이디어에는 `/plan` 전에 `/brainstorm`을 사용하세요.** 브레인스토밍이 PM 에이전트가 태스크로 분해하기 전에 의도와 접근 방식을 명확히 합니다.

8. **새 코드베이스에서 `/deepinit`을 실행하세요.** 모든 에이전트가 프로젝트 구조를 이해하는 데 도움되는 AGENTS.md와 ARCHITECTURE.md를 생성합니다.

9. **에이전트-CLI 매핑을 설정하세요.** 복잡한 추론 태스크(qa, debug, frontend)는 Claude로, 빠른 생성 태스크(backend, pm)는 Gemini로 라우팅하세요.

10. **프로덕션 크리티컬 코드에는 `/ultrawork`를 사용하세요.** 5단계, 11개 리뷰 스텝 워크플로우가 더 간단한 워크플로우에서 놓칠 수 있는 이슈를 잡아냅니다.

---

## 문제 해결

| 문제 | 원인 | 해결 방법 |
|---------|-------|-----|
| IDE에서 스킬이 감지되지 않음 | `.agents/skills/`가 누락되었거나 `SKILL.md` 파일이 없음 | 설치 프로그램 실행(`bunx oh-my-agent@latest`), `.claude/skills/`의 심볼릭 링크 확인, IDE 재시작 |
| 스폰 시 CLI를 찾을 수 없음 | AI CLI가 전역으로 설치되지 않음 | `which gemini` / `which claude` — 설치 가이드에 따라 누락된 CLI 설치 |
| 에이전트가 충돌하는 코드 생성 | 워크스페이스 격리 없음 | 별도 워크스페이스 사용: `-w ./apps/api`, `-w ./apps/web` |
| 대시보드에 "No agents detected" 표시 | 에이전트가 아직 메모리에 쓰지 않음 | 에이전트 시작 대기(첫 번째 쓰기는 턴 1), 또는 세션 ID가 일치하는지 확인 |
| 웹 대시보드가 시작되지 않음 | 의존성 미설치 | 먼저 web/ 디렉토리에서 `bun install` 실행 |
| QA 보고서에 50개 이상 이슈 | 대규모 코드베이스의 첫 리뷰에서는 정상 | CRITICAL과 HIGH 심각도에 집중. MEDIUM/LOW는 향후 스프린트를 위해 문서화. |
| 자동 감지가 잘못된 워크플로우 트리거 | 키워드 모호성 | 자연어 대신 명시적 `/command` 사용. 오탐 보고. |
| 영구 워크플로우가 중단되지 않음 | 상태 파일이 여전히 존재 | 채팅에서 "workflow done"이라고 말하거나 `.agents/state/`에서 상태 파일 수동 삭제 |
| 에이전트가 HIGH 명확화로 차단됨 | 요구사항이 너무 모호 | 에이전트가 요청한 구체적인 답변 제공 후 재실행 |
| MCP 도구가 작동하지 않음 | Serena가 설정되지 않았거나 실행 중이지 않음 | `oma doctor`로 MCP 설정 확인 |
| 에이전트가 턴 제한 초과 | 태스크가 기본 턴에 비해 너무 복잡 | `-t 30` 플래그로 턴 증가, 또는 더 작은 태스크로 분해 |
| 에이전트에 잘못된 CLI 사용 | agent_cli_mapping 미설정 | `oma install`로 설정, 또는 `oma-config.yaml` 직접 편집 |

---

단일 도메인 태스크 패턴은 [단일 스킬 가이드](./single-skill)를 참조하세요.
프로젝트 통합 세부사항은 [통합 가이드](./integration)를 참조하세요.
