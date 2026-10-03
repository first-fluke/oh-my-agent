---
title: "Anleitung: Konfigurationsreferenz"
sidebar_label: Konfigurationsreferenz
description: Unterstützte Speicherorte der OMA-Konfiguration, Vorrang, typisierte Schlüssel, Standardwerte und Regeln für die Update-Zuständigkeit.
---

# Konfigurationsreferenz

OMA liest die Konfiguration aus `.agents/oma-config.cue` oder `.agents/oma-config.yaml`. Ein lokales Overlay (`.agents/oma-config.local.cue` oder `.agents/oma-config.local.yaml`) eignet sich für maschinenspezifische Einstellungen, die nicht in die gemeinsame Datei gelangen sollen.

Führen Sie dies in dem Projekt aus, dessen Konfiguration Sie prüfen möchten:

```bash
oma doctor --profile
```

Das erwartete Ergebnis ist ein aufgelöstes Profil mit dem ausgewählten Preset und dem Modellplan pro Agent. Meldet der Befehl einen Parse-Fehler, korrigieren Sie zuerst die nächste Konfigurationsebene, bevor Sie Modelleinstellungen ändern.

## Welche Datei gewinnt

Der Loader läuft vom aktuellen Verzeichnis aus nach oben und stoppt beim nächsten `.agents/`-Verzeichnis, das eine gemeinsame oder lokale Konfiguration enthält. In diesem Verzeichnis gilt:

1. `oma-config.cue` wird zuerst ausgewertet.
2. `oma-config.yaml` wird verwendet, wenn die gemeinsame CUE-Datei fehlt oder nicht ausgewertet werden kann.
3. Eine lokale Datei (`oma-config.local.cue` oder `.local.yaml`) wird über die gemeinsame Datei zusammengeführt.
4. Wenn gesetzt, überschreibt `OMA_MODEL_PRESET` `model_preset` für diesen Prozess.

Maps werden rekursiv zusammengeführt. Arrays, Skalare und `null` ersetzen den gemeinsamen Wert. Beide lokalen Formate gleichzeitig zu behalten ist ein Fehler. Eine fehlerhafte lokale Datei ist fatal, damit eine private Überschreibung nicht still ignoriert wird.

Dies ist eine Regel für die nächste Ebene und keine allgemeine Zusammenführung von Projekt und HOME. Eine globale Installation liest `~/.agents/oma-config.*`, weil HOME ihr Installations-Root ist. Ein Projektbefehl liest die nächste Projektebene. Die Update-Prüfung für `auto_update_cli` ist die Ausnahme: Sie prüft Projekt, dann HOME und verwendet danach den aktivierten Standardwert.

## Schlüssel der obersten Ebene

Die folgenden Schlüssel werden vom aktuellen Laufzeitschema oder von ausgelieferten OMA-Konsumenten gelesen. Ein als „sparsam“ markierter Schlüssel ist absichtlich teilweise: Lassen Sie einen verschachtelten Wert weg, um den Code-Standard beizubehalten.

