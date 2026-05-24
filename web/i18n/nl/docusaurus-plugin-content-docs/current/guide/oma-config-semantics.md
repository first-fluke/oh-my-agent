---
title: "Gids: Semantiek van oma-config.yaml"
description: Per-sleutel voorrangsregels voor oma-config.yaml wanneer zowel een project- als een globale installatie aanwezig is. Behandelt auto_update_cli (project wint van globaal), serena.mode, telemetry, language, model_preset, translation_voice, timezone en welke dotfiles agy / claude / codex / gemini / qwen elk oppikken.
---

## Overzicht

`oma-config.yaml` kan op twee plekken staan:

- **Project**: `<cwd>/.agents/oma-config.yaml`
- **Globaal**: `~/.agents/oma-config.yaml`

Wanneer beide bestanden bestaan, wint het projectbestand voor elke sleutel. Dit is bewust gekozen: per-project aanpassing is het meer specifieke signaal en mag niet worden overschreven door een gebruikersbrede standaard.

## Voorrangstabel

| Sleutel | Project wint? | Opmerkingen |
|-----|:---:|-------|
| `auto_update_cli` | Ja | De projectwaarde overschrijft de globale waarde. Geïmplementeerd in `resolveAutoUpdateCli` (`cli/commands/update/update.ts`). |
| `serena.mode` | Ja | Bepaalt de transportmodus van Serena MCP (bijv. `stdio`, `sse`). |
| `telemetry` | Ja | Opt-in voor vendor-telemetrie (`true` / `false`). |
| `language` | Ja | Antwoordtaal voor agent-uitvoer (bijv. `en`, `ko`, `ja`). |
| `model_preset` | Ja | Preset voor modelselectie (bijv. `claude`, `mixed`, `codex`). |
| `translation_voice` | Ja | Toon van de vertaler: `formal`, `balanced`, `interpreter`. |
| `timezone` | Ja | Tijdzone-identifier (bijv. `Asia/Seoul`, `America/New_York`). |

"Project wint" betekent: als de sleutel in het projectbestand staat, wordt die waarde gebruikt, ongeacht wat het globale bestand zegt. Als de sleutel ontbreekt in het projectbestand, wordt de waarde uit het globale bestand gebruikt. Ontbreekt hij in beide, dan geldt de standaardwaarde.

## Standaardwaarden

| Sleutel | Standaard | Wanneer toegepast |
|-----|---------|--------------|
| `auto_update_cli` | `true` | Beide bestanden ontbreken of sleutel ontbreekt |
| `serena.mode` | `stdio` | Beide bestanden ontbreken of sleutel ontbreekt |
| `telemetry` | `false` | Beide bestanden ontbreken of sleutel ontbreekt |
| `language` | `en` | Beide bestanden ontbreken of sleutel ontbreekt |
| `model_preset` | `claude` | Beide bestanden ontbreken of sleutel ontbreekt |
| `translation_voice` | `balanced` | Beide bestanden ontbreken of sleutel ontbreekt |
| `timezone` | Systeemtijdzone | Beide bestanden ontbreken of sleutel ontbreekt |

## Achtergrond van de leesvolgorde

De projectconfiguratie wordt als eerste gelezen omdat zij de meer specifieke context vertegenwoordigt — de repository waaraan een ontwikkelaar actief werkt. Een team kan `language: ko` of `model_preset: mixed` opleggen voor hun project, en die keuzes mogen niet stilzwijgend worden overschreven door de globale `oma-config.yaml` van een individu.

Het globale bestand biedt een gebruikersbrede baseline. Sleutels die het project niet instelt, vallen terug op de globale waarde, die op haar beurt terugvalt op de hardgecodeerde standaard.

## Opmerkingen

- `language` in `oma-config.yaml` bepaalt de antwoordtaal van de agent. Het wordt **niet** gebruikt om waarschuwingsteksten bij installatie/update te bepalen — daarvoor wordt de systeemlocale (`$LANG`) gebruikt, omdat `oma-config.yaml` op installatietijd nog niet is geladen.
- De voorrang van `auto_update_cli` is expliciet geïmplementeerd in het update-commando. Wanneer zowel een projectinstallatie als een globale installatie aanwezig is, wordt de project-`oma-config.yaml` als eerste geraadpleegd.
- `oma-config.yaml` direct bewerken is veilig. `oma install` en `oma update` gebruiken veldvervanging op regex-niveau en behouden door de gebruiker bewerkte sleutels die zij niet beheren (bijv. eigen `agents:`-overrides, `session.quota_cap`).
