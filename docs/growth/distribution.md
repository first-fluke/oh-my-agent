# Worked-example distribution copy

The copy below is prepared for review. Publishing requires an explicit request for the target account and channel. Publication status is recorded separately from reach and adoption measurements.

Use full task or case URLs. A reused short link cannot distinguish which post produced a visit by itself. URL parameters alone do not create analytics collection.

## DEV article record

[Testing a plugin hook that points to a missing file](https://dev.to/gracefullight/testing-a-plugin-hook-that-points-to-a-missing-file-1a74) is published under `gracefullight`. DEV reports publication at `2026-10-28T03:00:30Z`; the public article and its exact API body were checked. Owner analytics remain in the ignored local measurement record.

## DEV article

Title: Testing a plugin hook that points to a missing file

Tags: `ai`, `programming`, `testing`, `opensource`

A plugin hook can point to a file that exists in a developer checkout and is missing from the distributed plugin cache. Checking that the manifest is valid will not catch that failure.

We repaired this in oh-my-agent. The old manifest referenced generated files under `${CLAUDE_PLUGIN_ROOT}/.claude/hooks/`. A fresh-cache fixture omitted those files, exposing the packaging dependency.

## Test the distributed shape

The repair routes marketplace events through a tracked shell dispatcher and the installed CLI. It also checks whether an executable project hook already owns the event, so project and marketplace registrations do not deliver the same event twice.

Bootstrap needed a separate check: a success marker shared across projects could let a second project skip its own wiring. The receipt now belongs to the project, and reuse requires the configuration, version, executable wrapper, and actual hook registrations.

The [worked repair](https://firstfluke.com/oh-my-agent/docs/examples/plugin-hook-repair/) links the before/after source and the regression fixtures. Those fixtures use fake CLI commands and temporary directories. They test dispatch and wiring; real host and model behavior require a separate session check.

## Apply the method to your own diff

Ask your coding agent to load the review instructions:

```bash
bunx skills use first-fluke/oh-my-agent@oma-qa
```

Then give it a bounded request:

```text
Review this diff against origin/main. Check whether referenced files exist in
the distributed package, not only this checkout. Look for duplicate event
delivery and project-specific state stored in shared locations. Cite each
confirmed finding with file:line and its trigger. Keep application source
unchanged and report which checks you actually ran.
```

The command returns instructions and their support directory. Your agent still needs to read them and have access to the repository and its existing tools.

[Review your own AI-written change](https://firstfluke.com/oh-my-agent/docs/tasks/review-ai-code/). Check the cited locations and rerun the narrow checks before deciding whether to merge.

https://github.com/first-fluke/oh-my-agent

## Short English post

A hook can pass a manifest check and still call a file missing from the distributed plugin cache.

We fixed that failure in oh-my-agent, along with a bootstrap receipt that could skip wiring a second project. The write-up links the before/after code and the fixtures used to check the repair.

The same review method applies to AI-generated changes: check the distributed file layout, event ownership, and where project state is stored.

The worked example includes a review prompt to try on your own diff:
https://firstfluke.com/oh-my-agent/docs/examples/plugin-hook-repair/

## Short Korean copy

플러그인 manifest가 유효해도 배포 파일에 없는 경로를 호출하면 훅은 실행되지 않습니다.

OMA에서 이 문제와, 두 번째 프로젝트의 훅 설정을 건너뛸 수 있던 bootstrap receipt를 수정했습니다. 수정 전후 코드와 회귀 검사에서 무엇을 확인하는지 사례로 정리했습니다.

AI가 작성한 변경을 리뷰할 때도 배포 파일 구성, 이벤트 중복 실행, 프로젝트 상태의 저장 위치를 확인하는 데 쓸 수 있습니다.

수정 사례:
https://firstfluke.com/oh-my-agent/docs/examples/plugin-hook-repair/

## After publishing

Record impressions/reach and reported link visits at a fixed check date. Keep platform counts separate from GitHub traffic and npm downloads. A reply describing successful use is useful evidence; it is not an all-user retention rate.

The existing `bun run sns --dry-run --targets devto` path prepares local prompts only. Normal SNS execution can call models and upload drafts; `--force` / `--publish` can publish publicly. Record an authorized publication's URL, account, timestamp source, and available analytics in the ignored local measurement record.
