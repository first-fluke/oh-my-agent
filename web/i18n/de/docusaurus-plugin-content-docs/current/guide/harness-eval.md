---
title: "Harness-Evaluierung"
sidebar_label: Harness-Evaluierung
description: Ein vollständiges OMA-Harness-Overlay mit gepaarten, isolierten Repository-Aufgaben und deterministischen Artefaktprüfungen evaluieren.
---

# Harness-Evaluierung

`oma harness eval` misst, ob ein OMA-Harness einen festen Zielagenten verbessert, ohne dessen Modell zu ändern. Das Verfahren übernimmt das Evaluierungsmuster aus [AI4AI at Test-Time: Strong-to-Weak Capability Transfer via Harnesses](https://arxiv.org/abs/2608.12307): Zielmodell festhalten, Harness ändern und Ergebnisse bei denselben Aufgaben vergleichen.

Dieser Befehl evaluiert eine größere Einheit als `oma skill eval`:

| Befehl | Behandlung | Bewertungsziel |
|:--------|:----------|:-------------|
| `oma skill eval` | Ein `SKILL.md`-Text | Agentenausgabe |
| `oma harness eval` | Ein abgegrenztes `.agents/`-Overlay | Dateien und Ausgabe in einem Repository-Workspace |

Verwenden Sie Skill-Evaluation, um die Frage „Hilft dieser Skill?“ zu beantworten. Verwenden Sie Harness-Evaluation für die Frage „Macht diese Kombination aus Skills, Workflows, Regeln und Agentenanweisungen den festen Agenten zuverlässiger beim Erledigen von Repository-Aufgaben?“

## Evaluierungsmodell

Ein Live-Lauf evaluiert jede Aufgabe als gepaartes Experiment:

1. OMA erfasst die Aufgaben-Fixture im Anfangszustand. Ein vollständiger Snapshot befüllt beide Arme, damit sie mit denselben Dateien starten, selbst wenn sich die Quell-Fixture während der Ausführung ändert.
2. OMA kopiert die aktuellen Definitionen von `agents`, `config`, `rules`, `skills` und `workflows` in diesen Workspace und projiziert sie in das ausgewählte Vendor-Format.
3. OMA wiederholt die Einrichtung in einem zweiten frischen Workspace und wendet dort das Kandidaten-Overlay an.
4. Für beide Arme werden derselbe primäre Agent, Vendor-Pfad, Prompt, Schreibberechtigungen und Timeout verwendet.
5. Deterministische Prüfungen untersuchen den resultierenden Workspace und optional die Agentenausgabe. Vertrauenswürdige Befehlsprüfungen laufen anschließend in einer frischen Kopie der Aufgabenartefakte.

Das echte Projekt wird nie als Arbeitsverzeichnis eines Arms verwendet. OMA erfasst die rohe Ausgabe und die finalen Aufgabenartefakte vor den Prüfungen und vor der Bereinigung der temporären Workspaces. Die Sandbox des Prozesses des ausgewählten Vendors bleibt für Zugriffe außerhalb des Arbeitsverzeichnisses maßgeblich.

## Aufbau des Kandidaten

Der Kandidatenpfad ist ein Verzeichnis mit einem Teilbaum von `.agents/`:

```text
candidate/
└── .agents/
    ├── agents/
    │   └── docs-curator.md
    ├── rules/
    │   └── documentation.md
    ├── skills/
    │   └── project-docs/
    │       └── SKILL.md
    └── workflows/
        └── docs-check.md
```

Nur Dateien unter `.agents/agents`, `.agents/rules`, `.agents/skills` und `.agents/workflows` werden akzeptiert. Hooks, Evaluator-Fixtures, State, Ergebnisse, Konfigurationsdateien, Symlinks und Vendor-Agent-Varianten werden abgelehnt. Geschützte Agent-Frontmatter-Felder wie `model`, `tools`, `effort` und Ausführungslimits müssen der Baseline entsprechen. Ein Arm schlägt außerdem fehl, wenn der laufende Agent geschützte `.agents/`-Definitionen vor der Bewertung ändert.

## Suite-Format

Eine Suite besteht aus einer YAML-Datei und einem Fixture-Verzeichnis pro Aufgabe:

```text
harness-eval/
├── suite.yaml
└── fixtures/
    ├── stale-api-doc/
    │   ├── docs/api.md
    │   └── src/session.ts
    └── missing-guide/
        ├── docs/
        └── src/feature.ts
```

```yaml
schema_version: 2
id: docs-harness
agent: docs-curator
tasks:
  - id: stale-api-doc
    partition: validation
    prompt: Update the API documentation to match the implementation.
    workspace: fixtures/stale-api-doc
    weight: 1
    checks:
      - type: file_contains
        path: docs/api.md
        value: openSession
      - type: file_not_contains
        path: docs/api.md
        value: createSession
  - id: missing-guide
    partition: final-test
    prompt: Write the missing guide for the feature in this fixture.
    workspace: fixtures/missing-guide
    checks:
      - type: file_exists
        path: docs/feature.md
```

Version 2 erfordert sowohl `validation`- als auch `final-test`-Aufgaben. Jede Aufgabe muss ihre Partition deklarieren. Validierung ist die Standardpartition; verwenden Sie `--partition final-test` für einen separaten finalen Lauf nach der Kandidatenauswahl. Die beiden Partitionen dürfen Fixture-Verzeichnisse weder gemeinsam nutzen noch ineinander verschachteln. Legen Sie Aufzeichnungsdateien außerhalb von Fixture-Verzeichnissen, Kandidaten-Overlays und Evaluator-Eingaben ab; diese Orte werden abgelehnt, damit spätere Läufe die finalen Prüfungen nicht sehen können. Suites der Version 1 laufen weiterhin als `exploratory`; sie können nicht als Final-Test ausgewählt werden.

Task-IDs müssen eindeutig sein. Fixture- und Prüfpfade müssen innerhalb des Projekts und des Aufgaben-Workspace bleiben. Suites und Fixtures müssen außerdem außerhalb der Baseline-Definitionen bleiben, die in jeden Arm kopiert werden. Fixtures dürfen keine Symlinks oder Steuerungsoberflächen des Agent-Harness wie `.agents`, `.codex`, `.claude`, Vendor-Skill-Verzeichnisse oder Root-Dateien mit Agentenanweisungen enthalten. Dadurch können Aufgabendaten den kontrollierten Harness keines der beiden Arme überschreiben.

Erzeugte Abhängigkeitsverzeichnisse wie `node_modules` und `.venv` werden nicht aus dem Baseline-Harness kopiert. Committen Sie deterministischen Hilfsquelltext und Dependency-Manifeste im Skill; stellen Sie Laufzeitabhängigkeiten in der Aufgaben-Fixture bereit, wenn eine Prüfung sie benötigt.

### Prüfungstypen

| Typ | Felder | Bestehensbedingung |
|:-----|:-------|:---------------|
| `file_exists` | `path` | Der Pfad existiert nach Abschluss des Arms. |
| `file_not_exists` | `path` | Der Pfad existiert nicht. |
| `file_contains` | `path`, `value` | Die Datei existiert und enthält den Wert. |
| `file_not_contains` | `path`, `value` | Die Datei existiert und enthält den Wert nicht. |
| `output_contains` | `value` | Die aufgezeichnete Agentenausgabe enthält den Wert. |
| `output_not_contains` | `value` | Die aufgezeichnete Agentenausgabe enthält den Wert nicht. |
| `output_judge` | `rubric` | Bewerteter Vertrag, der an Incidents mitgeführt wird; der mechanische Evaluator meldet ihn als nicht bewertet (siehe [Incident-Regressionsfälle](./harness-incidents.md)). |
| `file_json_equals` | `path`, `value`, optional `pointer` | Das geparste JSON der Datei entspricht `value`, optional an einem JSON Pointer. |
| `output_json_equals` | `value`, optional `pointer` | Die aufgezeichnete Ausgabe ist gültiges JSON und entspricht `value`, optional an einem JSON Pointer. |
| `command` | `argv`, `checker`, `timeout_ms`, `expected_exit_code` | Der vertrauenswürdige Unterprozess endet innerhalb seines Timeouts und gibt den angegebenen Exit-Code zurück. |

JSON-Assertions vergleichen geparste Werte einschließlich ihrer Typen; Erfolgsmeldungen in Prosa können eine JSON-Zustandsassertion nicht erfüllen. `pointer` verwendet die JSON-Pointer-Syntax wie `/result/count` und bezieht sich standardmäßig auf den gesamten Wert.

Befehlsprüfungen werden vom vertrauenswürdigen Suite-Eigentümer verfasst:

```yaml
- type: command
  argv: [/absolute/path/to/node, "{checker}", state.json]
  checker: checkers/verify-state.mjs
  timeout_ms: 5000
  expected_exit_code: 0
```

`checker` wird relativ zur Suite-Datei aufgelöst. Er muss eine eigenständige reguläre Quelldatei sein, die außerhalb aller Fixtures, des Kandidaten-Overlays und der `.agents`-Definitionen der Baseline gespeichert ist. `argv[0]` muss eine absolute ausführbare Datei außerhalb des Projekts sein; `{checker}` muss ein vollständiges Argument sein. OMA übergibt Argumente direkt ohne Shell-Interpolation. Timeouts müssen positive ganze Zahlen von höchstens 300.000 Millisekunden sein. Exit-Codes sind ganze Zahlen von 0 bis 255.

Vor dem Dispatch erstellt OMA einen Snapshot der Prüfer-Quellbytes und berechnet Hashes der Evaluator-Definitionen und der ausführbaren Datei. Nach dem Dispatch kopiert OMA die Aufgabenartefakte in einen separaten temporären Workspace, schreibt den per Snapshot gesicherten Prüfer außerhalb dieser Artefakte und ruft ihn dort auf. Jeder Befehl erhält eine frische Kopie; ein Prüfer kann die Eingabe der nächsten Prüfung nicht verändern. Erzeugte Harness-Projektionen sind ausgeschlossen, und Artefakt-Symlinks werden abgelehnt. Ändert sich der Prüfer-Quelltext während eines Arms, schlägt dieser Arm fehl; geänderter Quelltext wird nie an die Stelle des Snapshots gesetzt. Der Prüfer sollte feste Assertions gegen Artefakte oder Anwendungsverhalten verwenden und sein Urteil nicht an Tests oder Paket-Skripte delegieren, die der Kandidat ändern kann.

Prüfungen und Prüferpfade werden weder dem Agenten-Prompt noch der Fixture hinzugefügt. Die Eingabe der ausgewählten Aufgabe ist während ihres Laufs zwangsläufig sichtbar. Das schützt die Integrität des Evaluators und trennt die Partitionen; es hindert aber keinen Prozess desselben Benutzers daran, andere Dateien des Hosts zu lesen.

## Ausführen und aufzeichnen

Der Live-Modus führt zwei Dispatches pro ausgewählter Aufgabe aus, zeigt eine Dispatch-Vorschau und verlangt eine Bestätigung:

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --live --record \
  --record-file harness-eval/_runs/trial-1.json
```

Verwenden Sie `--yes` für eine nicht interaktive Ausführung und `--timeout-minutes`, um für beide Arme dasselbe Wandzeitlimit zu setzen. Die Live-Ausführung erfordert einen Vendor, der Harness-Dateien relativ zum Projekt-Workspace findet. OMA verweigert die Suche in HOME, weil die Baseline dort global installierte Kandidateninhalte sehen könnte.

`--record` schreibt eine unveränderliche JSON-Aufzeichnung der Version 2. Der Standardort ist das Verzeichnis `_runs/` neben der Suite, wobei die Hashes von Baseline und Kandidat im Dateinamen stehen. Geben Sie für einen weiteren Live-Lauf mit `--record-file` eine neue Datei an; ein bereits vorhandenes Ziel wird vor dem Dispatch abgelehnt. Aufzeichnungen bewahren:

- Suite-Identität, Partition, Provenance von Prompt und Fixture, Hashes von Baseline und Kandidat sowie Hashes von Evaluator, Prüfer und ausführbarer Datei;
- die ursprüngliche Ausgabe und ihren Hash, einschließlich vorhandener diagnostischer stdout-Ausgabe fehlgeschlagener Dispatches;
- Manifeste der anfänglichen und der finalen Artefakte mit Dateibytes, Hashes pro Datei, Datei- und Verzeichnismodi und einem Manifest-Digest;
- Prüfer-Referenzen, Arm-Ergebnisse, die Incident-Identität (sofern angegeben) und den Hash der Quellaufzeichnung bei einer Neuausführung.

Aufgaben-Snapshots sind auf 5 MiB pro Datei, 32 MiB insgesamt und 2.000 Einträge begrenzt. Symlinks, Spezialdateien, Pfade mit Secrets, nicht lesbare Dateien und übergroße Daten werden als Auslassungen aufgezeichnet. Kopierte Harness-Steuerungen sind aus den finalen Aufgabenartefakten ausgeschlossen. Unvollständige Snapshots bleiben ausdrückliche Einschränkungen der Belege; sie können keine gepinnte Neuausführung speisen und keine Datei-Neubewertung erfüllen. Die rohe Ausgabe kann weiterhin reine Ausgabeprüfungen stützen, wenn der ursprüngliche Dispatch erfolgreich war.

Aufzeichnungen haben einen eigenen Integritäts-Hash. Ein geänderter Aufzeichnungs- oder Artefakt-Hash wird abgelehnt. Diese Hashes identifizieren Belege; sie bescheinigen keine Prozess-Eingrenzung und machen ein Ergebnis nicht hochstufungsbereit.

### Ausführungsbedingungen

Jede Live- oder Neuausführungs-Evaluierung ermittelt vor dem ersten Dispatch ein Ausführungsmanifest und speichert es als `manifest` in der Aufzeichnung. Es benennt die Bedingungen, die ein Urteil beschreibt, damit ein gespeicherter Score nie mit einem Beleg für ein anderes Modell, eine andere CLI oder einen anderen OMA-Build verwechselt wird:

| Feld | Bedeutung |
|---|---|
| `vendor`, `dispatchMode`, `runtimeVendor`, `command` | Ermittelter Dispatch-Pfad und Name der ausführbaren CLI-Datei. |
| `model`, `modelSource` | Das Modell, das OMA aus dem Agentenplan oder dem Vendor-Standard ermittelt hat. `vendor-session` bedeutet, dass die eigene Sitzungskonfiguration des Vendors das Modell wählt und OMA es nicht gepinnt hat. |
| `effort`, `thinking` | Reasoning-Einstellungen aus dem Agentenplan, sofern vorhanden. |
| `cliVersion`, `cliVersionStatus` | Erste Zeile von `<command> --version` (`probed`) oder `unavailable`, wenn die Abfrage fehlgeschlagen ist. |
| `omaVersion`, `platform`, `arch`, `node` | Host und OMA-Build. |
| `environmentPolicy` | Namen der Umgebungsvariablen, die die Arme erhalten haben, die erzwungenen Einträge und wie viele verworfen wurden. Werte werden nie aufgezeichnet. |
| `memory`, `confinement` | `memory: disabled` für jeden Arm; `confinement` gibt an, was der Dispatch einschränkt und was nicht (temporärer Workspace, uneingeschränktes Netzwerk, geerbte Credentials, Vendor-Standardwerkzeuge). |
| `manifestHash` | Identität der oben genannten Bedingungen. |

Das Manifest ist eine Beschreibung und keine Attestierung: Es hält fest, was OMA ermittelt hat, und die Eingrenzungsfelder sagen ausdrücklich, dass Netzwerk- und Credential-Isolation nicht erzwungen werden. `promotionReady` bleibt `false`.

### Umgebungsrichtlinie

Beide Arme erhalten dieselbe per Allowlist gefilterte Umgebung. Basisvariablen (`PATH`, `HOME`, Locale-, Temp-, Proxy- und Zertifikatseinstellungen), jede `OMA_*`-Variable sowie die Credential- und Laufzeiterkennungs-Präfixe des Ziel-Vendors werden durchgereicht; Einträge, die ein Dispatch-Builder für den Aufruf hinzufügt, bleiben erhalten. Alles andere wird verworfen, damit ein Kandidat nicht versehentlich an ein Deploy-Token oder den Schlüssel eines anderen Providers gelangt. `OMA_NO_AGENTMEMORY=1` wird erzwungen, damit der Vendor-Speicher keinen Kontext zwischen Baseline- und Kandidatenarm weitertragen kann.

Setzen Sie `OMA_HARNESS_ENV_PASSTHROUGH=NAME1,NAME2`, um zusätzliche Variablen durchzureichen, die eine Aufgabe tatsächlich benötigt. Die Namen erscheinen im Manifest unter `environmentPolicy.extra`. Bei einem Vendor ohne bekannten Präfixsatz meldet das Manifest `vendorKnown: false`, und nur Basis-, `OMA_*`- und Passthrough-Einträge erreichen den Prozess.

## Eine Aufzeichnung wiederverwenden

Der Befehl unterscheidet vier Aktionen:

| Aktion | Ausgeführte Arbeit | Agenten-/Modellaufrufe |
|:-------|:---------------|:------------------|
| `inspect` | Aggregiert gespeicherte Arm-Urteile nach der Validierung der Provenance. Es laufen keine Prüfungen. | Keine |
| `rescore` | Wendet die aktuellen Ausgabe- und Dateiprüfungen auf die ursprüngliche rohe Ausgabe und die Artefaktbytes an. | Keine |
| `fixture-replay` | Gleicht ein mitgeliefertes Werkzeuganfrage-Transkript ab, gibt dessen Fixture-Antworten und Dateiänderungen wieder und wendet danach unterstützte Prüfungen an. | Keine |
| `rerun` | Führt den konfigurierten Agenten in frischen Workspaces aus, die aus aufgezeichneten Anfangs-Snapshots befüllt werden. | Zwei pro ausgewählter Aufgabe |

`--action inspect` ist der Standard. `--mock` ist ein Alias für die Inspektion und kann nicht mit einer anderen Aktion kombiniert werden. Weder die Inspektion noch die Fixture-Wiedergabe führt einen Agenten erneut aus.

### Gespeicherte Urteile inspizieren

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action inspect \
  --record-file harness-eval/_runs/trial-1.json
```

Die Inspektion setzt voraus, dass die Hashes der ursprünglichen Suite sowie von Partition, Evaluator, Baseline und Kandidat übereinstimmen. Sie zeigt die aufgezeichneten Scores an, ohne Prüfer aufzurufen oder die Ausgabe neu zu bewerten. Aufzeichnungen der Version 1 bleiben für die Inspektion verfügbar, wenn ihre erforderliche Provenance übereinstimmt. Ältere Aufzeichnungen ohne Partitions- und Evaluator-Provenance bestehen die aktuelle CLI-Validierung nicht. Legacy-Urteile können nicht als neue rohe Belege umdeklariert werden: Erfassen Sie eine neue Live-Aufzeichnung für Neubewertung, Fixture-Wiedergabe oder eine gepinnte Neuausführung.

### Ursprüngliche Belege neu bewerten

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action rescore \
  --record-file harness-eval/_runs/trial-1.json
```

Die Neubewertung verwendet die aktuellen Prüfungen und ignoriert die ursprünglichen `passed`-Werte und Prüfungsurteile. Suite-Identität, Task-ID/Prompt/Incident-Identität, Baseline, Kandidat und gewählte Partition müssen weiterhin übereinstimmen. Prüferdefinitionen dürfen sich ändern; das neue Ergebnis beschreibt, wie die ursprünglichen Bytes bei diesen Prüfungen abschneiden. Änderungen an den heutigen Fixture-Dateien ersetzen die aufgezeichneten finalen Artefakte nicht.

Befehlsprüfungen sind für eine Offline-Neubewertung unzureichend, weil die Aufzeichnung die externe Laufzeit und Umgebung nicht festschreibt. Prüfungen, die auf ausgeschlossene oder unvollständige Artefakte zielen, sind ebenfalls unzureichend. Ein fehlgeschlagener ursprünglicher Dispatch hinterlässt diagnostische Ausgabe, die durch eine Neubewertung nicht zu einer gültigen Messung werden kann. Verwenden Sie eine Live-Neuausführung, wenn die aktuellen Abnahmekriterien eine Befehlsausführung erfordern.

### Werkzeug-Fixtures wiedergeben

Eine Transkriptdatei enthält ein Objekt oder ein Array von Objekten mit eindeutigen Task-IDs. Geben Sie pro ausgewählter Aufgabe ein Transkript an:

```json
{
  "schemaVersion": 1,
  "taskId": "stale-api-doc",
  "requests": [
    { "tool": "documentation", "request": { "path": "docs/api.md" } }
  ],
  "steps": [
    {
      "tool": "documentation",
      "request": { "path": "docs/api.md" },
      "response": { "body": "Use openSession." },
      "writes": [
        { "path": "docs/api.md", "content": "Use openSession.\n" }
      ],
      "removes": []
    }
  ],
  "output": "Fixture completed.",
  "dependencies": [
    { "name": "documentation", "repeatability": "fixture" }
  ]
}
```

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action fixture-replay \
  --record-file harness-eval/_runs/trial-1.json \
  --transcript harness-eval/tool-fixtures.json
```

Anfragen müssen der Schrittfolge exakt nach Werkzeugname und Anfragewert entsprechen. `writes` und `removes` sind optionale relative Änderungen an Aufgabendateien; sie dürfen den Workspace nicht verlassen und keine Harness-Steuerungen verändern. Werkzeugnamen sind Daten, und es wird kein Transkriptbefehl ausgeführt. `output` sind Fixture-Daten; das Feld ist erforderlich, wenn eine Ausgabeprüfung es braucht.

Jede deklarierte Abhängigkeit hat einen `name`, `repeatability` (`fixture`, `live` oder `unavailable`) sowie optional `reason` und einen `fixture`-Verweis. Eine Fixture-Abhängigkeit erfordert einen passenden Schritt mit diesem Werkzeugnamen. Live- oder nicht verfügbare Abhängigkeiten machen die Wiedergabe unzureichend. Das optionale Feld `fixture` ist beschreibend; die Wiedergabe verbraucht die mitgelieferten Schritte, statt diesen Pfad zu laden. Die Transkript-Wiedergabe validiert deklarierte Abhängigkeiten und belegt nicht, dass jede historische Abhängigkeit erfasst wurde.

Beide aufgezeichneten Arme müssen denselben vollständigen Anfangs-Snapshot haben. OMA wendet dasselbe Transkript auf jeden Arm an und führt die aktuellen Ausgabe- und Dateiprüfungen aus. Befehlsprüfungen erfordern eine Live-Neuausführung. Diese Ergebnisse zeigen, dass sich die mitgelieferte Fixture-Folge wiedergeben lässt; sie können weder eine Verhaltensverbesserung des Kandidaten noch die Reproduzierbarkeit des Modells belegen.

### Den Agenten aus gepinnten Anfangsdateien neu ausführen

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action rerun \
  --record-file harness-eval/_runs/trial-1.json
```

Eine Neuausführung erfordert eine übereinstimmende Suite-/Task-Identität und identische vollständige Anfangs-Snapshots für beide ursprünglichen Arme. Sie startet tatsächliche Agentenaufrufe mit der aktuellen Baseline, dem aktuellen Kandidaten, dem konfigurierten Vendor-/Modellpfad und den aktuellen Prüfungen. Die ursprünglichen finalen Artefakte werden nicht als Ausgangszustand verwendet. Eine spätere Änderung an der Quell-Fixture kann den aufgezeichneten Anfangszustand daher nicht unbemerkt verändern.

Neuausführungen haben dieselbe Dispatch-Vorschau, Bestätigung und Timeout-Behandlung wie Live-Läufe. Sie können einen geänderten Kandidaten verwenden; wählen Sie die ursprüngliche Quelle ausdrücklich mit `--record-file` aus. Fügen Sie `--record` hinzu, um eine neue Datei im selben Verzeichnis zu speichern, deren Name auf `-rerun-<timestamp>.json` endet und die mit dem Hash der Quellaufzeichnung verknüpft ist. Die ursprüngliche Aufzeichnung bleibt erhalten.

Gepinnte Dateien reproduzieren weder den Zustand externer Dienste noch das Zeitverhalten oder das Sampling des Modells. Eine Neuausführung ist ein frischer Verhaltensbeleg unter den genannten Bedingungen und keine Behauptung, dass die ursprüngliche Agententrajektorie deterministisch reproduziert wurde.

### Aufgezeichnete Bedingungen bei der Wiedergabe

`inspect`, `rescore` und `fixture-replay` melden das in der Aufzeichnung gespeicherte Manifest mit `conditions: "recorded"` oder mit `conditions: "unavailable"` bei einer Aufzeichnung, die älter als die Manifeste ist. OMA ermittelt außerdem die aktuellen Bedingungen und listet jeden Unterschied bei Vendor, Dispatch-Modus, Modell, Effort, Thinking, CLI-Version, OMA-Version oder Host als Wiedergabe-Einschränkung und Hochstufungs-Blocker auf:

```text
replay limitation: Recorded conditions differ from current: model: recorded "gpt-5.4", current "gpt-5.5"
```

Die CLI-Version wird bei der Wiedergabe nur abgefragt, wenn die Aufzeichnung selbst eine abgefragte Version enthält; ein nicht abgefragtes Paar wird als nicht vergleichbar gemeldet und nicht als gleich. Aufgezeichnete Urteile bleiben unter ihren ursprünglichen Bedingungen einsehbar. Sie sind kein Beleg für den Kandidaten unter den aktuellen Bedingungen, bis eine Live- oder Neuausführungs-Evaluierung eine Aufzeichnung erzeugt, deren Manifest übereinstimmt.

### Nutzung

Jeder Arm speichert `usage`, sofern der Vendor dies gemeldet hat: Eingabe- und Ausgabe-Tokens, Kosten in USD, Wandzeit und das Modell, das den Großteil der Ausgabe erzeugt hat. Die Evaluierung summiert diese Angaben als `usage` mit `status` `actual`, `partial` (einige Arme haben nichts gemeldet) oder `unknown`. Vendor-Ergebnis-Envelopes werden entpackt, bevor die Prüfungen laufen und bevor die Ausgabe aufgezeichnet wird, sodass `output_contains` und `output_json_equals` die Antwort des Agenten sehen und nicht die umgebenden JSON-Verwaltungsdaten; die Nutzung innerhalb des Envelopes speist dieses Feld.

### Berichtslabels

Berichte enthalten `executionMode`, `evidenceStatus` (`complete`, `insufficient` oder `legacy`), `replayLimitations` und, sofern verfügbar, einen `sourceRecordHash`. Live- und Neuausführungsberichte fügen `manifest`, `conditions: "current"` und `traceSession` hinzu. Die Vollständigkeit der Belege beschreibt, was die aktuelle Aktion inspizieren oder evaluieren kann. Übernommene Incident-Einschränkungen bleiben sichtbar, auch wenn die aktuelle Dateierfassung vollständig ist. `promotionReady` bleibt in jedem Modus `false`.

## Trace-Ereignisse

Jede Live- oder Neuausführungs-Evaluierung schreibt verknüpfte Ereignisse in die lokale Sitzung `oma-harness-<suite-id>`:

| Ereignis | Nutzdaten |
|---|---|
| `harness.eval.started` | Aktion, Hashes von Suite, Baseline, Kandidat und Evaluator, Partition, Manifest-Hash, ermittelter Vendor, Modell, CLI-Version und Aufgabenzahl. |
| `harness.arm.completed` | Eines pro Arm: Aufgabe, Arm, Bestehensstatus, Dauer, Ausgabe-Hash, Dispatch-Fehler, Exit-Code, Timeout-Flag und der Arm-Trace. `parentEventId` verweist auf das Start-Ereignis. |
| `harness.eval.completed` | Entscheidung, Lift, Belegstatus sowie Pfad und Hash der Aufzeichnung, wenn `--record` verwendet wurde. |

Alle Ereignisse einer Evaluierung teilen sich einen `causalityKey`. Kann ein Ereignis nicht geschrieben werden, führt der Bericht `Trace event <kind> was not recorded` als Wiedergabe-Einschränkung auf, statt es stillschweigend auszulassen.

Jeder Arm-Lauf speichert außerdem `diagnostics` und `trace` in der Aufzeichnung:

- `diagnostics`: Exit-Code, Signal, Timeout-Flag und die letzten 8 KiB von stderr mit `stderrStatus` (`captured`, `truncated` oder `unavailable`).
- `trace`: was der Harness beobachten konnte. `output` ist `complete`, `partial` (ein fehlgeschlagener Prozess hat dennoch stdout erzeugt) oder `unavailable`; `artifacts` gibt an, ob der finale Snapshot vollständig ist; `changedPaths` listet Dateien auf, die der Arm relativ zum gepinnten Anfangs-Workspace hinzugefügt, geändert oder entfernt hat (auf 200 begrenzt, mit `changedPathsTruncated`); `toolCalls` ist immer `unsupported`, weil Vendor-CLIs dem Harness keine Beobachtungen pro Werkzeug zur Verfügung stellen.

Ein fehlgeschlagener Arm behält daher seine Teilausgabe, das Ende von stderr, den Exit-Status und die Dateiänderungen, sodass sich der letzte Fehler auf das zurückführen lässt, was der Arm geändert hat. Fehlende Beobachtung wird als Zustand aufgezeichnet; sie wird nie als sauberer Lauf gelesen.

## Metriken und Entscheidungsgate

Eine Aufgabe besteht nur, wenn jede Prüfung besteht. Scores sind gewichtete Mittelwerte über gepaarte Aufgaben:

```text
lift = candidateScore - baselineScore
```

OMA meldet außerdem:

- korrigierte Aufgaben: Baseline fehlgeschlagen, Kandidat bestanden;
- regressierte Aufgaben: Baseline bestanden, Kandidat fehlgeschlagen;
- Coverage: mindestens fünf gepaarte, bewertbare Aufgaben sind erforderlich.

Die Score-Entscheidung lautet `pass`, wenn der Lift mindestens 5 Prozentpunkte beträgt und keine Regressionen vorliegen. Jede Regression lässt den Kandidaten scheitern. Ein nichtnegativer Lift unter 5 Punkten gibt eine Warnung aus; weniger als fünf gepaarte Aufgaben erzeugen die Entscheidung `insufficient`. Fügen Sie `--require-coverage` hinzu, damit unzureichende Coverage in CI mit Exit-Code ungleich null endet. Ein Score ist kein Beleg, wenn ein Arm fehlt, ein Record-Hash veraltet ist oder eine deterministische Prüfung unvollständig ist. Live-Dispatch-Fehler und Evaluator-Integritätsfehler erzwingen eine fehlschlagende Entscheidung; sie können nicht als erfolgreicher Lift zählen. Neubewertung und Fixture-Wiedergabe lassen Arme mit unzureichenden Belegen aus den bewertbaren Paaren heraus und melden die Entscheidung `insufficient`, statt fehlende Belege als Regression des Kandidaten zu behandeln.

Ein bestandener Score begründet keine Eignung zur Hochstufung. Berichte enthalten die Partition, den Evaluator-Hash, `promotionReady: false` und ausdrückliche Blocker. Legacy- und Validierungsläufe haben keine Final-Test-Belege. Aktuelle Dispatch-Pfade attestieren keine Eingrenzung des Dateisystemzugriffs, sodass selbst ein Final-Test-Lauf weder eine geschützte finale Evaluierung beanspruchen noch eine Hochstufung autorisieren kann. Dieses Feld bleibt false, bis ein Ausführungs-Provider diese Grenze belegen kann.

## Aktuelle Grenze

Kandidaten-Overlays werden extern erzeugt; dieser Befehl implementiert weder einen Builder noch eine automatisierte `harness opt`-Schleife. Artefakterfassung, Offline-Neubewertung, Wiedergabe von Werkzeug-Fixtures, Neuausführungen aus gepinnten Dateien, Partitionsauswahl, per Snapshot gesicherte Evaluatoren, Ausführungsmanifeste, eine Umgebungs-Allowlist und verknüpfte Trace-Ereignisse sind verfügbar, aber Geheimhaltung zurückgehaltener Daten auf OS-Ebene, Netzwerk- oder Credential-Eingrenzung, wiederholte stochastische Durchläufe, Token-Abrechnung und erzwungenes Pinnen von Modellen für verschachtelte Subagent-Aufrufe sind nicht sichergestellt. Die Umgebungs-Allowlist begrenzt, welche Variablen ein Vendor-Prozess erbt; sie hindert eine Vendor-CLI nicht daran, ihren eigenen Credential-Speicher zu lesen oder das Netzwerk zu erreichen. Solange das Pinnen verschachtelter Aufrufe nicht existiert, sollten Suites, die ein einzelnes festes Modell messen, Kandidaten-Workflows vermeiden, die andere konfigurierte Agentenrollen starten.
