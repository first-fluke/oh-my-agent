# Profiles Signal

> **EXPERIMENTAL: the OTel Profiles signal is not stable**
> Continuous profiling tooling (Parca, Pyroscope) is production-ready.
> The OpenTelemetry profiling data model and OTLP signal are Alpha / in active development; semantic conventions and wire format may change without backward compatibility. Confirm the current status at <https://opentelemetry.io/docs/specs/otel/profiles/>.
> Do NOT define SLOs against OTel-native profiling attributes. Treat any `profile.*` OTel semconv as experimental tier.
> Cross-ref: `../standards.md` for stability tier definitions.

---

## 1. Scope

Continuous profiling; whole-cluster or whole-service CPU, memory, and allocation sampling running at low, steady overhead in production. Flamegraphs are the primary visualization artifact. The output answers the question "in which function is time or memory being spent?"

This file does NOT cover ad-hoc developer profiling sessions (e.g., `go tool pprof http://localhost:6060/debug/pprof/profile` run once during a development investigation) or client-side (mobile, browser) profiling. For production mobile performance, use RUM and crash analytics: `../layers/L7-application/mobile-rum.md`, `../layers/L7-application/crash-analytics.md`.

Profiles complete the MELT+P set: metrics say what is slow, traces say where (service, span, dependency), profiles say in which function CPU time or memory is spent. Profiles share resource attributes (`service.name`, `service.version`, `k8s.pod.name`) with metrics and traces, which is what makes the pivot from a slow span to a flamegraph possible (Section 5).

---

## 2. Tools Landscape

Project ownership and maturity change; verify at the project's own site when the choice is load-bearing. Parca and Pyroscope are vendor-led open-source projects, not CNCF projects.

| Tool | Category | Mechanism | Notes |
|------|----------|-----------|-------|
| Parca | OSS, continuous | eBPF agent, no application code | Polar Signals OSS; whole-cluster; no language SDK required for CPU profiles |
| Grafana Pyroscope | OSS / SaaS, continuous | Pull + push (eBPF + language SDKs) | Grafana Labs OSS; integrated into the Grafana stack |
| OpenTelemetry eBPF profiler | OSS, continuous | eBPF, whole-system, no application code | OpenTelemetry project; emits the OTel profiles signal, so it inherits that signal's stability |
| Polar Signals Cloud | Commercial SaaS | Parca-based, hosted | Polar Signals is the primary Parca maintainer |
| Go `net/http/pprof` | Language-specific, on-demand | HTTP handler; sample on request | Built-in; not continuous; MUST NOT be left exposed on production endpoints |
| fgprof | Go | Wall-clock profiler | Supplements `pprof` by measuring off-CPU time as well as on-CPU |
| py-spy | Python, continuous | Attaches to CPython without code change | Low overhead; no SDK injection |
| async-profiler | JVM, continuous | `AsyncGetCallTrace` + `perf_events`; no safepoint bias | Supports CPU, alloc, lock, wall modes |
| JFR (Java Flight Recorder) | JVM, continuous | JVM-native | Enable with JVM flags; low overhead |
| `0x` / V8 Inspector | Node.js, on-demand | V8 CPU profiler | `0x` produces flamegraphs from a profiled run |
| stackprof | Ruby | Sampling profiler | Supports wall, object, custom modes |
| php-spx / phpspy | PHP | Extension (spx) or attach (spy) | `php-spx` requires extension install; `phpspy` attaches without code change |
| Pyroscope language SDKs | Python, Node.js, Go, Java, Ruby, .NET, Rust | In-process SDK; pushes to a Pyroscope server | Requires an SDK import; basis for span-linked profiles (Section 5) |

**eBPF profilers vs eBPF instrumentation.** Parca, Pyroscope's eBPF mode, and the OpenTelemetry eBPF profiler attribute CPU time at the kernel level and are language-agnostic. OpenTelemetry eBPF Instrumentation (OBI, the upstream of Grafana Beyla) and Pixie are eBPF tools that produce request-level metrics and traces; they are not profilers. See `../layers/L4-transport.md`.

---

## 3. Sampling Overhead

Continuous profiling is viable in production only when overhead is provably low.

| Tool / Mode | Typical CPU overhead | Sampling rate | Notes |
|------------|---------------------|---------------|-------|
| Parca (eBPF) | < 1% CPU | ~19 Hz per CPU core | Kernel-level; process namespaces handled correctly |
| Pyroscope (eBPF mode) | < 1% CPU | Configurable (`sample_rate`), default 19 Hz | Overhead scales with sampling rate; start conservatively |
| async-profiler (CPU) | < 1% CPU | Configurable; default 100 Hz | AsyncGetCallTrace avoids safe-point bias |
| JFR (CPU + alloc) | < 1% CPU typical | JVM-managed | Monitor GC pause impact separately |
| py-spy | < 1% CPU | Configurable; default 100 Hz | External; no Python overhead |
| `net/http/pprof` | ~5-10% during active profile | On-demand only | Never enable `/debug/pprof` permanently on production endpoints |

These are vendor-reported typical figures. Measure baseline and profiled CPU utilization in a non-production environment before enabling continuous profiling in production. Set a budget threshold (e.g., < 1% CPU) and alert if actual overhead exceeds it.

