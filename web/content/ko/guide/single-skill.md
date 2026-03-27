---
title: "가이드: 단일 스킬 실행"
description: oh-my-agent의 단일 도메인 태스크에 대한 상세 가이드 — 사용 시점, 사전검증 체크리스트, 설명이 포함된 프롬프트 템플릿, 프론트엔드/백엔드/모바일/데이터베이스 태스크의 실제 예제, 예상 실행 흐름, 품질 게이트 체크리스트, 에스컬레이션 신호.
---

# 단일 스킬 실행

단일 스킬 실행은 가장 빠른 방법입니다. 에이전트 하나, 도메인 하나, 집중할 태스크 하나. 오케스트레이션 오버헤드도, 멀티 에이전트 조율도 없습니다. 자연어 프롬프트를 입력하면 스킬이 자동으로 활성화됩니다.

---

## 단일 스킬을 사용할 때

다음 기준을 모두 충족할 때 사용합니다:

- **하나의 도메인이 소유** — 태스크 전체가 프론트엔드, 백엔드, 모바일, 데이터베이스, 디자인, 인프라 또는 다른 단일 도메인에 속함
- **독립적** — 크로스 도메인 API 컨트랙트 변경이 없고, 프론트엔드 태스크를 위해 백엔드를 변경할 필요 없음
- **명확한 범위** — 출력물이 무엇인지 알고 있음 (컴포넌트, 엔드포인트, 스키마, 수정)
- **조율 불필요** — 다른 에이전트가 전후로 실행될 필요 없음

**단일 스킬 태스크 예시:**
- UI 컴포넌트 하나 구축
- API 엔드포인트 하나 추가
- 하나의 레이어에서 버그 하나 수정
- 데이터베이스 테이블 하나 설계
- Terraform 모듈 하나 작성
- i18n 문자열 세트 하나 번역
- 디자인 시스템 섹션 하나 생성

**다음의 경우 멀티 에이전트로 전환** (`/coordinate` 또는 `/orchestrate`):
- UI 작업에 새로운 API 컨트랙트가 필요한 경우 (프론트엔드 + 백엔드)
- 하나의 수정이 여러 레이어에 걸쳐 연쇄되는 경우 (디버그 + 구현 에이전트)
- 기능이 프론트엔드, 백엔드, 데이터베이스에 걸쳐 있는 경우
- 첫 번째 반복 후 범위가 하나의 도메인을 넘어 확장되는 경우

---

## 사전검증 체크리스트

프롬프트를 작성하기 전에 다음 네 가지 질문에 답해 보세요 ([프롬프트 구조](/core-concepts/skills)의 네 가지 요소에 해당합니다):

| 요소 | 질문 | 중요한 이유 |
|------|------|------------|
| **목표** | 어떤 구체적인 산출물을 만들거나 변경해야 하는가? | 모호성 방지 — "버튼 추가" vs "유효성 검사가 있는 폼 추가" |
| **컨텍스트** | 어떤 스택, 프레임워크, 규칙이 적용되는가? | 에이전트가 프로젝트 파일에서 감지하지만, 명시적인 것이 더 좋음 |
| **제약 조건** | 어떤 규칙을 따라야 하는가? (스타일, 보안, 성능, 호환성) | 제약 조건 없이 에이전트는 프로젝트와 맞지 않을 수 있는 기본값을 사용함 |
| **완료 기준** | 어떤 인수 기준을 확인할 것인가? | 에이전트에게 목표를 제공하고 사용자에게 검증 체크리스트를 제공함 |

프롬프트에 요소가 누락된 경우 에이전트는 다음 중 하나를 수행합니다:
- **LOW 불확실성:** 기본값을 적용하고 가정을 나열
- **MEDIUM 불확실성:** 2-3개 옵션을 제시하고 가장 가능성 높은 것으로 진행
- **HIGH 불확실성:** 차단하고 질문 (코드를 작성하지 않음)

---

## 프롬프트 템플릿

```text
Build <specific artifact> using <stack/framework>.
Constraints: <style, performance, security, or compatibility constraints>.
Acceptance criteria:
1) <testable criterion>
2) <testable criterion>
3) <testable criterion>
Add tests for: <critical test cases>.
```

### 템플릿 분석

