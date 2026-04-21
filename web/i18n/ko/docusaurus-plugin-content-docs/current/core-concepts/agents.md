---
title: 에이전트
description: oh-my-agent 21개 에이전트의 완전한 레퍼런스 — 도메인, 기술 스택, 리소스 파일, 기능, Charter Preflight 프로토콜, 2계층 스킬 로딩, 범위 제한 실행 규칙, 품질 게이트, 워크스페이스 전략, 오케스트레이션 흐름, 런타임 메모리.
---

# 에이전트

oh-my-agent의 에이전트는 전문화된 엔지니어링 역할입니다. 각 에이전트는 정의된 도메인, 기술 스택 지식, 리소스 파일, 품질 게이트, 실행 제약을 갖고 있습니다. 에이전트는 범용 챗봇이 아닙니다 — 자신의 영역 안에서 체계적인 프로토콜을 따르는 범위가 한정된 작업자입니다.

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
| **현지화** | oma-translator | 톤, 레지스터, 도메인 용어를 유지하는 컨텍스트 인식 번역 |
| **조율** | oma-orchestrator, oma-coordination | 자동화 및 수동 멀티 에이전트 오케스트레이션 |
| **Git** | oma-scm | Conventional Commits 생성, 기능별 커밋 분할 |
| **검색 및 탐색** | oma-search | 신뢰도 점수가 있는 의도 기반 검색 라우터 (Context7 문서, 웹, `gh`/`glab` 코드, Serena 로컬) |
| **회고** | oma-recap | 크로스 도구 대화 이력 분석 및 주제별 작업 요약 |
| **문서 처리** | oma-hwp, oma-pdf | LLM/RAG 인제스션을 위한 HWP/HWPX/HWPML 및 PDF → Markdown 변환 |

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
- YAGNI — 필요한 것만 설계

**워크플로우:** 6단계: 컨텍스트 탐색, 질문, 접근 방식, 설계, 문서화(`docs/plans/`에 저장), `/plan`으로 전환.

**리소스:** 공유 리소스만 사용 (clarification-protocol, reasoning-templates, quality-principles, skill-routing).

---

### oma-architecture

**도메인:** 소프트웨어/시스템 아키텍처 — 모듈·서비스 경계, 트레이드오프 분석, 이해관계자 종합, 의사결정 기록.

**사용 시기:** 시스템 아키텍처 선택 또는 검토, 모듈/서비스/오너십 경계 정의, 명시적 트레이드오프와 함께 아키텍처 대안 비교, 아키텍처적 문제(변경 증폭, 숨은 의존성, 어색한 API) 진단, 아키텍처 투자 또는 리팩토링 우선순위 결정, 아키텍처 권고안 또는 ADR 작성.

**사용하지 말아야 할 때:** 시각/디자인 시스템(oma-design 사용), 기능 계획 및 태스크 분해(oma-pm 사용), Terraform 구현(oma-tf-infra 사용), 버그 진단(oma-debug 사용), 보안/성능/접근성 리뷰(oma-qa 사용).

**방법론:** 진단 라우팅, design-twice 비교, ATAM 방식 리스크 분석, CBAM 방식 우선순위화, ADR 방식 의사결정 기록.

**핵심 규칙:**
- 방법을 선택하기 전에 아키텍처 문제를 진단
- 현재 의사결정에 가장 가볍고 충분한 방법론을 사용
- 아키텍처 설계를 UI/시각 디자인 및 Terraform 전달과 구분
- 의사결정이 비용을 정당화할 만큼 교차적일 때만 이해관계자 에이전트에 자문
- 권고의 품질이 합의 연극보다 중요: 폭넓게 자문하되 명시적으로 결정
- 모든 권고는 가정, 트레이드오프, 리스크, 검증 단계를 명시
- 기본적으로 비용을 의식: 구현 비용, 운영 비용, 팀 복잡도, 향후 변경 비용

