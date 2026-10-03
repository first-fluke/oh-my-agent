---
title: "Przewodnik: integracja z istniejącym projektem"
sidebar_label: Istniejące projekty
description: Kompletny przewodnik dodawania oh-my-agent do istniejącego projektu — ścieżka CLI, ścieżka ręczna, weryfikacja, struktura dowiązań symbolicznych SSOT i działanie instalatora pod spodem.
---

# Przewodnik: integracja z istniejącym projektem

## Dwie ścieżki integracji

Istnieją dwa sposoby dodania oh-my-agent do istniejącego projektu:

1. **Ścieżka CLI**: uruchom `oma` (albo `npx oh-my-agent`) i odpowiedz na interaktywne pytania. Zalecana dla większości użytkowników.
2. **Ścieżka ręczna**: skopiuj pliki i samodzielnie skonfiguruj dowiązania symboliczne. Przydatna w środowiskach z ograniczeniami albo przy niestandardowych konfiguracjach.

Obie ścieżki dają ten sam wynik: katalog `.agents/` (SSOT) oraz wygenerowane pliki natywne dla vendorów, takie jak `.claude/agents/`, `.codex/agents/` i `.qwen/agents/`.

---

## Ścieżka CLI: krok po kroku

### 1. Zainstaluj CLI

```bash
# Global install (recommended)
bun install --global oh-my-agent

# Or use npx for one-time runs
npx oh-my-agent
```

Po instalacji globalnej polecenie `oma` (albo `oh-my-agent`) jest dostępne.

### 2. Przejdź do katalogu głównego projektu

```bash
cd /path/to/your/project
```

Uruchom instalator z katalogu projektu, który chcesz skonfigurować. OMA zapisuje SSOT względem katalogu głównego instalacji; repozytorium Git jest zalecane do przeglądu i wycofywania zmian, ale instalator go nie wymaga.

### 3. Uruchom instalator

```bash
oma
```

Domyślne polecenie (bez subcommandu) uruchamia instalator interaktywny.

### 4. Wybierz typ projektu

Instalator przedstawia następujące presety:

| Preset | Dołączone umiejętności |
|:-------|:---------------|
| **All** | Wszystkie dostępne umiejętności |
| **Fullstack** | Umiejętności frontend, backend, PM i QA |
| **Frontend** | Umiejętności React/Next.js |
| **Backend** | Umiejętności backendu Python/Node.js/Rust |
| **Mobile** | Umiejętności mobilne Flutter/Dart |
| **DevOps** | Umiejętności Terraform + CI/CD + workflowów |
| **Custom** | Wybór pojedynczych umiejętności z pełnej listy |

### 5. Wybierz język backendu (jeśli dotyczy)

Jeśli wybrany preset obejmuje umiejętność backendu, pojawi się prośba o wybór wariantu językowego:

- **Python**: FastAPI/SQLAlchemy (domyślnie)
- **Node.js**: NestJS/Hono + Prisma/Drizzle
- **Rust**: Axum/Actix-web
- **Other / Auto-detect**: skonfiguruj później przez `/stack-set`

### 6. Skonfiguruj dowiązania symboliczne IDE

Instalator zawsze tworzy dowiązania symboliczne Claude Code (`.claude/skills/`). Generuje też natywne pliki agentów, hooki, ustawienia i pliki integracyjne wybranego vendora; obecne rodziny vendorów obejmują Antigravity, Claude, Codex, Cursor, Kiro, Kimi, Qwen oraz ścieżki rozszerzeń pi i OpenCode. Jeśli istnieje katalog `.github/`, instalator może automatycznie utworzyć dowiązania symboliczne GitHub Copilot. Po wybraniu **ZCode** udostępnia workflowy jako polecenia slash przez dowiązania `.zcode/commands/*.md` (tylko workflowy — bez plików agentów i hooków). W przeciwnym razie pyta:

```
Also create symlinks for GitHub Copilot? (.github/skills/)
```

### 7. Zalecana globalna konfiguracja git

Pod koniec `oma install` i `oma update` CLI sprawdza dwa **globalne** ustawienia git, które pomagają w workflowach wieloagentowych:

| Klucz | Oczekiwana wartość | Dlaczego |
|:----|:--------------|:----|
| `rerere.enabled` | `true` | Ponowne używanie zapisanych rozwiązań — scalanie zmian wielu agentów często napotyka te same konflikty, a rerere odtwarza poprzednią poprawkę |
| `init.defaultBranch` | `main` | Spójna nazwa domyślnej gałęzi dla nowych repozytoriów |

Jeśli wartości brakuje albo jest inna, CLI proponuje interaktywne potwierdzenie (domyślnie **tak**):

```
Enable git rerere? (Recommended for multi-agent merge conflict reuse) (unset)
Set git init.defaultBranch to main? (Recommended global default) (currently "master")
```

Akceptacja uruchamia odpowiednik:

```bash
git config --global rerere.enabled true
git config --global init.defaultBranch main
```

**Ścieżki nieinteraktywne** (`--yes`, `--ci`, `CI=true`) nigdy nie zapisują globalnej konfiguracji git. Wyświetlają tylko informację o pominięciu wraz z poleceniami ręcznej naprawy.

`oma doctor` zgłasza te same kontrole w sekcji **Git Config**, liczy rozbieżności jako problemy, udostępnia je jako `gitRecommended` w wyjściu `--json` i może zastosować poprawki interaktywnie.

### 8. Konfiguracja MCP

Jeśli istnieje konfiguracja MCP IDE Antigravity (`~/.gemini/antigravity/mcp_config.json`), instalator proponuje skonfigurowanie mostu MCP Serena:

```
Configure Serena MCP with bridge? (Required for full functionality)
```

Po akceptacji konfiguruje:

```json
{
  "mcpServers": {
    "serena": {
      "command": "npx",
      "args": ["-y", "oh-my-agent@latest", "bridge", "http://localhost:12341/mcp"],
      "disabled": false
    }
  }
}
```

Podobnie, jeśli istnieją ustawienia Gemini CLI (`~/.gemini/settings.json`), instalator proponuje skonfigurowanie Sereny dla Gemini CLI w trybie HTTP:

```json
{
  "mcpServers": {
    "serena": {
      "url": "http://localhost:12341/mcp"
    }
  }
}
```

### 9. Ukończenie

Instalator wyświetla podsumowanie wszystkiego, co zostało zainstalowane:
- listę zainstalowanych umiejętności
- lokalizację katalogu umiejętności
- utworzone dowiązania symboliczne
- pominięte elementy (jeśli są)

---

## Ścieżka ręczna

Dla środowisk, w których interaktywny CLI nie jest dostępny (potoki CI, ograniczone powłoki, komputery firmowe).

### Krok 1: pobierz i rozpakuj

```bash
# Download the latest tarball from the registry
VERSION=$(curl -s https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/prompt-manifest.json | jq -r '.version')
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz" -o agent-skills.tar.gz

# Verify checksum
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz.sha256" -o agent-skills.tar.gz.sha256
sha256sum -c agent-skills.tar.gz.sha256

# Extract
tar -xzf agent-skills.tar.gz
```

### Krok 2: skopiuj pliki do projektu

```bash
# Copy the core .agents/ directory
cp -r .agents/ /path/to/your/project/.agents/

# Regenerate vendor-native files from the SSOT
cd /path/to/your/project
oma link
```

`oma link` regeneruje `.claude/`, `.codex/`, `.qwen/` i powiązane pliki natywne dla vendorów na podstawie `.agents/agents/`. W czasie działania OMA używa natywnego dispatchu tylko wtedy, gdy vendor bieżącego runtime’u pasuje do docelowego vendora danego agenta. Konfiguracje mieszane vendorów nadal działają, ale niepasujący agenci przechodzą do zewnętrznego `oma agent spawn`.

W Qwen Code wygenerowane definicje Markdown znajdują się w `.qwen/agents/`. Rolę OMA wybierasz przez `subagent_type` narzędzia Agent, na przykład `backend-engineer`. Dostępne definicje sprawdzisz poleceniem `/agents manage` w Qwen Code. Natywni agenci korzystają z tego samego [cyklu życia wyniku](./agent-results-and-resume.md) co uruchomienia CLI: `oma agent begin`, `oma agent verify` i `oma agent finish`. Przy `model_preset: free` użyj `oma agent spawn`, aby uruchomienie potomne otrzymało konfigurację bramy.

