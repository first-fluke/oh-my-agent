# Frontend Agent - Angular Rules

Applies when the target project is Angular (`angular.json` present, or `@angular/core` in
`package.json`). In Angular projects these rules **replace** the React/Next.js-specific
sections of this skill (shadcn workflow, Server/Client component split, Next.js libraries).
Cross-cutting rules still apply: accessibility, design tokens, i18n sources of truth,
self-describing file names, and verification before handoff.

## Core Conventions

1. **Standalone components only** — no new `NgModule`s. Existing NgModule code may stay;
   migrate opportunistically, never big-bang.
2. **`ChangeDetectionStrategy.OnPush` on every component.** Prefer zoneless
   (`provideZonelessChangeDetection`) when the project already opts in.
3. **Signals first**: `signal`, `computed`, `effect`, signal inputs `input()`, `model()`,
   and `output()` are the default state primitives. Reach for RxJS only for genuine
   event streams (see RxJS policy below).
4. **`inject()` over constructor injection** in new code.
5. **New template control flow** — `@if` / `@for` / `@switch` / `@defer`. Do not write
   `*ngIf` / `*ngFor` in new templates.
6. **Lazy routes**: `loadComponent` / `loadChildren`; colocate feature route configs with
   the feature.
7. **Typed Reactive Forms** for anything beyond a single input; validation schemas live
   next to the form.
8. **Angular CLI for scaffolding** (`ng generate`); respect the project's generator
   defaults and file-naming style. For naming, follow the project's existing convention;
   new projects follow the current Angular style guide (kebab-case basenames).
9. **UI library**: use the project's detected library (Spartan UI, Angular Material,
   PrimeNG, …) before hand-rolling components. Tailwind CSS follows
   `resources/tailwind-rules.md` where applicable.
10. **Data access**: `HttpClient` (or `httpResource`) lives in injectable services, never
    inline in components.

## RxJS Policy — Marble Tests Are MANDATORY

Signals cover most component state. RxJS is the right tool for **streams over time**:
debounced input, cancellation (`switchMap`), merging event sources, websockets, polling.

Interop happens at boundaries only: `toSignal` / `toObservable` from
`@angular/core/rxjs-interop`. Do not hand-subscribe in components when `toSignal` or the
`async` pipe can own the subscription.

**Non-negotiable: every non-trivial Observable pipeline ships with a marble test.**
A stream without a marble test fails review.

"Non-trivial" means the pipeline contains any of:

- time-based operators: `debounceTime`, `throttleTime`, `auditTime`, `delay`, `timer`-driven logic
- combination operators: `combineLatest`, `withLatestFrom`, `merge`, `zip`, `race`
- higher-order mapping: `switchMap`, `mergeMap`, `concatMap`, `exhaustMap`
- error/retry flow: `retry`, `retryWhen`, `catchError` with re-subscription
- any custom operator

A single synchronous `map`/`filter` on an `HttpClient` call may use a standard async test
instead — everything else gets marbles.

### Marble test skeleton (`TestScheduler`, runner-agnostic)

```ts
import { TestScheduler } from 'rxjs/testing';
import { debounceTime } from 'rxjs';

describe('search query stream', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected); // wire to the runner's deep-equal
    });
  });

  it('emits only the last value inside the debounce window', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('a 50ms b 199ms c|', { a: 'n', b: 'ng', c: 'ngx' });
      const result$ = source$.pipe(debounceTime(100));
      expectObservable(result$).toBe('151ms b 100ms (c|)', { b: 'ng', c: 'ngx' });
    });
  });
});
```

Rules for marble tests:

1. **Always use `scheduler.run()`** — it virtualizes time, so `debounceTime(300)` needs no
   real waiting and no scheduler injection into production code.
2. **Test timing, not just values**: the marble diagram must assert *when* emissions
   happen, including completion/error frames.
3. **Cover cancellation** for higher-order mappings (`switchMap` dropping the stale inner
   observable is exactly the behavior marbles exist to prove) — use `expectSubscriptions`
   for inner-subscription lifetimes when relevant.
4. `TestScheduler` is runner-agnostic — it works under Vitest, Jest, and Jasmine/Karma;
   only the `assertDeepEqual` wiring differs.

## Verification

Before handoff, run the project's Angular checks (typical set):

```bash
{pm} run lint          # or: ng lint
bunx tsc --noEmit -p tsconfig.app.json
{test_cmd}             # e.g. bunx vitest run, ng test --watch=false
```

Checklist deltas vs the React checklist:

- [ ] New components are standalone + OnPush
- [ ] No new `*ngIf` / `*ngFor` / `NgModule`
- [ ] Component state is signal-based unless a stream is genuinely needed
- [ ] Every non-trivial RxJS pipeline has a passing marble test
- [ ] Routes added lazily (`loadComponent` / `loadChildren`)
