---
title: "가이드: 중앙 레지스트리"
description: 상세 중앙 레지스트리 문서 — release-please 워크플로우, conventional commits, 소비자 템플릿, .agent-registry.yml 형식, GitHub Action 접근 방식과의 비교.
---

# 가이드: 중앙 레지스트리

## 개요

중앙 레지스트리 모델은 oh-my-agent GitHub 리포지토리(`first-fluke/oh-my-agent`)를 버전이 관리되는 아티팩트 소스로 취급합니다. 사용 프로젝트에서 이 레지스트리의 특정 버전 스킬과 워크플로우를 가져다 쓰므로, 팀과 프로젝트 간 일관성을 유지할 수 있습니다.

다음 요구사항이 있는 조직에 적합한 엔터프라이즈급 접근 방식입니다:
- 여러 프로젝트에 걸친 버전 고정.
- 풀 리퀘스트를 통한 감사 가능한 업데이트 추적.
- 다운로드된 아티팩트의 체크섬 검증.
- 자동화된 주간 업데이트 확인.
- 업데이트 적용 전 수동 검토.

---

## 아키텍처

```
┌──────────────────────────────────────────────────────────┐
│                  중앙 레지스트리                            │
│              (first-fluke/oh-my-agent)                    │
│                                                          │
│  ┌──────────────┐   ┌────────────────┐   ┌───────────┐  │
│  │ release-      │   │ CHANGELOG.md    │   │ Releases  │  │
│  │ please        │──►│ .release-       │──►│  - tarball│  │
│  │ workflow      │   │  please-        │   │  - sha256 │  │
│  │              │   │  manifest.json  │   │  - manifest│  │
│  └──────────────┘   └────────────────┘   └─────┬─────┘  │
│                                                 │        │
└─────────────────────────────────────────────────┼────────┘
                                                  │
                    ┌─────────────────────────────┼──────────────┐
                    │                             │              │
              ┌─────▼─────┐              ┌───────▼──────┐ ┌─────▼──────┐
              │ 프로젝트 A  │              │ 프로젝트 B    │ │ 프로젝트 C  │
              │            │              │              │ │            │
              │ .agent-    │              │ .agent-      │ │ .agent-    │
              │ registry   │              │ registry     │ │ registry   │
              │ .yml       │              │ .yml         │ │ .yml       │
              │            │              │              │ │            │
              │ check-     │              │ check-       │ │ check-     │
              │ registry   │              │ registry     │ │ registry   │
              │ -updates   │              │ -updates     │ │ -updates   │
              │ .yml       │              │ .yml         │ │ .yml       │
              │            │              │              │ │            │
              │ sync-agent │              │ sync-agent   │ │ sync-agent │
              │ -registry  │              │ -registry    │ │ -registry  │
              │ .yml       │              │ .yml         │ │ .yml       │
              └────────────┘              └──────────────┘ └────────────┘
```

---

## 메인테이너용: 새 버전 릴리스

### Release-Please 워크플로우

