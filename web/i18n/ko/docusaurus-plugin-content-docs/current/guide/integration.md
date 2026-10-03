---
title: "가이드: 기존 프로젝트 통합"
sidebar_label: 기존 프로젝트에 통합
description: 기존 프로젝트에 oh-my-agent을 추가하는 완전 가이드입니다. CLI 경로, 수동 경로, 검증, SSOT 심볼릭 링크 구조, 설치 프로그램의 내부 동작을 다룹니다.
---

# 가이드: 기존 프로젝트 통합

## 두 가지 통합 경로

기존 프로젝트에 oh-my-agent을 추가하는 방법은 두 가지입니다:

1. **CLI 경로**: `oma` (또는 `npx oh-my-agent`)를 실행하고 대화형 프롬프트를 따릅니다. 대부분의 사용자에게 권장됩니다.
2. **수동 경로**: 파일을 직접 복사하고 심볼릭 링크를 설정합니다. 제한된 환경이나 커스텀 설정에 유용합니다.

두 경로 모두 동일한 결과를 생성합니다: `.agents/` 디렉토리(SSOT)와 `.claude/agents/`, `.codex/agents/`, `.qwen/agents/` 같은 벤더 네이티브 생성 파일입니다.

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

설정할 프로젝트 디렉토리에서 설치 프로그램을 실행하세요. OMA는 설치 root를 기준으로 SSOT를 기록합니다. 검토와 롤백에는 Git 저장소를 권장하지만, 설치 프로그램에 Git 저장소가 필수는 아닙니다.

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

- **Python**: FastAPI/SQLAlchemy (기본값)
- **Node.js**: NestJS/Hono + Prisma/Drizzle
- **Rust**: Axum/Actix-web
- **Other / Auto-detect**: 나중에 `/stack-set`으로 설정

### 6. IDE 심볼릭 링크 설정

설치 프로그램은 항상 Claude Code 심볼릭 링크(`.claude/skills/`)를 생성합니다. 또한 선택한 벤더의 네이티브 에이전트 파일, 훅, 설정, 통합 파일을 생성합니다. 현재 벤더 계열에는 Antigravity, Claude, Codex, Cursor, Kiro, Kimi, Qwen과 pi 및 OpenCode 확장 경로가 포함됩니다. `.github/` 디렉토리가 존재하면 GitHub Copilot 심볼릭 링크를 자동으로 생성할 수 있습니다. ZCode를 선택하면 워크플로우만 `.zcode/commands/*.md` 심볼릭 링크를 통해 슬래시 명령으로 노출합니다(에이전트 파일이나 훅은 없음). 그 외에는 다음과 같이 질문합니다:

```
Also create symlinks for GitHub Copilot? (.github/skills/)
```

### 7. 권장 전역 git 설정

`oma install`과 `oma update` 끝에서 CLI가 멀티 에이전트 워크플로우에 도움이 되는 **전역** git 설정 두 가지를 검사합니다:

| 키 | 권장 값 | 이유 |
|:---|:--------|:-----|
| `rerere.enabled` | `true` | 기록해 둔 해결을 재사용합니다. 멀티 에이전트 머지에서 같은 충돌이 반복될 때 이전 해결을 자동으로 적용합니다 |
| `init.defaultBranch` | `main` | 새 저장소의 기본 브랜치 이름을 일관되게 유지 |

값이 없거나 다르면 대화형 confirm을 제안합니다(기본값 **yes**):

```
Enable git rerere? (Recommended for multi-agent merge conflict reuse) (unset)
Set git init.defaultBranch to main? (Recommended global default) (currently "master")
```

수락 시 다음 명령과 동일하게 설정합니다:

```bash
git config --global rerere.enabled true
git config --global init.defaultBranch main
```

**비대화형 경로**(`--yes`, `--ci`, `CI=true`)에서는 전역 git 설정을 쓰지 않습니다. 수동 수정 명령 힌트만 출력합니다.

`oma doctor`는 같은 항목을 **Git Config**로 보고하고, 불일치를 이슈로 집계하며, `--json`의 `gitRecommended`로 노출하고, 대화형으로 수정을 제안할 수 있습니다.

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

