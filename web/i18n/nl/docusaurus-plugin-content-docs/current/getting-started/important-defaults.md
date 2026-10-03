---
title: Belangrijke standaardinstellingen
description: De standaardinstellingen van oh-my-agent die routing, modelselectie, providers, updates, telemetrie, browser-MCP, Serena-transport en workflowherstel beïnvloeden.
---

# Belangrijke standaardinstellingen

De standaardinstellingen maken een eerste project bruikbaar en houden configuratie van de gebruiker stabiel. Ze worden tijdens runtime bepaald, waardoor een ontbrekende sleutel anders kan werken dan een expliciete lege waarde. Begin hier als de harness werkt, maar zich anders gedraagt dan je verwacht.

## Standaardinstellingen die de eerste run beïnvloeden

| Onderdeel | Standaard | Gevolg | Overschrijven |
|---|---|---|---|
| Antwoordtaal | `en` | Agent- en workflowantwoorden gebruiken Engels tenzij de projectconfiguratie een andere ondersteunde taal kiest. Een expliciete taalopdracht van de gebruiker of sessie kan de projectstandaard nog overschrijven wanneer de host of workflow dat ondersteunt. | `language` in `.agents/oma-config.yaml` of `.cue` |
| Modelrouting | `auto` | De native agentconfiguratie van de huidige runtime wordt gebruikt. Onbekende runtimes vallen terug op `default_cli` als dat is ingesteld. | `model_preset`, `default_cli` of `agents.<id>` |
| Code-intelligence | `serena` | Een nieuwe installatie probeert Serena te installeren en de MCP-configuratie ervan te koppelen. | `providers.code_intelligence: gortex` of `serena` |
| Code-search guard | `block` | Zolang een code-intelligenceprovider is geconfigureerd, weigert een PreToolUse-hook de native `Grep`/`Glob` en recursief zoeken via de shell (`rg`, `grep -r`, `find -name`) en verwijst die de agent naar de tools van de provider. Zoekopdrachten die beperkt blijven tot bevestigde uitsluitingen of paden buiten het project zijn toegestaan. De hook vermeldt geen bypass voor de broncode van het project. | `providers.code_intelligence_guard: off` |
| Semantisch geheugen | `agentmemory` | Agent Memory wordt geselecteerd voor semantisch geheugen wanneer het beschikbaar is. | `providers.semantic_memory: honcho` of `none` |
| Web search | `native` | Search gebruikt het native webkanaal van de runtime tenzij je een provider selecteert. | `providers.web` |
| Documentatieprovider | `context7` | Documentatie wordt opgezocht via de Context7-provider wanneer een skill daar om vraagt. | `providers.docs` |
| Telemetrie | uitgeschakeld | OMA schrijft opt-out-instellingen voor leveranciers tijdens het linken. | `telemetry: true` |
| Automatische CLI-update | ingeschakeld | De CLI controleert op updates tenzij je dit uitschakelt. | `auto_update_cli: false` |
| Datumnotatie | `ISO` | Datums gebruiken ISO-notatie als het project geen formaat instelt. | `date_format: US` of `EU` |
| Tijdzone | systeemtijdzone | Geplande en gerapporteerde tijden volgen de host wanneer `timezone` ontbreekt. | `timezone: Australia/Sydney` (of een andere IANA-naam) |
| Serena-transport | `bridge` | Sessies delen één Serena-server per project; een niet-beschikbare bridge valt terug op stdio per sessie. | `serena.mode: stdio` |
| Automatische Serena-update | ingeschakeld | `oma update` werkt de lokale Serena-tool indien mogelijk bij. | `serena.auto_update: false` |
| Browser DevTools MCP | niet ingesteld | Bestaande browservermeldingen blijven behouden; een nieuwe interactieve installatie biedt `aside` aan. | `mcp.devtools_browsers: [aside]`, `[chrome]`, `[firefox]` of `[]` |
| Serena Reaper | gepland pad uitgeschakeld | `serena_reaper.enabled: false` houdt periodiek opruimen uitgeschakeld. Interactief uitvoeren met `oma serena reap` blijft mogelijk. | `serena_reaper.enabled: true` plus `oma serena reaper enable` |

De providernamen en standaardwaarden komen uit de runtime-loaders en installerprompts. Het configuratiebestand dat de installer maakt, bevat opmerkingen over de beschikbare secties; gebruik die opmerkingen als schema voor de betreffende versie.

## Voorrang van configuratie

