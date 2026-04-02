# i18n Guide — Response Language Rules

Agent/workflow 응답 언어 처리의 단일 진실 원천(SSOT).

## Language Resolution

응답 언어는 다음 우선순위로 결정한다:

1. **User prompt language** — 사용자가 특정 언어로 질문하면 해당 언어로 응답
2. **`user-preferences.yaml`** — `.agents/config/user-preferences.yaml`의 `language` 필드
3. **Fallback** — 위 둘 다 없으면 영어(en)

```yaml
# .agents/config/user-preferences.yaml
language: ko  # ko, en, ja, zh, ...
```

## What to Localize

| Category | Localize? | Example |
|----------|-----------|---------|
| 자연어 응답 / 설명 | Yes | "API 엔드포인트를 생성했습니다" |
| 에러 메시지 (사용자 대면) | Yes | "인증에 실패했습니다" |
| 상태 업데이트 / 진행 보고 | Yes | "Phase 2 완료, Phase 3 시작" |
| Charter Preflight 출력 | Yes | 설명 텍스트는 로컬라이즈, 키워드는 영어 유지 |
| 결과 파일 (result-*.md) | Yes | 사용자가 읽는 텍스트 |

## What Stays in English

| Category | Why | Example |
|----------|-----|---------|
| 코드 (변수, 함수, 클래스) | 코드베이스 일관성 | `getUserProfile()` |
| Git commit 메시지 | conventional commits 표준 | `feat: add user auth` |
| PR 제목/본문 | GitHub 협업 표준 | `fix: resolve race condition` |
| 기술 용어 / 도메인 용어 | 번역 시 의미 손실 | API, JWT, middleware, scaffold |
| 파일 경로 / 설정 키 | 시스템 식별자 | `.agents/config/` |
| 로그 레벨 / 상태 키워드 | 파싱 호환성 | `Status: completed`, `BLOCKED` |
| CLAUDE.md / SKILL.md 내부 | 시스템 프롬프트 | 영어 원본 유지 |

## Mixed-Language Rules

1. **기술 용어는 원어 유지** — 무리하게 번역하지 않는다
   - Good: "JWT 토큰을 검증합니다"
   - Bad: "JSON 웹 토큰을 검증합니다"
2. **코드 블록 내부는 항상 영어** — 주석도 영어
3. **인라인 코드(`backtick`)는 번역하지 않음**
4. **괄호 보충 허용** — 낯선 용어는 `번역어(원어)` 형식으로 한 번만 보충
5. **존댓말 레벨 통일** — 한국어의 경우 해요체 기본, 문서는 합쇼체

## Workflow Integration

모든 워크플로우에서 이 규칙을 따른다. 기존 워크플로우의 아래 라인이 이 가이드를 참조하는 것과 동일하다:

```
- **Response language follows `language` setting in `.agents/config/user-preferences.yaml` if configured.**
```

## Subagent Behavior

- 서브에이전트의 **결과 파일**(`result-*.md`)은 사용자 언어로 작성
- 서브에이전트 간 **내부 통신**(charter, status keywords)은 영어 유지
- 에이전트 정의 파일(`.agents/agents/*.md`)은 영어로 유지
