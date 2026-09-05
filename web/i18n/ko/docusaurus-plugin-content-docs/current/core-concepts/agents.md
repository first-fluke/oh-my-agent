---
title: 에이전트
description: oh-my-agent 21개 에이전트의 완전한 레퍼런스입니다. 도메인, 기술 스택, 리소스 파일, 기능, Charter Preflight 프로토콜, 2계층 스킬 로딩, 범위 제한 실행 규칙, 품질 게이트, 워크스페이스 전략, 오케스트레이션 흐름, 런타임 메모리를 다룹니다.
---

# 에이전트

oh-my-agent의 에이전트는 전문화된 엔지니어링 역할입니다. 각 에이전트는 정의된 도메인, 기술 스택 지식, 리소스 파일, 품질 게이트, 실행 제약을 갖춥니다. 에이전트는 범용 챗봇이 아니라, 자신의 영역 안에서 체계적인 프로토콜을 따르는 범위가 한정된 작업자입니다.

`.agents/agents/` 아래의 에이전트 정의가 원본입니다. OMA는 커스텀 서브에이전트를 지원하는 런타임을 위해 이 정의를 벤더 네이티브 파일로 투사합니다.

- `.claude/agents/*.md`
- `.codex/agents/*.toml`
- `.gemini/agents/*.md`

워크플로우가 어떤 에이전트를 현재 런타임과 같은 벤더로 매핑하면, 그 런타임의 네이티브 에이전트 파일을 먼저 써야 합니다. 다른 벤더로 가는 태스크는 `oma agent spawn`으로 폴백합니다.

