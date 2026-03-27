---
title: 소개
description: oh-my-agent 종합 개요 — AI 코딩 어시스턴트를 14개 도메인 에이전트, 점진적 스킬 로딩, 크로스 IDE 호환성을 갖춘 전문 엔지니어링 팀으로 만들어 주는 멀티 에이전트 오케스트레이션 프레임워크.
---

# 소개

oh-my-agent는 AI 기반 IDE 및 CLI 도구를 위한 멀티 에이전트 오케스트레이션 프레임워크입니다. 하나의 AI 어시스턴트에 모든 것을 맡기는 대신, 작업을 14개 전문 에이전트에 분배합니다. 각 에이전트는 실제 엔지니어링 팀의 역할을 본떠 만들어졌으며, 고유한 기술 스택 지식, 실행 프로토콜, 에러 플레이북, 품질 체크리스트를 갖추고 있습니다.

전체 시스템은 프로젝트 내부의 이식 가능한 `.agents/` 디렉토리에 존재합니다. Claude Code, Gemini CLI, Codex CLI, Antigravity IDE, Cursor 또는 기타 지원 도구 간에 자유롭게 전환할 수 있으며, 에이전트 설정은 코드와 함께 이동합니다.

---

## 멀티 에이전트 패러다임

기존 AI 코딩 어시스턴트는 범용으로 동작합니다. 프론트엔드, 백엔드, 데이터베이스, 보안, 인프라 모두를 같은 프롬프트 컨텍스트, 같은 수준의 전문성으로 처리합니다. 이로 인해 다음과 같은 문제가 발생합니다:

- **컨텍스트 희석** — 모든 도메인의 지식을 로딩하면 컨텍스트 윈도우가 낭비됩니다
- **들쭉날쭉한 품질** — 범용 어시스턴트는 어떤 도메인에서든 전문가를 따라갈 수 없습니다
- **조율 부재** — 여러 도메인에 걸친 복잡한 기능이 순차적으로 처리됩니다

oh-my-agent는 전문화를 통해 이를 해결합니다:

1. **각 에이전트는 하나의 도메인에 깊이 특화되어 있습니다.** 프론트엔드 에이전트는 React/Next.js, shadcn/ui, TailwindCSS v4, FSD-lite 아키텍처를 알고 있습니다. 백엔드 에이전트는 Repository-Service-Router 패턴, 파라미터화된 쿼리, JWT 인증을 알고 있습니다. 서로 겹치지 않습니다.

2. **에이전트는 병렬로 실행됩니다.** 백엔드 에이전트가 API를 구축하는 동안 프론트엔드 에이전트는 이미 UI를 생성하고 있습니다. 오케스트레이터가 공유 메모리를 통해 조율합니다.

3. **품질이 기본으로 보장됩니다.** 모든 에이전트에는 도메인별 체크리스트와 에러 플레이북이 있습니다. Charter Preflight가 코드 작성 전에 범위 초과를 미리 잡아냅니다. QA 리뷰는 나중에 덧붙이는 절차가 아니라 핵심 단계입니다.

---

## 전체 14개 에이전트

### 아이디어 및 기획

| 에이전트 | 역할 | 핵심 기능 |
|-------|------|-----------------|
| **oma-brainstorm** | 디자인 우선 아이디어 탐색 | 사용자 의도를 탐색하고, 트레이드오프 분석과 함께 2-3가지 접근 방식을 제안하며, 코드 작성 전에 설계 문서를 생성합니다. 6단계 워크플로우: Context, Questions, Approaches, Design, Documentation, `/plan` 전환. |
| **oma-pm** | 프로덕트 매니저 | 요구사항을 의존성이 있는 우선순위 태스크로 분해합니다. API 컨트랙트를 정의합니다. `.agents/plan.json`과 `task-board.md`를 출력합니다. ISO 21500 개념, ISO 31000 리스크 프레이밍, ISO 38500 거버넌스를 지원합니다. |

### 구현