| 부분 | 목적 | 예시 |
|------|------|------|
| `Build <specific artifact>` | 목표 — 무엇을 만들 것인가 | "Build a user registration form component" |
| `using <stack/framework>` | 컨텍스트 — 기술 스택 | "using React + TypeScript + Tailwind CSS" |
| `Constraints:` | 에이전트가 따라야 할 규칙 | "accessible labels, no external form libraries, client-side validation only" |
| `Acceptance criteria:` | 완료 기준 — 검증 가능한 결과 | "1) email format validation 2) password strength indicator 3) submit disabled while invalid" |
| `Add tests for:` | 테스트 요구사항 | "valid/invalid submit paths, edge cases for email validation" |

---

## 실제 예제

### 프론트엔드: 로그인 폼

```text
Create a login form component in React + TypeScript + Tailwind CSS.
Constraints: accessible labels, client-side validation with Zod, no external form library beyond @tanstack/react-form, shadcn/ui Button and Input components.
Acceptance criteria:
1) Email validation with meaningful error messages
2) Password minimum 8 characters with feedback
3) Disabled submit button while form is invalid
4) Keyboard and screen-reader friendly (ARIA labels, focus management)
5) Loading state while submitting
Add unit tests for: valid submission path, invalid email, short password, loading state.
```

**예상 실행 흐름:**

1. **스킬 활성화:** `oma-frontend` 활성화 (키워드: "form", "component", "Tailwind CSS", "React")
2. **난이도 평가:** 중간 (2-3개 파일, 유효성 검사 UX에 대한 일부 설계 결정)
3. **로드된 리소스:**
   - `execution-protocol.md` (항상)
   - `snippets.md` (폼 + Zod 패턴)
   - `component-template.tsx` (React 구조)
4. **CHARTER_CHECK 출력:**
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: frontend
   - Must NOT do: backend API, database, mobile screens
   - Success criteria: form validation, accessibility, loading state, tests
   - Assumptions: Next.js App Router, @tanstack/react-form + Zod, shadcn/ui, FSD-lite architecture
   ```
5. **구현:**
   - `src/features/auth/components/login-form.tsx` 생성 (`"use client"`를 포함한 Client Component)
   - `src/features/auth/utils/login-schema.ts` 생성 (Zod 스키마)
   - `src/features/auth/components/skeleton/login-form-skeleton.tsx` 생성
   - shadcn/ui `<Button>`, `<Input>`, `<Label>` 사용 (읽기 전용, 수정 없음)
   - `@tanstack/react-form`으로 Zod 유효성 검사와 함께 폼 처리
   - `@/`를 사용한 절대 임포트
   - 파일당 하나의 컴포넌트
6. **검증:**
   - 체크리스트: ARIA 라벨 존재, 시맨틱 헤딩, 키보드 내비게이션 작동
   - 모바일: 320px 뷰포트에서 올바르게 렌더링
   - 성능: CLS 없음
   - 테스트: `src/features/auth/utils/__tests__/login-schema.test.ts`에 Vitest 테스트 파일

---

### 백엔드: REST API 엔드포인트

```text
Add a paginated GET /api/tasks endpoint that returns tasks for the authenticated user.
Constraints: Repository-Service-Router pattern, parameterized queries, JWT auth required, cursor-based pagination.
Acceptance criteria:
1) Returns only tasks owned by the authenticated user
2) Cursor-based pagination with next/prev cursors
3) Filterable by status (todo, in_progress, done)
4) Response includes total count
Add tests for: auth required, pagination, status filter, empty results.
```

**예상 실행 흐름:**

1. **스킬 활성화:** `oma-backend` 활성화 (키워드: "API", "endpoint", "REST")
2. **스택 감지:** `pyproject.toml` 또는 `package.json`을 읽어 언어/프레임워크를 판단. `stack/`이 존재하면 거기서 규칙을 로드.
3. **난이도 평가:** 중간 (2-3개 파일: 라우트, 서비스, 리포지토리, 테스트 포함)
4. **로드된 리소스:**
   - `execution-protocol.md` (항상)
   - `stack/snippets.md` 가용 시 (라우트, 페이지네이션 쿼리 패턴)
   - `stack/tech-stack.md` 가용 시 (프레임워크별 API)
5. **CHARTER_CHECK:**
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: backend
   - Must NOT do: frontend UI, mobile screens, database schema changes
   - Success criteria: authenticated endpoint, cursor pagination, status filter, tests
   - Assumptions: existing JWT auth middleware, PostgreSQL, existing Task model
   ```
6. **구현:**
   - 리포지토리: `TaskRepository.find_by_user(user_id, cursor, status, limit)` 매개변수화된 쿼리 사용
   - 서비스: `TaskService.get_user_tasks(user_id, cursor, status, limit)` — 비즈니스 로직 래퍼
   - 라우터: `GET /api/tasks` JWT 인증 미들웨어, 입력 유효성 검사, 응답 포맷팅
   - 테스트: 인증 필요 시 401 반환, 페이지네이션이 올바른 커서 반환, 필터 작동, 빈 결과는 빈 배열로 200 반환

