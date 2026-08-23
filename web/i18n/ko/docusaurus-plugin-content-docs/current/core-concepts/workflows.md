---
title: 워크플로우
description: oh-my-agent 16개 워크플로우 완전 레퍼런스입니다. 슬래시 명령, 영구 vs 비영구 모드, 11개 언어의 트리거 키워드, 단계 및 스텝, 읽기/쓰기 파일, triggers.json과 keyword-detector.ts를 통한 자동 감지 메커니즘, 정보성 패턴 필터링, 영구 모드 상태 관리를 다룹니다.
---

# 워크플로우

워크플로우는 슬래시 명령이나 자연어 키워드로 트리거되는 구조화된 다단계 프로세스입니다. 단일 단계 유틸리티부터 복잡한 5단계 품질 게이트까지 에이전트가 태스크에서 어떻게 협업하는지 정의합니다.

16개의 워크플로우가 있으며, 그 중 4개는 영구 워크플로우입니다(상태를 유지하며 실수로 중단할 수 없습니다).

---

## 영구 워크플로우

영구 워크플로우는 모든 태스크가 완료될 때까지 계속 실행됩니다. `.agents/state/`에 상태를 유지하고, 명시적으로 비활성화될 때까지 매 사용자 메시지에 `[OMA PERSISTENT MODE: ...]` 컨텍스트를 재주입합니다.

### /orchestrate

**설명:** 자동화된 CLI 기반 병렬 에이전트 실행. CLI로 서브에이전트를 스폰하고, MCP 메모리로 조율하며, 진행 상황을 모니터링하고, 검증 루프를 실행합니다.

**영구:** 예. 상태 파일: `.agents/state/orchestrate-state.json`.

**트리거 키워드:**
| 언어 | 키워드 |
|----------|----------|
| 공통 | "orchestrate" |
| 영어 | "parallel", "do everything", "run everything" |
| 한국어 | "자동 실행", "병렬 실행", "전부 실행", "전부 해" |
| 일본어 | "オーケストレート", "並列実行", "自動実行" |
| 중국어 | "编排", "并行执行", "自动执行" |
| 스페인어 | "orquestar", "paralelo", "ejecutar todo" |
| 프랑스어 | "orchestrer", "parallèle", "tout exécuter" |
| 독일어 | "orchestrieren", "parallel", "alles ausführen" |
| 포르투갈어 | "orquestrar", "paralelo", "executar tudo" |
| 러시아어 | "оркестровать", "параллельно", "выполнить всё" |
| 네덜란드어 | "orkestreren", "parallel", "alles uitvoeren" |
| 폴란드어 | "orkiestrować", "równolegle", "wykonaj wszystko" |

