---
title: "Anleitung: Bugfixing"
description: Umfassende Debugging-Anleitung mit der strukturierten 5-Schritte-Schleife, Schweregrad-Triage, Eskalationssignalen und Post-Fix-Validierung.
---

# Anleitung: Bugfixing

## Wann der Debug-Workflow eingesetzt wird

Verwenden Sie `/debug` (oder sagen Sie in natürlicher Sprache "fix bug", "fix error", "debug"), wenn Sie einen bestimmten Bug diagnostizieren und beheben möchten. Der Workflow bietet einen strukturierten, reproduzierbaren Ansatz zum Debuggen, der die häufige Falle vermeidet, Symptome statt Ursachen zu beheben.

Der Debug-Workflow unterstützt alle Anbieter (Gemini, Claude, Codex, Qwen). Die Schritte 1-5 werden inline ausgeführt. Schritt 6 (Scan nach ähnlichen Mustern) kann an einen `debug-investigator`-Subagenten delegiert werden, wenn der Scan-Umfang groß ist (10+ Dateien oder domänenübergreifende Fehler).

---

## Fehlerbericht-Vorlage

Geben Sie beim Melden eines Bugs so viele der folgenden Informationen wie möglich an. Jedes Feld hilft dem Debug-Workflow, die Suche schneller einzugrenzen.

### Pflichtfelder

| Feld | Beschreibung | Beispiel |
|:------|:-----------|:--------|
| **Fehlermeldung** | Der exakte Fehlertext oder Stack-Trace | `TypeError: Cannot read properties of undefined (reading 'id')` |
| **Reproduktionsschritte** | Geordnete Aktionen, die den Bug auslösen | 1. Als Admin anmelden. 2. Zu /users navigieren. 3. Bei einem beliebigen Benutzer auf "Löschen" klicken. |
| **Erwartetes Verhalten** | Was passieren sollte | Benutzer wird gelöscht und aus der Liste entfernt. |
| **Tatsächliches Verhalten** | Was tatsächlich passiert | Seite stürzt mit weißem Bildschirm ab. |

### Optionale Felder (dringend empfohlen)

| Feld | Beschreibung | Beispiel |
|:------|:-----------|:--------|
| **Umgebung** | Browser, Betriebssystem, Node-Version, Gerät | Chrome 124, macOS 15.3, Node 22.1 |
| **Häufigkeit** | Immer, manchmal, nur beim ersten Mal | Immer reproduzierbar |
| **Letzte Änderungen** | Was sich vor dem Auftreten des Bugs geändert hat | PR #142 gemergt (Benutzerlöschungsfunktion) |
| **Betroffener Code** | Dateien oder Funktionen, die Sie vermuten | `src/api/users.ts`, `deleteUser()` |
| **Logs** | Server-Logs, Konsolenausgabe | `[ERROR] UserService.delete: user.organizationId is undefined` |
| **Screenshots/Aufzeichnungen** | Visuelle Belege | Screenshot der Fehlerseite |

Je mehr Kontext Sie von Anfang an liefern, desto weniger Rückfragen benötigt der Debug-Workflow.

---

## Schweregrad-Triage (P0-P3)

Der Schweregrad bestimmt, wie der Bug behandelt wird und wie schnell er behoben werden muss.

### P0 — Kritisch (sofortige Reaktion)

**Definition:** Produktion ist ausgefallen, Daten gehen verloren oder werden beschädigt, eine Sicherheitslücke wird aktiv ausgenutzt.

**Erwartete Reaktion:** Alles stehen und liegen lassen. Dies ist die einzige Aufgabe, bis das Problem gelöst ist.

**Beispiele:**
- Authentifizierungssystem wird umgangen — alle Benutzer können auf Admin-Endpunkte zugreifen.
- Datenbankmigration hat die Benutzertabelle beschädigt — Konten sind nicht erreichbar.
- Zahlungsverarbeitung belastet Kunden doppelt.
- API-Endpunkt gibt persönliche Daten anderer Benutzer zurück.

