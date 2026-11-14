---
title: Een setup kiezen
description: Laad één OMA-skill voor een taak, kies een domeinpreset of installeer de Claude Code-plugin met de runtime-afhankelijkheden.
---

# Een setup kiezen

Kies het startpunt voor de taak die je wilt afronden.

| Behoefte | Startpunt | Wat het instelt |
|---|---|---|
| Eén gerichte taak in je huidige agent | [Eén skill laden](#load-one-skill) | Instructies en ondersteunende bestanden in een tijdelijke map |
| Projecthooks, specialistische agenten en workflows | [Een skillpreset installeren](#install-a-skill-preset) | OMA-runtime-integratie met de geselecteerde skills |
| Installatie via de Claude Code-marketplace | [De plugin installeren](#install-the-claude-code-plugin) | De OMA-plugin en projectbootstrap |
| Pakketinstallatie voor Copilot CLI, Kiro, Qwen Code, Hermes of Codex | [Agent Plugins-pakket](../guide/vendor-capabilities.md#agent-plugins-package) | Skills en MCP-servers voor elke host; Copilot krijgt ook agenten, commando's, regels en de bootstrap-hook |

## Eén skill laden {#load-one-skill}

Vraag je coding-agent het commando voor je taak uit te voeren en de teruggegeven
instructies te lezen. `skills use` print de instructies en het pad naar de
ondersteuningsmap. Het start geen andere agent en voert de OMA-installer niet uit.

| Taak | Commando | Eerste verzoek |
|---|---|---|
| Ontwerp van een admin-UI of een review van een bestaande UI | `bunx skills use first-fluke/oh-my-agent@oma-design` | Review our admin page's hierarchy, table density, and empty states. |
| Een reproduceerbare bug | `bunx skills use first-fluke/oh-my-agent@oma-debug` | Reproduce this failure, fix its cause, and run the relevant check. |
| Een architectuurbeslissing | `bunx skills use first-fluke/oh-my-agent@oma-architecture` | Compare keeping this job in the API with moving it to a worker. |

De geselecteerde map bevat de gedeelde instructieverwijzingen. Afhankelijkheden
buiten die map blijven expliciet: een andere domeinskill, projectregels,
CLI-bewerkingen, browsertools of een externe engine kunnen nog nodig zijn. Lees
de afhankelijkheden van de geselecteerde skill voor de gevraagde bewerking.
Installeer de runtime wanneer de taak de hooks of beheerde uitvoering nodig heeft.

Voor designwerk kiest `oma-design` Interface Design voor richting van admin- en
productinterfaces, Taste voor overige web-artdirection, en Impeccable voor
kritiek, audit en polish van een bestaande UI. De stack van het project en
`DESIGN.md` blijven de implementatie- en designcontracten.

## Een skillpreset installeren {#install-a-skill-preset}

Installeer de CLI één keer en selecteer daarna de skills van het project:

```bash
bun install --global oh-my-agent
oma install --preset frontend --yes
oma doctor
```

Een bestaande CLI-installatie kan bij het tweede commando beginnen. Gebruik
`oma install --help` voor presetnamen en provideropties. De
[bootstrap-installer](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#method-1-one-liner-install)
bereidt ook de runtime-afhankelijkheden voor vóór de interactieve setup.

| Preset | Eerste taak | Voorbeelden van passende workflows |
|---|---|---|
| `frontend` | Plan een instellingenpagina en implementeer daarna het formulier | `/plan`, `/design`, `/review`, `/debug` |
| `backend` | Plan een geauthenticeerd API-endpoint | `/plan`, `/architecture`, `/review`, `/debug` |
| `research` | Zoek papers en vergelijk hun evidence | Vraag om een literatuurzoekopdracht met bronvermelding |
| `all` | Coördineer een feature over UI, API en data | `/orchestrate`, `/work`, `/ultrawork`, `/ralph` |

De [benoemde presets](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#presets) worden door `--preset` geaccepteerd.
Een onbekende naam, een lege waarde of `custom` wordt vóór de installatie geweigerd.
Om afzonderlijke skills te kiezen voer je `oma install` interactief uit en kies je Custom.
Zonder `--preset` kiest een onbeheerde `--yes`-/CI-setup `all`.

De frontend-preset selecteert acht skills. Presets selecteren skillinhoud; de
installer zet nog steeds gedeelde bestanden, alle workflow- en agentdefinities,
hooks en providers op. Sommige workflows hebben skills buiten een domeinpreset
nodig. Controleer de
[workflowafhankelijkheden](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#workflows-that-need-skills-outside-a-preset)
voordat je ze gebruikt, of kies `all` voor elke workflow. Een kleinere preset op
een bestaande installatie verwijdert andere skills niet.

Providerkeuzes staan los van presets. Voeg bijvoorbeeld
`--semantic-memory none` toe wanneer het project geen semantische-geheugenservice
nodig heeft. Zie [installatie-effecten](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#what-the-installer-also-does-by-default)
voor de andere bestanden en integraties die de runtime configureert.

De installatiesamenvatting noemt de geselecteerde skills en controleert de
aanwezige skillmanifesten, inclusief behouden skills. Statische verwijzingen van
workflows en agenten, ook voorwaardelijke takken, worden als genoemde
skillmanifesten gerapporteerd. Voer `oma doctor` uit om ontbrekende of onleesbare
invoeren te herstellen die je taak nodig heeft. Deze controles verifiëren geen
resource-inhoud, tools, providers, credentials of uitvoering.

## De Claude Code-plugin installeren {#install-the-claude-code-plugin}

Voer deze commando's uit in Claude Code:

```text
/plugin marketplace add first-fluke/oh-my-agent
/plugin install oma@oh-my-agent
```

Kies `oma-frontend@oh-my-agent`, `oma-security@oh-my-agent` of
`oma-research@oh-my-agent` voor een domeinplugin. De volledige invoer `oma` houdt
de complete skillselectie. Domeininvoeren starten hun bijpassende preset.

De session-start-hook van de plugin voorziet de CLI wanneer dat nodig is en voert
`oma install --yes` uit voor het huidige project. Dit pad doet de runtime-setup.
De succesreceipt hoort bij dat project, en de eventhooks van de plugin gebruiken
de geïnstalleerde CLI. Pluginhooks vereisen Bash, ook op Windows. Bootstrap heeft
een time-out van 600 seconden; fouten melden handmatige setupstappen en bewaren
het projectlog op `.agents/state/plugin-bootstrap.last-error.log`. Een receipt
wordt alleen hergebruikt nadat controles op CLI-versie, projectconfiguratie en
hooks slagen. Herstart de sessie nadat bootstrap voltooiing meldt.

Gebruik voor de configuratie- en afhankelijkheidskeuzes tijdens de setup
rechtstreeks `oma install`. De onbeheerde bootstrap van de volledige plugin
gebruikt de skillpreset `all`; elke domeinplugin geeft de geselecteerde preset
door. Een kleinere preset behoudt andere skills die al in het project staan.

## Het resultaat controleren {#check-the-result}

Controleer bij een geladen skill of de agent de gekozen instructies heeft gelezen
en rapporteer de werkelijke controles van de taak. Voer bij een runtime-installatie
`oma doctor` uit en probeer het eerste verzoek voor je preset. Waarschuwingen van
doctor over providers zijn van belang wanneer de gevraagde taak die provider gebruikt.