**트리거 정규식 패턴** (의도 + 명사 화이트리스트, [자동 감지: Pattern 필드](#pattern-field-raw-regex) 참조):
| 섹션 | 패턴 | 트리거 예시 |
|---------|---------|----------------------|
| `*` (공통) | `(build\|create\|make\|develop\|implement\|scaffold) + (a\|an\|the) + [modifier]{0,3} + <noun>` | "Build a TODO app with user authentication", "Create an awesome web service", "Develop a backend with PostgreSQL" |
| `*` (공통) | `i want a/an + <noun>` | "I want a CLI for parsing logs" |
| `ko` | `<noun> + (을\|를\|이\|가)? + (만들어\|구현해\|개발해 + 변형)` | "TODO 앱 만들어줘", "REST API 구현해", "백엔드를 개발해주세요" |

명사 화이트리스트 (15개): app, api, service, server, cli, tool, website, dashboard, system, feature, backend, frontend, prototype, mvp, bot.

**단계:**
1. **Step 0 (준비):** 코디네이션 스킬, 컨텍스트 로딩 가이드, 메모리 프로토콜 읽기. 벤더 감지.
2. **Step 1 (계획 로딩/생성):** `.agents/results/plan-{sessionId}.json` 확인. 없으면 `/plan`을 먼저 실행하도록 안내.
3. **Step 2 (세션 초기화):** `oma-config.yaml` 로딩, CLI 매핑 테이블 표시, 세션 ID(`session-YYYYMMDD-HHMMSS`) 생성, 메모리에 `orchestrator-session.md`와 `task-board.md` 생성.
4. **Step 3 (에이전트 스폰):** 각 우선순위 티어(P0 먼저, 그 다음 P1...)에 대해 벤더에 맞는 방식으로 에이전트 스폰. MAX_PARALLEL을 초과하지 않음.
5. **Step 4 (모니터링):** `progress-{agent}.md` 파일 폴링, `task-board.md` 업데이트. 완료, 실패, 크래시 감시.
6. **Step 5 (검증):** 완료된 에이전트별로 `verify.sh {agent-type} {workspace}` 실행. 실패 시 에러 컨텍스트와 함께 재스폰 (최대 2회 재시도). 2회 재시도 후에도 실패하면 Exploration Loop 활성화: 2-3개 가설 생성, 병렬 실험 스폰, 점수 매기기, 최적 선택.
7. **Step 6 (수집):** 모든 `result-{agent}.md` 파일 읽기, 요약 정리.
8. **Step 7 (최종 보고서):** 세션 요약 제시. Quality Score가 측정된 경우 Experiment Ledger 요약 포함 및 교훈 자동 생성.

**읽는 파일:** `.agents/results/plan-{sessionId}.json`, `.agents/oma-config.yaml`, `progress-{agent}.md`, `result-{agent}.md`.
**쓰는 파일:** `orchestrator-session.md`, `task-board.md` (메모리), 최종 보고서.

**사용 시기:** 자동화된 조율과 최대 병렬성이 필요한 대규모 프로젝트.

---

### /work

**설명:** 단계별 멀티 도메인 조율. PM이 먼저 계획하고, 각 게이트에서 사용자 확인과 함께 에이전트가 실행한 후, QA 리뷰와 이슈 수정이 이어집니다.

**영구:** 예. 상태 파일: `.agents/state/work-state.json`.

**트리거 키워드:**
| 언어 | 키워드 |
|----------|----------|
| 공통 | "work", "step by step" |
| 한국어 | "코디네이트", "단계별" |
| 일본어 | "コーディネート", "ステップバイステップ" |
| 중국어 | "协调", "逐步" |
| 스페인어 | "coordinar", "paso a paso" |
| 프랑스어 | "coordonner", "étape par étape" |
| 독일어 | "koordinieren", "schritt für schritt" |

**단계:**
1. **Step 0 (준비):** 스킬, 컨텍스트 로딩, 메모리 프로토콜 읽기. 세션 시작 기록.
2. **Step 1 (요구사항 분석):** 관련 도메인 식별. 단일 도메인이면 직접 에이전트 사용 제안.
3. **Step 2 (PM 에이전트 기획):** PM이 요구사항 분해, API 컨트랙트 정의, 우선순위 태스크 분해 생성, `.agents/results/plan-{sessionId}.json`에 저장.
4. **Step 3 (계획 리뷰):** 사용자에게 계획 제시. **진행 전 반드시 확인 필요.**
5. **Step 4 (에이전트 스폰):** 우선순위 티어별 스폰, 같은 티어 내 병렬, 별도 워크스페이스.
6. **Step 5 (모니터링):** 진행 파일 폴링, 에이전트 간 API 컨트랙트 정렬 확인.
7. **Step 6 (QA 리뷰):** 보안(OWASP), 성능, 접근성, 코드 품질을 위한 QA 에이전트 스폰.
8. **Step 6.1 (Quality Score)** (조건부): 기준선 측정 및 기록.
9. **Step 7 (반복):** CRITICAL/HIGH 이슈 발견 시 담당 에이전트 재스폰. 2회 시도 후에도 같은 이슈 지속 시 Exploration Loop 활성화.

**사용 시기:** 단계별 제어와 각 게이트에서 사용자 승인이 필요한 멀티 도메인 기능.

---

### /ultrawork

**설명:** 품질에 집착하는 워크플로우. 5단계, 17개 스텝, 그 중 11개가 리뷰 스텝. 모든 단계에는 진행 전 통과해야 하는 게이트가 있습니다.

**영구:** 예. 상태 파일: `.agents/state/ultrawork-state.json`.

**트리거 키워드:**
| 언어 | 키워드 |
|----------|----------|
| 공통 | "ultrawork", "ulw" |

**단계 및 스텝:**

| 단계 | 스텝 | 에이전트 | 리뷰 관점 |
|-------|-------|-------|-------------------|
| **PLAN** | 1-4 | PM 에이전트 (인라인) | 완전성, 메타 리뷰, 과잉 엔지니어링/단순성 |
| **IMPL** | 5 | Dev 에이전트 (스폰) | 구현 |
| **VERIFY** | 6-8 | QA 에이전트 (스폰) | 정렬, 안전성 (OWASP), 회귀 방지 |
| **REFINE** | 9-13 | Debug 에이전트 (스폰) | 파일 분할, 재사용성, 연쇄 영향, 일관성, 데드 코드 |
| **SHIP** | 14-17 | QA 에이전트 (스폰) | 코드 품질 (lint/커버리지), UX 흐름, 관련 이슈, 배포 준비 |

**게이트 정의:**
- **PLAN_GATE:** 계획 문서화, 가정 나열, 대안 검토, 과잉 엔지니어링 리뷰 완료, 사용자 확인.
- **IMPL_GATE:** 빌드 성공, 테스트 통과, 계획된 파일만 수정, 기준선 Quality Score 기록(측정 시).
- **VERIFY_GATE:** 구현이 요구사항과 일치, CRITICAL 0건, HIGH 0건, 회귀 없음, Quality Score >= 75.
- **REFINE_GATE:** 대용량 파일/함수(> 500줄 / > 50줄) 없음, 통합 기회 포착, 부작용 확인, 코드 정리, Quality Score 비회귀.
- **SHIP_GATE:** 품질 검사 통과, UX 확인, 관련 이슈 해결, 배포 체크리스트 완료, 최종 Quality Score >= 75(비음수 델타), 사용자 최종 승인.

**게이트 실패 동작:**
- 첫 번째 실패: 관련 스텝으로 돌아가 수정 후 재시도.
- 같은 이슈에서 두 번째 실패: Exploration Loop 활성화.

**조건부 기능 확장:** Quality Score 측정, Keep/Discard 결정, Experiment Ledger, 가설 탐색, 자동 학습(폐기된 실험에서 얻은 교훈).

**REFINE 건너뛰기 조건:** 50줄 미만의 Simple 태스크.

**사용 시기:** 최대 품질 제공. 포괄적인 리뷰를 거쳐 프로덕션 준비 상태가 필요할 때.

---

### /ralph

**설명:** 지속적 자기 참조 실행 루프. ultrawork를 독립적 검증자로 감싸서 매 반복마다 완료 기준을 확인합니다. 모든 기준이 통과하거나 안전장치가 작동할 때까지 계속 반복합니다.

**영구:** 예. 상태 파일: `.agents/state/ralph-state.json`.

**트리거 키워드:**
| 언어 | 키워드 |
|------|--------|
| 공통 | "ralph" |
| 영어 | "don't stop", "until done", "keep going", "finish everything", "run to completion" |
| 한국어 | "랄프", "멈추지마", "끝까지", "완료될때까지", "끝장내" |
| 일본어 | "止まるな", "完了まで", "最後まで", "全部終わらせて" |
| 중국어 | "不要停", "直到完成", "全部完成", "做完为止" |
| 스페인어 | "no pares", "hasta completar", "termina todo" |
| 프랑스어 | "n'arrête pas", "jusqu'à complétion", "termine tout" |
| 독일어 | "hör nicht auf", "bis zur fertigstellung", "alles fertigstellen" |

**단계:**
1. **Phase 0 (INIT):** 사전 조건 로드(context-loading, 메모리 프로토콜, judge 프로토콜). 검증 가능한 완료 기준 정의(테스트 통과, 빌드 성공, 파일 존재 등 기계적으로 확인 가능해야 함). 사용자 확인. `max_iterations: 5` 초기화.
2. **Phase 1 (WORK):** ultrawork(PLAN → IMPL → VERIFY → REFINE → SHIP) 1회 실행.
3. **Phase 2 (JUDGE):** 독립적 검증자가 각 완료 기준을 실제 프로젝트 상태와 대조 확인(테스트 실행, 빌드 확인, 파일 존재 검증). PASS/FAIL 점수 부여.
4. **Phase 3 (DECIDE):** 모든 기준 PASS → 루프 종료, 최종 보고서 생성. FAIL 존재 → 반복 카운터 증가, 실패 컨텍스트 피드백, Phase 1로 복귀.
5. **안전장치:** `current_iteration >= max_iterations`(기본 5) 도달 시, 또는 같은 기준이 같은 원인으로 3회 연속 실패 시(멈춤 감지) 루프 중단.

**/ultrawork와의 차이:** ultrawork는 단일 패스 5단계 워크플로우입니다. ralph는 ultrawork를 독립적 judge가 객관적으로 완료를 검증하는 재시도 루프로 감쌉니다. "검토 완료"가 아닌 실제로 완료될 때까지 계속 작업합니다.

**사용 시기:** 보장된 완료가 필요할 때입니다. 에이전트가 한 번 패스하고 보고하는 것이 아니라, 검증 가능한 기준이 통과할 때까지 계속 작업해야 할 때 사용합니다.

---

## 비영구 워크플로우

### /plan

**설명:** PM 주도 태스크 분해. 요구사항 분석, 기술 스택 선택, 의존성이 있는 우선순위 태스크 분해, API 컨트랙트 정의.

**트리거 키워드:**
| 언어 | 키워드 |
|----------|----------|
| 공통 | "task breakdown" |
| 영어 | "plan" |
| 한국어 | "계획", "요구사항 분석", "스펙 분석" |
| 일본어 | "計画", "要件分析", "タスク分解" |
| 중국어 | "计划", "需求分析", "任务分解" |

**단계:** 요구사항 수집 -> 기술 실현 가능성 분석 (MCP 코드 분석) -> API 컨트랙트 정의 -> 태스크 분해 -> 사용자 리뷰 -> 계획 저장.

**출력:** `.agents/results/plan-{sessionId}.json`, 메모리 기록, 복잡한 계획은 선택적으로 `docs/exec-plans/active/`.

**실행:** 인라인 (서브에이전트 스폰 없음). `/orchestrate` 또는 `/work`에서 소비.

---

### /brainstorm

**설명:** 디자인 우선 아이디어 탐색. 의도를 탐색하고, 제약을 명확히 하며, 접근 방식을 제안하고, 기획 전에 승인된 설계 문서를 생성합니다.

**트리거 키워드:**
| 언어 | 키워드 |
|----------|----------|
| 공통 | "brainstorm" |
| 영어 | "ideate", "explore design" |
| 한국어 | "브레인스토밍", "아이디어", "설계 탐색" |
| 일본어 | "ブレインストーミング", "アイデア", "設計探索" |
| 중국어 | "头脑风暴", "创意", "设计探索" |

**단계:** 프로젝트 컨텍스트 탐색 -> 명확화 질문(한 번에 하나씩) -> 트레이드오프와 함께 2-3가지 접근 방식 제안 -> 섹션별 설계 제시(각 단계에서 사용자 승인) -> `docs/plans/`에 설계 문서 저장 -> 전환: `/plan` 제안.

**규칙:** 설계 승인 전 구현이나 기획 금지. 코드 출력 없음. YAGNI.

---

### /architecture

**설명:** 소프트웨어 아키텍처 워크플로우입니다. 아키텍처 문제를 진단하고, 올바른 분석 방법(진단 라우팅 / design-twice / ATAM / CBAM / ADR)을 선택하고, 옵션을 비교하고, 이해관계자 입력을 종합하여 권장안, 리뷰 또는 ADR을 생성합니다.

**트리거 키워드:**
| 언어 | 키워드 |
|----------|----------|
| 공통 | "architecture", "ADR", "ATAM", "CBAM" |
| 영어 | "architecture review", "architectural tradeoff" |
| 한국어 | "아키텍처", "설계 검토" |
| 일본어 | "アーキテクチャ" |
| 중국어 | "架构" |

**단계:** 결정 프레이밍(신규 아키텍처 / 리뷰 / 트레이드오프 분석 / 투자 우선순위 / ADR 작성) -> 진단 라우팅으로 방법론 선택 -> MCP 코드 분석(`get_symbols_overview`, `find_symbol`, `find_referencing_symbols`)으로 현재 아키텍처 분석 -> 이해관계자 입력 종합(비용을 정당화할 만큼 교차 관심사일 때만) -> 명시적 가정, 트레이드오프, 리스크, 검증 단계와 함께 권장안 생성 -> 구현이 필요한 경우 `/plan`으로 인계.

**규칙:** 이 워크플로우에서 구현 코드나 태스크 계획을 작성하지 않습니다. 아키텍처 결정 후 `/plan`으로 인계합니다. MCP 도구를 일관되게 사용하며, 원시 파일 읽기나 grep으로 대체하지 않습니다.

**사용 시기:** 시스템 아키텍처 선택, 모듈/서비스/오너십 경계 결정, 리팩터링 우선순위, ADR 작성, 아키텍처 고통 조사(변경 증폭, 숨겨진 의존성, 어색한 API).

---

### /deepinit

**설명:** 전체 프로젝트 초기화. 기존 코드베이스를 분석하고, AGENTS.md, ARCHITECTURE.md, 구조화된 `docs/` 지식 베이스를 생성합니다.

**트리거 키워드:**
| 언어 | 키워드 |
|----------|----------|
| 공통 | "deepinit" |
| 한국어 | "프로젝트 초기화" |
| 일본어 | "プロジェクト初期化" |
| 중국어 | "项目初始化" |

**단계:** 준비 -> 코드베이스 분석 -> ARCHITECTURE.md 생성 -> `docs/` 지식 베이스 생성 -> 루트 AGENTS.md 생성 -> 경계 AGENTS.md 파일 생성 -> 기존 하네스 업데이트 -> 검증.

**출력:** AGENTS.md, ARCHITECTURE.md, docs/ 디렉토리 내 다양한 문서.

---

### /review

**설명:** 전체 QA 리뷰 파이프라인. 보안 감사(OWASP Top 10), 성능 분석, 접근성 검사(WCAG 2.1 AA), 코드 품질 리뷰.

**트리거 키워드:**
| 언어 | 키워드 |
|----------|----------|
| 공통 | "code review", "security audit", "security review" |
| 영어 | "review" |
| 한국어 | "리뷰", "코드 검토", "보안 검토" |
| 일본어 | "レビュー", "コードレビュー", "セキュリティ監査" |
| 중국어 | "审查", "代码审查", "安全审计" |

**단계:** 리뷰 범위 식별 -> 자동화 보안 검사 -> 수동 보안 리뷰(OWASP Top 10) -> 성능 분석 -> 접근성 리뷰 -> 코드 품질 리뷰 -> QA 보고서 생성.

**선택적 수정-검증 루프** (`--fix`): QA 보고서 후 CRITICAL/HIGH 이슈를 수정하기 위해 도메인 에이전트를 스폰, QA 재실행, 최대 3회 반복.

**위임:** 범위가 클 경우 2-7단계를 스폰된 QA 에이전트 서브에이전트에 위임합니다.

---

### /docs

**설명:** `oma-docs`를 통한 문서 드리프트 탐지와 동기화입니다. verify 모드는 저장소의 모든 마크다운(기본 글롭 `**/*.md`)에서 깨진 참조를 찾고, sync 모드는 git diff의 영향을 받는 문서에 문서별 패치를 제안합니다. 인라인으로 실행하며(서브에이전트를 스폰하지 않습니다), 모든 벤더가 `oma docs`를 직접 호출합니다.

**트리거 키워드:** 공통: "oma-docs", "docs verify", "docs sync". 영어: "verify docs", "check docs", "docs drift", "broken doc links", "stale docs", "sync docs", "patch docs". 한국어: "문서 검증", "문서 드리프트", "문서 동기화". 일본어: "ドキュメント検証", "ドキュメント同期". 중국어: "文档校验", "文档同步".

**단계:** 모드 감지(기본은 `verify`이며, 프롬프트에 sync가 언급되거나 git diff 범위가 주어지면 `sync`) -> 사전 점검(`command -v oma`. sync에서는 쓸 만한 diff를 확인하고 없으면 `HEAD~1..HEAD`로 폴백) -> verify는 `oma docs verify --json`(문제가 없으면 종료 코드 `0`, 깨진 참조가 있으면 `1`), sync는 해당 범위에 `oma docs sync --json` -> 호스트 LLM 계약에 따라 발견 사항 종합(verify는 CRITICAL/HIGH/MEDIUM/LOW로 묶어 구체적인 수정안 제시, sync는 최소 unified-diff 패치 작성) -> 각 sync 패치를 대화형으로 제시(`[y] 적용 [n] 건너뛰기 [d] diff 보기 [s] 전체 제안 보기`. 절대 자동 적용하지 않습니다) -> 적용하면 `oma docs verify --json`으로 인덱스 재생성 -> 모드, 종류별 건수, `docs/generated/doc-refs.json`과 `url-drift.json` 위치 보고.

**규칙:** sync 패치를 절대 자동 적용하지 않습니다(문서마다 `[y]` 확인 필요). `.agents/`를 절대 수정하지 않습니다(SSOT). `oma docs`가 없으면 설치 힌트를 출력하고 종료합니다. 수동 grep으로 대체하지 않습니다.

**읽는 파일:** 대상 마크다운(`**/*.md` 또는 요청한 글롭), sync의 `changedFiles`를 위한 `git diff`.
**쓰는 파일:** `docs/generated/doc-refs.json`(verify가 항상 재생성), `docs/generated/url-drift.json`(URL 검사를 돌릴 때), 승인된 문서 패치(sync에서 `[y]`를 누를 때).

**사용 시기:** 문서가 아직 코드베이스와 맞는지 확인할 때(깨진 파일 경로, CLI 명령, 설정 키, 환경 변수), 또는 코드 변경 후 문서 패치를 제안할 때.

---

### /recap

**설명:** `oma-recap`을 통한 일간 또는 기간 작업 회고입니다. 자연어에서 날짜나 구간을 해석하고, 여러 AI 도구 이력(Grok, Claude, Codex, Qwen, Cursor, Antigravity)에 걸쳐 `oma recap --json`을 호출하고, 테마 분석과 Markdown 서식은 스킬에 위임한 뒤, TL;DR과 저장 경로를 보고합니다. 인라인으로 실행하며(서브에이전트를 스폰하지 않습니다), 모든 벤더가 `oma recap`을 직접 호출합니다.

**트리거 키워드:** 공통: "recap". 한국어: "리캡". 일본어: "リキャップ".

**단계:** 모드 감지와 구간 해석(기본은 오늘 기준 `daily`. "이번 주"나 "지난 7일" 같은 표현이 `--window Nd`로 해석되면 `period`) -> 사용자가 도구를 명시적으로 지목할 때만 `--tool` 필터 추출(`grok, claude, codex, qwen, cursor, antigravity`) -> 사전 점검(`command -v oma`) -> `oma recap --json` 실행(daily는 `--date YYYY-MM-DD` 또는 생략, period는 `--window 7d` / `30d`) -> 스킬 계약에 따라 종합하고 저장(15분 테마 임계값, 일간과 다일간 템플릿 구분) -> 3줄 TL;DR과 저장 경로 보고.

**규칙:** `.agents/`를 절대 수정하지 않습니다(SSOT). 저장된 회고에서 기술 용어(프로젝트 이름, 도구 이름, CLI 플래그)를 자동 번역하지 않습니다. 원본이 없을 때 회고를 지어내지 않습니다.

**읽는 파일:** AI 도구 대화 이력(`oma recap`을 통해).
**쓰는 파일:** `.agents/results/recap/{date}.md` 또는 `.agents/results/recap/{start}~{end}.md`.

**사용 시기:** 하루 또는 한 기간(주·월) 동안 여러 AI 도구에서 무엇을 했는지 요약할 때. 필요하면 특정 도구로 좁힐 수 있습니다.

---

### /deepsec

**설명:** `oma-deepsec` 스킬을 엔드 투 엔드로 구동합니다. `.deepsec/` 설치, 비용 보정, scan/process/triage/revalidate/export 패스 실행, `process --diff`를 통한 PR 게이팅, 커스텀 매처 작성, 발견 사항을 전문 에이전트로 라우팅합니다. 인라인 실행(서브에이전트 스폰 없음).

**트리거 키워드:**
| 언어 | 키워드 |
|----------|----------|
| 공통 | "/deepsec", "deepsec workflow" |
| 영어 | "run deepsec", "deepsec scan this repo", "scan repo with deepsec", "deepsec pr review", "deepsec ci gate", "deepsec triage", "deepsec matchers" |
| 한국어 | "딥섹 워크플로우", "딥섹 실행", "딥섹 스캔", "딥섹으로 검사", "딥섹 PR 리뷰", "딥섹 CI 게이트" |
| 일본어 | "ディープセック実行", "deepsecワークフロー", "deepsecでスキャン", "deepsec PRレビュー" |
| 중국어 | "运行 deepsec", "deepsec 工作流", "用 deepsec 扫描", "deepsec PR 审查" |

**단계:**
1. **1단계, 스킬 로드:** `.agents/skills/oma-deepsec/SKILL.md`를 읽은 뒤, 해석된 인텐트에 해당하는 리소스 파일만 로드합니다 (`setup.md`, `scanning.md`, `pr-review.md`, `matchers.md`, `triage.md`, `config.md`). 저장소 루트에 `.deepsec/`이 이미 있으면 증분 실행으로 처리하고 절대 다시 `init`하지 않습니다.
2. **2단계, 인텐트 분류:** `setup`, `scan`, `pr-review`, `matchers`, `triage`, `config`, `troubleshoot` 중 정확히 하나로 해석합니다. 다중 인텐트 프롬프트는 순차 실행합니다. `.deepsec/`이 없으면 AI 호출 인텐트 앞에 `setup`을 삽입합니다.
3. **3단계, 에이전트 선택 확인:** 유료 호출 전에 `claude`(최강 추론, 가장 비쌈)와 `codex` (읽기 전용 샌드박스, 더 저렴) 중 확인합니다. 사용자가 지정했거나, `deepsec.config.ts`에 `defaultAgent`가 고정되었거나, 사용자가 선택을 위임한 경우 생략합니다.
4. **4단계, 해석된 인텐트 실행:**
   - **4A `setup`:** `bunx deepsec init`, `bun install`, `.env.local` 편집, `scan --limit 20` + `process --limit 5`로 검증한 뒤 `data/<id>/INFO.md` 작성(50-100줄, 프로젝트 특화). **`INFO.md`에 대한 사용자 확인 필요.**
   - **4B `scan`:** Scan -> `--limit 50 --concurrency 5`로 보정 -> 비용 외삽 보고(명시적 사용자 승인 필요) -> 전체 `process` -> `triage --severity HIGH` + `revalidate --min-severity HIGH` -> `export --format md-dir` + `metrics`.
   - **4C `pr-review`:** 다이렉트 모드 `process --diff origin/${BASE_REF} --comment-out comment.md`. 2-잡 CI 패턴 제시(`analyze`는 `pull-requests: write` 없이, `comment`는 정제된 아티팩트만 소비). 종료 코드 `1` = 신규 발견 1건 이상.
   - **4D `matchers`:** `data/<id>/files/`를 순회하며 엔트리 포인트 누락을 찾아 슬러그별 매처를 `.deepsec/matchers/<slug>.ts`에 적절한 노이즈 등급(`precise` / `normal` / `noisy`)으로 작성하고, `.deepsec/deepsec.config.ts`로 연결한 뒤 `scan --matchers`로 검증합니다.
   - **4E `triage`:** `triage --severity HIGH` -> `revalidate --min-severity HIGH` -> export를 `true-positive` / `uncertain`만으로 필터링합니다. 반복되는 FP 형태는 다음 `INFO.md` 개정에 메모합니다.
   - **4F `config` / `troubleshoot`:** `resources/config.md`의 증상 테이블을 적용합니다.
5. **5단계, 요약 및 라우팅:** 실행 요약을 생성합니다(프로젝트 id, 패스 유형, agent/model, 스캔 파일 수, 발견 건수, revalidate 후 TP, 비용, 경과 시간, 정지 조건). 후속 작업은 **취약 파일의 레이어**에 따라 라우팅합니다 (backend -> `oma-backend`, frontend -> `oma-frontend`, mobile -> `oma-mobile`, IaC -> `oma-tf-infra`, DB -> `oma-db`, CI -> `oma-dev-workflow`, 문서 드리프트 -> `oma-docs`, 엔트리 포인트 누락 -> 4D 재진입). 레이어가 모호하거나 `revalidation.verdict === "uncertain"`인 경우 트리아지 단계로 `oma-debug`를 먼저 실행합니다.
6. **6단계, 정지 조건:** 완료된 인텐트 + 5단계 요약, 차단 사전 조건(자격 증명 누락, `INFO.md` 거부), 또는 안전 재개 명령과 함께 표면화된 쿼터 정지에서 종료합니다.

**읽는 파일:** `.agents/skills/oma-deepsec/SKILL.md`, `.agents/skills/oma-deepsec/resources/*.md` (인텐트 스코프), `data/<id>/INFO.md`, `data/<id>/files/`, `deepsec.config.ts`.
**쓰는 파일:** `.deepsec/` (`setup` 시), `.env.local` (gitignore 처리), `data/<id>/INFO.md`, `.deepsec/matchers/<slug>.ts`, `findings/` (`export` 시), `comment.md` (`pr-review` 시).

**규칙:** 이 워크플로우에서는 제품 소스 코드를 수정하지 않습니다(전문가에게 위임). 자격 증명(`vck_…`, `sk-ant-…`, OIDC 토큰)을 출력하거나 커밋하지 않습니다. PR 제어 코드를 실행하는 CI 잡에 `pull-requests: write`를 부여하지 않습니다. 재개하되 초기화하지 않습니다: 중단 시 동일 명령을 재실행하며, 사용자의 명시적 지시 없이 `rm -rf data/<id>/`를 실행하지 않습니다.

**언제 사용:** 저장소의 에이전트 기반 취약점 스캔, `process --diff`를 통한 CI/PR 보안 게이팅, 엔트리 포인트 커버리지를 위한 프로젝트 특화 매처 작성, 기존 발견의 트리아지 및 FP 제거.

---

### /debug

**설명:** 회귀 테스트 작성과 유사 패턴 스캔이 포함된 구조화된 버그 진단 및 수정.

**트리거 키워드:**
| 언어 | 키워드 |
|----------|----------|
| 공통 | "debug" |
| 영어 | "fix bug", "fix error", "fix crash" |
| 한국어 | "디버그", "버그 수정", "에러 수정", "버그 찾아", "버그 고쳐" |
| 일본어 | "デバッグ", "バグ修正", "エラー修正" |
| 중국어 | "调试", "修复 bug", "修复错误" |

**단계:** 에러 정보 수집 -> 재현 -> 근본 원인 진단 -> 최소 수정 제안(사용자 확인 필수) -> 수정 적용 + 회귀 테스트 작성 -> 유사 패턴 스캔 -> 메모리에 버그 문서화.

**서브에이전트 스폰 기준:** 에러가 여러 도메인에 걸치거나, 스캔 범위 > 10파일이거나, 깊은 의존성 추적이 필요한 경우.

---

### /design

**설명:** 토큰, 컴포넌트 패턴, 접근성 규칙이 포함된 DESIGN.md를 생성하는 7단계 디자인 워크플로우.

**트리거 키워드:**
| 언어 | 키워드 |
|----------|----------|
| 공통 | "design system", "DESIGN.md", "design token" |
| 영어 | "design", "landing page", "ui design", "color palette", "typography", "dark theme", "responsive design", "glassmorphism" |
| 한국어 | "디자인", "랜딩페이지", "디자인 시스템", "UI 디자인" |
| 일본어 | "デザイン", "ランディングページ", "デザインシステム" |
| 중국어 | "设计", "着陆页", "设计系统" |

**단계:** SETUP -> EXTRACT (선택적) -> ENHANCE -> PROPOSE (2-3가지 방향) -> GENERATE (DESIGN.md + 토큰) -> AUDIT -> HANDOFF.

**필수:** 모든 출력은 반응형 우선 (모바일 320-639px, 태블릿 768px+, 데스크탑 1024px+).

---

### /scm

**설명:** 자동 기능별 분할이 포함된 Conventional Commits 생성.

**트리거 키워드:** 없음 (자동 감지에서 제외).

**단계:** 변경사항 분석 -> 기능 분리 -> 유형 결정 -> 범위 결정 -> 설명 작성 -> 즉시 커밋 실행.

**규칙:** `git add -A` 금지. 시크릿 커밋 금지. HEREDOC 사용. Co-Author: `First Fluke <our.first.fluke@gmail.com>`.

---

### /tools

**설명:** MCP 도구 가시성 및 제한 관리.

**트리거 키워드:** 없음 (자동 감지에서 제외).

**기능:** 현재 MCP 도구 상태 표시, 도구 그룹 활성화/비활성화, 영구 또는 임시 변경, 자연어 파싱.

**도구 그룹:**
- memory: read_memory, write_memory, edit_memory, list_memories, delete_memory
- code-analysis: get_symbols_overview, find_symbol, find_referencing_symbols, search_for_pattern
- code-edit: replace_symbol_body, insert_after_symbol, insert_before_symbol, rename_symbol
- file-ops: list_dir, find_file

---

### /convert

**설명:** 미디어 범주에 따라 라우팅하여 파일을 다른 형식으로 변환합니다. **문서**(`opendataloader-pdf`/`oma-pdf` 기반 PDF, `kordoc`/`oma-hwp` 기반 HWP/HWPX/HWPML)는 Markdown으로 추출됩니다. **이미지**, **비디오**, **오디오** 파일은 `ffmpeg`(이미 `oma-video`용으로 준비됨)로 대상 형식으로 트랜스코딩됩니다.

**트리거 키워드:** 없음 (입력 파일 경로와 함께 명시적으로 호출).

**단계:** 입력 검증 및 범주별 라우팅(문서 `.pdf`/`.hwp*`; 이미지 `.jpg`/`.png`/`.webp`/…; 비디오 `.mp4`/`.mov`/…; 오디오 `.mp3`/`.wav`/…) -> 대상 형식 결정(문서 기본값 = Markdown; 미디어 = 명시적 `--to`) -> 변환(PDF: `uvx opendataloader-pdf`, 스캔된 PDF는 하이브리드 OCR 사용; HWP: `bunx kordoc@latest`; 미디어: `ffmpeg`) -> 문서 정규화(PDF: `uvx mdformat`; HWP: `flatten-tables.ts`) -> 검증(Markdown 읽기 / `ffprobe`로 미디어 확인) -> 원본→대상 형식 및 품질/코덱 선택 사항 보고.

**규칙:** 범주별로 라우팅하며, 미디어 파일에 문서 변환기를 돌리거나 그 반대로 하지 않습니다. 기본 출력 위치는 입력 파일과 같은 디렉토리입니다. 미디어의 품질/코덱 선택 사항을 보고합니다(트랜스코딩은 무손실이 아닙니다). 단계를 건너뛰지 않습니다. 응답 언어는 `.agents/oma-config.yaml`을 따릅니다.

**사용 시기:** LLM/RAG 수집을 위해 PDF나 한국어 HWP 계열 문서를 Markdown으로 변환, 또는 이미지(jpg→webp/png), 비디오(mov→mp4, mp4→gif), 오디오(wav→mp3)를 형식 간 트랜스코딩.

---

### /video

**설명:** `oma-video` 스킬을 엔드 투 엔드로 구동합니다. 브리프 → 스크립트 → 내레이션 → 비주얼 → 자막 → render-spec → 벤더링된 Remotion(또는 MoneyPrinterTurbo) 컴포지터 순으로 진행해, 실제 `.mp4`가 담긴 재현 가능한 실행 디렉토리를 만듭니다. 키는 선택 사항입니다. 모든 단계에 결정론적 분기가 있어서 API 키가 없어도 실행이 완료됩니다. 인라인으로 실행합니다(서브에이전트를 스폰하지 않습니다).

**트리거 키워드:**
| 언어 | 키워드 |
|----------|----------|
| 공통 | "/video", "oma-video", "remotion", "shorts", "reels", "screencast" |
| 영어 | "generate video", "create a video", "make a video", "short-form video", "explainer video", "demo video", "walkthrough video", "video from readme", "video from code" |
| 한국어 | "영상 만들어", "영상 생성", "비디오 만들어", "숏폼 만들어", "쇼츠 영상", "릴스 영상", "데모 영상", "설명 영상" |
| 일본어 | "動画を生成", "動画を作成", "ショート動画", "解説動画", "デモ動画" |
| 중국어 | "生成视频", "制作视频", "短视频", "讲解视频", "演示视频" |

**단계:**
1. **브리프와 모드 결정:** `shorts`(9:16), `explainer`(16:9), `demo`(화면·웹 캡처) 중 하나를 고르고 모드 기본값을 적용합니다. 플래그로 덮어쓸 수 있습니다.
2. **스크립트 작성:** 장면과 내레이션을 생성합니다(키가 있으면 LLM으로, 없으면 브리프에서 결정론적 개요로).
3. **에셋 합성:** 내레이션은 `oma-voice`, 비주얼은 `oma-image` / `oma-slide` / 스톡, 자막은 키가 필요 없는 정렬로 만들며, `demo --source web`에서는 감독하의 Playwright 웹 캡처를 씁니다. 각 프로바이더는 결정론적 폴백으로 저하됩니다.
4. **render-spec 구성:** 실행 디렉토리에 `render-spec.json`(결정성의 경계)과 에셋을 씁니다.
5. **렌더:** 벤더링된 Remotion 프로젝트(또는 MoneyPrinterTurbo)를 서브프로세스로 스폰합니다. 실패하면 결정론적 플레이스홀더를 내보내 실행이 어쨌든 완료되게 합니다. 라이브 캡처는 매니페스트에 `nondeterministic`으로 기록됩니다.

**출력:** `.agents/results/videos/{timestamp}-{shortid}-{mode}/`에 실행 디렉토리가 생기며, `script.json`, `render-spec.json`, `timing.json`, `captions.{srt,vtt}`, `audio/`, `visuals/`, `{composition}.mp4`, `manifest.json`이 들어갑니다. [영상 생성 가이드](../guide/video-generation.md)를 참고하세요.

---

### /schedule

**설명:** `oma schedule:*` 명령으로 시간 기반 에이전트 작업을 등록하고 관리합니다. 작업은 글로벌 레지스트리(`~/.agents/schedule/`)에 저장되고 OS 네이티브 스케줄러(macOS는 launchd, Linux는 systemd 사용자 타이머, Windows는 schtasks, POSIX 폴백은 crontab)로 발동하며, 실행할 때마다 `oma agent:spawn`으로 하네스에 다시 진입합니다.

**트리거 키워드:** 없음 (`oma schedule:*` 시간 기반 작업을 다루는 슬래시 호출 전용 워크플로우).

**단계:** 의도 해석(add / list / remove / sync) -> 일정 파싱(명시적 `--cron` 또는 `--every`로 받는 자연어) -> `oma schedule:add`로 등록(이름을 지정한 환경 변수만 캡처, 파일 권한 0600) -> `oma schedule:list`로 검증(매니페스트와 OS 사이의 드리프트를 프로젝트별로 묶어 확인) -> 작업 id와 다음 발동 시각 보고.

**사용 시기:** 반복되는 에이전트 작업, 예를 들어 야간 회고, 예약 스캔, 주기적 정리처럼 대화형 세션이 열려 있지 않아도 발동해야 하는 작업.

---

### /explain

**설명:** `oma-explanation` 스킬을 엔드 투 엔드로 구동합니다. diff, PR, 브랜치, 커밋 범위를 자체 완결형 인터랙티브 HTML 설명서(Background / Intuition / Code / Quiz)로 바꿉니다. 인라인으로 실행합니다(서브에이전트를 스폰하지 않습니다).

**트리거 키워드:** 없음. "explain"은 일상 어휘라서 키워드 감지를 걸면 "이 함수 설명해줘" 같은 평범한 질문에 오탐이 나므로, 슬래시로만 호출합니다.

**단계:** 인자 해석(대상 ref는 명시적 PR 번호 / 브랜치 / SHA 범위 → 스테이징된 변경 → 더티 트리 → `HEAD~1..HEAD` 순, 독자 수준은 `onboarding` 또는 `reviewer`, 출력 언어, 퀴즈 개수) -> 계약 로드(`oma-explanation` SKILL.md와 리소스) -> 수집과 게이팅(diff와 주변 코드, 생성 전 시크릿 스캔, diff와 PR 텍스트는 철저히 데이터로만 취급) -> 문서 계약과 HTML 계약에 따라 HTML 생성 -> 검증(최종 HTML 시크릿 스캔을 포함한 grep 체크리스트, 수정 루프 최대 3회) -> 전달(`open`은 경고만, TL;DR과 경로 제시).

**출력:** `.agents/results/explain/{YYYY-MM-DD}-{slug}.html`(Asia/Seoul 날짜 기준이며, 같은 날짜와 슬러그로 다시 실행하면 덮어씁니다). [코드 설명서 가이드](../guide/code-explainer.md)를 참고하세요.

---

### /stack-set

**설명:** 프로젝트 기술 스택을 자동 감지하고 백엔드 스킬을 위한 언어별 레퍼런스를 생성합니다.

**트리거 키워드:** 없음 (자동 감지에서 제외).

**단계:** 감지(매니페스트 스캔) -> 확인 -> 생성(`stack/`) -> 검증.

**출력:** `.agents/skills/oma-backend/stack/`에 파일 생성.

---

## 스킬 vs. 워크플로우

| 측면 | 스킬 | 워크플로우 |
|--------|--------|-----------|
| **정의** | 에이전트 전문성 (에이전트가 아는 것) | 오케스트레이션 프로세스 (에이전트가 협업하는 방법) |
| **위치** | `.agents/skills/oma-{name}/` | `.agents/workflows/{name}.md` |
| **활성화** | 스킬 라우팅 키워드를 통한 자동 활성화 | 슬래시 명령 또는 트리거 키워드 |
| **범위** | 단일 도메인 실행 | 다단계, 종종 멀티 에이전트 |
| **예시** | "React 컴포넌트 만들어줘" | "기능 계획 -> 구현 -> 리뷰 -> 커밋" |

---

## 자동 감지: 동작 원리

### 훅 시스템

oh-my-agent은 각 사용자 메시지가 처리되기 전에 실행되는 `UserPromptSubmit` 훅을 사용합니다:

1. **`triggers.json`** (`.claude/hooks/triggers.json`): 11개 언어에 대한 키워드-워크플로우 매핑을 정의합니다.
2. **`keyword-detector.ts`** (`.claude/hooks/keyword-detector.ts`): 사용자 입력을 트리거 키워드와 대조하고, 언어별 매칭을 존중하며, 워크플로우 활성화 컨텍스트를 주입하는 TypeScript 로직.
3. **`persistent-mode.ts`** (`.claude/hooks/persistent-mode.ts`): 활성 상태 파일을 확인하고 영구 워크플로우 실행을 강제합니다.

### 감지 흐름

1. 사용자가 자연어 입력을 타이핑합니다.
2. 훅이 명시적 `/command`가 있는지 확인합니다. 있으면 중복 방지를 위해 감지를 건너뜁니다.
3. 훅이 입력을 정제(코드 블록, 인용 문자열, 붙여넣은 시스템 에코 블록 제거)한 뒤 `.agents/hooks/core/triggers.json`의 키워드 목록(리터럴 문구)과 `patterns`(원시 정규식) 양쪽에 대조하여 스캔합니다. 강화 가드는 동일 워크플로우가 최근 60초 내에 2회 이상 발동된 경우 재트리거를 억제합니다.
4. 매칭이 발견되면, 입력이 정보성 패턴에 해당하는지 확인합니다.
5. 정보성이면 필터링되며(예: "what is orchestrate?"), 워크플로우는 트리거되지 않습니다.
6. 행동 가능하면, 컨텍스트에 `[OMA WORKFLOW: {workflow-name}]`를 주입합니다.
7. 에이전트가 주입된 태그를 읽고 `.agents/workflows/`에서 해당 워크플로우 파일을 로드합니다.

### 언어 섹션 컨벤션

`.agents/hooks/core/triggers.json`은 `keywords`, `patterns`, `informationalPatterns`에 대해 언어별 섹션 구조를 사용합니다.

| 섹션 | 동작 |
|---------|----------|
| `*` | 공통. `.agents/oma-config.yaml`의 `language` 설정과 무관하게 항상 로드됩니다. 영어 콘텐츠(공용어)와 진정한 언어 무관 토큰(예: 워크플로우 이름 `"orchestrate"`)에 사용합니다. |
| `en` | 영어. 하위 호환성을 위해 로드되며, 기능적으로 `*`와 동일합니다. 새로운 영어 콘텐츠는 `*`에 추가해야 합니다. |
| `ko`, `ja`, `zh`, `es`, `fr`, `de`, `pt`, `ru`, `nl`, `pl` | 언어별. `.agents/oma-config.yaml`에 `language: <lang>`이 설정된 경우에만 로드됩니다. |

**의미**: `.agents/oma-config.yaml`에 `language: en`을 설정하면 `*`와 `en` 패턴만 로드됩니다. 사용자가 한국어나 일본어 등으로 입력하더라도 해당 언어의 자연어 트리거는 발동되지 않습니다. 비영어권 언어를 활성화하려면 `language: <code>`를 알맞게 설정해야 합니다. `*`의 영어 폴백은 항상 활성 상태로 유지됩니다.

### Pattern 필드 (원시 정규식) {#pattern-field-raw-regex}

리터럴 `keywords` 외에도 각 워크플로우는 `patterns`를 선언할 수 있습니다. `patterns`는 `iu` 플래그로 컴파일되는 원시 정규식 문자열입니다. 패턴을 사용하면 키워드 목록을 조합해 나열해야 했을 멀티 토큰 의도 매칭을 간결하게 표현할 수 있습니다.

```jsonc
{
  "workflows": {
    "orchestrate": {
      "persistent": true,
      "keywords": { "*": ["orchestrate"], "en": ["parallel", ...] },
      "patterns": {
        "*": ["\\b(build|create|make)\\s+(?:an?|the)\\s+...\\b"],
        "ko": ["(앱|API|...)\\s*(?:을|를)?\\s*(?:만들어\\s*(?:주세요|줘)?|...)"]
      }
    }
  }
}
```

작성 규칙:
- 문자열은 그대로 컴파일됩니다. JSON용으로 한 번, 정규식용으로 한 번씩 백슬래시를 이스케이프해야 합니다 (`\\b`, `\\s+`).
- 자동 단어 경계 래핑이 없습니다. 패턴 작성자가 직접 `\b`를 처리해야 합니다.
- 잘못된 정규식은 런타임에 조용히 무시됩니다 (설정 편집 시점에 테스트 실패로 확인 가능).

### 정보성 패턴 필터링

`.agents/hooks/core/triggers.json`의 `informationalPatterns` 섹션은 명령이 아닌 질문을 나타내는 구문을 정의합니다. 잠재적 워크플로우 매치 주변 60자 윈도우에서 확인됩니다.

| 섹션 | 패턴 예시 |
|---------|----------------------|
| `*` (공통 영어) | "what is", "what are", "how to", "how does", "how do", "should we", "should i", "could we", "would you", "what if", "what about", "why build", "false positive", "trigger when", "auto-trigger" |
| `ko` | "뭐야", "무엇", "어떻게", "설명해", "알려줘", "트리거", "발동", "메타", "왜 만들", "어떻게 만들", "어떨까", "한다면", "할까요" |
| `ja` | "とは", "って何", "どうやって", "説明して" |
| `zh` | "是什么", "什么是", "怎么", "解释" |

입력이 워크플로우 트리거와 정보성 패턴 모두에 매칭되면, 정보성 패턴이 우선하고 워크플로우는 트리거되지 않습니다. 다음과 같은 프롬프트가 차단되는 이유입니다.
- `"How do you build a TODO app?"`: `*`의 `how do`가 orchestrate 의도 정규식을 차단
- `"orchestrate 트리거 해주면 되나요?"` (`language: ko` 환경): `ko`의 `트리거`가 orchestrate 키워드를 차단

### 제외된 워크플로우

다음 워크플로우는 키워드로 트리거되지 않으며 명시적 `/command`로 호출해야 합니다. `/tools`와 `/stack-set`은 `excludedWorkflows`에 들어 있고(키워드 감지에서 의도적으로 뺐습니다), `/convert`는 트리거 키워드를 아예 배포하지 않으며(`oma-pdf`와 `oma-hwp` 스킬이 각자 키워드 감지를 갖고 있습니다), `/schedule`은 `oma schedule:*` 시간 기반 작업을 다루는 슬래시 호출 워크플로우이고, `/explain`은 "explain"이 일상 어휘라서 키워드 감지를 걸면 오탐이 끊이지 않기 때문에 트리거 키워드를 배포하지 않습니다.
- `/tools`
- `/stack-set`
- `/convert`
- `/schedule`
- `/explain`

---

## 영구 모드 메커니즘

### 상태 파일

영구 워크플로우(orchestrate, ultrawork, work, ralph)는 `.agents/state/`에 상태 파일을 생성합니다:

```
.agents/state/
├── orchestrate-state.json
├── ultrawork-state.json
├── work-state.json
└── ralph-state.json
```

이 파일에는 워크플로우 이름, 현재 단계/스텝, 세션 ID, 타임스탬프, 대기 중인 상태가 포함됩니다.

### 강화

영구 워크플로우가 활성인 동안 `persistent-mode.ts` 훅이 모든 사용자 메시지에 `[OMA PERSISTENT MODE: {workflow-name}]`를 주입합니다.

### 목표 계약 (선택적 정지 게이트와 예산)

`oma goal:set`은 활성 영구 워크플로우에 기계적으로 확인 가능한 완료 계약을 붙입니다.

- `--gate typecheck|test|lint`: Stop 훅은 **해당 package.json 스크립트가 통과할 때만** 세션 종료를 허용합니다(셸 없이 argv 배열로 실행하며, 자유 형식 명령은 설계상 거부합니다). 실패하면 출력 끝부분과 함께 차단하고, 실패와 타임아웃은 강화 한도에 반영되므로 빨간 게이트가 영원히 막을 수는 없습니다.
- `--budget-minutes <n>`: 활성화 시점부터의 wall-clock 예산입니다. 이를 넘기면 워크플로우를 비활성화하고 솔직하게 부분 완료로 멈추도록 허용하며, 세션 이벤트 기록에 남깁니다.

계약이 없으면 영구 모드는 위에서 설명한 대로 동작합니다. 계약은 선택 사항입니다. [CLI 명령 레퍼런스](../cli-interfaces/commands.md#goalset)의 `goal:set`을 참고하세요.

### 비활성화

"workflow done"(또는 설정 언어의 동등 표현)이라고 말하면:
1. `.agents/state/`에서 상태 파일 삭제
2. 영구 모드 컨텍스트 주입 중지
3. 정상 동작으로 복귀

모든 스텝이 완료되고 마지막 게이트를 통과하면 자연스럽게 종료될 수도 있습니다.

---

## 일반적인 워크플로우 시퀀스

### 빠른 기능
```
/plan → 출력 리뷰 → /work
```

### 복잡한 멀티 도메인 프로젝트
```
/work → PM 기획 → 사용자 확인 → 에이전트 스폰 → QA 리뷰 → 이슈 수정 → 배포
```

### 최대 품질 제공
```
/ultrawork → PLAN (4개 리뷰 스텝) → IMPL → VERIFY (3개 리뷰 스텝) → REFINE (5개 리뷰 스텝) → SHIP (4개 리뷰 스텝)
```

### 버그 조사
```
/debug → 재현 → 근본 원인 → 최소 수정 → 회귀 테스트 → 유사 패턴 스캔
```

### 디자인에서 구현까지
```
/brainstorm → 설계 문서 → /plan → 태스크 분해 → /orchestrate → 병렬 구현 → /review → /scm
```

### 새 코드베이스 설정
```
/deepinit → AGENTS.md + ARCHITECTURE.md + docs/
```

### 보장된 완료
```
/ralph → 기준 정의 → ultrawork 루프 → judge 검증 → 필요시 재반복 → 모든 기준 통과 → 완료
```