# SSOT에서 벤더 네이티브 파일 재생성
cd /path/to/your/project
oma link
```

`oma link`는 `.agents/agents/`에서 `.claude/`, `.codex/`, `.qwen/` 및 관련 벤더 네이티브 파일을 다시 생성합니다. 런타임에는 현재 런타임 벤더가 해당 에이전트의 대상 벤더와 일치할 때만 OMA가 네이티브 디스패치를 사용합니다. 벤더가 섞인 설정도 동작하지만, 일치하지 않는 에이전트는 외부 `oma agent spawn`으로 폴백합니다.

Qwen Code에서는 생성된 Markdown 정의가 `.qwen/agents/`에 있습니다. OMA 역할은 Agent 도구의 `subagent_type`으로 선택합니다(예: `backend-engineer`). 사용 가능한 정의는 Qwen Code의 `/agents manage`로 확인합니다. 네이티브 에이전트도 CLI 스폰과 같은 [결과 수명 주기](./agent-results-and-resume.md)를 따릅니다: `oma agent begin`, `oma agent verify`, `oma agent finish`. `model_preset: free`에서는 자식 프로세스가 게이트웨이 설정을 받도록 `oma agent spawn`을 사용하세요.

Qwen Code는 다른 벤더와 같은 `code-intelligence-primer`를 사용합니다. Claude Code와 마찬가지로 공유 primer를 `SessionStart`와 `UserPromptSubmit`에 등록하며, 안내는 세션마다 한 번 주입되고 컨텍스트 압축 후에 다시 주입됩니다. primer는 설정된 프로바이더(Serena 또는 Gortex)를 따르고, 지연 로드 도구(deferred tool) 안내를 포함하며, 프로바이더를 사용할 수 없거나 시간 초과되면 네이티브 폴백을 허용합니다. Qwen은 별도의 코드 검색 차단이나 프로바이더 결과 추적을 추가하지 않습니다.

CLI를 업데이트한 뒤에는 `oma link qwen`을 실행해 훅 설정과 래퍼를 재생성하고, 새 Qwen 세션을 시작하세요. 훅 출력 테스트는 통합 계약을 검증할 뿐, 모델이 어떤 도구를 선택할지는 보장하지 않습니다.

### 3단계: 사용자 환경설정 구성

```bash
mkdir -p /path/to/your/project/.agents
cat > /path/to/your/project/.agents/oma-config.yaml << 'EOF'
language: en
date_format: ISO
timezone: UTC
model_preset: antigravity
EOF
```

### 4단계: 메모리 디렉토리 초기화

```bash
oma memory init
# 또는 수동으로:
mkdir -p /path/to/your/project/.agents/state/memories
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
| **CLI 설치** | agy, claude, codex, qwen의 버전 및 가용성 |
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
ls .agents/state/memories/ 2>/dev/null || echo "Memory not initialized"

# 버전 확인
cat .agents/skills/_version.json 2>/dev/null
```

---

## 멀티 IDE 심볼릭 링크 구조 (SSOT 개념)

oh-my-agent은 단일 진실 원천(SSOT) 아키텍처를 사용합니다. `.agents/` 디렉토리가 스킬, 워크플로우, 설정, 에이전트 정의가 존재하는 유일한 장소입니다. 모든 IDE별 디렉토리에는 `.agents/`를 가리키는 심볼릭 링크만 포함됩니다.

### 디렉토리 레이아웃

```
your-project/
  .agents/                          # SSOT — 실제 파일이 여기에 있음
    agents/                         # 에이전트 정의 파일
      backend-engineer.md
      frontend-engineer.md
      qa-reviewer.md
      ...
    config/                         # 배포된 보조 설정 파일
      ...
    oma-config.yaml                 # 사용자가 소유한 프로젝트 설정
    mcp.json                        # MCP 서버 설정
    results/plan-{sessionId}.json    # 현재 계획 (/plan으로 생성)
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
    state/                          # 런타임 조정 상태
      memories/                     # 조정 아티팩트(progress-*, result-*, task-board, session-cost-*)
    results/                        # 에이전트 실행 결과
  .claude/                          # Claude Code — 심볼릭 링크만
    skills/                         # -> .agents/skills/* 및 .agents/workflows/*
    agents/                         # -> .agents/agents/*
  .github/                          # GitHub Copilot — 심볼릭 링크만 (선택)
    skills/                         # -> .agents/skills/*
  .zcode/                           # ZCode — 워크플로우 명령만 (선택)
    commands/                       # -> .agents/workflows/*
  .serena/                          # OMA 상태와 별개인 Serena MCP 저장소
    memories/                       # Serena 자체 온보딩 메모리
    metrics.json                    # 생산성 메트릭
