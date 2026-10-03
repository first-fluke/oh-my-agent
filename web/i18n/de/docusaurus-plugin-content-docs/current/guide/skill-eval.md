---
title: "Skill-Nutzwert-Evaluierung"
sidebar_label: Skill-Evaluierung
description: Aufgabefixtures für oma skill eval, die Konvention des Verzeichnisses .agents/eval/, Prüfertypen und Mock-/Live-Ausführungsmodi erstellen.
---

# Skill-Nutzwert-Evaluierung

`oma skill eval` misst, ob das Laden eines Skills die Ergebnisse von Agentenaufgaben tatsächlich verbessert. Es beantwortet eine andere Frage als `oma skill audit` (dort geht es um die Redundanz zweier Skills): Es fragt „Hilft dieser Skill?“

Das Design folgt zwei Forschungsergebnissen: WikiSkill (arXiv:2608.27454) trennt rohe Erfahrung, persistentes Wissen und ausführbare Skills und behält dabei zurückgehaltene Gates für die Weiterentwicklung bei; SkillLens (arXiv:2605.23899) zeigt, dass der Nutzwert eines Skills unabhängig von der Eigenständigkeit seiner Beschreibung ist — ein eigenständiger Skill kann nutzlos bleiben, und ein überlappender Skill kann trotzdem helfen.

---

## So funktioniert es

Für jede Aufgaben-Fixture führt der Befehl zwei Arme aus:

1. **Baseline-Arm** — der Aufgaben-Prompt wird an einen Agenten verteilt, ohne den Skill bereitzustellen.
2. **Treatment-Arm** — `SKILL.md` wird dem Prompt vorangestellt und danach dieselbe Aufgabe verteilt.

Jeder Arm wird vom Checker der Aufgabe bewertet (0 = nicht bestanden, 1 = bestanden). Die primäre Kennzahl ist:

```
utilityLift = weighted_mean(treatment scores) − weighted_mean(baseline scores)
```

Ein Skill besteht, wenn `utilityLift ≥ 5%`. Unterhalb dieser Schwelle gibt es eine Warnung (marginaler Lift) oder ein Nichtbestehen (kein Lift). Für ein Urteil sind mindestens 5 bewertbare Aufgaben erforderlich.

---

## Die Konvention `.agents/eval/<skill>/`

Legen Sie Aufgaben-Fixtures unter `.agents/eval/<skill>/` ab. Dieser Pfad liegt innerhalb von `.agents/`, aber außerhalb des Skill-Verzeichnisses selbst. Dadurch bleibt er bei `oma update` erhalten und überschreibt keine benutzererstellten Evaluierungen.

```
.agents/eval/
└── oma-scholar/
    ├── claims-only.yaml        ← task fixture
    ├── entity-lookup.yaml
    ├── partial-fetch.yaml
    ├── structured-output.yaml
    ├── edge-empty-response.yaml
    └── _rollouts/
        └── a3f1b2c4d5e6f7a8.json   ← recorded arm outputs + judge verdicts
```

Dateien, die mit `_` beginnen, werden beim Laden von Aufgaben-Fixtures übersprungen. Das Unterverzeichnis `_rollouts/` enthält aufgezeichnete Ausgaben früherer `--live --record`-Läufe.

---

## Schema der Aufgaben-Fixture

Jede Fixture ist eine YAML-Datei mit den folgenden Feldern:

```yaml
id: claims-only
skill: oma-scholar
domain: research
prompt: "Fetch claims-only for knows:generated/reconvla/1.0.0"
checker:
  type: judge
  rubric: "Does the answer fetch ONLY the claims via the section=statements partial fetch?"
weight: 1
```