**리소스:** `SKILL.md`, 방법론 가이드가 포함된 `resources/` 디렉토리(diagnostic-routing, design-twice, ATAM, CBAM, ADR 템플릿).

---

### oma-pm

**도메인:** 프로덕트 관리 — 요구사항 분석, 태스크 분해, API 컨트랙트.

**사용 시기:** 복잡한 기능 분해, 실현 가능성 판단, 우선순위 결정, API 컨트랙트 정의.

**핵심 규칙:**
- API 우선 설계: 구현 태스크 전에 컨트랙트 정의
- 모든 태스크에: 에이전트, 제목, 인수 기준, 우선순위, 의존성 포함
- 최대 병렬 실행을 위해 의존성 최소화
- 보안과 테스팅은 모든 태스크의 일부 (별도 단계가 아님)
- 태스크는 단일 에이전트가 완료 가능해야 함
- 오케스트레이터 호환성을 위한 JSON 계획 + task-board.md 출력

**출력:** `.agents/results/plan-{sessionId}.json`, `.agents/results/current-plan.md`, 오케스트레이터용 메모리 기록.

**리소스:** `execution-protocol.md`, `examples.md`, `iso-planning.md`, `task-template.json`, `../_shared/core/api-contracts/`.

**턴 제한:** 기본 10, 최대 15.

---

### oma-frontend

**도메인:** 웹 UI — React, Next.js, TypeScript와 FSD-lite 아키텍처.

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
- 3단계를 넘는 prop drilling 금지 — Jotai 아톰 사용
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

**스택 감지:** 프로젝트 매니페스트(pyproject.toml, package.json, Cargo.toml, go.mod 등)를 읽어 언어와 프레임워크를 결정합니다. `stack/` 디렉토리가 있으면 폴백하거나, 사용자에게 `/stack-set` 실행을 요청합니다.

**핵심 규칙:**
- 클린 아키텍처: 라우트 핸들러에 비즈니스 로직 금지
- 프로젝트의 유효성 검사 라이브러리로 모든 입력 검증
- 파라미터화된 쿼리만 사용 (SQL에서 문자열 보간 금지)
- 인증에 JWT + bcrypt; 인증 엔드포인트 속도 제한
- 지원되는 곳에서 비동기; 모든 시그니처에 타입 어노테이션
- 중앙 집중식 에러 모듈을 통한 커스텀 예외
- 명시적 ORM 로딩 전략, 트랜잭션 경계, 안전한 라이프사이클

**리소스:** `execution-protocol.md`, `examples.md`, `orm-reference.md`, `checklist.md`, `error-playbook.md`. `stack/`의 스택별 리소스(`/stack-set`으로 생성): `tech-stack.md`, `snippets.md`, `api-template.*`, `stack.yaml`.

**턴 제한:** 기본 20, 최대 30.

---

### oma-mobile

**도메인:** 크로스 플랫폼 모바일 앱 — Flutter, React Native.

**사용 시기:** 네이티브 모바일 앱(iOS + Android), 모바일 특화 UI 패턴, 플랫폼 기능(카메라, GPS, 푸시 알림), 오프라인 우선 아키텍처.

**아키텍처:** 클린 아키텍처: domain -> data -> presentation.

**기술 스택:** Flutter/Dart, Riverpod/Bloc (상태 관리), Dio with interceptors (API), GoRouter (네비게이션), Material Design 3 (Android) + iOS HIG.

**핵심 규칙:**
- 상태 관리에 Riverpod/Bloc (복잡한 로직에 raw setState 금지)
- 모든 컨트롤러를 `dispose()` 메서드에서 해제
- API 호출에 interceptors가 있는 Dio; 오프라인을 우아하게 처리
- 60fps 목표; 양 플랫폼에서 테스트

**리소스:** `execution-protocol.md`, `tech-stack.md`, `snippets.md`, `screen-template.dart`, `checklist.md`, `error-playbook.md`, `examples.md`.

