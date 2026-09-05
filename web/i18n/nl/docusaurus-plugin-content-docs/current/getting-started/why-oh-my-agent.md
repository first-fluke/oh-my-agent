---
title: Waarom oh-my-agent
description: Positionering van oh-my-agent in een verzadigde multi-agent CLI categorie. De kostenas is verschoven van implementatie naar testen en onderhoud; oh-my-agent levert quality gates, onafhankelijke verificatie, multi-vendor dispatch en repo-native maatwerk als antwoord op die verschuiving.
---

# Waarom oh-my-agent

De multi-agent CLI categorie is verzadigd. Alleen al in het afgelopen kwartaal zijn er meer dan twintig multi-agent orchestrators verschenen: Metateam, OpenSwarm, DevSquad, Praktor, Salacia, Codelegate, agent-of-empires, TTal, Maggy en andere. De meeste optimaliseren dezelfde as: agents sneller code laten schrijven.

oh-my-agent optimaliseert een andere as. De uitgangshypothese is dat met voldoende capabele modellen de kosten van analyse, ontwerp en implementatie in de SDLC naar nul tenderen. Het dure deel van software-ontwikkeling was altijd al testen en onderhoud: een systeem werkend, veilig en begrijpelijk houden na de eerste commit. Op die as is oh-my-agent ontworpen.

Deze pagina maakt die positionering concreet. Voor de uitgebreide discussie die dit kader heeft voortgebracht, zie [issue #155](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589).

---

## De kostenas is verschoven

Als één capabel model in minuten een werkende feature produceert, is implementatie-doorvoer niet langer de bottleneck. De bottleneck wordt: verifiëren dat de geproduceerde code echt doet wat hij beweert, stille regressies tussen iteraties opvangen, secrets uit prompts en logs houden, en token-uitgaven zichtbaar maken voordat ze het team verrassen.

Een harness die alleen agents sneller spawnt lost daar niets van op. Een harness ontworpen voor de fase na implementatie wel.

---

## Wat oh-my-agent levert voor het echte kostencentrum

Elke onderstaande capability beantwoordt een specifiek faalpatroon uit de multi-agent CLI categorie.

### Onafhankelijke verificatie, geen LLM-zelfbeoordeling

`oma verify <agent>` voert veertien deterministische checks per agent-type uit. Allemaal mechanische checks: exit code van het testcommando, TypeScript strict slaagt, raw SQL pattern-detectie, scan op hardcoded secrets, Flutter analyze, scan op inline styles, scope violation tegen het charter van de agent. Geen LLM beoordeelt of het werk "er goed uitziet". Een check slaagt als en alleen als het onderliggende commando succes meldt.

Dit reageert op de meest gehoorde klacht in de categorie, samengevat in een community-post als "agents lie - they say tests pass when tests do not". Zie `cli/commands/verify/verify.ts` voor de check-lijst.

### Her-verificatie tussen iteraties

De `ralph` workflow wikkelt `ultrawork` in een onafhankelijke JUDGE-fase. Na elke iteratie her-verifieert JUDGE elk criterion, inclusief degene die in eerdere iteraties al slaagden. Dat vangt het geval waarin het fixen van C2 stilletjes C1 breekt, het feitelijke mechanisme achter de meeste regressies in lange agent-sessies.

Zware verificaties (langer dan dertig seconden) worden gecached tegen de getroffen bestandspaden, zodat her-verificatie goedkoop blijft. Zie `.agents/workflows/ralph/resources/judge-protocol.md` voor het volledige protocol.

### Quota caps die blokkeren voor de schade

Elke `oma agent spawn` aanroep registreert de token-schatting van die spawn in `.serena/memories/session-cost-{sessionId}.md`. Voor de volgende spawn raadpleegt `checkCap` de geconfigureerde quota cap en weigert hij te starten als één dimensie overschreden is. Drie dimensies worden afgedwongen: totaal tokens, totaal spawns, per-vendor token budget.

Dat is het verschil tussen achteraf horen dat je veertigduizend dollar hebt uitgegeven en bij spawn vijftien te horen krijgen dat er nog één spawn in je budget zit. Zie `cli/io/session-cost.ts` en configureer onder `session.quota_cap` in `.agents/oma-config.yaml`.

### Retry en daarna verkennen, niet eeuwig retry

Wanneer `orchestrate` Step 5 een verificatie-fout vindt, herhaalt het de agent maximaal twee keer met error-context. Als de tweede retry nog steeds faalt en de cost cap nog niet overschreden is, schakelt de workflow naar de Exploration Loop: hij spawnt twee of drie alternatieve hypothese-varianten parallel in aparte workspaces en houdt alleen het hoogst scorende resultaat. Mislukte benaderingen worden weggegooid met hun kosten geregistreerd.

Dit is een gestructureerd antwoord op het geval waarin één aanpak fundamenteel verkeerd is. Hem opnieuw proberen convergeert nooit; verschillende aanpakken parallel proberen wel.

### Monorepo-bewuste workspace routing

`detectWorkspace` leest pnpm, nx, turbo en lerna configuraties en routeert elke agent automatisch naar zijn corresponderende sub-workspace. De backend agent draait tegen `apps/api/`, de frontend agent tegen `apps/web/`, zonder dat de orchestrator paden handmatig hoeft samen te stellen. Zie `cli/io/workspaces.ts`.

---

## Multi-vendor is geen optie

De tweede ontwerphypothese is dat elk team dat serieus AI-geassisteerde ontwikkeling doet meer dan één provider gebruikt. Vandaag betekent dat Claude, Codex, Gemini, Copilot, Qwen, Kimi en wat volgend kwartaal verschijnt. Vendor-wissel is een feit, geen edge case: Anthropic verschuift agent-functies naar een apart betaald plan, OpenAI lanceert Codex CLI in dezelfde week waarin Anthropic-modellen degraderen, GitHub Copilot stapt over op consumption-based pricing.

oh-my-agent behandelt vendor-keuze als per-agent configuratie via `model_preset` en `agents.<id>.model` in `.agents/oma-config.yaml`. De portable `.agents/` directory is de single source of truth; elke ondersteunde runtime projecteert daaruit. Geen vendor lock-in nodig om oh-my-agent te gebruiken, en geen migratie nodig bij wisselen.

---

## Repo-native maatwerk

De derde hypothese is dat geen twee teams dezelfde definitie van "done" delen. Eén team eist OWASP Top 10 scans bij elke backend-wijziging. Een ander eist een QA-rapport in het Koreaans. Een derde eist dat elke migration voor merge door een database agent wordt gereviewd.

Omdat `.agents/` gewoon bestanden in je repository zijn, kan elk team agents, skills, workflows en quality gates toevoegen of aanpassen om bij de eigen gedragscode en compliance-houding te passen. Aanpassen is een `git commit`, geen vendor support ticket.

---

## Wat dit in de praktijk betekent

Als je prioriteit "parallelle agents snel spawnen" is, dekken veel tools dat oppervlak. Als je prioriteit "code uitleveren die blijft werken nadat de agents de kamer hebben verlaten" is, is oh-my-agent voor dat specifieke doel gebouwd. `oma verify`, JUDGE, Exploration Loop, quota cap en monorepo routing zijn geen optionele extra's - ze zijn de reden dat het project bestaat.

Voor details over elke capability, zie de sectie Core Concepts (Agents, Parallel Execution) in de zijbalk.