| Feld | Erforderlich | Beschreibung |
|:------|:---------|:-----------|
| `id` | Ja | Eindeutige ID für diese Aufgabe (wird in Rollout-Dateinamen und Berichten verwendet) |
| `skill` | Ja | Zu evaluierender Skill (entspricht dem Namen des übergeordneten Verzeichnisses) |
| `domain` | Ja | Bezeichnung der Domäne, verwendet für die Gruppierung und die Auswahl von Nachbaraufgaben zur Untersuchung negativer Übertragung |
| `prompt` | Ja | Aufgaben-Prompt, der an beide Arme verteilt wird |
| `checker` | Nein | Bewertung der Armausgabe. Standard ist `{ type: judge }`, wenn das Feld fehlt. |
| `weight` | Ja | Relatives Gewicht im gewichteten Mittelwert (verwenden Sie `1`, sofern Aufgaben keine unterschiedliche Bedeutung haben) |
| `group` | Nein | Familienbezeichnung. `oma skill optimize` hält Fixtures, die dieselbe Gruppe teilen, in derselben Trainings-/Validierungs-/Final-Test-Partition, damit ein Beinahe-Duplikat nicht über die Aufteilung hinweg durchsickert. |

### Prüfertypen

#### judge (Standard)

Ein LLM bewertet die Ausgabe des Arms anhand einer Rubrik und gibt PASS oder FAIL zurück. Dies ist der Standard, wenn `checker` fehlt oder `checker.type` nicht vorhanden ist.

```yaml
checker:
  type: judge
  rubric: "Does the answer correctly cite the source and avoid hallucination?"
```

Das Feld `rubric` ist optional. Fehlt es, gilt die Standardrubrik: „Erfüllt die Antwort den Aufgaben-Prompt korrekt und vollständig?“

Sie können die Rubrik zur Kürze auch auf der obersten Ebene angeben:

```yaml
id: minimal-fixture
skill: oma-scholar
domain: research
prompt: "What are the main claims in paper X?"
rubric: "Does the answer enumerate the main claims without adding fabricated ones?"
weight: 1
```

**Wichtig:** Im `--mock`-Modus benötigen judge-Aufgaben ein zuvor aufgezeichnetes Urteil in `_rollouts/`. Gibt es für eine Aufgabe kein aufgezeichnetes Urteil, wird sie mit einer Warnung aus dem Bericht ausgeschlossen. Führen Sie zuerst `--live --record` aus, um die Rollouts zu füllen.

Dasselbe gilt für jeden Prüfertyp, wenn ein Arm vollständig fehlt: Die Aufgabe wird ausgeschlossen und nicht mit 0 bewertet. Fehlende Daten sind keine fehlgeschlagene Antwort — eine Bewertung würde beide Arme zu 0 machen und ein Lift von null würde `decision: "fail"` lesen. Ausschlüsse, die die Zahl bewerteter Aufgaben unter `MIN_TASKS` senken, führen zu `coverage: "insufficient"`.

#### assert (opt-in)

Deterministische Teilstring-Prüfung. Verwenden Sie sie für Vertrags-, Format- oder Tool-Call-Prüfungen, bei denen die erwartete Ausgabe exakt ist.

```yaml
checker:
  type: assert
  expect_contains:
    - "section=statements"
    - "partial_fetch=true"
```

Besteht, wenn jeder String in `expect_contains` in der Armausgabe vorkommt.

#### regex (opt-in)

Deterministische Regex-Prüfung. Verwenden Sie sie, wenn ein Muster statt einer exakten Zeichenfolge nötig ist.

```yaml
checker:
  type: regex
  pattern: "section=\\w+"
```

Muster mit mehr als 200 Zeichen werden mit 0 bewertet (ReDoS-Schutz). Vor der Übereinstimmung wird die Ausgabe auf 10.000 Zeichen gekürzt.

---

## Ausführungsmodi

### --mock (Standard)

Spielt aufgezeichnete Rollouts aus `_rollouts/` ab. Vollständig deterministisch und offline — kein LLM wird aufgerufen.

- Für `assert`-/`regex`-Prüfer werden Scores aus den aufgezeichneten Ausgabestrings berechnet.
- Für `judge`-Prüfer wird das von `--live --record` aufgezeichnete Feld `score` wiedergegeben.

Fehlt für eine judge-Aufgabe ein aufgezeichneter Score in `_rollouts/`, wird sie mit einer Konsolenwarnung aus dem Bericht ausgeschlossen. Dadurch bleibt der Mock-Modus strikt offline.

