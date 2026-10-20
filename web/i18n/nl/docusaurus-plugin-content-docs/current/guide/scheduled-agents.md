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

1. Het schrijft een jobrecord naar het globale manifest op `~/.oma/schedule/schedules.json`.
2. Het registreert de job bij de OS-scheduler (macOS launchd, Linux systemd --user of Windows Task Scheduler). De OS-job roept op het ingestelde croninterval `oma schedule run <id>` aan.
3. Op het uitvoertijdstip zoekt `oma schedule run` de job op, injecteert vastgelegde omgevingsvariabelen, roept `oma agent spawn` aan en schrijft het runlog naar `~/.oma/schedule/runs/<id>/<timestamp>.md`.

Het manifest is de single source of truth (SSOT). De OS-scheduler is alleen een uitvoerder. Alle state — jobdefinities, runlogs en timestamps van de laatste uitvoering — staat onder `~/.oma/schedule/`.

### Alleen globaal ontworpen {#global-only-by-design}

`oma schedule` is bewust globaal voor de gebruiker en niet per project. Omdat de OS-scheduler jobs onafhankelijk van de huidige werkmap uitvoert, is één centraal register de enige praktische SSOT. Elke job legt via `workspace` en `projectLabel` vast bij welk project die hoort, zodat `schedule list` jobs per project kan groeperen terwijl het register gedeeld blijft.

Er is geen vlag `--global`; schedulecommando’s gebruiken `$OMA_HOME/schedule/`, standaard `~/.oma/schedule/`. Geregistreerde OS-jobs krijgen de opgeloste home expliciet mee, zodat ze zonder login-shell hetzelfde register openen. Voer `oma schedule sync` uit nadat je de home hebt verplaatst, om jobcommando’s en logpaden te vernieuwen.

### OS-backends {#os-backends}

| Platform | Primaire backend | Fallback | stderr van `oma schedule run` |
|---|---|---|---|
| macOS | launchd (plist + `launchctl`) | — | `runs/<id>/stderr.log` |
| Linux | systemd --user timer | user `crontab` wanneer `systemctl --user` niet beschikbaar is | `runs/<id>/stderr.log` (systemd); niet opgeslagen (crontab) |
| Windows | Task Scheduler (`schtasks`) | — | Niet opgeslagen |

oma selecteert automatisch de beschikbare backend. Je hoeft dit niet handmatig te configureren.

---

## Vergelijking: schedule, ralph en Claude /loop {#comparison-schedule-vs-ralph-vs-claude-loop}

| Functie | Trigger | Scope | Blijft actief na herstart van de vendor? |
|---|---|---|---|
| `oma schedule` | Tijd (cron) | Cross-vendor, OS-niveau | Ja — de OS-scheduler activeert de job ook wanneer geen vendor-runtime open is |
| `ralph` | Voltooiing (Stop-hooklus) | Cross-vendor | Alleen zolang de huidige sessie actief is; ralph is een lus die doorgaat tot de taak klaar is, geen timer |
| Claude Code `/loop` | Tijd (cron in proces) | Alleen Claude-runtime | Nee — wordt alleen geactiveerd zolang Claude Code draait |

Gebruik `schedule` wanneer je een job elke werkdag om 9:00 wilt uitvoeren. Gebruik `ralph` wanneer je wilt dat een agent blijft itereren tot een kwaliteitsdrempel is bereikt. Gebruik `/loop` alleen wanneer je al binnen Claude Code werkt en geen cross-vendor-portabiliteit nodig hebt.

---

## Snel starten {#quick-start}

```bash
# Run the qa-reviewer agent every weekday at 9 AM
oma schedule create qa-reviewer "Run QA review on the latest changes" --cron "0 9 * * 1-5"

# Run a backend agent every 2 hours using natural-language syntax
oma schedule create backend "Check for slow queries in the API logs" --every "2h"

# One-shot: run at the next 15:00 and remove the job after a successful run
oma schedule create pm "Generate weekly plan" --cron "0 15 * * *" --once

# Check what is scheduled
oma schedule list

# Remove a job
oma schedule delete sch_abcdefgh2345
```

`schedule create` print de job-ID die `run` en `delete` nodig hebben:

```text
Scheduled job registered: sch_abcdefgh2345
  Agent:   qa-reviewer
  Cron:    0 9 * * 1-5
  Vendor:  auto
  Project: my-project
  Once:    false
```

