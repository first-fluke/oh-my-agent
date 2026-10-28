# External Design Skills

OMA owns the brief, supplier choice, project constraints, artifacts, and evidence.
The selected supplier owns its detailed visual method. Load one supplier for the
current operation rather than combining competing visual rulebooks by default.

The selected visual direction can be implemented through a conditional CanvasUI,
Scroll World, or GSAP frontend route. Those are implementation capabilities;
they do not add another competing visual-direction supplier.

## Choose the operation

Select the operation before the product surface. Existing-UI critique, audit,
and polish use Impeccable, including dashboards, admin panels, SaaS, and internal tools.

| Requested work | Supplier | Operation boundary |
|---|---|---|
| Direction for dashboards, admin panels, SaaS product UI, or internal tools | Interface Design: `interface-design` | Establish or materially revise the product interface's hierarchy and system within the project contract. |
| Other new web art direction, whole-page visual composition, authorized overhaul | Taste: `design-taste-frontend` | Web visual direction within the supplied brand, content, stack, and scope. |
| Existing-UI UX or aesthetic assessment | Impeccable: `critique` | Findings and recommendations; a review does not authorize implementation. |
| Accessibility, responsive, or technical UI audit | Impeccable: `audit` | Read-only findings with observed checks and untested areas. |
| Finish an existing direction | Impeccable: `polish`, or the specific operation requested | Target the affected surface; preserve the existing visual system. |
| Extract an existing system or document a changed one | Impeccable: `extract` or `document` | Reuse project facts and retain OMA's DESIGN.md and token contracts. |
| Known design decision, document correction, or semantic token handoff | Local OMA contract | No supplier is needed merely to rewrite an existing decision. |

Use Taste for marketing pages, landing pages, campaigns, or brand-only web
direction. The Interface Design and Taste routes are for web surfaces. For a
native surface, use an applicable Impeccable reference and hand implementation
to `oma-mobile`; do not import web requirements into a native app. An unsupported
operation remains an explicit capability gap.

## Resolve the complete bundle

1. Check the runtime skill catalog for the selected exact skill name and its
   repository below. Reuse the advertised installed location when its support
   files are complete; read the current `SKILL.md`.
2. If absent or incomplete, use the Skills CLI to load the instructions and
   supporting directory without a persistent installation:

   ```bash
   bunx skills use dammyjay93/interface-design@interface-design
   bunx skills use Leonxlnx/taste-skill@design-taste-frontend
   bunx skills use pbakaus/impeccable@impeccable
   ```

   Run only the selected command. Omit `--agent`: this agent consumes the skill;
   no second agent or supplier installer is needed to load it. Bound the fetch
   by the task's deadline and download budget.
3. Read the emitted instructions and retain the actual support-directory path
   from the result. Resolve every relative file from that directory. Record the
   upstream repository, skill name, available revision/version, and operation.
   Do not guess a cache path or copy a bare SKILL.md without its support files.
4. Confirm the selected operation's references, scripts, launchers, and data
   resolve before using them. For Impeccable, load its entry instructions and
   the reference for the selected command, rather than every command reference.
   For Interface Design, follow its direction entrypoint; loading its instructions
   does not register its optional plugin slash commands. For Taste, follow its
   current entrypoint and only the required support files.
5. Pass the brief, existing DESIGN.md/context, target platform, incumbent stack,
   brand, language, accessibility and reduced-motion constraints, authorized writes,
   budget, and verification limits to the chosen operation. Reuse supplied answers
   and project context.

Loading a bundle does not prove that its browser, engine, image services, or
implementation dependencies work. Supplier-native installers, provider hooks,
and background engines are not part of this loading path. Do not run them merely
because their setup command appears in the upstream documentation.

## Apply the supplier within the project contract

- Keep one authority for project facts: existing DESIGN.md and context remain
  inputs. Do not require a second discovery document or repeated approval for
  an already authorized scoped task. For Interface Design's
  `.interface-design/system.md` context step, supply the canonical `DESIGN.md`
  decisions. If DESIGN.md is absent, use the brief and observed UI; create it
  only when the requested work materially changes the design system. Read an
  existing `.interface-design/system.md` as project input and report conflicts
  with the current brief or DESIGN.md. Save accepted changes to DESIGN.md within
  the task's authorization; a second persistent design contract is not required.
- Preserve the product's approved palette, type, content, and behavior unless
  the requested scope changes them. Use supported supplier preservation options
  when relevant; its visual preferences do not authorize a brand replacement.
- Treat fixed motion counts, aesthetic defaults, and broad workflow stages as
  supplier methods within the requested outcome. Do not enlarge a small fix to
  satisfy a page-wide recipe or add motion that conflicts with reduced motion.
  For Taste, select its review, component, or app-screen branch when applicable;
  whole-page photo and motion gates do not apply to every branch.
- The user's build authorization and OMA execution policy govern supplier build
  gates. Record an unauthorized or unavailable gate as unrun; do not claim the
  supplier's full workflow passed. A detailed brief does not require a new
  approval merely because a supplier asks the same question again.
- A selected operation may require its own runtime context step. Inspect the
  actual launcher and requirements before invocation: an engine download,
  process start, provider setting change, or paid call needs the applicable
  task authorization and budget. If unavailable, state that runtime evidence
  is missing; reading the design guidance is not runtime validation.
  When an Impeccable context invocation is needed, set
  `IMPECCABLE_NO_UPDATE_CHECK=1` to skip its update lookup; this does not suppress
  a required engine download or make the operation side-effect free.
- Keep implementation with `oma-frontend` or `oma-mobile`, using the existing
  stack. Carry the selected supplier's relevant guidance into that handoff.

## Deliver and recover

Retain the operation, resolved source, project-specific decisions, files changed,
and actual visual/accessibility checks. Separate inspected UI from code-only
findings and unrun browser/device/build checks. A supplier report alone is not
evidence that the target rendered correctly.

For a missing reference, first verify the emitted support path and complete
bundle. Retry only within the recorded budget. For an unavailable explicitly
selected supplier, report the failed route; for an ordinary local contract task,
continue from the project's existing decisions and state the missing external
assessment. Do not substitute a vendored copy of the upstream cookbook.

## Sources

- [Interface Design](https://github.com/Dammyjay93/interface-design): product-interface instructions and project system context.
- [Taste](https://github.com/Leonxlnx/taste-skill): current skill name, instructions, and support layout.
- [Impeccable](https://github.com/pbakaus/impeccable): current command references and launchers.
- [Skills use](https://github.com/vercel-labs/skills/blob/main/docs/commands.md#skills-use): loading instructions and their support directory.
