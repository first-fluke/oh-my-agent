---
title: "Ewaluacja użyteczności umiejętności"
sidebar_label: Ewaluacja umiejętności
description: Jak pisać fixture’y zadań ewaluacyjnych dla oma skill eval, konwencję katalogu .agents/eval/, typy checkerów oraz tryby wykonania mock/live.
---

# Ewaluacja użyteczności umiejętności

`oma skill eval` mierzy, czy załadowanie umiejętności rzeczywiście poprawia wyniki zadań agenta. Odpowiada na inne pytanie niż `oma skill audit` (które pyta „czy dwie umiejętności są redundantne?”): pyta „czy ta umiejętność pomaga?”.

Projekt opiera się na dwóch wynikach badań: WikiSkill (arXiv:2608.27454) rozdziela surowe doświadczenie, trwałą wiedzę i wykonywalne umiejętności, zachowując bramki holdout dla ewolucji; SkillLens (arXiv:2605.23899) pokazuje, że użyteczność umiejętności jest niezależna od odrębności opisu — odrębna umiejętność może być bezużyteczna, a nakładająca się umiejętność może nadal pomagać.

---

## Jak to działa

Dla każdego fixture’a zadania polecenie uruchamia dwa warianty:

1. **Wariant bazowy** — prompt zadania jest wysyłany do agenta bez udostępnionej umiejętności.
2. **Wariant badany** — `SKILL.md` jest dodawany na początku promptu, a następnie wysyłane jest to samo zadanie.

Każdy wariant jest oceniany przez checker zadania (0 = porażka, 1 = sukces). Główna metryka to:

```
utilityLift = weighted_mean(treatment scores) − weighted_mean(baseline scores)
```

Umiejętność przechodzi, gdy `utilityLift ≥ 5%`. Poniżej tego progu pojawia się ostrzeżenie (marginalny przyrost) albo porażka (brak przyrostu). Do wydania werdyktu wymaganych jest co najmniej 5 zadań z możliwym wynikiem.

---

## Konwencja `.agents/eval/<skill>/`

Umieść fixture’y zadań w `.agents/eval/<skill>/`. Ta ścieżka znajduje się wewnątrz `.agents/`, ale poza samym katalogiem umiejętności, więc przetrwa `oma update` bez nadpisania ewaluacji napisanych przez użytkownika.

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

Pliki zaczynające się od `_` są pomijane podczas ładowania fixture’ów zadań. Podkatalog `_rollouts/` przechowuje zapisane wyniki wariantów z wcześniejszych uruchomień `--live --record`.

---

## Schemat fixture’a zadania

Każdy fixture jest plikiem YAML z następującymi polami:

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

| Pole | Wymagane | Opis |
|:------|:---------|:-----------|
| `id` | Tak | Unikatowy identyfikator zadania (używany w nazwach plików rolloutów i raportach) |
| `skill` | Tak | Oceniana umiejętność (pasuje do nazwy katalogu nadrzędnego) |
| `domain` | Tak | Etykieta domeny używana do grupowania i wyboru zadań sąsiednich dla negative transfer |
| `prompt` | Tak | Prompt zadania wysyłany do obu wariantów |
| `checker` | Nie | Sposób oceniania wyniku wariantu. Gdy pominięty, domyślnie `{ type: judge }`. |
| `weight` | Tak | Względna waga ważonego średniego wyniku (użyj `1`, chyba że zadania mają różne znaczenie) |
| `group` | Nie | Etykieta rodziny. `oma skill optimize` utrzymuje fixture’y o tej samej grupie w tej samej partycji train/validation/final-test, aby niemal identyczny duplikat nie przedostał się przez podział. |

### Typy checkerów

#### judge (domyślny)

LLM ocenia wynik wariantu według rubryki i zwraca PASS albo FAIL. To wartość domyślna, gdy `checker` jest pominięty albo gdy brakuje `checker.type`.

```yaml
checker:
  type: judge
  rubric: "Does the answer correctly cite the source and avoid hallucination?"
```