oh-my-agent는 [release-please](https://github.com/googleapis/release-please)를 사용하여 릴리스를 자동화합니다. 흐름은 다음과 같습니다:

1. **Conventional commits**가 `main`에 랜딩됩니다. 각 커밋은 [Conventional Commits](https://www.conventionalcommits.org/) 형식을 따라야 합니다:

   | 접두사 | 의미 | 버전 범프 |
   |:-------|:-----|:---------|
   | `feat:` | 새 기능 | 마이너 (1.x.0) |
   | `fix:` | 버그 수정 | 패치 (1.0.x) |
   | `feat!:` 또는 `BREAKING CHANGE:` | 호환성 깨지는 변경 | 메이저 (x.0.0) |
   | `chore:` | 유지보수 | 범프 없음 (설정에 따라 다름) |
   | `docs:` | 문서 | 범프 없음 |
   | `refactor:` | 코드 재구조화 | 범프 없음 |
   | `perf:` | 성능 개선 | 패치 |
   | `test:` | 테스트 변경 | 범프 없음 |
   | `build:` | 빌드 시스템 | 범프 없음 |
   | `ci:` | CI 설정 | 범프 없음 |
   | `style:` | 코드 스타일 | 범프 없음 |
   | `revert:` | 이전 커밋 되돌리기 | 되돌린 커밋에 따라 다름 |

2. **Release-please가 릴리스 PR을 생성합니다.** 이 PR은:
   - `package.json` 및 관련 파일의 버전을 올립니다.
   - 마지막 릴리스 이후의 모든 커밋으로 `CHANGELOG.md`를 업데이트합니다.
   - `.release-please-manifest.json`을 새 버전으로 업데이트합니다.

3. **릴리스 PR이 머지되면**, release-please가:
   - Git 태그를 생성합니다 (예: `cli-v4.7.0`).
   - 변경 로그와 함께 GitHub Release를 생성합니다.

4. **CI 워크플로우**가 이후:
   - `.agents/` 디렉토리를 포함한 `agent-skills.tar.gz` tarball을 빌드합니다.
   - SHA256 체크섬 파일(`agent-skills.tar.gz.sha256`)을 생성합니다.
   - 버전 및 파일 메타데이터가 포함된 `prompt-manifest.json`을 생성합니다.
   - 세 가지 아티팩트를 모두 GitHub Release에 첨부합니다.
   - CLI 업데이트 메커니즘을 위해 `prompt-manifest.json`을 `main` 브랜치에 동기화합니다.

### 릴리스 아티팩트

각 릴리스는 GitHub Release에 첨부되는 세 가지 아티팩트를 생성합니다:

| 아티팩트 | 설명 | 용도 |
|:---------|:-----|:-----|
| `agent-skills.tar.gz` | `.agents/` 디렉토리의 압축 tarball | 모든 스킬, 워크플로우, 설정, 에이전트를 포함 |
| `agent-skills.tar.gz.sha256` | tarball의 SHA256 체크섬 | 추출 전 무결성 검증 |
| `prompt-manifest.json` | 버전, 파일 수, 메타데이터가 포함된 JSON | `oma update`에서 새 버전 확인에 사용 |

### Conventional Commit 예시

```bash
# 기능 추가 (마이너 범프)
git commit -m "feat: add Rust backend language variant"

# 버그 수정 (패치 범프)
git commit -m "fix: resolve workspace detection for Nx monorepos"

# 호환성 깨지는 변경 (메이저 범프)
git commit -m "feat!: rename .agent/ to .agents/ directory"

# 범위 지정 커밋
git commit -m "feat(backend): add SQLAlchemy async session support"

# 버전 범프 없음
git commit -m "chore: update test fixtures"
git commit -m "docs: add central registry guide"
git commit -m "ci: sync prompt-manifest.json [skip ci]"
```

---

## 소비자용: 프로젝트 설정

### 템플릿 파일

oh-my-agent는 프로젝트에 복사할 두 가지 템플릿 파일을 `docs/consumer-templates/`에 제공합니다:

1. **`.agent-registry.yml`** — 프로젝트 루트에 배치하는 설정 파일.
2. **`check-registry-updates.yml`** — `.github/workflows/`에 배치하는 GitHub Actions 워크플로우.
3. **`sync-agent-registry.yml`** — `.github/workflows/`에 배치하는 GitHub Actions 워크플로우.

### .agent-registry.yml 형식

이 파일은 프로젝트 루트에 위치하며 프로젝트가 중앙 레지스트리와 상호작용하는 방식을 제어합니다.

```yaml
# 중앙 레지스트리 리포지토리
registry:
  repo: first-fluke/oh-my-ag

# 버전 고정
# 옵션:
#   - 특정 버전: "1.2.0"
#   - 최신: "latest" (프로덕션에는 권장하지 않음)
version: "4.7.0"

# 자동 업데이트 설정
auto_update:
  # 주간 업데이트 확인 PR 활성화
  enabled: true

  # 스케줄 (cron 형식) - 기본값: 매주 월요일 오전 9시 UTC
  schedule: "0 9 * * 1"

  # PR 설정
  pr:
    # 자동 머지는 설계상 비활성화 (수동 검토 필요)
    auto_merge: false

    # PR 라벨
    labels:
      - "dependencies"
      - "agent-registry"

    # 리뷰어 (선택)
    # reviewers:
    #   - "username1"
    #   - "username2"

# 동기화 설정
sync:
  # .agents/ 파일의 대상 디렉토리
  target_dir: "."

  # 동기화 전 기존 .agents/ 백업
  backup_existing: true

  # 동기화 중 보존할 파일/디렉토리 (글로브 패턴)
  # 레지스트리에서 덮어쓰지 않음
  preserve:
    - ".agent/config/user-preferences.yaml"
    - ".agent/config/local-*"
```

**주요 필드 설명:**

- **`version`** — 재현성을 위해 특정 버전으로 고정합니다. 실험적 프로젝트에만 `"latest"`를 사용하세요.
- **`auto_update.enabled`** — true이면 확인 워크플로우가 스케줄에 따라 실행됩니다.
- **`auto_update.schedule`** — 확인 빈도를 위한 cron 표현식. 기본값은 매주 월요일 오전 9시 UTC입니다.
- **`auto_update.pr.auto_merge`** — 설계상 항상 `false`. 업데이트에는 수동 검토가 필요합니다.
- **`sync.preserve`** — 동기화 중 덮어쓰지 않아야 할 파일의 글로브 패턴. 일반적으로 프로젝트의 `user-preferences.yaml`과 로컬 설정 오버라이드를 포함합니다.

### 워크플로우 역할

#### check-registry-updates.yml

**목적:** 새 버전을 확인하고 업데이트가 사용 가능하면 PR을 생성합니다.

**트리거:** Cron 스케줄 (기본: 주간) 또는 수동 디스패치.

**흐름:**
1. `.agent-registry.yml`에서 현재 버전을 읽습니다.
2. GitHub API를 통해 레지스트리 리포에서 최신 릴리스 태그를 가져옵니다.
3. 버전을 비교합니다 — 이미 최신이면 종료합니다.
4. 업데이트가 사용 가능한 경우:
   - 이 버전에 대한 PR이 이미 있는지 확인합니다 (중복 방지).
   - 새 브랜치를 생성합니다 (`agent-registry-update-{version}`).
   - `.agent-registry.yml`의 버전을 업데이트합니다.
   - 커밋하고 푸시합니다.
   - 변경 로그 정보와 검토 지시사항이 포함된 PR을 생성합니다.

**적용되는 라벨:** `dependencies`, `agent-registry`.

**필요한 권한:** `contents: write`, `pull-requests: write`.

#### sync-agent-registry.yml

**목적:** 버전이 변경되면 레지스트리 파일을 다운로드하고 적용합니다.

**트리거:** `.agent-registry.yml`을 수정하는 `main`으로의 푸시, 또는 수동 디스패치.

**흐름:**
1. `.agent-registry.yml`(또는 수동 입력)에서 버전을 읽습니다.
2. 릴리스 아티팩트를 다운로드합니다: `agent-skills.tar.gz`, 체크섬, 매니페스트.
3. SHA256 체크섬을 검증합니다.
4. 기존 `.agents/` 디렉토리를 백업합니다 (타임스탬프 포함).
5. tarball을 추출합니다.
6. 백업에서 보존된 파일을 복원합니다 (`sync.preserve` 패턴에 따라).
7. 동기화된 파일을 커밋합니다.
8. 7일이 지난 백업 디렉토리를 정리합니다.

**필요한 권한:** `contents: write`.

---

## 비교: 중앙 레지스트리 vs GitHub Action

| 측면 | 중앙 레지스트리 | GitHub Action |
|:-----|:-------------|:-------------|
| **설정 복잡도** | 높음 — 3개 파일 설정 필요 | 낮음 — 1개 워크플로우 파일 |
| **버전 관리** | `.agent-registry.yml`에서 명시적 고정 | 항상 최신으로 업데이트 |
| **업데이트 메커니즘** | 2단계: 확인 PR 후 동기화 워크플로우 | 단일 단계: CI에서 oma update |
| **체크섬 검증** | 예 — 추출 전 SHA256 검증 | 아니요 — npm 레지스트리에 의존 |
| **롤백** | `.agent-registry.yml`에서 버전 변경 | 업데이트 커밋 되돌리기 |
| **감사 추적** | 라벨이 있는 버전 고정 PR | 커밋 히스토리 |
| **보존 파일** | `.agent-registry.yml`에서 설정 가능한 글로브 패턴 | 내장: `user-preferences.yaml`, `mcp.json`, `stack/` |
| **업데이트 소스** | GitHub Release 아티팩트 (tarball) | npm 레지스트리 (oh-my-agent 패키지) |
| **승인 흐름** | PR 검토 필수 (자동 머지 비활성화) | 설정 가능 (PR 모드 또는 직접 커밋) |
| **여러 프로젝트** | 각 프로젝트가 자체 고정 버전을 가짐 | 각 프로젝트가 독립적으로 실행 |
| **오프라인/에어갭** | 가능 — tarball을 수동 다운로드 | npm 접근 필요 |

---

## 어떤 방식을 선택할지

### 중앙 레지스트리를 사용할 때:

- 같은 버전을 유지해야 하는 여러 프로젝트를 관리하는 경우.
- 체크섬 검증이 포함된 감사 가능하고 검토 가능한 업데이트 PR이 필요한 경우.
- 보안 정책상 의존성 업데이트에 대한 명시적 승인이 필요한 경우.
- 특정 버전을 고정하고 프로젝트를 다른 일정으로 업그레이드하려는 경우.
- 에어갭 환경을 위해 아티팩트를 다운로드해야 하는 경우.

### GitHub Action을 사용할 때:

- 단일 프로젝트 또는 소수의 독립 프로젝트가 있는 경우.
- 가장 간단한 설정을 원하는 경우 (워크플로우 파일 1개).
- 최신 버전으로의 자동 업데이트가 편한 경우.
- 수동 설정 없이 내장된 설정 파일 보존을 원하는 경우.
- tarball 추출보다 직접적인 `oma update` 메커니즘을 선호하는 경우.

### 두 가지 모두 사용할 때:

- 중앙 레지스트리가 버전 고정과 정기 확인을 관리.
- GitHub Action이 버전 범프가 승인되면 실제 `oma update` 호출을 처리.

이 방식도 유효하지만 복잡성이 늘어납니다. 대부분의 팀은 하나만 선택합니다.
