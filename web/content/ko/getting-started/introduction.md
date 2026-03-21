---
title: 소개
description: oh-my-agent와 멀티 에이전트 협업 동작 방식을 설명합니다.
---

# 소개

oh-my-agent는 AI IDE용 멀티 에이전트 오케스트레이터입니다. 요청을 스킬에 라우팅하고 Serena 메모리로 조율 상태를 관리합니다.

## 핵심 기능

- 요청 기반 자동 스킬 라우팅
- 기획/리뷰/디버깅 워크플로우 실행
- CLI 기반 병렬 에이전트 오케스트레이션
- 실시간 대시보드 모니터링

## 에이전트 역할

| 에이전트 | 역할 |
|---|---|
| oma-coordination | 복잡한 멀티 도메인 프로젝트 조율 |
| oma-pm | 기획, 태스크 분해, 아키텍처 |
| oma-frontend | React/Next.js 구현 |
| oma-backend | API/DB/인증 구현 |
| oma-mobile | Flutter/모바일 구현 |
| oma-qa | 보안/성능/접근성 리뷰 |
| oma-debug | 원인 분석 및 회귀 방지 수정 |
| oma-brainstorm | 설계 우선 아이디어 발굴 및 컨셉 탐색 |
| oma-db | 데이터베이스 모델링, 스키마 설계, 쿼리 튜닝 |
| oma-dev-workflow | 개발 워크플로우 최적화 및 CI/CD |
| oma-tf-infra | Terraform 인프라 코드 프로비저닝 |
| oma-translator | 컨텍스트 인식 다국어 번역 |
| oma-orchestrator | CLI 기반 서브에이전트 오케스트레이션 |
| oma-commit | Conventional Commit 워크플로우 |

## 프로젝트 구조

- `.agents/skills/`: 스킬 정의와 리소스
- `.agents/workflows/`: 명시적 워크플로우 명령
- `.serena/memories/`: 런타임 조율 상태
- `cli/cli.ts`: 커맨드 인터페이스 기준 소스

## Progressive Disclosure

1. 요청 의도 식별
2. 필요한 리소스만 로드
3. 전문 에이전트 실행
4. QA/디버그 루프로 검증 및 반복