**턴 제한:** 기본 20, 최대 30.

---

### oma-db

**도메인:** 데이터베이스 아키텍처 — SQL, NoSQL, 벡터 데이터베이스.

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

**리소스:** `execution-protocol.md`, `anti-patterns.md`, `checklist.md`, `design-md-spec.md`, `design-tokens.md`, `prompt-enhancement.md`, `stitch-integration.md`, `error-playbook.md`, 그리고 `reference/` 디렉토리(typography, color-and-contrast, spatial-design, motion-design, responsive-design, component-patterns, accessibility, shader-and-3d)와 `examples/` (design-context-example, landing-page-prompt).

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

**사용 시기:** 관측성 파이프라인 구축(OTel SDK + Collector + 벤더 백엔드), 서비스 및 도메인 경계를 아우르는 추적성(W3C propagator, baggage, 멀티테넌트, 멀티 클라우드), 전송 계층 튜닝(UDP/MTU 임계값, OTLP gRPC vs HTTP, Collector DaemonSet vs 사이드카 토폴로지, 샘플링 레시피), 인시던트 포렌식(6차원 국소화: code / service / layer / host / region / infra), 벤더 카테고리 선택(OSS 풀스택 vs 상용 SaaS vs 고 카디널리티 전문 vs 프로파일링 전문), observability-as-code(Grafana Jsonnet 대시보드, PrometheusRule CRD, OpenSLO YAML, SLO burn-rate 알람), 메타 관측성(파이프라인 자체 건강성, 클록 스큐, 카디널리티 가드레일, 보관 매트릭스), MELT+P 시그널 커버리지(metrics, logs, traces, profiles, cost, audit, privacy), 사용 중단 도구로부터의 마이그레이션(Fluentd -> Fluent Bit 또는 OTel Collector).

**사용하지 말아야 할 때:** LLM ops / gen_ai 관측성(Langfuse, Arize Phoenix, LangSmith, Braintrust 사용), 데이터 파이프라인 lineage(OpenLineage + Marquez, dbt test, Airflow lineage), IoT / 데이터센터 물리 계층 텔레메트리(Nlyte, Sunbird, Device42), 카오스 엔지니어링 오케스트레이션(Chaos Mesh, Litmus, Gremlin, ChaosToolkit), GPU / TPU 인프라(NVIDIA DCGM Exporter), 소프트웨어 공급망(sigstore, in-toto, SLSA), 인시던트 대응 워크플로우 / 페이징(PagerDuty, OpsGenie, Grafana OnCall), 해당 벤더의 고유 스킬로 이미 다루는 단일 벤더 셋업.

**핵심 규칙:**
- 라우팅 전에 의도 분류: setup | migrate | investigate | alert | trace | tune | route
- 벤더 레지스트리가 아닌 카테고리 우선: `resources/vendor-categories.md`를 통해 벤더 소유 스킬에 위임하고 벤더 문서를 중복 작성하지 않음
- 전송 계층 튜닝이 해자(moat): UDP/MTU 임계값, OTLP 프로토콜 선택, Collector 토폴로지, 샘플링 레시피는 다른 스킬이 다루지 않는 깊이
- 메타 관측성은 타협 불가: 셋업 완료를 선언하기 전에 파이프라인 자체 건강성, 클록 동기화(< 100 ms 드리프트), 카디널리티, 보관을 검증
- CNCF 우선 선호: Prometheus, Jaeger, Thanos, Fluent Bit, OpenTelemetry, Cortex, OpenCost, OpenFeature, Flagger, Falco
- Fluentd는 사용 중단(CNCF 2025-10): 신규 및 마이그레이션 작업에는 Fluent Bit 또는 OTel Collector 권장
- W3C Trace Context가 기본 propagator; 클라우드별 변환(AWS X-Ray `X-Amzn-Trace-Id`, GCP Cloud Trace, Datadog, Cloudflare, Linkerd)
- 기능보다 프라이버시 우선: PII 마스킹, 샘플링 인식 baggage 규칙, SOC2/ISO 불변 감사 + GDPR/PIPA 삭제권은 저장이 아닌 수집 시점에 적용

