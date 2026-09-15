---
title: "Incident-Regressionsfälle"
sidebar_label: Incident-Regressionsfälle
description: Einen beobachteten Agentenausfall erfassen, seine Belege sichern und einen Kandidaten-Harness gegen einen expliziten Regressionsvertrag evaluieren.
---

# Incident-Regressionsfälle

`oma harness incident` verbindet einen beobachteten Ausfall mit einem Regressionsfall und der folgenden Kandidaten-Evaluierung. Dabei werden Beobachtungen getrennt von Kausalhypothesen aufgezeichnet. Ein fehlgeschlagener Prozess allein belegt nicht, dass das Modell den Incident verursacht hat.

## Kandidaten finden

```bash
oma harness incident scan            # failed/blocked/partial runs with no captured incident
oma harness incident scan --json
oma harness incident scan --skeleton <run-id> > incidents/run-failure.json
```

Der Scan liest `.agents/state/agent-runs/`, behält Läufe mit dem Status `failed`, `blocked` oder `partial` und verwirft jeden Lauf, auf den ein erfasster Incident bereits über `source.runId` verweist. `--skeleton` gibt eine Spezifikation für einen Lauf aus, in der id, agent, Quell-Lauf, beobachteter Ausfall und Exit-Code ausgefüllt sind, ebenso das Ende der Agentenausgabe, sofern der Runner sie aufbewahrt hat; `expected_checks` bleibt ein `TODO`, weil das korrekte Verhalten eine Entscheidung ist, die der Scan nicht treffen kann. `oma agent spawn` und `oma agent parallel` bewahren die letzten 64 KiB des Logs jedes Laufs als `.agents/state/agent-runs/<run-id>.output.txt` auf und verweisen aus dem Laufdatensatz darauf, weshalb `capture --run` diese Ausgabe als Beobachtung importiert, wenn die Spezifikation keine enthält, und `incident promote` die daraus abgeleitete Fixture dagegen prüfen kann. Füllen Sie die Spezifikation aus und erfassen Sie sie danach mit `--run <run-id>`, damit Laufidentität und Workspace-Fingerprint erhalten bleiben.

## Fehlgeschlagenen Lauf automatisch erfassen

```bash
oma harness feedback --scan-runs            # capture, promote, report
oma harness feedback --scan-runs --live     # and optimize the affected skills
```

Ein fehlgeschlagener, blockierter oder teilweiser Lauf, dessen Aufgabe einen Vertrag hatte, braucht keine handgeschriebene Spezifikation. Erwartetes Verhalten sind die Abnahmekriterien des Vertrags, die vor dem Lauf festgelegt wurden; die unerfüllte Menge bilden die von einem fehlgeschlagenen Verifizierungsbeleg abgedeckten Kriterien, oder alle Kriterien, wenn der Lauf nie verifiziert hat. Der Opt-Agent schreibt die unerfüllten Kriterien als Judge-Rubrik (`PASS only if …`) um, der Judge bewertet die erhaltene Ausgabe des Laufs selbst dagegen, und der Incident wird nur erfasst, wenn diese Ausgabe durchfällt: eine Rubrik, die der Ausfall besteht, hat den Ausfall nicht erfasst. Die Spezifikation wird unter `.agents/results/incidents/_specs/<id>.json` geschrieben und mit der Laufidentität erfasst, wobei die Rubrik als Abnahmeprüfung vom Typ `output_judge` mitgeführt wird. Läufe ohne erhaltene Ausgabe, ohne Prompt oder ohne Vertrag werden als nicht erfassbar samt Grund aufgelistet.

`output_judge` ist ein bewerteter Vertrag. Der mechanische Harness-Evaluator meldet ihn als nicht bewertet; sein Zweck ist die Skill-Regressions-Fixture, die `incident promote` mit derselben Rubrik daraus ableitet.

## Incident erfassen

Speichern Sie eine JSON-Spezifikation im Projekt:

```json
{
  "schema_version": 1,
  "id": "incomplete-result",
  "summary": "The agent reported success while the result remained incomplete",
  "prompt": "Complete the task and update result.json",
  "agent": "backend",
  "observed": {
    "failure": "result.json still contained complete=false",
    "output": "success",
    "exit_code": 0
  },
  "initial_workspace": "initial",
  "expected_checks": [
    {
      "type": "file_json_equals",
      "path": "result.json",
      "pointer": "/complete",
      "value": true
    }
  ],
  "evidence_files": ["original-output.txt"],
  "dependencies": []
}
```

`initial_workspace`, `evidence_files` und die Fixture-Pfade der Abhängigkeiten sind relativ zur Spezifikationsdatei. Der Pfad `checker` einer Befehlsprüfung ist relativ zum Projekt. Die Prüfungssyntax entspricht [Harness-Evaluierung](./harness-eval.md). Das Anfangsverzeichnis muss eine mitgegebene Aufgaben-Fixture vor dem Lauf sein, ohne OMA- oder Vendor-Anweisungsdateien; der evaluierte Harness wird separat injiziert.

```bash
oma harness incident capture --spec incidents/incomplete-result.json --json
oma harness incident show incomplete-result --json

# Import prompt and observable metadata from an existing local run
oma harness incident capture --spec incidents/run-failure.json --run <run-id> --json
```

`--run` verweist auf eine vorhandene `.agents/state/agent-runs/<run-id>.json`. Dabei bleiben Lauf- und Sitzungsidentität, Vendor, Status und ursprünglicher Workspace-Fingerprint erhalten. Ein mitgegebener Prompt hat Vorrang vor dem aufgezeichneten Prompt des Laufs. `source.trace_id` kann einen gemeldeten Incident mit einem externen Trace verbinden, ohne ihn abzurufen oder hochzuladen.

Das erfasste Manifest liegt unter `.agents/results/incidents/<id>/incident.json`. Es enthält den Anfangs-Snapshot, sofern mitgegeben, Hashes von Quellbelegen und Prüfer-Dateien, Abnahmeprüfungen, Grenzen und einen Manifest-Hash. Vorhandene IDs können nicht überschrieben werden. Vertraulicher Beobachtungstext wird geschwärzt; die Schwärzung wird als Grenze der exakten Wiedergabe gemeldet. Die Snapshot-Erfassung lehnt nicht unterstützte Dateien ab und hat Grenzen für Dateien, Anzahl und Gesamtgröße. Belegverweise bewahren Hashes und Pfade, nicht Kopien jeder referenzierten Quelldatei.

Das optionale `cause`-Objekt hat `category`, `hypothesis`, `confidence` und `evidence`. Kategorien sind `model`, `tool`, `config`, `context`, `application`, `evaluator` und `unknown`. Ohne Angabe bleibt die Ursache `unknown`.

## Zu einer Skill-Fixture hochstufen

```bash
oma harness incident promote <id> [--skill <id>] [--draft] [--force] --json
```

Ein erfasster Incident wird eine Regressions-Fixture für den Skill, den der fehlgeschlagene Agent ausgeübt hat, damit `oma skill optimize` den Skill dagegen reparieren kann. Die Skill wird ausgewählt, indem der Incident-Prompt gegen den installierten Skill-Katalog mit derselben Sonde auf Beschreibungsebene geroutet wird, die `oma skill eval --routing` verwendet (ein Modellaufruf); wenn das Routing nichts wählt, wird der erste `skills:`-Eintrag der Agentendefinition unter `.agents/agents/<agent>.md` verwendet, sonst der installierte Skill namens `oma-<agent>`. `--skill` übersteuert das, und die Hochstufung zeichnet auf, welcher der drei Wege entschieden hat (`attribution`). Die Fixture wird nach `.agents/eval/<skill>/incident-<id>.yaml` mit `group: incident-<id>` geschrieben, damit sie nie über die Aufteilung in train/validation/test hinwegreicht, und die Hochstufung wird neben dem Incident als `promotion.json` aufgezeichnet. Ein Incident wird genau einmal hochgestuft.

