---
title: Einführung
description: Was oh-my-agent ist und wie die Multi-Agenten-Zusammenarbeit funktioniert.
---

# Einführung

oh-my-agent ist ein Multi-Agenten-Orchestrator für die Antigravity-IDE. Er leitet Anfragen an spezialisierte Skills weiter und koordiniert Agenten über Serena-Speicher.

## Was Sie erhalten

- Anfragengesteuerte Skill-Weiterleitung
- Workflow-basierte Ausführung für Planung/Review/Debugging
- CLI-Orchestrierung für parallele Agentenläufe
- Echtzeit-Dashboards zur Sitzungsüberwachung

## Agentenrollen

| Agent | Verantwortlichkeit |
|---|---|
| oma-coordination | Koordiniert komplexe domänenübergreifende Projekte |
| oma-pm | Planung und Architekturzerlegung |
| oma-frontend | React/Next.js-Implementierung |
| oma-backend | API-/Datenbank-/Auth-Implementierung |
| oma-mobile | Flutter/Mobile-Implementierung |
| oma-qa | Sicherheits-/Performance-/Barrierefreiheits-Review |
| oma-debug | Ursachenanalyse und regressionssichere Korrekturen |
| oma-brainstorm | Design-First-Ideenfindung und Konzepterkundung |
| oma-db | Datenbankmodellierung, Schema-Design und Query-Tuning |
| oma-dev-workflow | Entwickler-Workflow-Optimierung und CI/CD |
| oma-tf-infra | Terraform Infrastructure-as-Code Bereitstellung |
| oma-translator | Kontextbewusste mehrsprachige Übersetzung |
| oma-orchestrator | CLI-basierte Sub-Agenten-Orchestrierung |
| oma-commit | Conventional-Commit-Workflow |

## Projektstruktur

- `.agents/skills/`: Skill-Definitionen und Ressourcen
- `.agents/workflows/`: Explizite Workflow-Befehle
- `.serena/memories/`: Laufzeit-Orchestrierungszustand
- `cli/cli.ts`: Referenzquelle für Befehlsschnittstellen

## Progressive Offenlegung

1. Absicht der Anfrage identifizieren
2. Nur benötigte Skill-Ressourcen laden
3. Mit spezialisierten Agenten ausführen
4. Über QA-/Debug-Schleifen verifizieren und iterieren
