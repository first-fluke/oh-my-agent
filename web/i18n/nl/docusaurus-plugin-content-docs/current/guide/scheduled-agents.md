---
title: "Gids: Geplande agents"
sidebar_label: Geplande agents
description: Voer elke agent volgens een terugkerende of eenmalige planning uit met de OS-scheduler (macOS launchd, Linux systemd, Windows Task Scheduler), zonder dat een vendor-runtime open hoeft te blijven.
---

# Geplande agents {#scheduled-agents}

Met `oma schedule` kun je elke agent volgens een tijdplanning uitvoeren, onafhankelijk van welke AI-vendor-runtime (Claude Code, Codex, Antigravity, Cursor, Qwen, Grok, opencode of pi) momenteel open is. De OS-scheduler activeert de job en die roept headless `oma agent spawn` aan met de vendorcredentials die al op schijf zijn opgeslagen.

---

## Hoe het werkt {#how-it-works}

Wanneer je `oma schedule create` uitvoert, doet oma het volgende:

1. Het schrijft een jobrecord naar het globale manifest op `~/.agents/schedule/schedules.json`.
2. Het registreert de job bij de OS-scheduler (macOS launchd, Linux systemd --user of Windows Task Scheduler). De OS-job roept op het ingestelde croninterval `oma schedule run <id>` aan.
3. Op het uitvoertijdstip zoekt `oma schedule run` de job op, injecteert vastgelegde omgevingsvariabelen, roept `oma agent spawn` aan en schrijft het runlog naar `~/.agents/schedule/runs/<id>/<timestamp>.md`.

Het manifest is de single source of truth (SSOT). De OS-scheduler is alleen een uitvoerder. Alle state — jobdefinities, runlogs en timestamps van de laatste uitvoering — staat onder `~/.agents/schedule/`.

### Alleen globaal ontworpen {#global-only-by-design}

`oma schedule` is bewust globaal voor de gebruiker en niet per project. Omdat de OS-scheduler jobs onafhankelijk van de huidige werkmap uitvoert, is één centraal register de enige praktische SSOT. Elke job legt via `workspace` en `projectLabel` vast bij welk project die hoort, zodat `schedule list` jobs per project kan groeperen terwijl het register gedeeld blijft.

Er is geen vlag `--global`; schedulecommando’s lezen en schrijven altijd naar `~/.agents/schedule/`.

### OS-backends {#os-backends}

| Platform | Primaire backend | Fallback |
|---|---|---|
| macOS | launchd (plist + `launchctl`) | user `crontab` |
| Linux | systemd --user timer | user `crontab` |
| Windows | Task Scheduler (`schtasks`) | — |

oma selecteert automatisch de beschikbare backend. Je hoeft dit niet handmatig te configureren.

---

## Vergelijking: schedule, ralph en Claude /loop {#comparison-schedule-vs-ralph-vs-claude-loop}

Deze drie functies worden soms door elkaar gehaald omdat ze allemaal betekenen dat iets later opnieuw wordt uitgevoerd. Het zijn verschillende concepten.

| Functie | Trigger | Scope | Blijft actief na herstart van de vendor? |
|---|---|---|---|
| `oma schedule` | Tijd (cron) | Cross-vendor, OS-niveau | Ja — de OS-scheduler activeert de job ook wanneer geen vendor-runtime open is |
| `ralph` | Voltooiing (Stop-hooklus) | Cross-vendor | Alleen zolang de huidige sessie actief is; ralph is een lus die doorgaat tot de taak klaar is, geen timer |
| Claude Code `/loop` | Tijd (cron in proces) | Alleen Claude-runtime | Nee — wordt alleen geactiveerd zolang Claude Code draait |

Gebruik `schedule` wanneer je een job elke werkdag om 9:00 wilt uitvoeren. Gebruik `ralph` wanneer je wilt dat een agent blijft itereren tot een kwaliteitsdrempel is bereikt. Gebruik `/loop` alleen al binnen Claude Code wanneer je geen cross-vendor-portabiliteit nodig hebt.

---

## Snel starten {#quick-start}

```bash
# Run the qa-reviewer agent every weekday at 9 AM
oma schedule create qa-reviewer "Run QA review on the latest changes" --cron "0 9 * * 1-5"

# Run a backend agent every 2 hours using natural-language syntax
oma schedule create backend "Check for slow queries in the API logs" --every "2h"

# One-shot: run once at 3 PM today (cron syntax) and self-remove
oma schedule create pm "Generate weekly plan" --cron "0 15 * * *" --once

# Check what is scheduled
oma schedule list

# Remove a job
oma schedule delete sch_abc123def456
```

