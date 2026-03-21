---
title: 사용 가이드
description: 예시, 워크플로우, 대시보드 운영, 문제 해결을 포함한 전체 사용 가이드.
---

# 멀티 에이전트 스킬 사용 가이드

> 시작이 막막하시면 `/coordinate <원하는 작업 프롬프트>`를 먼저 입력해 주세요.

## 빠른 시작

1. **AI IDE에서 열기**
   ```bash
   # Amp, Claude Code, Gemini CLI 등에서 프로젝트를 열어주세요
   ```

2. **스킬이 자동으로 감지됩니다.** IDE가 `.agents/skills/`를 스캔하여 모든 스킬을 인덱싱합니다.

3. **IDE에서 채팅하세요.** 만들고 싶은 것을 설명하면 됩니다.

---

## 사용 예시

### 예시 1: 간단한 단일 도메인 작업

**입력:**
```
"Tailwind CSS로 이메일, 비밀번호 필드가 있는 로그인 폼 만들어줘"
```

**결과:**
- IDE가 `oma-frontend` 매칭
- 자동으로 스킬 로드 (Progressive Disclosure)
- TypeScript, Tailwind, 폼 검증이 있는 React 컴포넌트 받음

### 예시 2: 복잡한 멀티 도메인 프로젝트

**입력:**
```
"사용자 인증이 있는 TODO 앱 만들어줘"
```

**결과:**

1. **Workflow Guide 활성화** — 멀티 도메인 복잡도 감지
2. **PM Agent 기획** — 우선순위와 함께 태스크 분해
3. **CLI로 에이전트 생성**:
   ```bash
   oma agent:spawn backend "JWT 인증 API" session-01 &
   oma agent:spawn frontend "로그인 및 TODO UI" session-01 &
   wait
   ```
4. **에이전트들이 병렬 작업** — Knowledge Base에 저장
5. **조율** — `.agents/brain/` 일관성 확인
6. **QA Agent 검토** — 보안/성능 감사
7. **수정 & 반복** — 필요시 에이전트 재생성

### 예시 3: 버그 수정

**입력:**
```
"로그인 버튼 클릭하면 'Cannot read property map of undefined' 에러 나요"
```

**결과:**

1. **oma-debug 활성화** — 에러 분석
2. **근본 원인 발견** — `todos` 데이터 로드 전에 map 시도
3. **수정 제공** — 로딩, 에러, 빈 상태 추가
4. **회귀 테스트 작성** — 버그 재발 방지
5. **유사 패턴 발견** — 다른 3개 컴포넌트도 사전 수정

### 예시 4: CLI 기반 병렬 실행

```bash
# 단일 에이전트 (workspace 자동 탐지)
oma agent:spawn backend "JWT 인증 API 구현" session-01

# 병렬 에이전트
oma agent:spawn backend "인증 API 구현" session-01 &
oma agent:spawn frontend "로그인 폼 생성" session-01 &
oma agent:spawn mobile "인증 화면 구축" session-01 &
wait
```

**실시간 모니터링:**
```bash
# 터미널 (별도 창)
bunx oh-my-agent dashboard

# 또는 브라우저
bunx oh-my-agent dashboard:web
# → http://localhost:9847
```

---

## 실시간 대시보드

### 터미널 대시보드

```bash
bunx oh-my-agent dashboard
```

`fswatch` (macOS) 또는 `inotifywait` (Linux)로 `.serena/memories/`를 감시합니다. 세션 상태, 에이전트 상태, 턴 수, 최신 활동을 실시간 테이블로 표시합니다. 메모리 파일 변경 시 자동으로 업데이트됩니다.

**요구 사항:**
- macOS: `brew install fswatch`
- Linux: `apt install inotify-tools`

### 웹 대시보드

```bash
bun install          # 최초 1회
bunx oh-my-agent dashboard:web
```

브라우저에서 `http://localhost:9847` 열기. 기능:

- **WebSocket 실시간 업데이트** (폴링 아님)
- **자동 재연결** — 연결 끊어지면 자동 복구
- **Serena 테마 UI** — 보라색 강조
- **세션 상태** — ID와 실행/완료/실패 상태
- **에이전트 테이블** — 이름, 상태 (컬러 도트), 턴 수, 태스크 설명
- **활동 로그** — progress 및 result 파일의 최신 변경 사항

서버는 chokidar로 `.serena/memories/`를 감시하며 debounce (100ms)를 적용합니다. 변경된 파일만 읽으므로 — 전체 재스캔 없음.

---

## 핵심 개념

### Progressive Disclosure (점진적 공개)
IDE가 자동으로 요청을 스킬에 매칭시킵니다. 스킬을 수동으로 선택할 필요 없습니다. 필요한 스킬만 컨텍스트에 로드됩니다.