Activeer een nieuwe job één keer handmatig om de prompt en de vendorcredentials te controleren vóór de eerste geplande uitvoering:

```bash
oma schedule run sch_abcdefgh2345
ls ~/.oma/schedule/runs/sch_abcdefgh2345/
```

---

## Commando’s {#commands}

### schedule create {#schedule-create}

Registreer een job voor een geplande agent.

```bash
oma schedule create <agent-id> <prompt> --cron "<5-field>" | --every "<phrase>" [--vendor <vendor>] [-w <path>] [--once] [--expires-after <Nd>] [--env <KEY1,KEY2>] [--dry-run] [--accept-rounded]
```

**Argumenten:**

| Argument | Vereist | Beschrijving |
|---|---|---|
| `agent-id` | Ja | Agent die aan `oma agent spawn` wordt doorgegeven: een canonieke ID (`orchestrator`, `architecture`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `qa`, `docs`, `tf-infra`, `explore`) of een definitienaam zoals `qa-reviewer` of `backend-engineer`. Deze wordt bij registratie niet gevalideerd, dus voer na het aanmaken van de job één keer `oma schedule run <id>` uit. |
| `prompt` | Ja | Taakbeschrijving die tijdens runtime aan de agent wordt doorgegeven |

**Opties:**

| Vlag | Beschrijving |
|---|---|
| `--cron "<expr>"` | Cronexpressie met 5 velden (bijvoorbeeld `"0 9 * * *"` voor dagelijks om 9:00). Wederzijds exclusief met `--every`. |
| `--every "<phrase>"` | Interval in natuurlijke taal (zie de tabel hieronder). Wederzijds exclusief met `--cron`. |
| `--vendor <vendor>` | CLI-vendoroverride die aan `oma agent spawn` wordt doorgegeven: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`. Standaard wordt de vendor automatisch gedetecteerd uit `oma-config.yaml`. |
| `-w, --workspace <path>` | Werkmap voor de agent tijdens runtime. Standaard de huidige werkmap op het moment van registratie. |
| `--once` | Eenmalige modus: de job verwijdert zichzelf na de eerste run die met 0 eindigt. Een mislukte run laat de job staan, zodat die bij de volgende cronmatch opnieuw wordt uitgevoerd. Standaard is de job terugkerend. |
| `--expires-after <duration>` | Verwijdert een terugkerende job bij de eerste uitvoering nadat deze leeftijd is bereikt. Gebruik hele dagen met een eenheid, zoals `30d`; een kaal getal (`30`) wordt geweigerd. `0` betekent onbeperkt (standaard). |
| `--env <KEY1,KEY2>` | Legt de genoemde omgevingsvariabelen (alleen de opgesomde) vast in `~/.oma/schedule/env/<id>` (rechten 0600), zodat ze tijdens runtime kunnen worden geïnjecteerd. Geheimen worden nooit in het manifest zelf geschreven. |
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
# Note: Requested every 7m -- 7 is not a divisor of 60; rounded to every 6m (*/6 * * * *).
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

```bash
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
| `orphan-in-os` | Een agentschedule (`dev.oma.sch_*`) bestaat in de OS-scheduler maar niet in het manifest. Voer `schedule sync --prune` uit om die te verwijderen. |

Interne services zoals `dev.oma.agentmemory`, `dev.oma.serena-daemon-gc` en `dev.oma.serena-reaper` hebben hun eigen servicemanagers. `schedule list` sluit ze uit van de orphan-detectie en `schedule sync --prune` laat ze staan.

**Uitvoer (tekst):**

Jobs worden gegroepeerd op projectlabel. Elke rij toont: ID, cronexpressie, agent, vendor, OS-backend, of de job terugkerend is en de driftstatus.

```text
[my-project]
ID                 CRON           AGENT              VENDOR   BACKEND  RECUR  STATE
------------------------------------------------------------------------------------------
sch_abcdefgh2345   0 9 * * 1-5    qa-reviewer        auto     launchd  true   synced
sch_mnopqrst4567   */30 * * * *   backend            claude   launchd  true   missing-in-os

[orphan-in-os]
  dev.oma.sch_old (in OS scheduler but not in manifest)
```

