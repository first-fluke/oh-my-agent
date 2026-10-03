---
title: "Gids: Semantiek van oma-config.yaml"
sidebar_label: Configuratielagen
description: Hoe OMA configuratielagen voor CUE en YAML kiest, lokale overlays toepast en de beperkte fallbacks voor de installatiecontext afhandelt. Zie de configuratiereferentie voor ondersteunde sleutels en standaardwaarden.
---

## Overzicht

OMA kiest de configuratie uit de dichtstbijzijnde `.agents/`-map die het vindt terwijl het vanaf de huidige werkmap naar boven loopt:

- **Gedeeld**: `.agents/oma-config.cue`, of `.agents/oma-config.yaml` als CUE ontbreekt of niet kan worden geëvalueerd.
- **Lokaal**: `.agents/oma-config.local.cue` of `.agents/oma-config.local.yaml` (één bestand dat boven op het gedeelde bestand wordt gelegd; houd dit bestand privé).

Bij gewone runtime-lookups voegt OMA een projectbestand niet samen met `~/.agents/oma-config.*`. Een globale installatie leest het homebestand omdat HOME de installatieroot is; een projectopdracht leest de dichtstbijzijnde projectlaag. `auto_update_cli` is de bewuste uitzondering: de updatecontrole kijkt eerst naar de projectconfiguratie, daarna naar de homeconfiguratie en valt vervolgens terug op true. Zie de [configuratiereferentie](/docs/guide/configuration-reference) voor het volledige model.

## Voorrangstabel

| Sleutel | Effectieve regel | Opmerkingen |
|-----|:---:|-------|
| `OMA_MODEL_PRESET` | Hoogste | Een niet-lege omgevingswaarde vervangt `model_preset` voor dat proces. |
| Lokaal bestand | Legt boven op gedeeld | Gewone maps worden recursief samengevoegd; arrays, scalars en `null` vervangen de gedeelde waarde. Beide lokale bestandsformaten mogen niet tegelijk bestaan. |
| Gedeelde CUE | Voorkeur | Als CUE ontbreekt of faalt, probeert de loader het gedeelde YAML-bestand. Een fout in lokale CUE is fataal. |
| Gedeelde YAML | Fallback | Wordt gebruikt wanneer geen bruikbaar gedeeld CUE-bestand is geselecteerd. |
| `auto_update_cli` | Eerst project, dan home, dan `true` | Deze update-specifieke fallback is geïmplementeerd in `resolveAutoUpdateCli`; dit is geen algemene globale laag. |

Zet voor een projectlokale override alleen de gewijzigde leaves in het lokale bestand. Zo houd je bijvoorbeeld een lokale modelkeuze buiten het gedeelde bestand:

```yaml
# .agents/oma-config.local.yaml
model_preset: claude
agents:
  backend:
    model: anthropic/claude-sonnet-4-6
```


Voer de opdracht vanuit het project uit, zodat de dichtstbijzijnde `.agents/`-map wordt geselecteerd. Een ongeldig lokaal bestand geeft een duidelijke fout; herstel of verwijder het voordat je opnieuw probeert.

## Standaardwaarden

| Sleutel | Standaard | Wanneer toegepast |
|-----|---------|--------------|
| `auto_update_cli` | `true` | Beide bestanden ontbreken of de sleutel ontbreekt |
| `serena.mode` | `bridge` | Beide bestanden ontbreken of de sleutel ontbreekt |
| `serena.auto_update` | `true` | Beide bestanden ontbreken of de sleutel ontbreekt |
| `telemetry` | `false` | Beide bestanden ontbreken of de sleutel ontbreekt |
| `language` | `en` | Beide bestanden ontbreken of de sleutel ontbreekt |
| `model_preset` | Vereist | De meegeleverde projectsjabloon gebruikt `auto`; het schema vereist een niet-lege waarde. |
| `translation_voice` | `balanced` | Beide bestanden ontbreken of de sleutel ontbreekt |
| `timezone` | Systeemtijdzone | Beide bestanden ontbreken of de sleutel ontbreekt |

## Reden voor de leesvolgorde

De regel met de dichtstbijzijnde laag houdt de configuratie van een project zelfstandig. Wil je een gebruikersbrede basis, installeer dan globaal en bewerk `~/.agents/oma-config.yaml`; projectinstallaties kunnen nog steeds hun eigen dichtstbijzijnde laag definiëren.

## Opmerkingen

- `language` in `oma-config.yaml` bepaalt de antwoordtaal van agents. Deze sleutel bepaalt **niet** de waarschuwingsteksten bij installatie en updates: die gebruiken de systeemlocale (`$LANG`), omdat `oma-config.yaml` bij het installeren nog niet is geladen.
- De voorrang van `auto_update_cli` is expliciet geïmplementeerd in de updateopdracht. Als zowel een projectinstallatie als een globale installatie aanwezig is, wordt eerst de projectwaarde geraadpleegd en daarna de homewaarde.
- `telemetry` (standaard `false`) wordt vertaald naar de eigen opt-out van elke vendor. `oma install`, `oma update` en `oma link` schrijven die waarden als volgt: Claude `DISABLE_TELEMETRY` + `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY`, Gemini/Qwen `privacy.usageStatisticsEnabled`, Codex `analytics.enabled` + `feedback.enabled`, Grok `[features] telemetry` en Antigravity (agy) `enableTelemetry` in `~/.gemini/antigravity-cli/settings.json`. Met `telemetry: true` meld je je opnieuw aan door oma’s opt-out voor die vendor te verwijderen.
- `diagram` (engines `auto` / `archify` / `mermaid`, `explain_sidecar`, `archify.managed|channel|check_interval_min|path|quality|open`) is een sparse skill-override-sectie zoals `video` en `image`; zie [Diagram Engine](/docs/guide/diagram-engine).
- `video.hyperframes.check_interval_min` beperkt hoe vaak wordt gecontroleerd op de nieuwste versies van de HyperFrames-toolchain en heygen-com/hyperframes per run (`oma video compose`, `oma update`).
- `market` (`managed|channel|check_interval_min|path|python|save_dir`) configureert de altijd actuele `last30days`-engine achter `oma market`; zie [Market Research](/docs/guide/market-research).
- Het getypeerde runtime-schema dekt `providers`, `free`, `agents`, `models`, `custom_presets`, `vendors`, `session`, `docs` en de sparse skillsecties. Meegeleverde sjablonen bevatten ook blokken die door consumers worden beheerd, zoals `scm`, `memory`, `serena_reaper` en `mcp`; hun consumers beheren de geneste sleutels. Leid geen sleutel af uit deze lijst: gebruik de [configuratiereferentie](/docs/guide/configuration-reference) en de featuregids voor dat blok.
- `oma-config.yaml` rechtstreeks bewerken is veilig. `oma install` en `oma update` gebruiken veldvervanging op regexniveau en behouden door de gebruiker bewerkte sleutels die ze niet beheren, zoals aangepaste `agents:`-overrides en `session.quota_cap`.
- `oma update` voegt bovendien top-level sleutels toe die het meegeleverde sjabloon definieert maar die in jouw bestand ontbreken, met de standaardwaarden uit het sjabloon, onder een marker `# Added by oma update`. Sleutels die al bestaan worden nooit aangepast: bestaande inhoud blijft byte-identiek. Sleutels die je bewust hebt verwijderd, verschijnen opnieuw met de standaardwaarde uit het sjabloon. Stel de waarde expliciet in als je daarvan wilt afwijken.
