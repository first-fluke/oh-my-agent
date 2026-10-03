---
title: "Skill-Optimierung"
sidebar_label: Skill-Optimierung
description: Mit oma skill optimize eine dauerhafte, evidenzbasierte Skill-Weiterentwicklung mit deterministischen Train-, Validierungs- und vom Runner verwalteten Holdout-Gates durchführen.
---

# Skill-Optimierung

`oma skill optimize` entwickelt die `SKILL.md` eines Skills weiter, um den von `oma skill eval` gemessenen `utilityLift` zu maximieren. Es trennt rohe Rollout-Evidenz, dauerhaftes domänenspezifisches Wissen und den ausführbaren Skill. Ein Wiki Maintainer bündelt beobachtbare Erfolge und Fehler; ein Proposer verwendet dieses Wissen, um begrenzte Add-/Delete-/Replace-Änderungen auszugeben. Kandidaten müssen den Trainings- oder Validierungs-Nutzwert verbessern, ohne einen der beiden Splits zu verschlechtern, bei vollständigen Messungen von Aufgaben und negativer Übertragung. `--apply` erfordert außerdem einen vollständig gemessenen, vom Runner verwalteten Final-Test ohne Regression und verifizierte Live-Isolation. Bei der Bereitstellung gibt es keine zusätzliche Wiki-Suche zur Laufzeit: Die Ausgabe bleibt eine `SKILL.md`.