---

### 모바일: 설정 화면

```text
Build a settings screen in Flutter with profile editing (name, email, avatar), notification preferences (toggle switches), and a logout button.
Constraints: Riverpod for state management, GoRouter for navigation, Material Design 3, handle offline gracefully.
Acceptance criteria:
1) Profile fields pre-populated from user data
2) Changes saved on submit with loading indicator
3) Notification toggles persist locally (SharedPreferences)
4) Logout clears token storage and navigates to login
5) Offline: show cached data with "offline" banner
Add tests for: profile save, logout flow, offline state.
```

**예상 실행 흐름:**

1. **스킬 활성화:** `oma-mobile` 활성화 (키워드: "Flutter", "screen", "mobile")
2. **난이도 평가:** 중간 (설정 화면 + 상태 관리 + 오프라인 처리)
3. **로드된 리소스:**
   - `execution-protocol.md`
   - `snippets.md` (화면 템플릿, Riverpod 프로바이더 패턴)
   - `screen-template.dart`
4. **CHARTER_CHECK:**
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: mobile
   - Must NOT do: backend API changes, web frontend, database schema
   - Success criteria: profile editing, notification toggles, logout, offline
   - Assumptions: existing auth service, Dio interceptors, Riverpod, GoRouter
   ```
5. **구현:**
   - 화면: `lib/features/settings/presentation/settings_screen.dart` (Riverpod을 사용한 Stateless Widget)
   - 프로바이더: `lib/features/settings/providers/settings_provider.dart`
   - 리포지토리: `lib/features/settings/data/settings_repository.dart`
   - 오프라인 처리: Dio 인터셉터가 `SocketException`을 캐치하고 캐시된 데이터로 폴백
   - 모든 컨트롤러는 `dispose()` 메서드에서 해제

---

### 데이터베이스: 스키마 설계

```text
Design a database schema for a multi-tenant SaaS project management tool. Entities: Organization, Project, Task, User, TeamMembership.
Constraints: PostgreSQL, 3NF, soft delete with deleted_at, audit fields (created_at, updated_at, created_by), row-level security for tenant isolation.
Acceptance criteria:
1) ERD with all relationships documented
2) External, conceptual, and internal schema layers documented
3) Index strategy for common query patterns (tasks by project, tasks by assignee)
4) Capacity estimation for 10K orgs, 100K users, 1M tasks
5) Backup strategy with full + incremental cadence
Add deliverables: data standards table, glossary, migration script.
```

**예상 실행 흐름:**

1. **스킬 활성화:** `oma-db` 활성화 (키워드: "database", "schema", "ERD", "migration")
2. **난이도 평가:** 복잡 (아키텍처 결정, 여러 엔터티, 용량 계획)
3. **로드된 리소스:**
   - `execution-protocol.md`
   - `document-templates.md` (산출물 구조)
   - `examples.md`
   - `anti-patterns.md` (최적화 시 검토)
4. **CHARTER_CHECK:**
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: database
   - Must NOT do: API implementation, frontend UI, infrastructure
   - Success criteria: schema, ERD, indexes, capacity estimate, backup strategy
   - Assumptions: PostgreSQL, 3NF, soft delete, multi-tenant with RLS
   ```
5. **워크플로우:** 탐색 (엔터티, 관계, 접근 패턴, 볼륨 추정) -> 설계 (외부/개념/내부 스키마, 제약 조건, 라이프사이클 필드) -> 최적화 (쿼리 패턴용 인덱스, 파티셔닝 전략, 백업 계획, 안티패턴 검토)
6. **산출물:**
   - 외부 스키마 요약 (역할별 뷰: 관리자, 프로젝트 매니저, 팀 멤버)
   - ERD가 포함된 개념 스키마 (Organization 1:N Project, Project 1:N Task, Organization 1:N TeamMembership 등)
   - 물리적 DDL, 인덱스, 파티셔닝이 포함된 내부 스키마
   - 데이터 표준 테이블 (필드 명명 규칙, 타입 규칙)
   - 용어집 (tenant, workspace, assignee 등)
   - 용량 추정 시트
   - 백업 전략 (매일 전체 + 매시간 증분, 30일 보존)
   - 마이그레이션 스크립트

---

## 품질 게이트 체크리스트

에이전트가 결과물을 전달한 후 수락하기 전에 다음 항목을 확인합니다:

### 범용 확인사항 (모든 에이전트)

- [ ] **동작이 인수 기준과 일치** — 프롬프트의 모든 기준이 충족됨
- [ ] **테스트가 정상 경로와 주요 엣지 케이스를 커버** — 정상 경로만이 아님
- [ ] **관련 없는 파일 변경 없음** — 태스크에 관련된 파일만 수정됨
- [ ] **공유 모듈이 깨지지 않음** — 다른 코드가 사용하는 임포트, 타입, 인터페이스가 여전히 작동
- [ ] **차터가 준수됨** — "Must NOT do" 제약 조건이 존중됨
- [ ] **린트, 타입체크, 빌드 통과** — 프로젝트의 표준 검사를 실행

### 프론트엔드 전용

- [ ] 접근성: 인터랙티브 요소에 `aria-label` 존재, 시맨틱 헤딩, 키보드 내비게이션 작동
- [ ] 모바일: 320px, 768px, 1024px, 1440px 브레이크포인트에서 올바르게 렌더링
- [ ] 성능: CLS 없음, FCP 목표 달성
- [ ] 에러 바운더리 및 로딩 스켈레톤 구현됨
- [ ] shadcn/ui 컴포넌트를 직접 수정하지 않음 (래퍼 사용)
- [ ] `@/`를 사용한 절대 임포트 (상대 경로 `../../` 없음)

### 백엔드 전용

- [ ] 클린 아키텍처 유지: 라우트 핸들러에 비즈니스 로직 없음
- [ ] 모든 입력이 유효성 검사됨 (사용자 입력을 신뢰하지 않음)
- [ ] 매개변수화된 쿼리만 사용 (SQL에 문자열 보간 없음)
- [ ] 중앙화된 오류 모듈을 통한 커스텀 예외 (원시 HTTP 예외 없음)
- [ ] 인증 엔드포인트에 속도 제한 적용

### 모바일 전용

- [ ] 모든 컨트롤러가 `dispose()` 메서드에서 해제됨
- [ ] 오프라인 상황이 매끄럽게 처리됨
- [ ] 60fps 목표 유지 (끊김 없음)
- [ ] iOS와 Android 모두에서 테스트됨

### 데이터베이스 전용

- [ ] 최소 3NF (또는 비정규화에 대한 문서화된 근거)
- [ ] 세 가지 스키마 레이어 모두 문서화됨 (외부, 개념, 내부)
- [ ] 무결성 제약 조건이 명시적 (엔터티, 도메인, 참조, 비즈니스 규칙)
- [ ] 안티패턴 검토 완료

---

## 에스컬레이션 신호

단일 스킬에서 멀티 에이전트 실행으로 전환해야 함을 나타내는 신호를 주시하세요:

| 신호 | 의미 | 조치 |
|------|------|------|
| 에이전트가 "백엔드 변경이 필요하다"고 말함 | 태스크에 크로스 도메인 의존성이 있음 | `/coordinate`로 전환 — 백엔드 에이전트 추가 |
| 에이전트의 CHARTER_CHECK에 실제로 필요한 "Must NOT do" 항목이 있음 | 범위가 하나의 도메인을 초과 | 먼저 `/plan`으로 전체 기능을 계획 |
| 수정이 다른 레이어의 3개 이상 파일로 연쇄됨 | 하나의 수정이 여러 도메인에 영향 | 더 넓은 범위의 `/debug` 사용 또는 `/coordinate` |
| 에이전트가 API 컨트랙트 불일치를 발견 | 프론트엔드/백엔드 불일치 | `/plan`으로 컨트랙트를 정의한 후 두 에이전트를 재생성 |
| 통합 지점에서 품질 게이트 실패 | 컴포넌트가 제대로 연결되지 않음 | QA 리뷰 단계 추가: `oma agent:spawn qa "Review integration"` |
| 태스크가 "컴포넌트 하나"에서 "컴포넌트 세 개 + 새 라우트 + API"로 성장 | 실행 중 범위 확대 | 중단, `/plan`으로 분해 후 `/orchestrate` |
| 에이전트가 HIGH 명확화로 차단됨 | 요구사항이 근본적으로 모호함 | 에이전트의 질문에 답변하거나 `/brainstorm`으로 접근 방식을 명확히 |

### 일반 원칙

같은 에이전트를 수정 사항을 덧붙여가며 두 번 넘게 재생성하고 있다면, 해당 태스크는 멀티 도메인일 가능성이 높으며 `/coordinate`나 최소한 `/plan` 단계로 적절히 분해해야 합니다.
