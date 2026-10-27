# Design Failure Recovery

Use the recovery matching an observed failure. Keep actions within the task's
authorized scope; an audit reports findings instead of modifying the product.

| Failure | Recovery | Evidence to retain |
|---|---|---|
| Selected upstream skill or support file is unavailable | Follow the resolution/failure path in [external-design-skills.md](external-design-skills.md). Continue with available project context only when that path allows it; do not claim the missing guidance was loaded | Supplier/source, missing capability or path, and the resulting limit |
| Upstream advice conflicts with project brand, CJK coverage, or implementation conventions | Keep the project contract and translate the relevant advice within it. Resolve a material unanswered direction through existing user instructions or clarification | Conflicting recommendation, retained constraint, and chosen project decision |
| Vendor seed cannot be retrieved or its hash fails | Follow [getdesign-fetcher.md](getdesign-fetcher.md); discard an invalid temporary seed and use permitted project context | Resolved source/version, error or digest mismatch, and whether any seed was used |
| Requested Stitch source is unavailable | Use the troubleshooting in [stitch-integration.md](stitch-integration.md) for the actual configured surface. Setup/reconnection follows the task's authorization. Report reference extraction as unavailable when it cannot be verified | Tool status/error and the source actually inspected |
| `DESIGN.md` and tokens disagree | Compare the accepted role/value with the existing token source using [design-tokens.md](design-tokens.md). Report the mismatch in an audit; make the scoped correction through `oma-frontend` when authorized | Role, token, affected consumer/theme/state, and readback |
| Rendered contrast, focus, labels, or responsive behavior fails | Reproduce the affected state and record the measured or observed result. Use `oma-frontend` for an authorized implementation fix, then repeat the affected check | Route/component, viewport/input mode, steps/tool, result, and unresolved limits |
| Motion or interaction performance fails | Inspect the actual affected behavior and use the current frontend stack's diagnostics. Keep generic timing/property recipes in the selected specialist guidance | Reproduction, device/browser or profiling evidence, and result of any scoped fix |

For document-only work, mark rendered checks as pending. For an implementation
change, a proposed fix or static token mapping does not replace the responsive,
accessibility, and behavior evidence required by [checklist.md](checklist.md).
