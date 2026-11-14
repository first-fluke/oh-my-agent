---
title: 산출물 레이아웃
sidebar_label: 산출물 레이아웃
description: OMA가 유지 문서, 실행 보고서, 런타임 상태를 두는 위치와, 레거시 위치를 옮기는 방법을 설명합니다.
---

# 산출물 레이아웃 {#artifact-layout}

OMA는 세 위치를 사용합니다. 유지하는 프로젝트 문서는 `docs/`, 사람이 읽는 실행 보고서는 `.agents/results/`, 조율과 실행 증거는 `.agents/state/`입니다. 아래 경로는 프로젝트 루트 기준입니다.

## 유지 문서 {#maintained-documents}

| 위치 | 내용 |
|----------|---------|
| `docs/decisions/` | 접근안, 트레이드오프, 아키텍처 의사결정 기록(ADR) |
| `docs/plans/work/` | 작업 계획, 진행 상황, 의사결정 로그, 기술 부채 추적 |
| `docs/plans/contracts/` | 채택된 API 계약 |
| `DESIGN.md` | UI 디자인 시스템. 타이포그래피, 색, 간격, 모션, 컴포넌트 |

의사결정 문서에는 `Status` 필드를 두어 `draft`, `accepted`, `superseded`를 기록하세요. 대체된 결정은 그대로 두고 대체 문서에 링크를 걸어, 그 근거를 계속 볼 수 있게 합니다. OMA에서 `design`은 UI 디자인을 가리키며, 기술 제안과 ADR은 `docs/decisions/`를 함께 씁니다.

`docs/README.md` 같은 프로젝트 문서 색인으로 유지 문서에 링크하세요. 산출물 마이그레이션은 기존 파일을 옮길 뿐, 색인을 만들거나 문서 상태를 바꾸지 않습니다.

## 실행 보고서와 런타임 상태 {#execution-reports-and-runtime-state}

| 위치 | 내용 |
|----------|---------|
| `.agents/results/result-*.md` | 사람이 읽는 에이전트·워크플로우 결과 보고서 |
| `.agents/results/architecture/` | 아키텍처 분석과 권장 사항 |
| `.agents/results/bugs/` | 버그 보고서 |
| `.agents/results/refactor/` | 리팩터링 계획과 보고서 |
| `.agents/results/security/` | 보안 스캔 보고서 |
| `.agents/results/market/` | 시장 조사 브리프 |
| `.agents/results/recap/` | 작업 리캡 |
| `.agents/results/explain/` | HTML 설명 |
| `.agents/results/api-contracts/` | API 계약 초안 |
| `.agents/results/plan-{sessionId}.json` | 현재 태스크 계획 |
| `.agents/state/memories/` | 세션 요약, 태스크 보드, 진행 상황, 교훈, 실험 기록 |
| 런타임 `agent-runs/` | 구조화된 실행 기록, 클레임, 검증 증거 |
| 런타임 `agent-plans/` | 고정된 실행 계획 |

보고서 하위 디렉토리는 도메인별로 나뉩니다. 사람이 읽는 보고서는 구조화된 증거를 보완하며, 그 자체로 검증된 완료를 성립시키지 않습니다. [에이전트 결과 및 재개](../agent-results-and-resume/)를 참고하세요.

현재 실행 기록과 고정된 계획은 활성 프로필의 프로젝트 상태 디렉토리에 있습니다. 이전 프로젝트는 `.agents/state/` 아래에 남겨 둘 수 있습니다. 이 마이그레이션은 저장 위치와 검증 연결을 바꾸지 않습니다.

## 유지 문서 승격 {#promote-a-maintained-document}

실행 산출물이 프로젝트 참조가 되면 대응하는 유지 위치로 옮기세요. 예를 들어 채택된 계약은 `.agents/results/api-contracts/`에서 `docs/plans/contracts/`로 옮기고, 아키텍처 권장 사항은 `docs/decisions/`의 의사결정 기록으로 바꿉니다. 이전 위치에는 링크를 남기고 문서 색인을 갱신하세요.

구조화된 실행 증거가 원본 파일이나 그 해시를 기록하고 있으면 그 파일은 그대로 두고 유지 버전을 따로 만드세요. 프로젝트 색인에서 유지 문서로 링크하세요.

`install`, `update`, `link`는 기본적으로 Git에서 `.agents/results/`, `.agents/state/`, `docs/plans/`를 무시합니다. `docs/decisions/`는 그 기본 무시 범위 밖에 있습니다. 팀이 버전 관리해야 하는 계약이나 작업 계획을 채택할 때는 프로젝트의 `.gitignore`를 확인하세요.

## 기존 프로젝트 마이그레이션 {#migrate-an-existing-project}

먼저 마이그레이션을 미리 보세요.

```bash
oma docs migrate --dry-run
```

구조화된 출력이 필요하면 `--json`을 추가하세요. 준비가 되면 같은 마이그레이션을 명시적으로 적용하세요.

```bash
oma docs migrate --dry-run --json
oma docs migrate
```

`oma install`과 `oma update`도 이 마이그레이션을 실행합니다. 다음 레거시 위치를 한곳으로 모읍니다.

<!-- oma-docs:ignore-start -->
| 레거시 위치 | 이동 위치 |
|-----------------|-------------|
| `docs/design-docs/` | `docs/decisions/` |
| `docs/plans/designs/` | `docs/decisions/` |
| `.agents/results/architecture/adr-*.md`와 함께 작성된 다이어그램 사이드카 | `docs/decisions/` |
| `.agents/state/memories/result-*.md` | `.agents/results/` |
| `.serena/memories/result-*.md` | `.agents/results/` |
<!-- oma-docs:ignore-end -->

의사결정 문서는 하위 디렉토리 구조를 유지합니다. 레거시 아키텍처 ADR은 함께 작성된 `.archify.json`과 `.archify.html` 사이드카와 같이 이동합니다. 실행별 검토, 권장 사항, 검증 로그는 결과 디렉토리에 남습니다. 결과 마이그레이션은 두 메모리 디렉토리의 최상위 `result-*.md` 파일만 다루며, 다른 메모리 파일은 그 자리에 둡니다.

마이그레이션은 이미 있는 대상 파일을 보존합니다. 다른 파일이 같은 이름을 쓰면 `001-cache--from-plan-designs.md`처럼 출처 접미사를 붙이고 선택한 경로를 보고합니다. 그 이름도 쓰이고 있으면 안정적인 콘텐츠 해시를 붙입니다. 마이그레이션을 다시 실행해도 이미 옮긴 파일을 복제하거나 이름을 바꾸지 않습니다.

옮긴 문서, Markdown 조율 노트, `docs/**/*.md`, 루트의 `README*.md`와 `AGENTS.md`에서 지원하는 Markdown 링크와 경로 참조를 갱신합니다. 마이그레이션 보고서와 Git diff로 그 변경을 확인하세요. 구조화된 런타임 증거와 UI `DESIGN.md` 파일은 참조 재작성에서 제외됩니다. 이미 있는 `oma-docs:ignore-start` / `oma-docs:ignore-end` 블록은 레거시 경로 예시를 그대로 둡니다.

보고서에서 보류된 파일을 확인하세요. 구조화된 실행 증거가 참조하는 결과 보고서는 기록된 실행 기록과 해시가 유효하도록 원래 경로에 남습니다. 실행 기록, 클레임, 고정된 실행 계획, 그 밖의 런타임 증거는 그 자리에 둡니다. 마이그레이션은 계약 초안을 승격하지 않고, 결정을 수락 상태로 바꾸지 않으며, UI 디자인 시스템을 바꾸지 않습니다.