`/debug/pprof` on a production HTTP server exposes CPU/heap profiles and internal function names to any caller who discovers the path, and profile requests are expensive enough to be a denial-of-service vector. Leave the `net/http/pprof` import out of production builds, or serve it on an internal-only listener behind authentication.

---

## 4. OTel Profiling Signal Data Model (OTEP 0239)

Source: <https://github.com/open-telemetry/oteps/blob/main/text/profiles/0239-profiles-data-model.md>

Status: **Alpha / in active development**. The data model, wire format, and semantic conventions are all subject to breaking change.

Key design points:
- Profiles are transmitted as an OTLP signal alongside metrics, traces, and logs.
- The data model builds on the pprof format and extends it with resource and scope context and optional span references.
- Semantic conventions for profile attributes are in development. Do not treat them as stable.

Most production deployments use Parca's own gRPC API or Pyroscope's push API, not OTLP profiles. OTLP profile support in collectors and backends is experimental. Adopt OTLP profiles for production only once the signal is declared stable and the chosen backend supports it.

---

## 5. Use Cases and Trace Correlation

| Use case | Profile type | How to investigate |
|----------|-------------|-------------------|
| CPU bottleneck; which function consumes CPU? | CPU | Flamegraph: wide frame = high CPU; sort by self-time |
| Memory leak; heap growing over time? | Heap | Heap profile over hours; compare allocation counts |
| Allocation rate; GC pressure? | Allocation | Allocation profile; identify hot allocation sites |
| Lock contention; threads blocked? | Mutex / Lock | Mutex profile; look for frames holding locks across many samples |
| Off-CPU; threads blocked on I/O or sleep? | Off-CPU (eBPF) | eBPF off-CPU flamegraph; I/O, syscall, and scheduler frames visible |
| Regression after a release | Any, diffed | Compare the profile for `service.version` N against N-1; see `../boundaries/release.md` |

Profiles are the diagnostic tool you reach for after traces identify which service and span is slow. The linkage mechanism is annotating profile samples with the active span's identifier.

Grafana Tempo + Pyroscope implements this as span profiles: the Pyroscope OTel integration for the language wraps the tracer provider and annotates samples with the active span ID, and clicking a slow span in the trace view loads the flamegraph for that span. Use that integration; follow the Pyroscope documentation for the language in use.

**Limitation:** Profiles are statistical (sampled across all requests). Traces are per-request. The correlation is probabilistic; a span identifier on a profile sample means that request was running during that sample, not that the sample is causally attributed to that exact request. This is a fundamental constraint of sampling-based profiling; state it when presenting correlation results to stakeholders.

**Label cardinality:** do not tag profiles with `trace_id`, `request_id`, `user_id`, or other unbounded values through the generic tag/label API; each distinct value becomes a series and blows up backend storage and query time. Series labels are low-cardinality only: `service.name`, `service.version`, environment, and `tenant.id` for multi-tenant isolation.

---

## 6. Storage Backends and Symbols

| Backend | Primary use | Symbol resolution |
|---------|------------|-------------------|
| Parca server | OSS; local or k8s deployment; Parquet-based columnar storage (FrostDB) | Upload ELF debug info / DWARF symbols; agent resolves at collection time |
| Pyroscope OSS | Self-hosted; integrates with Grafana stack | Upload symbol files per build |
| Grafana Cloud Profiles | Managed Pyroscope; SaaS | Upload symbols via Pyroscope API |
| Polar Signals Cloud | Managed Parca; SaaS | Symbols uploaded via CI step |

Symbol resolution is a critical operational concern. Without debug symbols (or source maps for Node.js), flamegraph frames appear as raw memory addresses or mangled names. Treat symbol upload as a required CI step alongside binary deployment; it has the same relationship to profiles as sourcemaps have to crash analytics.

---

## 7. Privacy and Security

Stack traces expose function names, which may reveal proprietary algorithm structure or internal service architecture. This is especially sensitive for multi-tenant SaaS operators.

- Apply access control to the profiling backend (Parca server, Pyroscope) equivalent to trace backend access control. Cross-ref `privacy.md §11 Backend Access Control (RBAC on Observability Data)`.
- For multi-tenant deployments, isolate flamegraph access by tenant label. A tenant MUST NOT be able to query another tenant's flamegraph. Cross-ref `../boundaries/multi-tenant.md`.
- Function name redaction (stripping internal frames from exported profiles) is technically possible but rare and operationally complex. Consider it only if profile data is shared externally (e.g., vendor support handoff).

---

## References

- OTel Profiles specification: <https://opentelemetry.io/docs/specs/otel/profiles/>
- OTEP 0239 (profiling data model): <https://github.com/open-telemetry/oteps/blob/main/text/profiles/0239-profiles-data-model.md>
- Parca: <https://parca.dev>
- Grafana Pyroscope: <https://grafana.com/oss/pyroscope/>
- Polar Signals Cloud: <https://polarsignals.com>
- async-profiler: <https://github.com/async-profiler/async-profiler>
- py-spy: <https://github.com/benfred/py-spy>
- Coverage matrix: `../matrix.md`
- Anti-patterns catalog: `../anti-patterns.md`