Aufzeichnungen werden vor der Verwendung auch auf Veraltetheit geprüft. Geänderte SKILL.md-Texte, Prompts, Aufgaben-/Prüfer-Verträge, effektive Judge-Rubriken und Revisionen des Evaluator-Protokolls machen die betroffenen Einträge ungültig. Fehlende Provenance wird ebenfalls verworfen, mit einer Warnung, die Datei und Anzahl nennt. Bleiben dadurch weniger als `MIN_TASKS` bewertbare Aufgaben, meldet der Lauf `coverage: "insufficient"` statt eines Urteils.

:::note `oma skill optimize --mock`
Der Optimierer bewertet Kandidateninhalte von SKILL.md. Da eine Aufzeichnung nur für den Text gültig ist, mit dem sie erstellt wurde, besitzen Kandidaten keine passenden Rollouts und melden fehlende Abdeckung. Verwenden Sie `--live`, um Kandidaten zu bewerten.
:::

Sicher für CI. Setzen Sie `OMA_SKILLEVAL_MOCK=1`, um diesen Modus zu erzwingen.

```bash
oma skill eval --skill oma-scholar
```

### --live

Startet echte Agentenarme über `oma agent spawn --read-only`. Jeder Aufgabenarm läuft in einem eigenen temporären Workspace, sodass von einem Arm erzeugte Dateien keinen anderen Arm beeinflussen. Prozessfehler, API-Fehler-Envelopes und Judge-Fehler schließen den gesamten gepaarten Vergleich von Bewertung und Aufzeichnung aus; Teilausgaben sind Diagnosedaten.

Vor dem Dispatch gibt der Befehl eine Kostenvorschau mit Zahl der Aufgaben, Arm-Dispatches, Judge-Dispatches und aufgelöstem Vendor aus. Bestätigen Sie mit `y` oder überspringen Sie mit `--yes`.

Die übrigen Steuerungen sind in CI und bei der Untersuchung der Coverage nützlich:

| Option | Wirkung |
| --- | --- |
| `--task-dir <path>` | Fixtures aus einem anderen Verzeichnis als `.agents/eval/<skill>` evaluieren. |
| `--max-tasks <n>` | Zahl der Fixtures für einen begrenzten Live-Lauf beschränken. |
| `--trials <n>` | Jeden Arm `n`-mal wiederholen (1-10). Der zuerst gestartete Arm wechselt zwischen den Durchläufen ab, die Scores pro Aufgabe werden gemittelt, und der Bericht enthält zusätzlich die Varianz innerhalb der Aufgaben. Nachbaraufgaben aus `--neg-transfer` laufen einmal. |
| `--neg-transfer` | Den Kandidaten-Skill an Aufgaben derselben Domäne messen, die zu anderen Skills gehören; standardmäßig deaktiviert. |
| `--routing` | Aktivierung messen: Für jede Aufgabe fragen, welcher installierte Skill angesichts der `description` jedes Skills geladen würde. Live misst (ein zusätzlicher Dispatch pro Aufgabe); Mock gibt eine unter demselben Katalog erstellte Routing-Aufzeichnung wieder. |
| `--require-coverage` | Mit Exit-Code ungleich null enden, wenn weniger als fünf bewertbare gepaarte Aufgaben übrig bleiben oder eine angeforderte Prüfung auf negative Übertragung unvollständig ist. |

```bash
# Preview and confirm
oma skill eval --skill oma-scholar --live

# Skip confirmation
oma skill eval --skill oma-scholar --live --yes
```

#### Messung der negativen Übertragung