Pole `rubric` jest opcjonalne; gdy je pominięto, używana jest domyślna rubryka: „Czy odpowiedź poprawnie i kompletnie spełnia prompt zadania?”.

Dla zwięzłości rubrykę można też zapisać na poziomie głównym:

```yaml
id: minimal-fixture
skill: oma-scholar
domain: research
prompt: "What are the main claims in paper X?"
rubric: "Does the answer enumerate the main claims without adding fabricated ones?"
weight: 1
```

**Ważne:** W trybie `--mock` zadania typu judge wymagają wcześniej zapisanego werdyktu w `_rollouts/`. Jeśli dla zadania nie istnieje zapisany werdykt, zadanie zostaje wyłączone z raportu z ostrzeżeniem. Najpierw uruchom `--live --record`, aby wypełnić rollouty.

To samo dotyczy każdego typu checkera, gdy brakuje całego wariantu: zadanie jest wyłączane, a nie oceniane jako 0. Brak danych nie jest nieudaną odpowiedzią — ocenienie go ustawiłoby oba warianty na 0, a zerowy przyrost odczytano by jako `decision: "fail"`. Wyłączenia, które obniżą liczbę ocenionych zadań poniżej `MIN_TASKS`, ujawniają się jako `coverage: "insufficient"`.

#### assert (opcjonalny)

Deterministyczne sprawdzenie podciągu. Używaj do weryfikacji kontraktu, formatu albo wywołania narzędzia, gdy oczekiwany wynik jest dokładny.

```yaml
checker:
  type: assert
  expect_contains:
    - "section=statements"
    - "partial_fetch=true"
```

Checker przechodzi, gdy każdy string z `expect_contains` występuje w wyniku wariantu.

#### regex (opcjonalny)

Deterministyczne dopasowanie regexu. Używaj, gdy potrzebny jest wzorzec, a nie dokładny string.

```yaml
checker:
  type: regex
  pattern: "section=\\w+"
```

Wzorce dłuższe niż 200 znaków otrzymują 0 (ograniczenie zapobiegające ReDoS). Przed dopasowaniem wynik jest obcinany do 10 000 znaków.

---

## Tryby wykonania

### --mock (domyślny)

Odtwarza zapisane rollouty z `_rollouts/`. Jest w pełni deterministyczny i działa offline — żaden LLM nie jest wywoływany.

- Dla checkerów `assert`/`regex`: wyniki są obliczane na podstawie zapisanych stringów wyników.
- Dla checkerów `judge`: odtwarzane jest pole `score` zapisane przez `--live --record`.

Jeśli zadanie judge nie ma zapisanego wyniku w `_rollouts/`, zostaje wyłączone z raportu (z ostrzeżeniem w konsoli). Dzięki temu tryb mock pozostaje całkowicie offline.

Przed użyciem sprawdzana jest też nieaktualność nagrań. Zmienione ciała umiejętności, prompty, kontrakty zadań/checkerów, efektywne rubryki sędziów i rewizje protokołu ewaluatora unieważniają dotknięte nimi wpisy. Wpisy bez pochodzenia są również odrzucane, a ostrzeżenie podaje nazwę pliku i liczbę. Gdy pozostanie mniej niż `MIN_TASKS` zadań z wynikiem, uruchomienie zgłasza `coverage: "insufficient"` zamiast werdyktu.

:::note `oma skill optimize --mock`
Optymalizator ocenia kandydackie ciała SKILL.md. Ponieważ nagranie jest ważne tylko dla ciała, z którego powstało, ciała kandydatów nie mają pasujących rolloutów i są zgłaszane jako niepokryte. Użyj `--live`, aby ocenić kandydatów.
:::

Bezpieczne dla CI. Ustaw `OMA_SKILLEVAL_MOCK=1`, aby wymusić ten tryb.

```bash
oma skill eval --skill oma-scholar
```

### --live

