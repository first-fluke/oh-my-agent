---
title: Warum oh-my-agent
description: Positionierung von oh-my-agent in einer gesättigten Multi-Agent-CLI-Kategorie. Die Kostenachse hat sich von Implementierung zu Tests und Wartung verschoben; oh-my-agent liefert Quality Gates, unabhängige Verifikation, Multi-Vendor-Dispatch und repo-native Anpassung als Antwort auf diese Verschiebung.
---

# Warum oh-my-agent

Die Multi-Agent-CLI-Kategorie ist gesättigt. Allein im letzten Quartal sind mehr als zwanzig Multi-Agent-Orchestratoren erschienen: Metateam, OpenSwarm, DevSquad, Praktor, Salacia, Codelegate, agent-of-empires, TTal, Maggy und weitere. Die meisten optimieren dieselbe Achse: Agenten Code schneller schreiben zu lassen.

oh-my-agent optimiert eine andere Achse. Die Ausgangsannahme: Mit ausreichend leistungsfähigen Modellen nähern sich die Kosten für Analyse, Design und Implementierung im SDLC der Null. Der teure Teil der Softwareentwicklung war schon immer Testen und Wartung – ein System auch nach dem ersten Commit am Laufen, sicher und verständlich zu halten. Genau um diese Achse herum ist oh-my-agent gebaut.

