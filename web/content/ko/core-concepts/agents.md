---
title: Agents
description: 에이전트 타입, 워크스페이스 전략, 오케스트레이션 흐름.
---

# Agents

## 에이전트 분류

- 아이디에이션: Brainstorm
- 기획: PM agent
- 구현: Frontend, Backend, Mobile, DB
- 인프라: TF-infra agent
- DevOps: Dev-workflow
- 검증: QA, Debug
- 로컬라이제이션: Translator
- 조율: oma-coordination, oma-orchestrator

## 워크스페이스 전략

워크스페이스 분리로 머지 충돌을 줄입니다.

```text
./apps/api      -> backend
./apps/web      -> frontend
./apps/mobile   -> mobile
```

## Agent Manager 흐름

1. PM이 태스크 분해 계획 수립
2. 도메인별 에이전트 병렬 실행
3. Serena 메모리에 진행 상태 기록
4. QA가 시스템 일관성 검증

## Serena 런타임 파일

- `orchestrator-session.md`
- `task-board.md`
- `progress-{agent}.md`
- `result-{agent}.md`