---

## Commando’s {#commands}

### schedule create {#schedule-create}

Registreer een job voor een geplande agent.

```
oma schedule create <agent-id> <prompt> --cron "<5-field>" | --every "<phrase>" [--vendor <vendor>] [-w <path>] [--once] [--expires-after <n>] [--env <KEY1,KEY2>] [--dry-run] [--accept-rounded]
```

**Argumenten:**

| Argument | Vereist | Beschrijving |
|---|---|---|
| `agent-id` | Ja | Agenttype dat moet worden gespawnd: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |
| `prompt` | Ja | Taakbeschrijving die tijdens runtime aan de agent wordt doorgegeven |

**Opties:**

| Vlag | Beschrijving |
|---|---|
| `--cron "<expr>"` | Cronexpressie met 5 velden (bijvoorbeeld `"0 9 * * *"` voor dagelijks om 9:00). Wederzijds exclusief met `--every`. |
| `--every "<phrase>"` | Interval in natuurlijke taal (zie de tabel hieronder). Wederzijds exclusief met `--cron`. |
| `--vendor <vendor>` | CLI-vendoroverride die aan `oma agent spawn` wordt doorgegeven: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`. Standaard wordt de vendor automatisch gedetecteerd uit `oma-config.yaml`. |
| `-w, --workspace <path>` | Werkmap voor de agent tijdens runtime. Standaard de huidige werkmap op het moment van registratie. |
| `--once` | Eenmalige modus: de job wordt één keer uitgevoerd en daarna zelf verwijderd. Standaard is de job terugkerend. |
| `--expires-after <duration>` | Laat een terugkerende job na een duur zoals 30d automatisch verlopen. `0` betekent onbeperkt (standaard). |
| `--env <KEY1,KEY2>` | Legt de genoemde omgevingsvariabelen (alleen de opgesomde) vast in `~/.agents/schedule/env/<id>` (rechten 0600), zodat ze tijdens runtime kunnen worden geïnjecteerd. Geheimen worden nooit in het manifest zelf geschreven. |
| `--dry-run` | Print de opgeloste cron en een afrondingsnotitie zonder een schedulerjob, manifestitem of omgevingsbestand te schrijven. |
| `--accept-rounded` | Vereist om een interval in natuurlijke taal te registreren nadat OMA het heeft afgerond naar een stap die cron kan uitdrukken. Bekijk het eerst met `--dry-run`. |

Exact één van `--cron` of `--every` is vereist.

#### --every: intervallen in natuurlijke taal {#every-natural-language-intervals}

`--every` accepteert de volgende vormen. oma zet ze om naar een cronexpressie met 5 velden en print een notitie wanneer het gevraagde interval wordt afgerond naar een stap die cron kan uitdrukken.

| Vorm | Voorbeeld | Opmerkingen |
|---|---|---|
| Compacte eenheid | `5m`, `2h`, `1d` | Minuut, uur, dag |
| Every + compact | `every 20m`, `every 2h` | |
| Every + woord | `every 5 minutes`, `every 2 hours` | Meervoudige eenheden worden geaccepteerd |
| Seconden | `30s` | Naar minimaal 1 minuut naar boven afgerond; cron kan intervallen korter dan een minuut niet uitdrukken |

Niet-deelbare intervallen worden afgerond naar de dichtstbijzijnde nette stap en er wordt een notitie geprint. `--every 7m` wordt bijvoorbeeld afgerond naar `6m` (`*/6`), omdat 7 geen deler van 60 is.

Bekijk een afgerond interval voordat je het registreert:

```bash
oma schedule create backend "Check logs" --every 7m --dry-run
# Preview: requested interval resolves to */6 * * * *
# Preview only: no OS job, manifest entry, or env file was written.
oma schedule create backend "Check logs" --every 7m --accept-rounded
```

Als je de preview overslaat, weigert het commando een afgerond interval te registreren. Schedules gebruiken de lokale tijdregels van de geselecteerde OS-scheduler.

**Voorbeelden:**

```bash
# Exact cron expression (full control)
oma schedule create backend "Optimize slow queries" --cron "0 */4 * * *"

# Natural language (oma converts to cron)
oma schedule create frontend "Run lighthouse audit" --every "every 6 hours"
# Converts to 0 */6 * * * (6 divides 24 cleanly, so no rounding note)

# Pin to a vendor and a workspace
oma schedule create qa "Run security scan" --cron "0 2 * * 0" --vendor claude -w /home/user/myproject