**Debug-Ansatz:** Vollständige Vorlage überspringen. Fehlermeldung und Stack-Trace angeben. Der Workflow beginnt sofort bei Schritt 2 (Reproduzieren).

### P1 — Hoch (gleiche Sitzung)

**Definition:** Eine Kernfunktion ist für eine erhebliche Anzahl von Benutzern defekt. Ein Workaround existiert möglicherweise, ist aber langfristig nicht akzeptabel.

**Erwartete Reaktion:** Innerhalb der aktuellen Arbeitssitzung beheben. Keine neuen Features beginnen, bis der Bug behoben ist.

**Beispiele:**
- Suche liefert keine Ergebnisse bei Abfragen mit Sonderzeichen.
- Datei-Upload schlägt bei Dateien über 5 MB fehl (Limit sollte 50 MB sein).
- Mobile App stürzt beim Start auf Android-14-Geräten ab.
- Passwort-Zurücksetzen-E-Mails werden nicht gesendet (E-Mail-Service-Integration defekt).

**Debug-Ansatz:** Vollständige 5-Schritte-Schleife. QA-Review nach der Behebung empfohlen.

### P2 — Mittel (dieser Sprint)

**Definition:** Eine Funktion arbeitet, aber mit eingeschränktem Verhalten. Beeinträchtigt die Benutzerfreundlichkeit, nicht die Funktionalität.

**Erwartete Reaktion:** Für den aktuellen Sprint einplanen. Vor dem nächsten Release beheben.

**Beispiele:**
- Tabellensortierung ist Groß-/Kleinschreibung-sensitiv ("apple" sortiert nach "Zebra").
- Dark Mode hat unlesbaren Text im Einstellungsbereich.
- API-Antwortzeit für den /users-Endpunkt beträgt 8 Sekunden (sollte unter 1 s liegen).
- Seitenumbruch zeigt "Seite 1 von 0" an, wenn die Liste leer ist.

**Debug-Ansatz:** Vollständige 5-Schritte-Schleife. In die QA-Regressions-Suite aufnehmen.

### P3 — Niedrig (Backlog)

**Definition:** Kosmetisches Problem, Grenzfall oder geringfügige Unannehmlichkeit.

**Erwartete Reaktion:** Ins Backlog aufnehmen. Beheben, wenn es passt, oder mit verwandten Änderungen bündeln.

**Beispiele:**
- Tooltip-Text hat einen Tippfehler: "Delet" statt "Delete".
- Konsolenwarnung über veraltete React-Lifecycle-Methode.
- Footer-Ausrichtung ist um 2 Pixel versetzt bei Viewport-Breiten zwischen 768-800px.
- Lade-Spinner dreht sich 200 ms weiter, nachdem der Inhalt sichtbar ist.

**Debug-Ansatz:** Die vollständige Debug-Schleife ist möglicherweise nicht nötig. Eine direkte Behebung mit Regressionstest genügt.

---

## Die 5-Schritte-Debug-Schleife im Detail

Der `/debug`-Workflow führt diese Schritte in strikter Reihenfolge aus. Dabei werden durchgehend MCP-Code-Analyse-Tools eingesetzt — niemals rohe Dateizugriffe oder grep.

### Schritt 1: Fehlerinformationen sammeln

Der Workflow erfragt (oder empfängt vom Benutzer):
- Fehlermeldung und Stack-Trace
- Reproduktionsschritte
- Erwartetes vs. tatsächliches Verhalten
- Umgebungsdetails

Wurde bereits eine Fehlermeldung im Prompt angegeben, fährt der Workflow sofort mit Schritt 2 fort.

### Schritt 2: Den Bug reproduzieren

**Verwendete Tools:** `search_for_pattern` mit der Fehlermeldung oder Stack-Trace-Schlüsselwörtern, `find_symbol` zur Lokalisierung der exakten Funktion und Datei.