**리소스:** `SKILL.md`, `resources/execution-protocol.md`, `resources/intent-rules.md`, `resources/vendor-categories.md`, `resources/matrix.md`, `resources/checklist.md`, `resources/anti-patterns.md`, `resources/examples.md`, `resources/meta-observability.md`, `resources/observability-as-code.md`, `resources/incident-forensics.md`, `resources/standards.md`, 그리고 `resources/layers/` 하위 심화 리소스(L3-network, L4-transport, L7-application, mesh), `resources/signals/`(metrics, logs, traces, profiles, cost, audit, privacy), `resources/transport/`(collector-topology, otlp-grpc-vs-http, sampling-recipes, udp-statsd-mtu), `resources/boundaries/`(cross-application, multi-tenant, release, slo).

---

### oma-qa

**도메인:** 품질 보증 — 보안, 성능, 접근성, 코드 품질.

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
- 오탐 금지 — 모든 발견 사항은 재현 가능해야 함
- 설명만이 아닌 수정 코드 제공

**리소스:** `execution-protocol.md`, `iso-quality.md`, `checklist.md`, `self-check.md`, `error-playbook.md`, `examples.md`.

**턴 제한:** 기본 15, 최대 20.

---

### oma-debug

**도메인:** 버그 진단 및 수정.

**사용 시기:** 사용자 보고 버그, 크래시, 성능 문제, 간헐적 장애, 레이스 컨디션, 회귀 버그.

**방법론:** 먼저 재현, 그다음 진단. 절대 수정을 추측하지 않음.

**핵심 규칙:**
- 증상이 아닌 근본 원인 식별
- 최소 수정: 필요한 것만 변경
- 모든 수정에 회귀 테스트
- 다른 곳에서 유사한 패턴 검색
- `.agents/results/bugs/`에 문서화

**사용하는 Serena MCP 도구:**
- `find_symbol("functionName")` — 함수 위치 찾기
- `find_referencing_symbols("Component")` — 모든 사용처 찾기
- `search_for_pattern("error pattern")` — 유사한 문제 찾기

**리소스:** `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`, `examples.md`.

**턴 제한:** 기본 15, 최대 25.

---

### oma-translator

**도메인:** 컨텍스트 인식 다국어 번역.

**사용 시기:** UI 문자열, 문서, 마케팅 카피 번역, 기존 번역 검토, 용어집 생성.

**4단계 방법:** 원문 분석(레지스터, 의도, 도메인 용어, 문화적 참조, 감정적 함의, 비유적 언어 매핑) -> 의미 추출(원문 구조 제거) -> 대상 언어로 재구성(자연스러운 어순, 레지스터 매칭, 문장 분할/병합) -> 검증(자연스러움 루브릭 + 안티 AI 패턴 검사).

**출판 품질을 위한 선택적 7단계 정제 모드:** 비평적 리뷰, 수정, 다듬기 단계가 추가됩니다.

**핵심 규칙:**
- 먼저 기존 로케일 파일을 스캔하여 규칙에 맞추기
- 단어가 아닌 의미를 번역
- 감정적 함의 유지
- 직역 금지
- 하나의 글 내에서 레지스터 혼합 금지
- 도메인 특정 용어는 원문 그대로 유지

**리소스:** `translation-rubric.md`, `anti-ai-patterns.md`.

---

### oma-orchestrator

**도메인:** CLI 스폰을 통한 자동화된 멀티 에이전트 조율.

**사용 시기:** 여러 에이전트가 병렬로 필요한 복잡한 기능, 자동화된 실행, 풀스택 구현.