OMA zoekt vanaf de huidige werkmap omhoog naar de dichtstbijzijnde `.agents/`-map. Het leest `oma-config.cue` wanneer die aanwezig is en valt terug op `oma-config.yaml` als de gedeelde CUE-evaluatie mislukt. Een projectlokale overlay, `oma-config.local.cue` of `oma-config.local.yaml`, wordt erbovenop samengevoegd; houd slechts één lokale overlay aan. `OMA_MODEL_PRESET` kan `model_preset` voor één proces overschrijven. Door een ongeldige lokale configuratie stopt het laden; OMA kiest dan niet stilzwijgend een andere waarde.

Voor modelrouting gelden vóór de volgorde van vaste presets twee bijzondere gevallen:

- Met `model_preset: auto` wordt de native agent/modelconfiguratie van de huidige runtime gebruikt. Expliciete overrides via `agents.<id>` hebben nog steeds voorrang; een onbekende runtime kan `default_cli` gebruiken.
- Met `model_preset: free` gebruiken child-spawns de lokale FreeLLMAPI-gateway. `free.model` kiest het gatewaymodel en vervangt modelpinnen per agent; als de waarde ontbreekt, wordt `FREELLM_MODEL` of de providerfallback `auto` gebruikt.

Voor een vaste of aangepaste preset is de effectieve volgorde:

1. Expliciete override via `agents.<id>`.
2. De overeenkomende invoer van `model_preset`, ingebouwd of uit `custom_presets`.
3. De `orchestrator`-invoer van de preset wanneer een rol geen eigen invoer heeft.
4. `default_cli` als fallback voor de leverancier wanneer de eerdere niveaus geen plan opleveren.

De `free`-preset levert standaardwaarden voor alle drie de providerinstellingen: `base_url` is `http://127.0.0.1:31415/v1`, `api_key_env` is `FREELLM_API_KEY` (`FREELLMAPI_API_KEY` wordt ook als compatibiliteitsalias geaccepteerd) en `model` is `auto`. Een bruikbare API-sleutel in de geselecteerde omgevingsvariabele blijft vereist; er is geen fallback naar een leverancier. Stel deze waarden in `oma-config.local.yaml` in als ze lokaal op de machine moeten blijven, of gebruik `FREELLM_BASE_URL` en `FREELLM_MODEL` als procesoverschrijvingen.

## Standaardinstellingen met onverwachte gevolgen

Als `mcp.devtools_browsers` ontbreekt, betekent dat: “huidige browservermeldingen ongemoeid laten”. Een expliciete lege lijst verwijdert browservermeldingen tijdens de reconciliatie. Browser-MCP-processen draaien per agentsessie; schakel ze dus alleen in wanneer een taak een browser bestuurt.

De standaardmodus `bridge` van Serena beperkt het aantal dubbele language-serverprocessen wanneer meerdere agents in één project werken. `stdio` is de herstelkeuze wanneer een lokale bridge niet kan starten of wanneer strikte procesisolatie nodig is. Serena herstelt zijn language-server-kindprocessen bij de volgende toolaanroep vanzelf; de memory-reaper staat daar los van en hoeft voor normaal gebruik niet te worden ingeschakeld.

Telemetrie staat standaard op opt-out. Met `telemetry: true` verwijdert OMA bij de volgende link of update de opt-outvermeldingen van leveranciers. Daardoor kunnen vendorfeatures die telemetrie nodig hebben opnieuw worden ingeschakeld. Deze instelling regelt wijzigingen in vendorintegraties; ze verandert niet de sessiekostenbestanden die OMA voor zijn eigen administratie schrijft.

## Herstelpaden

| Symptoom | Controleer eerst | Herstel |
|---|---|---|
| Vendorbestanden zijn verouderd | `oma doctor` en `oma link --dry-run` | Voer na het bewerken van `.agents/` `oma link <vendor>` uit; behoud de SSOT als bron. |
| Een model wordt niet geaccepteerd | `oma doctor --profile` | Schakel over naar `auto`, gebruik een ingebouwde preset of definieer een modelslug onder `models:`. |
| Serena-tools lopen een time-out | `oma doctor` en de providersectie | Probeer `serena.mode: stdio`; als geheugendruk het probleem is, bekijk je eerst `oma serena reap --dry-run`. |
| Een persistente workflow stopt niet | `.agents/state/*-state.json` | Zeg `workflow done`; inspecteer het statebestand alleen als de workflow niet heeft opgeruimd. |
| Een geplande reaper doet niets | `oma doctor`-sectie Serena Reaper | Stel `serena_reaper.enabled: true` in en voer daarna `oma serena reaper enable` uit. |
| Lokale configuratie verhindert het opstarten | foutpad van `oma doctor` | Herstel of verwijder de lokale overlay; maak niet zowel een `.cue`- als een `.yaml`-overlay aan. |

Ga verder met [Installatie](./installation.md), [Modellen per agent](../guide/per-agent-models.md) of [Semantiek van oma-config](../guide/oma-config-semantics.md).