| Schlüssel | Typ oder akzeptierte Werte | Standardwert bei Abwesenheit | Zweck |
| --- | --- | --- | --- |
| `language` | string | `en` | Antwortsprache für Workflows und Skills. |
| `translation_voice` | `formal`, `balanced`, `interpreter` | `balanced` im ausgelieferten Template | Sprachauswahl für `oma-translation`. |
| `date_format` | `ISO`, `US`, `EU` | `ISO` im ausgelieferten Template; ohne Eintrag keine ausdrückliche Überschreibung | Präferenz für die Datumsformatierung. |
| `timezone` | IANA-Name | Systemzeitzone | Von Schedules und Berichten verwendete Zeiten. |
| `auto_update_cli` | boolean | `true` | Hintergrundprüfungen der CLI-Version; mit `false` deaktivieren. |
| `telemetry` | boolean | `false` | Opt-in für Vendor-Telemetrie bei Installation, Update und Link-Abgleich. |
| `model_preset` | nichtleerer String | `auto` in neuen Templates | Integriertes oder benutzerdefiniertes Modell-Preset. `OMA_MODEL_PRESET` überschreibt es für einen Prozess. |
| `free` | `base_url`, `api_key_env`, `model` | `http://127.0.0.1:31415/v1`, `FREELLM_API_KEY`, `auto` | FreeLLMAPI-Einstellungen beim Preset `free`; `FREELLM_BASE_URL` und `FREELLM_MODEL` überschreiben Werte aus der Datei, und der Schlüsselname enthält nie das Secret. Siehe [Modellkonfiguration pro Agent](/docs/guide/per-agent-models#freellmapi-preset). |
| `providers` | `docs`, `web`, `code_intelligence`, `code_intelligence_guard`, `semantic_memory` | `context7`, `native`, `serena`, `block`, `agentmemory` | Dokumentations-, Such-, Code-Intelligence- und semantische Speicher-Provider auswählen. Code Intelligence akzeptiert `serena` oder `gortex`; semantischer Speicher akzeptiert `agentmemory`, `honcho` oder `none`. `code_intelligence_guard` (`block` oder `off`) steuert den PreToolUse-Such-Guard. Native Suchen, die auf bestätigte Provider-Ausschlüsse oder Pfade außerhalb des Projekts beschränkt sind, sind ohne Bypass erlaubt. Der Guard liest Serena-Ausschlüsse und aktivierte gitignore-Regeln oder die Ausschlussliste von Gortex; er leitet Abhängigkeiten nicht aus Verzeichnisnamen ab. Der Hook nennt `OMA_CI_ALLOW_NATIVE` nicht. Eine Shell-Suche mit dem Präfix `OMA_CI_ALLOW_NATIVE=1` umgeht den Guard nur für Ressourcen außerhalb des Projekts oder für ignorierte Pfade, die der Guard nicht erkannt hat, nicht aber für Projektquellcode. |
| `brave` | `api_key_env` oder `api_key_vault` | nicht gesetzt | Referenz auf das Brave-Such-Credential. |
| `honcho` | `base_url`, `workspace_id`, `project_id`, `api_key_env`, `api_key_vault`, `timeout_ms`, `max_results`, `max_tokens`, `recall_mode` | Siehe [Honcho-Details](#honcho-semantic-memory) | Verbindungseinstellungen für den semantischen Honcho-Speicher. |
| `agents` | Agenten-ID → `model`, optional `effort`, `thinking`, `memory` | Preset-Auflösung | Pro-Agent-Überschreibungen über dem ausgewählten Preset. Effort ist `none`, `low`, `medium`, `high` oder `xhigh`; Memory ist `user`, `project` oder `local`. |
| `models` | Modell-Slug → CLI-Zuordnung | nicht gesetzt | Inline-Modelldefinitionen für unterstützte Vendor-CLIs. |
| `custom_presets` | Preset → Beschreibung, optional `extends`, `agent_defaults` | nicht gesetzt | Benutzerdefinierte Presets; `extends` kann von einem integrierten Preset erben. |
| `vendors` | YAML: `string[]` ausgewählter Vendor-IDs; CUE-Template: optionale Fallback-Map `vendors.pi` | alle verknüpfbaren Vendors für die YAML-Liste | Wählt, welche Vendor-Integrationen `oma install` und `oma update` in YAML projizieren. Die Dispatch-Fähigkeitsmap liegt in der verwalteten Orchestrierungskonfiguration; siehe [Vendor-Auswahl und Dispatch-Metadaten](#vendor-selection-and-dispatch-metadata). |
| `default_cli` | string | Consumer-Fallback | Legacy-Fallback nur für den Vendor, wenn kein Modellplan aufgelöst wird. |
| `session.quota_cap` | `tokens`, `spawn_count`, `per_vendor: map<string, integer>` | Jede ausgelassene Dimension ist unbegrenzt | Harte Token- und Spawn-Limits vor dem nächsten Agenten-Spawn; siehe [Session-Quota-Limits](#session-quota-caps). |
| `docs` | `auto_verify`, `check_urls`, `exclude` | `false`, `true`, `[]` | Verhalten und Scan-Ausschlüsse von `oma docs verify`. |
| `serena` | `mode: bridge\|stdio`, `auto_update` | `bridge`, `true` | Serena-MCP-Transport und Update-Verhalten. |
| `mcp.devtools_browsers` | `aside`, `chrome`, `firefox` oder `[]` | nicht gesetzt = bestehende Einrichtung unverändert lassen | Auswahl des Browser-DevTools-MCP beim Abgleich. Eine ausdrücklich leere Liste entfernt ausgewählte Browser-Einträge. |
| `video` | sparsame, vom Skill verwaltete Map | Skill-Standard; siehe [Videoerzeugung](/docs/guide/video-generation) | Video-Routing, Provider-Reihenfolge, Ausgabe, Kosten, Limits und HyperFrames-Aktualisierung. |
| `image` | sparsame, vom Skill verwaltete Map | Skill-Standard; siehe [Bilderzeugung](/docs/guide/image-generation) | Einstellungen für Bildanbieter, Größe, Qualität, Ausgabe, Vergleich und Kosten. |
| `voice` | `notification_profile`, `asset_profile`, `output_dir`, `auto_notify_after_sec`, `max_tts_chars`, `max_stt_minutes` | Skill-Standard; siehe [Content- und Research-Workflows](/docs/guide/content-and-research#generate-speech-or-transcribe-audio) | Voicebox-Profil sowie Ausgabe- und Längeneinstellungen. |
| `hwp` | `format`, `version.*`, `output.*` | Skill-Standard; siehe [Content- und Research-Workflows](/docs/guide/content-and-research#extract-hwp-family-documents) | Kordoc-Format, Versionskanal und Ausgabeort. |
| `pdf` | `format`, `image_output`, `image_format`, `use_struct_tree`, `ocr.*`, `output.*` | Skill-Standard; siehe [Content- und Research-Workflows](/docs/guide/content-and-research#extract-pdf-content) | PDF-Extraktion sowie OCR-, Bild- und Überschreibungseinstellungen. |
| `scholar` | `base_url` | Skill-Standard; siehe [Content- und Research-Workflows](/docs/guide/content-and-research#search-and-validate-scholarly-material) | Host des Knows-Endpunkts; die Protokollform bleibt dem Skill vorbehalten. |
| `diagram` | `engine`, `explain_sidecar`, `archify.*` | Skill-Standard; siehe [Diagramm-Engine](/docs/guide/diagram-engine) | Auswahl von Mermaid/archify und Einstellungen der verwalteten Engine. |
| `market` | `managed`, `channel`, `check_interval_min`, `path`, `python`, `save_dir` | Skill-Standard; siehe [Marktforschung](/docs/guide/market-research) | Auflösung der verwalteten last30days-Engine und Speicherort der Ergebnisse. |

Das ausgelieferte Template enthält außerdem Blöcke im Besitz einzelner Konsumenten. Ihre aktuellen Schlüssel und Standardwerte sind:

| Block | Vom Konsumenten gelesene Schlüssel | Standardwert | Wirkung |
| --- | --- | --- | --- |
| `memory.gc` | `keep_sessions`, `max_age_days` | 100 Sitzungen behalten; Serena-Artefakte älter als 50 Tage bereinigen; `0` deaktiviert die Altersbereinigung | Standardwerte für `oma memory gc`; Befehlsflags überschreiben sie. |
| `serena_reaper` | `enabled`, `policy: lru\|idle`, `keep_warm`, `idle_minutes`, `grace_seconds` | `false`, `lru`, `2`, `10`, `90` | Steuert den geplanten Serena-LSP-Bereinigungspfad. Interaktives `oma serena reap` bleibt ein expliziter Aufruf; geplante stille Läufe sind Opt-in. |
| `refactor_guard` | `enabled`, `max_lines` | `false`, `500` | Aktiviert optional den Zeilenbudget-Guard des Stop-Hooks und setzt das Codebudget pro Datei. |
| `scm` | `conventional_commits`, `branching_strategy`, `require_pr_for_default_branch`, `co_author.*`, `forbidden_patterns`, `allowed_exceptions` | Das ausgelieferte Template aktiviert Conventional Commits und PR-Schutz sowie seine Co-Author- und Dateinamenlisten | Steuert SCM-Skill, Commit-Hook und Secret-Pattern-Guard. Ersetzen Sie die Identitätswerte des Templates durch Ihre eigenen, bevor Sie Co-Author-Trailer aktivieren. |

Diese Blöcke werden über den Konfigurations-Passthrough akzeptiert und von ihrem Feature oder Workflow interpretiert. Der Parser von `serena_reaper` liest die oben gezeigten snake_case-Schlüssel, obwohl ältere Template-Kommentare camelCase-Namen verwendeten. Lesen Sie vor dem Hinzufügen verschachtelter Schlüssel den entsprechenden Feature-Leitfaden; diese Seite erfindet keine Schlüssel außerhalb der hier aufgeführten Konsumenten.

## Genaue verschachtelte Objekte

### Semantischer Honcho-Speicher {#honcho-semantic-memory}

Die Map `honcho` wird durch `HonchoConfigSchema` validiert. Die Schlüsselnamen und das effektive Laufzeitverhalten sind:

| Schlüssel | Form | Effektiver Standardwert oder Einschränkung |
| --- | --- | --- |
| `base_url` | URL-String | `https://api.honcho.dev`; HTTPS ist erforderlich, außer für HTTP auf Loopback. Credentials, Querystrings und Fragmente werden abgelehnt. |
| `workspace_id` | 1–128 Buchstaben, Ziffern, `_` oder `-` | Beim Start des Providers erforderlich. Der interaktive Installer setzt `oma`, wenn kein gespeicherter Wert vorhanden ist. |
| `project_id` | getrimmter String mit 1–128 Zeichen | Fehlt der Wert, wird das aktuelle OMA-Projekt-Root verwendet. |
| `api_key_env` | Name einer Umgebungsvariablen | `HONCHO_API_KEY`. Ein Nicht-Loopback-Endpunkt benötigt diese Variable oder `api_key_vault`. |
| `api_key_vault` | Vault-Schlüsselname (`A-Z`, `a-z`, Ziffern, `.`, `_`, `-`; 1–64 Zeichen) | Ohne Eintrag keine Vault-Suche. Sind beide Credential-Referenzen vorhanden, wird zuerst der Umgebungswert verwendet. |
| `timeout_ms` | Integer `100`–`30000` | `5000` Millisekunden. Dieselbe Frist gilt für Status- oder Speicheranfragen. |
| `max_results` | Integer `1`–`50` | `8` Ergebnisse für den Recall. |
| `max_tokens` | Integer `128`–`16000` | `2000` UTF-8-Bytes für abgerufene Inhalte und abgeleiteten Kontext. |
| `recall_mode` | `messages` oder `hybrid` | Der Installer schreibt bei einer neuen Auswahl `messages`. Ein fehlender Wert aktiviert neben dem Nachrichten-Recall auch die Anfrage nach der Repräsentation des Providers. |

Zum Beispiel kann ein Remote-Workspace eine Secret-Referenz verwenden, ohne das Secret in YAML abzulegen:

```yaml
providers:
  semantic_memory: honcho
honcho:
  base_url: https://honcho.example.com
  workspace_id: team
  project_id: product-docs
  api_key_vault: honcho-team
  timeout_ms: 5000
  max_results: 8
  max_tokens: 2000
  recall_mode: messages
```

Der Installer verwendet `http://127.0.0.1:8000` als anfängliche URL, wenn Honcho interaktiv oder nicht interaktiv ohne gespeicherte URL eingerichtet wird. Dieser Installer-Seed ist vom Laufzeit-Fallback des Providers oben getrennt. Führen Sie nach der Auswahl des Providers `oma memory status` aus; ein fehlender Workspace oder ein fehlendes Credential wird als nicht verfügbar gemeldet, statt still auf einen anderen Speicher-Provider zu wechseln.

### Session-Quota-Limits {#session-quota-caps}

`session.quota_cap` ist eine teilweise Map. Jedes Feld ist optional; ein fehlendes Feld lässt diese Dimension unbegrenzt. Werte müssen nichtnegative Ganzzahlen sein, und `per_vendor` ordnet Vendor-Namen Tokenbudgets zu:

```yaml
session:
  quota_cap:
    tokens: 2000000
    spawn_count: 30
    per_vendor:
      claude: 1500000
      codex: 500000
```

Der Cap-Loader prüft zuerst die Benutzer-CUE-Ebene, dann die Benutzer-YAML-Ebene und danach den ausgelieferten Fallback der Standardwerte. Vor einem Spawn prüft OMA in dieser Reihenfolge `spawn_count`, Gesamt-`tokens` und `per_vendor`. Ein Limit ist erreicht, sobald die Nutzung größer oder gleich dem Limit ist; OMA blockiert den nächsten Spawn und nennt die ausschlaggebende Dimension. Die Nutzung wird in Tokens gezählt und ist keine Kostenschätzung.

### Vendor-Auswahl und Dispatch-Metadaten {#vendor-selection-and-dispatch-metadata}

In der benutzereigenen `.agents/oma-config.yaml` ist `vendors` eine Liste ausgewählter Integrations-IDs:

```yaml
vendors:
  - claude
  - codex
  - pi
```

Eine fehlende oder leere Liste wählt alle IDs aus OMAs Registry verknüpfbarer Vendors. Die Liste steuert Installations-/Update-Projektionen; sie ist nicht die Fähigkeitsmap für die Befehle der einzelnen Vendors.

Das ausgelieferte `.agents/oma-config.cue`-Schema erlaubt außerdem ein Objekt `vendors.pi` mit den Feldern `command`, `prompt_flag`, `model_flag`, `default_model` und `thinking_flag`. Dieser Block ist eine typisierte Fallback-Form im CUE-Template. Der aktuelle Agenten-Dispatch löst seine Fähigkeitsfelder jedoch aus der verwalteten Orchestrierungs-Registry unten auf. Verwenden Sie `vendors.pi` daher nicht als Ersatz für die YAML-Auswahlliste.

Die verwaltete Datei `.agents/skills/oma-orchestration/config/cli-config.yaml` enthält diese Fähigkeitsmap. Jeder Eintrag `vendors.<id>` unterstützt die folgenden Felder:

| Feld | Form | Verwendung |
| --- | --- | --- |
| `command` | ausführbare Zeichenfolge | Auszuführende Binärdatei. |
| `subcommand` | String | Vor Optionen eingefügtes Subkommando, etwa `codex exec`. |
| `prompt_flag` | String oder `none`/`null` zum Deaktivieren | Mit dem Prompt gepaartes Flag; bei Deaktivierung wird ein positionsbasierter Prompt verwendet. |
| `auto_approve_flag` | String | Vendor-Flag zum Umgehen von Berechtigungen für schreibbare Läufe. Im Read-only-Modus wird es unterdrückt. |
| `read_only_flag` | String | Vendor-Flag für den Nur-Lese-Modus. Fehlt es, verwendet der Builder den vendorspezifischen Fallback oder warnt. |
| `output_format_flag` | String | Flag zur Auswahl einer maschinenlesbaren Ausgabe. |
| `output_format` | String | Mit `output_format_flag` gepaarter Wert. |
| `model_flag` | String | Mit `default_model` gepaartes Flag. |
| `default_model` | String | Modellwert, wenn ein aufgelöster Plan keinen liefert. |
| `isolation_env` | Zeichenfolge `NAME=value` | Optionale Umgebungszuweisung; unsichere Loader-/Interpreter-Schlüssel werden abgelehnt und `$$` durch die aktuelle Prozess-ID ersetzt. |
| `isolation_flags` | Argumentzeichenfolge im Shell-Stil | Zusätzliche Isolationsargumente, in argv-Tokens aufgeteilt. |

Die verwaltete Fähigkeitsdatei wird durch OMA-Updates neu erzeugt. Bearbeiten Sie zur Modellauswahl die benutzereigenen Schlüssel `agents`, `models` und `custom_presets`. Verwenden Sie diese Fähigkeitsmap nur bei der Pflege der verwalteten Orchestrierungsdaten oder beim Debugging eines Vendor-Adapters. Das kommentierte `vendors.pi`-Objekt in älteren Templates ist Fallback-Metadaten und ersetzt weder die Liste ausgewählter Vendors noch die verwaltete Dispatch-Registry.

## Häufige Änderungen

Wählen Sie für ein Projekt ein festes Preset und halten Sie persönliche Überschreibungen lokal:

```yaml
# .agents/oma-config.yaml
language: en
model_preset: mixed

# .agents/oma-config.local.yaml
agents:
  backend:
    model: openai/gpt-5.4
    effort: high
```

Wählen Sie Code-Intelligence- und Speicher-Provider ausdrücklich:

```yaml
providers:
  code_intelligence: serena
  code_intelligence_guard: block   # off → advisory primer only, no tool denial
  semantic_memory: none
```

Lassen Sie die Browserkonfiguration bei Updates unverändert oder entfernen Sie sie absichtlich:

```yaml
# Omit mcp.devtools_browsers to leave existing browser entries unchanged.
mcp:
  devtools_browsers: []
```

## Regeln für Updates und Zuständigkeit

`.agents/oma-config.yaml` gehört dem Benutzer. `oma update` bewahrt vorhandene Inhalte und kann neue, ausgelieferte Schlüssel der obersten Ebene unter einer Markierung `# Added by oma update` ergänzen. `oma update --force` kann Benutzerkonfiguration, MCP-Konfiguration und Stack-Verzeichnisse ersetzen. Verwenden Sie es nur, wenn das Zurücksetzen dieser Anpassungen beabsichtigt ist. Lokale Overlay-Dateien bleiben der private Ort für maschinenspezifische Werte.

Legen Sie keine API-Schlüssel in dieser Datei ab. Verwenden Sie Felder wie `api_key_env` oder `api_key_vault` und bewahren Sie das eigentliche Credential im referenzierten Secret-Store oder in der Umgebung auf.

Details zur Modellauflösung finden Sie unter [Modellkonfiguration pro Agent](/docs/guide/per-agent-models). Zu Ebenensemantik und Fehlerverhalten siehe [oma-config-Semantik](/docs/guide/oma-config-semantics).