**설정 기본값:**

| 설정 | 기본값 | 설명 |
|---------|---------|-------------|
| MAX_PARALLEL | 3 | 최대 동시 서브에이전트 수 |
| MAX_RETRIES | 2 | 실패한 태스크 당 재시도 횟수 |
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

**사용하지 말 것:** 완전 자동 병렬 실행(oma-orchestrator 사용), 단일 도메인 작업(해당 도메인 에이전트 직접 사용).

**핵심 규칙:**
- 에이전트 스폰 전 반드시 계획을 사용자에게 확인
- 한 번에 하나의 우선순위 티어만 — 완료 후 다음 티어 진행
- 사용자가 각 게이트 전환을 승인
- 머지 전 QA 리뷰 필수
- CRITICAL/HIGH 이슈에 대한 수정 반복 루프

**워크플로우:** PM 계획 → 사용자 확인 → 우선순위별 스폰 → 모니터링 → QA 리뷰 → 이슈 수정 → 배포.

**oma-orchestrator와 차이:** coordination은 수동 가이드(사용자가 속도 제어), orchestrator는 자동(최소 사용자 개입으로 에이전트가 스폰·실행).

---

### oma-search

**도메인:** 도메인 신뢰도 점수를 사용하는 의도 기반 검색 라우터 — 쿼리를 Context7(문서), 네이티브 웹 검색, `gh`/`glab`(코드), Serena(로컬)로 라우팅.

**사용 시기:** 공식 라이브러리/프레임워크 문서 찾기, 튜토리얼/예제/비교/솔루션을 위한 웹 리서치, 구현 패턴을 위한 GitHub/GitLab 코드 검색, 검색 채널이 불명확한 쿼리(자동 라우팅), 검색 인프라가 필요한 다른 스킬(공유 호출).

**사용하지 말아야 할 때:** 로컬 전용 코드베이스 탐색(Serena MCP를 직접 사용), Git 이력 또는 blame 분석(oma-scm 사용), 전체 아키텍처 리서치(이 스킬을 내부적으로 호출할 수 있는 oma-architecture 사용).

**핵심 규칙:**
- 검색 전에 의도 분류 — 모든 쿼리는 먼저 IntentClassifier를 통과
- 하나의 쿼리, 하나의 최적 경로 — 의도가 모호하지 않은 한 중복 멀티 라우팅을 피함
- 모든 결과에 신뢰도 점수 — 모든 비로컬 결과는 레지스트리의 도메인 신뢰도 레이블을 받음
- 플래그가 분류기를 우선: `--docs`, `--code`, `--web`, `--strict`, `--wide`, `--gitlab`
- Fail forward: 주 경로가 실패하면 우아하게 폴백(docs→web, web→`oma search fetch` 전략)
- 추가 MCP 불필요: 문서는 Context7, 웹은 런타임 네이티브, 코드는 CLI, 로컬은 Serena
- 벤더 중립 웹 검색: 현재 런타임이 제공하는 무엇이든 사용(WebSearch, Google, Bing)
- 도메인 수준 신뢰도만 — 하위 경로 또는 페이지 수준 점수 없음

**리소스:** `SKILL.md`, 의도 분류기·경로 정의·신뢰 레지스트리가 담긴 `resources/` 디렉토리.

---

### oma-recap

**도메인:** 여러 AI 도구(Claude, Codex, Gemini, Qwen, Cursor)의 대화 이력 분석 및 주제별 일/기간 작업 요약.

**사용 시기:** 하루 또는 기간의 작업 활동 요약, 여러 AI 도구에 걸친 작업 흐름 파악, 세션 간 도구 전환 패턴 분석, 데일리 스탠드업/주간 회고/작업 로그 준비.

**사용하지 말아야 할 때:** Git 커밋 기반의 코드 변경 회고(`oma retro` 사용), 실시간 에이전트 모니터링(`oma dashboard` 사용), 생산성 지표(`oma stats` 사용).