Uruchamia rzeczywiste warianty agentów przez `oma agent spawn --read-only`. Każdy wariant zadania działa we własnym tymczasowym workspace’ie, więc pliki utworzone przez jeden wariant nie wpływają na drugi. Błędy procesu, opakowania błędów API i błędy sędziego wyłączają całe sparowane porównanie z oceny i zapisu; wynik częściowy to dane diagnostyczne.

Przed dispatch’em polecenie wyświetla podgląd kosztu z liczbą zadań, dispatchów wariantów, dispatchów sędziów i rozstrzygniętym dostawcą. Potwierdź przez `y` albo pomiń pytanie, używając `--yes`.

Pozostałe opcje są przydatne w CI i przy analizie pokrycia:

| Opcja | Skutek |
| --- | --- |
| `--task-dir <path>` | Oceniaj fixture’y z katalogu innego niż `.agents/eval/<skill>`. |
| `--max-tasks <n>` | Ogranicz liczbę fixture’ów w ograniczonym uruchomieniu live. |
| `--trials <n>` | Powtórz każdy wariant `n` razy (1-10). Wariant uruchamiany jako pierwszy zmienia się naprzemiennie między próbami, wyniki poszczególnych zadań są uśredniane, a raport zyskuje wariancję wewnątrz zadania. Zadania sąsiednie z `--neg-transfer` są uruchamiane raz. |
| `--neg-transfer` | Zmierz umiejętność kandydata na zadaniach z tej samej domeny należących do innych umiejętności; domyślnie wyłączone. |
| `--routing` | Zmierz aktywację: dla każdego zadania zapytaj, która zainstalowana umiejętność zostałaby załadowana na podstawie `description` każdej umiejętności. Tryb live wykonuje pomiar (jeden dodatkowy dispatch na zadanie); tryb mock odtwarza nagranie kierowania wykonane dla tego samego katalogu. |
| `--require-coverage` | Zakończ kodem niezerowym, gdy pozostanie mniej niż pięć ocenionych sparowanych zadań albo żądana kontrola negative transfer jest niekompletna. |

```bash
# Preview and confirm
oma skill eval --skill oma-scholar --live

# Skip confirmation
oma skill eval --skill oma-scholar --live --yes
```

#### Pomiar negative transfer

Z `--neg-transfer` każde wybrane zadanie sąsiednie jest uruchamiane dwukrotnie: najpierw świeży wariant bazowy bez kandydata, potem wariant badany ze wstrzykniętym dokładnym ciałem kandydata. Sąsiadami są zadania innych umiejętności z tej samej `domain`. Gdy żadna inna umiejętność nie dzieli domeny, używana jest zamiast tego ograniczona próbka międzydomenowa (do sześciu zadań, rozłożonych między pozostałe umiejętności), a `negativeTransferCoverage.scope` zgłasza `cross-domain`; zakłócenia powodowane przez wstrzyknięte ciało nie ograniczają się do jego własnej domeny, a domena występująca tylko u jednej umiejętności nie może uniemożliwiać tej kontroli. Oba warianty używają tego samego ewaluatora i oddzielnych pustych workspace’ów. Delta to wynik wariantu badanego minus wynik bazowy; wartość ujemna oznacza, że kandydat zaszkodził temu zadaniu sąsiedniemu. Podgląd live obejmuje te dodatkowe dispatche wariantów i sędziów. `--max-tasks` ogranicza także próbkę sąsiadów, z ostrzeżeniem, gdy zadania są pomijane.

Użyj `--live --neg-transfer --record`, aby zapisać porównania specyficzne dla kandydata w `.agents/eval/<candidate>/_negative-transfer/<neighbor>/<body-hash>/_rollouts/`. Odtwarzanie mock wymaga zgodnej tożsamości kandydata, skrótu ciała, pełnego skrótu zadania/checkera oraz wspólnego ID porównania dla obu wariantów. Zwykłe nagrania ewaluacji sąsiada nie mogą zastąpić tego pomiaru.