Jobs die door `oma harness evolution enable` zijn aangemaakt, worden vermeld met agent `__builtin__`; ze voeren `oma harness evolution run --scheduled` uit in dat project. Beheer ze met `oma harness evolution enable` en `disable` (zie [Project Harness Evolution](./harness-evolution.md)) in plaats van met `oma schedule delete`. `oma schedule builtin-evolution-add` en `oma schedule inspect`, die in `oma schedule --help` verschijnen, zijn interne hulpcommando’s voor dat commando.

**Voorbeelden:**

```bash
oma schedule list
oma schedule list --json | jq '.jobs[] | select(.drift != "synced")'
```

---

### schedule delete {#schedule-delete}

Verwijder een geplande job uit zowel het manifest als de OS-scheduler.

```bash
oma schedule delete <id>
```

**Argumenten:**

| Argument | Vereist | Beschrijving |
|---|---|---|
| `id` | Ja | Job-ID uit `schedule list` (vorm: `sch_<base32-12>`) |

Als het verwijderen uit de OS-scheduler mislukt (bijvoorbeeld omdat de backend tijdelijk niet beschikbaar is), wordt een waarschuwing geprint maar blijft de manifestinvoer verwijderd.

**Voorbeeld:**

```bash
oma schedule delete sch_abcdefgh2345
```

---

### schedule run {#schedule-run}

Voer een geplande job uit op basis van de ID. De OS-scheduler roept dit aan op het uitvoertijdstip; normaal voer je het niet handmatig uit.

```bash
oma schedule run <id>
```

De wrapper:
1. Zoekt de job-ID op in het manifest. Eindigt met een niet-nul exitcode als die niet wordt gevonden. Als `--expires-after` is verstreken, verwijdert hij de job in plaats van die uit te voeren.
2. Laadt vastgelegde omgevingsvariabelen uit `~/.oma/schedule/env/<id>` (als het bestand aanwezig is) en injecteert die in het gespawnde proces.
3. Roept `oma agent spawn <agentId> <prompt> <generatedSessionId> --vendor <vendor> -w <workspace>` aan.
4. Schrijft het runresultaat naar `~/.oma/schedule/runs/<id>/<ISO-timestamp>.md`.
5. Werkt `lastFiredAt` in het manifest bij.
6. Verwijdert de job (manifest + OS-scheduler) als `--once` was ingesteld en de agent met 0 eindigde.

**Authenticatiefouten zijn zichtbaar:** als vendorcredentials zijn verlopen, eindigt de job met een niet-nul code en schrijft die `re-auth required: <vendor>` naar stderr (opgeslagen in `runs/<id>/stderr.log` bij launchd en systemd). De vendor wordt als `unknown` getoond wanneer de job zonder `--vendor` is aangemaakt. De job slaagt niet stilzwijgend.

Je kunt `schedule run` handmatig voor debugging aanroepen:

```bash
oma schedule run sch_abcdefgh2345
```

---

### schedule sync {#schedule-sync}

Synchroniseer het manifest opnieuw met de OS-scheduler. Gebruik dit na systeemmigraties, resets van de OS-scheduler of om drift te herstellen.

```bash
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

Alle schedule-state staat onder `~/.oma/schedule/`:

```text
~/.oma/schedule/
├── schedules.json          # SSOT manifest (permissions 0600)
├── env/
│   └── sch_abcdefgh2345    # Captured env vars for this job (permissions 0600)
├── running/                # Lease files while a job runs
└── runs/
    └── sch_abcdefgh2345/
        ├── 2026-06-16T09-00-00-000Z.md   # One log per fire: session, exit code, agent output
        ├── stdout.log                    # launchd and systemd only: stdout of oma schedule run
        └── stderr.log                    # launchd and systemd only: stderr, e.g. re-auth required
