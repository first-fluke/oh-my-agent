# oh-my-agent: Portable Multi-Agent Harness

[![npm version](https://img.shields.io/npm/v/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![npm downloads](https://img.shields.io/npm/dm/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![GitHub stars](https://img.shields.io/github/stars/first-fluke/oh-my-agent?style=flat&logo=github)](https://github.com/first-fluke/oh-my-agent) [![License](https://img.shields.io/github/license/first-fluke/oh-my-agent)](https://github.com/first-fluke/oh-my-agent/blob/main/LICENSE) [![Last Updated](https://img.shields.io/github/last-commit/first-fluke/oh-my-agent?label=updated&logo=git)](https://github.com/first-fluke/oh-my-agent/commits/main)

[English](../README.md) | [中文](./README.zh.md) | [Português](./README.pt.md) | [日本語](./README.ja.md) | [Français](./README.fr.md) | [Español](./README.es.md) | [Nederlands](./README.nl.md) | [Polski](./README.pl.md) | [Русский](./README.ru.md) | [Deutsch](./README.de.md) | [Tiếng Việt](./README.vi.md) | [ภาษาไทย](./README.th.md)

AI 어시스턴트에게도 동료가 있으면 좋겠다고 생각해본 적 없으신가요? 그게 바로 oh-my-agent입니다.

AI 하나에 모든 걸 맡기면 중간에 헤매기 쉽지만, oh-my-agent는 작업을 **전문 에이전트**들에게 나눠 맡깁니다. frontend, backend, architecture, QA, PM, DB, mobile, infra, debug, design 같은 전문가들이죠. 각 에이전트는 자기 영역을 깊이 알고, 전용 도구와 체크리스트를 갖춘 채 맡은 역할에만 집중합니다.

주요 AI IDE를 모두 지원합니다: Antigravity, Claude Code, Cursor, Gemini CLI, Codex CLI, OpenCode 등.

벤더 네이티브 서브에이전트는 `.agents/agents/`에서 생성됩니다.
- Claude Code는 `.claude/agents/*.md` 사용
- Codex CLI는 `.codex/agents/*.toml` 사용
- Gemini CLI는 `.gemini/agents/*.md` 사용

워크플로우가 현재 런타임과 같은 벤더의 에이전트를 실행할 때는 해당 벤더의 네이티브 서브에이전트 경로를 먼저 씁니다. 벤더가 다르면 `oma agent:spawn`으로 대체합니다.

## 빠른 시작

```bash
# macOS / Linux — bun & uv가 없으면 자동으로 설치됩니다
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

```powershell
# Windows (PowerShell) — bun & uv가 없으면 자동으로 설치됩니다
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

```bash
# 또는 직접 실행 (모든 OS, bun + uv 필요)
bunx oh-my-agent@latest
```

### Agent Package Manager로 설치

<details>
<summary>Microsoft의 <a href="https://github.com/microsoft/apm">Agent Package Manager</a> (APM) — 스킬 전용 배포. 클릭하면 펼쳐집니다.</summary>

> `oma-observability`의 APM(Application Performance Monitoring)과는 다릅니다.

```bash
# 22개 스킬을 감지된 모든 런타임에 배포
# (.claude, .cursor, .codex, .opencode, .github, .agents)
apm install first-fluke/oh-my-agent

# 스킬 하나만
apm install first-fluke/oh-my-agent/.agents/skills/oma-frontend
```

APM은 `.claude-plugin/plugin.json`의 `skills: .agents/skills/` 포인터를 읽으므로, `.agents/` SSOT가 유일한 소스입니다(빌드 단계나 미러 없음).

APM은 스킬 22개만 제공합니다. 워크플로우, 규칙, `oma-config.yaml`, 키워드 감지 훅, `oma agent:spawn` CLI는 `bunx oh-my-agent@latest`를 쓰세요. 드리프트를 피하려면 프로젝트당 한 가지 배포 방식만 고르는 게 좋습니다.

</details>

프리셋만 고르면 바로 시작할 수 있습니다:

| 프리셋 | 구성 |
|--------|------|
| ✨ All | 모든 에이전트와 스킬 |
| 🌐 Fullstack | architecture + frontend + backend + db + pm + qa + debug + brainstorm + scm |
| 🎨 Frontend | architecture + frontend + pm + qa + debug + brainstorm + scm |
| ⚙️ Backend | architecture + backend + db + pm + qa + debug + brainstorm + scm |
| 📱 Mobile | architecture + mobile + pm + qa + debug + brainstorm + scm |
| 🚀 DevOps | architecture + tf-infra + dev-workflow + pm + qa + debug + brainstorm + scm |

## 에이전트 팀

| 에이전트 | 하는 일 |
|----------|------|
| **oma-architecture** | 아키텍처 트레이드오프와 모듈 경계, ADR/ATAM/CBAM 관점의 분석 |
| **oma-backend** | Python, Node.js, Rust 기반 API 개발 |
| **oma-brainstorm** | 구현 전에 아이디어 먼저 탐색 |
| **oma-db** | 스키마 설계, 마이그레이션, 인덱싱, vector DB |
| **oma-debug** | 근본 원인 분석, 수정, 회귀 테스트 |
| **oma-design** | 디자인 시스템, 토큰, 접근성, 반응형 |
| **oma-dev-workflow** | CI/CD, 릴리스, 모노레포 자동화 |
| **oma-frontend** | React/Next.js, TypeScript, Tailwind CSS v4, shadcn/ui |
| **oma-hwp** | HWP/HWPX/HWPML을 Markdown으로 변환 |
| **oma-image** | 멀티 벤더 AI 이미지 생성 |
| **oma-mobile** | Flutter 크로스플랫폼 앱 |
| **oma-observability** | 관측성 라우터 — APM/RUM, 메트릭/로그/트레이스/프로파일, SLO, 인시던트 포렌식, 전송 계층 튜닝 |
| **oma-orchestrator** | CLI 기반 병렬 에이전트 실행 |
| **oma-pdf** | PDF를 Markdown으로 변환 |
| **oma-pm** | 작업 계획, 요구사항 분석, API 계약 정의 |
| **oma-qa** | OWASP 보안, 성능, 접근성 리뷰 |
| **oma-recap** | 대화 이력 분석과 주제별 작업 요약 |
| **oma-scholar** | 학술 연구 동반자 — Knows 사이드카(.knows.yaml), 문헌 검색, 동료 평가 |
| **oma-scm** | 형상관리(SCM)와 Git: 브랜치·머지·워크트리·베이스라인, Conventional Commits |
| **oma-search** | 의도 기반 검색 라우터와 신뢰 점수 (문서, 웹, 코드, 로컬) |
| **oma-tf-infra** | 멀티 클라우드 Terraform IaC (Infrastructure as Code) |
| **oma-translator** | 자연스러운 다국어 번역 |

## 작동 방식

그냥 채팅하듯 말하면 됩니다. 원하는 걸 설명하면 oh-my-agent가 알아서 적절한 에이전트를 골라줍니다.

```
You: "사용자 인증이 있는 TODO 앱 만들어줘"
→ PM이 작업을 계획
→ Backend가 인증 API 구축
→ Frontend가 React UI 구축
→ DB가 스키마 설계
→ QA가 전체 리뷰
→ 완료: 서로 맞물린 코드, 리뷰까지 마침
```

슬래시 커맨드로 구조화된 워크플로우를 실행할 수도 있습니다:

| 순서 | 커맨드 | 하는 일 |
|------|--------|------|
| 1 | `/brainstorm` | 자유로운 아이디어 발산 |
| 2 | `/architecture` | 소프트웨어 아키텍처 리뷰, 트레이드오프, ADR/ATAM/CBAM 스타일 분석 |
| 2 | `/design` | 7단계 디자인 시스템 워크플로우 |
| 2 | `/plan` | PM이 기능을 태스크로 분해 |
| 3 | `/work` | 단계별 멀티 에이전트 실행 |
| 3 | `/orchestrate` | 병렬 에이전트 자동 스폰 |
| 3 | `/ultrawork` | 11개 리뷰 게이트가 포함된 5단계 품질 워크플로우 |
| 4 | `/review` | 보안 + 성능 + 접근성 감사 |
| 5 | `/debug` | 구조화된 근본 원인 디버깅 |
| 6 | `/scm` | SCM·Git 워크플로우, Conventional Commits 지원 |

**자동 감지**: 슬래시 커맨드를 쓰지 않아도, 메시지에 "아키텍처", "계획", "리뷰", "디버그" 같은 키워드만 있으면 (11개 언어 지원!) 맞는 워크플로우가 자동으로 실행됩니다.

## CLI

```bash
# 전역 설치
bun install --global oh-my-agent   # 또는: brew install oh-my-agent

# 어디서든 사용
oma doctor                  # 상태 점검
oma dashboard               # 실시간 에이전트 모니터링
oma link                    # .agents/에서 .claude/.codex/.gemini 등 재생성
oma agent:spawn backend "Build auth API" session-01
oma agent:parallel -i backend:"Auth API" frontend:"Login form"
```

모델 선택은 두 단계로 이뤄집니다.
- 같은 벤더 네이티브 디스패치는 `.claude/agents/`, `.codex/agents/`, `.gemini/agents/`에 생성된 벤더 에이전트 정의를 사용합니다.
- 벤더가 다르거나 CLI 폴백으로 디스패치할 때는 `.agents/skills/oma-orchestrator/config/cli-config.yaml`의 벤더 기본값을 사용합니다.

**에이전트별 모델**: `.agents/oma-config.yaml`에서 각 에이전트마다 모델과 `effort`를 따로 지정할 수 있습니다. 5종의 runtime profile이 기본 제공됩니다: `claude-only`, `codex-only`, `gemini-only`, `antigravity`, `qwen-only`. `oma doctor --profile`로 해석된 auth 매트릭스를 확인하세요. 전체 가이드: [web/docs/guide/per-agent-models.md](../web/docs/guide/per-agent-models.md).

## 왜 oh-my-agent인가?

> [자세한 배경 보기 →](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589)

- **이식성**: `.agents/`가 프로젝트와 함께 움직이며, 특정 IDE에 묶이지 않습니다
- **역할 기반**: 프롬프트 뭉치가 아니라 실제 엔지니어링 팀처럼 설계했습니다
- **토큰 효율**: 2계층 스킬 구조로 토큰을 약 75% 절감합니다
- **품질 우선**: Charter preflight, quality gate, 리뷰 워크플로우가 내장되어 있습니다
- **멀티 벤더**: 에이전트 유형별로 Gemini, Claude, Codex, Qwen을 섞어 쓸 수 있습니다
- **가시성**: 터미널과 웹 대시보드로 실시간 모니터링이 가능합니다

## 아키텍처

```mermaid
flowchart TD
    subgraph Workflows["Workflows"]
        direction TB
        W0["/brainstorm"]
        W1["/work"]
        W1b["/ultrawork"]
        W2["/orchestrate"]
        W3["/architecture"]
        W4["/plan"]
        W5["/review"]
        W6["/debug"]
        W7["/deepinit"]
        W8["/design"]
    end

    subgraph Orchestration["Orchestration"]
        direction TB
        PM[oma-pm]
        ORC[oma-orchestrator]
    end

    subgraph Domain["Domain Agents"]
        direction TB
        ARC[oma-architecture]
        FE[oma-frontend]
        BE[oma-backend]
        DB[oma-db]
        MB[oma-mobile]
        DES[oma-design]
        TF[oma-tf-infra]
    end

    subgraph Quality["Quality"]
        direction TB
        QA[oma-qa]
        DBG[oma-debug]
    end

    Workflows --> Orchestration
    Orchestration --> Domain
    Domain --> Quality
    Quality --> SCM([oma-scm])
```

## 더 알아보기

- **[상세 문서](./AGENTS_SPEC.md)**: 전체 기술 스펙과 아키텍처
- **[지원 에이전트](./SUPPORTED_AGENTS.md)**: IDE별 에이전트 지원 현황
- **[웹 문서](https://first-fluke.github.io/oh-my-agent/)**: 가이드, 튜토리얼, CLI 레퍼런스

## 스폰서

이 프로젝트는 든든한 스폰서 여러분 덕분에 이어지고 있습니다.

> **마음에 드셨나요?** 스타를 눌러주세요!
>
> ```bash
> gh api --method PUT /user/starred/first-fluke/oh-my-agent
> ```
>
> 최적화된 스타터 템플릿도 함께 확인해보세요: [fullstack-starter](https://github.com/first-fluke/fullstack-starter)

<a href="https://github.com/sponsors/first-fluke">
  <img src="https://img.shields.io/badge/Sponsor-♥-ea4aaa?style=for-the-badge" alt="Sponsor" />
</a>
<a href="https://buymeacoffee.com/firstfluke">
  <img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-☕-FFDD00?style=for-the-badge" alt="Buy Me a Coffee" />
</a>

### 🚀 Champion

<!-- Champion tier ($100/mo) logos here -->

### 🛸 Booster

<!-- Booster tier ($30/mo) logos here -->

### ☕ Contributor

<!-- Contributor tier ($10/mo) names here -->

[스폰서 되기 →](https://github.com/sponsors/first-fluke)

전체 후원자 목록은 [SPONSORS.md](../SPONSORS.md)를 참고하세요.



## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=first-fluke/oh-my-agent&type=date&legend=bottom-right)](https://www.star-history.com/#first-fluke/oh-my-agent&type=date&legend=bottom-right)


## 참고문헌

- Liang, Q., Wang, H., Liang, Z., & Liu, Y. (2026). *From skill text to skill structure: The scheduling-structural-logical representation for agent skills* (Version 2) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2604.24026


## 라이선스

MIT