Każdy wpis `negativeTransfer` zawiera `trials` (sparowane porównania stojące za `delta`). Optymalizacja ponownie mierzy sąsiada z regresją raz, zanim odrzuci kandydata, i dodaje `confirmed` (`true`, gdy powtórzenie również wykazało regresję, `false`, gdy nie); `oma skill eval --neg-transfer` raportuje pojedyncze porównanie. Raport zawiera `negativeTransferCoverage` z polami `status`, `expected` i `scored`. Status to `not-requested`, gdy brak flagi, `measured`, gdy każdy wybrany sąsiad ma prawidłowy sparowany wynik, a próbka nie jest pusta, oraz `insufficient` przy zerowej liczbie sąsiadów lub braku któregokolwiek porównania. Pusta tablica `negativeTransfer` nie dowodzi więc braku regresji. JSON `ok` ma wartość false, gdy żądane pokrycie negative transfer jest niewystarczające.

#### Izolacja umiejętności (uczciwa baza) {#skill-isolation-keeping-the-baseline-honest}

`utilityLift` ma znaczenie tylko wtedy, gdy **wariant bazowy działa bez docelowej umiejętności**. Problem polega na tym, że wysłany
agent automatycznie ładuje każdą umiejętność zainstalowaną w swoim runtime’ie, więc naiwny wariant bazowy nadal pobrałby umiejętność, która miała być mierzona
*bez* niej — zanieczyszczając porównanie (baseline ≈ treatment, lift ≈ 0).

Aby temu zapobiec, `--live` uruchamia **oba warianty w oddzielnych tymczasowych workspace’ach**. Chronione profile Claude i Codex wyłączają automatyczne wykrywanie umiejętności i instrukcji oraz narzędzia agenta. Wariant badany otrzymuje docelową umiejętność **wyłącznie** przez wstrzyknięte `SKILL.md`. Profile eksploracyjne używają przefiltrowanego katalogu umiejętności bez docelowej, ale samo to nie dowodzi izolacji.

Czysty katalog roboczy ukrywa lokalne dla projektu wykrywanie umiejętności, ale izolacja w runtime zależy też od profilu dostawcy. Raport podaje zweryfikowany poziom w polu `isolation`:

| Stan | Znaczenie |
|---|---|
| `enforced` | Chroniony Claude z prawidłowym ID umiejętności docelowej i bez kopii w HOME albo natywny Codex z wyłączonym wykrywaniem i narzędziami oraz sprawdzaniem wątku w runtime. Nieudany kontrakt runtime przerywa dispatch. |
| `best-effort` | Runtime bez chronionego profilu tekstowego, nieprawidłowe ID umiejętności docelowej albo kopia Claude w HOME; izolacja nie jest zweryfikowana. |
| `unavailable` | Dostawca oparty na HOME (np. **antigravity**, który odczytuje `~/.gemini/antigravity-cli/skills`); czysty cwd nie może go ukryć. Wypisywane jest ostrzeżenie, a wynik ma niską pewność. |
| n/a | Tryb mock — brak dispatchu live. |

Inne profile runtime pozostają dostępne do ewaluacji eksploracyjnej, ale wyniki `best-effort` i `unavailable` blokują promocję w optymalizacji live. Dostawca ewaluacji podąża za konfiguracją modelu projektu. Codex używa natywnego logowania CLI oraz skonfigurowanego modelu/dostawcy przez `app-server`; nie przełącza się po cichu na Claude ani na klienta z kluczem API. Chroniony kontrakt Codex dotyczy CLI 0.154.x na macOS/Linux z natywnym plikowym magazynem poświadczeń i istniejącym `auth.json`. Prywatny tymczasowy katalog domowy konfiguracji odwołuje się do oryginalnych plików config/auth, wyłączając współdzielony stan bootstrap; poświadczenia nie są kopiowane, a natywne odświeżanie korzysta z oryginalnego pliku auth. Magazyny poświadczeń keyring, auto i ephemeral nie są obecnie obsługiwane. Nieobsługiwane wersje, tryby magazynu i błędy kontraktu stają się błędami dispatchu.