Qwen Code używa tego samego `code-intelligence-primer` co pozostali vendorzy. Podobnie jak Claude Code, rejestruje wspólny primer dla zdarzeń `SessionStart` i `UserPromptSubmit`: wskazówki są wstrzykiwane raz na sesję i ponownie po kompaktowaniu kontekstu. Primer podąża za skonfigurowanym dostawcą (Serena lub Gortex), zawiera wskazówki dotyczące narzędzi odroczonych i dopuszcza natywny fallback, gdy dostawca jest niedostępny lub przekracza limit czasu. Qwen nie dodaje osobnego blokowania wyszukiwania kodu ani śledzenia wyników dostawcy.

Po aktualizacji CLI uruchom `oma link qwen`, aby zregenerować ustawienia hooków i skrypt opakowujący, a następnie rozpocznij nową sesję Qwen. Testy wyjścia hooków weryfikują kontrakt integracji; nie gwarantują, jakiego narzędzia użyje model.

### Krok 3: skonfiguruj preferencje użytkownika

```bash
mkdir -p /path/to/your/project/.agents
cat > /path/to/your/project/.agents/oma-config.yaml << 'EOF'
language: en
date_format: ISO
timezone: UTC
model_preset: antigravity
EOF
```

### Krok 4: zainicjalizuj katalog pamięci

```bash
oma memory init
# Or manually:
mkdir -p /path/to/your/project/.agents/state/memories
```

---

## Checklista weryfikacji

Po instalacji (dowolną ścieżką) sprawdź, czy wszystko zostało poprawnie skonfigurowane:

```bash
# Run the doctor command for a full health check
oma doctor

# Check output format for CI
oma doctor --json
```

Polecenie doctor sprawdza:

| Kontrola | Co weryfikuje |
|:------|:----------------|
| **Instalacje CLI** | agy, claude, codex, qwen (wersja i dostępność) |
| **Uwierzytelnianie** | stan klucza API albo OAuth dla każdego CLI |
| **Konfiguracja MCP** | konfigurację serwera Serena MCP dla każdego środowiska CLI |
| **Stan umiejętności** | które umiejętności są zainstalowane i czy są aktualne |

Ręczne polecenia weryfikacji:

```bash
# Verify .agents/ directory exists
ls -la .agents/

# Verify skills are installed
ls .agents/skills/

# Verify symlinks point to correct targets
ls -la .claude/skills/

# Verify config exists
cat .agents/oma-config.yaml

# Verify memory directory
ls .agents/state/memories/ 2>/dev/null || echo "Memory not initialized"

# Check version
cat .agents/skills/_version.json 2>/dev/null
```

---

## Struktura dowiązań symbolicznych wielu IDE (koncepcja SSOT)

oh-my-agent używa architektury Single Source of Truth (SSOT). Katalog `.agents/` jest jedynym miejscem przechowywania umiejętności, workflowów, konfiguracji i definicji agentów. Wszystkie katalogi właściwe dla IDE zawierają tylko dowiązania symboliczne wskazujące z powrotem na `.agents/`.

### Układ katalogów

```
your-project/
  .agents/                          # SSOT — the real files live here
    agents/                         # Agent definition files
      backend-engineer.md
      frontend-engineer.md
      qa-reviewer.md
      ...
    config/                         # Shipped auxiliary config files
      ...
    oma-config.yaml                 # User-owned project configuration
    mcp.json                        # MCP server configuration
    results/plan-{sessionId}.json    # Current plan (generated by /plan)
    skills/                         # Installed skills
      _shared/                      # Shared resources across all skills
        core/                       # Core protocols and references
        runtime/                    # Runtime execution protocols
        conditional/                # Conditionally-loaded resources
      oma-frontend/                 # Frontend skill
      oma-backend/                  # Backend skill
      oma-qa/                       # QA skill
      ...
    workflows/                      # Workflow definitions
      orchestrate.md
      work.md
      ultrawork.md
      plan.md
      ...
    state/                          # Runtime coordination state
      memories/                     # Coordination artifacts (progress-*, result-*, task-board, session-cost-*)
    results/                        # Agent execution results
  .claude/                          # Claude Code — symlinks only
    skills/                         # -> .agents/skills/* and .agents/workflows/*
    agents/                         # -> .agents/agents/*
  .github/                          # GitHub Copilot — symlinks only (optional)
    skills/                         # -> .agents/skills/*
  .zcode/                           # ZCode — workflow commands only (optional)
    commands/                       # -> .agents/workflows/*
  .serena/                          # Serena MCP storage (separate from OMA state)
    memories/                       # Serena's own onboarding memories
    metrics.json                    # Productivity metrics
```