Mit `--neg-transfer` läuft jede ausgewählte Nachbaraufgabe zweimal: zuerst eine frische Baseline ohne den Kandidaten, danach ein Treatment mit dem exakt injizierten Kandidatentext. Nachbarn sind die Aufgaben anderer Skills in derselben `domain`. Teilt kein anderer Skill die Domäne, wird stattdessen eine begrenzte domänenübergreifende Stichprobe (bis zu sechs Aufgaben, verteilt auf die anderen Skills) verwendet, und `negativeTransferCoverage.scope` meldet `cross-domain`; Störungen durch einen injizierten Text sind nicht auf die eigene Domäne beschränkt, und eine Domäne, die kein anderer Skill teilt, darf die Prüfung nicht unmöglich machen. Beide Arme verwenden denselben Evaluator und getrennte leere Workspaces. Das Delta ergibt sich aus Treatment-Score minus Baseline-Score; ein negativer Wert bedeutet, dass der Kandidat diese Nachbaraufgabe geschädigt hat. Die Live-Vorschau enthält diese zusätzlichen Arm- und Judge-Dispatches. `--max-tasks` begrenzt auch die Nachbar-Stichprobe, mit einer Warnung, wenn Aufgaben ausgelassen werden.

Verwenden Sie `--live --neg-transfer --record`, um kandidatenspezifische Vergleiche unter `.agents/eval/<candidate>/_negative-transfer/<neighbor>/<body-hash>/_rollouts/` zu speichern. Die Mock-Wiedergabe erfordert übereinstimmende Kandidaten-Identität, übereinstimmenden Text-Hash und vollständigen Aufgaben-/Prüfer-Hash sowie eine gemeinsame Vergleichs-ID für beide Arme. Die gewöhnlichen Evaluierungsaufzeichnungen einer Nachbaraufgabe können diese Messung nicht ersetzen.

Jeder Eintrag in `negativeTransfer` enthält `trials` (die gepaarten Vergleiche hinter `delta`). Die Optimierung misst einen regressierten Nachbarn vor der Ablehnung eines Kandidaten einmal erneut und ergänzt `confirmed` (`true`, wenn auch die Wiederholung regressierte, `false`, wenn nicht); `oma skill eval --neg-transfer` meldet den einzelnen Vergleich. Der Bericht enthält `negativeTransferCoverage` mit `status`, `expected` und `scored`. Der Status ist `not-requested`, wenn das Flag fehlt, `measured`, wenn jeder ausgewählte Nachbar ein gültiges gepaartes Ergebnis hat und die Stichprobe nicht leer ist, und `insufficient` bei null Nachbarn oder jedem fehlenden Vergleich. Ein leeres `negativeTransfer`-Array belegt daher nicht, dass keine Regressionen vorliegen. Das JSON-Feld `ok` ist false, wenn die angeforderte Coverage für negative Übertragung unzureichend ist.

#### Skill-Isolierung (Baseline ehrlich halten) {#skill-isolation-keeping-the-baseline-honest}

`utilityLift` ist nur aussagekräftig, wenn der **Baseline-Arm ohne Zielskill läuft**. Die Schwierigkeit: Ein verteilter Agent lädt automatisch jeden in seiner Laufzeit installierten Skill. Eine naive Baseline würde also weiterhin den Skill aufnehmen, der eigentlich gemessen werden soll — Baseline ≈ Treatment, Lift ≈ 0.

Um dies zu verhindern, führt `--live` **beide Arme in getrennten temporären Workspaces** aus. Geschützte Claude- und Codex-Profile deaktivieren die automatische Erkennung von Skills und Anweisungen sowie Agentenwerkzeuge. Das Treatment erhält den Zielskill **nur** über die injizierte `SKILL.md`. Explorative Profile verwenden ein gefiltertes Skill-Verzeichnis ohne den Zielskill, was für sich allein aber keine Isolation beweist.

Ein sauberes Arbeitsverzeichnis verbirgt die projektlokale Skill-Erkennung, doch die Isolation zur Laufzeit hängt auch vom Vendor-Profil ab. Der Bericht gibt über `isolation` die verifizierte Stufe an:

| Status | Bedeutung |
|---|---|
| `enforced` | Geschütztes Claude mit gültiger Ziel-ID und ohne HOME-Kopie oder natives Codex mit Unterdrückung von Erkennung und Werkzeugen sowie Thread-Prüfungen zur Laufzeit. Ein fehlgeschlagener Laufzeitvertrag bricht den Dispatch ab. |
| `best-effort` | Eine Laufzeit ohne geschütztes Textprofil, eine ungültige Ziel-ID oder eine HOME-Kopie bei Claude; die Isolation ist nicht verifiziert. |
| `unavailable` | HOME-basierter Vendor (z. B. **antigravity**, der `~/.gemini/antigravity-cli/skills` liest); ein sauberes CWD kann ihn nicht verbergen. Warnung und geringe Sicherheit. |
| n/a | Mock-Modus — kein Live-Dispatch. |