# One-shot job
oma schedule create pm "Generate sprint retrospective" --cron "0 17 * * 5" --once

# Capture specific env vars for the job
oma schedule create backend "Sync external API data" --cron "0 * * * *" --env SYNC_API_KEY,SYNC_TARGET_URL
```

---

### schedule list {#schedule-list}

Toon alle geplande jobs voor alle projecten, gegroepeerd per project en met de driftstatus van het OS.

```
oma schedule list [--json]
```

**Opties:**

| Vlag | Beschrijving |
|---|---|
| `--json` | Machineleesbare JSON-uitvoer |

**Driftstatussen:**

| Status | Betekenis |
|---|---|
| `synced` | De job bestaat zowel in het manifest als in de OS-scheduler |
| `stale` | De job is geregistreerd, maar de OS-registratie roept een commando aan dat de huidige CLI niet meer accepteert (bijvoorbeeld `schedule:run <id>`, geschreven vóór de standaardisatie van de commandopaden). Voer `schedule sync` uit om de registratie te herschrijven; `oma update` doet dit automatisch. |
| `missing-in-os` | De job staat in het manifest maar ontbreekt in de OS-scheduler. Voer `schedule sync` uit om dit te herstellen. |
| `orphan-in-os` | De job bestaat in de OS-scheduler maar niet in het manifest. Voer `schedule sync --prune` uit om die te verwijderen. |

**Uitvoer (tekst):**

Jobs worden gegroepeerd op projectlabel. Elke rij toont: ID, cronexpressie, agent, vendor, OS-backend, of de job terugkerend is en de driftstatus.

```
[my-project]
ID                 CRON           AGENT              VENDOR   BACKEND  RECUR  STATE
------------------------------------------------------------------------------------------
sch_abc123def456   0 9 * * 1-5    qa-reviewer        auto     launchd  true   synced
sch_xyz789ghi012   */30 * * * *   backend            claude   launchd  true   missing-in-os

[orphan-in-os]
  dev.oma.sch_old (in OS scheduler but not in manifest)
```

**Voorbeelden:**

```bash
oma schedule list
oma schedule list --json | jq '.jobs[] | select(.drift != "synced")'
```

---

### schedule delete {#schedule-delete}

Verwijder een geplande job uit zowel het manifest als de OS-scheduler.

```
oma schedule delete <id>
```

**Argumenten:**

| Argument | Vereist | Beschrijving |
|---|---|---|
| `id` | Ja | Job-ID uit `schedule list` (vorm: `sch_<base32-12>`) |

Als het verwijderen uit de OS-scheduler mislukt (bijvoorbeeld omdat de backend tijdelijk niet beschikbaar is), wordt een waarschuwing geprint maar blijft de manifestinvoer verwijderd.

**Voorbeeld:**

```bash
oma schedule delete sch_abc123def456
```

---

### schedule run {#schedule-run}

Voer een geplande job uit op basis van de ID. De OS-scheduler roept dit aan op het uitvoertijdstip; normaal voer je het niet handmatig uit.

```
oma schedule run <id>
```

De wrapper:
1. Zoekt de job-ID op in het manifest. Eindigt met een niet-nul exitcode als die niet wordt gevonden.
2. Laadt vastgelegde omgevingsvariabelen uit `~/.agents/schedule/env/<id>` (als het bestand aanwezig is) en injecteert die in het gespawnde proces.
3. Roept `oma agent spawn <agentId> <prompt> <generatedSessionId> --vendor <vendor> -w <workspace>` aan.
4. Schrijft het runresultaat naar `~/.agents/schedule/runs/<id>/<ISO-timestamp>.md`.
5. Werkt `lastFiredAt` in het manifest bij.
6. Verwijdert de job zelf (manifest + OS-scheduler) als `--once` was ingesteld.

**Authenticatiefouten zijn zichtbaar:** als vendorcredentials zijn verlopen, eindigt de job met een niet-nul code en schrijft die `re-auth required: <vendor>` naar stderr. De job slaagt niet stilzwijgend. Je kunt optioneel een `oma-voice`-melding configureren.

Je kunt `schedule run` handmatig voor debugging aanroepen:

```bash
oma schedule run sch_abc123def456
```

---

### schedule sync {#schedule-sync}

Synchroniseer het manifest opnieuw met de OS-scheduler. Gebruik dit na systeemmigraties, resets van de OS-scheduler of om drift te herstellen.

```
oma schedule sync [--prune]
```

**Opties:**

| Vlag | Beschrijving |
|---|---|
| `--prune` | Verwijdert ook OS-jobs die wel in de OS-scheduler maar niet in het manifest staan (status orphan-in-os). Zonder `--prune` worden verweesde jobs gemeld maar niet verwijderd. |

**Voorbeelden:**

```bash
# Repair missing-in-os jobs and rewrite stale registrations (does not remove orphans)
oma schedule sync

