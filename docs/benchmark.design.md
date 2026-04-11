# AI Harness Benchmark Design

Benchmark framework for comparing AI coding harness performance using a standardized creative prompt.

## Overview

Compare oh-my-agent against other Claude Code harnesses by running an identical prompt in isolated environments and scoring the results across code quality, feature completeness, UI/UX, and testing dimensions.

## Comparison Targets

| ID | Harness | Repository | Install Method |
|---|---|---|---|
| vanilla | Claude Code (no harness) | - | (none) |
| oma | oh-my-agent | first-fluke/oh-my-agent | `bunx oh-my-agent@latest` |
| omc | oh-my-claudecode | Yeachan-Heo/oh-my-claudecode | Plugin marketplace |
| ecc | everything-claude-code | affaan-m/everything-claude-code | `./install.sh --profile full` |
| superpowers | superpowers | obra/superpowers | Plugin marketplace |

## Control Variables

| Variable | Value |
|---|---|
| Prompt | `docs/benchmark.prompt.md` (identical raw prompt, no harness workflow) |
| Model | claude-opus-4-6 (1M context) |
| Initial state | Empty directory + `git init` only |
| Isolation | `$HOME` override per harness |
| Time limit | 60 minutes per run |
| Human intervention | Only "continue", "yes", tool approval (logged) |
| Runs | 1 per harness (reproducibility conditions documented) |

## Environment Isolation

Each harness runs with a separate `$HOME` to prevent global plugin contamination.

```bash
BASE=/tmp/oma-benchmark-$(date +%s)

for h in vanilla oma omc ecc superpowers; do
  mkdir -p $BASE/homes/$h $BASE/projects/$h
  git -C $BASE/projects/$h init
  git config --file $BASE/homes/$h/.gitconfig user.name "benchmark"
  git config --file $BASE/homes/$h/.gitconfig user.email "bench@test"
done
```

Execution per harness:

```bash
HOME=$BASE/homes/{harness} \
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
  claude --model claude-opus-4-6 --dir $BASE/projects/{harness}
```

## Directory Structure

```
benchmarks/
├── prompt/
│   └── benchmark.prompt.md
├── runs/
│   ├── vanilla/
│   ├── oma/
│   ├── omc/
│   ├── ecc/
│   └── superpowers/
├── scoring/
│   ├── checklist.json
│   ├── auto-score.sh
│   └── manual-score.template.json
├── screenshots/
│   ├── vanilla/
│   ├── oma/
│   ├── omc/
│   ├── ecc/
│   └── superpowers/
└── results/
    ├── scores.json
    └── report.md
```

## Scoring: Feature Checklist

Total: 100 points across 8 categories.

### Project Setup (10pts)

| ID | Description | Auto |
|---|---|---|
| setup-nextjs | Next.js + TypeScript project configured | yes |
| setup-tailwind | Tailwind CSS configured | yes |
| setup-r3f | React Three Fiber + Drei dependencies | yes |
| setup-build | Build succeeds (`npm run build`) | yes |

### 3D World Builder (20pts)

| ID | Description | Auto |
|---|---|---|
| 3d-canvas | Three.js Canvas rendering | no |
| 3d-place | Object placement | no |
| 3d-move-rotate | Move / rotate / scale controls | no |
| 3d-color-texture | Color / texture modification | no |
| 3d-env-theme | Environment theme selection | no |
| 3d-animation | Simple animation / interaction | no |

### AI Creative Partner (15pts)

| ID | Description | Auto |
|---|---|---|
| ai-panel | AI sidebar / guide UI exists | no |
| ai-prompt | Idea prompting capability | no |
| ai-whatif | What-if question generation | no |
| ai-api | OpenAI API integration code | yes |

### Child Onboarding (10pts)

| ID | Description | Auto |
|---|---|---|
| onboard-flow | Onboarding screen / flow exists | no |
| onboard-simple | Startable within 1 minute UX | no |

### Play / Explore Mode (10pts)

| ID | Description | Auto |
|---|---|---|
| play-enter | Explore created world mode | no |
| play-interact | Object click reactions / animations | no |

### Save / Gallery (10pts)

| ID | Description | Auto |
|---|---|---|
| save-load | Project save / load | no |
| gallery-view | Gallery screen exists | no |

### UX Quality (15pts)

| ID | Description | Auto |
|---|---|---|
| ux-child | Child-friendly design (big buttons, minimal text) | no |
| ux-responsive | Desktop / tablet responsive | no |
| ux-no-clutter | Clean UI (no clutter) | no |
| ux-visual-guide | Visual guidance / icon-driven | no |

### Code Quality & Testing (10pts)