Sędziowie działają w świeżych katalogach tymczasowych z wyłączoną pamięcią optymalizacji. Sędziowie Claude i Codex używają tego samego chronionego transportu tekstowego co warianty ewaluacji. Konfiguracja dostawcy sędziego jest stała na czas uruchomienia.

### --live --record

Uruchamia warianty live i zapisuje przechwycone wyniki (w tym werdykty sędziów dla zadań typu judge-checker) w `_rollouts/<hash>.json`. Nazwa pliku jest deterministycznym skrótem SHA-256 zbioru ID zadań — nie zależy od daty ani losowania.

Użyj tego, aby zasilić uruchomienia `--mock` na własnym komputerze i zachować offline przy kolejnych powtórzeniach.

Każdy wpis zawiera pochodzenie, dzięki czemu późniejsze odtworzenie może sprawdzić, czy nadal obowiązuje:

| Pole | Zapisywane dla | Porównywane z |
|---|---|---|
| `skillBodyHash` | tylko `treatment` | treść SKILL.md poddawana ewaluacji |
| `promptHash` | oba warianty | bieżący `prompt` fixture’a |
| `taskHash` | oba warianty | pełne zadanie, efektywny checker/domyślna rubryka sędziego oraz `SKILL_EVAL_PROTOCOL_REVISION` |
| `trial` | oba warianty (`--trials` > 1) | łączy w parę wariant bazowy i badany jednego powtórzenia; nieobecne przy pojedynczej próbie |
| `judgeResponse` | zadania typu judge | rozpakowany tekst werdyktu sędziego (ograniczony), zachowany, aby zapisany `score` można było zweryfikować |

Wyniki wariantów są zapisywane jako tekst odpowiedzi. Gdy CLI dostawcy zwraca opakowanie wyniku JSON, pole `result` jest zapisywane i oceniane; dane pomocnicze opakowania nigdy nie są dopasowywane przez checkery `assert`/`regex` ani odczytywane przez parser sędziego.

Wariant bazowy ukrywa umiejętność, więc sama edycja SKILL.md nie unieważnia jego nagrania. Zmiany kontraktu zadania lub ewaluatora unieważniają oba warianty. Nagrywanie live uruchamia oba warianty ponownie.

Nagrania sprzed pełnego pochodzenia zadania/ewaluatora trzeba wygenerować ponownie przez `--live --record` (oraz `--neg-transfer` dla porównań sąsiadów); dodanie nowych skrótów do starych wyników nie pozwala ich zweryfikować. Ten sam kontrakt uczestniczy w tożsamości zestawu optymalizacji, więc wcześniejsza wiedza o zakresie zestawu nie jest ponownie używana przy zaktualizowanym kontrakcie. Utrzymuj `SKILL_EVAL_PROTOCOL_REVISION`, podbijając go, gdy zmienia się zachowanie scorera, prompty sędziego/parsowanie werdyktów lub inne niejawne zachowanie ewaluatora.

:::caution `_rollouts/` jest tylko lokalne — nie commituj go
Nagranie odtwarza się tylko dla dokładnego ciała SKILL.md, z którego powstało. Po edycji
umiejętności jej nagrania wariantu badanego są odrzucane przy następnym uruchomieniu `--mock`, więc
zapisane nagranie stanie się nieaktualne po kolejnej zmianie SKILL.md i zacznie ostrzegać
wszystkich, którzy je pobiorą. Katalog jest ignorowany przez Git; nagrywaj lokalnie.
:::

```bash
oma skill eval --skill oma-scholar --live --record --yes
```

Po udanym uruchomieniu live raport zawiera liczbę wyników bazowych i badanych, `utilityLift`, `coverage: "ok"`, stan izolacji oraz decyzję pass/warn/fail. Późniejsze uruchomienie mock używa ponownie tylko nagrań, których prompty zadań i ciało umiejętności wariantu badanego nadal pasują.