### Dlaczego dowiązania symboliczne?

Gdy `oma update` odświeża `.agents/`, każda wskazująca na niego IDE przejmuje zmianę. Umiejętności są przechowywane raz zamiast kopiowania ich do każdego IDE. Usunięcie `.claude/` nie usuwa umiejętności — SSOT w `.agents/` pozostaje. Dowiązania symboliczne są też małe i czytelnie pokazują zmiany w git.

---

## Wskazówki bezpieczeństwa i strategia wycofywania zmian

### Przed instalacją

1. **Zacommituj bieżącą pracę.** Instalator tworzy nowe katalogi i pliki. Czysty stan git pozwala użyć `git checkout .`, aby cofnąć całość.
2. **Sprawdź, czy istnieje katalog `.agents/`.** Jeśli został utworzony przez inne narzędzie, najpierw wykonaj kopię zapasową. Instalator go nadpisze.

### Po instalacji

1. **Przejrzyj utworzone elementy.** Uruchom `git status`, aby zobaczyć wszystkie nowe pliki. Instalator tworzy pliki tylko w `.agents/`, `.claude/` i opcjonalnie `.github/`.
2. **Sprawdź `.gitignore`.** W repozytorium git install/update/link automatycznie dopisuje wpisy runtime do głównego `.gitignore` (`.antigravitycli/`, `.agents/results/`, `.agents/state/`, `.agents/backup/`, `docs/plans/`) — sprawdź, czy zostały dodane. Większość zespołów zatwierdza `.agents/` i `.claude/`, aby współdzielić konfigurację. Jedyny wpis pozostawiony do Twojej decyzji to `.serena/`: Serena zarządza własnym cache przez wewnętrzny `.serena/.gitignore`, więc możesz zatwierdzić `.serena/project.yml` (współdzielona konfiguracja projektu) albo całkowicie ignorować katalog:

```gitignore
# optional — ignore Serena entirely (runtime memory)
.serena/
```

### Wycofanie zmian

Aby całkowicie usunąć oh-my-agent z projektu:

```bash
# Remove the SSOT directory
rm -rf .agents/

# Remove IDE symlinks
rm -rf .claude/skills/ .claude/agents/
rm -rf .github/skills/  # if created

# Remove runtime files
rm -rf .serena/
```

Albo po prostu wycofaj zmiany przez git:

```bash
git checkout -- .agents/ .claude/
git clean -fd .agents/ .claude/ .serena/
```

---

## Konfiguracja dashboardu

Po instalacji możesz skonfigurować monitorowanie w czasie rzeczywistym. Szczegóły znajdziesz w [przewodniku monitorowania dashboardu](/docs/guide/dashboard-monitoring).

Szybka konfiguracja:

```bash
# Terminal dashboard (watches .agents/state/memories/ for changes)
oma dashboard terminal

# Web dashboard (browser-based; OMA prints a tokenized loopback URL)
oma dashboard web
```

---

## Co instalator robi pod spodem

Po uruchomieniu `oma` (polecenia instalacji) dzieje się dokładnie to:

### 1. Migracja starszego formatu

Instalator sprawdza stary katalog `.agent/` (liczba pojedyncza) i w razie znalezienia migruje go do `.agents/` (liczba mnoga). To jednorazowa migracja dla użytkowników aktualizujących się ze starszych wersji.

### 2. Wykrywanie konkurencyjnych narzędzi

Instalator skanuje konkurencyjne narzędzia i proponuje ich usunięcie, aby uniknąć konfliktów.

### 3. Pobranie tarballa