**프로세스:**
1. 자연어 입력(today, yesterday, last Monday, 명시적 날짜)에서 날짜 또는 시간 범위 해석
2. `oma recap --date YYYY-MM-DD` 또는 `--since` / `--until`로 대화 데이터 수집
3. 도구 및 세션별 그룹핑
4. 테마 추출(작업한 기능, 수정한 버그, 탐색한 도구)
5. 주제별 일/기간 요약 렌더링

**리소스:** `SKILL.md` — 무거운 작업은 `oma recap` CLI에 위임.

---

### oma-hwp

**도메인:** `kordoc`을 사용한 HWP / HWPX / HWPML(한글 워드프로세서) → Markdown 변환.

**사용 시기:** 한국어 HWP 문서(`.hwp`, `.hwpx`, `.hwpml`)를 Markdown으로 변환, LLM 컨텍스트 또는 RAG용 한국 정부/기업 문서 준비, HWP에서 구조화된 콘텐츠(표, 헤딩, 목록, 이미지, 각주, 하이퍼링크) 추출.

**사용하지 말아야 할 때:** PDF 파일(oma-pdf 사용), XLSX/DOCX(범위 외), HWP 생성/편집(범위 외), 이미 텍스트 파일(Read 도구 직접 사용).

**핵심 규칙:**
- 실행에 `bunx kordoc@latest` 사용 — 설치 불필요; 항상 `@latest` 또는 고정 버전 전달
- 기본 출력 형식은 Markdown
- 출력 디렉토리가 지정되지 않으면 입력과 동일한 디렉토리에 출력
- kordoc이 구조 보존 처리(헤딩, 표, 중첩 표, 각주, 하이퍼링크, 이미지)
- 보안 방어(ZIP bomb, XXE, SSRF, XSS)는 kordoc이 제공 — 커스텀 방어 추가 금지
- 암호화된 또는 DRM 잠금 HWP의 경우 제한 사항을 사용자에게 명확히 보고
- HTML `<table>` 블록을 GFM 파이프 테이블로 변환하고 Hancom 폰트 Private Use Area 문자를 제거하기 위해 `resources/flatten-tables.ts`로 후처리

**리소스:** `SKILL.md`, `config/`, `resources/flatten-tables.ts`.

---

### oma-pdf

**도메인:** `opendataloader-pdf`를 사용한 PDF → Markdown 변환.

**사용 시기:** LLM 컨텍스트 또는 RAG용 PDF 문서를 Markdown으로 변환, PDF에서 구조화된 콘텐츠(표, 헤딩, 목록) 추출, AI 소비용 PDF 데이터 준비.

**사용하지 말아야 할 때:** PDF 생성/작성(적절한 문서 도구 사용), 기존 PDF 편집(범위 외), 이미 텍스트인 파일의 단순 읽기(Read 도구 직접 사용).

**핵심 규칙:**
- 실행에 `uvx opendataloader-pdf` 사용 — 설치 불필요
- 기본 출력 형식은 Markdown
- 출력 디렉토리가 지정되지 않으면 입력 PDF와 동일한 디렉토리에 출력
- 문서 구조 보존(헤딩, 표, 목록, 이미지)
- 스캔된 PDF의 경우 OCR을 포함한 하이브리드 모드 사용
- Markdown 포매팅 정규화를 위해 항상 출력에 `uvx mdformat` 실행
- 출력 Markdown이 읽을 수 있고 구조적으로 양호한지 검증
- 변환 문제(누락된 표, 깨진 텍스트)를 사용자에게 보고

**리소스:** `SKILL.md`, `config/`, `resources/`.

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

**Layer 1 — SKILL.md (~800바이트):**
항상 로딩됩니다. 프론트매터(이름, 설명), 사용 시기 / 사용하지 말아야 할 때, 핵심 규칙, 아키텍처 개요, 라이브러리 목록, Layer 2 리소스에 대한 참조가 포함됩니다.

