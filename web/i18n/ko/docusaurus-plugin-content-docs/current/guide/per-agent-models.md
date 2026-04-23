---
title: "가이드: 에이전트별 모델 설정"
description: 로 에이전트마다 CLI 벤더, 모델, 추론 수준을 따로 지정합니다. agent_cli_mapping, 런타임 프로파일, oma doctor --profile, models.yaml, 세션 쿼터 상한까지 다룹니다.
---

# 가이드: 에이전트별 모델 설정

## 개요

은 `agent_cli_mapping`을 통해 **에이전트별 모델 선택**을 도입합니다. 이제 각 에이전트(pm, backend, frontend, qa 등)가 전역 벤더 하나를 공유하지 않고, 서로 독립적으로 벤더·모델·추론 강도를 지정할 수 있습니다.

이 페이지에서 다루는 내용:

1. 3-파일 설정 계층
2. 이중 포맷 `agent_cli_mapping`
3. 런타임 프로파일 프리셋
4. `oma doctor --profile` 명령
5. `models.yaml`에서 사용자 정의 슬러그 추가
6. 세션 쿼터 상한

---

## 설정 파일 계층

은 아래 세 파일을 우선순위(높은 것부터) 순서로 읽습니다.

| 파일 | 역할 | 편집 가능 |
|:-----|:-----|:---------|
| `.agents/oma-config.yaml` | 사용자 오버라이드 — 에이전트-CLI 매핑, 활성 프로파일, 세션 쿼터 | 예 |
| `.agents/config/models.yaml` | 사용자 제공 모델 슬러그 (내장 레지스트리에 추가) | 예 |
| `.agents/config/defaults.yaml` | 내장 Profile B 기본값 (4개 `runtime_profiles`, 안전한 폴백) | 아니요 — SSOT |

> `defaults.yaml`은 SSOT의 일부이므로 직접 수정하지 마세요. 모든 커스터마이징은 `user-preferences.yaml`과 `models.yaml`에서 이루어집니다.

---

## 이중 포맷 `agent_cli_mapping`

`agent_cli_mapping`은 두 가지 값 형태를 함께 받아들여 점진적 마이그레이션이 가능합니다.

```yaml
# .agents/oma-config.yaml
agent_cli_mapping:
  pm: "claude"                        # 레거시 — 벤더만 지정 (기본 모델 사용)
  backend:                            # 신규 AgentSpec 오브젝트
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4-6"
    effort: medium
  qa:
    model: "google/gemini-3.1-pro-preview"
    effort: low
```

**레거시 문자열 형식**: `agent: "vendor"` — 계속 동작하며, 해당 벤더의 기본 모델과 기본 effort를 사용합니다.

**AgentSpec 오브젝트 형식**: `agent: { model, effort }` — 특정 모델 슬러그와 추론 강도(`low`, `medium`, `high`)를 못박습니다.

자유롭게 혼합 사용할 수 있습니다. 지정하지 않은 에이전트는 활성 `runtime_profile`로 폴백합니다.

---

## 런타임 프로파일

`defaults.yaml`은 Profile B와 함께 4개의 `runtime_profiles`를 기본 제공합니다. `user-preferences.yaml`에서 하나를 선택하세요.

```yaml
# .agents/oma-config.yaml
active_profile: claude-only   # 아래 옵션 참고
```

| 프로파일 | 모든 에이전트가 라우팅되는 곳 | 사용 시점 |
|:---------|:------------------------------|:----------|
| `claude-only` | Claude Code (Sonnet/Opus) | Anthropic 스택으로 통일 |
| `codex-only` | OpenAI Codex (GPT-5.x) | 순수 OpenAI 스택 |
| `gemini-only` | Gemini CLI | Google 중심 워크플로우 |
| `antigravity` | 혼합: pm→claude, backend→codex, qa→gemini | 벤더별 강점 조합 |
| `qwen-only` | Qwen CLI | 로컬 / 자체 호스팅 추론 |

프로파일은 에이전트마다 개별 수정 없이 전체 구성을 빠르게 바꾸는 지름길입니다.

---

## `oma doctor --profile`

새로 추가된 `--profile` 플래그는 세 파일이 모두 병합된 **후의** 각 에이전트 벤더·모델·effort를 매트릭스로 보여줍니다.

```bash
oma doctor --profile
```

**출력 예시:**

```
 — Active Profile: antigravity

Agent         Vendor    Model                       Effort   Source
------------  --------  --------------------------  -------  ------------------
pm            claude    claude-sonnet-4-6           medium   user-preferences
backend       openai    gpt-5.3-codex               high     user-preferences
frontend      openai    gpt-5.3-codex               medium   profile:antigravity
qa            google    gemini-3.1-pro-preview              low      profile:antigravity
architecture  claude    claude-opus-4-7             high     defaults
docs          claude    claude-sonnet-4-6           low      defaults

Session quota cap:
  tokens:       2,000,000
  spawn_count:  40
  per_vendor:   { claude: 1.2M, openai: 600K, google: 200K }
```

