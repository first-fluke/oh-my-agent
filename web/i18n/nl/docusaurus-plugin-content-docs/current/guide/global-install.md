---
title: "Gids: Globale installatie"
sidebar_label: Globale installatie
description: Installeer oh-my-agent in de globale OMA-home (~/.oma/) in plaats van per project, zodat dezelfde skills, workflows en regels in elk project gelden. Deze gids behandelt oma install --global, oma update --global, oma uninstall --global, de OMA_HOME-override, detectie van dubbele installaties via oma doctor en aandachtspunten per platform (weigering onder sudo, CI, WSL, de cwd=HOME-guard).
---

## Wat is een globale installatie? {#what-is-a-global-install}

Standaard beperkt `oma install` alles tot de huidige projectmap: de SSOT staat in `<cwd>/.agents/` en vendorconfiguraties worden geschreven naar `<cwd>/.claude/`, `<cwd>/.codex/` enzovoort. Een **globale installatie** (`oma install --global`) installeert oh-my-agent in plaats daarvan in de globale OMA-home. Dezelfde skills, workflows en regels zijn dan beschikbaar in elk project dat je opent, zonder de installatie opnieuw uit te voeren. De SSOT staat in `~/.oma/.agents/`; de vendorconfiguraties blijven in `~/.claude/`, `~/.codex/` enzovoort.

## Project en globaal vergelijken {#project-vs-global-comparison}

| Aspect | Project (`oma install`) | Globaal (`oma install --global`, standaard-OMA-home) |
|--------|------------------------|--------------------------------|
| SSOT-locatie | `<cwd>/.agents/` | `~/.oma/.agents/` |
| Vendorconfiguraties | `<cwd>/.claude/`, `<cwd>/.codex/`, enz. | `~/.claude/`, `~/.codex/`, enz. |
| Lockbestand | `<cwd>/.agents/_install.lock` | `~/.oma/.agents/_install.lock` |
| Metadata | `<cwd>/.agents/skills/_version.json` (schemaVersion 2) | `~/.oma/.agents/skills/_version.json` (schemaVersion 2) |
| Gebruik | Aanpassing per project | Persoonlijke standaard voor alle projecten |
| Scope van oma-config.yaml | Projectspecifiek | Gebruikersbrede basis |

Beide modi kunnen naast elkaar bestaan. `oma doctor` rapporteert beide installaties als ze aanwezig zijn en meldt afwijkingen tussen beide.

Na een geslaagde globale installatie controleer je de bestanden onder de gebruikersmap en het opgeloste profiel:

```bash
oma doctor --global --json
oma doctor --global --profile
```

Het eerste commando rapporteert de gezondheid van de installatie en vendors; het profielcommando toont het modelplan dat agenten gebruiken. Laat `--global` (of `-g`) staan: zonder die optie inspecteren beide commando's het project in de huidige map, met de configuratie van dat project over de globale standaardwaarden heen gelegd.

## Eerste keer instellen {#first-run-setup}

De eerste keer dat je `oma install --global` op een machine uitvoert, toont de installer vóór het doorgaan een toelichting:

```text
This is your first global install of oh-my-agent.
Scope:
  - SSOT: ~/.oma/.agents/  (all skills, workflows, rules)
  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)
  - Lock file: ~/.oma/.agents/_install.lock
Existing per-project installs are not affected.

? Proceed with the global install? (y/N)
```

Bevestig om door te gaan. Daarna volgt de installatie dezelfde interactieve flow als een projectinstallatie (taal, modelpreset, projecttype en vendorselectie).

Na een geslaagde installatie toont de installer de volgende stappen:

```text
1. Open your project in your IDE
2. Type /orchestrate to spawn a multi-agent workflow
3. Run `oma doctor` if anything looks off
```

## Aandachtspunten {#caveats}

### Sudo geweigerd {#sudo-refused}

`oma install` (in elke modus) stopt direct als het onder `sudo` wordt uitgevoerd:

```text
Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.
```

Voer het commando als je normale gebruiker uit, zonder `sudo`.

### CI-omgevingen {#ci-environments}

Als je `oma install --global` in een CI-pipeline uitvoert, wijzigt het de HOME-map van de CI-runner. Dat is meestal ongewenst. Als je dit toch nodig hebt, bijvoorbeeld in een bootstrap-pipeline, geeft oma een waarschuwing:

```text
Running `oma install --global` in CI. This will modify the CI user's HOME. Proceeding because --yes / non-interactive mode is set.
```

De waarschuwing verschijnt wanneer `CI` gelijk is aan `true` of `1`. Die waarden maken de installatie al niet-interactief, zodat die met de standaardwaarden doorgaat en niet op invoer wacht. Buiten CI geeft `--yes` of `OMA_YES=1` hetzelfde niet-interactieve gedrag.

### WSL: Linux-HOME en Windows-USERPROFILE {#wsl-linux-home-vs-windows-userprofile}

Wanneer oma detecteert dat het binnen Windows Subsystem for Linux draait, toont het:

```text
WSL detected: your $HOME (/home/<user>) is the WSL Linux home and is distinct
from your Windows %USERPROFILE%. oma will install only to the WSL HOME.
If you want a Windows-side install, re-run this command from PowerShell.
```

Een WSL-installatie en een PowerShell-installatie zijn onafhankelijk. Wil je aan beide kanten globale dekking, voer `oma install --global` dan eenmaal vanuit WSL en eenmaal vanuit PowerShell uit.

### cwd = HOME-guard (projectmodus) {#cwd--home-guard-project-mode}

`oma link` en `oma update` (zonder `--global`) weigeren te draaien zolang je huidige map je HOME is. In projectmodus zou `<cwd>/.claude/settings.json` gelijk zijn aan `~/.claude/settings.json` — je globale Claude Code-instellingen — en zou de projectgebonden render de `$HOME/.claude/hooks/...`-commando's daarin herschrijven naar `$CLAUDE_PROJECT_DIR/...`, waardoor elke hook en de statusline stukgaan in projecten zonder eigen `.claude/hooks/`. Gebruik in plaats daarvan `oma link --global` / `oma update --global` voor de globale installatie, of ga eerst met `cd` naar een project.

Als je `oma install` zonder `--global` uitvoert terwijl je huidige map je HOME is, waarschuwt oma:

```text
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```

In niet-interactieve modus en in CI wordt dit automatisch afgebroken. Gebruik `--global` als je een installatie voor de hele gebruiker bedoelt.

## Een globale installatie opnieuw koppelen {#relinking-a-global-install}

`oma link` genereert vendorbestanden opnieuw vanuit de SSOT, zonder opnieuw te installeren. Net als bij `install` en `update` wordt de doelinstallatie uit de installatiecontext afgeleid. Geef dus `--global` door om `~/.oma/.agents/` te synchroniseren; dit werkt vanuit elke map, niet alleen vanuit `$HOME`:

```bash
# Regenerate every configured vendor in the global install
oma link --global

# Regenerate only opencode (e.g. after editing per-agent models in ~/.oma/.agents/oma-config.yaml)
oma link opencode --global
```

Zonder `--global` richt `oma link` zich op `<cwd>/.agents/`. Als je het vanuit een project uitvoert terwijl je installatie globaal is, meldt het dat daar geen `.agents/`-map is gevonden.

## Deïnstalleren {#uninstall}

```bash
# Preview what would be removed (never deletes anything)
oma uninstall --global --dry-run

# Remove the global install
oma uninstall --global
```

De deïnstallatieopdracht scheidt bestanden die door oma worden beheerd van bestanden die van de gebruiker zijn. Ze verwijdert alleen de skills die in `managed-skills.json` onder `.agents/state/` als door OMA beheerd zijn geregistreerd; de marker `<!-- oma:generated -->` herkent gegenereerde Copilot-promptbestanden. Gebruikersinhoud (`oma-config.yaml`, `mcp.json` en skills die niet als beheerd zijn geregistreerd) wordt nooit verwijderd. Voer eerst `--dry-run` uit om de exacte lijst te zien.

Om een projectinstallatie te verwijderen, laat je `--global` weg:

```bash
oma uninstall [--dry-run]
```

## OMA_HOME-override {#oma_home-override}

Stel `OMA_HOME` in op een absoluut pad om globale gegevens die van OMA zijn naar een andere locatie te verplaatsen:

```bash
OMA_HOME=/tmp/oma-test oma install --global
```