```

Rechten:
- Map `~/.oma/schedule/`: `0700`
- Bestanden `schedules.json` en `env/<id>`: `0600`

**Geheimen worden nooit naar `schedules.json` geschreven.** De vlag `--env` schrijft alleen de genoemde sleutels naar een afzonderlijk `0600`-bestand onder `env/`. Alleen expliciet vermelde sleutels worden vastgelegd; een volledige omgevingsdump wordt nooit opgeslagen.

---

## Beveiligingsnotities {#security-notes}

- `schedule create` is een bewerking op een trusted path: alleen de geauthenticeerde gebruiker kan jobs registreren. Stel `schedule create` niet bloot aan externe of onvertrouwde input. Een geplande prompt is willekeurige code die op een later tijdstip wordt uitgevoerd.
- `schedule run` voert alleen jobs uit waarvan de ID in het manifest bestaat. Willekeurige argv-injectie is niet mogelijk.
- Vendorcredentials op schijf (bijvoorbeeld `~/.codex/auth.json` en `~/.grok/auth.json`) worden ongewijzigd gebruikt voor headless dispatch. Er wordt geen extra authenticatiegate toegepast. Als credentials verlopen, faalt de job zichtbaar.

---

## Tips en probleemoplossing {#tips-and-troubleshooting}

**Runlogs controleren:**

```bash
ls ~/.oma/schedule/runs/sch_abcdefgh2345/
cat ~/.oma/schedule/runs/sch_abcdefgh2345/2026-06-16T09-00-00-000Z.md
```

**Job toont `missing-in-os` na een systeemherstart:**

Voer `oma schedule sync` uit om alle manifestjobs opnieuw bij de OS-scheduler te registreren.

**Job is uitgevoerd, maar vendorcredentials waren verlopen:**

Controleer op macOS (launchd) en Linux (systemd) `~/.oma/schedule/runs/<id>/stderr.log` op `re-auth required: <vendor>`. Het runlog `<timestamp>.md` bevat de eigen uitvoer en exitcode van de agent. De backends crontab en Task Scheduler bewaren deze stderr niet; voer `oma schedule run <id>` in een terminal uit om hem te zien. Authenticeer opnieuw met de vendor-CLI (bijvoorbeeld `claude login` of `codex login`) en voer `oma schedule run <id>` handmatig uit om dit te controleren vóór de volgende geplande uitvoering.

**Een job wijzigen:**

Er is geen `schedule update`. Maak eerst de vervangende job aan en verwijder daarna de oude ID met `oma schedule delete <old-id>`. `--env` kopieert de waarden van variabelen op het moment dat de job wordt aangemaakt; maak de job na het roteren van een geheim dus opnieuw aan met de nieuwe waarde geëxporteerd in je shell.

**`--every` heeft mijn interval afgerond:**

Wanneer oma je interval afrondt, print het een notitie met de wijziging. Gebruik `--cron` met een expliciete expressie met 5 velden als je een precies interval nodig hebt dat niet netjes door 60 minuten of 24 uur deelt.

**Alle jobs voor een project verwijderen:**

```bash
# List jobs for a specific project, then remove each
oma schedule list --json | jq -r '.jobs[] | select(.projectLabel == "my-project") | .id' \
  | xargs -I{} oma schedule delete {}
```

**Windows-ondersteuning:**

Op Windows gebruikt oma `schtasks` om jobs te registreren. Registraties in Task Scheduler kunnen niet worden teruggelezen, dus `schedule list` meldt elke geregistreerde job als `stale`, en `schedule sync` (ook uitgevoerd door `oma update`) registreert ze allemaal opnieuw. Beschouw `stale` op Windows als verwacht; `missing-in-os` en `orphan-in-os` wijzen nog steeds op drift.

Let op: `schtasks` kan niet elke cronvorm uitdrukken. Ondersteunde vormen zijn `*/N * * * *` (elke N minuten), `M * * * *` (elk uur op :M), `M H * * *` (dagelijks), `M H * * D` (wekelijks; `D` kan één dag zijn, een bereik zoals `1-5` of een kommagescheiden lijst zoals `1,3,5`) en `M H D * *` (maandelijks). Andere expressies (bijvoorbeeld een kommagescheiden lijst in het minuutveld) worden op Windows tijdens `schedule create` geweigerd.

`--every` levert alleen een ondersteunde vorm op voor minuutintervallen die 60 delen (bijvoorbeeld `--every 5m` of `--every 30m`). Uur- en dagintervallen (`--every 2h`, `--every "every 6 hours"`, `--every 1d`) en uurstappen zoals `--cron "0 */4 * * *"` leveren `0 */N * * *` of `0 0 */N * *` op, die Task Scheduler bij `schedule create` weigert. Gebruik op Windows in plaats daarvan een vast tijdstip, bijvoorbeeld `--cron "0 9 * * 1-5"`.

---

## Zie ook {#see-also}

- [Project Harness Evolution](./harness-evolution.md) — de ingebouwde `__builtin__`-job die skillverbetering binnen een budget uitvoert.
- [Harness Evaluation](./harness-eval.md) — hoe de evaluatiecommando’s samenhangen.
