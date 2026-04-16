---
title: Integracja z istniejącym projektem
description: Kompletny przewodnik dodawania oh-my-agent do istniejącego projektu — ścieżka CLI, ścieżka ręczna, weryfikacja, struktura dowiązań symbolicznych SSOT i co instalator robi pod spodem.
---

# Integracja z istniejącym projektem

## Dwie ścieżki integracji

1. **Ścieżka CLI** — Uruchom `oma` (lub `npx oh-my-agent`) i podążaj za interaktywnymi podpowiedziami. Zalecana dla większości użytkowników.
2. **Ścieżka ręczna** — Skopiuj pliki i skonfiguruj dowiązania symboliczne samodzielnie. Przydatna dla ograniczonych środowisk.

Obie ścieżki produkują ten sam wynik: katalog `.agents/` (SSOT) z dowiązaniami symbolicznymi wskazującymi katalogi specyficzne dla IDE na niego.

---

## Ścieżka CLI: krok po kroku

### 1. Zainstaluj CLI
```bash
bun install --global oh-my-agent
```

### 2. Przejdź do głównego katalogu projektu
```bash
cd /path/to/your/project
```

### 3. Uruchom instalator
```bash
oma
```

### 4. Wybierz typ projektu
Presety: All, Fullstack, Frontend, Backend, Mobile, DevOps, Custom.

### 5. Wybierz język backend (jeśli dotyczy)
Python, Node.js, Rust lub Auto-detect.

### 6. Skonfiguruj dowiązania symboliczne IDE
Instalator zawsze tworzy dowiązania Claude Code (`.claude/skills/`). Opcjonalnie GitHub Copilot.

### 7. Git rerere
Zalecane dla wieloagentowych workflow z potencjalnymi konfliktami merge.

### 8. Konfiguracja MCP
Opcjonalna konfiguracja Serena MCP bridge dla Antigravity IDE i Gemini CLI.

---

## Ścieżka ręczna

Dla środowisk bez interaktywnego CLI:

```bash
# Pobierz i wyodrębnij
VERSION=$(curl -s https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/prompt-manifest.json | jq -r '.version')
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz" -o agent-skills.tar.gz
sha256sum -c agent-skills.tar.gz.sha256
tar -xzf agent-skills.tar.gz

# Skopiuj do projektu
cp -r .agents/ /path/to/your/project/.agents/

# Utwórz dowiązania symboliczne
mkdir -p /path/to/your/project/.claude/skills
ln -sf ../../.agents/skills/oma-frontend /path/to/your/project/.claude/skills/oma-frontend
# ... (powtórz dla każdego skill)
```

---

## Lista kontrolna weryfikacji

```bash
oma doctor
oma doctor --json  # Format wyjściowy dla CI
```

Sprawdza: instalacje CLI, uwierzytelnianie, konfigurację MCP, stan umiejętności.

---

## Struktura dowiązań symbolicznych wielu IDE (koncepcja SSOT)

```
your-project/
  .agents/                    # SSOT — prawdziwe pliki są tutaj
  .claude/                    # Claude Code — tylko dowiązania symboliczne
    skills/                   # -> .agents/skills/* i .agents/workflows/*
    agents/                   # -> .agents/agents/*
  .github/                    # GitHub Copilot — tylko dowiązania symboliczne (opcjonalne)
  .serena/                    # Przechowywanie pamięci MCP
```

### Dlaczego dowiązania symboliczne?
- **Jedna aktualizacja, wszystkie IDE korzystają.** Odświeżenie `.agents/` automatycznie dociera do każdego IDE.
- **Brak duplikacji.** Umiejętności przechowywane raz.
- **Bezpieczne usuwanie.** Usunięcie `.claude/` nie niszczy umiejętności.
- **Przyjazne dla git.** Dowiązania symboliczne są małe i czytelne w diffach.

---

## Wskazówki bezpieczeństwa i strategia wycofania

### Przed instalacją
1. **Commitnij bieżącą pracę.** Czysty stan git pozwala na `git checkout .` do cofnięcia.
2. **Sprawdź istniejący `.agents/`.** Zrób backup jeśli istnieje.

### Po instalacji
Dodaj do `.gitignore`:
```gitignore
.serena/
.agents/results/
.agents/state/
```

### Wycofanie
```bash
rm -rf .agents/ .claude/skills/ .claude/agents/ .serena/
```

---

## Co instalator robi pod spodem

1. Migracja z legacy `.agent/` do `.agents/`
2. Wykrywanie konkurencyjnych narzędzi
3. Pobieranie tarballa z wydań GitHub
4. Instalacja zasobów współdzielonych, workflow, konfiguracji
5. Instalacja wybranych umiejętności
6. Adaptacje dostawców (Claude, Codex, Gemini, Qwen)
7. Tworzenie dowiązań symbolicznych CLI
8. Konfiguracja git rerere + MCP