`OMA_HOME` is de root voor globale opslag, geen installatiedoel voor projecten. Met de waarde hierboven staan de globale definities in `/tmp/oma-test/.agents/`; projectinstallatie en link gebruiken nog steeds `<cwd>/.agents/`. Vendoreigen instellingen en authenticatie blijven buiten `OMA_HOME`. Globale OpenCode-integratiebestanden worden geschreven naar `~/.config/opencode/` onder de echte HOME-map.

`OMA_STATE_HOME` is een expliciete uitzondering voor de runtimeopslag van profielen, L1 en projecten: het moet absoluut zijn en bevat `u/`. Als het niet is ingesteld, volgen profielen `OMA_HOME`. `XDG_CONFIG_HOME` verplaatst de OMA-status niet meer en wijzigt het OpenCode-uitvoerpad van OMA niet. Geheimen in de OS-keychain, AgentMemory/Honcho-gegevens en caches van beheerde toolchains blijven bij hun bestaande eigenaars.

## Indeling van de globale opslag {#global-storage-layout}

Globale gegevens staan standaard onder `~/.oma`. Wanneer `OMA_HOME` is ingesteld, vervang je `~/.oma` door die waarde:

| Gegevens | Locatie |
|---|---|
| Globale definities, configuratie, installatiemetadata | `~/.oma/.agents/` |
| Schedulemanifest, vastgelegde omgeving, runlogs | `~/.oma/schedule/` |
| Globale back-ups | `~/.oma/backup/` |
| Serena-register, locks, logs | `~/.oma/state/serena/` |
| Index van vault-sleutelnamen | `~/.oma/state/vault-index.json` |
| Profielen, L1-sessies, projectruntime | `~/.oma/u/<profile>/` (`<OMA_STATE_HOME>/u/<profile>/` wanneer `OMA_STATE_HOME` is ingesteld) |

De globale configuratie levert standaardwaarden. De dichtstbijzijnde projectconfiguratie `.agents/oma-config.*` en
de bijbehorende lokale overlay overschrijven die; verschillende bovenliggende projectroots worden niet samengevoegd.
Zie [Configuratie laden](./oma-config-semantics.md#precedence-table) voor de volledige volgorde.
Een project dat `semantic_memory: none` kiest, houdt het geheugen uitgeschakeld, ook wanneer de
globale configuratie AgentMemory kiest.

## Bestaande installaties {#existing-installations}

De home-migratie kopieert gegevens die van OMA zijn uit `~/.agents/` en `~/.config/oma/`
naar de nieuwe indeling. De originelen blijven staan, behalve geverifieerde skillmappen van OMA
die naar discovery-links worden omgezet: hun oorspronkelijke inhoud wordt gearchiveerd onder
`~/.oma/backup/legacy-global-skills/` voordat het oude pad een link naar de gemigreerde
skill wordt. Bestaande doelbestanden worden niet overschreven; conflicten en gegevens die in gebruik zijn,
worden gemeld zodat je het opnieuw kunt proberen. Vault-indexen
voegen sleutelnamen samen, zonder geheime waarden uit de OS-keychain te verplaatsen. Skills
van de gebruiker en externe links blijven op hun plaats; authenticatiebestanden van vendors worden niet
verplaatst. Runtimelezers gebruiken alleen
de nieuwe paden.

```bash
oma home migrate --dry-run --json
oma home migrate --json
oma schedule sync
```

Globale installatie en update voeren de migratie uit voordat ze hun globale bestanden schrijven.
Projectinstallatie en -update gebruiken de verenigde roots zonder niet-gerelateerde globale
gegevens te migreren. De migratie wijzigt geen registraties van OS-jobs; voer `oma schedule sync`
uit na de migratie als er schedules bestaan. Actieve services of runners kunnen gegevens uitstellen;
rond die processen af en voer de migratie opnieuw uit.

## Zie ook {#see-also}

- [Configuratie laden](./oma-config-semantics.md): hoe globale, project- en lokale configuratiebestanden worden samengevoegd
- [Integratie in een bestaand project](./integration.md): installatie in projectmodus, verificatie en rollback
- [Geautomatiseerde updates](./automated-updates.md): `oma update` uitvoeren vanuit CI
