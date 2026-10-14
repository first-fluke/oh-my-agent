---
title: Waarom oh-my-agent
description: Kies oh-my-agent wanneer je repository-eigen agent-skills, workflows, dispatch naar meerdere vendors en expliciete verificatie nodig hebt.
---

# Waarom oh-my-agent

oh-my-agent voegt een repository-eigen laag toe rond de agent-CLI's die je team al gebruikt. De directory `.agents/` bevat [skills](./glossary.md#skill), [workflows](./glossary.md#workflow), [agentdefinities](./glossary.md#agent-definition), regels en modelconfiguratie. Vanuit die [bron van waarheid](./glossary.md#ssot) worden bestanden voor vendors gegenereerd, zodat je het gedrag samen met het project kunt reviewen en wijzigen.

## Kies het wanneer de repository een coördinatielaag nodig heeft

OMA past goed wanneer je een of meer van deze dingen nodig hebt:

- **Meerdere agenthosts of vendors.** `model_preset: auto` gebruikt de native configuratie van de huidige runtime. Vaste en aangepaste presets kunnen rollen naar andere vendors routeren; `oma agent spawn` verzorgt dispatch die niet native is.
- **Een herhaalbare teamworkflow.** `/work` behandelt één afgebakende taak, `/orchestrate` coördineert gedelegeerd werk, `/ultrawork` voert parallel werk met reviewstappen uit en `/ralph` herhaalt een taak met een expliciete judge-fase.
- **Instructies die bij de repository horen.** Skills, workflows, regels en agentdefinities staan naast de code. `oma link` projecteert de geselecteerde bestanden naar indelingen van ondersteunde vendors.
- **Mechanische controles en blijvende resultaten.** Agentruns kunnen gestructureerde status- en resultaatreceipts schrijven, terwijl `oma verify agent <agent-type>` en `oma docs verify` expliciete controles bieden.

Als een project één host gebruikt en geen gedeelde skills, workflows of vendorroutering nodig heeft, rechtvaardigen de extra `.agents/`-bestanden en CLI-commando's de setup mogelijk niet. OMA is een coördinatielaag; de modelkeuze, editor en projectspecifieke acceptatiecriteria van de host blijven leidend.

## Verificatie is een commando dat je selecteert

Voer `oma verify agent <agent-type> --workspace <path>` uit wanneer je de controles voor een backend-, frontend-, mobile-, QA-, debug- of planningsrol wilt uitvoeren. De verifier combineert statische inspecties met geconfigureerde commando's, zoals tests, typechecks, SQL-controles of `flutter analyze`; zie [`cli/commands/verify/report.ts`](https://github.com/first-fluke/oh-my-agent/blob/main/cli/commands/verify/report.ts). Het rapport toont het resultaat van elke controle. Als deze controles slagen, is daarmee nog niet vastgesteld dat een feature aan de product- of domeinvereisten voldoet; review daarom ook de acceptatiecriteria van de taak.

`/ralph` voegt een afzonderlijke [judge](./glossary.md#judge)-fase toe wanneer je die workflow selecteert. De workflow controleert de vastgelegde criteria opnieuw in elke iteratie en registreert de workflowartefacten; dit is geen gate die bij elke gewone prompt draait. Het laden van skills start evenmin elke workflow of elk verificatiecommando.

## Dispatch blijft zichtbaar

`oma doctor --profile` toont de opgeloste vendor en het model voor elke dispatchrol. `oma agent spawn <agent-id> <prompt> <session-id>` is de expliciete CLI-route wanneer een rol niet door de huidige host wordt afgehandeld. De regels voor modelresolutie en vendorspecifiek gedrag staan in [Belangrijke standaardinstellingen](./important-defaults.md) en [Modellen per agent](../guide/per-agent-models.md).

Hooks kunnen alleen een workflow activeren wanneer de integratie voor de betreffende host is ingeschakeld. Native skill-routing wordt door de host uitgevoerd, terwijl workflow-routing de geselecteerde workflow of hook volgt; een gewone prompt garandeert niet dat een bepaalde skill of gate draait.

Optionele coördinatiecontroles staan beschreven in de [sessie-quota cap](../guide/configuration-reference.md#session-quota-caps), de [`/orchestrate` retry- en exploratielus](../core-concepts/workflows.md#orchestrate) en [workspace-toewijzing](../core-concepts/parallel-execution.md#workspace-aware-pattern).

## De praktische afweging

OMA geeft een team één gedeelde plek om routering, uitvoeringsstappen, controles en uitvoerbestanden te definiëren. Daar staat tegenover dat het team die repositoryconfiguratie actueel moet houden en moet bepalen welke workflows of verificatiecommando's in het acceptatiecontract horen. Die afweging is nuttig wanneer consistentie tussen bijdragers zwaarder weegt dan de kleinst mogelijke installatie.

Voor de oorspronkelijke positioneringsdiscussie zie [issue #155](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589).

## Volgende stappen {#next-steps}

- [Snel starten](./quick-start.md): installeer, controleer de setup en voer één afgebakende taak uit
- [Belangrijke standaardinstellingen](./important-defaults.md): wat de installer inschakelt en hoe je dat wijzigt
- [Installatie](./installation.md#presets): kies een skillpreset die de workflows dekt die je wilt gebruiken
- [Workflows](../core-concepts/workflows.md): wanneer je `/work`, `/orchestrate`, `/ultrawork` en `/ralph` gebruikt
- [Probleemoplossing](../guide/troubleshooting.md): oplossingen voor problemen met installatie, vendors en hooks