### 토큰 최적화 스킬 설계
각 스킬은 토큰 효율을 극대화하는 2계층 아키텍처를 사용합니다:
- **SKILL.md** (~40줄): 정체성, 라우팅, 핵심 규칙 — 즉시 로드
- **resources/**: 실행 프로토콜, 예시, 체크리스트, 에러 플레이북 — 필요 시 로드

공통 리소스는 `_shared/`에 위치하며 (스킬이 아님) 모든 에이전트가 참조합니다:
- 4단계 워크플로우의 Chain-of-thought 실행 프로토콜
- 중간급 모델 가이드를 위한 Few-shot 입출력 예시
- "3 strikes" 에스컬레이션 규칙의 에러 복구 플레이북
- 구조화된 다단계 분석을 위한 추론 템플릿
- Flash/Pro 모델 등급별 컨텍스트 예산 관리
- `verify.sh`를 통한 자동 검증
- 크로스 세션 교훈 누적 시스템

### CLI 에이전트 실행
`oma agent:spawn`을 사용하여 CLI로 에이전트를 실행합니다. `user-preferences.yaml`의 `agent_cli_mapping`을 참조하여 에이전트 타입별로 적절한 CLI(gemini, claude, codex, qwen)를 선택합니다. Workspace는 모노레포 관례에 따라 자동 탐지되며, `-w` 옵션으로 명시적 지정도 가능합니다.

### Knowledge Base
에이전트 산출물이 `.agents/brain/`에 저장됩니다. 기획서, 코드, 리포트, 조율 메모 포함.

### Serena Memory
구조화된 런타임 상태가 `.serena/memories/`에 저장됩니다. Orchestrator가 세션 정보, 태스크 보드, 에이전트별 진행 상황, 결과를 기록합니다. 대시보드들이 이 파일들을 감시하여 모니터링합니다.

### Workspaces (워크스페이스)
에이전트들이 별도 디렉토리에서 작업하여 충돌을 피합니다:
```
./backend    → Backend Agent 워크스페이스
./frontend   → Frontend Agent 워크스페이스
./mobile     → Mobile Agent 워크스페이스
```

---

## 사용 가능한 스킬

| 스킬 | 자동 활성화 조건 | 산출물 |
|------|----------------|--------|
| oma-coordination | 복잡한 멀티 도메인 프로젝트 | 에이전트 조율 가이드 |
| oma-pm | "기획해줘", "분석해줘" | `.agents/plan.json` |
| oma-frontend | UI, 컴포넌트, 스타일링 | React 컴포넌트, 테스트 |
| oma-backend | API, 데이터베이스, 인증 | API 엔드포인트, 모델, 테스트 |
| oma-db | 데이터베이스, 스키마, ERD, 마이그레이션 | 스키마 설계, 쿼리 튜닝 |
| oma-mobile | 모바일 앱, iOS/Android | Flutter 화면, 상태 관리 |
| oma-brainstorm | 아이디에이션, 컨셉 탐색 | 설계 문서 |
| oma-dev-workflow | CI/CD, git hooks, 모노레포 설정 | 워크플로우 설정, 자동화 |
| oma-tf-infra | Terraform, 클라우드 인프라 | IaC 모듈, 상태 관리 |
| oma-translator | 번역, 다국어 콘텐츠 | 톤을 유지한 번역문 |
| oma-qa | "보안 검토", "감사" | 우선순위가 있는 QA 리포트 |
| oma-debug | 버그 리포트, 에러 메시지 | 수정된 코드, 회귀 테스트 |
| oma-orchestrator | CLI 서브에이전트 실행 | `.agents/results/`에 결과 저장 |
| oma-commit | "commit", "커밋해줘" | Git 커밋 (기능별 자동 분리) |

---

## 워크플로우 명령어

AI IDE 채팅에서 입력하여 단계별 워크플로우를 실행합니다:

| 명령어 | 설명 |
|--------|------|
| `/brainstorm` | 설계 우선 아이디에이션 — 의도, 제약 조건, 접근 방식 탐색 |
| `/coordinate` | CLI를 통한 단계별 멀티 에이전트 조율 |
| `/deepinit` | AGENTS.md, ARCHITECTURE.md로 프로젝트 하네스 초기화 |
| `/exec-plan` | 실행 계획을 레포 아티팩트로 생성 및 추적 |
| `/orchestrate` | CLI 기반 자동 병렬 에이전트 실행 |
| `/plan` | PM 태스크 분해 + API 계약 정의 |
| `/review` | 전체 QA 파이프라인 (보안, 성능, 접근성, 코드 품질) |
| `/debug` | 구조화된 버그 수정 (재현 → 진단 → 수정 → 회귀 테스트) |
| `/setup` | 프로젝트 설정 및 구성 |
| `/tools` | MCP 도구 관리 |
| `/ultrawork` | 11개 리뷰 게이트를 포함한 고품질 5단계 개발 |

이것들은 **스킬** (자동 활성화)과 별개입니다. 워크플로우는 다단계 프로세스에 대한 명시적 제어를 제공합니다.

---

## 일반적인 워크플로우

### 워크플로우 A: 단일 스킬

```
입력: "버튼 컴포넌트 만들어줘"
  → IDE가 oma-frontend 로드
  → 컴포넌트 즉시 받음
```

### 워크플로우 B: 멀티 에이전트 프로젝트 (자동)

```
입력: "인증이 있는 TODO 앱 만들어줘"
  → oma-coordination 자동 활성화
  → PM Agent 기획
  → CLI로 에이전트 생성 (oma agent:spawn)
  → 에이전트 병렬 작업
  → QA Agent 검토
  → 이슈 수정 & 반복
```

### 워크플로우 B-2: 멀티 에이전트 프로젝트 (명시적)

```
입력: /coordinate
  → 단계별 가이드 워크플로우
  → PM 기획 → 계획 검토 → 에이전트 생성 → 모니터링 → QA 검토
```

### 워크플로우 C: 버그 수정

```
입력: "로그인 버튼에서 TypeError 발생"
  → oma-debug 활성화
  → 근본 원인 분석
  → 수정 + 회귀 테스트
```

### 워크플로우 D: CLI Orchestration + 대시보드

```
터미널 1: bunx oh-my-agent dashboard:web
터미널 2: oma agent:spawn backend "task" session-01 &
         oma agent:spawn frontend "task" session-01 &
브라우저:  http://localhost:9847 → 실시간 상태
```

---

## 팁

1. **구체적으로** — "JWT 인증과 React 프론트엔드, FastAPI 백엔드가 있는 TODO 앱 만들어줘"가 "앱 만들어줘"보다 낫습니다.
2. **멀티 도메인은 CLI spawning 사용** — 한 채팅에서 모든 것을 하려고 하지 마세요.
3. **Knowledge Base 검토** — `.agents/brain/`에서 API 일관성 확인
4. **재생성으로 반복** — 처음부터 다시 하지 말고, 명령을 다듬어 재생성하세요.
5. **대시보드 사용** — `bunx oh-my-agent dashboard` 또는 `bunx oh-my-agent dashboard:web`로 orchestrator 세션 모니터링
6. **별도 워크스페이스** — 각 에이전트에 고유 디렉토리 할당

---

## 문제 해결

| 문제 | 해결법 |
|------|--------|
| IDE에서 스킬이 로드되지 않음 | 프로젝트를 IDE에서 열고, `.agents/skills/` 폴더와 `SKILL.md` 파일을 확인한 뒤 IDE를 재시작하세요 |
| CLI를 찾을 수 없음 | `which gemini` / `which claude` 확인, 누락된 CLI 설치 |
| 에이전트 간 코드 불일치 | `.agents/brain/`에서 산출물을 검토하고, 한 에이전트를 다른 에이전트 출력 참조로 재실행한 뒤 QA Agent로 최종 일관성을 점검하세요 |
| 대시보드에 "No agents detected" 표시 | 메모리 파일이 아직 생성되지 않았습니다. Orchestrator를 실행하거나 `.serena/memories/`에 수동으로 파일을 생성하세요 |
| 웹 대시보드가 시작 안 됨 | `bun install`로 chokidar, ws 설치 |
| fswatch not found | macOS: `brew install fswatch`, Linux: `apt install inotify-tools` |
| QA 리포트에 50개 이상 이슈 | CRITICAL/HIGH부터 처리, 나머지는 문서화 후 나중에 |

---

## CLI 명령어

```bash
bunx oh-my-agent                # 대화형 스킬 설치
bunx oh-my-agent doctor         # 설정 확인 & 누락된 스킬 보강
bunx oh-my-agent doctor --json  # CI/CD용 JSON 출력
bunx oh-my-agent update         # 스킬을 최신 버전으로 업데이트
bunx oh-my-agent stats          # 생산성 메트릭 조회
bunx oh-my-agent stats --reset  # 메트릭 초기화
bunx oh-my-agent retro          # 세션 회고 (배운 점 & 다음 단계)
bunx oh-my-agent dashboard      # 터미널 실시간 대시보드
bunx oh-my-agent dashboard:web  # 웹 대시보드 (http://localhost:9847)
bunx oh-my-agent help           # 도움말 표시
```

---

## 개발자용 (통합 가이드)

기존 프로젝트에 이 스킬들을 통합하고 싶다면 [기존 프로젝트 통합](./integration.md)을 참고하세요. 다음을 포함합니다:
- 빠른 3단계 통합
- 전체 대시보드 통합
- 본인 기술 스택에 맞게 스킬 커스터마이징
- 문제 해결 및 모범 사례

---

**AI IDE에서 채팅하세요.** 모니터링을 위해 대시보드를 사용하고, CLI 실행을 위해 orchestrator 스크립트를 사용합니다. 기존 프로젝트 통합은 [기존 프로젝트 통합](./integration.md)을 참고하세요.
