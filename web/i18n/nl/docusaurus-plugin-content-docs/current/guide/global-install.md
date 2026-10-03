---
title: "Gids: Globale installatie"
sidebar_label: Globale installatie
description: Installeer oh-my-agent in je gebruikers-HOME (~/.agents/) in plaats van per project, zodat dezelfde skills, workflows en regels in elk project beschikbaar zijn. Deze gids behandelt oma install --global, oma update --global, oma uninstall --global, de OMA_HOME-override, detectie van dubbele installaties via oma doctor en aandachtspunten voor sudo, CI, WSL en cwd=HOME.
---

## Wat is een globale installatie?

Standaard beperkt `oma install` alles tot de huidige projectmap: de SSOT staat in `<cwd>/.agents/` en vendorconfiguraties worden geschreven naar `<cwd>/.claude/`, `<cwd>/.codex/` enzovoort. Een **globale installatie** (`oma install --global`) installeert oh-my-agent in je gebruikers-HOME. Dezelfde skills, workflows en regels zijn dan beschikbaar in elk project dat je opent, zonder de installatie opnieuw uit te voeren. De SSOT staat in `~/.agents/` en de vendorconfiguraties in `~/.claude/`, `~/.codex/` enzovoort.

## Project en globaal vergelijken

| Aspect | Project (`oma install`) | Globaal (`oma install --global`) |
|--------|------------------------|--------------------------------|
| SSOT-locatie | `<cwd>/.agents/` | `~/.agents/` |
| Vendorconfiguraties | `<cwd>/.claude/`, `<cwd>/.codex/`, enz. | `~/.claude/`, `~/.codex/`, enz. |
| Lockbestand | `<cwd>/.agents/_install.lock` | `~/.agents/_install.lock` |
| Metadata | `<cwd>/.agents/_version.json (schemaVersion=2)` | `~/.agents/_version.json (schemaVersion=2)` |
| Gebruik | Aanpassing per project | Persoonlijke standaard voor alle projecten |
| Scope van oma-config.yaml | Projectspecifiek | Gebruikersbrede basis |

Beide modi kunnen naast elkaar bestaan. `oma doctor` rapporteert beide installaties als ze aanwezig zijn en meldt afwijkingen tussen beide.

Na een geslaagde globale installatie controleer je de bestanden onder HOME en het opgeloste profiel:

```bash
oma doctor --json
oma doctor --profile
```


Het eerste commando rapporteert de gezondheid van de installatie en vendors; het profielcommando toont het modelplan dat agents gebruiken. Voer deze commando’s vanuit elk project uit wanneer je de globale installatie wilt controleren.

## Eerste keer instellen

De eerste keer dat je `oma install --global` op een machine uitvoert, toont de installer vóór het doorgaan een toelichting:

```
This is your first global install of oh-my-agent.
Scope:
  - SSOT: ~/.agents/  (all skills, workflows, rules)
  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)
  - Lock file: ~/.agents/_install.lock
Existing per-project installs are not affected.

? Proceed with the global install? (y/N)
```


Bevestig om door te gaan. Daarna volgt de installatie dezelfde interactieve flow als een projectinstallatie (taal, modelpreset, projecttype en vendorselectie).

Na een geslaagde installatie toont de installer de volgende stappen:

```
1. Open your project in your IDE
2. Type /orchestrate to spawn a multi-agent workflow
3. Run `oma doctor` if anything looks off
```


## Aandachtspunten

### Sudo geweigerd

`oma install` (in elke modus) stopt direct als het onder `sudo` wordt uitgevoerd:

```
Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.
```


Voer het commando als je normale gebruiker uit, zonder `sudo`.

### CI-omgevingen

Als je `oma install --global` in een CI-pipeline uitvoert, wijzigt het de HOME-map van de CI-runner. Dat is meestal ongewenst. Als je dit toch nodig hebt, bijvoorbeeld in een bootstrap-pipeline, geeft oma een waarschuwing:

```
Running `oma install --global` in CI. This will modify the CI user's HOME.
```


