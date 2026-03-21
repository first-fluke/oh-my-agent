---
title: 기존 프로젝트 통합
description: 기존 AI IDE 프로젝트에 oh-my-agent 스킬을 안전하고 비파괴적으로 통합하는 가이드.
---

# 기존 프로젝트에 통합하기

이 문서는 루트의 구버전 `AGENT_GUIDE.md`를 대체하며, 현재 워크스페이스 구조(`cli` + `web`)와 최신 CLI 동작 기준으로 작성되었습니다.

## 목표

기존 프로젝트 자산을 덮어쓰지 않고 `oh-my-agent` 스킬을 추가합니다.

## 권장 경로 (CLI)

대상 프로젝트 루트에서 실행:

```bash
bunx oh-my-agent
```

실행 시 작업:

- `.agents/skills/*` 설치/업데이트
- `.agents/skills/_shared` 공통 리소스 설치
- `.agents/skills/*`, `.claude/skills/*` 호환 심링크 생성
- `.agents/workflows/*` 설치
- `.agents/config/user-preferences.yaml` 설치
- 선택적으로 `~/.gemini/global_workflows` 전역 워크플로우 설치

## 수동 통합 (안전 모드)

디렉토리별로 직접 통제해야 할 때 사용합니다.

```bash
cd /path/to/your-project

mkdir -p .agents/skills .agents/skills .agents/workflows .agents/config .claude/skills

# 없는 스킬만 복사 (예시)
for skill in oma-coordination oma-pm oma-frontend oma-backend oma-mobile oma-qa oma-debug oma-orchestrator oma-commit; do
  if [ ! -d ".agents/skills/$skill" ]; then
    cp -r /path/to/oh-my-agent/.agents/skills/$skill .agents/skills/$skill
  fi
done

# 공통 리소스가 없으면 복사
[ -d .agents/skills/_shared ] || cp -r /path/to/oh-my-agent/.agents/skills/_shared .agents/skills/_shared

# 호환 심링크 생성
for skill in oma-coordination oma-pm oma-frontend oma-backend oma-mobile oma-qa oma-debug oma-orchestrator oma-commit _shared; do
  [ -L ".agents/skills/$skill" ] || ln -s "../../.agents/skills/$skill" ".agents/skills/$skill"
  [ -L ".claude/skills/$skill" ] || ln -s "../../.agents/skills/$skill" ".claude/skills/$skill"
done

# 워크플로우가 없으면 복사
for wf in coordinate.md orchestrate.md plan.md review.md debug.md setup.md tools.md; do
  [ -f ".agents/workflows/$wf" ] || cp /path/to/oh-my-agent/.agents/workflows/$wf .agents/workflows/$wf
done

# 기본 사용자 설정이 없으면 복사
[ -f .agents/config/user-preferences.yaml ] || cp /path/to/oh-my-agent/.agents/config/user-preferences.yaml .agents/config/user-preferences.yaml
```

## 검증 체크리스트

```bash
# 설치형 스킬 9개(_shared 제외)
find .agents/skills -mindepth 1 -maxdepth 1 -type d ! -name '_shared' | wc -l

# 공통 리소스
[ -d .agents/skills/_shared ] && echo ok

# 워크플로우 7개
find .agents/workflows -maxdepth 1 -name '*.md' | wc -l

# 기본 상태 점검
bunx oh-my-agent doctor
```

## 선택 기능: 대시보드

대시보드는 선택 기능이며 설치된 CLI로 실행합니다.

```bash
bunx oh-my-agent dashboard
bunx oh-my-agent dashboard:web
```

웹 대시보드 기본 주소: `http://localhost:9847`

## 롤백 전략

통합 전에 프로젝트에 체크포인트 커밋을 남기세요.

```bash
git add -A
git commit -m "chore: checkpoint before oh-my-agent integration"
```

되돌려야 하면 팀 표준 절차에 맞춰 해당 커밋을 롤백하세요.

## 멀티 CLI 심링크 지원

`bunx oh-my-agent`를 실행하면 스킬 선택 후 다음과 같은 프롬프트가 표시됩니다:

```text
다른 CLI 도구용 심링크도 만드시겠어요?
  ○ Cursor (.cursor/skills/)
  ○ GitHub Copilot (.github/skills/)
```

설치 프로그램은 항상 다음을 수행합니다:

1. 스킬을 `.agents/skills/`에 설치 (CLI 기준 SSOT)
2. `.agents/skills/`와 `.claude/skills/`에 호환 심링크 생성

추가 CLI를 선택하면 해당 디렉토리에도 심링크를 생성합니다. 이렇게 하면 단일 출처를 유지하면서 여러 도구에서 같은 스킬을 사용할 수 있습니다.

### 심링크 구조

```text
.agents/skills/oma-frontend/     ← 출처 (SSOT)
.agents/skills/oma-frontend/      → ../../.agents/skills/oma-frontend/
.claude/skills/oma-frontend/     → ../../.agents/skills/oma-frontend/
.github/skills/oma-frontend/     → ../../.agents/skills/oma-frontend/ (GitHub Copilot)
```

설치 프로그램은 기존 심링크를 건 넘기고, 대상 위치에 실제 디렉토리가 있는 경우 경고합니다.

## 참고

- 커스터마이즈된 `.agents/skills/*`가 있으면 의도하지 않은 덮어쓰기를 피하세요.
- 프로젝트 정책 파일(`.agents/config/*`)은 각 프로젝트 저장소 소유로 관리하세요.
- 멀티 에이전트 조율 패턴은 [`사용 가이드`](./usage.md)를 이어서 참고하세요.