Andere Laufzeitprofile bleiben für die explorative Evaluierung verfügbar, aber Ergebnisse mit `best-effort` und `unavailable` blockieren die Hochstufung bei der Live-Optimierung. Der Evaluations-Vendor folgt der Modellkonfiguration des Projekts. Codex verwendet seinen nativen CLI-Login und das konfigurierte Modell bzw. den konfigurierten Provider über `app-server`; es wechselt nicht stillschweigend zu Claude oder zu einem API-Key-Client. Der geschützte Codex-Vertrag zielt auf CLI 0.154.x unter macOS/Linux mit nativer dateibasierter Credential-Speicherung und einer vorhandenen `auth.json`. Ein privates temporäres Konfigurationsverzeichnis verweist auf die ursprünglichen Konfigurations- und Auth-Dateien und schließt dabei den gemeinsamen Bootstrap-Zustand aus; Credentials werden nicht kopiert, und die native Erneuerung verwendet die ursprüngliche Auth-Datei. Keyring-, Auto- und flüchtige Credential-Speicher werden derzeit nicht unterstützt. Nicht unterstützte Versionen, Speichermodi und Vertragsfehler werden zu Dispatch-Fehlern.

Judges laufen in frischen temporären Verzeichnissen mit deaktiviertem Optimierungsspeicher. Claude- und Codex-Judges verwenden denselben geschützten Text-Transport wie die Evaluierungsarme. Die Vendor-Konfiguration des Judges ist für den Lauf fest.

### --live --record

Führt Live-Arme aus und schreibt die erfassten Ausgaben (einschließlich Judge-Urteilen für judge-Prüfungen) nach `_rollouts/<hash>.json`. Der Dateiname ist ein deterministischer SHA-256-Hash der Aufgaben-ID-Menge und nicht datums- oder zufallsbasiert.

Verwenden Sie dies, um auf dem eigenen Rechner die Grundlage für `--mock`-Läufe zu schaffen, damit Wiederholungsläufe offline bleiben.

Jeder Eintrag enthält Provenance, damit eine spätere Wiedergabe prüfen kann, ob er noch gilt:

| Feld | Aufgezeichnet bei | Verglichen mit |
|---|---|---|
| `skillBodyHash` | nur `treatment` | dem zu evaluierenden SKILL.md-Text |
| `promptHash` | beide Arme | dem aktuellen `prompt` der Fixture |
| `taskHash` | beide Arme | der vollständigen Aufgabe, dem effektiven Prüfer bzw. der Standard-Judge-Rubrik und `SKILL_EVAL_PROTOCOL_REVISION` |
| `trial` | beide Arme (`--trials` > 1) | koppelt Baseline und Treatment einer Wiederholung; fehlt bei einem einzelnen Durchlauf |
| `judgeResponse` | judge-Aufgaben | der entpackte Urteilstext des Judges (begrenzt), aufbewahrt, damit ein gespeicherter `score` nachprüfbar ist |

Arm-Ausgaben werden als Antworttext aufgezeichnet. Gibt eine Vendor-CLI einen JSON-Ergebnis-Envelope zurück, wird das Feld `result` gespeichert und bewertet; die Verwaltungsdaten des Envelopes werden von `assert`-/`regex`-Prüfern nie abgeglichen und vom Judge-Parser nie gelesen.

Der Baseline-Arm enthält den Skill nicht; eine alleinige Änderung von SKILL.md macht seine Aufzeichnung nicht ungültig. Änderungen am Aufgaben- oder Evaluator-Vertrag machen beide Arme ungültig. Die Live-Aufzeichnung führt beide Arme erneut aus.

