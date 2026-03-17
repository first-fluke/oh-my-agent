# oh-my-agent v2.x — Claude Code Integration

## 프로젝트 정체성
- **oh-my-agent**: 멀티 에이전트 오케스트레이션 프레임워크
- **SSOT**: `.agents/` 디렉토리 (직접 수정 금지)
- **응답 언어**: 한국어 (`.agents/config/user-preferences.yaml` → `language: ko`)

## 아키텍처
- **13 도메인 Skills**: `.agents/skills/`
- **11 Workflows**: `.agents/workflows/` (`skills/`에 네이티브 skill로 매핑)
- **7 서브에이전트**: `agents/` (Task tool로 스폰)

## 네이티브 모드 매핑

| 슬래시 커맨드 | 원본 워크플로우 | 실행 방식 |
|:------------|:-------------|:---------|
| `/orchestrate` | `orchestrate.md` | 병렬 서브에이전트 + Review Loop |
| `/coordinate` | `coordinate.md` | TaskCreate + Issue Remediation Loop |
| `/ultrawork` | `ultrawork.md` | 5-Phase Gate Loop |
| `/plan` | `plan.md` | inline PM 분석 |
| `/exec-plan` | `exec-plan.md` | inline 플랜 관리 |
| `/brainstorm` | `brainstorm.md` | inline 디자인 탐색 |
| `/review` | `review.md` | qa-reviewer 서브에이전트 위임 |
| `/debug` | `debug.md` | inline + 서브에이전트 |
| `/setup` | `setup.md` | inline 셋업 |
| `/commit` | `commit/SKILL.md` | inline git 커밋 |
| `/tools` | `tools.md` | inline MCP 관리 |
| `/deepinit` | `deepinit.md` | inline 프로젝트 초기화 |

## 필수 참조 (모든 skill 실행 전)
1. `.agents/skills/_shared/skill-routing.md` — 에이전트 라우팅
2. `.agents/skills/_shared/context-loading.md` — 리소스 선택적 로딩
3. `.agents/skills/_shared/prompt-structure.md` — 4요소: Goal, Context, Constraints, Done When

## 서브에이전트 스폰 규칙
- `agents/*.md` 정의 → Task tool로 스폰
- 병렬 스폰: 같은 메시지에서 복수 Task tool 호출
- 결과: Task tool이 동기 반환 (CLI 폴링 불필요)
- 에이전트 결과: `.agents/results/result-{agent}.md`에 기록

## 루프 패턴
| 패턴 | 사용처 | 조건 | 최대 반복 |
|:-----|:------|:-----|:---------|
| Review Loop | `/orchestrate` | QA FAIL | 5회 (3 self + 2 cross) |
| Issue Remediation | `/coordinate` | CRITICAL/HIGH 이슈 | 이슈 해소까지 |
| Phase Gate | `/ultrawork` | 게이트 미충족 | 게이트별 무제한 |

## 절대 규칙
1. **`.agents/` 내 파일 수정 금지** — SSOT 보호
2. 심링크된 도메인 skills는 Claude가 키워드 기반으로 자동 활성화 가능
3. 워크플로우 skills는 사용자 명시적 호출(`/command`)만 허용
4. 서브에이전트는 Charter Preflight(`CHARTER_CHECK`) 필수
5. 플랜 저장: `.agents/plan.json` (호환성 유지)
6. 커밋 Co-Author: `First Fluke <our.first.fluke@gmail.com>`