# Repair missing-in-os jobs AND remove orphans
oma schedule sync --prune
```

`oma update` voert na elke update dezelfde reconciliatie uit (zonder `--prune`), zodat een CLI-release die de schrijfwijze van het commando `oma schedule run` wijzigt, geen bestaande OS-registraties kan achterlaten die naar een commando wijzen dat het nieuwe binary weigert. Registraties die door oudere versies met `oma schedule:run <id>` zijn geschreven, blijven ook werken: die legacy-schrijfwijze blijft geaccepteerd voor door het OS aangeroepen jobs.

---

## Opslagindeling {#storage-layout}

Alle schedule-state staat onder `~/.agents/schedule/`:

```
~/.agents/schedule/
├── schedules.json          # SSOT manifest (permissions 0600)
├── env/
│   └── sch_abc123def456    # Captured env vars for this job (permissions 0600)
└── runs/
    └── sch_abc123def456/
        └── 2026-06-16T090000Z.md   # Run log
```

Rechten:
- Map `~/.agents/schedule/`: `0700`
- Bestanden `schedules.json` en `env/<id>`: `0600`

**Geheimen worden nooit naar `schedules.json` geschreven.** De vlag `--env` schrijft alleen de genoemde sleutels naar een afzonderlijk `0600`-bestand onder `env/`. Alleen expliciet vermelde sleutels worden vastgelegd; een volledige omgevingsdump wordt nooit opgeslagen.

---

## Beveiligingsnotities {#security-notes}

- `schedule create` is een bewerking op een trusted path: alleen de geauthenticeerde gebruiker kan jobs registreren. Stel `schedule create` niet bloot aan externe of onvertrouwde input. Een geplande prompt is willekeurige code die op een later tijdstip wordt uitgevoerd.
- `schedule run` voert alleen jobs uit waarvan de ID in het manifest bestaat. Willekeurige argv-injectie is niet mogelijk.
- Vendorcredentials op schijf (bijvoorbeeld `~/.codex/auth.json` en `~/.grok/auth.json`) worden ongewijzigd gebruikt voor headless dispatch. Er wordt geen extra authenticatiepoort toegepast. Als credentials verlopen, faalt de job zichtbaar.

---

## Tips en probleemoplossing {#tips-and-troubleshooting}

**Runlogs controleren:**

```bash
ls ~/.agents/schedule/runs/sch_abc123def456/
cat ~/.agents/schedule/runs/sch_abc123def456/2026-06-16T090000Z.md
```

**Job toont `missing-in-os` na een systeemherstart:**

Voer `oma schedule sync` uit om alle manifestjobs opnieuw bij de OS-scheduler te registreren.

**Job is uitgevoerd, maar vendorcredentials waren verlopen:**

Controleer het runlog op `re-auth required: <vendor>`. Authenticeer opnieuw met de vendor-CLI (bijvoorbeeld `claude login` of `codex login`) en voer `oma schedule run <id>` handmatig uit om dit te controleren vóór de volgende geplande uitvoering.

**`--every` heeft mijn interval afgerond:**

Wanneer oma je interval afrondt, print het een notitie met de wijziging. Gebruik `--cron` met een expliciete expressie met 5 velden als je een precies interval nodig hebt dat niet netjes door 60 minuten of 24 uur deelt.

**Alle jobs voor een project verwijderen:**

```bash
# List jobs for a specific project, then remove each
oma schedule list --json | jq -r '.jobs[] | select(.projectLabel == "my-project") | .id' \
  | xargs -I{} oma schedule delete {}
```

**Windows-ondersteuning:**

Op Windows gebruikt oma `schtasks` om jobs te registreren. De driftcontrole van `schedule list` en de commando’s `schedule sync` werken op alle platforms hetzelfde.

Let op: `schtasks` kan niet elke cronvorm uitdrukken. Ondersteunde vormen zijn `*/N * * * *` (elke N minuten), `M * * * *` (elk uur op :M), `M H * * *` (dagelijks), `M H * * D` (wekelijks; `D` kan één dag zijn, een bereik zoals `1-5` of een kommagescheiden lijst zoals `1,3,5`) en `M H D * *` (maandelijks). Andere expressies (bijvoorbeeld een kommagescheiden lijst in het minuutveld) worden op Windows tijdens `schedule create` geweigerd.