Aufzeichnungen aus der Zeit vor der vollständigen Provenance von Aufgabe und Evaluator müssen mit `--live --record` neu erzeugt werden (und mit `--neg-transfer` für Nachbarvergleiche); das Hinzufügen neuer Hashes zu alten Scores kann diese nicht verifizieren. Derselbe Vertrag fließt in die Identität der Optimierungs-Suite ein, daher wird früheres suite-bezogenes Wissen unter dem aktualisierten Vertrag nicht wiederverwendet. Pflegen Sie `SKILL_EVAL_PROTOCOL_REVISION`, indem Sie die Revision erhöhen, wenn sich das Verhalten des Scorers, die Judge-Prompts bzw. das Parsen der Urteile oder anderes implizites Evaluator-Verhalten ändert.

:::caution `_rollouts/` ist nur lokal — nicht committen
Eine Aufzeichnung wird nur für genau den SKILL.md-Text wiedergegeben, für den sie erstellt wurde. Bearbeiten Sie einen Skill, werden seine Treatment-Aufzeichnungen beim nächsten `--mock`-Lauf verworfen. Eine committete Aufzeichnung wäre nach der nächsten Änderung an SKILL.md veraltet und würde bei allen, die das Repository abrufen, Warnungen auslösen. Das Verzeichnis ist gitignored; zeichnen Sie lokal auf.
:::

```bash
oma skill eval --skill oma-scholar --live --record --yes
```

Nach einem erfolgreichen Live-Lauf enthält der Bericht Baseline- und Treatment-Zahlen, `utilityLift`, `coverage: "ok"`, den Isolationsstatus und die Entscheidung pass/warn/fail. Ein späterer Mock-Lauf verwendet nur Aufzeichnungen, deren Aufgaben-Prompts und Treatment-Skill-Text weiterhin übereinstimmen.

---

### Parallelität und Dispatch-Timeouts

Live-Arme, Nachbararme, Judge-Aufrufe und Routing-Sonden laufen über einen begrenzten Pool von `OMA_SKILL_EVAL_CONCURRENCY` Subprozessen (Standard 4, höchstens 16). Die beiden Arme eines Durchlaufs laufen immer gemeinsam in getrennten leeren Verzeichnissen, wobei der zuerst gestartete Arm zwischen den Durchläufen wechselt, und die Ergebnisse behalten die Aufgabenreihenfolge, sodass Aufzeichnungen und Scores denen eines seriellen Laufs entsprechen. Setzen Sie die Variable auf 1, um zu serialisieren.

Jeder Live-Arm und jeder Judge-Aufruf wird nach `OMA_SKILL_EVAL_TIMEOUT_MS` abgebrochen (Standard 180000). Ein Dispatch mit Timeout wird einmal wiederholt, bevor die Aufgabe aus dem Bericht ausgeschlossen wird, weil eine einzelne langsame Antwort ein Transportfehler und keine Antwort ist; ein zweites Timeout schließt die Aufgabe aus (und verfehlt bei der Optimierung die Coverage des Splits). Erhöhen Sie das Limit für Fixtures, die berechtigterweise lange Antworten benötigen.

## Routing: Wird der Skill ausgewählt?

Der Nutzwert-Lift misst, was der Text bewirkt, sobald er geladen ist. Vendors entscheiden anhand der Frontmatter-`description`, ob ein Skill geladen wird, daher ist ein besserer Text, der nie ausgewählt wird, keine Verbesserung. `--routing` sendet jeden Aufgaben-Prompt zusammen mit Name und Beschreibung jedes installierten Skills an dasselbe geschützte Modell und fragt nach dem einen Skill, den es laden würde (oder `NONE`). Wird das Ziel gewählt, ist das eine Aktivierung; ein anderer Skill ist ein Fehlrouting; `NONE` ist ein Nichttreffer.

```text
  routing: measured  activated 5/6 (83%)  misrouted 1 [oma-docs×1]  none 0  unparsed 0  catalog 33
```

