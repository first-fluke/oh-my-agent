---
title: "Gids: Codex-hookvertrouwen"
sidebar_label: Codex-hookvertrouwen
description: Hoe Codex hooks achter vertrouwen afschermt, wat oh-my-agent vastlegt zodat zijn hooks draaien, en wanneer je hooks zelf nog moet controleren.
---

# Gids: Codex-hookvertrouwen {#guide-codex-hook-trust}

Wanneer oh-my-agent in een project wordt geïnstalleerd, schrijft het vendor-native hookconfiguraties, waaronder `.codex/hooks.json` voor de Codex CLI. Codex voert een hook niet uit alleen omdat die is geconfigureerd. Twee goedkeuringen bepalen of hij draait, en beide staan in je gebruikersconfiguratie (`$CODEX_HOME/config.toml`, standaard `~/.codex/config.toml`). Een project kan zijn eigen hooks niet goedkeuren:

1. **Projectvertrouwen.** De map `.codex/` van een project (de `config.toml` en `hooks.json`) wordt alleen geladen voor een vertrouwd project: `[projects."<path>"] trust_level = "trusted"`.
2. **Vertrouwen per hook.** Elke niet-beheerde hook, in project- of gebruikersscope, heeft een vermelding `[hooks.state."<hooks.json path>:<event>:<group>:<handler>"]` nodig waarvan `trusted_hash` overeenkomt met de huidige declaratie van de hook (commando, timeout, matcher, async-vlag, statusbericht).

Een nieuwe of gewijzigde hook toont "Hooks need review" in de Codex-TUI. `codex exec` laat die stil weg.

---

## Wat oh-my-agent voor je vastlegt {#what-oh-my-agent-records-for-you}

`oma install`, `oma update` en `oma link` schrijven beide goedkeuringen voor **de eigen hooks van oh-my-agent**. Dit zijn de handlers met de naam `oma-hook-*` of die via de wrapper `oma-hook.sh` lopen. De hash is dezelfde die Codex berekent wanneer je "Trust all and continue" kiest, dus de hooks draaien in de eerste Codex-sessie zonder een `/hooks`-stap. Een latere release van oh-my-agent die een hookcommando wijzigt, legt de nieuwe hash vast tijdens `oma update`, zodat de hooks aan blijven.

oh-my-agent bewerkt alleen de betrokken tabellen in `config.toml`. Het leest het resultaat opnieuw en laat het bestand ongemoeid als er iets anders zou veranderen. Het doet nooit het volgende:

- een hook goedkeuren die je zelf aan dezelfde `hooks.json` hebt toegevoegd,
- een project vertrouwen dat je hebt gemarkeerd met `trust_level = "untrusted"`,
- een hook opnieuw inschakelen die je hebt uitgezet (`enabled = false`),
- Codex aanraken voordat Codex zijn homedirectory heeft aangemaakt.

Een globale installatie (`~/.codex/hooks.json`) krijgt alleen de vermeldingen per hook, omdat er geen project is om te vertrouwen.

---

## Wanneer je hooks zelf nog controleert {#when-you-still-review-hooks-yourself}

Als oh-my-agent het vertrouwen niet kon vastleggen, print het de reden bij deze melding:

```text
⚠ Codex hooks installed/updated but not trusted (<reason>) — run codex and use /hooks to trust them (untrusted hooks do not run).
```

De gebruikelijke gevallen zijn een `config.toml` die het niet kan parsen, een project dat je als untrusted hebt gemarkeerd, of Codex die nog niet is uitgevoerd. Open in dat geval het project in Codex, voer `/hooks` uit en schakel de hooks één keer in. Voer daarna `oma link codex` uit, zodat latere updates ze vertrouwd houden.

---

## Codex-processen die oh-my-agent spawnt {#codex-processes-oh-my-agent-spawns}

Wanneer oh-my-agent zelf een Codex-subproces spawnt (bijvoorbeeld `oma agent spawn`), geeft het ook `--dangerously-bypass-hook-trust` mee. Die vlag voert ingeschakelde hooks uit zonder de hashcontrole. Hij heft het projectvertrouwen niet op. De vlag geldt alleen voor processen die oh-my-agent start en wordt nooit in je configuratie geschreven.

---

## Geen vlag `[features] hooks` nodig {#no-features-hooks-flag-needed}

Oudere releases van oh-my-agent schreven `[features] codex_hooks = true` in de Codex-configuratie. Codex 0.124 hernoemde die vlag naar `hooks` en maakte hooks een stabiele, standaard ingeschakelde feature, dus er is geen vlag nodig. oh-my-agent schrijft geen van beide sleutels en verwijdert de verouderde vlaggen `codex_hooks` en `child_agents_md` uit de tabel `[features]` wanneer het die aantreft.

---

## Samenvatting {#summary}

| Situatie | Wat je doet |
|:----------|:------------|
| Eerste installatie in een project | Niets: het vertrouwen wordt door de installer vastgelegd |
| `oma update` die een hookcommando wijzigt | Niets: de nieuwe hash wordt vastgelegd |
| De installer print "not trusted (…)" | Los de reden op, of voer `/hooks` één keer uit in Codex |
| Een hook die je zelf aan `.codex/hooks.json` hebt toegevoegd | Controleer die zelf in `/hooks` |

## Zie ook {#see-also}

- [Integratie in een bestaand project](./integration.md): wat de installer voor elke vendor schrijft
- [Globale installatie](./global-install.md): gebruikersbrede installaties die naar `~/.codex/` schrijven
