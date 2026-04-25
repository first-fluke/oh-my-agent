---
title: "가이드: 기존 프로젝트 통합"
description: 기존 프로젝트에 oh-my-agent를 추가하는 완전 가이드 — CLI 경로, 수동 경로, 검증, SSOT 심볼릭 링크 구조, 설치 프로그램의 내부 동작.
---

# 가이드: 기존 프로젝트 통합

## 두 가지 통합 경로

기존 프로젝트에 oh-my-agent를 추가하는 방법은 두 가지입니다:

1. **CLI 경로** — `oma` (또는 `npx oh-my-agent`)를 실행하고 대화형 프롬프트를 따릅니다. 대부분의 사용자에게 권장됩니다.
2. **수동 경로** — 파일을 직접 복사하고 심볼릭 링크를 설정합니다. 제한된 환경이나 커스텀 설정에 유용합니다.

두 경로 모두 동일한 결과를 생성합니다: IDE별 디렉토리가 심볼릭 링크로 연결된 `.agents/` 디렉토리 (SSOT).

---

## CLI 경로: 단계별

### 1. CLI 설치

```bash
# 전역 설치 (권장)
bun install --global oh-my-agent

# 또는 일회성 실행을 위해 npx 사용
npx oh-my-agent
```

전역 설치 후 `oma` (또는 `oh-my-agent`) 명령을 사용할 수 있습니다.

### 2. 프로젝트 루트로 이동

```bash
cd /path/to/your/project
```

설치 프로그램은 프로젝트 루트(`.git/`이 있는 곳)에서 실행되어야 합니다.

### 3. 설치 프로그램 실행

```bash
oma
```

기본 명령(서브커맨드 없음)은 대화형 설치 프로그램을 시작합니다.

### 4. 프로젝트 타입 선택

설치 프로그램은 다음 프리셋을 제시합니다:

| 프리셋 | 포함되는 스킬 |
|:-------|:-------------|
| **All** | 모든 사용 가능한 스킬 |
| **Fullstack** | Frontend + Backend + PM + QA |
| **Frontend** | React/Next.js 스킬 |
| **Backend** | Python/Node.js/Rust 백엔드 스킬 |
| **Mobile** | Flutter/Dart 모바일 스킬 |
| **DevOps** | Terraform + CI/CD + Workflow 스킬 |
| **Custom** | 전체 목록에서 개별 스킬 선택 |

### 5. 백엔드 언어 선택 (해당되는 경우)

백엔드 스킬이 포함된 프리셋을 선택한 경우, 언어 변형을 선택하라는 메시지가 표시됩니다:

- **Python** — FastAPI/SQLAlchemy (기본값)
- **Node.js** — NestJS/Hono + Prisma/Drizzle
- **Rust** — Axum/Actix-web
- **Other / Auto-detect** — 나중에 `/stack-set`으로 설정

### 6. IDE 심볼릭 링크 설정

설치 프로그램은 항상 Claude Code 심볼릭 링크(`.claude/skills/`)를 생성합니다. `.github/` 디렉토리가 존재하면 GitHub Copilot 심볼릭 링크도 자동으로 생성합니다. 그렇지 않으면 다음과 같이 질문합니다:

```
Also create symlinks for GitHub Copilot? (.github/skills/)
```

### 7. Git Rerere 설정

설치 프로그램은 `git rerere` (기록된 해결 재사용)가 활성화되어 있는지 확인합니다. 활성화되지 않은 경우 전역으로 활성화할 것을 제안합니다:

```
Enable git rerere? (Recommended for multi-agent merge conflict reuse)
```

멀티 에이전트 워크플로우에서 머지 충돌이 발생할 수 있으므로 이 옵션이 권장됩니다. rerere는 충돌을 어떻게 해결했는지 기억하여 다음에 동일한 해결을 자동으로 적용합니다.

### 8. MCP 설정

Antigravity IDE MCP 설정이 존재하면(`~/.gemini/antigravity/mcp_config.json`), 설치 프로그램이 Serena MCP 브릿지 설정을 제안합니다:

```
Configure Serena MCP with bridge? (Required for full functionality)
```

수락하면 다음을 설정합니다:

```json
{
  "mcpServers": {
    "serena": {
      "command": "npx",
      "args": ["-y", "oh-my-agent@latest", "bridge", "http://localhost:12341/mcp"],
      "disabled": false
    }
  }
}
```