Instalator pobiera najnowszy tarball wydania z wydań GitHub oh-my-agent. Tarball zawiera kompletny katalog `.agents/` ze wszystkimi umiejętnościami, współdzielonymi zasobami, workflowami, konfiguracjami i definicjami agentów.

### 4. Instalacja współdzielonych zasobów

`installShared()` kopiuje katalog `_shared/` do `.agents/skills/_shared/`. Obejmuje on:

- `core/`: routing umiejętności, ładowanie kontekstu, struktura promptu, zasady jakości, wykrywanie vendorów i kontrakty API.
- `runtime/`: protokół pamięci i protokoły wykonania dla poszczególnych vendorów.
- `conditional/`: zasoby ładowane tylko przy spełnieniu konkretnych warunków (wynik jakości, pętla eksploracji).

### 5. Instalacja workflowów

`installWorkflows()` kopiuje wszystkie pliki workflowów do `.agents/workflows/`. Są to definicje `/orchestrate`, `/work`, `/ultrawork`, `/plan`, `/brainstorm`, `/deepinit`, `/review`, `/debug`, `/design`, `/scm`, `/tools` i `/stack-set`.

### 6. Instalacja konfiguracji

`installConfigs()` kopiuje pliki pomocnicze do `.agents/config/`, tworzy `.agents/mcp.json` i inicjalizuje należący do użytkownika `.agents/oma-config.yaml` albo `.agents/oma-config.cue`. Istniejące pliki użytkownika są zachowywane, chyba że użyto `--force`; `oma update` również zachowuje konfigurację użytkownika i dopisuje nowe klucze najwyższego poziomu szablonu, gdy są potrzebne.

### 7. Instalacja umiejętności

Dla każdej wybranej umiejętności `installSkill()` kopiuje katalog umiejętności do `.agents/skills/{skill-name}/`. Jeśli wybrano wariant (np. Python dla backendu), konfiguruje też katalog `stack/` z zasobami właściwymi dla języka.

### 8. Dostosowania vendorów

`installVendorAdaptations()` instaluje pliki właściwe dla IDE dla wybranych obsługiwanych vendorów:

- definicje agentów (`.claude/agents/*.md`, `.codex/agents/*.toml`, `.gemini/agents/*.md`)
- konfiguracje hooków (`.claude/hooks/`, `.codex/hooks.json`)
- pliki ustawień i wspólną dokumentację integracji vendora (tylko `AGENTS.md`, w tym dla Claude Code ≥ 2.1.277). `CLAUDE.md` i `GEMINI.md` nigdy nie otrzymują bloku OMA; istniejący, należący do użytkownika `CLAUDE.md` otrzymuje wyłącznie linię importu `@AGENTS.md`, aby Claude Code nie pomijał `AGENTS.md`

Codex zabezpiecza swoje hooki jednorazowym krokiem zaufania, więc `.codex/hooks.json` nie działa, dopóki nie przejrzysz go raz w przeglądarce hooków Codex `/hooks`. Zobacz [Zaufanie do hooków Codex](/docs/guide/codex-hook-trust).

### 9. Dowiązania symboliczne CLI

`createCliSymlinks()` tworzy dowiązania symboliczne z katalogów właściwych dla IDE do SSOT:

- `.claude/skills/{skill}` -> `../../.agents/skills/{skill}`
- `.claude/skills/{workflow}.md` -> `../../.agents/workflows/{workflow}.md`
- `.github/skills/{skill}` -> `../../.agents/skills/{skill}` (jeśli włączono Copilot)

Natywne pliki agentów vendorów są generowane z `.agents/agents/` przez `oma link`, `oma install` albo `oma update`, a nie bezpośrednio linkowane.

### 10. Workflowy globalne

`installGlobalWorkflows()` instaluje pliki workflowów, które mogą być potrzebne globalnie (poza katalogiem projektu).

### 11. Zalecana konfiguracja git + MCP

Jak opisano wyżej w ścieżce CLI, install/update opcjonalnie konfiguruje zalecane **globalne** ustawienia git (`rerere.enabled`, `init.defaultBranch`) za interaktywną zgodą i może konfigurować ustawienia MCP, gdy ma to zastosowanie.