---

### Współbieżność i limity czasu dispatchu

Warianty live, warianty sąsiadów, wywołania sędziów i sondy kierowania działają w ograniczonej puli podprocesów, której rozmiar określa `OMA_SKILL_EVAL_CONCURRENCY` (domyślnie 4, maksymalnie 16). Dwa warianty jednej próby zawsze działają razem w oddzielnych pustych katalogach, przy czym wariant uruchamiany jako pierwszy zmienia się naprzemiennie między próbami, a wyniki zachowują kolejność zadań, więc nagrania i wyniki są takie same jak przy uruchomieniu szeregowym. Ustaw zmienną na 1, aby wymusić wykonanie szeregowe.

Każde uruchomienie wariantu live i każde wywołanie sędziego jest przerywane po `OMA_SKILL_EVAL_TIMEOUT_MS` (domyślnie 180000). Dispatch, który przekroczył limit czasu, jest ponawiany raz, zanim zadanie zostanie wyłączone z raportu, ponieważ jedna wolna odpowiedź jest awarią transportu, a nie odpowiedzią; drugie przekroczenie limitu wyłącza zadanie (a w optymalizacji powoduje niepowodzenie pokrycia dla danego podziału). Zwiększ limit dla fixture’ów, które zasadnie wymagają długich odpowiedzi.

## Kierowanie: czy umiejętność zostaje wybrana?

Przyrost użyteczności mierzy, co robi ciało umiejętności po jej załadowaniu. Dostawcy decydują, czy załadować umiejętność, na podstawie jej frontmatter `description`, więc lepsze ciało, które nigdy nie zostaje wybrane, nie jest poprawą. `--routing` wysyła prompt każdego zadania wraz z nazwą i opisem każdej zainstalowanej umiejętności do tego samego chronionego modelu i prosi o wskazanie jednej umiejętności, którą by załadował (albo `NONE`). Wybranie umiejętności docelowej to aktywacja; wybranie innej to błędne skierowanie; `NONE` to chybienie.

```text
  routing: measured  activated 5/6 (83%)  misrouted 1 [oma-docs×1]  none 0  unparsed 0  catalog 33
```

Raport JSON zawiera `routing` z polami `status`, liczniki, `activationRate`, `misroutedTo` i `catalogSize`; każdy wpis w `findings` zawiera `routing: target | other | none | unparsed`. Z `--record` wybory są zapisywane w `_rollouts/<hash>.routing.json` razem ze skrótem katalogu. Późniejsze `--mock --routing` odtwarza je tylko wtedy, gdy każdy opis i każde zadanie pozostały niezmienione; w przeciwnym razie `status` ma wartość `stale` i nic nie jest liczone.

Mierzy to opis względem katalogu przez chroniony transport. Nie sprawdza własnego mechanizmu wykrywania dostawcy, który chroniony profil celowo wyłącza, i nie mierzy, czy procedura załadowanej umiejętności jest przestrzegana; to pozostaje pomiarem użyteczności.

## Minimalny działający zestaw fixture’ów

Do wydania werdyktu wymaganych jest pięć fixture’ów (`MIN_TASKS = 5`). Oto minimalny zestaw dla wymyślonej umiejętności `oma-scholar`:

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

Powtórz dla co najmniej trzech kolejnych zadań. Następnie uruchom:

```bash
# Seed rollouts (local only — re-run after any SKILL.md edit)
oma skill eval --skill oma-scholar --live --record --yes

# Offline replay
oma skill eval --skill oma-scholar --json
```

---

## Odczytywanie raportu

**Wynik tekstowy:**

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

**Wynik JSON** (przez `--json`):

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

