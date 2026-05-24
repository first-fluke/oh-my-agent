---
title: "Gids: Globale installatie"
description: Installeer oh-my-agent in je gebruikers-HOME (~/.agents/) in plaats van per project, zodat dezelfde skills, workflows en regels in elk project gelden. Behandelt oma install --global, oma update --global, oma uninstall --global, OMA_HOME-override, detectie van dubbele installaties via oma doctor en platformspecifieke aandachtspunten (sudo-weigering, CI, WSL, cwd=HOME-bescherming).
---

## Wat is een globale installatie?

Standaard beperkt `oma install` alles tot de huidige projectmap: de SSOT staat in `<cwd>/.agents/` en vendor-configuraties worden geschreven naar `<cwd>/.claude/`, `<cwd>/.codex/`, enzovoort. Een **globale installatie** (`oma install --global`) installeert oh-my-agent in plaats daarvan in je gebruikers-HOME, zodat dezelfde skills, workflows en regels beschikbaar zijn in elk project dat je opent, zonder de installatiestap te herhalen. De SSOT staat in `~/.agents/` en vendor-configuraties in `~/.claude/`, `~/.codex/`, enzovoort.

## Vergelijking project vs. globaal

| Aspect | Project (`oma install`) | Globaal (`oma install --global`) |
|--------|------------------------|--------------------------------|
| SSOT-locatie | `<cwd>/.agents/` | `~/.agents/` |
| Vendor-configuraties | `<cwd>/.claude/`, `<cwd>/.codex/`, enz. | `~/.claude/`, `~/.codex/`, enz. |
| Lock-bestand | `<cwd>/.agents/_install.lock` | `~/.agents/_install.lock` |
| Metadata | `<cwd>/.agents/_version.json (schemaVersion=2)` | `~/.agents/_version.json (schemaVersion=2)` |
| Toepassing | Per-project aanpassing | Persoonlijke standaard voor alle projecten |
| `oma-config.yaml`-scope | Projectspecifiek | Gebruikersbrede baseline |

Beide modi kunnen naast elkaar bestaan. `oma doctor` rapporteert beide installaties indien aanwezig en signaleert afwijkingen ertussen.

## Eerste keer instellen

De eerste keer dat je `oma install --global` op een machine draait, toont de installer een toelichting voordat hij doorgaat:

```
This is your first global install of oh-my-agent.
Scope:
  - SSOT: ~/.agents/  (all skills, workflows, rules)
  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)
  - Lock file: ~/.agents/_install.lock
Existing per-project installs are not affected.

? Proceed with the global install? (y/N)
```

Bevestig om door te gaan. De installatie volgt vervolgens dezelfde interactieve flow als een projectinstallatie (taal, model preset, projecttype, vendor-selectie).

Na een succesvolle installatie worden de volgende stappen getoond:

```
1. Open your project in your IDE
2. Type /orchestrate to spawn a multi-agent workflow
3. Run `oma doctor` if anything looks off
```

## Aandachtspunten

### Sudo geweigerd

`oma install` (in elke modus) stopt direct wanneer het onder `sudo` draait:

```
Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.
```

Draai het commando als je normale gebruiker zonder `sudo`.

### CI-omgevingen

`oma install --global` draaien binnen een CI-pipeline wijzigt de HOME-map van de CI-runner. Dat is meestal ongewenst. Heb je het toch nodig (bijvoorbeeld een bootstrapping-pipeline), dan geeft oma een waarschuwing:

```
Running `oma install --global` in CI. This will modify the CI user's HOME.
```

De installatie gaat door als `--yes` / `OMA_YES=1` is ingesteld. Zonder die optie wordt de waarschuwing getoond en gaat de installatie interactief verder (wat in de meeste CI-setups blijft hangen).

### WSL: Linux-HOME vs. Windows-USERPROFILE

Wanneer oma detecteert dat het binnen Windows Subsystem for Linux draait, geeft het het volgende weer:

```
WSL detected: your $HOME (/home/<user>) is the WSL Linux home and is distinct
from your Windows %USERPROFILE%. oma will install only to the WSL HOME.
If you want a Windows-side install, re-run this command from PowerShell.
```

Een WSL-installatie en een PowerShell-installatie staan los van elkaar. Wil je globale dekking aan beide zijden, draai dan `oma install --global` één keer vanuit WSL en één keer vanuit PowerShell.

### cwd = HOME-waarschuwing (projectmodus)

Als je `oma install` (zonder `--global`) draait terwijl je huidige map je HOME is, waarschuwt oma je:

```
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```

In niet-interactieve / CI-modus wordt dit automatisch afgebroken. Gebruik `--global` als je een gebruikersbrede installatie wilt.

## Deïnstallatie

```bash
# Preview what would be removed (never deletes anything)
oma uninstall --global --dry-run

# Remove the global install
oma uninstall --global
```

Het deïnstallatiecommando scheidt door oma beheerde bestanden van door de gebruiker beheerde bestanden. Door de gebruiker beheerde inhoud (`oma-config.yaml`, `mcp.json`, eigen skills zonder de marker `<!-- oma:generated -->`) wordt nooit verwijderd.

Om een projectinstallatie te deïnstalleren, laat je `--global` weg:

```bash
oma uninstall [--dry-run]
```

## OMA_HOME-override

Voor test- of stagingdoeleinden kun je alle oma-operaties omleiden naar een willekeurige map:

```bash
OMA_HOME=/tmp/oma-test oma install --global
```

`OMA_HOME` heeft voorrang boven `--global` en `process.cwd()`. Verboden systeempaden (`/etc`, `/usr`, `/bin`, `/boot`, `/sys`, `/proc`) worden ook via `OMA_HOME` geweigerd. Het pad moet absoluut en schrijfbaar zijn.