| ID | Description | Auto |
|---|---|---|
| test-exists | Test files exist (*.test.*, *.spec.*) | yes |
| test-pass | Tests pass (`npm test`) | yes |
| test-coverage | Coverage for key components | yes |
| test-meaningful | Meaningful tests (not just snapshots) | no |

## Auto Scoring

`auto-score.sh` checks:

| Check | Command |判定 |
|---|---|---|
| Next.js exists | `grep "next" package.json` | exists |
| TypeScript | `ls tsconfig.json` | exists |
| Tailwind | `grep "tailwindcss" package.json` | exists |
| R3F + Drei | `grep "@react-three" package.json` | exists |
| Build success | `npm install && npm run build` | exit code 0 |
| TSC errors | `npx tsc --noEmit 2>&1 \| grep "error" \| wc -l` | error count |
| Lint | `npx eslint . --format json` | error / warning count |
| OpenAI API | `grep -r "openai" src/` | exists |
| Test files | `find src -name "*.test.*" -o -name "*.spec.*" \| wc -l` | file count |
| Tests pass | `npm test -- --passWithNoTests` | exit code 0 |
| Coverage | `npm test -- --coverage` | % |
| File count / LOC | `tokei` or `cloc` | reference |

## Manual Scoring Template

```json
{
  "harness": "",
  "scorer": "",
  "date": "",
  "scores": {
    "3d-canvas":      { "score": 0, "max": 5, "note": "" },
    "3d-place":       { "score": 0, "max": 5, "note": "" },
    "ux-child":       { "score": 0, "max": 5, "note": "" }
  },
  "screenshots": [],
  "overall_impression": ""
}
```

## Run Protocol

### Phase 1: Environment Preparation

1. Create BASE directory with 5 homes + projects
2. Set git config per home
3. Verify ANTHROPIC_API_KEY
4. Record Claude Code version (`claude --version`)
5. Copy benchmark.prompt.md to $BASE/prompt.md

### Phase 2: Harness Installation (sequential)

1. vanilla: skip
2. oma: `cd projects/oma && HOME=$BASE/homes/oma bunx oh-my-agent@latest`
3. omc: plugin install in isolated HOME
4. ecc: install.sh in isolated HOME
5. superpowers: plugin install in isolated HOME
6. Snapshot each install state (`ls -la`, `du -sh`)

### Phase 3: Benchmark Execution (sequential, one at a time)

1. Start timer
2. Launch Claude Code with isolated HOME and model pinned
3. Paste prompt.md content
4. Wait for completion (max 60 minutes)
5. Stop timer, record token usage
6. Record intervention count

### Phase 4: Result Collection

1. `npm install && npm run build`
2. `npm test`
3. `npx tsc --noEmit`
4. Run `auto-score.sh`
5. Start dev server, capture screenshots
6. Copy code to `runs/{harness}/`

### Phase 5: Scoring & Report

1. Aggregate auto scores
2. Complete manual scoring
3. Generate `scores.json`
4. Generate `report.md`

## Intervention Policy

### Allowed

- "continue" / "계속"
- "yes" (to y/n questions)
- Tool approval (Claude Code permissions)

### Not Allowed

- Error fix instructions
- Code modifications
- Architecture / direction suggestions
- Additional requirements

All interventions logged: `{ "time": "...", "type": "continue|approve|yn", "context": "..." }`

## Edge Case Handling

| Situation | Response |
|---|---|
| Harness install fails | 3 retries, then record as "install failure", score 0 |
| Claude stops responding | 5 min no-response → 1x "continue" (counts as intervention) |
| Build fails | Record as-is. No human fixes |
| npm install fails | Dependency issues are part of the harness result |
| Multi-turn response | Allowed. Human only says "continue" |
| Harness auto-detects workflow | Allowed. Auto-detection is a natural feature |
| Dev server shows blank | Screenshot as-is. Blank screen is a result |
| No test framework | test-exists: 0, test-pass: N/A |
| Token limit exceeded | Score based on output at that point |

## Time Limits

| Phase | Limit |
|---|---|
| Harness installation | 5 minutes |
| Benchmark execution | 60 minutes |
| Build & test | 5 minutes |
| Screenshot capture | 5 minutes |

## Meta Metrics (not scored, reference only)

| Metric | Description |
|---|---|
| Wall Clock Time | Total execution time |
| Total Tokens | Token usage during run |
| Human Interventions | Number of interventions |
| Retry Count | Error retry count |
| Files Generated | Total generated file count |
| Lines of Code | LOC via tokei/cloc |

## Report Format

Final report (`results/report.md`) includes:

1. Summary table (score, build, tests, time, tokens per harness)
2. Screenshot comparison grid (Landing, World Builder, AI Panel, Gallery)
3. Category breakdown tables
4. Meta metrics comparison
5. Methodology section for reproducibility