`usage` sumuje to, co dostawca zgłosił dla ocenianych wariantów oraz osobno dla ich wywołań sędziów: liczbę dispatchów, tokeny wejściowe i wyjściowe (w tym odczyty i zapisy cache) oraz koszt w USD. `status` ma wartość `actual`, gdy każdy dispatch zgłosił zużycie, `partial`, gdy część go nie zgłosiła, oraz `unknown`, gdy nie zgłosił żaden (transport wyłącznie tekstowy, taki jak bridge Codex, nic nie zgłasza). Zapisane rollouty zawierają `usage` i `judgeUsage` w każdym wpisie, więc odtworzenie mock raportuje koszt ponownie używanego nagrania, a nie zero.

`repeatability` oddziela zmienność na poziomie zadań od zmienności między powtórzeniami. `liftCi95` to sparowany 95% przedział ufności oparty na rozkładzie t dla przyrostów poszczególnych zadań (null, gdy ocenione są mniej niż dwa zadania). Przy `--trials` równym dwa lub więcej `withinTaskStdDev` to średnie, liczone po zadaniach, odchylenie standardowe przyrostu między próbami, a `status` ma wartość `stable` tylko wtedy, gdy przedział wyklucza zero po stronie, na której leży przyrost; w przeciwnym razie ma wartość `unstable`, a `pass` jest obniżany do `warn`. Uruchomienie z jedną próbą raportuje `single-trial`: może pokazać przyrost, ale nie może pokazać, że przyrost się powtarza.

`ok` ma wartość `true` tylko wtedy, gdy `coverage === "ok"`, `decision === "pass"` i każda żądana kontrola negative transfer ma wystarczające pokrycie. Pole `isolation` informuje, czy
wariant bazowy rzeczywiście działał bez docelowej umiejętności (zobacz [Izolacja umiejętności](#skill-isolation-keeping-the-baseline-honest));
`isolation` ma wartość `"n/a"` w trybie `--mock`.

---

## Integracja z CI

```bash
# Fail the build if the skill regresses or has insufficient coverage
oma skill eval --skill oma-scholar --json --require-coverage
```

Kody wyjścia:
- `0` — przejście albo ostrzeżenie
- `1` — porażka albo niewystarczające pokrycie zadań/negative transfer z `--require-coverage`

---

## Wybór trybu live albo mock

Używaj `--live` z checkerami judge, aby mierzyć rzeczywistą użyteczność na otwartych zadaniach. Używaj `--mock`, aby offline odtwarzać wcześniej zapisane werdykty sędziów albo wykonywać deterministyczne kontrole kontraktu `assert`/`regex`.

Deterministyczność mock zachowuje się przez zapisanie binarnego werdyktu sędziego (PASS/FAIL) we wpisie rolloutu podczas `--live --record`, a następnie odtworzenie zapisanego wyniku w kolejnych uruchomieniach `--mock` — bez ponownego wywoływania LLM.

**Eksport danych:** podczas `--live` sędzia przekazuje wynik wariantu kandydata skonfigurowanemu dostawcy do oceny. Na początku każdego uruchomienia live wypisywane jest jednorazowe ostrzeżenie.

Jeśli uruchomienie mock zgłosi niewystarczające pokrycie, sprawdź ostrzeżenie pod kątem odrzuconych albo brakujących wpisów `_rollouts`, a następnie po poprawieniu fixture’a lub umiejętności wykonaj nagranie live. Promocja live wymaga działającego chronionego profilu Claude lub Codex z `isolation: "enforced"`; pozostałe profile pozostają eksploracyjne.

---

## Dostarczanie zadań ewaluacyjnych z umiejętnością

Umiejętności mogą zawierać zestaw zadań ewaluacyjnych przez umieszczenie fixture’ów w `.agents/eval/<skill>/`. Są to pliki napisane przez użytkownika poza katalogiem umiejętności, więc przetrwają `oma update`. Przy tworzeniu nowej umiejętności za pomocą `oma-skill-creation` dodaj pasujący zestaw fixture’ów `eval/`, aby przyszli autorzy mogli sprawdzać wpływ umiejętności. Workflow authoringu umiejętności opisano w `.agents/skills/oma-skill-creation/SKILL.md`.