마찬가지로 Gemini CLI 설정이 존재하면(`~/.gemini/settings.json`), HTTP 모드로 Gemini CLI용 Serena를 설정할 것을 제안합니다:

```json
{
  "mcpServers": {
    "serena": {
      "url": "http://localhost:12341/mcp"
    }
  }
}
```

### 9. 완료

설치 프로그램이 설치된 모든 항목의 요약을 표시합니다:
- 설치된 스킬 목록
- 스킬 디렉토리 위치
- 생성된 심볼릭 링크
- 건너뛴 항목 (있는 경우)

---

## 수동 경로

대화형 CLI를 사용할 수 없는 환경(CI 파이프라인, 제한된 셸, 기업 머신)을 위한 방법입니다.

### 1단계: 다운로드 및 추출

```bash
# 레지스트리에서 최신 tarball 다운로드
VERSION=$(curl -s https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/prompt-manifest.json | jq -r '.version')
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz" -o agent-skills.tar.gz

# 체크섬 검증
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz.sha256" -o agent-skills.tar.gz.sha256
sha256sum -c agent-skills.tar.gz.sha256

# 추출
tar -xzf agent-skills.tar.gz
```

### 2단계: 프로젝트에 파일 복사

```bash
# 핵심 .agents/ 디렉토리 복사
cp -r .agents/ /path/to/your/project/.agents/

# Claude Code 심볼릭 링크 생성
mkdir -p /path/to/your/project/.claude/skills
mkdir -p /path/to/your/project/.claude/agents

# 스킬 심볼릭 링크 (풀스택 프로젝트 예시)
ln -sf ../../.agents/skills/oma-frontend /path/to/your/project/.claude/skills/oma-frontend
ln -sf ../../.agents/skills/oma-backend /path/to/your/project/.claude/skills/oma-backend
ln -sf ../../.agents/skills/oma-qa /path/to/your/project/.claude/skills/oma-qa
ln -sf ../../.agents/skills/oma-pm /path/to/your/project/.claude/skills/oma-pm

# 공유 리소스 심볼릭 링크
ln -sf ../../.agents/skills/_shared /path/to/your/project/.claude/skills/_shared

# 워크플로우 라우터 심볼릭 링크
for workflow in .agents/workflows/*.md; do
  name=$(basename "$workflow" .md)
  ln -sf ../../.agents/workflows/"$name".md /path/to/your/project/.claude/skills/"$name".md
done

# 에이전트 정의 심볼릭 링크
for agent in .agents/agents/*.md; do
  name=$(basename "$agent")
  ln -sf ../../.agents/agents/"$name" /path/to/your/project/.claude/agents/"$name"
done
```

### 3단계: 사용자 환경설정 구성

```bash
mkdir -p /path/to/your/project/.agents/config
cat > /path/to/your/project/.agents/oma-config.yaml << 'EOF'
language: en
date_format: ISO
timezone: UTC
default_cli: gemini

model_preset (per-agent overrides via `agents:`):
  frontend: gemini
  backend: gemini
  mobile: gemini
  qa: gemini
  debug: gemini
  pm: gemini
EOF
```

### 4단계: 메모리 디렉토리 초기화

```bash
oma memory:init
# 또는 수동으로:
mkdir -p /path/to/your/project/.serena/memories
```

---

## 검증 체크리스트

설치 후(어느 경로든) 모든 것이 올바르게 설정되었는지 확인합니다:

```bash
# 전체 상태 검사를 위한 doctor 명령 실행
oma doctor

# CI용 출력 형식 확인
oma doctor --json
```

doctor 명령이 확인하는 항목:

| 검사 | 확인 내용 |
|:-----|:---------|
| **CLI 설치** | gemini, claude, codex, qwen — 버전 및 가용성 |
| **인증** | 각 CLI의 API 키 또는 OAuth 상태 |
| **MCP 설정** | 각 CLI 환경의 Serena MCP 서버 설정 |
| **스킬 상태** | 어떤 스킬이 설치되어 있고 최신 상태인지 |

수동 검증 명령:

```bash
# .agents/ 디렉토리 존재 확인
ls -la .agents/

# 스킬 설치 확인
ls .agents/skills/

# 심볼릭 링크가 올바른 대상을 가리키는지 확인
ls -la .claude/skills/

# 설정 존재 확인
cat .agents/oma-config.yaml

# 메모리 디렉토리 확인
ls .serena/memories/ 2>/dev/null || echo "Memory not initialized"

# 버전 확인
cat .agents/skills/_version.json 2>/dev/null
```