Diese Seite konkretisiert diese Positionierung. Für die ausführliche Diskussion, die dieses Framing hervorgebracht hat, siehe [Issue #155](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589).

---

## Die Kostenachse hat sich verschoben

Wenn ein einzelnes leistungsfähiges Modell in Minuten ein funktionierendes Feature produziert, ist nicht mehr der Implementierungsdurchsatz das Bottleneck. Das Bottleneck ist: zu verifizieren, dass der produzierte Code tatsächlich tut, was er behauptet; stille Regressionen über Iterationen hinweg zu fangen; Secrets aus Prompts und Logs herauszuhalten; den Token-Verbrauch sichtbar zu machen, bevor er das Team überrascht.

Ein Harness, der nur Agenten schneller spawnt, löst nichts davon. Ein Harness, der für die Phase nach der Implementierung entworfen ist, schon.

---

## Was oh-my-agent dem echten Cost Center liefert

Jede Fähigkeit unten reagiert auf einen spezifischen Fehlermodus, der in der Multi-Agent-CLI-Kategorie gemeldet wurde.

### Unabhängige Verifikation, keine LLM-Selbsteinschätzung

`oma verify <agent>` führt vierzehn deterministische Checks pro Agententyp aus. Alles mechanische Checks: Exit Code des Testkommandos, TypeScript strict bestanden, raw-SQL-Mustererkennung, Hardcoded-Secret-Scan, Flutter analyze, Inline-Style-Scan, Scope-Verletzung gegen den Charter des Agenten. Kein LLM beurteilt, ob die Arbeit „korrekt aussieht". Ein Check besteht genau dann, wenn das zugrundeliegende Kommando Erfolg meldet.

Das antwortet auf die häufigste Beschwerde der Kategorie, in einem Community-Post zusammengefasst als „agents lie - they say tests pass when tests do not". Siehe `cli/commands/verify/verify.ts` für die Check-Liste.

### Re-Verifikation über Iterationen hinweg

Der `ralph`-Workflow umhüllt `ultrawork` mit einer unabhängigen JUDGE-Phase. Nach jeder Iteration verifiziert JUDGE jedes Criterion erneut – einschließlich derer, die in vorherigen Iterationen bereits bestanden haben. Das fängt den Fall, in dem das Fixen von C2 still C1 bricht – der eigentliche Mechanismus hinter den meisten Regressionen in langen Agentensitzungen.

Schwere Verifikationen (länger als dreißig Sekunden) werden gegen die betroffenen Dateipfade gecached, damit Re-Verifikation günstig bleibt. Siehe `.agents/workflows/ralph/resources/judge-protocol.md` für das vollständige Protokoll.

### Quota Caps, die vor dem Schaden blockieren

Jeder `oma agent spawn`-Aufruf zeichnet die Token-Schätzung dieses Spawns in `.serena/memories/session-cost-{sessionId}.md` auf. Vor dem nächsten Spawn konsultiert `checkCap` den konfigurierten Quota Cap und verweigert den Start, wenn eine Dimension überschritten wird. Drei Dimensionen werden durchgesetzt: Gesamt-Tokens, Gesamt-Spawn-Anzahl, Token-Budget pro Vendor.

Das ist der Unterschied zwischen nachträglich zu erfahren, dass man vierzigtausend Dollar ausgegeben hat, und beim Spawn fünfzehn gesagt zu bekommen, dass im Budget noch ein Spawn übrig ist. Siehe `cli/io/session-cost.ts` und konfiguriere unter `session.quota_cap` in `.agents/oma-config.yaml`.

### Retry dann Explore, nicht Retry für immer

Wenn `orchestrate` Step 5 einen Verifikationsfehler findet, wiederholt es den Agenten bis zu zwei Mal mit Fehlerkontext. Wenn der zweite Retry immer noch scheitert und der Cost Cap noch nicht überschritten ist, wechselt der Workflow in den Exploration Loop: er spawnt parallel zwei oder drei alternative Hypothesenvarianten in separaten Workspaces und behält nur das Ergebnis mit der höchsten Punktzahl. Gescheiterte Ansätze werden mit ihren Kosten festgehalten verworfen.

Das ist eine strukturierte Antwort auf den Fall, dass ein Ansatz fundamental falsch ist. Ihn zu wiederholen konvergiert nie; verschiedene Ansätze parallel zu probieren schon.

### Monorepo-bewusstes Workspace-Routing

`detectWorkspace` liest pnpm-, nx-, turbo- und lerna-Konfigurationen und routet jeden Agenten automatisch zu seinem Sub-Workspace. Der Backend Agent läuft gegen `apps/api/`, der Frontend Agent gegen `apps/web/` – ohne dass der Orchestrator Pfade manuell zusammenbauen muss. Siehe `cli/io/workspaces.ts`.

---

## Multi-Vendor ist nicht optional

Die zweite Designannahme ist, dass jedes Team, das ernsthaft KI-gestützte Entwicklung betreibt, mehr als einen Provider nutzt. Heute heißt das Claude, Codex, Gemini, Copilot, Qwen, Kimi und was im nächsten Quartal kommt. Vendor-Wechsel ist Fakt, kein Edge Case – Anthropic verschiebt Agent-Funktionen in einen separat bezahlten Plan, OpenAI veröffentlicht Codex CLI in derselben Woche, in der Anthropic-Modelle degradieren, GitHub Copilot wechselt zu Consumption-basierter Abrechnung.

oh-my-agent behandelt Vendor-Auswahl als Per-Agent-Konfiguration über `model_preset` und `agents.<id>.model` in `.agents/oma-config.yaml`. Das portable `.agents/`-Verzeichnis ist die Single Source of Truth; jedes unterstützte Runtime projiziert daraus. Kein Vendor Lock-in ist nötig, um oh-my-agent zu nutzen, und keine Migration ist nötig beim Wechsel.

---

## Repo-native Anpassung

Die dritte Annahme ist, dass keine zwei Teams dieselbe Definition von „done" teilen. Ein Team verlangt OWASP-Top-10-Scans bei jeder Backend-Änderung. Ein anderes verlangt einen QA-Bericht auf Koreanisch. Ein drittes verlangt, dass jede Migration vor dem Merge von einem Database Agent reviewt wird.

Weil `.agents/` einfach Dateien in deinem Repository sind, kann jedes Team Agenten, Skills, Workflows und Quality Gates hinzufügen oder modifizieren, um zum eigenen Code of Conduct und zur Compliance-Haltung zu passen. Anpassung ist ein `git commit`, kein Vendor-Support-Ticket.

---

## Was das in der Praxis bedeutet

Wenn deine Priorität „parallele Agenten schnell spawnen" ist, decken viele Tools diese Oberfläche ab. Wenn deine Priorität „Code ausliefern, der weiterläuft, nachdem die Agenten den Raum verlassen haben" ist, ist oh-my-agent für genau dieses Ziel gebaut. `oma verify`, JUDGE, Exploration Loop, Quota Cap und Monorepo-Routing sind keine optionalen Add-ons – sie sind der Grund, warum das Projekt existiert.

Für Details zu jeder Fähigkeit siehe den Bereich Core Concepts (Agents, Parallel Execution) in der Seitenleiste.