Das Ziel ist die Lokalisierung des Fehlers in der Codebasis — die exakte Zeile finden, in der die Exception geworfen wird, die exakte Funktion, die falsche Ausgabe produziert, oder die exakte Bedingung, die das unerwartete Verhalten verursacht.

Dieser Schritt wandelt ein vom Benutzer gemeldetes Symptom ("die Seite stürzt ab") in eine Codebasis-Lokalisierung um (`src/api/users.ts:47, deleteUser() wirft TypeError`).

### Schritt 3: Grundursache diagnostizieren

**Verwendete Tools:** `find_referencing_symbols` zur Rückverfolgung des Ausführungspfads vom Fehlerpunkt aus.

Der Workflow verfolgt den Fehler vom Fehlerort rückwärts, um die tatsächliche Ursache zu finden. Dabei wird auf diese häufigen Grundursachenmuster geprüft:

| Muster | Worauf zu achten ist |
|:--------|:----------------|
| **Null-/Undefined-Zugriff** | Fehlende Null-Prüfungen, Optional Chaining benötigt, nicht initialisierte Variablen |
| **Race Conditions** | Asynchrone Operationen in falscher Reihenfolge, fehlendes await, gemeinsam genutzter veränderlicher Zustand |
| **Fehlende Fehlerbehandlung** | try/catch nicht vorhanden, Promise-Rejection unbehandelt, Error Boundary fehlt |
| **Falsche Datentypen** | String statt Zahl erwartet, fehlende Typkonvertierung, fehlerhaftes Schema |
| **Veralteter Zustand** | React-State aktualisiert sich nicht, Cache nicht invalidiert, Closure erfasst alten Wert |
| **Fehlende Validierung** | Benutzereingaben nicht bereinigt, API-Request-Body nicht validiert, Grenzwerte nicht geprüft |

Die entscheidende Disziplin: die **Grundursache** diagnostizieren, nicht das Symptom. Wenn `user.id` undefined ist, lautet die Frage nicht "wie prüfe ich auf undefined?", sondern "warum ist user an dieser Stelle im Ausführungspfad undefined?"

### Schritt 4: Minimale Korrektur vorschlagen

Der Workflow präsentiert:
1. Die identifizierte Grundursache (mit Belegen aus der Code-Analyse).
2. Die vorgeschlagene Korrektur (nur das Notwendigste ändernd).
3. Eine Erklärung, warum diese Korrektur die Grundursache behebt und nicht nur das Symptom.

**Der Workflow blockiert hier, bis der Benutzer bestätigt.** Dies verhindert, dass der Debug-Agent ohne Genehmigung Änderungen vornimmt.

**Prinzip der minimalen Korrektur:** So wenige Zeilen wie möglich ändern. Nicht refaktorisieren, keinen Code-Stil verbessern, keine unverwandten Features hinzufügen. Die Korrektur sollte in unter 2 Minuten reviewbar sein.

### Schritt 5: Korrektur anwenden und Regressionstest schreiben

In diesem Schritt geschehen zwei Dinge:

1. **Korrektur implementieren** — Die genehmigte minimale Änderung wird angewendet.
2. **Regressionstest schreiben** — Ein Test, der:
   - Den ursprünglichen Bug reproduziert (der Test muss ohne die Korrektur fehlschlagen)
   - Bestätigt, dass die Korrektur wirkt (der Test muss mit der Korrektur bestehen)
   - Verhindert, dass derselbe Bug bei zukünftigen Änderungen erneut auftritt

Der Regressionstest ist das wichtigste Ergebnis des Debug-Workflows. Ohne ihn kann derselbe Bug durch jede zukünftige Änderung erneut eingeführt werden.

### Schritt 6: Nach ähnlichen Mustern scannen