---

## 멀티 IDE 심볼릭 링크 구조 (SSOT 개념)

oh-my-agent는 단일 진실 원천(SSOT) 아키텍처를 사용합니다. `.agents/` 디렉토리가 스킬, 워크플로우, 설정, 에이전트 정의가 존재하는 유일한 장소입니다. 모든 IDE별 디렉토리에는 `.agents/`를 가리키는 심볼릭 링크만 포함됩니다.

### 디렉토리 레이아웃

```
your-project/
  .agents/                          # SSOT — 실제 파일이 여기에 있음
    agents/                         # 에이전트 정의 파일
      backend-engineer.md
      frontend-engineer.md
      qa-reviewer.md
      ...
    config/                         # 설정
      oma-config.yaml
    mcp.json                        # MCP 서버 설정
    results/plan-{sessionId}.json                       # 현재 계획 (/plan으로 생성)
    skills/                         # 설치된 스킬
      _shared/                      # 모든 스킬에 걸친 공유 리소스
        core/                       # 핵심 프로토콜 및 참조
        runtime/                    # 런타임 실행 프로토콜
        conditional/                # 조건부 로드 리소스
      oma-frontend/                 # 프론트엔드 스킬
      oma-backend/                  # 백엔드 스킬
      oma-qa/                       # QA 스킬
      ...
    workflows/                      # 워크플로우 정의
      orchestrate.md
      work.md
      ultrawork.md
      plan.md
      ...
    results/                        # 에이전트 실행 결과
  .claude/                          # Claude Code — 심볼릭 링크만
    skills/                         # -> .agents/skills/* 및 .agents/workflows/*
    agents/                         # -> .agents/agents/*
  .github/                          # GitHub Copilot — 심볼릭 링크만 (선택)
    skills/                         # -> .agents/skills/*
  .serena/                          # MCP 메모리 저장소
    memories/                       # 런타임 메모리 파일
    metrics.json                    # 생산성 메트릭
```

### 심볼릭 링크를 사용하는 이유

- **한 번 업데이트하면 모든 IDE에 적용됩니다.** `oma update`가 `.agents/`를 갱신하면 모든 IDE가 변경 사항을 자동으로 반영합니다.
- **중복 없음.** 스킬은 한 번만 저장되며 IDE별로 복사되지 않습니다.
- **안전한 제거.** `.claude/`를 삭제해도 스킬이 파괴되지 않습니다. `.agents/`의 SSOT는 그대로 유지됩니다.
- **Git 친화적.** 심볼릭 링크는 크기가 작고 diff가 깔끔합니다.

---

## 안전 팁 및 롤백 전략

### 설치 전

1. **현재 작업을 커밋하세요.** 설치 프로그램은 새 디렉토리와 파일을 생성합니다. git 상태가 깨끗하면 `git checkout .`으로 모든 것을 되돌릴 수 있습니다.
2. **기존 `.agents/` 디렉토리를 확인하세요.** 다른 도구에서 생성된 것이 있으면 먼저 백업하세요. 설치 프로그램이 덮어씁니다.

### 설치 후

1. **생성된 것을 검토하세요.** `git status`를 실행하여 모든 새 파일을 확인합니다. 설치 프로그램은 `.agents/`, `.claude/`, 그리고 선택적으로 `.github/`에만 파일을 생성합니다.
2. **선택적으로 `.gitignore`에 추가하세요.** 대부분의 팀은 설정을 공유하기 위해 `.agents/`와 `.claude/`를 커밋합니다. 하지만 `.serena/` (런타임 메모리)와 `.agents/results/` (실행 결과)는 gitignore에 추가해야 합니다:

```gitignore
# oh-my-agent 런타임 파일
.serena/
.agents/results/
.agents/state/
```

### 롤백

프로젝트에서 oh-my-agent를 완전히 제거하려면:

```bash
# SSOT 디렉토리 제거
rm -rf .agents/

# IDE 심볼릭 링크 제거
rm -rf .claude/skills/ .claude/agents/
rm -rf .github/skills/  # 생성된 경우

# 런타임 파일 제거
rm -rf .serena/
```

또는 git으로 간단히 되돌리기:

```bash
git checkout -- .agents/ .claude/
git clean -fd .agents/ .claude/ .serena/
```

---

## 대시보드 설정

설치 후 실시간 모니터링을 설정할 수 있습니다. 자세한 내용은 [대시보드 모니터링 가이드](/docs/guide/dashboard-monitoring)를 참조하세요.

빠른 설정:

```bash
# 터미널 대시보드 (.serena/memories/ 변경 감시)
oma dashboard

# 웹 대시보드 (브라우저 기반, http://localhost:9847)
oma dashboard:web
```

---

## 설치 프로그램의 내부 동작

`oma` (설치 명령)를 실행하면 정확히 다음 과정이 수행됩니다:

### 1. 레거시 마이그레이션

설치 프로그램은 이전의 `.agent/` 디렉토리(단수형)를 확인하고 발견되면 `.agents/`(복수형)로 마이그레이션합니다. 이전 버전에서 업그레이드하는 사용자를 위한 일회성 마이그레이션입니다.

### 2. 경쟁 도구 감지

설치 프로그램은 충돌을 피하기 위해 경쟁 도구를 스캔하고 제거를 제안합니다.

### 3. Tarball 다운로드

설치 프로그램은 oh-my-agent GitHub 릴리스에서 최신 릴리스 tarball을 다운로드합니다. 이 tarball에는 모든 스킬, 공유 리소스, 워크플로우, 설정, 에이전트 정의가 포함된 완전한 `.agents/` 디렉토리가 들어 있습니다.

### 4. 공유 리소스 설치

`installShared()`가 `_shared/` 디렉토리를 `.agents/skills/_shared/`에 복사합니다. 여기에 포함되는 것:

- `core/` — 스킬 라우팅, 컨텍스트 로딩, 프롬프트 구조, 품질 원칙, 벤더 감지, API 컨트랙트.
- `runtime/` — 메모리 프로토콜, 벤더별 실행 프로토콜.
- `conditional/` — 특정 조건이 충족될 때만 로드되는 리소스 (품질 점수, 탐색 루프).

### 5. 워크플로우 설치

`installWorkflows()`가 모든 워크플로우 파일을 `.agents/workflows/`에 복사합니다. `/orchestrate`, `/work`, `/ultrawork`, `/plan`, `/exec-plan`, `/brainstorm`, `/deepinit`, `/review`, `/debug`, `/design`, `/scm`, `/tools`, `/stack-set`의 정의입니다.

### 6. 설정 설치

`installConfigs()`가 기본 설정 파일을 `.agents/config/`에 복사합니다. `oma-config.yaml`과 `mcp.json`을 포함합니다. 이 파일들이 이미 존재하면 `--force`를 사용하지 않는 한 보존됩니다(덮어쓰지 않음).

### 7. 스킬 설치

선택된 각 스킬에 대해 `installSkill()`이 스킬 디렉토리를 `.agents/skills/{skill-name}/`에 복사합니다. 변형이 선택된 경우(예: 백엔드용 Python), 언어별 리소스가 포함된 `stack/` 디렉토리도 설정합니다.

### 8. 벤더 적응

`installVendorAdaptations()`가 지원되는 모든 벤더(Claude, Codex, Gemini, Qwen)에 대한 IDE별 파일을 설치합니다:

- 에이전트 정의 (`.claude/agents/*.md`)
- 훅 설정 (`.claude/hooks/`)
- 설정 파일
- CLAUDE.md 프로젝트 지시사항

### 9. CLI 심볼릭 링크

`createCliSymlinks()`가 IDE별 디렉토리에서 SSOT로 심볼릭 링크를 생성합니다:

- `.claude/skills/{skill}` -> `../../.agents/skills/{skill}`
- `.claude/skills/{workflow}.md` -> `../../.agents/workflows/{workflow}.md`
- `.claude/agents/{agent}.md` -> `../../.agents/agents/{agent}.md`
- `.github/skills/{skill}` -> `../../.agents/skills/{skill}` (Copilot 활성화 시)

### 10. 전역 워크플로우

`installGlobalWorkflows()`가 전역으로 필요할 수 있는 워크플로우 파일(프로젝트 디렉토리 외부)을 설치합니다.

### 11. Git Rerere + MCP 설정

위의 CLI 경로에서 설명한 대로, 설치 프로그램이 선택적으로 git rerere와 MCP 설정을 구성합니다.