Der Prüfer kommt aus den Abnahmeprüfungen. Wenn jede Prüfung `output_contains` ist, ist die Fixture ein deterministisches `assert`. Sonst können die Prüfungen in einer Skill-Evaluierung nicht laufen (es gibt keine Dateien oder Befehle), deshalb bittet `--draft` den Opt-Agenten um eine Judge-Rubrik, die mit `PASS only if` beginnt und den beobachteten Ausfall nennt. In beiden Fällen wird die Fixture nur angenommen, wenn die aufgezeichnete fehlgeschlagene Ausgabe sie nicht besteht: ein assert, das die beobachtete Ausgabe bereits erfüllt, oder eine entworfene Rubrik, die der Judge auf dieser Ausgabe besteht, wird abgelehnt, weil sie kein Regressionsfall ist. Ein Incident ohne beobachtete Ausgabe kann nicht validiert werden und braucht `--force`, was als Grenze aufgezeichnet wird.

## Den Kreis schließen

```bash
oma harness feedback                 # promote every unpromoted incident, report what changed
oma harness feedback --live          # also run one optimization epoch per affected skill (dry-run)
oma harness feedback --apply --json  # write edits that pass every gate
```

`feedback` ist die Rückkopplungsschleife der Auslieferung in einem Befehl: mit `--scan-runs` wird zuerst jeder nicht erfasste fehlgeschlagene Lauf mit Vertrag erfasst (siehe oben), dann jeder erfasste Incident ohne Fixture hochgestuft, wobei bei Bedarf Rubriken entworfen werden, die betroffenen Skills werden gruppiert, und mit `--live` wird jeder einmal gegen die vergrößerte Suite unter den normalen Gates optimiert (Akzeptanz mit gehaltenen und zurückgehaltenen Daten, bestätigter negativer Übertragung, vom Runner verwalteter Final-Test). Der Bericht unter `.agents/results/feedback/feedback-<ts>.json` listet Hochstufungen, übersprungene Incidents mit Grund und das Ergebnis jedes Skills mit dem Diff auf, sodass die Kette von einem beobachteten Ausfall bis zu einer Kandidatenänderung ein einziger prüfbarer Datensatz ist. Führen Sie ihn aus, nachdem fehlgeschlagene Agentenläufe erfasst wurden, aus einem Scheduler oder einem Post-Run-Hook; `oma schedule create <agent> "Run \`oma harness feedback --scan-runs --apply --json\` and summarize the report" --cron "0 3 * * *"` ist die nächtliche Form, und der Zustands-Snapshot der nächsten Sitzung meldet alles, was er angewendet hat.

Was eine menschliche Entscheidung bleibt: ein Lauf ohne Aufgabenvertrag hat kein aufgezeichnetes erwartetes Verhalten, deshalb listet ihn `incident scan` auf und er wird nur über eine Spezifikation erfasst; `--skeleton` entwirft eine.

## Exportieren und evaluieren

```bash
oma harness incident export incomplete-result --json
oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --record-file incidents/comparison.json --yes --json
```

Der Export materialisiert den gespeicherten Anfangs-Snapshot und eine explorative Suite mit einem Fall. Manifest-Hash und die Identität von Quell-Lauf und Trace wandern mit der Aufgabe in die Evaluierung und die Aufzeichnung. Änderungen an exportierten Dateien, Prompt, Agent, Prüfungen oder festgeschriebenen Prüfer-Quellen entwerten die Wiederverwendung. Legen Sie eine neue Incident-ID an, um den Abnahmevertrag zu ändern.