```

### 심볼릭 링크를 사용하는 이유

`oma update`가 `.agents/`를 갱신하면 그곳을 가리키는 모든 IDE가 변경 사항을 함께 반영합니다. 스킬은 IDE마다 복사되지 않고 한 번만 저장됩니다. `.claude/`를 삭제해도 스킬은 사라지지 않고 `.agents/`의 SSOT가 그대로 남습니다. 심볼릭 링크는 크기가 작고 git에서 diff도 깔끔합니다.

---

## 안전 팁 및 롤백 전략

### 설치 전

1. **현재 작업을 커밋하세요.** 설치 프로그램은 새 디렉토리와 파일을 생성합니다. git 상태가 깨끗하면 `git checkout .`으로 모든 것을 되돌릴 수 있습니다.
2. **기존 `.agents/` 디렉토리를 확인하세요.** 다른 도구에서 생성된 것이 있으면 먼저 백업하세요. 설치 프로그램이 덮어씁니다.

### 설치 후

1. **생성된 것을 검토하세요.** `git status`를 실행하여 모든 새 파일을 확인합니다. 설치 프로그램은 `.agents/`, `.claude/`, 그리고 선택적으로 `.github/`에만 파일을 생성합니다.
2. **`.gitignore`를 확인하세요.** Git 저장소에서 install/update/link는 런타임 항목(`.antigravitycli/`, `.agents/results/`, `.agents/state/`, `.agents/backup/`, `docs/plans/`)을 root `.gitignore`에 자동으로 추가합니다. 추가된 내용을 확인하세요. 대부분의 팀은 설정 공유를 위해 `.agents/`와 `.claude/`를 커밋합니다. `.serena/`는 Serena가 내부 `.serena/.gitignore`로 자체 캐시를 관리하므로 판단에 따라 `.serena/project.yml`만 커밋하거나 디렉토리 전체를 무시할 수 있습니다:

```gitignore
# 선택 사항 — Serena 전체 무시(런타임 메모리)
.serena/
```

### 롤백

프로젝트에서 oh-my-agent을 완전히 제거하려면:

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
# 터미널 대시보드 (.agents/state/memories/ 변경 감시)
oma dashboard terminal

# 웹 대시보드 (브라우저 기반, OMA가 token 포함 loopback URL 출력)
oma dashboard web
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

- `core/`: 스킬 라우팅, 컨텍스트 로딩, 프롬프트 구조, 품질 원칙, 벤더 감지, API 컨트랙트.
- `runtime/`: 메모리 프로토콜, 벤더별 실행 프로토콜.
- `conditional/`: 특정 조건이 충족될 때만 로드되는 리소스 (품질 점수, 탐색 루프).

### 5. 워크플로우 설치

`installWorkflows()`가 모든 워크플로우 파일을 `.agents/workflows/`에 복사합니다. `/orchestrate`, `/work`, `/ultrawork`, `/plan`, `/brainstorm`, `/deepinit`, `/review`, `/debug`, `/design`, `/scm`, `/tools`, `/stack-set`의 정의입니다.

### 6. 설정 설치

`installConfigs()`가 보조 파일을 `.agents/config/`에 복사하고, `.agents/mcp.json`을 만들며, 사용자가 소유한 `.agents/oma-config.yaml` 또는 `.agents/oma-config.cue`를 부트스트랩합니다. 기존 사용자 파일은 `--force`를 사용하지 않는 한 보존됩니다. `oma update`도 사용자 설정을 유지하고 필요하면 새 최상위 템플릿 키를 덧붙입니다.

### 7. 스킬 설치

선택된 각 스킬에 대해 `installSkill()`이 스킬 디렉토리를 `.agents/skills/{skill-name}/`에 복사합니다. 변형이 선택된 경우(예: 백엔드용 Python), 언어별 리소스가 포함된 `stack/` 디렉토리도 설정합니다.

### 8. 벤더 적응

`installVendorAdaptations()`가 선택한 지원 벤더에 대한 IDE별 파일을 설치합니다:

- 에이전트 정의 (`.claude/agents/*.md`, `.codex/agents/*.toml`, `.gemini/agents/*.md`)
- 훅 설정 (`.claude/hooks/`, `.codex/hooks.json`)
- 설정 파일과 공유 벤더 통합 문서 (`AGENTS.md`만 해당, Claude Code ≥ 2.1.277 포함). `CLAUDE.md`와 `GEMINI.md`에는 OMA 블록을 넣지 않으며, 사용자가 소유한 기존 `CLAUDE.md`에는 Claude Code가 `AGENTS.md`를 건너뛰지 않도록 `@AGENTS.md` import 줄만 추가합니다

Codex는 훅을 일회성 신뢰 단계 뒤에 두기 때문에, Codex의 `/hooks` 브라우저에서 한 번 검토하기 전까지 `.codex/hooks.json`이 실행되지 않습니다. 자세한 내용은 [Codex 훅 신뢰](/docs/guide/codex-hook-trust)를 참고하세요.

### 9. CLI 심볼릭 링크

`createCliSymlinks()`가 IDE별 디렉토리에서 SSOT로 심볼릭 링크를 생성합니다:

- `.claude/skills/{skill}` -> `../../.agents/skills/{skill}`
- `.claude/skills/{workflow}.md` -> `../../.agents/workflows/{workflow}.md`
- `.github/skills/{skill}` -> `../../.agents/skills/{skill}` (Copilot 활성화 시)

벤더 네이티브 에이전트 파일은 심볼릭 링크가 아니라 `oma link`, `oma install`, `oma update`가 `.agents/agents/`에서 생성합니다.

### 10. 전역 워크플로우

`installGlobalWorkflows()`가 전역으로 필요할 수 있는 워크플로우 파일(프로젝트 디렉토리 외부)을 설치합니다.

### 11. 권장 git 설정 + MCP

위의 CLI 경로에서 설명한 대로, install/update는 대화형 동의 하에 권장 **전역** git 설정(`rerere.enabled`, `init.defaultBranch`)을 선택적으로 구성하며, 해당되는 경우 MCP 설정도 구성할 수 있습니다.
