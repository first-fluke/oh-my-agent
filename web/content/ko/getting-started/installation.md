---
title: 설치
description: oh-my-agent 완전 설치 가이드 — 세 가지 설치 방법, 6개 프리셋과 포함 스킬 목록, 4개 벤더의 CLI 도구 요구사항, 설치 후 설정, user-preferences.yaml 필드, oma doctor 검증.
---

# 설치

## 사전 요구사항

- **AI 기반 IDE 또는 CLI** — 다음 중 하나 이상: Claude Code, Gemini CLI, Codex CLI, Qwen CLI, Antigravity IDE, Cursor, 또는 OpenCode
- **bun** — JavaScript 런타임 및 패키지 매니저 (설치 스크립트에서 없으면 자동 설치)
- **uv** — Serena MCP용 Python 패키지 매니저 (없으면 자동 설치)

---

## 방법 1: 원라이너 설치 (권장)

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

이 스크립트는:
1. 플랫폼을 감지합니다 (macOS, Linux)
2. bun과 uv를 확인하고, 없으면 설치합니다
3. 프리셋 선택과 함께 대화형 설치 프로그램을 실행합니다
4. 선택한 스킬로 `.agents/`를 생성합니다
5. `.claude/` 통합 레이어를 설정합니다 (훅, 심볼릭 링크, 설정)
6. 감지된 경우 Serena MCP를 설정합니다

일반적인 설치 시간: 60초 미만.

---

## 방법 2: bunx를 통한 수동 설치

```bash
bunx oh-my-agent
```

이 명령은 의존성 부트스트랩 없이 대화형 설치 프로그램을 시작합니다. bun이 이미 설치되어 있어야 합니다.

설치 프로그램은 프리셋을 선택하도록 안내하며, 이 프리셋이 설치되는 스킬을 결정합니다:

### 프리셋

| 프리셋 | 포함 스킬 |
|--------|----------------|
| **all** | oma-brainstorm, oma-pm, oma-frontend, oma-backend, oma-db, oma-mobile, oma-design, oma-qa, oma-debug, oma-tf-infra, oma-dev-workflow, oma-translator, oma-orchestrator, oma-commit, oma-coordination |
| **fullstack** | oma-frontend, oma-backend, oma-db, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-commit |
| **frontend** | oma-frontend, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-commit |
| **backend** | oma-backend, oma-db, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-commit |
| **mobile** | oma-mobile, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-commit |
| **devops** | oma-tf-infra, oma-dev-workflow, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-commit |

모든 프리셋에는 oma-pm (기획), oma-qa (리뷰), oma-debug (버그 수정), oma-brainstorm (아이디어), oma-commit (git)이 기본 에이전트로 포함됩니다. 도메인별 프리셋은 관련 구현 에이전트를 추가합니다.

공유 리소스(`_shared/`)는 프리셋에 관계없이 항상 설치됩니다. 여기에는 핵심 라우팅, 컨텍스트 로딩, 프롬프트 구조, 벤더 감지, 실행 프로토콜, 메모리 프로토콜이 포함됩니다.

### 생성되는 항목

설치 후 프로젝트에 포함되는 내용:

```
.agents/
├── config/
│   └── user-preferences.yaml      # 사용자 설정 (/setup에서 생성)
├── skills/
│   ├── _shared/                    # 공유 리소스 (항상 설치)
│   │   ├── core/                   # skill-routing, context-loading 등
│   │   ├── runtime/                # memory-protocol, execution-protocols/
│   │   └── conditional/            # quality-score, experiment-ledger 등
│   ├── oma-frontend/               # 프리셋에 따라
│   │   ├── SKILL.md
│   │   └── resources/
│   └── ...                         # 기타 선택된 스킬
├── workflows/                      # 14개 워크플로우 정의
├── agents/                         # 서브에이전트 정의
├── mcp.json                        # MCP 서버 설정
├── plan.json                       # 빈 파일 (/plan으로 채워짐)
├── state/                          # 빈 디렉토리 (영구 워크플로우에서 사용)
└── results/                        # 빈 디렉토리 (에이전트 실행 시 채워짐)

.claude/
├── settings.json                   # 훅 및 권한
├── hooks/
│   ├── triggers.json               # 키워드-워크플로우 매핑 (11개 언어)
│   ├── keyword-detector.ts         # 자동 감지 로직
│   ├── persistent-mode.ts          # 영구 워크플로우 강제
│   └── hud.ts                      # [OMA] 상태바 표시기
├── skills/                         # 심볼릭 링크 → .agents/skills/
└── agents/                         # IDE용 서브에이전트 정의

.serena/
└── memories/                       # 런타임 상태 (세션 중 채워짐)
```

---

## 방법 3: 전역 설치