Standardmäßig startet `reproduce` einen neuen Live-Vergleich von Baseline und Kandidat und zeichnet ihn auf. Die normale Bestätigung der Live-Kosten gilt, außer wenn `--yes` angegeben wird. Dieser Befehl verwendet den für die Harness-Aufgabe konfigurierten Agent-Vendor, einschließlich Codex; er zwingt der Aufgaben-Ausführung nicht das geschützte Compiler-Profil des Skill-Optimierers auf.

Wenn kein Anfangszustand erfasst wurde, funktionieren `capture` und `show` weiterhin, aber ausführbarer Export und Ausführungs-Reproduktion stoppen mit einem Fehler über fehlende Belege. Der aktuelle Working Tree eines historischen Laufs kann seinen ursprünglichen Zustand nicht belegen. Auch ein separat mitgegebener Anfangs-Snapshot beweist keine Gleichwertigkeit mit diesem historischen Lauf; der Bericht nennt diese Grenze.

## Die Belegoperation wählen

```bash
oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --action inspect --record-file incidents/comparison.json --json

oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --action rescore --record-file incidents/comparison.json --json

oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --action fixture-replay --record-file incidents/comparison.json \
  --transcript incidents/tool-responses.json --json

oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --action rerun --record-file incidents/comparison.json --record --yes --json
```

| Operation | Was geschieht |
|---|---|
| `inspect` | Liest gespeicherte Urteile und aggregiert sie. Es laufen keine Prüfungen oder Agenten. |
| `rescore` | Wendet die aktuellen Ausgabe- und Dateiprüfungen auf gespeicherte rohe Belege an. Alte Bestehen-/Durchfallen-Felder werden ignoriert. |
| `fixture-replay` | Spielt mitgelieferte Werkzeugantwort-Daten und Dateiänderungen gegen den aufgezeichneten Anfangszustand ab. Es laufen kein Modell und kein Werkzeugprozess. |
| `rerun` | Startet tatsächliche Baseline- und Kandidaten-Agentenaufrufe aus dem aufgezeichneten Anfangszustand. Das verursacht normale Modellnutzung. |

Für einen geänderten Abnahmevertrag legen Sie eine separate Harness-Suite an und verwenden `oma harness eval --action rescore` mit derselben Suite-, Task- und Incident-Identität und demselben Prompt. Eine exportierte Incident-Suite ist selbst unveränderlich. Siehe [Details zu Aufzeichnung und Wiedergabe](./harness-eval.md) für Anforderungen an rohe Belege und das Werkzeug-Transkript-Schema.

Externe Abhängigkeiten erklären Sie als `{ "name": "service", "repeatability": "fixture|live|unavailable", "reason": "...", "fixture": "response.json" }`. Eine Fixture-Abhängigkeit zeigt auf eine Datei, die das vollständige Harness-Transkript-Schema verwendet, mit der Incident-ID als `taskId`. Die Offline-Incident-Wiedergabe lehnt Live- und nicht verfügbare Abhängigkeiten, fehlende Fixture-Dateien, geänderte Fixture-Hashes, fehlende benannte Antworten sowie Anfrage-, Antwort- und Dateiänderungen ab, die vom festgeschriebenen Transkript abweichen. Sie kann weiterhin nicht belegen, dass der Autor jede externe Abhängigkeit erklärt hat. Auch eine Live-Neuausführung kann nicht garantieren, dass sich ein externer Dienst so verhält wie historisch.

Erfassung, Export und Evaluierung geben lokale `harness.incident.*`-Ereignisse aus, die Incident, Kandidaten- und Baseline-Hashes, Ausführungsmodus sowie die korrigierten oder regressierten Task-IDs verbinden. Ein Incident mit einem Fall ist ein Regressionsbeleg und kein Ersatz für Validierungs- und Final-Test-Suites. Aktuelle Harness-Profile melden `promotionReady: false`; diese Operationen begründen weder die geschützte Final-Test-Isolation noch stufen sie automatisch einen Kandidaten hoch.