Der JSON-Bericht enthält `routing` mit `status`, Zählwerten, `activationRate`, `misroutedTo` und `catalogSize`; jeder Befund enthält `routing: target | other | none | unparsed`. Mit `--record` werden die Auswahlentscheidungen zusammen mit einem Hash des Katalogs in `_rollouts/<hash>.routing.json` gespeichert. Ein späteres `--mock --routing` gibt sie nur wieder, solange jede Beschreibung und jede Aufgabe unverändert ist; andernfalls ist `status` gleich `stale`, und nichts wird gezählt.

Dies misst die Beschreibung gegenüber dem Katalog über den geschützten Transport. Es testet nicht den eigenen Erkennungsmechanismus des Vendors, den das geschützte Profil absichtlich deaktiviert, und misst nicht, ob der Ablauf des geladenen Skills befolgt wird; das bleibt Aufgabe der Nutzwert-Messung.

## Ein minimales funktionierendes Fixture-Set

Für ein Urteil sind fünf Fixtures erforderlich (`MIN_TASKS = 5`). Hier ist ein minimales Set für einen imaginären Skill `oma-scholar`:

```yaml
# .agents/eval/oma-scholar/claims-only.yaml
id: claims-only
skill: oma-scholar
domain: research
prompt: "Fetch claims-only for knows:generated/reconvla/1.0.0"
rubric: "Does the answer fetch ONLY the claims via the section=statements partial fetch?"
weight: 1
```

```yaml
# .agents/eval/oma-scholar/entity-lookup.yaml
id: entity-lookup
skill: oma-scholar
domain: research
prompt: "Look up the entity knows:concept/attention-mechanism"
rubric: "Does the answer return the entity name, description, and at least one related concept?"
weight: 1
```

Wiederholen Sie dies für mindestens drei weitere Aufgaben. Führen Sie danach aus:

```bash
# Seed rollouts (local only — re-run after any SKILL.md edit)
oma skill eval --skill oma-scholar --live --record --yes

# Offline replay
oma skill eval --skill oma-scholar --json
```

---

## Bericht lesen

**Textausgabe:**

```
Skill utility eval  (skill: oma-scholar)
  tasks: 7
  isolation: enforced [claude]

  baseline: 42.9%  treatment: 71.4%
  utilityLift: 28.6%  (stddev: 14.3%)
  [PASS]
  Skill shows positive utility lift >= 5%.

  Per-task findings:
    claims-only: baseline=0 treatment=1 lift=+1.000
    entity-lookup: baseline=1 treatment=1 lift=+0.000
    ...

  Thresholds: fail <= 0%, warn < 5%
```

**JSON-Ausgabe** (über `--json`):

```json
{
  "ok": true,
  "skill": "oma-scholar",
  "taskCount": 7,
  "coverage": "ok",
  "decision": "pass",
  "baselineScore": 0.4286,
  "treatmentScore": 0.7143,
  "utilityLift": 0.2857,
  "utilityStdDev": 0.1429,
  "repeatability": {
    "trials": 1,
    "liftCi95": { "lower": 0.0918, "upper": 0.4796 },
    "withinTaskStdDev": null,
    "status": "single-trial"
  },
  "findings": [
    { "taskId": "claims-only", "baseline": 0, "treatment": 1, "lift": 1.0, "trials": 1, "liftStdDev": 0, "routing": "target" }
  ],
  "usage": { "status": "actual", "dispatches": 14, "inputTokens": 61234, "outputTokens": 9876, "costUsd": 0.8123, "judge": { "status": "actual", "dispatches": 6, "inputTokens": 12000, "outputTokens": 30, "costUsd": 0.1401 } },
  "routing": { "status": "measured", "measured": 7, "activated": 6, "misrouted": 1, "none": 0, "unparsed": 0, "activationRate": 0.8571, "misroutedTo": { "oma-search": 1 }, "catalogSize": 33 },
  "negativeTransfer": [],
  "negativeTransferCoverage": { "status": "not-requested", "expected": 0, "scored": 0 },
  "isolation": "enforced",
  "isolationVendor": "claude"
}
```