**Layer 2 — resources/ (필요 시 로딩):**
에이전트가 활발히 작업할 때만 로딩되며, 태스크 유형과 난이도에 맞는 리소스만 로딩됩니다:

| 난이도 | 로딩되는 리소스 |
|-----------|-----------------|
| **Simple** | execution-protocol.md만 |
| **Medium** | execution-protocol.md + examples.md |
| **Complex** | execution-protocol.md + examples.md + tech-stack.md + snippets.md |

실행 중 필요에 따라 추가 리소스가 로딩됩니다:
- `checklist.md` — Verify 단계에서
- `error-playbook.md` — 에러 발생 시에만
- `common-checklist.md` — Complex 태스크의 최종 검증에서

---

## 범위 제한 실행

에이전트는 엄격한 도메인 경계 내에서 작동합니다:

- 프론트엔드 에이전트는 백엔드 코드를 수정하지 않음
- 백엔드 에이전트는 UI 컴포넌트를 건드리지 않음
- DB 에이전트는 API 엔드포인트를 구현하지 않음
- 에이전트는 다른 에이전트를 위한 범위 외 의존성을 문서화

실행 중 다른 도메인에 속하는 태스크가 발견되면, 에이전트는 그것을 처리하려 하지 않고 결과 파일에 에스컬레이션 항목으로 문서화합니다.

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
oma agent:spawn backend "Implement auth API" session-01 -w ./apps/api
oma agent:spawn frontend "Build login form" session-01 -w ./apps/web
```

---

## 오케스트레이션 흐름

멀티 에이전트 워크플로우(`/orchestrate` 또는 `/work`) 실행 시:

1. **PM 에이전트**가 요청을 우선순위(P0, P1, P2)와 의존성이 있는 도메인별 태스크로 분해
2. **세션 초기화** — 세션 ID 생성, 메모리에 `orchestrator-session.md`와 `task-board.md` 생성
3. **P0 태스크** 병렬 스폰 (최대 MAX_PARALLEL 동시 에이전트)
4. **진행 상황 모니터링** — 오케스트레이터가 매 POLL_INTERVAL마다 `progress-{agent}.md` 파일 폴링
5. **P1 태스크** P0 완료 후 스폰, 이후 동일
6. **검증 루프** 각 완료된 에이전트에 대해 실행 (자체 리뷰 -> 자동화 검증 -> QA에 의한 크로스 리뷰)
7. **결과 수집** 모든 `result-{agent}.md` 파일에서
8. **최종 보고서** 세션 요약, 변경된 파일, 남은 이슈 포함

---

## 에이전트 정의

에이전트는 두 위치에 정의됩니다:

**`.agents/agents/`** — 7개 서브에이전트 정의 파일:
- `backend-engineer.md`
- `frontend-engineer.md`
- `mobile-engineer.md`
- `db-engineer.md`
- `qa-reviewer.md`
- `debug-investigator.md`
- `pm-planner.md`

이 파일들은 에이전트의 정체성, 실행 프로토콜 참조, CHARTER_CHECK 템플릿, 아키텍처 요약, 규칙을 정의합니다. Task/Agent 도구(Claude Code) 또는 CLI를 통해 서브에이전트를 스폰할 때 사용됩니다.

**`.claude/agents/`** — IDE 특화 서브에이전트 정의로, 심볼릭 링크 또는 직접 복사를 통해 `.agents/agents/` 파일을 참조합니다.

---

## 런타임 상태 (Serena Memory)

오케스트레이션 세션 중 에이전트는 `.serena/memories/`의 공유 메모리 파일을 통해 조율합니다(`mcp.json`에서 설정 가능):

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

대시보드(`oma dashboard` 및 `oma dashboard:web`)는 실시간 모니터링을 위해 이 메모리 파일을 감시합니다.