De installatie gaat door als `--yes` / `OMA_YES=1` is ingesteld. Zonder die instelling wordt de waarschuwing getoond en gaat de installatie interactief verder. In de meeste CI-omgevingen blijft die dan hangen.

### WSL: Linux-HOME en Windows-USERPROFILE

Wanneer oma detecteert dat het binnen Windows Subsystem for Linux draait, toont het:

```
WSL detected: your $HOME (/home/<user>) is the WSL Linux home and is distinct
from your Windows %USERPROFILE%. oma will install only to the WSL HOME.
If you want a Windows-side install, re-run this command from PowerShell.
```


Een WSL-installatie en een PowerShell-installatie zijn onafhankelijk. Wil je aan beide kanten globale dekking, voer `oma install --global` dan eenmaal vanuit WSL en eenmaal vanuit PowerShell uit.

### cwd = HOME-guard (projectmodus)

`oma link` en `oma update` (zonder `--global`) weigeren te draaien zolang je huidige map je HOME is. In projectmodus zou `<cwd>/.claude/settings.json` gelijk zijn aan `~/.claude/settings.json` — je globale Claude Code-instellingen — en zou de projectgebonden render de `$HOME/.claude/hooks/...`-commando's daarin herschrijven naar `$CLAUDE_PROJECT_DIR/...`, waardoor elke hook en de statusline stukgaan in projecten zonder eigen `.claude/hooks/`. Gebruik in plaats daarvan `oma link --global` / `oma update --global` voor de HOME-installatie, of ga eerst met `cd` naar een project.

Als je `oma install` zonder `--global` uitvoert terwijl je huidige map je HOME is, waarschuwt oma:

```
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```


In niet-interactieve modus en in CI wordt dit automatisch afgebroken. Gebruik `--global` als je een installatie voor de hele gebruiker bedoelt.

## Een globale installatie opnieuw koppelen

`oma link` genereert vendorbestanden opnieuw vanuit de SSOT, zonder opnieuw te installeren. Net als bij `install` en `update` wordt de doelinstallatie uit de installatiecontext afgeleid. Geef dus `--global` door om `~/.agents/` te synchroniseren; dit werkt vanuit elke map, niet alleen vanuit `$HOME`:

```bash
# Regenerate every configured vendor in the global install
oma link --global

# Regenerate only opencode (e.g. after editing per-agent models in ~/.agents/oma-config.yaml)
oma link opencode --global
```


Zonder `--global` richt `oma link` zich op `<cwd>/.agents/`. Als je het vanuit een project uitvoert terwijl je installatie globaal is, meldt het dat daar geen `.agents/`-map is gevonden.

## Deïnstalleren

```bash
# Preview what would be removed (never deletes anything)
oma uninstall --global --dry-run

# Remove the global install
oma uninstall --global
```


De deïnstallatieopdracht scheidt bestanden die door oma worden beheerd van bestanden die door de gebruiker zijn beheerd. Gebruikersinhoud (oma-config.yaml, mcp.json en aangepaste skills zonder de marker `<!-- oma:generated -->`) wordt nooit verwijderd.

Om een projectinstallatie te verwijderen, laat je `--global` weg:

```bash
oma uninstall [--dry-run]
```


## OMA_HOME-override

Voor test- of stagingdoeleinden kun je alle oma-bewerkingen naar een willekeurige map omleiden:

```bash
OMA_HOME=/tmp/oma-test oma install --global
```


`OMA_HOME` heeft voorrang op `--global` en `process.cwd()`. Ook via `OMA_HOME` worden verboden systeempaden (`/etc`, `/usr`, `/bin`, `/boot`, `/sys`, `/proc`) geweigerd. Het pad moet absoluut en schrijfbaar zijn.

Voer voor een veilige smoke test `OMA_HOME` naar een lege, schrijfbare map en voer `oma install --global --yes` uit. De samenvatting hoort die map als installatieroot te noemen. Verwijder de map na de test en voer daarna de echte installatie uit met de bedoelde HOME.