Nach der Korrektur scannt der Workflow die gesamte Codebasis nach demselben Muster, das den Bug verursacht hat.

**Verwendete Tools:** `search_for_pattern` mit dem als Grundursache identifizierten Muster.

Beispiel: Wurde der Bug dadurch verursacht, dass `user.organization.id` ohne Prüfung auf null bei `organization` zugegriffen wurde, sucht der Scan nach allen anderen Zugriffen auf `organization.id` ohne Null-Prüfung.

**Kriterien für Subagenten-Delegation** — Der Workflow startet einen `debug-investigator`-Subagenten, wenn:
- Der Fehler mehrere Domänen umfasst (z. B. sowohl Frontend als auch Backend betroffen).
- Der Scan-Umfang für ähnliche Muster 10+ Dateien umfasst.
- Tiefe Abhängigkeitsverfolgung zur vollständigen Diagnose erforderlich ist.

Vendor-spezifische Startmethoden:

| Anbieter | Startmethode |
|:-------|:------------|
| Claude Code | Agent-Tool mit `.claude/agents/debug-investigator.md` |
| Codex CLI | Modellvermittelte Subagenten-Anfrage, Ergebnisse als JSON |
| Gemini CLI | `oh-my-ag agent:spawn debug "scan prompt" {session_id} -w {workspace}` |
| Antigravity / Fallback | `oh-my-ag agent:spawn debug "scan prompt" {session_id} -w {workspace}` |

Alle ähnlichen verwundbaren Stellen werden gemeldet. Bestätigte Fälle werden in derselben Sitzung behoben.

### Schritt 7: Den Bug dokumentieren

Der Workflow schreibt eine Memory-Datei mit:
- Symptom und Grundursache
- Angewendete Korrektur und geänderte Dateien
- Regressionstest-Speicherort
- Im gesamten Codebase gefundene ähnliche Muster

---

## Prompt-Vorlage für /debug

Beim Auslösen des Debug-Workflows kann ein strukturierter Prompt angegeben werden:

```
/debug

Error: TypeError: Cannot read properties of undefined (reading 'id')
Stack trace:
  at deleteUser (src/api/users.ts:47:23)
  at handleDelete (src/routes/users.ts:112:5)

Steps to reproduce:
1. Log in as admin
2. Navigate to /users
3. Click "Delete" on a user whose organization was deleted

Expected: User is deleted
Actual: 500 Internal Server Error

Environment: Node 22.1, PostgreSQL 16
```

**Warum diese Struktur funktioniert:**

- **Fehler + Stack-Trace** ermöglichen es Schritt 2, den Code sofort zu lokalisieren (`search_for_pattern` mit "deleteUser" findet die Funktion; `find_symbol` bestimmt die exakte Position).
- **Reproduktionsschritte** mit der spezifischen Auslösebedingung ("Benutzer, dessen Organisation gelöscht wurde") deuten auf die Grundursache hin (Null-Fremdschlüssel).
- **Umgebung** eliminiert versionsspezifische Ablenkungen.

Für einfachere Bugs genügt ein kürzerer Prompt:

```
/debug The login page shows "Invalid credentials" even with correct password
```

Der Workflow wird bei Bedarf nach zusätzlichen Details fragen.

---

## Eskalationssignale

Diese Signale zeigen an, dass der Bug eine Eskalation über die Standard-Debug-Schleife hinaus erfordert:

### Signal 1: Gleiche Korrektur zweimal versucht

Wenn der Workflow eine Korrektur vorschlägt, anwendet und derselbe Fehler erneut auftritt, liegt das Problem tiefer als die ursprüngliche Diagnose. Dies löst die **Explorationsschleife** in Workflows aus, die diese unterstützen (ultrawork, orchestrate, work):

- 2-3 alternative Hypothesen zur Grundursache generieren.
- Jede Hypothese in einem separaten Workspace testen (git stash pro Versuch).
- Ergebnisse bewerten und den besten Ansatz übernehmen.

