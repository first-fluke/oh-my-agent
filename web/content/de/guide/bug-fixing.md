---
title: "Anwendungsfall: Fehlerbehebung"
description: Strukturierte Reproduzieren-Diagnostizieren-Beheben-Regressionstesten-Schleife mit schweregradbasierter Eskalation.
---

# Anwendungsfall: Fehlerbehebung

## Aufnahmeformat

Beginnen Sie mit einem reproduzierbaren Bericht:

```text
Symptom:
Environment:
Steps to reproduce:
Expected vs actual:
Logs/trace:
Regression window (if known):
```

## Schweregrad-Triage

Klassifizieren Sie frühzeitig, um die Reaktionsgeschwindigkeit zu wählen:

- `P0`: Datenverlust, Auth-Bypass, Produktionsausfall
- `P1`: Wichtiger Benutzerablauf gestört
- `P2`: Eingeschränktes Verhalten mit Workaround
- `P3`: Geringfügig/nicht blockierend

`P0/P1` sollten immer ein QA-/Sicherheits-Review beinhalten.

## Ausführungsschleife

1. Exakt in einer minimalen Umgebung reproduzieren.
2. Ursache isolieren (nicht nur Symptombehandlung).
3. Kleinstmögliche sichere Korrektur implementieren.
4. Regressionstests für den fehlgeschlagenen Pfad hinzufügen.
5. Angrenzende Pfade prüfen, die wahrscheinlich denselben Fehlermodus aufweisen.

## Prompt-Vorlage für oma-debug

```text
Bug: <error/symptom>
Repro steps: <steps>
Scope: <files/modules>
Expected behavior: <expected>
Need:
1) root cause
2) minimal fix
3) regression tests
4) adjacent-risk scan
```

## Häufige Eskalationssignale

Eskalieren Sie an QA oder Sicherheit, wenn der Fehler folgende Bereiche betrifft:

- Authentifizierung/Sitzung/Token-Aktualisierung
- Berechtigungsgrenzen
- Zahlungs-/Transaktionskonsistenz
- Performance-Regressionen unter Last

## Validierung nach der Behebung

- Ursprüngliche Reproduktion schlägt nicht mehr fehl
- Keine neuen Fehler in verwandten Abläufen
- Tests schlagen vor der Korrektur fehl und bestehen danach
- Rollback-Pfad ist klar, falls ein Hotfix erforderlich ist

## Abschlusskriterien

Die Fehlerbehebung ist abgeschlossen, wenn:

- Die Ursache identifiziert und dokumentiert ist
- Die Korrektur durch reproduzierbare Prüfungen verifiziert ist
- Die Regressionsabdeckung gewährleistet ist