Forschungsgrundlage: Tang, L., Rashtchian, C., Ferng, C.-S., Tomkins, A., Juan, D.-C. und Vu, T. (2026). *WikiSkill: Compiling agent experience into persistent knowledge for skill evolution* [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2608.27454

Die CLI-Optimierung erfordert derzeit `--live` und verursacht Modellaufrufe. Der Standardpfad (ohne `--live`) und `--mock` können keine Vorschläge erzeugen oder wiedergeben, weil ein Loader für aufgezeichnete Vorschläge nicht implementiert ist; sie stoppen vor der Evaluierung. Verwenden Sie `oma skill eval --mock` für die Offline-Wiedergabe. Injizierte Optimierer-/Scorer-APIs bleiben für Offline-Tests verfügbar. Die gleichzeitige Angabe von `--live` und `--mock` ist ein Fehler.

---

## Harte Abhängigkeit: Evaluierungs-Fixtures

`oma skill optimize` kann ohne Evaluierungs-Fixtures nicht laufen. Es benötigt mindestens **5 Aufgaben-Fixtures** (`MIN_TASKS = 5`) unter `.agents/eval/<skill>/`. Werden weniger gefunden, meldet der Befehl sofort einen Fehler:

```
[oma skill opt] no eval coverage for skill "oma-scholar": found 2 task fixture(s), need at least 5. Author tasks first — see web/docs/guide/skill-eval.md
```

Siehe die [Anleitung zur Skill-Nutzwert-Evaluierung](/docs/guide/skill-eval) für die Verzeichniskonvention `.agents/eval/<skill>/`, das Fixture-Schema, Prüfertypen und das Vorbereiten von Rollouts für Mock-Wiedergabe.

Die Hochstufung erfordert außerdem eine nicht leere Menge von Nachbaraufgaben derselben Domäne, die zu anderen Skills gehören. Jeder Validierungs-Score eines Kandidaten und der finale Score des Kandidaten müssen die Nachbarn des jeweils evaluierten Splits mit dem exakten Kandidatentext messen. Fehlende Nachbarn oder unvollständige gepaarte Aufzeichnungen können nicht belegen, dass keine negative Übertragung vorliegt. Die Offline-Evaluierung kann nur passende Kandidatenaufzeichnungen wiedergeben; verwenden Sie die Live-Optimierung, um neue Kandidaten zu erzeugen und zu evaluieren.

Wiedergabe und suite-bezogenes Wissen sind an den vollständigen Aufgaben-/Evaluator-Vertrag gebunden, einschließlich der effektiven Standard-Judge-Rubrik und der Revision des Scorer-Protokolls. Ältere Aufzeichnungen und frühere Wissensbereiche erfordern nach diesem Provenance-Upgrade frische Evidenz; das Umetikettieren alter Scores mit neuen Hashes begründet keine gültige Messung.

---

## So funktioniert es

Fixtures werden nach Aufgaben-ID sortiert und deterministisch in **Trainings-, zurückgehaltene Validierungs- und vom Runner verwaltete Final-Test-Sets** geteilt. Bei mindestens fünf Fixtures sind die Zielanteile 60/20/20, und jede Partition enthält mindestens eine Aufgabe. Beispielsweise ergeben acht Fixtures nach dem Runden vier Trainings-, eine Validierungs- und drei Final-Test-Aufgaben. Fixtures, die dieselbe `group` deklarieren, werden gemeinsam zugeordnet, sodass eine umformulierte Schwester-Fixture nicht im Training liegen kann, während das Original im Final-Test liegt; bei weniger als drei Gruppen fällt die Aufteilung auf Aufgaben-IDs zurück und gibt eine Warnung aus. Die Final-Test-Aufgaben stammen aus diesem lokalen Fixture-Set und werden vor Maintainer und Proposer zurückgehalten. Doppelte Final-Test-Aufgaben-IDs und Überschneidungen mit einem Entwicklungs-Split werden abgelehnt.

Für jede Epoche (bis zu `--max-epochs`, Standard 8):

1. **Aktuell besten `SKILL.md` auf dem TRAIN-Split bewerten** — `oma skill eval` gibt beobachtbare Prompts, Ausgaben und Lift pro Aufgabe zurück. Jede Aufgabe in einem internen Split muss beide bewerteten Arme haben; fehlgeschlagene oder fehlende Vergleiche können den Nenner nicht verkleinern.
2. **Wiki Maintainer bündelt Evidenz** — bis zu fünf Fehler und drei Erfolge werden zu evidenzverknüpften Mustern. Fehler werden nach Lernwert ausgewählt: zuerst Regressionen, dann die gravierendsten gemeinsamen Fehler; Aufgaben, die beide Arme bereits bestehen, werden ausgelassen, weil sie nichts über die nächste Änderung aussagen. Erfolge werden nach Lift gereiht. Bereichsbezogene Muster und frühere Gate-Ergebnisse werden aus OMAs L1/L2/L3-Speichersystem abgerufen.
3. **Proposer gibt K-Kandidatenänderungen aus** (bis zu `--edits-per-epoch`, Standard 4). Exakte Änderungen aus der dauerhaften Ablehnungshistorie werden übersprungen.
4. **Für jede Kandidatenänderung:**
   - Änderung auf eine In-Memory-Kopie von `SKILL.md` anwenden.
   - Kandidaten validieren (`name`/`description` im Frontmatter müssen erhalten bleiben; der Body muss parsebar sein).
   - Textbudget der Lernrate erzwingen: Änderungen verwerfen, deren Nettozeichenänderung `--lr` (Standard 600 Zeichen) überschreitet.
   - Jede Aufgabe im **zurückgehaltenen Validierungssplit** (mit gepaarten Baseline-/Kandidatenvergleichen für Nachbaraufgaben) und jede Aufgabe im **Held-in-Trainingssplit** (ohne Nachbarvergleiche) neu bewerten.
5. **Besten gültigen Kandidaten akzeptieren** nach der Held-in-/Held-out-Regel: Der Kandidat verliert auf keinem der beiden Splits etwas (`Δval ≥ 0` und `Δtrain ≥ 0`) und gewinnt auf mindestens einem davon. Kandidaten werden nach `Δval + Δtrain` gereiht. Ein strikter Validierungsgewinn ist nicht erforderlich, weil ein Text, der bereits jede Validierungsaufgabe besteht, bei einem Trainingsfehler dennoch repariert werden kann, ohne Leistung auf den zurückgehaltenen Aufgaben einzubüßen; der Final-Test entscheidet, ob diese Reparatur generalisiert. Die Aufgaben-Coverage muss vollständig sein, die nicht leere Stichprobe für negative Übertragung muss vollständig gemessen werden, und kein Nachbar darf eine bestätigte Regression bei oder unter `NEG_TRANSFER_FAIL = -0.1` zeigen. In Live-Läufen wird ein Nachbar, der beim ersten gepaarten Vergleich regrediert, einmal erneut gemessen; das aufgezeichnete Delta ist der Mittelwert beider Vergleiche, und nur eine reproduzierte Regression (`confirmed: true`) lehnt den Kandidaten ab. Mock-Wiedergaben können nicht erneut messen, daher bleibt eine Regression aus einem einzelnen Durchlauf bestehen. Live-Berichte müssen `isolation: "enforced"` angeben. Die Ergebnisse der Proposal-Gates werden mit `deltaLift` (Validierung), `deltaTrainLift` und den Nachbar-Deltas hinter dem Urteil aufgezeichnet.
6. **Früh stoppen**, nachdem 2 aufeinanderfolgende Epochen ohne angenommene Änderung vergangen sind (`OPT_EARLY_STOP_PATIENCE = 2`).
7. **Nach der Weiterentwicklung den vom Runner verwalteten Final-Test ausführen.** Sowohl der ursprüngliche Text als auch der Validierungssieger müssen jede Final-Test-Aufgabe abdecken. Der Kandidat darf keinen Final-Test-Lift verlieren (`candidateLift >= baselineLift`; der Gewinn, für den er akzeptiert wurde, wurde bereits auf den Entwicklungs-Splits gezeigt, und ein strikter Gewinn auf einem kleinen eingefrorenen Test würde die meisten Reparaturen nicht hochstufbar machen) und muss eine weitere vollständige, kandidatenspezifische Prüfung auf negative Übertragung bestehen. `finalTest.findings` listet den Lift pro Aufgabe für den ursprünglichen Text und den Kandidaten auf, sodass sich ein fehlgeschlagener Test als echte Regression oder als einzelne verrauschte Aufgabe lesen lässt. Fehlende, unvollständige oder fehlgeschlagene Final-Tests verhindern die Hochstufung. Gemessene Final-Fehlschläge bleiben Audit-Aufzeichnungen und werden nicht zu Ablehnungswissen für spätere Optimierungen.

Der Optimierer arbeitet während der Schleife mit einer Kandidatenkopie im Speicher.

Nicht gemessene Kandidaten werden als `inconclusive` aufgezeichnet, mit Gründen wie `insufficient-coverage`, `negative-transfer-unmeasured` oder `unverified-isolation`. Sie sind von der gelernten Ablehnungshistorie ausgeschlossen und bleiben für einen erneuten Versuch zulässig, nachdem die Evaluierungsbedingungen behoben wurden. Eine bestätigte Nachbarregression, ein Verlust auf einem der beiden Splits (`split-regression`) oder kein Gewinn auf einem der beiden Splits (`no-validation-lift`) ist eine Ablehnung. Diagnosen, die auf eine unvollständige Evaluierung oder eine beeinträchtigte Maintainer-Verarbeitung hinweisen, blockieren die Hochstufung.

---

## Verwendung

```
oma skill optimize --skill <id> --live
               [--dry-run | --apply]
               [--max-epochs <n>] [--edits-per-epoch <k>] [--lr <chars>]
               [--yes]
               [--json] [--output <format>]
```

### Flags

| Flag | Standard | Beschreibung |
|:-----|:--------|:-----------|
| `--skill <id>` | `_all` | Zu optimierende Skill-ID (einfacher Name ohne Pfadtrenner). |
| `--dry-run` | **ja (Standard)** | Änderungen vorschlagen und Diff ausgeben, ohne `SKILL.md` zu ändern; erzeugte Evidenz und Evolutionsevents werden trotzdem gespeichert. |
| `--apply` | — | Den validierten Kandidaten schreiben, nachdem alle Hochstufungs-Gates bestanden sind, einschließlich vollständiger Evidenz aus Final-Test und negativer Übertragung; das Original vor einem atomaren Schreiben sichern. Ein OMA-eigener Skill benötigt zusätzlich `--yes`. |
| `--mock` | Standard ohne Live-Modus | Die Wiedergabe von Vorschlägen über die CLI ist nicht implementiert, daher stoppt dieser Pfad vor der Evaluierung. Verwenden Sie `oma skill eval --mock` für die Offline-Wiedergabe der Evaluierung. |
| `--live` | — | Für die aktuelle CLI-Optimierung erforderlich. Verursacht echte Modellaufrufe; gibt eine Kostenvorschau aus und fragt ohne `--yes` nach Bestätigung. |
| `--max-epochs <n>` | `8` | Maximale Zahl der Optimierungsepochen. |
| `--edits-per-epoch <k>` | `4` | Kandidatenänderungen, die das Optimierer-LLM pro Epoche vorschlägt. |
| `--lr <chars>` | `600` | Textbudget der Lernrate: maximale Nettozeichenänderung pro angenommener Änderung. |
| `--yes` | — | Die Bestätigung der Live-Kostenvorschau überspringen und beim Anwenden eines OMA-eigenen Skills das Überschreibverhalten bestätigen. |
| `--json` | — | JSON-Ausgabe für CI/CD. |
| `--output <format>` | `text` | Ausgabeformat (`text` oder `json`). |

---

## Minimales Beispiel von Ende zu Ende

```bash
# Evaluate one epoch and print a candidate diff without applying it
oma skill optimize --skill oma-scholar --live --dry-run --max-epochs 1
```

Beispielhafte Ausgabe für acht Fixtures und einen Kandidaten, der alle Hochstufungs-Gates besteht:

```
[oma skill opt] skill: oma-scholar, tasks: 8 (train: 4, val: 1, test: 3), dry-run: true

Skill opt  (skill: oma-scholar)
  applied: false
  baselineLift: 0.0%  finalLift: 100.0%  (train 50.0% → 100.0%)
  epochs: 1  acceptedEdits: 1  rejected: 0
  budget: 42 model calls used (no limit)
  finalTest: pass baseline=0.0000 candidate=0.3333

  diff:
--- a/SKILL.md
+++ b/SKILL.md
@@ -12,6 +12,9 @@
 ### When to use
 - User asks to look up an academic paper or technical claim.
+- User asks for a summary of arxiv abstracts or DOI-linked documents.
 - User wants citations or sources for a factual statement.
```

Der Diff zeigt, was der Optimierer schreiben würde. `SKILL.md` bleibt unverändert, während erzeugte Evolutions-Evidenz und bereichsbezogene Gate-Ergebnisse für künftige Läufe gespeichert werden.

---

## Eine validierte Verbesserung anwenden

Wenn Sie mit dem vorgeschlagenen Diff zufrieden sind, führen Sie den Befehl erneut mit `--apply` aus:

```bash
# Apply accepted edits (backs up the original first)
oma skill optimize --skill oma-scholar --live --apply --yes
```

### Das Verfahren als Artefakt

Die Prompts von Optimierer und Maintainer sind das Verbesserungsverfahren. Sie werden als integrierte Standardwerte ausgeliefert und können durch Dateien unter `.agents/evolution/` überschrieben werden (benutzereigen: werden nie vom Installationsmanifest kopiert und nie von `oma update` entfernt, anders als `.agents/eval/`):

| Datei | Rolle | Erforderliche Platzhalter |
|---|---|---|
| `optimizer.md` | Schlägt SKILL.md-Änderungen aus Trainings-Evidenz und dauerhaftem Wissen vor | `{{body}}`, `{{findings}}`, `{{editsPerEpoch}}` (auch `{{knowledge}}`) |
| `maintainer.md` | Bündelt Evidenz zu wiederverwendbaren Mustern | `{{evidence}}`, `{{priorFacts}}` (auch `{{skillId}}`, `{{suiteHash}}`, `{{epoch}}`) |
| `constitution.yaml` | Bereiche, die die Schleife nie schreiben darf, welche Verfahrensteile eine Meta-Optimierung ändern darf, standardmäßige Ground-Truth-`anchors` für Meta-Läufe und ein Dispatch-Budget | muss sich selbst unter `immutable` aufführen |

`budget.max_dispatches_per_run` (Standard `null`, unbegrenzt) wird in Live-Läufen durchgesetzt: Jeder zugrunde liegende Modellaufruf (Aufgabenarm, Nachbararm, Judge, Optimierer, Maintainer) verbraucht eine Einheit, und der Aufruf, der das Limit überschreiten würde, wird abgelehnt, bevor er erfolgt. Die Schleife stoppt dann mit der Diagnose `budget:exhausted`, der Final-Test wird übersprungen, die Hochstufung ist blockiert, und das Ergebnis meldet `budget: { limit, used }`. Die Nutzung wird in jedem Fall in der Laufzusammenfassung aufgezeichnet, sodass Verfahren nicht nur nach Gewinn, sondern auch nach Kosten verglichen werden können.

`oma skill procedure` gibt die aktiven Quellen und Hashes aus; `--export` schreibt die Standardwerte zur Bearbeitung, ohne vorhandene Dateien zu überschreiben. Eine Vorlage, die einen erforderlichen Platzhalter weglässt, wird abgelehnt, statt stillschweigend degradiert zu werden. Jeder Lauf zeichnet `procedure` (Hash pro Teil plus ein kombinierter Hash) und `memory` in seinem Ergebnis, seiner Laufzusammenfassung und der Hochstufungs-Lineage auf, sodass unter einem Verfahren erzeugte Evidenz nie mit der eines anderen verwechselt wird.

Die Antwort des Optimierers wird nur hinsichtlich der Formatierung großzügig gelesen: Code-Fences und Leerzeilen werden ignoriert, aber jede Inhaltszeile, die keine gültige `EDIT:`-Zeile (oder ein alleinstehendes `NO_ACTION`) ist, ergibt einen `parse-error`, und die Diagnose enthält nun die erste beanstandete Zeile, damit sich der Fehler nachverfolgen lässt.

### Speicher-Ablation und Langzeitstatistiken

`--memory none` startet einen Lauf mit leerem Wissen (keine abgerufenen Muster oder Gate-Historie) und zeichnet ihn dennoch auf. Der Vergleich von Läufen unter `--memory recall` (Standard) und `--memory none` bei gleichem Budget ist der Test, ob dauerhaftes Wissen hilft; die Behauptung, dass die Schleife aus Erfahrung lernt, braucht diesen Vergleich und nicht das bloße Vorhandensein eines Speichers.

`oma skill evolution-stats --skill <id>` aggregiert jeden aufgezeichneten Lauf eines Skills aus `.agents/results/skill-evolution/<id>/*.jsonl`: Läufe nach Status, Vorschläge nach Gate-Ergebnis und die Akzeptanzrate, verifizierte Verbesserungen (Final-Test bestanden und zur Hochstufung geeignet), Anwendungen und Rollbacks, den mittleren finalen Lift, Modellaufrufe über Läufe mit Verbrauchsmessung sowie Aufrufe pro verifizierter Verbesserung (die Kosten des Prozesses statt eines einzelnen Laufs) und dieselben Kennzahlen aufgeteilt nach Speichermodus und nach Verfahrens-Hash. Der Meta-Optimierungsbericht zeigt die mittleren Aufrufe pro innerem Lauf für das aktuelle Verfahren und jeden Kandidaten, sodass ein Verfahren, das nur durch höheren Aufwand beim Gewinn vorn liegt, als solches erkennbar ist.

### Meta-Optimierung: das Verfahren als Kandidat

`oma skill meta-optimize --target optimizer --skill <a> <b> ... --live` behandelt den Prompt des Optimierers (oder Maintainers) als Testgegenstand. Der Befehl führt die innere Schleife (`oma skill optimize --dry-run`) für jeden genannten zurückgehaltenen Skill `--repeats`-mal unter dem aktuellen Verfahren aus; bittet einen Proposer um bis zu `--candidates` kleine Änderungen an der Vorlage; führt die innere Schleife unter jedem Kandidaten mit demselben Budget aus `--max-epochs` und `--edits-per-epoch` erneut aus; und vergleicht jeden Kandidaten paarweise nach (Skill, Wiederholung) mit dem aktuellen Verfahren anhand der Summe der Trainings- und Validierungs-Lift-Gewinne, die die innere Schleife erzielt hat.

Ein Kandidat wird nur hochgestuft, wenn das gepaarte 95-%-Bootstrap-Intervall seiner Gewinndifferenz über null liegt (mit festem Seed, 1000 Resamples), mindestens drei Paare vorhanden sind und kein Skill, der sich unter dem aktuellen Verfahren verbessert hat, unter dem Kandidaten mehr als die Hälfte dieses Gewinns verliert. Ein innerer Lauf, dessen Evaluierung blockiert war (unzureichende Coverage, nicht verifizierte Isolation, erschöpftes Budget), wird als fehlgeschlagen gemeldet und aus den Paaren ausgeschlossen, sodass ein Ausfall für einen Arm nicht als Gewinn null zählen kann. Zurückgehaltene Skills müssen Spielraum nach oben haben (Headroom): Bei einem Skill, dessen aktueller Text bereits die volle Punktzahl erreicht, kann unter keinem Verfahren ein Gewinn sichtbar werden. `--anchor` benennt Skills, die nie zur Auswahl herangezogen, aber einmal unter dem aktuellen und dem siegreichen Verfahren ausgeführt werden, um Drift zu zeigen; ohne das Flag gilt die `anchors`-Liste der Constitution, sodass eine einmal deklarierte Ground-Truth-Menge bei jedem Meta-Lauf geprüft wird. Mit `--apply` wird die siegreiche Vorlage nach `.agents/evolution/<target>.md` geschrieben, zusammen mit einer Sicherung mit Zeitstempel, einem Unified-Diff-Patch und einem Eintrag in `.agents/results/skill-evolution/_procedure/promotions.jsonl`, der die Hashes von Parent und Kandidat, den Hash der Constitution und die Evidenz (Skills, Wiederholungen, Budget, Paare, Intervall) enthält. Ohne `--apply` wird nichts geschrieben.

Was eingefroren bleibt: Die Final-Test-Partition jedes Skills wird nie für die Auswahl gelesen (die Metrik ist der Gewinn aus Training plus Validierung), der Evaluator- und der Optimierungscode sind in der Constitution als unveränderlich aufgeführt, die Constitution selbst kann kein Ziel sein, und ein Ziel muss in `meta_targets` stehen. Innere Läufe verwenden standardmäßig `--memory none`, sodass ein Verfahren an den Änderungen gemessen wird, die es erzeugt, und nicht an Wissen, das aus früheren Läufen abgerufen wurde. Innere Läufe eines Arms überlappen sich über Skills hinweg (`OMA_META_CONCURRENCY`, standardmäßig bis zu 4), während die Wiederholungen eines Skills seriell bleiben, weil die Evidenz jedes Skills in einer eigenen Artefaktdatei landet. Jeder innere Lauf zeichnet den kombinierten Verfahrens-Hash auf, unter dem er lief, sodass `oma skill evolution-stats` spätere Ergebnisse dem Verfahren zuordnen kann, das sie erzeugt hat.

Dies ist die Level-5-Form, wie sie in der Übersichtsarbeit zu selbstverbessernden Systemen beschrieben wird (Self-Harness-Hochstufung nach Held-in/Held-out, wiederholte ADAS-Evaluierung mit Bootstrap-Intervallen, eingefrorene Evaluatoren wie bei AlphaEvolve): Das Verfahren wird vom System überarbeitet, aber das äußere Urteil bleibt außerhalb der Reichweite der Schleife. Die Kosten skalieren als Skills × Wiederholungen × (1 + Kandidaten) innere Läufe; der Befehl gibt die Obergrenze aus und fragt ohne `--yes` nach Bestätigung.

### Hochstufungs-Lineage

Jedes Schreiben mit `--apply` hängt einen Eintrag an `.agents/results/skill-evolution/<skill>/promotions.jsonl` an und schreibt daneben einen prüfbaren Unified Diff nach `promotions/<candidate-hash>.patch`. Der Eintrag nennt die Hashes von Parent- und Kandidatentext, den Installationspfad, den Sicherungspfad und die Evidenz hinter dem Schreiben: Lifts aus Validierung und Final-Test, die Hochstufungsentscheidung, den Hash der Fixture-Suite, die Revision des Evaluator-Protokolls und die Quell-/Ziel-Laufzeiten. `oma skill promotions --skill <id>` listet das Protokoll auf.

`oma skill rollback --skill <id>` stellt den Text wieder her, der durch den jüngsten `--apply`-Lauf ersetzt wurde. Der Befehl verweigert die Ausführung, wenn die installierte Datei nicht mehr dem Kandidaten dieses `--apply`-Laufs entspricht (eine spätere manuelle Änderung würde verworfen), wenn die Sicherung nicht zum aufgezeichneten Parent passt oder wenn dieser `--apply`-Lauf bereits zurückgerollt wurde; ein erfolgreicher Rollback wird mit `reverses`, das auf den `--apply`-Lauf zeigt, an dasselbe Protokoll angehängt. Bei einem OMA-eigenen Skill ist der Patch das Artefakt, das in das Quell-Repository oder ein Benutzer-Overlay übernommen werden sollte, weil `oma update` die installierte Kopie überschreibt; der Eintrag markiert `omaOwned: true`, damit ein späteres Update nicht mit einer Regression verwechselt wird.

`--apply` erfordert mindestens eine akzeptierte Änderung ohne Validierungsverlust, `finalTest.passed: true` und `promotion.eligible: true`. Diese Gates erfordern eine vollständige interne Aufgaben-Coverage, eine nicht leere und vollständig gemessene kandidatenspezifische Stichprobe für negative Übertragung sowie erzwungene Live-Isolation. Ein fehlender Final-Test, unvollständige Messungen oder degradierte Compiler-Diagnosen verhindern das Schreiben. Vor dem atomaren Schreiben wird eine Sicherung der ursprünglichen `SKILL.md` erstellt, und der Diff wird zur Prüfung ausgegeben.

Die Live-Evaluierung kann das Isolations-Gate über das geschützte Claude- oder das native Codex-Profil erfüllen. Claude behält die HOME-/Ziel-Prüfungen bei. Codex prüft, dass der flüchtige app-server-Thread keine Anweisungsquellen oder Werkzeugumgebungen hat, bevor der Prompt gesendet wird. Andere Laufzeitprofile bleiben explorativ.

### Sehen, was sich weiterentwickelt hat

Die Schleife meldet sich an drei Stellen, die alle aus den Append-only-Lineage-Protokollen gelesen werden und nicht aus bloßen Behauptungen:

- `oma skill promotions --all` gibt pro Änderung einen Satz aus, über alle Skills und das Verfahren hinweg: was bearbeitet wurde (Anker und Ersetzung der akzeptierten Änderung), die Held-in- und Held-out-Lifts davor und danach, ob der Final-Test standgehalten hat und, bei einer Verfahrens-Hochstufung, die gepaarte Gewinndifferenz, ihr Intervall und die Skills, an denen sie gemessen wurde. `--skill <id>` beschränkt die Ausgabe auf einen Skill. Mit dieser Version geschriebene Apply-Einträge enthalten die akzeptierten Änderungen und Trainings-Lifts; ältere Einträge fallen auf Hashes zurück.
- `oma doctor` zeigt einen Hinweis **Evolution**: angewendete und zurückgerollte Skill-Änderungen, die jüngste Änderung pro Skill, Verfahrens-Hochstufungen und was auf die Rückkopplung wartet (erfasste Incidents ohne Fixture, noch nicht erfasste fehlgeschlagene Läufe), samt dem Befehl, der sie verarbeiten würde.
- Zu Beginn einer Sitzung injizieren die Hooks des Zustands-Snapshots einen Block `harness evolved since your last session`, der die Hochstufungen auflistet, die seit der letzten Sitzung aufgezeichnet wurden, in der ein solcher Block angezeigt wurde; jede Änderung wird nur einmal angekündigt. Der Marker liegt unter `.agents/state/evolution-notice.json`.

Aktivieren Sie die [Projekt-Harness-Evolution](./harness-evolution.md), um budgetierte Rückkopplungszyklen nach einem Zeitplan auszuführen:

```bash
oma harness evolution enable --max-dispatches 300
oma harness evolution status --json
```

Automatische Zyklen wenden Änderungen, die alle Gates bestehen, als Projekt-Overlays an, bewahren unvollständige Arbeit für einen erneuten Versuch auf und teilen sich ein Dispatch-Kontingent über den gesamten Zyklus. Der Standardzeitplan ist täglich um 03:00 Uhr lokaler Zeit. Verwenden Sie `--mode propose` für die Evaluierung ohne Anwendung und `oma harness evolution disable`, um den Zeitplan zu stoppen. Die Meta-Optimierung des Verfahrens bleibt ein separater manueller Befehl.

---

## Live-Modus

Der Live-Modus ruft echten Maintainer und Proposer auf und führt pro Epoche die Live-Evaluierungsarme erneut aus. Er ist teuer: Jede bewertete Aufgabe erzeugt Baseline- und Treatment-Aufrufe, Judge-Fixtures zusätzliche Bewertungsaufrufe, und der Final-Test bewertet Original- und Kandidatentext. Die Vorschau meldet eine Obergrenze aus der tatsächlichen Aufteilung, einschließlich der anfänglichen Validierungs-Baseline, der Trainings- und Compiler-Aufrufe, der Validierungsaufrufe für Kandidaten, zweier Final-Test-Scores und der gepaarten Nachbarprüfungen für jeden Kandidaten sowie für den finalen Kandidaten. Jeder Aufruf hat ein Timeout von 120 Sekunden. Geschützte Claude- und Codex-Arme deaktivieren Werkzeuge, die automatische Erkennung von Anweisungen, MCP und den Optimierungsspeicher.

```bash
# Cost preview + confirm
oma skill optimize --skill oma-scholar --live

# Skip confirmation
oma skill optimize --skill oma-scholar --live --yes

# Live opt, then apply if improved
oma skill optimize --skill oma-scholar --live --apply --yes
```

Die Kostenvorschau listet die Obergrenze der Modellaufrufe auf, bevor irgendein LLM-Aufruf erfolgt.

Maintainer, Proposer, Evaluierungsarme und Judges teilen sich in frischen temporären Verzeichnissen einen geschützten Text-Transport. Claude verwendet sein eingeschränktes CLI-Profil. Codex verwendet den nativen `codex app-server` mit dem vorhandenen CLI-Login, dem gewählten Modell bzw. Provider und dem Reasoning-Aufwand; es setzt keinen API-Key-Client als Ersatz ein und fällt nicht auf Claude zurück. Das Codex-Profil zielt auf CLI 0.154.x unter macOS/Linux mit nativer dateibasierter Credential-Speicherung und einer vorhandenen `auth.json`. Jeder Aufruf richtet ein privates temporäres `CODEX_HOME` ein, das auf die ursprünglichen Konfigurations- und Auth-Dateien verweist, ohne Credential-Inhalte zu kopieren. Die native Token-Erneuerung verwendet weiterhin die ursprüngliche Auth-Datei. Gemeinsamer Bootstrap-Zustand wird ausgeschlossen, und temporärer Zustand wird anschließend bereinigt. Keyring-, Auto- und flüchtige Credential-Speicher werden derzeit nicht unterstützt. Der Thread-Vertrag wird geprüft, bevor Modelleingaben gesendet werden; nicht unterstützte Versionen, Speichermodi und Protokollfehler beenden den Dispatch. Werkzeuge, die Erkennung von Startanweisungen, MCP-Zugriff und Sitzungspersistenz sind deaktiviert, damit Compiler-Prozesse zurückgehaltene Fixtures nicht über Agentenwerkzeuge lesen können. Andere Compiler-Vendors schlagen ausdrücklich fehl, bis sie einen verifizierten Transport haben.

Der Optimierer meldet `proposed` für gültige Änderungen und `no-action` nur bei einer expliziten `NO_ACTION`-Antwort. Prozess-/API-Fehler werden zu `dispatch-error`; fehlerhafte Antworten ohne gültige Änderungen werden zu `parse-error`. Diese Fehler können nicht zu leeren Änderungslisten werden. Kann der Maintainer keine validierten Muster liefern, meldet er `degraded` mit einem Dispatch- oder Parsing-Grund; Fallback-Muster werden vom dauerhaften Wissen ausgeschlossen, und der Lauf kann keinen Kandidaten hochstufen. Evaluierungsfehler erscheinen in `diagnostics` und in den Proposal-Gate-Aufzeichnungen und nicht in der gelernten Ablehnungshistorie.

---

## JSON-Ausgabe

```bash
oma skill optimize --skill oma-scholar --live --dry-run --max-epochs 1 --json
```

```json
{
  "ok": true,
  "skill": "oma-scholar",
  "baselineLift": 0.0,
  "finalLift": 1.0,
  "baselineTrainLift": 0.5,
  "finalTrainLift": 1.0,
  "epochCount": 1,
  "acceptedEdits": [
    { "op": "add", "anchor": "### When to use", "after": "\n- User asks for a summary of arxiv abstracts or DOI-linked documents." }
  ],
  "rejectedCount": 0,
  "applied": false,
  "diff": "--- a/SKILL.md\n+++ b/SKILL.md\n...",
  "_dryRun": true,
  "finalTest": {
    "baselineLift": 0.0,
    "candidateLift": 0.3333,
    "passed": true,
    "findings": [
      { "taskId": "oma-scholar-doi-summary", "original": 0, "candidate": 1 },
      { "taskId": "oma-scholar-citation-format", "original": 0, "candidate": 0 },
      { "taskId": "oma-scholar-claim-check", "original": 0, "candidate": 0 }
    ]
  },
  "promotion": { "eligible": true, "reasons": [] },
  "diagnostics": [],
  "budget": { "limit": null, "used": 42 },
  "_split": { "trainCount": 4, "valCount": 1, "testCount": 3 }
}
```

`ok` erfordert `(applied || (acceptedEdits.length > 0 && finalLift >= baselineLift))`, `finalTest.passed === true` und `promotion.eligible === true`. `baselineTrainLift` und `finalTrainLift` geben den Held-in-Split neben den Validierungs-Lifts an. Dieselbe Bedingung steuert `--apply`: Eine Änderung, die allein für eine Trainingsreparatur akzeptiert wurde, wird nur geschrieben, wenn auch der Final-Test besteht. Ein fehlender Final-Test oder ein fehlendes Hochstufungsobjekt kann kein `ok: true` erzeugen. Die `_split`-Zahlen zeigen die tatsächliche lokale Fixture-Aufteilung des Laufs.

Ein nicht gemessener Kandidat kann beispielsweise diesen Berichtsauszug erzeugen:

```json
{
  "ok": false,
  "acceptedEdits": [],
  "rejectedCount": 0,
  "finalTest": { "baselineLift": 0.0, "candidateLift": 0.0, "passed": false },
  "promotion": {
    "eligible": false,
    "reasons": ["validation:inconclusive", "final-test-failed", "no-validated-candidate"]
  },
  "diagnostics": [
    {
      "stage": "validation",
      "status": "inconclusive",
      "message": "Candidate evaluation is incomplete; retry after repairing the evaluation conditions."
    }
  ]
}
```

Prüfen Sie `diagnostics`, `promotion.reasons` und gegebenenfalls `finalTest.blocker`, bevor Sie es erneut versuchen. `rejectedCount` steigt bei einem nicht schlüssigen Vorschlag nicht. Ein gemessener Final-Test-Fehlschlag kann die Audit-Ablehnungszahl des Laufs erhöhen und bleibt dabei vom dauerhaften Ablehnungswissen ausgeschlossen.

---

## SSOT-Hinweis für `oma-*`-Skills

Skills mit einer ID, die mit `oma-` beginnt, gehören oh-my-agent und werden durch `oma update` **überschrieben**. Für diese Skills wird `--apply` nicht empfohlen. Verwenden Sie `--dry-run` (Standard), prüfen Sie den vorgeschlagenen Diff und übertragen Sie sinnvolle Änderungen in die Registry. Für benutzererstellte Skills ist `--apply` sicher.

Der Befehl gibt eine Warnung aus, wenn der Zielskill OMA gehört:

```
[oma skill opt] warning: "oma-scholar" is an oma-owned skill. --apply output will be overwritten by oma update. Consider using --dry-run and upstreaming the diff instead.
```

---

## Schutz vor Overfitting

Maintainer und Proposer erhalten die Rollout-Evidenz des TRAIN-Splits. Die Kandidatenauswahl verwendet den zurückgehaltenen VALIDATION-Split, und der separate TEST-Split wird vom Runner verwaltet. Die werkzeugfreie Compiler-Ausführung verhindert den Workspace-Zugriff auf diese zurückgehaltenen Fixtures und Evaluatoren.

Ein Final-Test-Fehlschlag verhindert die Anwendung. Sein Ergebnis bleibt für Audits verfügbar, aber weder Final-Test-Gate-Ergebnisse noch nicht schlüssige Vorschläge fließen in das dauerhafte Optimierungswissen ein. Auch der Recorder, das erneute Laden der Historie und die semantischen Abrufpfade schließen Legacy-Final-Test-Ergebnisse aus, sodass ein späterer Lauf einen früheren Final-Test-Erfolg oder -Fehlschlag nicht als Trainings-Feedback nutzen kann.

---

## CI-Integration

Verwenden Sie die Evaluierungs-Wiedergabe für eine Offline-CI-Prüfung vorhandener kandidatenspezifischer Aufzeichnungen:

```bash
oma skill eval --skill oma-scholar --mock --neg-transfer --require-coverage --json
```

Die CLI-Optimierung selbst erfordert `--live`; sie hat noch keinen Adapter zur Wiedergabe aufgezeichneter Vorschläge. Frühere Hinweise, die `oma skill optimize --mock` als vollständigen Offline-Optimierer beschrieben, waren falsch. Verlagern Sie Offline-Wiedergabe-Jobs auf `oma skill eval --mock` oder aktivieren Sie die Live-Optimierung samt ihren Modellkosten ausdrücklich. Prüfen Sie bei Optimierungsläufen das JSON-Feld `ok` und `promotion.eligible`: Exit-Code null deckt auch abgeschlossene Läufe ab, die keinen hochstufbaren Kandidaten gefunden haben.

Exit-Codes der Optimierung:
- `0` — Optimierung abgeschlossen (mit oder ohne Verbesserung)
- `1` — ungültige Eingabe oder Ausführungsfehler, einschließlich CLI-Optimierung ohne Live-Modus, widersprüchlicher Flags `--live --mock`, unzureichender Fixture-Anzahl, eines nicht unterstützten Compiler-Vendors, eines Optimierer-Dispatch-Fehlers oder fehlerhafter Optimierer-Ausgabe

---

## Siehe auch

- [Skill-Nutzwert-Evaluierung](/docs/guide/skill-eval) — Aufgaben-Fixtures, Prüfertypen, Mock-/Live-Modi und das Verzeichnis `_rollouts/`.
- [CLI-Befehle](/docs/cli-interfaces/commands) — Flag-Referenz für alle Skill-Verwaltungsbefehle.