> **에이전트별 모델 디스패치:** 각 에이전트는 `.agents/oma-config.yaml`의 `model_preset`(그리고 선택적인 `agents:` 오버라이드)을 통해 특정 모델 슬러그, CLI 벤더, 추론 강도로 해석됩니다. 설정 방법은 [에이전트별 모델](../guide/per-agent-models.md)을, 실제 매트릭스 확인은 [`oma doctor --profile`](../cli-interfaces/commands.md#doctor)을 참고하세요.

---

## 에이전트 카테고리

| 카테고리 | 에이전트 | 책임 |
|----------|--------|---------------|
| **아이디에이션** | oma-brainstorm | 아이디어 탐색, 접근 방식 제안, 설계 문서 작성 |
| **아키텍처** | oma-architecture | 시스템/모듈/서비스 경계, ADR/ATAM/CBAM 방식의 분석, 트레이드오프 기록 |
| **기획** | oma-pm | 요구사항 분해, 태스크 분해, API 컨트랙트, 우선순위 할당 |
| **구현** | oma-frontend, oma-backend, oma-mobile, oma-db | 각 도메인에서 프로덕션 코드 작성 |
| **디자인** | oma-design | 디자인 시스템, DESIGN.md, 토큰, 타이포그래피, 컬러, 모션, 접근성 |
| **인프라** | oma-tf-infra | 멀티 클라우드 Terraform 프로비저닝, IAM, 비용 최적화, Policy-as-code |
| **DevOps** | oma-dev-workflow | mise task runner, CI/CD, 마이그레이션, 릴리스 조율, 모노레포 자동화 |
| **관측성** | oma-observability | 관측성 파이프라인, 추적 라우팅, MELT+P 시그널(metrics/logs/traces/profiles/cost/audit/privacy), SLO 관리, 인시던트 포렌식, 전송 계층 튜닝 |
| **품질** | oma-qa | 보안 감사 (OWASP), 성능, 접근성 (WCAG), 코드 품질 리뷰 |
| **디버깅** | oma-debug | 버그 재현, 근본 원인 분석, 최소 수정, 회귀 테스트 |
| **현지화** | oma-translation | 톤, 레지스터, 도메인 용어를 유지하는 컨텍스트 인식 번역 |
| **조율** | oma-orchestration, oma-coordination | 자동화 및 수동 멀티 에이전트 오케스트레이션 |
| **Git** | oma-scm | Conventional Commits 생성, 기능별 커밋 분할 |
| **검색 및 탐색** | oma-search | 신뢰도 점수가 있는 의도 기반 검색 라우터 (Context7 문서, 웹, `gh`/`glab` 코드, Serena 로컬) |
| **회고** | oma-recap | 크로스 도구 대화 이력 분석 및 주제별 작업 요약 |
| **문서 처리** | oma-hwp, oma-pdf | LLM/RAG 수집을 위한 HWP/HWPX/HWPML 및 PDF → Markdown 변환 |
| **문서화** | oma-docs | 문서 드리프트 탐지 (깨진 참조 검증, diff 영향 문서에 대한 동기화 패치 제안) |
| **학술 글쓰기** | oma-academic-writing, oma-scholar | 출판 수준 학술 산문 작성과 감사, Knows 사이드카 기반 학술 연구·검색·동료 검토 |
| **보안** | oma-deepsec | Vercel의 deepsec 에이전트 기반 취약점 스캐너를 비용을 의식하며 운용 (스캔, PR 게이트, 매처, 트리아지) |
| **리팩터링** | oma-refactor | 동작을 보존하는 점진적 구조 개선. 핫스팟 타기팅, 특성화 테스트 안전망, 리팩터링만 담는 커밋 |
| **시장 조사** | oma-market | 커뮤니티 신호 기반 페인·트렌드·경쟁·발견 조사. 의도에 따라 SWOT / Porter's 5F / PESTEL 자동 선택 |
| **스킬 작성** | oma-skill-creation | SSL-lite 형식으로 OMA 스킬을 만들고 검증 |
| **미디어 생성** | oma-image, oma-slide, oma-video, oma-voice | AI 이미지 생성, HTML 발표 덱, 숏폼·설명·데모 영상, 로컬 TTS/STT |

---

## 상세 에이전트 레퍼런스

### oma-brainstorm

**도메인:** 기획이나 구현 전의 디자인 우선 아이디어 탐색.

**사용 시기:** 새로운 기능 아이디어를 탐색하거나, 사용자 의도를 이해하거나, 접근 방식을 비교할 때. 복잡하거나 모호한 요청에 대해 `/plan` 전에 사용합니다.

**사용하지 말아야 할 때:** 명확한 요구사항(oma-pm으로), 구현(도메인 에이전트로), 코드 리뷰(oma-qa로).

**핵심 규칙:**
- 설계 승인 전 구현이나 기획 금지
- 한 번에 하나의 명확화 질문 (묶음 질문 금지)
- 항상 추천 옵션과 함께 2-3가지 접근 방식 제안
- 각 단계에서 사용자 확인과 함께 섹션별 설계
- YAGNI: 필요한 것만 설계

**워크플로우:** 6단계: 컨텍스트 탐색, 질문, 접근 방식, 설계, 문서화(`docs/plans/`에 저장), `/plan`으로 전환.

**리소스:** 공유 리소스만 사용 (clarification-protocol, quality-principles, skill-routing).

---

### oma-architecture

**도메인:** 소프트웨어/시스템 아키텍처 (모듈·서비스 경계, 트레이드오프 분석, 이해관계자 종합, 의사결정 기록).

**사용 시기:** 시스템 아키텍처 선택 또는 검토, 모듈/서비스/오너십 경계 정의, 명시적 트레이드오프와 함께 아키텍처 대안 비교, 아키텍처적 문제(변경 증폭, 숨은 의존성, 어색한 API) 진단, 아키텍처 투자 또는 리팩토링 우선순위 결정, 아키텍처 권고안 또는 ADR 작성.

**사용하지 말아야 할 때:** 시각/디자인 시스템(oma-design 사용), 기능 계획 및 태스크 분해(oma-pm 사용), Terraform 구현(oma-tf-infra 사용), 버그 진단(oma-debug 사용), 보안/성능/접근성 리뷰(oma-qa 사용).

**방법론:** 진단 라우팅, design-twice 비교, ATAM 방식 리스크 분석, CBAM 방식 우선순위화, ADR 방식 의사결정 기록.

**핵심 규칙:**
- 방법을 선택하기 전에 아키텍처 문제를 진단
- 현재 의사결정에 가장 가볍고 충분한 방법론을 사용
- 아키텍처 설계를 UI/시각 디자인 및 Terraform 전달과 구분
- 의사결정이 비용을 정당화할 만큼 교차적일 때만 이해관계자 에이전트에 자문
- 형식적인 합의보다 권고의 품질이 중요: 폭넓게 자문하되 명시적으로 결정
- 모든 권고는 가정, 트레이드오프, 리스크, 검증 단계를 명시
- 기본적으로 비용을 고려: 구현 비용, 운영 비용, 팀 복잡도, 향후 변경 비용

**리소스:** `SKILL.md`, 방법론 가이드가 포함된 `resources/` 디렉토리(diagnostic-routing, design-twice, ATAM, CBAM, ADR 템플릿).

---

### oma-pm

**도메인:** 프로덕트 관리 (요구사항 분석, 태스크 분해, API 컨트랙트).

**사용 시기:** 복잡한 기능 분해, 실현 가능성 판단, 우선순위 결정, API 컨트랙트 정의.

**핵심 규칙:**
- API 우선 설계: 구현 태스크 전에 컨트랙트 정의
- 모든 태스크에: 에이전트, 제목, 인수 기준, 우선순위, 의존성 포함
- 최대 병렬 실행을 위해 의존성 최소화
- 보안과 테스팅은 모든 태스크의 일부 (별도 단계가 아님)
- 태스크는 단일 에이전트가 완료 가능해야 함
- 오케스트레이터 호환성을 위한 JSON 계획 + task-board.md 출력

**출력:** `.agents/results/plan-{sessionId}.json`, `.agents/results/result-pm.md`, 오케스트레이터용 메모리 기록.

**리소스:** `execution-protocol.md`, `examples.md`, `iso-planning.md`, `task-template.json`, `../_shared/core/api-contracts/`.

**턴 제한:** 기본 10, 최대 15.

---

### oma-frontend

**도메인:** 웹 UI (React, Next.js, TypeScript와 FSD-lite 아키텍처).

**사용 시기:** 사용자 인터페이스, 컴포넌트, 클라이언트 사이드 로직, 스타일링, 폼 유효성 검사, API 통합을 구축할 때.

**기술 스택:**
- React + Next.js (기본 Server Components, 인터랙티브용 Client Components)
- TypeScript (strict)
- TailwindCSS v4 + shadcn/ui (읽기 전용 프리미티브, cva/wrapper로 확장)
- FSD-lite: root `src/` + feature `src/features/*/` (크로스 피처 임포트 금지)

**라이브러리:**
| 용도 | 라이브러리 |
|---------|---------|
| 날짜 | luxon |
| 스타일링 | TailwindCSS v4 + shadcn/ui |
| 훅 | ahooks |
| 유틸리티 | es-toolkit |
| URL 상태 | nuqs |
| 서버 상태 | TanStack Query |
| 클라이언트 상태 | Jotai (최소한으로 사용) |
| 폼 | @tanstack/react-form + Zod |
| 인증 | better-auth |

**핵심 규칙:**
- shadcn/ui 우선, cva로 확장, `components/ui/*`를 직접 수정하지 않음
- 디자인 토큰 1:1 매핑 (컬러 하드코딩 금지)
- 미들웨어 대신 프록시 (Next.js 16+는 프록시 로직에 `middleware.ts`가 아닌 `proxy.ts` 사용)
- 3단계를 넘는 prop drilling 금지 (Jotai 아톰 사용)
- `@/` 절대 임포트 필수
- FCP 목표 < 1초
- 반응형 브레이크포인트: 320px, 768px, 1024px, 1440px

**리소스:** `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `component-template.tsx`, `snippets.md`, `error-playbook.md`, `checklist.md`, `examples/`.

**품질 게이트 체크리스트:**
- 접근성: ARIA 레이블, 시맨틱 헤딩, 키보드 네비게이션
- 모바일: 모바일 뷰포트에서 검증
- 성능: CLS 없음, 빠른 로딩
- 복원력: Error Boundaries와 Loading Skeletons
- 테스트: Vitest로 로직 커버
- 품질: typecheck와 lint 통과

**턴 제한:** 기본 20, 최대 30.

---

### oma-backend

**도메인:** API, 서버 사이드 로직, 인증, 데이터베이스 연산.

**사용 시기:** REST/GraphQL API, 데이터베이스 마이그레이션, 인증, 서버 비즈니스 로직, 백그라운드 작업.

**아키텍처:** Router (HTTP) -> Service (비즈니스 로직) -> Repository (데이터 접근) -> Models.

**스택 감지:** 프로젝트 매니페스트(pyproject.toml, package.json, Cargo.toml, go.mod 등)를 읽어 언어와 프레임워크를 결정합니다. `stack/` 디렉토리가 있으면 그쪽으로 폴백하고, 없으면 사용자에게 `/stack-set` 실행을 요청합니다.

**핵심 규칙:**
- 클린 아키텍처: 라우트 핸들러에 비즈니스 로직 금지
- 프로젝트의 유효성 검사 라이브러리로 모든 입력 검증
- 파라미터화된 쿼리만 사용 (SQL에서 문자열 보간 금지)
- 인증에 JWT + Argon2id; 인증 엔드포인트 속도 제한
- 지원되는 곳에서 비동기; 모든 시그니처에 타입 어노테이션
- 중앙 집중식 에러 모듈을 통한 커스텀 예외
- 명시적 ORM 로딩 전략, 트랜잭션 경계, 안전한 라이프사이클

**리소스:** `execution-protocol.md`, `examples.md`, `orm-reference.md`, `checklist.md`, `error-playbook.md`. `stack/`의 스택별 리소스(`/stack-set`으로 생성): `tech-stack.md`, `snippets.md`, `api-template.*`, `stack.yaml`.

**턴 제한:** 기본 20, 최대 30.

---

### oma-mobile

**도메인:** 크로스 플랫폼 및 네이티브 모바일 앱 (Flutter, React Native, Swift 네이티브 iOS).

**사용 시기:** 네이티브 모바일 앱(iOS + Android), 모바일 특화 UI 패턴, 플랫폼 기능(카메라, GPS, 푸시 알림), 오프라인 우선 아키텍처; SwiftUI와 `swift-openapi-generator`를 사용하는 Swift 네이티브 iOS 앱.

**아키텍처:** 클린 아키텍처: domain -> data -> presentation. Swift iOS의 경우: `App/Core/Features/Shared` 프로젝트 레이아웃.

**기술 스택:**
- Flutter/Dart: Riverpod/Bloc (상태 관리), 인터셉터를 붙인 Dio (API), GoRouter (네비게이션), Material Design 3 (Android) + iOS HIG.
- Swift 네이티브 iOS (iOS 17+): SwiftUI + `@Observable` (Observation framework), API 클라이언트용 Apple `swift-openapi-generator`, `App/Core/Features/Shared` 레이아웃.

**핵심 규칙:**
- 상태 관리에 Riverpod/Bloc (복잡한 로직에 raw setState 금지)
- 모든 컨트롤러를 `dispose()` 메서드에서 해제
- API 호출에 interceptors가 있는 Dio; 오프라인을 우아하게 처리
- 60fps 목표; 양 플랫폼에서 테스트
- Swift: iOS 17+에서는 `ObservableObject` 대신 `@Observable` 사용; `swift-openapi-generator`로 OpenAPI 스펙에서 API 클라이언트 생성

**리소스:** `execution-protocol.md`, `tech-stack.md`, `snippets.md`, `screen-template.dart`, `screen-template.swift`, `checklist.md`, `error-playbook.md`, `examples.md`. `variants/swift-ios/`의 Swift 변형 레퍼런스(`/stack-set`으로 생성: `stack.yaml`, `tech-stack.md`, `snippets.md`, `api-template.swift`).

**턴 제한:** 기본 20, 최대 30.

---

### oma-db

**도메인:** 데이터베이스 아키텍처 (SQL, NoSQL, 벡터 데이터베이스).

**사용 시기:** 스키마 설계, ERD, 정규화, 인덱싱, 트랜잭션, 용량 계획, 백업 전략, 마이그레이션 설계, 벡터 DB/RAG 아키텍처, 안티 패턴 리뷰, 컴플라이언스 인식 설계(ISO 27001/27002/22301).

**기본 워크플로우:** 탐색(엔티티, 접근 패턴, 볼륨 식별) -> 설계(스키마, 제약, 트랜잭션) -> 최적화(인덱스, 파티셔닝, 아카이빙, 안티 패턴).

**핵심 규칙:**
- 먼저 모델을 선택한 다음 엔진 선택
- 관계형은 기본 3NF; 분산형은 BASE 트레이드오프 문서화
- 세 가지 스키마 레이어 모두 문서화: 외부, 개념, 내부
- 무결성이 최우선: 엔티티, 도메인, 참조, 비즈니스 규칙
- 동시성은 암시적이지 않음: 트랜잭션 경계와 격리 수준 정의
- 벡터 DB는 검색 인프라이지 진실의 원천이 아님
- 벡터 검색을 어휘 검색의 대체품으로 취급하지 않음

**필수 산출물:** 외부 스키마 요약, 개념 스키마, 내부 스키마, 데이터 표준 테이블, 용어집, 용량 추정, 백업/복구 전략. 벡터/RAG의 경우: 임베딩 버전 정책, 청킹 정책, 하이브리드 검색 전략.

**리소스:** `execution-protocol.md`, `document-templates.md`, `anti-patterns.md`, `vector-db.md`, `iso-controls.md`, `checklist.md`, `error-playbook.md`, `examples.md`.

---

### oma-design

**도메인:** 디자인 시스템, UI/UX, DESIGN.md 관리.

**사용 시기:** 디자인 시스템, 랜딩 페이지, 디자인 토큰, 컬러 팔레트, 타이포그래피, 반응형 레이아웃, 접근성 리뷰를 생성할 때.

**워크플로우:** 7단계: Setup (컨텍스트 수집) -> Extract (선택적, 참조 URL에서) -> Enhance (모호한 프롬프트 증강) -> Propose (2-3가지 디자인 방향) -> Generate (DESIGN.md + 토큰) -> Audit (반응형, WCAG, Nielsen, AI slop 검사) -> Handoff.

**안티 패턴 적용 ("no AI slop"):**
- 타이포그래피: 기본 시스템 폰트 스택; 정당화 없이 기본 Google Fonts 사용 금지
- 컬러: 보라-파랑 그라디언트 금지, 그라디언트 오브/블롭 금지, 순수 검정 위에 순수 흰색 금지
- 레이아웃: 중첩 카드 금지, 데스크탑 전용 레이아웃 금지, 틀에 박힌 3-메트릭 통계 레이아웃 금지
- 모션: 모든 곳에 bounce easing 금지, 800ms 초과 애니메이션 금지, prefers-reduced-motion 반드시 존중
- 컴포넌트: 모든 곳에 glassmorphism 금지, 모든 인터랙티브 요소에 키보드/터치 대안 필요

**핵심 규칙:**
- 먼저 `.design-context.md` 확인; 없으면 생성
- 기본 시스템 폰트 스택 (ko/ja/zh용 CJK 지원 폰트)
- 모든 디자인에 WCAG AA 최소 준수
- 반응형 우선 (모바일이 기본)
- 2-3가지 방향 제시 후 확인 받기

**리소스:** `execution-protocol.md`, `anti-patterns.md`, `checklist.md`, `design-md-spec.md`, `design-tokens.md`, `prompt-enhancement.md`, `stitch-integration.md`, `error-playbook.md`, 그리고 `reference/` 디렉토리(typography, color-and-contrast, spatial-design, motion-design, responsive-design, component-patterns, accessibility, shader-and-3d).

---

### oma-tf-infra

**도메인:** Terraform으로 Infrastructure-as-code, 멀티 클라우드.

**사용 시기:** AWS/GCP/Azure/Oracle Cloud 프로비저닝, Terraform 설정, CI/CD 인증(OIDC), CDN/로드 밸런서/스토리지/네트워킹, 상태 관리, ISO 컴플라이언스 인프라.

**클라우드 감지:** Terraform 프로바이더와 리소스 접두사를 읽습니다(`google_*` = GCP, `aws_*` = AWS, `azurerm_*` = Azure, `oci_*` = Oracle Cloud). 전체 멀티 클라우드 리소스 매핑 테이블이 포함됩니다.

**핵심 규칙:**
- 프로바이더 불문: 프로젝트 컨텍스트에서 클라우드 감지
- 버전 관리와 잠금이 있는 원격 상태
- CI/CD 인증에 OIDC 우선
- 항상 적용 전 계획
- 최소 권한 IAM
- 모든 것에 태그 (Environment, Project, Owner, CostCenter)
- 코드에 시크릿 금지
- 모든 프로바이더와 모듈 버전 고정
- 프로덕션에서 자동 승인 금지

**리소스:** `execution-protocol.md`, `multi-cloud-examples.md`, `cost-optimization.md`, `policy-testing-examples.md`, `iso-42001-infra.md`, `checklist.md`, `error-playbook.md`, `examples.md`.

---

### oma-dev-workflow

**도메인:** 모노레포 태스크 자동화와 CI/CD.

**사용 시기:** 개발 서버 실행, 앱 전체에서 lint/format/typecheck 실행, 데이터베이스 마이그레이션, API 생성, i18n 빌드, 프로덕션 빌드, CI/CD 최적화, pre-commit 검증.

**핵심 규칙:**
- 직접적인 패키지 매니저 명령 대신 항상 `mise run` 태스크 사용
- 변경된 앱에서만 lint/test 실행
- commitlint로 커밋 메시지 검증
- CI에서 변경되지 않은 앱 건너뛰기
- mise 태스크가 있으면 직접 패키지 매니저 명령 사용 금지

**리소스:** `validation-pipeline.md`, `database-patterns.md`, `api-workflows.md`, `i18n-patterns.md`, `release-coordination.md`, `troubleshooting.md`.

---

### oma-observability

**도메인:** 계층, 경계, 시그널을 아우르는 의도 기반 관측성 및 추적 라우터.

**사용 시기:** 관측성 파이프라인 구축(OTel SDK + Collector + 벤더 백엔드), 서비스 및 도메인 경계를 아우르는 추적성(W3C propagator, baggage, 멀티테넌트, 멀티 클라우드), 전송 계층 튜닝(UDP/MTU 임계값, OTLP gRPC vs HTTP, Collector DaemonSet vs 사이드카 토폴로지, 샘플링 레시피), 인시던트 포렌식(6차원 국소화: code / service / layer / host / region / infra), 벤더 카테고리 선택(OSS 풀스택 vs 상용 SaaS vs 고 카디널리티 전문 vs 프로파일링 전문), observability-as-code(Grafana Jsonnet 대시보드, PrometheusRule CRD, OpenSLO YAML, SLO burn-rate 알람), 메타 관측성(파이프라인 자체 건강성, 클록 스큐, 카디널리티 가드레일, 보관 매트릭스), MELT+P 시그널 커버리지(metrics, logs, traces, profiles, cost, audit, privacy), 사용 중단 도구에서 넘어오는 마이그레이션(Fluentd -> Fluent Bit 또는 OTel Collector).

**사용하지 말아야 할 때:** LLM ops / gen_ai 관측성(Langfuse, Arize Phoenix, LangSmith, Braintrust 사용), 데이터 파이프라인 lineage(OpenLineage + Marquez, dbt test, Airflow lineage), IoT / 데이터센터 물리 계층 텔레메트리(Nlyte, Sunbird, Device42), 카오스 엔지니어링 오케스트레이션(Chaos Mesh, Litmus, Gremlin, ChaosToolkit), GPU / TPU 인프라(NVIDIA DCGM Exporter), 소프트웨어 공급망(sigstore, in-toto, SLSA), 인시던트 대응 워크플로우 / 페이징(PagerDuty, OpsGenie, Grafana OnCall), 해당 벤더의 고유 스킬로 이미 다루는 단일 벤더 셋업.

**핵심 규칙:**
- 라우팅 전에 의도 분류: setup | migrate | investigate | alert | trace | tune | route
- 벤더 레지스트리가 아닌 카테고리 우선: `resources/vendor-categories.md`를 통해 벤더 소유 스킬에 위임하고 벤더 문서를 중복 작성하지 않음
- 전송 계층 튜닝이 차별점: UDP/MTU 임계값, OTLP 프로토콜 선택, Collector 토폴로지, 샘플링 레시피는 다른 스킬이 다루지 않는 깊이
- 메타 관측성은 타협 불가: 셋업 완료를 선언하기 전에 파이프라인 자체 건강성, 클록 동기화(< 100 ms 드리프트), 카디널리티, 보관을 검증
- CNCF 우선 선호: Prometheus, Jaeger, Thanos, Fluent Bit, OpenTelemetry, Cortex, OpenCost, OpenFeature, Flagger, Falco
- Fluentd는 사용 중단(CNCF 2025-10): 신규 및 마이그레이션 작업에는 Fluent Bit 또는 OTel Collector 권장
- W3C Trace Context가 기본 propagator; 클라우드별 변환(AWS X-Ray `X-Amzn-Trace-Id`, GCP Cloud Trace, Datadog, Cloudflare, Linkerd)
- 기능보다 프라이버시 우선: PII 마스킹, 샘플링 인식 baggage 규칙, SOC2/ISO 불변 감사 + GDPR/PIPA 삭제권은 저장이 아닌 수집 시점에 적용

**리소스:** `SKILL.md`, `resources/execution-protocol.md`, `resources/intent-rules.md`, `resources/vendor-categories.md`, `resources/matrix.md`, `resources/checklist.md`, `resources/anti-patterns.md`, `resources/examples.md`, `resources/meta-observability.md`, `resources/observability-as-code.md`, `resources/incident-forensics.md`, `resources/standards.md`, 그리고 `resources/layers/` 하위 심화 리소스(L3-network, L4-transport, L7-application, mesh), `resources/signals/`(metrics, logs, traces, profiles, cost, audit, privacy), `resources/transport/`(collector-topology, otlp-grpc-vs-http, sampling-recipes, udp-statsd-mtu), `resources/boundaries/`(cross-application, multi-tenant, release, slo).

---

### oma-qa

**도메인:** 품질 보증 (보안, 성능, 접근성, 코드 품질).

**사용 시기:** 배포 전 최종 리뷰, 보안 감사, 성능 분석, 접근성 준수, 테스트 커버리지 분석.

**리뷰 우선순위:** 보안 > 성능 > 접근성 > 코드 품질.

**심각도 수준:**
- **CRITICAL**: 보안 침해, 데이터 손실 위험
- **HIGH**: 출시 차단
- **MEDIUM**: 이번 스프린트에서 수정
- **LOW**: 백로그

**핵심 규칙:**
- 모든 발견 사항에 파일:라인, 설명, 수정 방안 포함 필수
- 먼저 자동화 도구 실행 (npm audit, bandit, lighthouse)
- 오탐 금지 (모든 발견 사항은 재현 가능해야 함)
- 설명만이 아닌 수정 코드 제공

**리소스:** `execution-protocol.md`, `iso-quality.md`, `checklist.md`, `self-check.md`, `error-playbook.md`, `examples.md`.

**턴 제한:** 기본 15, 최대 20.

---

### oma-debug

**도메인:** 버그 진단 및 수정.

**사용 시기:** 사용자 보고 버그, 크래시, 성능 문제, 간헐적 장애, 레이스 컨디션, 회귀 버그.

**방법론:** 먼저 재현, 그다음 진단. 수정을 넘겨짚지 않음.

**핵심 규칙:**
- 증상이 아닌 근본 원인 식별
- 최소 수정: 필요한 것만 변경
- 모든 수정에 회귀 테스트
- 다른 곳에서 유사한 패턴 검색
- `.agents/results/bugs/`에 문서화

**사용하는 Serena MCP 도구:**
- `find_symbol("functionName")`: 함수 위치 찾기
- `find_referencing_symbols("Component")`: 모든 사용처 찾기
- `search_for_pattern("error pattern")`: 유사한 문제 찾기

**리소스:** `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`, `examples.md`.

**턴 제한:** 기본 15, 최대 25.

---

### oma-translation

**도메인:** 컨텍스트 인식 다국어 번역.

**사용 시기:** UI 문자열, 문서, 마케팅 카피 번역, 기존 번역 검토, 용어집 생성.

**4단계 방법:** 원문 분석(레지스터, 의도, 도메인 용어, 문화적 참조, 감정적 함의, 비유적 언어 매핑) -> 의미 추출(원문 구조 제거) -> 대상 언어로 재구성(자연스러운 어순, 레지스터 매칭, 문장 분할/병합) -> 검증(자연스러움 루브릭 + 안티 AI 패턴 검사).

**출판 품질을 위한 선택적 7단계 정제 모드:** 비평적 리뷰, 수정, 다듬기 단계가 추가됩니다.

**핵심 규칙:**
- 먼저 기존 로케일 파일을 스캔해 프로젝트 관례에 맞추기
- 단어가 아닌 의미를 번역
- 감정적 함의 유지
- 직역 금지
- 하나의 글 내에서 레지스터 혼합 금지
- 도메인 특정 용어는 원문 그대로 유지

**리소스:** `translation-rubric.md`, `anti-ai-patterns.md`(둘 다 언어 중립), 그리고 `resources/lang/` 아래에 있는 대상 언어별 프로파일(`ko`, `ja`, `zh`, `en`. 언어를 추가할 때는 `_template.md`를 복사합니다).

---

### oma-orchestration

**도메인:** CLI 스폰을 통한 자동화된 멀티 에이전트 조율.

**사용 시기:** 여러 에이전트가 병렬로 필요한 복잡한 기능, 자동화된 실행, 풀스택 구현.

**설정 기본값:**

| 설정 | 기본값 | 설명 |
|---------|---------|-------------|
| MAX_PARALLEL | 3 | 최대 동시 서브에이전트 수 |
| MAX_RETRIES | 2 | 실패한 태스크당 재시도 횟수 |
| POLL_INTERVAL | 30초 | 상태 확인 간격 |
| MAX_TURNS (impl) | 20 | backend/frontend/mobile 턴 제한 |
| MAX_TURNS (review) | 15 | qa/debug 턴 제한 |
| MAX_TURNS (plan) | 10 | pm 턴 제한 |

**워크플로우 단계:** Plan -> Setup (세션 ID, 메모리 초기화) -> Execute (우선순위 티어별 스폰) -> Monitor (진행 상황 폴링) -> Verify (자동화 + 크로스 리뷰 루프) -> Collect (결과 수집).

**에이전트 간 리뷰 루프:**
1. 자체 리뷰: 에이전트가 인수 기준에 대해 자신의 diff를 확인
2. 자동화 검증: `oma verify {agent-type} --workspace {workspace}`
3. 크로스 리뷰: QA 에이전트가 변경사항 리뷰
4. 실패 시: 수정을 위해 이슈 피드백 (총 최대 5회 루프 반복)

**Clarification Debt 모니터링:** 세션 중 사용자 교정을 추적합니다. 이벤트 점수: clarify (+10), correct (+25), redo (+40). CD >= 50이면 필수 RCA 트리거. CD >= 80이면 세션 일시 중지.

**리소스:** `subagent-prompt-template.md`, `memory-schema.md`.

---

### oma-scm

**도메인:** Conventional Commits를 따르는 Git 커밋 생성.

**사용 시기:** 코드 변경 완료 후, `/scm` 실행 시.

**커밋 유형:** feat, fix, refactor, docs, test, chore, style, perf.

**워크플로우:** 변경사항 분석 -> 기능별 분할(5개 파일 초과이며 다른 범위에 걸쳐 있을 경우) -> 유형 결정 -> 범위 결정 -> 설명 작성(명령문, 72자 미만, 소문자, 마침표 없음) -> 즉시 커밋 실행.

**규칙:**
- `git add -A`나 `git add .` 사용 금지
- 시크릿 파일 커밋 금지
- 스테이징 시 항상 파일 지정
- 멀티라인 커밋 메시지에 HEREDOC 사용
- Co-Author: `First Fluke <our.first.fluke@gmail.com>`

---

### oma-coordination

**도메인:** 수동 단계별 멀티 에이전트 조율 가이드.

**사용 시기:** 모든 게이트에서 사람의 확인이 필요한 복잡한 프로젝트, 수동 에이전트 스폰 가이드, 단계별 조율 레시피.

**사용하지 말아야 할 때:** 완전 자동 병렬 실행(oma-orchestration 사용), 단일 도메인 작업(해당 도메인 에이전트 직접 사용).

**핵심 규칙:**
- 에이전트 스폰 전 반드시 계획을 사용자에게 확인
- 한 번에 하나의 우선순위 티어만 처리 (완료 후 다음 티어 진행)
- 사용자가 각 게이트 전환을 승인
- 머지 전 QA 리뷰 필수
- CRITICAL/HIGH 이슈에 대한 수정 반복 루프

**워크플로우:** PM 계획 → 사용자 확인 → 우선순위별 스폰 → 모니터링 → QA 리뷰 → 이슈 수정 → 배포.

**oma-orchestration와 차이:** coordination은 수동 가이드(사용자가 속도 제어), orchestrator는 자동(최소 사용자 개입으로 에이전트가 스폰·실행).

---

### oma-search

**도메인:** 도메인 신뢰도 점수를 사용하는 의도 기반 검색 라우터입니다. 쿼리를 Context7(문서), 네이티브 웹 검색, `gh`/`glab`(코드), Serena(로컬)로 라우팅합니다.

**사용 시기:** 공식 라이브러리/프레임워크 문서 찾기, 튜토리얼/예제/비교/솔루션을 위한 웹 리서치, 구현 패턴을 위한 GitHub/GitLab 코드 검색, 검색 채널이 불명확한 쿼리(자동 라우팅), 검색 인프라가 필요한 다른 스킬(공유 호출).

**사용하지 말아야 할 때:** 로컬 전용 코드베이스 탐색(Serena MCP를 직접 사용), Git 이력 또는 blame 분석(oma-scm 사용), 전체 아키텍처 리서치(이 스킬을 내부적으로 호출할 수 있는 oma-architecture 사용).

**핵심 규칙:**
- 검색 전에 의도 분류 (모든 쿼리는 먼저 IntentClassifier를 통과)
- 하나의 쿼리, 하나의 최적 경로 (의도가 모호하지 않은 한 중복 멀티 라우팅을 피함)
- 모든 결과에 신뢰도 점수 (모든 비로컬 결과는 레지스트리의 도메인 신뢰도 레이블을 받음)
- 플래그가 분류기보다 우선: `--docs`, `--code`, `--web`, `--strict`, `--wide`, `--gitlab`
- Fail forward: 주 경로가 실패하면 우아하게 폴백(docs→web, web→`oma search fetch` 전략)
- 추가 MCP 불필요: 문서는 Context7, 웹은 런타임 네이티브, 코드는 CLI, 로컬은 Serena
- 벤더 중립 웹 검색: 현재 런타임이 제공하는 것을 그대로 사용(WebSearch, Google, Bing)
- 도메인 수준 신뢰도만 사용 (하위 경로 또는 페이지 수준 점수 없음)

**리소스:** `SKILL.md`, 의도 분류기·경로 정의·신뢰 레지스트리가 담긴 `resources/` 디렉토리.

---

### oma-recap

**도메인:** 여러 AI 도구(Claude, Codex, Qwen, Cursor)의 대화 이력 분석 및 주제별 일/기간 작업 요약.

**사용 시기:** 하루 또는 기간의 작업 활동 요약, 여러 AI 도구에 걸친 작업 흐름 파악, 세션 간 도구 전환 패턴 분석, 데일리 스탠드업/주간 회고/작업 로그 준비.

**사용하지 말아야 할 때:** Git 커밋 기반의 코드 변경 회고(`oma retro` 사용), 실시간 에이전트 모니터링(`oma dashboard terminal` 사용), 생산성 지표(`oma stats get` 사용).

**프로세스:**
1. 자연어 입력(today, yesterday, last Monday, 명시적 날짜)에서 날짜 또는 시간 범위 해석
2. `oma recap --date YYYY-MM-DD` 또는 `--since` / `--until`로 대화 데이터 수집
3. 도구 및 세션별 그룹핑
4. 테마 추출(작업한 기능, 수정한 버그, 탐색한 도구)
5. 주제별 일/기간 요약 렌더링

**리소스:** `SKILL.md`. 무거운 작업은 `oma recap` CLI에 위임합니다.

---

### oma-hwp

**도메인:** `kordoc`을 사용한 HWP / HWPX / HWPML(한글 워드프로세서) → Markdown 변환.

**사용 시기:** 한국어 HWP 문서(`.hwp`, `.hwpx`, `.hwpml`)를 Markdown으로 변환, LLM 컨텍스트 또는 RAG용 한국 정부/기업 문서 준비, HWP에서 구조화된 콘텐츠(표, 헤딩, 목록, 이미지, 각주, 하이퍼링크) 추출.

**사용하지 말아야 할 때:** PDF 파일(oma-pdf 사용), XLSX/DOCX(범위 외), HWP 생성/편집(범위 외), 이미 텍스트인 파일(Read 도구 직접 사용).

**핵심 규칙:**
- 실행에 `bunx kordoc@latest` 사용 (설치 불필요. 항상 `@latest` 또는 고정 버전 전달)
- 기본 출력 형식은 Markdown
- 출력 디렉토리가 지정되지 않으면 입력과 동일한 디렉토리에 출력
- kordoc이 구조 보존 처리(헤딩, 표, 중첩 표, 각주, 하이퍼링크, 이미지)
- 보안 방어(ZIP bomb, XXE, SSRF, XSS)는 kordoc이 제공 (커스텀 방어 추가 금지)
- 암호화된 또는 DRM 잠금 HWP의 경우 제한 사항을 사용자에게 명확히 보고
- HTML `<table>` 블록을 GFM 파이프 테이블로 변환하고 Hancom 폰트 Private Use Area 문자를 제거하기 위해 `resources/flatten-tables.ts`로 후처리

**리소스:** `SKILL.md`, `config/`, `resources/flatten-tables.ts`.

---

### oma-pdf

**도메인:** `opendataloader-pdf`를 사용한 PDF → Markdown 변환.

**사용 시기:** LLM 컨텍스트 또는 RAG용 PDF 문서를 Markdown으로 변환, PDF에서 구조화된 콘텐츠(표, 헤딩, 목록) 추출, AI가 바로 쓸 수 있는 PDF 데이터 준비.

**사용하지 말아야 할 때:** PDF 생성/작성(적절한 문서 도구 사용), 기존 PDF 편집(범위 외), 이미 텍스트인 파일의 단순 읽기(Read 도구 직접 사용).

**핵심 규칙:**
- 실행에 `uvx opendataloader-pdf` 사용 (설치 불필요)
- 기본 출력 형식은 Markdown
- 출력 디렉토리가 지정되지 않으면 입력 PDF와 동일한 디렉토리에 출력
- 문서 구조 보존(헤딩, 표, 목록, 이미지)
- 스캔된 PDF의 경우 OCR을 포함한 하이브리드 모드 사용
- Markdown 포매팅 정규화를 위해 항상 출력에 `uvx mdformat` 실행
- 출력 Markdown이 읽을 수 있고 구조적으로 양호한지 검증
- 변환 문제(누락된 표, 깨진 텍스트)를 사용자에게 보고

**리소스:** `SKILL.md`, `config/`, `resources/`.

---

### oma-academic-writing

**도메인:** 출판 수준의 학술 영어 산문. 에세이, 보고서, 분석 절, 요약문, 결론, 문헌 검토를 작성하고 수정하고 감사합니다.

**사용 시기:** 학술 보고서·에세이·분석 절을 작성하거나 수정할 때, 요약문이나 결론이나 문헌 검토를 쓸 때, AI 티가 나는 산문을 자연스러운 학술 영어로 다시 쓸 때, 초안을 최상위 루브릭 수준(HD, A, top-band)까지 다듬을 때, 문장 다양성·동사 품질·헤징·안티 AI 준수를 기준으로 산문을 검토할 때.

**사용하지 말아야 할 때:** 번역(oma-translation 사용), 출처 발굴·인용 수집·문헌 검색(oma-scholar 사용), 루브릭 해석과 태스크 분해(oma-pm 사용), 코드 문서·README·API 레퍼런스 텍스트(해당 도메인 스킬 사용), 비격식 문체나 마케팅 카피, 영어가 아닌 학술 글쓰기(영어로 먼저 쓰고 oma-translation에 넘기기).

**모드:** `draft`(헤딩 + 산문 + Writing Notes + 주장-근거 맵), `revise`(원문 + 수정본 + 변경 목록), `review`(문장 구조, 동사 품질, 안티 AI, 구체성, 헤징, 문단 명료성, 리듬, 주장-근거 정합성에 대한 PASS/FAIL 준수 보고서).

**핵심 규칙:**
- 판단에 앞선 인용: 규칙을 적용하기 전에 루브릭이나 제약의 원문을 그대로 인용
- 모든 문장은 검증 가능해야 하며, 데이터·통계·인용을 절대 지어내지 않음
- 금지된 일반 동사(`show`, `have`, `make`, `do`, `get`, `use` 등)를 본동사로 쓰지 않음
- 문장 유형·길이·도입부를 변화시키고, 같은 유형을 3개 이상 연달아 쓰지 않음
- 헤지의 강도를 근거의 강도에 맞추고, `I think` / `I believe` 같은 1인칭을 쓰지 않음
- 모든 주장을 주장-근거 맵의 근거와 연결하고, 근거 없는 주장은 약화하거나 삭제

**워크플로우:** 6단계입니다. 루브릭과 초안을 READ하며 제약을 인용, 문단을 Topic-Support-Conclude로 PLAN, 네 프로토콜을 모두 지키며 DRAFT, 안티 AI 체크리스트로 AUDIT, 역방향 아웃라인과 주장-근거 맵 작성, 소리 내어 읽기·응집성·구체성·분량·리듬을 POLISH.

**리소스:** `anti-ai-checklist.md`, `sentence-structure-reference.md`, `academic-verb-tiers.md`, `hedging-guide.md`, 그리고 공유 리소스 `context-loading`, `quality-principles`.

---

### oma-deepsec

**도메인:** 대상 저장소 안에서 Vercel의 `deepsec` 에이전트 기반 취약점 스캐너를 안전하고 비용을 의식하며 엔드 투 엔드로 운용합니다.

**사용 시기:** 저장소에 deepsec을 처음 설치할 때(`init`, `INFO.md` 작성, 보정 스캔), 전체 또는 범위를 좁힌 스캔을 실행하고 발견 사항을 처리할 때, `process --diff`로 PR별 CI 게이트를 구성할 때, 프로젝트 전용 매처를 작성할 때, 발견 사항 백로그를 트리아지할 때(심각도 분류, `revalidate`로 오탐 제거, export), deepsec 실패를 진단할 때.

**사용하지 말아야 할 때:** deepsec 없이 일반 OWASP나 lint 수준 리뷰를 할 때(oma-qa 사용), 일반 CVE나 의존성 권고를 볼 때(oma-qa 또는 oma-search 사용), deepsec이 아닌 SAST 파이프라인을 설계할 때(oma-architecture 사용), 애플리케이션 코드를 작성하거나 감사할 때(oma-backend/frontend/mobile로 라우팅), 클라우드·IAM·Terraform 강화(oma-tf-infra 사용), deepsec이 만든 발견 사항의 수정 방안을 제품 코드에서 따질 때(oma-debug 사용).

**핵심 규칙:**
- 크기를 재보지 않은 저장소에 한계 없는 `process`를 절대 돌리지 않음. 파일 수를 모르거나 500개를 넘으면 먼저 보정(`--limit 50 --concurrency 5`)
- AI 패스를 돌리기 전에 비용과 정지 조건을 먼저 말하기(100개 파일에 약 25~60달러, 2,000개면 500~1,200달러이며 2~3배까지 흔들림)
- 초기화하지 말고 재개하기: 쿼터·네트워크·Ctrl-C로 중단되면 같은 명령을 다시 실행하고, 깨끗하게 시작하겠다며 `data/<id>/`를 지우지 않음
- `INFO.md`는 짧고 프로젝트에 밀착하게 유지(50~100줄, 섹션당 예시 3~5개)
- PR과 CI 게이트에는 2-잡 패턴을 쓰고, PR이 제어하는 코드를 실행하는 잡에는 `pull-requests: write`를 절대 주지 않으며, 프로덕션에서는 액션을 전체 SHA로 고정
- 첫 유료 호출 전에 에이전트 선택(`codex`/gpt-5.5 대 `claude`/claude-opus-4-8)을 묻고, 자격 증명을 출력하거나 커밋하지 않음

**워크플로우:** PREPARE(의도, 저장소 루트, 자격 증명, 예산, 심각도 하한, 에이전트) → ACQUIRE(설정, `INFO.md`, 실행 이력, 저장소 신호) → REASON(충분한 것 중 가장 작은 패스 선택) → ACT(`.deepsec/` 안에서 실행) → VERIFY(`status`, `RunMeta`, 종료 코드) → FINALIZE(심각도와 판정별 발견 사항, 달러 비용, 후속 작업).

**리소스:** `setup.md`, `scanning.md`, `pr-review.md`, `matchers.md`, `triage.md`, `config.md`.

---

### oma-docs

**도메인:** 문서 드리프트 탐지. `docs/**/*.md`의 참조를 현재 코드베이스와 대조해 검증하고(verify 모드), diff의 영향을 받는 문서에 패치를 제안합니다(sync 모드).

**사용 시기:** 리팩터링·이름 변경·파일 삭제 후 문서에 남은 낡은 참조를 찾을 때, 릴리스 전에 CLI 명령·파일 경로·설정 키가 아직 존재하는지 확인할 때, 큰 git diff 후 어떤 문서가 변경된 파일을 참조하는지 찾을 때, 문서가 많은 저장소에서 정기적으로 드리프트를 점검할 때.

**사용하지 말아야 할 때:** 문서화되지 않은 기능의 문서를 처음부터 만들 때, 문서를 다국어로 번역할 때(oma-translation 사용), 심볼 수준의 의미 드리프트, CI 차단 강제(v1은 경고만 합니다).

**핵심 규칙:**
- 어떤 모드에서도 `.agents/`를 절대 수정하지 않음 (SSOT 보호)
- sync 패치를 자동 적용하지 않음. sync는 항상 대화형이며 문서마다 `[y]` 확인이 필요
- LLM을 쓸 수 없으면 완만하게 저하: verify는 원시 JSON으로, sync는 후보 목록만 내보내는 방식으로 폴백
- 시크릿이 담길 수 있는 파일(`.env*`, `*.pem`, `*.key`, `id_rsa*`, gitignore 대상)은 sync 출력에 절대 등장하지 않음
- CLI에서 LLM API를 직접 호출하지 않음. CLI는 구조화된 데이터만 내보내고, 종합과 패치 작성은 전부 호스트 LLM이 함(벤더 중립)
- URL 링크 검사는 `lychee`에 위임하며, 훅은 v1에서 경고만 하고 워크플로우 완료를 막지 않음

**워크플로우:** verify 모드는 추출 → 해석 → 보고 순으로 결정론적 CLI에서 돌며, 문제가 없으면 0, 깨진 참조가 있으면 1로 종료합니다. sync 모드는 git diff → 역방향 조회 → 후보 목록 → 호스트 LLM 패치 제안 → 대화형 수락·거부 → `doc-refs.json` 재생성 순입니다.

**리소스:** 공유 리소스만 사용합니다. 구현은 `cli/commands/docs/`에 있습니다(`extract.ts`, `resolve.ts`, `reporter.ts`, `sync-propose.ts`).

---

### oma-image

**도메인:** 인증 상태를 인지해 병렬로 디스패치하는 멀티 벤더 AI 이미지 생성(Codex `gpt-image-2`, `agy`를 통한 Antigravity `gemini-2.5-flash-image`(nano-banana), Pollinations flux/zimage).

**사용 시기:** 이미지, 비주얼 에셋, 일러스트, 제품 사진, 콘셉트 아트, 목업을 생성할 때, 같은 프롬프트로 여러 이미지 모델의 결과를 비교할 때, 에디터 워크플로우 안에서 프롬프트로 이미지를 만들 때.

**사용하지 말아야 할 때:** 기존 이미지를 편집하거나 사진을 보정할 때, 비디오나 오디오를 생성할 때(oma-video / oma-voice 사용), 구조화된 데이터로 인라인 벡터나 SVG를 합성할 때, 단순 에셋 리사이즈나 포맷 변환.

**핵심 규칙:**
- 호출 전에 명확화: 피사체·스타일·구도·용도가 모호하면 먼저 묻거나, 프롬프트를 보강해 확장본을 사용자에게 보여주기
- 인증을 인지한 디스패치: 인증된 벤더만 실행하고, `--vendor all`에서는 요청한 모든 벤더가 사용 가능해야 함
- 비용 가드레일: 추정 비용이 0.20달러 이상이면 확인(`--yes` / `OMA_IMAGE_YES=1`로 우회). 기본값인 `pollinations`와 `antigravity`는 무료
- 경로 안전성: `$PWD` 밖으로 출력하려면 `--allow-external-out`이 필요하고 최대 `n`은 5
- 결정적 출력: 모든 실행이 이미지 옆에 `manifest.json`을 작성
- 첨부된 참조 이미지를 `--reference <path>`로 자동 전달(codex, antigravity)

**워크플로우:** PREPARE(프롬프트 명확화와 보강, 벤더 선택) → ACQUIRE(인증, 참조, 출력 경로 검증) → ACT(`oma image generate`) → VERIFY(매니페스트, 파일, 종료 코드) → FINALIZE(출력 경로와 경고).

**리소스:** `execution-protocol.md`, `vendor-matrix.md`, `prompt-tips.md`, `checklist.md`, 그리고 `config/image-config.yaml`.

---

### oma-market

**도메인:** 커뮤니티 신호 기반 시장 조사. Reddit, HN, Bluesky, Mastodon, GitHub Issues, 웹에서 페인 포인트를 추출하고 트렌드를 감지하며 경쟁 구도를 파악하고 새로운 기회를 발견합니다.

**사용 시기:** 커뮤니티 게시물에서 실제 사용자 페인 포인트를 뽑을 때, 7일·30일·90일·180일 구간에서 카테고리 트렌드를 감지할 때, 경쟁사 정서 분석과 SWOT 포지셔닝을 할 때, 여러 소스에 걸친 개방형 발견 조사를 할 때.

**사용하지 말아야 할 때:** 시장 프레이밍 없이 일반 웹 리서치를 할 때(oma-search 직접 사용), 단일 소스 쿼리(`oma search fetch` 단독 사용), 실시간 대시보드나 예약 모니터링(v1은 일회성 실행입니다).

**핵심 규칙:**
- detect-trap 먼저: 사전 점검 없이 절대 harvest하지 않음(`--force`는 테스트 모드에서만 우회)
- 모든 fetch를 위임: `harvest`가 `oma search fetch --only api`를 호출하며, 플랫폼에 직접 HTTP를 보내지 않음
- 신뢰도 레이블은 읽기 전용: 재채점하지 않으며 Trust Registry의 소유권은 oma-search에 남음
- 유료 소스(X, TikTok, Instagram, YouTube, Perplexity)는 환경 키가 없으면 조용히 자동으로 건너뜀
- 파일을 쓰기 전에 LAW 자체 점검이 필수이며, 마크다운 본문에 원시 증거를 그대로 쏟지 않음
- 실행 한 번에 브리프 하나를 `.agents/results/market/{topic-slug}-{YYYYMMDD}.md`에 작성. 프레임워크는 의도에 따라 자동 선택(pain·trend는 SWOT, competitor는 SWOT + Porter's 5F, discovery는 SWOT + PESTEL)

**워크플로우:** PREPARE(주제와 플래그 파싱, detect-trap, 의도·팩·구간 해석) → ACT(소스별 fetch URL 구성) → ACQUIRE(병렬 harvest) → VERIFY(점수, 융합, 클러스터링) → FINALIZE(LAW를 준수하는 브리프 렌더링, 자체 점검, 파일 작성).

**리소스:** `intent-rules.md`, `output-laws.md`, `execution-protocol.md`, `checklist.md`, `error-playbook.md`, `examples.md`, 그리고 `frameworks/`(swot, porters-5f, pestel)와 `operator-packs/`(pain, positive, competitor, discovery).

---

### oma-refactor

**도메인:** 동작을 보존하는 리팩터링. 코드 스멜·SATD·핫스팟을 겨냥해 특성화 테스트 안전망 위에서 안전하게 점진적으로 구조를 개선하고, 리팩터링만 담은 커밋을 만듭니다.

**사용 시기:** 특정 파일이나 모듈에 리팩터링을 실행할 때(추출, 이동, 이름 변경, 분해, 관용구 정렬), 기능 개발 전 준비 리팩터링을 할 때, 레거시나 브라운필드를 구조할 때(seam 발굴과 특성화 테스트), 핫스팟(변경 빈도 × 복잡도)으로 리팩터링 대상을 고를 때, 지금 리팩터링해도 안전한지 감사할 때.

**사용하지 말아야 할 때:** 보고된 버그나 잘못된 동작을 고칠 때(oma-debug 사용. 리팩터링은 동작을 바꾸면 안 됩니다), 보안·성능·접근성 감사(oma-qa 사용), 시스템 설계·모듈 경계·ADR(oma-architecture 사용), DB 스키마 설계나 마이그레이션 절차(oma-db 사용), 커밋 분할과 스테이징(oma-scm 사용), 성능 최적화 자체를 목표로 삼을 때.

**핵심 규칙:**
- 동작 보존: 소비자 컨트랙트(Hyrum의 법칙을 의식한)는 불가침이며, 성능 개선은 부수 효과일 뿐 목표가 아님
- 검증 가능성: 안전망 없이 구조를 바꾸지 않음. 안전망이 없거나 약하면 특성화(골든 마스터) 테스트를 먼저 별도 커밋으로 작성
- 점진성: 커밋 하나에 이름 붙은 변환 하나. 반복해서 실패하면 미카도 방식으로 선행 조건을 기록하고 완전히 되돌린 뒤 재귀
- 분리(두 모자): 리팩터링 커밋에 동작 변경을 절대 섞지 않음(`refactor:` 타입만)
- 경제성: 가독성이 가장 큰 목표이며, 삭제 예정 코드나 변경이 드문 차가운 코드는 리팩터링하지 않음
- 관례에서 벗어나려면 로컬 수정이 아니라 oma-architecture의 ADR 경로를 거쳐야 하고, 모든 지표는 대리 지표입니다(굿하트의 법칙)

**워크플로우:** PREPARE(그린필드·브라운필드 분류, 크기 게이트, 핫스팟 순위) → ACQUIRE(심볼 도구로 코드 읽기, 지표와 git 신호 수집) → REASON(원자적 변환 순서 또는 expand-contract 계획) → ACT(엔진 우선 변환 하나) → VERIFY(테스트를 그대로 다시 돌려 통과하면 커밋, 실패하면 미카도 되돌리기) → FINALIZE(지표 변화와 가독성 판정).

**리소스:** `definition.md`, `measurement.md`, `governance.md`, 그리고 공유 리소스 `context-loading`, `quality-principles`.

---

### oma-scholar

**도메인:** Knows `.knows.yaml` 사이드카 스펙을 쓰는 학술 연구 도우미. 구조화된 논문 사이드카를 생성하고, 검증하고, 리뷰하고, 조회하고, 비교하며, knows.academy에서 가져옵니다.

**사용 시기:** 사이드카로 논문을 토큰 효율적으로 읽을 때(주장만 볼 때 약 700토큰, 전체 PDF는 약 10K), 초안·LaTeX·노트에서 `.knows.yaml`을 생성할 때, 공유 전에 사이드카 구조를 검증할 때, 동료 검토를 사이드카로 작성할 때, 기존 사이드카를 조회하거나 요약할 때, 두 논문을 구조적으로 비교할 때, knows.academy에서 검색하거나 가져올 때.

**사용하지 말아야 할 때:** 일반 웹 검색이나 비학술 콘텐츠(oma-search 사용), 논문 번역(oma-translation 사용), 사이드카 없이 PDF만 파싱할 때(oma-pdf 사용), 편집 시스템까지 포함한 전체 동료 검토 워크플로우.

**모드:** Generate, Validate, Review, Analyze, Compare, Remote(검색·가져오기).

**핵심 규칙:**
- 목표 스펙은 v0.9.0 / `paper@1` 프로파일이며, 사이드카는 호스트 LLM이 생성합니다(외부 LLM SDK를 셸로 호출하지 않습니다)
- 날조 방지: DOI·게재지·연도가 원문에서 보이지 않으면 키 자체를 생략하고, `doi: TODO`를 쓰거나 추측하지 않음
- 필드 이름은 정확하게, `provenance.actor`는 객체 하나로, 열거형은 닫힌 집합으로, 숫자는 따옴표 없이
- 관계 밀도는 진술당 1.5 이상, 모든 주장에는 `supported_by` 근거가 필요
- 공유 전에 검증(`oma scholar lint`). 서드파티 사이드카에는 `--lenient` 사용
- 오래되었거나 2026년 이전 논문은 knows.academy에서 OpenAlex로 폴백하며, 공개 프록시 API는 인증이 필요 없음

**워크플로우:** PREPARE(모드와 원본) → ACQUIRE(메타데이터, 절, 또는 로컬 텍스트) → REASON(주장·근거·관계 추출) → ACT(생성·검증·리뷰·분석·비교·가져오기) → VERIFY(스키마, 열거형, ID, 관계) → FINALIZE(사이드카·보고서·요약과 유의 사항).

**리소스:** `execution-protocol.md`, `sidecar-spec.md`, `api-endpoints.md`, `setup-openalex.md`, `upstream-spec-cache.md`, `fallback-providers.md`, `checklist.md`, 그리고 `config/scholar-config.yaml`.

---

### oma-skill-creation

**도메인:** SSL-lite 마크다운 형식(Scheduling / Structural Flow / Logical Operations / References)으로 OMA 스킬을 작성하고 검증합니다.

**사용 시기:** `.agents/skills/{name}/SKILL.md`에 새 스킬을 만들 때, 기존 스킬을 SSL-lite 형식으로 갱신할 때, 실행 비중이 큰 스킬에 정규 명령이나 워크플로우 경로를 넣을 때, 스킬에 라우팅·실행·검증·복구 정보가 충분한지 감사할 때, 예시를 본문에 둘지 `resources/`로 뺄지 정할 때.

**사용하지 말아야 할 때:** 서드파티 스킬을 `$CODEX_HOME/skills`에 설치할 때(외부 영역), Codex 플러그인 번들을 만들 때(외부 영역), 스킬 작성과 무관한 일반 프로젝트 계획을 세울 때(oma-pm 사용), 제품·인프라·프론트엔드·백엔드·모바일 코드를 직접 고칠 때(해당 전문 스킬 사용).

**핵심 규칙:**
- 최상위 네 섹션을 그대로 유지: Scheduling, Structural Flow, Logical Operations, References
- YAML 프론트매터에 명확한 `name`과 `description`을 두고, description을 수정한 뒤에는 `oma skill audit`을 실행(TF-IDF 코사인 60% 이상 경고, 75% 이상 실패)
- 인접 스킬로 연결되는 구체적인 `When NOT to use` 경계를 포함
- 인라인 정규 경로를 정확히 하나만 추가(깨지기 쉽고 반복되는 명령에는 `Canonical command path`, 판단과 조사 흐름에는 `Canonical workflow path`)
- 변형별 긴 설명은 본문이 아니라 `resources/`에 두고, 스킬 안에 README·체인지로그·설치 문서를 만들지 않음

**워크플로우:** PREPARE(목적, 트리거, 경계, 입출력, 의존성) → ACQUIRE(비슷한 스킬 1~3개와 관례 읽기) → REASON(본문에 둘지 `resources/`로 뺄지) → ACT(SSL-lite 템플릿으로 초안 작성) → VERIFY(구조·라우팅·실행·형식 검사) → FINALIZE(변경 파일과 검증 보고서).

**리소스:** `ssl-lite-template.md`, `validation-checklist.md`, 그리고 공유 리소스 `context-loading`, `quality-principles`.

---

### oma-slide

**도메인:** 1920×1080 고정 스테이지에서 애니메이션이 풍부한 HTML 발표 덱을 생성하고, `oma slide` CLI로 결정론적으로 검증·번들·내보내기(PDF/PNG/PPTX)를 수행합니다.

**사용 시기:** 주제나 개요로 새 발표 자료를 만들 때, 기존 덱을 개선하거나 형식을 바꿀 때, 애니메이션과 디자인 원칙을 적용한 슬라이드별 HTML을 생성할 때, 덱을 PDF/PNG/PPTX로 내보낼 때, 이름 붙은 스타일 프리셋을 적용할 때, Canva로 내보내거나 가져올 때.

**사용하지 말아야 할 때:** 슬라이드가 없는 일반 문서를 만들 때, 이미지 생성만 필요할 때(oma-image 직접 사용), 브랜드나 디자인 시스템을 정의할 때(oma-design 사용), 생성 없이 결정론적 CLI 작업만 할 때(`oma slide` CLI를 직접 호출).

**핵심 규칙:**
- 스킬은 HTML만 작성하고, 나머지(스캐폴드, 검증, 번들, 내보내기)는 전부 CLI가 담당
- 로컬 에셋만 사용: `<img src>`와 `<video src>`에 원격 URL을 쓰지 않고 `./assets/<file>`만 씀
- 한국어·일본어·중국어 슬라이드에는 Pretendard 폰트 필수
- 모든 슬라이드에 `prefers-reduced-motion` 래퍼, 눈에 보이는 포커스 상태, `data-om-validate` 필수
- 검증 자동 수정은 최대 3회까지 돌리고, 그 뒤에는 diff를 사용자에게 보여줌
- 이미지 생성은 oma-image에 위임하며, Canva MCP는 선택 사항이고 사용자가 명시적으로 동의할 때만 자동 프로비저닝

**워크플로우:** 7단계입니다. DETECT(모드) → DISCOVER(명확화와 에셋 평가) → STYLE(라이브 미리보기 3개를 보여주고 사용자가 선택) → GENERATE(1920×1080 `slide-NN.html`) → VALIDATE(`oma slide validate`, 자동 수정 3회 이하) → REVIEW(뷰어와 선택적 bbox 편집기) → DELIVER(`bundle`과 선택적 PDF/PNG/PPTX 내보내기).

**리소스:** `generation-protocol.md`, `design-doctrine.md`, `fixed-stage.md`, `style-presets.md`, `selection-index.json`, `animation-patterns.md`, `canva-integration.md`, `checklist.md`, 그리고 `assets/` 디렉토리.

---

### oma-video

**도메인:** 키가 선택 사항인 3계층(CLI 우선 / MCP / 안내형) 프로바이더 라우터로 숏폼, 설명, 데모 영상을 생성합니다. 스크립트 → 내레이션 → 비주얼 → 자막 → Remotion 렌더 순으로 조합합니다.

**사용 시기:** 주제로 숏폼 영상(숏츠·릴스, 9:16)을 만들 때, README·코드·데이터로 설명 영상(16:9 또는 9:16)을 만들 때, 화면 캡처(`--source file`)나 감독하에 진행하는 웹 앱 헤디드 캡처(`--source web`)로 데모와 워크스루를 만들 때, 기존 실행을 결정론적으로 다시 렌더링할 때.

**사용하지 말아야 할 때:** 정지 이미지 한 장을 만들 때(oma-image 사용), 슬라이드 덱을 만들 때(oma-slide 사용. 설명 영상 프레임을 위해 video가 내부적으로 호출합니다), 음성 오디오만 만들 때(oma-voice 사용), 이미 완성된 mp4를 비선형 편집할 때, 라이브 스트리밍(감독하의 웹 캡처는 범위 안입니다).

**핵심 규칙:**
- 호출 전에 모드를 명확히 하거나 추론하고, 모호한 브리프로 조용히 렌더링하지 말고 추론한 계획을 사용자에게 보여주기
- 키가 선택 사항인 디스패치: 모든 외부 기능에 실제 경로와 키 없는 폴백이 함께 있으며, 유료 프로바이더(Pexels, Pixelle)는 환경 키가 있을 때만 자동 활성화
- 비용 가드레일은 `$0.20` 이상(`--yes` / `OMA_VIDEO_YES=1`로 우회), 길이는 180초, 장면은 40개까지
- 결정적 출력: `render-spec.json`과 에셋(시드와 임베드된 Pretendard 포함)이 결정성의 경계이며, `OMA_VIDEO_MOCK=1`은 골든 픽스처를 재생
- 데모는 사람이 개입합니다. 웹 캡처는 헤디드 브라우저를 열고 사람이 흐름을 진행하는 동안 녹화만 하며, 자격 증명을 자동화하지 않습니다. `--url`과 토큰은 로그와 매니페스트에서 마스킹됩니다
- 경로 안전성(`$PWD` 밖으로 출력하려면 `--allow-external-out`)

**워크플로우:** PREPARE(모드·화면비·로케일, 브리프 명확화와 보강) → ACQUIRE(프로바이더 가용성 확인, 캡처 경로 검증, 비용 확인) → ACT(스크립트 → 음성과 비주얼과 자막 → render-spec → 렌더) → VERIFY(스키마, 매니페스트 해시, 종료 코드, mp4) → FINALIZE(실행 디렉토리, mp4 경로, 커버리지 경고).

**리소스:** `execution-protocol.md`, `vendor-matrix.md`, `prompt-tips.md`, `checklist.md`, 그리고 벤더링된 `remotion/` 컴포지터, 웹 캡처 드라이버, `mpt/` 폴백 컴포지터, `config/video-config.yaml`.

---

### oma-voice

**도메인:** Voicebox MCP 서버를 통한 로컬 우선 TTS와 STT입니다. 전부 온디바이스에서 돌고, 클라우드도 API 키도 호출당 비용도 없습니다.

**사용 시기:** 에이전트 작업 완료나 차단 상황을 알리는 짧은 알림 오디오를 만들 때, 보이스오버·내레이션·오디오 에셋(mp3 또는 wav)을 만들 때, 로컬 오디오 파일(mp3, wav, m4a, webm, flac)을 Markdown으로 전사할 때, 같은 텍스트를 다른 프로필 id로 다시 돌려 음성 프로필을 비교할 때.

**사용하지 말아야 할 때:** 클라우드 TTS나 고품질 다국어 클라우드 음성이 필요할 때, 터미널에서 실시간 마이크 받아쓰기를 할 때(Voicebox의 핫키 딕테이션 사용), 음성 복제 샘플 업로드나 프로필 생성(Voicebox 데스크톱 앱 UI에서 처리), 영상·음악·사운드 디자인.

**핵심 규칙:**
- Voicebox 필수: 핸드셰이크나 `GET /health`가 실패하면 설치·실행 힌트를 한 번 보여주고 종료합니다. 재시도하거나 자동으로 다시 띄우지 않습니다
- 프로필 필수: `voicebox_list_profiles`가 비어 있으면 앱 UI를 안내하고 종료
- 길이 제한: TTS는 호출당 5000자(2000자에서 경고), STT는 30분입니다. v1은 자동 분할하지 않습니다
- 자동 호출의 투명성: 알림은 작업이 `auto_notify_after_sec`(기본 60초)를 넘을 때만 발동하며, 항상 한 줄로 의도를 밝힙니다
- 경로 안전성(`$PWD` 밖으로 출력하면 경고하고 확인), SIGINT 시 부분 출력을 남기지 않음
- 생성마다 매니페스트 필수. 비용 가드는 없습니다(Voicebox는 무료입니다)

**워크플로우:** PREPARE(텍스트·오디오·언어·경로·프로필 검증) → ACQUIRE(신호가 빠졌으면 한 번만 명확화) → ACT(MCP `voicebox_speak` 또는 `voicebox_transcribe`) → VERIFY(오디오·전사 존재 여부와 매니페스트 필드) → FINALIZE(`manifest.json` 작성, 경로 보고).

**리소스:** `voice-matrix.md`, `prompt-tips.md`, `execution-protocol.md`, `checklist.md`, 그리고 `config/voice-config.yaml`.

---

## Charter Preflight (CHARTER_CHECK)

코드를 작성하기 전에 모든 구현 에이전트는 CHARTER_CHECK 블록을 출력해야 합니다:

```
CHARTER_CHECK:
- Clarification level: {LOW | MEDIUM | HIGH}
- Task domain: {에이전트 도메인}
- Must NOT do: {태스크 범위에서 3가지 제약}
- Success criteria: {측정 가능한 기준}
- Assumptions: {적용된 기본값}
```

**목적:**
- 에이전트가 무엇을 할 것이고 무엇을 하지 않을 것인지 선언
- 코드 작성 전에 범위 확장을 방지
- 사용자가 검토할 수 있도록 가정을 명시
- 테스트 가능한 성공 기준 제공

**명확화 수준:**
- **LOW**: 명확한 요구사항. 명시된 가정으로 진행.
- **MEDIUM**: 부분적으로 모호함. 옵션 나열, 가장 가능성 높은 것으로 진행.
- **HIGH**: 매우 모호함. 상태를 blocked로 설정, 질문 나열, 코드 작성 금지.

서브에이전트 모드(CLI로 스폰됨)에서 에이전트는 사용자에게 직접 질문할 수 없습니다. LOW는 진행, MEDIUM은 범위를 좁혀 해석, HIGH는 차단하고 오케스트레이터에게 전달할 질문을 반환합니다.

---

## 2계층 스킬 로딩

각 에이전트의 지식은 두 계층으로 나뉩니다:

**Layer 1: SKILL.md (~800바이트):**
항상 로딩됩니다. 프론트매터(이름, 설명), 사용 시기 / 사용하지 말아야 할 때, 핵심 규칙, 아키텍처 개요, 라이브러리 목록, Layer 2 리소스에 대한 참조가 포함됩니다.

**Layer 2: resources/ (필요 시 로딩):**
에이전트가 활발히 작업할 때만 로딩되며, 태스크 유형과 난이도에 맞는 리소스만 로딩됩니다:

| 난이도 | 로딩되는 리소스 |
|-----------|-----------------|
| **Simple** | execution-protocol.md만 |
| **Medium** | execution-protocol.md + examples.md |
| **Complex** | execution-protocol.md + examples.md + tech-stack.md + snippets.md |

실행 중 필요에 따라 추가 리소스가 로딩됩니다:
- `checklist.md`: Verify 단계에서
- `error-playbook.md`: 에러 발생 시에만
- `common-checklist.md`: Complex 태스크의 최종 검증에서

---

## 범위 제한 실행

에이전트는 엄격한 도메인 경계 내에서 작동합니다:

- 프론트엔드 에이전트는 백엔드 코드를 수정하지 않음
- 백엔드 에이전트는 UI 컴포넌트를 건드리지 않음
- DB 에이전트는 API 엔드포인트를 구현하지 않음
- 에이전트는 다른 에이전트를 위한 범위 외 의존성을 문서화

실행 중 다른 도메인에 속하는 태스크가 발견되면, 에이전트는 직접 처리하려 하지 않고 결과 파일에 에스컬레이션 항목으로 문서화합니다.

---

## 워크스페이스 전략

멀티 에이전트 프로젝트에서 별도의 워크스페이스는 파일 충돌을 방지합니다:

```
./apps/api      → 백엔드 에이전트 워크스페이스
./apps/web      → 프론트엔드 에이전트 워크스페이스
./apps/mobile   → 모바일 에이전트 워크스페이스
```

워크스페이스는 에이전트를 스폰할 때 `-w` 플래그로 지정합니다:

```bash
oma agent spawn backend "Implement auth API" session-01 -w ./apps/api
oma agent spawn frontend "Build login form" session-01 -w ./apps/web
```

---

## 오케스트레이션 흐름

멀티 에이전트 워크플로우(`/orchestrate` 또는 `/work`) 실행 시:

1. **PM 에이전트**가 요청을 우선순위(P0, P1, P2)와 의존성이 있는 도메인별 태스크로 분해
2. **세션 초기화**: 세션 ID 생성, 메모리에 `orchestrator-session.md`와 `task-board.md` 생성
3. **P0 태스크** 병렬 스폰 (최대 MAX_PARALLEL 동시 에이전트)
4. **진행 상황 모니터링**: 오케스트레이터가 매 POLL_INTERVAL마다 `progress-{agent}.md` 파일 폴링
5. **P1 태스크** P0 완료 후 스폰, 이후 동일
6. **검증 루프**: 완료된 에이전트마다 실행 (자체 리뷰 -> 자동화 검증 -> QA의 크로스 리뷰)
7. **결과 수집**: 모든 `result-{agent}.md` 파일에서 결과를 모음
8. **최종 보고서**: 세션 요약, 변경된 파일, 남은 이슈 포함

---

## 에이전트 정의

에이전트는 두 위치에 정의됩니다:

**`.agents/agents/`**: 추상 원본(source of truth) 에이전트 정의가 있는 곳입니다. 예를 들면 다음과 같습니다.
- `backend-engineer.md`
- `frontend-engineer.md`
- `mobile-engineer.md`
- `db-engineer.md`
- `qa-reviewer.md`
- `debug-investigator.md`
- `pm-planner.md`
- `architecture-reviewer.md`
- `tf-infra-engineer.md`

이 파일은 에이전트의 정체성, 실행 프로토콜 참조, CHARTER_CHECK 템플릿, 아키텍처 요약, 규칙을 정의합니다. Task/Agent 도구(Claude Code) 또는 CLI를 통해 서브에이전트를 스폰할 때 사용됩니다.

**벤더 네이티브 투사**: OMA는 원본 정의를 런타임별 에이전트 파일로 실체화합니다.
- `.claude/agents/*.md`
- `.codex/agents/*.toml`
- `.gemini/agents/*.md`

이렇게 생성된 파일은 `oma link`, `oma install`, `oma update`가 갱신합니다.

---

## 런타임 상태 (프로젝트 메모리 저장소)

오케스트레이션 세션 중 에이전트는 `.agents/state/memories/`의 공유 메모리 파일을 통해 조율합니다(예전 프로젝트는 레거시 `.serena/memories/` 경로로 폴백하며, `mcp.json`에서 설정할 수 있습니다):

| 파일 | 소유자 | 목적 | 다른 에이전트 |
|------|-------|---------|--------|
| `orchestrator-session.md` | 오케스트레이터 | 세션 ID, 상태, 시작 시간, 단계 추적 | 읽기 전용 |
| `task-board.md` | 오케스트레이터 | 태스크 할당, 우선순위, 상태 업데이트 | 읽기 전용 |
| `progress-{agent}.md` | 해당 에이전트 | 턴별 진행 상황: 수행한 작업, 읽기/수정한 파일, 현재 상태 | 오케스트레이터가 읽음 |
| `result-{agent}.md` | 해당 에이전트 | 최종 출력: 상태(완료/실패), 요약, 변경된 파일, 인수 기준 체크리스트 | 오케스트레이터가 읽음 |
| `session-metrics.md` | 오케스트레이터 | Clarification Debt 추적, Quality Score 진행 | QA가 읽음 |
| `experiment-ledger.md` | 오케스트레이터/QA | Quality Score 활성 시 실험 추적 | 모두 읽음 |

메모리 도구는 설정 가능합니다. 기본값은 Serena MCP(`read_memory`, `write_memory`, `edit_memory`)를 사용하지만, 커스텀 도구를 `mcp.json`에서 설정할 수 있습니다:

```json
{
  "memoryConfig": {
    "provider": "serena",
    "basePath": ".serena/memories",
    "tools": {
      "read": "read_memory",
      "write": "write_memory",
      "edit": "edit_memory"
    }
  }
}
```

대시보드(`oma dashboard terminal` 및 `oma dashboard web`)는 실시간 모니터링을 위해 이 메모리 파일을 감시합니다.