서브에이전트가 예상 밖의 벤더를 선택하면 이 명령을 먼저 실행하세요. `Source` 열이 어떤 설정 계층이 승리했는지 알려줍니다.

---

## `models.yaml`에 슬러그 추가

`models.yaml`은 선택 파일이며, 내장 레지스트리에 아직 없는 모델 슬러그를 등록할 때 사용합니다 — 새로 출시된 모델에 유용합니다.

```yaml
# .agents/config/models.yaml
models:
  - slug: "openai/gpt-5.5-spud"
    vendor: openai
    context_window: 1_000_000
    supports_effort: true
    default_effort: medium
    notes: "프리뷰 — GPT-5.5 Spud 릴리스 후보"
```

등록이 끝나면 `agent_cli_mapping`에서 해당 슬러그를 사용할 수 있습니다.

```yaml
agent_cli_mapping:
  backend:
    model: "openai/gpt-5.5-spud"
    effort: high
```

슬러그는 식별자이므로 벤더가 공개한 영문 문자열 그대로 유지하세요.

---

## 세션 쿼터 상한

`user-preferences.yaml`에 `session.quota_cap`을 추가해 서브에이전트 폭주를 막습니다.

```yaml
# .agents/oma-config.yaml
session:
  quota_cap:
    tokens: 2_000_000        # 세션 전체 토큰 상한
    spawn_count: 40          # 병렬 + 순차 서브에이전트 최대 개수
    per_vendor:              # 벤더별 토큰 서브 상한
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

상한에 도달하면 오케스트레이터는 추가 스폰을 거부하고 `QUOTA_EXCEEDED` 상태를 표면화합니다. 항목을 비워 두거나 `quota_cap` 자체를 생략하면 해당 차원은 비활성화됩니다.

---

## 전체 예시

실전 `user-preferences.yaml`:

```yaml
active_profile: antigravity

agent_cli_mapping:
  pm: "claude"
  backend:
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4-6"
    effort: medium
  qa:
    model: "google/gemini-3.1-pro-preview"
    effort: low

session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
    per_vendor:
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

`oma doctor --profile`로 해석 결과를 확인한 뒤 평소처럼 워크플로우를 시작하세요.


## Config file ownership

| File | Owner | Safe to edit? |
|------|-------|---------------|
| `.agents/config/defaults.yaml` | **SSOT shipped with oh-my-agent** | ❌ Treat as read-only |
| `.agents/oma-config.yaml` | You | ✅ Customize here |
| `.agents/config/models.yaml` | You | ✅ Add new slugs here |

`defaults.yaml` carries a `version:` field so new OMA releases can add runtime_profiles, new Profile B slugs, or adjust the effort matrix. Editing it directly means you will not receive those upgrades automatically.

## Upgrading defaults.yaml

When you pull a newer oh-my-agent release, run `oma install` — the installer compares your local `defaults.yaml` version against the bundled one:

- **Match** → no change, silent.
- **Mismatch** → warning:
  ```
  [install] .agents/config/defaults.yaml is 2.1.0; bundled is 2.2.0.
            Run 'oma install --update-defaults' to upgrade.
  ```
- **Mismatch + `--update-defaults`** → the bundled version overwrites yours:
  ```
  oma install --update-defaults
  # [install] Updated .agents/config/defaults.yaml (2.1.0 → 2.2.0)
  ```

Your `user-preferences.yaml` and `models.yaml` are never touched by the installer.

## Upgrading from a pre-5.16.0 install

If your project predates the per-agent model/effort feature:

1. Run `oma install` from your project root. The installer drops a fresh `defaults.yaml` into `.agents/config/` and preserves your existing `oma-config.yaml`.
2. Run `oma doctor --profile`. Your legacy `agent_cli_mapping: { backend: "gemini" }` values are now resolved through `runtime_profiles.gemini-only.agent_defaults.backend`, so the matrix shows the correct slug and CLI automatically.
3. (Optional) Move custom agent settings from `oma-config.yaml` into the new `user-preferences.yaml` using the AgentSpec form if you want per-agent `model`, `effort`, `thinking`, or `memory` overrides:
   ```yaml
   agent_cli_mapping:
     backend:
       model: "openai/gpt-5.3-codex"
       effort: "high"
   ```
4. If you ever customized `defaults.yaml`, `oma install` will warn about the version mismatch instead of overwriting. Move your customizations into `user-preferences.yaml` / `models.yaml`, then run `oma install --update-defaults` to accept the new SSOT.

No breaking changes to `agent:spawn` — legacy configs keep working through graceful fallback while you migrate at your own pace.