### Signal 2: Domänenübergreifende Grundursache

Der Fehler im Frontend wird durch eine Backend-Änderung verursacht, die wiederum durch eine Datenbank-Schema-Migration verursacht wird. Wenn die Grundursache Domänengrenzen überschreitet, eskalieren Sie an `/work` oder `/orchestrate`, um die zuständigen Domänen-Agenten einzubeziehen.

**Beispiel:** Frontend zeigt "undefined" für den Benutzernamen an. Backend gibt null für `user.display_name` zurück. Die Datenbankmigration hat die Spalte hinzugefügt, aber vorhandene Zeilen enthalten NULL-Werte. Korrektur erfordert: Datenbankmigration (Nachbefüllung), Backend-Null-Behandlung und Frontend-Fallback-Anzeige.

### Signal 3: Fehlende Reproduktionsumgebung

Der Bug tritt nur in der Produktion auf, und eine lokale Reproduktion ist nicht möglich. Anzeichen dafür sind:
- Umgebungsspezifische Konfigurationsunterschiede.
- Race Conditions, die nur unter Produktionslast auftreten.
- Unterschiedliches Verhalten von Drittanbieterdiensten zwischen Staging und Produktion.

**Aktion:** Produktions-Logs erfassen, Zugang zum Produktions-Monitoring anfordern und das Hinzufügen von Instrumentierung/Logging in Betracht ziehen, bevor eine Korrektur versucht wird.

### Signal 4: Testinfrastruktur-Fehler

Der Regressionstest kann nicht geschrieben werden, weil die Testinfrastruktur defekt, fehlend oder unzureichend ist.

**Aktion:** Zuerst die Testinfrastruktur reparieren (oder `oma install` zur Konfiguration verwenden), dann zum Debug-Workflow zurückkehren.

---

## Post-Fix-Validierungscheckliste

Nach dem Anwenden der Korrektur und des Regressionstests ist zu prüfen:

- [ ] **Regressionstest schlägt ohne die Korrektur fehl** — Korrektur vorübergehend zurücknehmen und bestätigen, dass der Test den Bug erkennt.
- [ ] **Regressionstest besteht mit der Korrektur** — Korrektur anwenden und bestätigen, dass der Test besteht.
- [ ] **Vorhandene Tests bestehen weiterhin** — Vollständige Testsuite ausführen, um keine Regressionen zu verifizieren.
- [ ] **Build ist erfolgreich** — Projekt kompilieren/bauen, um Typfehler oder Import-Probleme zu erkennen.
- [ ] **Ähnliche Muster gescannt** — Schritt 6 wurde abgeschlossen und alle gefundenen Fälle sind behoben oder dokumentiert.
- [ ] **Korrektur ist minimal** — Nur die notwendigen Zeilen wurden geändert. Kein unverwandtes Refactoring enthalten.
- [ ] **Grundursache dokumentiert** — Die Memory-Datei enthält: Symptom, Grundursache, angewendete Korrektur, geänderte Dateien, Regressionstest-Speicherort und gefundene ähnliche Muster.

---

## Abschlusskriterien

Der Debug-Workflow ist abgeschlossen, wenn:

1. Die Grundursache identifiziert und dokumentiert ist (nicht nur das Symptom).
2. Eine minimale Korrektur mit Benutzergenehmigung angewendet wurde.
3. Ein Regressionstest existiert, der ohne die Korrektur fehlschlägt und mit ihr besteht.
4. Die Codebasis nach ähnlichen Mustern gescannt wurde und alle bestätigten Fälle behandelt sind.
5. Ein Fehlerbericht im Memory mit folgenden Informationen hinterlegt ist: Symptom, Grundursache, angewendete Korrektur, geänderte Dateien, Regressionstest-Speicherort und gefundene ähnliche Muster.
6. Alle vorhandenen Tests nach der Korrektur weiterhin bestehen.