| 에이전트 | 역할 | 기술 스택 및 리소스 |
|-------|------|----------------------|
| **oma-frontend** | UI/UX 전문가 | React, Next.js, TypeScript, TailwindCSS v4, shadcn/ui, FSD-lite 아키텍처. 라이브러리: luxon (날짜), ahooks (훅), es-toolkit (유틸), Jotai (클라이언트 상태), TanStack Query (서버 상태), @tanstack/react-form + Zod (폼), better-auth (인증), nuqs (URL 상태). 리소스: `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `component-template.tsx`, `snippets.md`, `error-playbook.md`, `checklist.md`, `examples/`. |
| **oma-backend** | API 및 서버 전문가 | 클린 아키텍처 (Router-Service-Repository-Models). 스택 불문 — 프로젝트 매니페스트에서 Python/Node.js/Rust/Go/Java/Elixir/Ruby/.NET을 감지합니다. 인증에 JWT + bcrypt 사용. 리소스: `execution-protocol.md`, `orm-reference.md`, `examples.md`, `checklist.md`, `error-playbook.md`. 언어별 `stack/` 레퍼런스 생성을 위한 `/stack-set` 지원. |
| **oma-mobile** | 크로스 플랫폼 모바일 | Flutter, Dart, Riverpod/Bloc 상태 관리, Dio with interceptors API 호출, GoRouter 네비게이션. 클린 아키텍처: domain-data-presentation. Material Design 3 (Android) + iOS HIG. 60fps 목표. 리소스: `execution-protocol.md`, `tech-stack.md`, `snippets.md`, `screen-template.dart`, `checklist.md`, `error-playbook.md`. |
| **oma-db** | 데이터베이스 아키텍처 | SQL, NoSQL, 벡터 데이터베이스 모델링. 스키마 설계 (기본 3NF), 정규화, 인덱싱, 트랜잭션, 용량 계획, 백업 전략. ISO 27001/27002/22301 인식 설계 지원. 리소스: `execution-protocol.md`, `document-templates.md`, `anti-patterns.md`, `vector-db.md`, `iso-controls.md`, `checklist.md`, `error-playbook.md`. |

### 디자인

| 에이전트 | 역할 | 핵심 기능 |
|-------|------|-----------------|
| **oma-design** | 디자인 시스템 전문가 | 토큰, 타이포그래피, 컬러 시스템, 모션 디자인 (motion/react, GSAP, Three.js), 반응형 우선 레이아웃, WCAG 2.2 준수가 포함된 DESIGN.md를 생성합니다. 7단계 워크플로우: Setup, Extract, Enhance, Propose, Generate, Audit, Handoff. 안티 패턴("AI slop") 방지 적용. 선택적 Stitch MCP 통합. 리소스: `design-md-spec.md`, `design-tokens.md`, `anti-patterns.md`, `prompt-enhancement.md`, `stitch-integration.md`, 그리고 `reference/` 디렉토리(타이포그래피, 컬러, 공간, 모션, 반응형, 컴포넌트, 접근성, 셰이더 가이드). |

### 인프라 및 DevOps

| 에이전트 | 역할 | 핵심 기능 |
|-------|------|-----------------|
| **oma-tf-infra** | Infrastructure-as-code | 멀티 클라우드 Terraform (AWS, GCP, Azure, Oracle Cloud). OIDC 우선 인증, 최소 권한 IAM, Policy-as-code (OPA/Sentinel), 비용 최적화. ISO/IEC 42001 AI 제어, ISO 22301 연속성, ISO/IEC/IEEE 42010 아키텍처 문서화 지원. 리소스: `multi-cloud-examples.md`, `cost-optimization.md`, `policy-testing-examples.md`, `iso-42001-infra.md`, `checklist.md`. |
| **oma-dev-workflow** | 모노레포 태스크 자동화 | mise task runner, CI/CD 파이프라인, 데이터베이스 마이그레이션, 릴리스 조율, git hooks, pre-commit 검증. 리소스: `validation-pipeline.md`, `database-patterns.md`, `api-workflows.md`, `i18n-patterns.md`, `release-coordination.md`, `troubleshooting.md`. |

### 품질 및 디버깅

| 에이전트 | 역할 | 핵심 기능 |
|-------|------|-----------------|
| **oma-qa** | 품질 보증 | 보안 감사 (OWASP Top 10), 성능 분석, 접근성 (WCAG 2.1 AA), 코드 품질 리뷰. 심각도: CRITICAL/HIGH/MEDIUM/LOW(파일:라인 및 수정 코드 포함). ISO/IEC 25010 품질 특성 및 ISO/IEC 29119 테스트 정렬 지원. 리소스: `execution-protocol.md`, `iso-quality.md`, `checklist.md`, `self-check.md`, `error-playbook.md`. |
| **oma-debug** | 버그 진단 및 수정 | 재현 우선 방법론. 근본 원인 분석, 최소 수정, 필수 회귀 테스트, 유사 패턴 스캔. 심볼 추적에 Serena MCP 사용. 리소스: `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`. |

### 현지화, 조율 및 Git

| 에이전트 | 역할 | 핵심 기능 |
|-------|------|-----------------|
| **oma-translator** | 컨텍스트 인식 번역 | 4단계 번역 방법: 원문 분석, 의미 추출, 대상 언어로 재구성, 검증. 톤, 레지스터, 도메인 용어를 유지합니다. 안티 AI 패턴 감지. 배치 번역(i18n 파일) 지원. 출판 품질을 위한 선택적 7단계 정제 모드. 리소스: `translation-rubric.md`, `anti-ai-patterns.md`. |
| **oma-orchestrator** | 자동화된 멀티 에이전트 조율자 | CLI 서브에이전트를 병렬 스폰하고, MCP 메모리를 통해 조율하며, 진행 상황을 모니터링하고, 검증 루프를 실행합니다. 설정: MAX_PARALLEL (기본 3), MAX_RETRIES (기본 2), POLL_INTERVAL (기본 30초). 에이전트 간 리뷰 루프와 Clarification Debt 모니터링 포함. 리소스: `subagent-prompt-template.md`, `memory-schema.md`. |
| **oma-commit** | Conventional Commits | 변경사항을 분석하고, type/scope를 결정하며, 적절한 경우 기능별로 분할하고, Conventional Commits 형식의 커밋 메시지를 생성합니다. Co-Author: `First Fluke <our.first.fluke@gmail.com>`. |

---

## 점진적 로딩 모델

oh-my-agent는 컨텍스트 윈도우 소진을 방지하기 위해 2계층 스킬 아키텍처를 사용합니다:

**Layer 1 — SKILL.md (~800바이트, 항상 로딩됨):**
에이전트의 정체성, 라우팅 조건, 핵심 규칙, "언제 사용할지 / 언제 사용하지 말아야 할지" 가이드가 포함됩니다. 에이전트가 작업 중이 아닐 때는 이것만 로딩됩니다.

**Layer 2 — resources/ (필요 시 로딩):**
실행 프로토콜, 기술 스택 레퍼런스, 코드 스니펫, 에러 플레이북, 체크리스트, 예제가 포함됩니다. 에이전트가 태스크를 수행할 때만 로딩되며, 그때도 특정 태스크 유형에 해당하는 리소스만 로딩됩니다(`context-loading.md`의 난이도 평가 및 태스크-리소스 매핑 기반).

이 설계는 모든 것을 미리 로딩하는 것에 비해 약 75%의 토큰을 절약합니다. Flash 티어 모델(128K 컨텍스트)의 경우, 총 리소스 예산은 약 3,100 토큰으로 컨텍스트 윈도우의 2.4%에 불과합니다.

---

## .agents/ — 유일한 원천 (SSOT)

oh-my-agent에 필요한 모든 것은 `.agents/` 디렉토리에 있습니다:

```
.agents/
├── config/                 # user-preferences.yaml
├── skills/                 # 15개 스킬 디렉토리 (14개 에이전트 + _shared)
│   ├── _shared/            # 모든 에이전트가 사용하는 핵심 리소스
│   └── oma-{agent}/        # 에이전트별 SKILL.md + resources/
├── workflows/              # 14개 워크플로우 정의
├── agents/                 # 7개 서브에이전트 정의
├── plan.json               # 생성된 계획 출력
├── state/                  # 활성 워크플로우 상태 파일
├── results/                # 에이전트 결과 파일
└── mcp.json                # MCP 서버 설정
```

`.claude/` 디렉토리는 IDE 통합 레이어로만 존재합니다 — `.agents/`를 가리키는 심볼릭 링크와 키워드 감지용 훅, HUD 상태바가 포함됩니다. `.serena/memories/` 디렉토리는 오케스트레이션 세션 중 런타임 상태를 보관합니다.

이 아키텍처 덕분에 에이전트 설정은:
- **이식 가능** — 재설정 없이 IDE 전환 가능
- **버전 관리 가능** — `.agents/`를 코드와 함께 커밋
- **공유 가능** — 팀원들이 동일한 에이전트 설정을 얻음

---

## 지원 IDE 및 CLI 도구

oh-my-agent는 스킬/프롬프트 로딩을 지원하는 모든 AI 기반 IDE 또는 CLI와 함께 작동합니다:

| 도구 | 통합 방식 | 병렬 에이전트 |
|------|-------------------|----------------|
| **Claude Code** | 네이티브 스킬 + Agent 도구 | Task 도구를 통한 완전한 병렬 처리 |
| **Gemini CLI** | `.agents/skills/`에서 스킬 자동 로딩 | `oh-my-ag agent:spawn` |
| **Codex CLI** | 스킬 자동 로딩 | 모델 중재 병렬 요청 |
| **Antigravity IDE** | 스킬 자동 로딩 | `oh-my-ag agent:spawn` |
| **Cursor** | `.cursor/` 통합을 통한 스킬 | 수동 스폰 |
| **OpenCode** | 스킬 로딩 | 수동 스폰 |

에이전트 스폰은 벤더 감지 프로토콜을 통해 각 벤더에 자동으로 적응합니다. 이 프로토콜은 벤더별 마커를 확인합니다(예: Claude Code의 `Agent` 도구, Codex CLI의 `apply_patch`).

---

## 스킬 라우팅 시스템

프롬프트를 전송하면 oh-my-agent는 스킬 라우팅 맵(`.agents/skills/_shared/core/skill-routing.md`)을 사용하여 어떤 에이전트가 처리할지 결정합니다:

| 도메인 키워드 | 라우팅 대상 |
|----------------|-----------|
| API, endpoint, REST, GraphQL, database, migration | oma-backend |
| auth, JWT, login, register, password | oma-backend |
| UI, component, page, form, screen (웹) | oma-frontend |
| style, Tailwind, responsive, CSS | oma-frontend |
| mobile, iOS, Android, Flutter, React Native, app | oma-mobile |
| bug, error, crash, broken, slow | oma-debug |
| review, security, performance, accessibility | oma-qa |
| UI design, design system, landing page, DESIGN.md | oma-design |
| brainstorm, ideate, explore, idea | oma-brainstorm |
| plan, breakdown, task, sprint | oma-pm |
| automatic, parallel, orchestrate | oma-orchestrator |

여러 도메인에 걸친 복잡한 요청의 경우, 라우팅은 정해진 실행 순서를 따릅니다. 예를 들어, "풀스택 앱을 만들어줘"는 oma-pm (계획) -> oma-backend + oma-frontend (병렬 구현) -> oma-qa (리뷰) 순서로 라우팅됩니다.

---

## 다음 단계

- **[설치](./installation)** — 세 가지 설치 방법, 프리셋, CLI 설정, 검증
- **[에이전트](/core-concepts/agents)** — 14개 에이전트와 Charter Preflight 심층 분석
- **[스킬](/core-concepts/skills)** — 2계층 아키텍처 설명
- **[워크플로우](/core-concepts/workflows)** — 트리거와 단계가 포함된 14개 워크플로우
- **[사용 가이드](/guide/usage)** — 단일 태스크부터 전체 오케스트레이션까지 실제 예제
