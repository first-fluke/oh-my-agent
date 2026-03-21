---
title: Integracja z istniejącym projektem
description: Bezpieczny i niedestrukcyjny przepływ integracji dodający umiejętności oh-my-agent do istniejącego projektu Antigravity.
---

# Integracja z istniejącym projektem

Ten przewodnik zastępuje przestarzały przepływ pracy oparty na `AGENT_GUIDE.md` w katalogu głównym i odzwierciedla aktualną strukturę workspace (`cli` + `web`) oraz zachowanie CLI.

## Cel

Dodanie umiejętności `oh-my-agent` do istniejącego projektu bez nadpisywania bieżących zasobów.

## Zalecana ścieżka (CLI)

Uruchom to w katalogu głównym docelowego projektu:

```bash
bunx oh-my-agent
```

Co robi:

- Instaluje lub aktualizuje `.agents/skills/*`
- Instaluje współdzielone zasoby w `.agents/skills/_shared`
- Instaluje `.agents/workflows/*`
- Instaluje `.agents/config/user-preferences.yaml`
- Opcjonalnie instaluje globalne przepływy pracy w `~/.gemini/antigravity/global_workflows`

## Bezpieczna ścieżka ręczna

Użyj tego, gdy potrzebujesz pełnej kontroli nad każdym kopiowanym katalogiem.

```bash
cd /path/to/your-project

mkdir -p .agents/skills .agents/workflows .agents/config

# Copy only missing skill directories (example)
for skill in oma-coordination oma-pm oma-frontend oma-backend oma-mobile oma-qa oma-debug oma-orchestrator oma-commit; do
  if [ ! -d ".agents/skills/$skill" ]; then
    cp -r /path/to/oh-my-agent/.agents/skills/$skill .agents/skills/$skill
  fi
done

# Copy shared resources if missing
[ -d .agents/skills/_shared ] || cp -r /path/to/oh-my-agent/.agents/skills/_shared .agents/skills/_shared

# Copy workflows if missing
for wf in coordinate.md orchestrate.md plan.md review.md debug.md setup.md tools.md; do
  [ -f ".agents/workflows/$wf" ] || cp /path/to/oh-my-agent/.agents/workflows/$wf .agents/workflows/$wf
done

# Copy default user preferences only if missing
[ -f .agents/config/user-preferences.yaml ] || cp /path/to/oh-my-agent/.agents/config/user-preferences.yaml .agents/config/user-preferences.yaml
```

## Lista kontrolna weryfikacji

```bash
# 9 installable skills (excluding _shared)
find .agents/skills -mindepth 1 -maxdepth 1 -type d ! -name '_shared' | wc -l

# Shared resources
[ -d .agents/skills/_shared ] && echo ok

# 7 workflows
find .agents/workflows -maxdepth 1 -name '*.md' | wc -l

# Basic command health
bunx oh-my-agent doctor
```

## Opcjonalne panele

Panele są opcjonalne i korzystają z zainstalowanego CLI:

```bash
bunx oh-my-agent dashboard
bunx oh-my-agent dashboard:web
```

Domyślny URL panelu webowego: `http://localhost:9847`

## Strategia wycofywania

Przed integracją utwórz commit z punktem kontrolnym w swoim projekcie:

```bash
git add -A
git commit -m "chore: checkpoint before oh-my-agent integration"
```

Jeśli musisz cofnąć zmiany, wycofaj ten commit zgodnie z normalnym procesem zespołu.

## Obsługa dowiązań symbolicznych dla wielu CLI

Po uruchomieniu `bunx oh-my-agent` zobaczysz ten komunikat po wybraniu umiejętności:

```text
Also develop with other CLI tools?
  ○ Claude Code (.claude/skills/)
  ○ OpenCode, Amp, Codex (.agents/skills/)
  ○ GitHub Copilot (.github/skills/)
```

Wybierz dodatkowe narzędzia CLI, których używasz obok Antigravity. Instalator:

1. Zainstaluje umiejętności do `.agents/skills/` (natywna lokalizacja Antigravity)
2. Utworzy dowiązania symboliczne z katalogu umiejętności każdego wybranego CLI do `.agents/skills/`

Zapewnia to jedno źródło prawdy, jednocześnie umożliwiając działanie umiejętności w wielu narzędziach CLI.

### Struktura dowiązań symbolicznych

```
.agents/skills/oma-frontend/      ← Źródło (SSOT)
.claude/skills/oma-frontend/     → ../../.agents/skills/oma-frontend/
.agents/skills/oma-frontend/     → ../../.agents/skills/oma-frontend/ (OpenCode, Amp, Codex)
.github/skills/oma-frontend/     → ../../.agents/skills/oma-frontend/ (GitHub Copilot)
```

Instalator pomija istniejące dowiązania symboliczne i ostrzega, jeśli w docelowej lokalizacji istnieje prawdziwy katalog.

## Uwagi

- Nie nadpisuj istniejących katalogów `.agents/skills/*`, chyba że zamierzasz zastąpić dostosowane umiejętności.
- Zachowaj pliki polityk specyficzne dla projektu (`.agents/config/*`) pod własnością swojego repozytorium.
- Aby poznać wzorce orkiestracji wieloagentowej, przejdź do [`Przewodnika użycia`](./usage.md).