`usage` summiert, was der Vendor für die bewerteten Arme und getrennt davon für deren Judge-Aufrufe gemeldet hat: Zahl der Dispatches, Eingabe- und Ausgabe-Tokens (einschließlich Cache-Lese- und -Schreibzugriffen) und Kosten in USD. `status` ist `actual`, wenn jeder Dispatch Nutzungsdaten gemeldet hat, `partial`, wenn einige keine gemeldet haben, und `unknown`, wenn keiner welche gemeldet hat (ein reiner Text-Transport wie die Codex-Bridge meldet nichts). Aufgezeichnete Rollouts tragen `usage` und `judgeUsage` pro Eintrag, sodass eine Mock-Wiedergabe die Kosten der wiederverwendeten Aufzeichnung meldet und nicht null.

`repeatability` trennt die Variation auf Aufgabenebene von der Variation zwischen Wiederholungen. `liftCi95` ist ein gepaartes 95-%-t-Intervall über die Lifts pro Aufgabe (null bei weniger als zwei bewerteten Aufgaben). Bei `--trials` von zwei oder mehr ist `withinTaskStdDev` die mittlere aufgabenweise Standardabweichung des Lifts pro Durchlauf, und `status` ist nur dann `stable`, wenn das Intervall die Null auf der Seite des Lifts ausschließt; andernfalls ist er `unstable`, und ein `pass` wird zu `warn` herabgestuft. Ein Lauf mit einem einzelnen Durchlauf meldet `single-trial`: Er kann einen Lift zeigen, aber nicht, dass sich der Lift wiederholt.

`ok` ist nur dann `true`, wenn `coverage === "ok"`, `decision === "pass"` und eine angeforderte Prüfung auf negative Übertragung ausreichende Coverage hat. Das Feld `isolation` meldet, ob der Baseline-Arm wirklich ohne Zielskill lief (siehe [Skill-Isolierung](#skill-isolation-keeping-the-baseline-honest)); im `--mock`-Modus ist `isolation` gleich `"n/a"`.

---

## CI-Integration

```bash
# Fail the build if the skill regresses or has insufficient coverage
oma skill eval --skill oma-scholar --json --require-coverage
```

Exit-Codes:
- `0` — bestanden oder Warnung
- `1` — fehlgeschlagen oder unzureichende Coverage bei Aufgaben oder negativer Übertragung mit `--require-coverage`

---

## Live oder Mock auswählen

Verwenden Sie `--live` mit judge-Prüfern, um den tatsächlichen Nutzwert für offene Aufgaben zu messen. Verwenden Sie `--mock`, um zuvor aufgezeichnete Judge-Urteile offline wiederzugeben oder deterministische `assert`-/`regex`-Vertragsprüfungen auszuführen.

Die Mock-Deterministik bleibt erhalten, indem das binäre Urteil des Judges (PASS/FAIL) während `--live --record` im Rollout-Eintrag gespeichert und dieser Score in späteren `--mock`-Läufen wiedergegeben wird — das LLM wird nicht erneut aufgerufen.

**Datenabfluss:** Während `--live` verteilt der Judge die Ausgabe des Kandidatenarms zur Bewertung an den konfigurierten Vendor. Zu Beginn jedes Live-Laufs wird einmalig gewarnt.

Wenn ein Mock-Lauf unzureichende Coverage meldet, prüfen Sie die Warnung auf verworfene oder fehlende `_rollouts`-Einträge und führen Sie nach der Korrektur von Fixture oder Skill einen Live-Aufzeichnungslauf aus. Die Live-Hochstufung erfordert ein funktionierendes geschütztes Claude- oder Codex-Profil mit `isolation: "enforced"`; andere Profile bleiben explorativ.

---

## Evaluierungsaufgaben mit einem Skill ausliefern

Skills können ein Evaluierungsaufgaben-Set enthalten, indem Fixtures unter `.agents/eval/<skill>/` abgelegt werden. Diese benutzererstellten Dateien liegen außerhalb des Skill-Verzeichnisses und bleiben daher bei `oma update` erhalten. Beim Erstellen eines neuen Skills mit `oma-skill-creation` fügen Sie ein passendes `eval/`-Fixture-Set hinzu, damit künftige Autoren die Wirkung des Skills prüfen können. Siehe `.agents/skills/oma-skill-creation/SKILL.md` für den Workflow zur Skill-Erstellung.
