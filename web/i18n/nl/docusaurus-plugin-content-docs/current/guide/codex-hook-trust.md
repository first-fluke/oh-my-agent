---
title: "Gids: Codex-hookvertrouwen"
sidebar_label: Codex-hookvertrouwen
description: Waarom Codex-hooks pas na een eenmalige controle uitvoeren, wat er bij updates gebeurt en wat oh-my-agent automatisch regelt voor gespawnde Codex-subprocessen.
---

# Gids: Codex-hookvertrouwen {#guide-codex-hook-trust}

Wanneer oh-my-agent in een project wordt geïnstalleerd, schrijft het vendor-native hookconfiguraties, waaronder `.codex/hooks.json` voor de Codex CLI. In tegenstelling tot Claude Code voert Codex deze hooks niet automatisch uit. Het gebruikt Trust-On-First-Use (TOFU) als gate voor elke niet-beheerde command-hook: een hook wordt pas uitgevoerd nadat je die één keer hebt bekeken en ingeschakeld.

Dit is een veiligheidsmechanisme aan de kant van Codex en geen beperking van oh-my-agent. In deze gids lees je welke eenmalige stap je moet uitvoeren, wat er bij updates gebeurt en wat OMA automatisch voor je afhandelt.

---

## De eenmalige stap: controleer hooks in Codex {#the-one-time-step-review-hooks-in-codex}

Nadat `oma` (install), `oma link` of `oma update` in een project dat Codex nog niet kent `.codex/hooks.json` heeft geschreven (bij een globale installatie `~/.codex/hooks.json`), worden de hooks nog **niet** uitgevoerd. Open Codex en controleer ze één keer:

1. Open het project in de Codex CLI.
2. Voer `/hooks` uit om de hookbrowser (TUI) te openen.
3. Bekijk de vermelde hooks en schakel ze in.

Tot je dit hebt gedaan, blijven de hooks onvertrouwd en worden ze stil overgeslagen. Daarom toont oh-my-agent een melding wanneer het `.codex/hooks.json` aanmaakt of wijzigt:

```text
⚠ Codex hooks installed/updated — run codex and use /hooks to trust them (untrusted hooks do not run).
```

Controleer het gegenereerde bestand voordat je Codex opent:

```bash
test -s .codex/hooks.json && echo "Codex hooks are installed"
oma link codex
```

Het verwachte resultaat is eerst de installatie-/updatemelding en daarna de hooks in Codex’ `/hooks`-browser. `oma link codex` stemt het gegenereerde bestand opnieuw af; het vervangt de eenmalige vertrouwenskeuze niet.

**Opmerking:** `--dangerously-bypass-hook-trust` helpt hier niet. De waarschuwing daarvan ("Enabled hooks may run without review") betekent alleen dat de controle wordt overgeslagen voor hooks die al zijn ingeschakeld. Een hook die nog nooit is bekeken wordt er niet door uitgevoerd. De `/hooks`-browser is de enige manier om een hook voor het eerst in te schakelen.

Onder de motorkap bewaart Codex je keuze in `~/.codex/config.toml` onder een invoer `[hooks.state]`, met een sleutel op basis van het pad naar het hooksbestand, event, block en hook, plus een vlag `enabled` en een `trusted_hash` van de commandostring.

---

## Wat er bij updates gebeurt {#what-happens-on-updates}

Nadat je de hooks hebt vertrouwd, hoef je dit niet bij elke update opnieuw te doen:

- **Opnieuw `oma link` of `oma update` uitvoeren behoudt het vertrouwen** zolang de commandostrings van de hooks ongewijzigd zijn. Codex vergelijkt de opgeslagen hash met het huidige commando; bij een overeenkomst blijft de hook vertrouwd.
- **Als een toekomstige versie van oh-my-agent een commandostring van een hook wijzigt**, komt de hash niet meer overeen en valt die hook stil terug naar onvertrouwd. Je ziet opnieuw de installermelding en moet via `/hooks` opnieuw vertrouwen geven.

De controle is dus alleen de eerste keer nodig, en opnieuw na een release die werkelijk een hookcommando wijzigt.

---

## Wat oh-my-agent automatisch voor je regelt {#what-oh-my-agent-automates-for-you}

Wanneer oh-my-agent zelf een Codex-subproces start, bijvoorbeeld een cross-vendor agent via `oma agent spawn`, geeft het automatisch `--dangerously-bypass-hook-trust` mee. Daardoor kunnen de eigen gecontroleerde hooks ook na updates draaien zonder dat je ze handmatig opnieuw hoeft te vertrouwen.

Deze vlag wordt **alleen** toegepast op Codex-processen die oh-my-agent zelf start. Ze wordt nooit in `~/.codex/config.toml` of de projectconfiguratie geschreven en heeft dus geen effect op Codex-sessies die je zelf start.

---

## Geen vlag `[features] hooks` nodig {#no-features-hooks-flag-needed}

Oudere releases van oh-my-agent schreven `[features] codex_hooks = true` in de Codex-configuratie. Codex 0.124 hernoemde die vlag naar `hooks` en maakte hooks een stabiele, standaard ingeschakelde feature, dus er is geen vlag meer nodig. oh-my-agent schrijft geen van beide sleutels en verwijdert de verouderde vlaggen `codex_hooks` en `child_agents_md` uit de tabel `[features]` wanneer het die aantreft.

---

## Samenvatting {#summary}

| Situatie | Wat je doet |
|:----------|:------------|
| Eerste installatie / eerste `.codex/hooks.json` in een project | Open Codex, voer `/hooks` uit en schakel de hooks één keer in |
| `oma update` met ongewijzigde hookcommando’s | Niets — het vertrouwen blijft behouden |
| `oma update` die een hookcommando wijzigt | Voer `/hooks` opnieuw uit om opnieuw vertrouwen te geven (de installer toont een melding) |
| Codex-subproces dat door oh-my-agent is gespawnd | Niets — de bypass wordt automatisch toegepast |

## Zie ook {#see-also}

- [Integratie in een bestaand project](./integration.md): wat de installer voor elke vendor schrijft
- [Globale installatie](./global-install.md): gebruikersbrede installaties die naar `~/.codex/` schrijven