CLI 수준 사용(대시보드, 에이전트 스폰, 진단)을 위해 oh-my-agent를 전역으로 설치합니다:

### Homebrew (macOS/Linux)

```bash
brew install oh-my-agent
```

### npm / bun global

```bash
bun install --global oh-my-agent
# 또는
npm install --global oh-my-agent
```

이렇게 하면 `oma` 명령이 전역으로 설치되어 어떤 디렉토리에서든 모든 CLI 명령에 접근할 수 있습니다:

```bash
oma doctor              # 상태 확인
oma dashboard           # 터미널 모니터링
oma dashboard:web       # 웹 대시보드 http://localhost:9847
oma agent:spawn         # 터미널에서 에이전트 스폰
oma agent:parallel      # 병렬 에이전트 실행
oma agent:status        # 에이전트 상태 확인
oma stats               # 세션 통계
oma retro               # 회고 분석
oma cleanup             # 세션 아티팩트 정리
oma update              # oh-my-agent 업데이트
oma verify              # 에이전트 출력 검증
oma visualize           # 의존성 시각화
oma describe            # 프로젝트 구조 설명
oma bridge              # Antigravity용 SSE-to-stdio 브릿지
oma memory:init         # 메모리 프로바이더 초기화
oma auth:status         # CLI 인증 상태 확인
oma usage:anti          # 사용량 안티 패턴 감지
oma star                # 리포지토리 스타
```

전역 `oma` 별칭은 `oh-my-ag` (전체 명령명)과 동일합니다.

---

## AI CLI 도구 설치

하나 이상의 AI CLI 도구가 설치되어 있어야 합니다. oh-my-agent는 네 가지 벤더를 지원하며, 에이전트-CLI 매핑을 통해 다른 에이전트에 다른 CLI를 사용하도록 혼합할 수 있습니다.

### Gemini CLI

```bash
bun install --global @google/gemini-cli
# 또는
npm install --global @google/gemini-cli
```

인증은 첫 실행 시 자동으로 수행됩니다. Gemini CLI는 기본적으로 `.agents/skills/`에서 스킬을 읽습니다.

### Claude Code

```bash
curl -fsSL https://claude.ai/install.sh | bash
# 또는
npm install --global @anthropic-ai/claude-code
```

인증은 첫 실행 시 자동으로 수행됩니다. Claude Code는 `.claude/`를 훅과 설정에 사용하며, 스킬은 `.agents/skills/`에서 심볼릭 링크됩니다.

### Codex CLI

```bash
bun install --global @openai/codex
# 또는
npm install --global @openai/codex
```

설치 후 `codex login`을 실행하여 인증합니다.

### Qwen CLI

```bash
bun install --global @qwen-code/qwen-code
```

설치 후 CLI 내에서 `/auth`를 실행하여 인증합니다.

---

## 설치 후 설정: `/setup`

설치 후 AI IDE에서 프로젝트를 열고 `/setup` 명령을 실행합니다. 이 대화형 워크플로우(`.agents/workflows/setup.md`에 정의됨)는 다음을 안내합니다:

### 단계 1: 언어 설정

모든 에이전트와 워크플로우의 응답 언어를 설정합니다. 지원 값: `en`, `ko`, `ja`, `zh`, `es`, `fr`, `de`, `pt`, `ru`, `nl`, `pl`.

### 단계 2: CLI 설치 상태

설치된 CLI(`which gemini`, `which claude`, `which codex`)를 스캔하고 버전을 표시합니다. 누락된 CLI에 대한 설치 명령을 제공합니다.

### 단계 3: MCP 연결 상태

각 CLI의 MCP 서버 설정을 확인합니다:
- Gemini CLI: `~/.gemini/settings.json` 확인
- Claude CLI: `~/.claude.json` 또는 `--mcp-config` 확인
- Codex CLI: `~/.codex/config.toml` 확인
- Antigravity IDE: `~/.gemini/antigravity/mcp_config.json` 확인

Command 모드(단순, 세션당 하나의 프로세스) 또는 SSE 모드(공유 서버, 낮은 메모리, Antigravity에 `oma bridge` 명령 필요)로 Serena MCP를 설정할 수 있습니다.

### 단계 4: 에이전트-CLI 매핑

어떤 CLI가 어떤 에이전트를 처리할지 설정합니다. 예를 들어, `frontend`와 `qa`는 Claude(추론에 강함)로, `backend`와 `pm`은 Gemini(생성이 빠름)로 라우팅할 수 있습니다.

### 단계 5: 요약

전체 설정을 표시하고 다음 단계를 제안합니다.

---

## user-preferences.yaml

`/setup` 워크플로우는 `.agents/config/user-preferences.yaml`을 생성합니다. 이 파일은 모든 oh-my-agent 동작의 중앙 설정 파일입니다:

```yaml
# 모든 에이전트와 워크플로우의 응답 언어
language: en

# 리포트와 메모리 파일에 사용되는 날짜 형식
date_format: "YYYY-MM-DD"

# 타임스탬프 시간대
timezone: "UTC"

# 에이전트 스폰에 사용할 기본 CLI 도구
# 옵션: gemini, claude, codex, qwen
default_cli: gemini

# 에이전트별 CLI 매핑 (default_cli 오버라이드)
agent_cli_mapping:
  frontend: claude       # 복잡한 UI 추론
  backend: gemini        # 빠른 API 생성
  mobile: gemini
  db: gemini
  pm: gemini             # 빠른 태스크 분해
  qa: claude             # 철저한 보안 리뷰
  debug: claude          # 깊은 근본 원인 분석
  design: claude
  tf-infra: gemini
  dev-workflow: gemini
  translator: claude
  orchestrator: gemini
  commit: gemini
```

### 필드 레퍼런스

| 필드 | 타입 | 기본값 | 설명 |
|-------|------|---------|-------------|
| `language` | string | `en` | 응답 언어 코드. 모든 에이전트 출력, 워크플로우 메시지, 리포트가 이 언어를 사용합니다. 11개 언어 지원 (en, ko, ja, zh, es, fr, de, pt, ru, nl, pl). |
| `date_format` | string | `YYYY-MM-DD` | 계획, 메모리 파일, 리포트의 타임스탬프에 사용되는 날짜 형식 문자열. |
| `timezone` | string | `UTC` | 모든 타임스탬프에 사용되는 시간대. 표준 시간대 식별자 사용 (예: `Asia/Seoul`, `America/New_York`). |
| `default_cli` | string | `gemini` | 에이전트별 매핑이 없을 때 사용하는 기본 CLI. 벤더 해석 우선순위에서 3번째. |
| `agent_cli_mapping` | map | (비어 있음) | 에이전트 ID를 특정 CLI 벤더에 매핑합니다. `default_cli`보다 우선합니다. |

### 벤더 해석 우선순위

에이전트를 스폰할 때 CLI 벤더는 다음 우선순위 순서로 결정됩니다(높은 것이 우선):

1. `oma agent:spawn`에 전달된 `--vendor` 플래그
2. `user-preferences.yaml`의 해당 에이전트에 대한 `agent_cli_mapping` 항목
3. `user-preferences.yaml`의 `default_cli` 설정
4. `cli-config.yaml`의 `active_vendor` (레거시 폴백)
5. `gemini` (하드코딩된 최종 폴백)

---

## 검증: `oma doctor`

설치와 설정 후 모든 것이 정상인지 확인합니다:

```bash
oma doctor
```

이 명령은 다음을 확인합니다:
- 필요한 모든 CLI 도구가 설치되어 있고 접근 가능한지
- MCP 서버 설정이 유효한지
- 유효한 SKILL.md 프론트매터를 가진 스킬 파일이 존재하는지
- `.claude/skills/`의 심볼릭 링크가 유효한 대상을 가리키는지
- `.claude/settings.json`에 훅이 올바르게 설정되어 있는지
- 메모리 프로바이더에 연결 가능한지 (Serena MCP)
- `user-preferences.yaml`이 필수 필드를 갖춘 유효한 YAML인지

문제가 있으면 `oma doctor`가 정확히 무엇을 수정해야 하는지 복사-붙여넣기 가능한 명령과 함께 알려줍니다.

---

## 업데이트

### CLI 업데이트

```bash
oma update
```

전역 oh-my-agent CLI를 최신 버전으로 업데이트합니다.

### 프로젝트 스킬 업데이트

프로젝트 내의 스킬과 워크플로우는 자동 업데이트용 GitHub Action(`action/`)을 통해 또는 설치 프로그램을 다시 실행하여 수동으로 업데이트할 수 있습니다:

```bash
bunx oh-my-agent
```

설치 프로그램은 기존 설치를 감지하고 `user-preferences.yaml` 및 사용자 지정 설정을 유지하면서 업데이트를 제안합니다.

---

## 다음 단계

AI IDE에서 프로젝트를 열고 oh-my-agent를 사용해 보세요. 스킬은 자동 감지됩니다. 다음을 시도해 보세요:

```
"Tailwind CSS를 사용하여 이메일 유효성 검사가 포함된 로그인 폼을 만들어줘"
```

또는 워크플로우 명령을 사용하세요:

```
/plan JWT와 리프레시 토큰을 사용한 인증 기능
```

자세한 예제는 [사용 가이드](/guide/usage)를, 각 전문가가 무엇을 하는지 알아보려면 [에이전트](/core-concepts/agents)를 참조하세요.
