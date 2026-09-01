---
title: Retiring cg init and the root templates and examples
description: ADR documenting the decision to retire the cg init command and the root templates and examples in favor of docs-owned onboarding guides.
draft: true
---

:::caution[Proposed — not yet accepted]
Everything below is proposed. One sub-decision is deliberately unsettled: the compatibility promise to already-published CLIs, in [Sub-decision: compatibility for already-published CLIs](#sub-decision-compatibility-for-already-published-clis). Reviewers should settle that before this ADR moves to accepted.
:::

The repository root carries five standalone projects outside the pnpm workspace: three `cg init` templates (`quickstart`, `express-js`, `fast-api`) and two example APIs (`examples/ca-opportunity-example/`, `examples/pa-opportunity-example/`). A [dependency audit](https://github.com/HHS/simpler-grants-protocol/issues/761) established how they are wired and how they have aged.

**They are a runtime dependency, not inert files.** `lib/cli/src/commands/init/init-service.ts:6` hardcodes `https://raw.githubusercontent.com/HHS/simpler-grants-protocol/refs/heads/main/templates/template.json`. Every published CLI — through the current `0.4.0` — resolves that manifest from live `main` at runtime, then TypeSpec fetches each listed file from `main`. Changing a template changes the output of old and new releases at once; moving or deleting the path makes every already-installed CLI fail. The coupling also runs backwards: the `fast-api` template and both examples install the latest published CLI in CI and run `make check-spec` against it.

**The maintenance tier they sit in is not holding.** Since [#612](https://github.com/HHS/simpler-grants-protocol/issues/612) moved them to the manual tier documented in `DEPENDENCY_MANAGEMENT.md`, the pins have drifted: `quickstart` and `express-js` pin `@common-grants/core ^0.3.5`, a range that excludes the published `0.4.0`; `fast-api` pins `common-grants-sdk ^0.4.0` and the examples pin `~0.3.1`, against a published `0.8.1`. Documentation drifted alongside — `templates/README.md` names a slug (`express-api`) the manifest does not define, `examples/README.md` links directory names that do not exist, the CLI's network-failure fallback lists templates (`default-api`, `custom-api`) that have never existed, and the Getting started guide hand-transcribes a file tree that no check compares against the manifest. All five workflows are path-filtered pull-request triggers with no schedule, so a core, CLI, or SDK release that breaks a template surfaces only when someone next edits that directory.

**They teach a different adoption story than the one the project has chosen.** The Getting started guide and both language guides open by generating a new framework-specific application and then instruct the reader to replace mock services with real data. The documented lead adopter is a vendor engineer at an existing grants-technology organization adapting a working product at the SDK and plugin boundary ([ADR 0022](/governance/adr/0022-plugin-framework/)) — someone who does not start from an empty directory.

**Usage evidence is thin in a specific way.** For 2025-09-01 through 2026-08-31 npm reported 3,840 downloads of `@common-grants/cli` over 365 days, 844 over the last 30, with a median day of 2. Public GitHub code search found 52 file references to the package across seven repositories, and no unambiguous external use of the initialization command. npm counts package installs — including CI, caches, and bots — not which command ran, and code search misses local and private use. The supportable statement is that no evidence was found that `cg init` usage justifies its cost, not that the command has no users. Any number describing its real user count would be inferred, and this ADR does not rest on one.

The decision below therefore covers which onboarding journeys the project intends to promise and maintain. Folder location follows from that, and is not the load-bearing question.

## Decision

1. **Retire `cg init`.** The `check`, `compile`, and `preview` commands are unaffected.
2. **Retire the root `templates/` directory.** The Getting started guide keeps its learning outcome — a small TypeSpec project the reader compiles and previews — by presenting the files directly in the guide rather than generating them.
3. **Rewrite the TypeScript and Python guides around integration.** Both teach exchanging CommonGrants data between existing applications through the SDK and plugin framework, instead of generating an Express or FastAPI application. No maintained full runnable application replaces them.
4. **Delete the legacy monorepo examples**: `examples/ca-opportunity-example/`, `examples/pa-opportunity-example/`, the root `examples/README.md`, and the unreferenced `examples/opportunity_example.py`. The active [`agilesix/cg-api-ca`](https://github.com/agilesix/cg-api-ca) and [`agilesix/cg-api-pa`](https://github.com/agilesix/cg-api-pa) repositories are separate, current, and unaffected; the monorepo copies are 2025-era FastAPI projects pinned five minor lines behind the published SDK, linked from no website page, and not synchronized with those repositories. Deletion is conditional on a bounded comparison first: check both directories for unique fixtures or transformation knowledge not present in the active repositories, and intentionally migrate or document anything still valuable before removing them. Git history covers the rest.
5. **The compatibility promise to already-published CLIs is not settled here.** See the sub-decision below.

Package-local examples under `lib/ts-sdk/examples/` and `lib/python-sdk/examples/` are out of scope. They live inside package boundaries and are covered by their packages' own CI, and the Python ones are imported by tests.

The controlling criterion is **consumer fit**: the guides should teach the adoption path the project has committed to, rather than preserve a generated-application path by inertia. `cg init` shows no demonstrated differentiated value large enough to justify a runtime compatibility contract, a hand-maintained manifest, five dependency surfaces, and an ownership commitment, when a guide can teach the same small project transparently.

### Positive consequences

- No root standalone project surface remains: five lock files, five workflows, mixed npm and Poetry maintenance outside the workspace, the hand-maintained manifest, the labeler rules for those paths, and the manual dependency tier all go away together.
- Once the legacy paths are removed, `main` is no longer a runtime service for shipped CLI releases, and the whole class of "editing a file on `main` changes what an old CLI generates" ends.
- The published guides can teach the integration journey the architecture guidance already describes.
- The Getting started files become visible in the guide instead of being fetched, so a reader can see what they are creating, and the drift between the manifest and the transcribed file tree cannot recur.
- Nothing new is created to own: no dedicated repository, no versioned template service, no release cadence for scaffolding.

### Negative consequences

- The one-command generated on-ramp disappears. A reader who wanted `cg init --template express-js` gets prose and files to copy instead.
- Users relying on the starters are disrupted, and because their usage is not measurable, the disruption cannot be sized in advance.
- Every published CLI eventually fails at `cg init` once the old path is gone, and no release can change what those installed versions request.
- Three public documentation flows need real replacement work; a guide that only deletes the scaffold command leaves the reader with nothing.
- Removing the Express and FastAPI applications removes the project's only maintained end-to-end runnable proof in those languages. The Decision assumes the same-origin mock API playground supplies an interactive evaluation path instead; that work is approved but not yet merged, which is recorded as a revisit trigger below.
- Deleting the monorepo CA/PA copies relies on Git history for anything not migrated first.

## Criteria

1. **Consumer fit** — serve the documented lead adopter's journey rather than preserving historical artifacts.
2. **Evaluator clarity** — an engineer new to CommonGrants can reach a compiled specification quickly, and preview it.
3. **Compatibility** — the fixed `main` URL compiled into every published CLI is accounted for explicitly, not incidentally.
4. **Evidence-proportional maintenance** — ongoing cost corresponds to demonstrated use or an explicitly declared strategic value.
5. **Freshness** — any artifact kept as a permanent supported surface has an automated signal that detects upstream breakage without waiting for someone to edit it. A temporary, explicitly unsupported bridge is exempt from this and carries a deadline instead.
6. **Ownership** — any artifact kept as a permanent supported surface has a named owner and cadence. A temporary bridge needs only a named owner accountable for its removal.
7. **Reversibility** — no new permanent repository or service unless user value justifies it.

## Options considered

- **Option 1:** Keep all root artifacts in the monorepo and automate freshness.
- **Option 2:** Move all root artifacts to a dedicated, versioned repository.
- **Option 3:** Retire the root template and example surface, including `cg init`.
- **Option 4:** Treat artifact classes differently.

## Evaluation

### Side-by-side

- ✅ Criterion met
- ❌ Criterion not met
- 🟡 Partially met or unsure

| Criteria                                            | Option 1 | Option 2 | Option 3 | Option 4 |
| --------------------------------------------------- | :------: | :------: | :------: | :------: |
| Serves the lead adopter's journey (**controlling**) |    🟡    |    🟡    |    ✅    |    ✅    |
| Fast evaluator path to a compiled specification     |    ✅    |    ✅    |    🟡    |    ✅    |
| Ends the live-`main` runtime contract for new CLIs  |    ❌    |    ✅    |    ✅    |    🟡    |
| Avoids abrupt breakage for already-published CLIs   |    ✅    |    🟡    |    🟡    |    🟡    |
| Maintenance proportional to demonstrated use        |    ❌    |    ❌    |    ✅    |    ✅    |
| Eliminates standalone project maintenance           |    ❌    |    ❌    |    ✅    |    🟡    |
| Adds no new operational surface                     |    ✅    |    ❌    |    ✅    |    ✅    |
| Minimizes immediate migration work                  |    ✅    |    ❌    |    ❌    |    ❌    |

Options 3 and 4 both satisfy the controlling criterion. They separate on scope: Option 4 keeps a quickstart artifact and, if it keeps `cg init` to serve it, keeps the runtime contract and an ownership commitment along with it.

### Option 1: Keep all root artifacts and automate freshness

:::note[Bottom line]
Option 1 is best if:

- Generated TypeSpec, Express, and FastAPI projects plus root reference APIs are intentional product surfaces worth funding.
- We can compromise on repository scope and on maintaining five projects without direct evidence that they are used.
  :::

#### What it requires

Scheduled execution of all five workflows; dependency automation or a reliably owned pin-refresh process; release-triggered compatibility checks against published packages; live network coverage for the manifest and the real template slugs; a named owner and cadence; and an explicit choice to either keep the live-`main` runtime contract or do additional work to version it in place.

- **Pros**
  - Nothing breaks for any CLI version.
  - Documentation needs no migration.
  - Contributors see the spec, CLI, templates, and guides together.
- **Cons**
  - Five standalone application surfaces remain, spanning npm and Poetry outside the workspace.
  - Every already-published CLI stays coupled to mutable `main` unless the contract is separately redesigned.
  - Maintenance is funded without evidence that generated initialization earns it.
  - The guides continue to teach a greenfield journey the lead adopter is not on.

### Option 2: Move all root artifacts to a dedicated, versioned repository

:::note[Bottom line]
Option 2 is best if:

- Scaffolding is strategically important, but its ownership and release cadence should be independent of the protocol monorepo.
- We can compromise on total operational surface, since a repository and release process are added rather than removed.
  :::

#### What it requires

A new repository with owners, branch protection, automation, and releases; a versioned template-serving contract for future CLIs; a CLI release pointing at the new source; an explicit bridge or sunset at the original path for old CLIs; and updates to every affected guide and contribution document.

- **Pros**
  - The monorepo sheds the standalone dependency tier.
  - Future templates can be versioned and released independently of the protocol.
  - Template CI and ownership become legible.
- **Cons**
  - The same five projects still need maintenance; the cost moves rather than falls.
  - Old-CLI compatibility is unchanged, because the URL those releases request is fixed.
  - Code and the documentation that promises its behavior now span repositories.
  - A new permanent operational surface is created on the same thin usage evidence.

### Option 3: Retire the root template and example surface, including `cg init`

:::note[Bottom line]
Option 3 is best if:

- We want documentation to teach integration into existing systems and maintenance to match demonstrated use.
- We can compromise on the one-command generated on-ramp and accept real rewrite work across three guides.
  :::

#### What it requires

A CLI release that removes `cg init`; a settled compatibility decision for already-published CLIs; a Getting started guide that builds the small TypeSpec project directly; TypeScript and Python guides rebuilt around SDK and plugin integration; removal of the five workflows, lock files, manifest, labeler entries, and manual-tier documentation; and disposition of the held templates work in [#506](https://github.com/HHS/simpler-grants-protocol/issues/506).

- **Pros**
  - Zero root standalone projects, and no new repository or template service.
  - Documentation can teach the stated adoption model rather than competing with it.
  - The live-`main` runtime liability ends once the legacy paths are removed.
  - No ongoing owner, cadence, or freshness automation is needed for artifacts that no longer exist; a temporary bridge, if chosen, carries only a deadline and a removal owner.
- **Cons**
  - The generated on-ramp is gone, and unmeasured users may be relying on it.
  - Evaluator setup becomes a few manual steps instead of one command.
  - The guide rewrites are the largest piece of work of any option.
  - No maintained full runnable application remains in either language.

### Option 4: Treat artifact classes differently

:::note[Bottom line]
Option 4 is best if:

- The minimal evaluator journey is worth keeping as a maintained artifact even though the framework applications and unlinked examples are not.
- We can compromise on having a clean, uniform end state that is simple to explain and govern.
  :::

#### What it requires

Keeping the quickstart experience — either in the guide or as a much smaller initializer — while retiring the Express and FastAPI templates and the root examples. If the initializer is kept, so is the manifest, the runtime contract, and the compatibility question.

- **Pros**
  - Cost is matched to each artifact class's distinct user value.
  - An evaluator keeps a short path to a compiled specification.
  - Framework-specific application maintenance ends.
- **Cons**
  - A retained initializer keeps the public runtime and compatibility contract alive for a single template.
  - The language guides still need the same rewrites as Option 3.
  - A retained quickstart still needs an owner, dependency updates, and a freshness signal.
  - The outcome is more nuanced to document and govern.

Option 3 is chosen over Option 4 because the evaluator value Option 4 protects is preserved by presenting the quickstart files in the guide. Once that is true, retaining an initializer buys a shorter first command at the price of the manifest, the runtime contract, and an ownership commitment.

## Sub-decision: compatibility for already-published CLIs

An installed CLI cannot be pointed somewhere else after the fact. A new release can point at a tagged source, a different repository, or no initializer at all, but every already-published release keeps requesting `main/templates/template.json`. Relocation does not avoid this; it decides only where future CLIs look.

| Criteria                                     | Permanent bridge | 90-day passive bridge | Immediate removal |
| -------------------------------------------- | :--------------: | :-------------------: | :---------------: |
| Old CLIs keep initializing                   |        ✅        |   ✅ during window    |        ❌         |
| Runtime liability on `main` eventually ends  |        ❌        |          ✅           |        ✅         |
| No ongoing maintenance obligation            |        🟡        |          ✅           |        ✅         |
| Proportional to the available usage evidence |        ❌        |          🟡           |        ✅         |
| Simplest end state                           |        ❌        |          🟡           |        ✅         |

**Proposed:** a 90-day passive bridge beginning when the retirement release publishes. The existing manifest and the template files it references stay in place as a frozen, explicitly unsupported snapshot — no dependency updates, no CI, no compatibility guarantee against future package releases — and are removed at the deadline. The root CA/PA examples are not fetched by `cg init` and are outside the bridge.

**Open for review:** immediate removal. Evidence of active use is weak and the CLI is pre-1.0, so deleting the paths when the implementation lands is a credible outcome rather than a placeholder alternative. There is no window in this path: the retirement release and the removal are the same event, so it needs no deadline and no separate removal owner.

Reviewers should decide whether the passive bridge is proportionate caution or unnecessary ceremony. Only the passive bridge carries scheduling obligations, and choosing it means also fixing its start (the retirement release), its deadline 90 days later, and a named owner accountable for the removal at that deadline.

Both paths must settle two things the choice does not decide on its own:

- **Deprecation communication.** How the retirement is announced — the release notes and changelog for the retiring release, the guides that replace the command, and whether an earlier release first ships a deprecation warning from `cg init`.
- **Old-CLI failure behavior.** Already-published releases cannot be changed, so the only lever is what the URL serves once the decision takes effect. Removing the path outright leaves each installed version to report its own fetch failure, whatever that is. Leaving a tombstone manifest in place instead lets an old CLI resolve something that names the guide replacing the command. Each path needs one of these chosen deliberately rather than inherited by accident.

## What this changes for a reader

Getting started today installs the CLI and generates a project whose contents the guide then describes:

```bash
cg init --template quickstart
# ✔ Enter a project name: common-grants-quickstart
# ✔ Installing dependencies
```

Afterwards, the guide shows the same three TypeSpec files and has the reader create them, then compile with the CLI as before:

```bash
mkdir common-grants-quickstart && cd common-grants-quickstart
# create main.tsp, routes.tsp, and tspconfig.yaml — shown in full in the guide
npm install
cg compile main.tsp
```

The TypeScript and Python guides change more than their first command. Today they generate an application and instruct the reader to replace its mock services. Afterwards they start from an API the reader already has and show how to model its data with the SDK, map custom fields, filters, and transforms at the plugin boundary, and validate the resulting contract.

## Deferred

- **Where a future template service would live, if one is ever wanted.** This ADR removes the current surface rather than choosing a versioned home for a replacement. Options 2 and 4 remain available to a later ADR that has evidence to justify them.
- **What replaces the CA/PA copies as reference material.** The active separate repositories exist and are unaffected; whether the website should link them is a documentation decision, not part of this one.
- **The end-to-end interactive proof.** The Decision assumes the mock API playground work covers it. If that assumption fails, the gap is a documentation decision to make deliberately rather than a reason to restore the retired scaffolds.

## Revisit triggers

This decision rests on evidence that is thin by acknowledged measurement limits. Any of the following should reopen it:

- A named adopter reports relying on `cg init` or on the generated applications.
- Product direction explicitly commits to greenfield project generation as a supported journey.
- Onboarding evidence shows the direct guide materially reduces successful first use compared with the initializer.
- A named owner accepts the maintenance budget, automation contract, and cadence that Option 1 or Option 4 requires.
- The same-origin mock API playground ([PR #1114](https://github.com/HHS/simpler-grants-protocol/pull/1114), QA in [#1111](https://github.com/HHS/simpler-grants-protocol/issues/1111)) does not land, or does not provide a reliable public interactive evaluation path. That case calls for deciding how end-to-end proof is supplied, not for silently restoring the old scaffolds.

## Conformance

Conventions this decision touches, the wire-shape conventions it does not, and the cross-cutting axes. No row diverges, so no ADR exception is required.

| Aspect                                            | Convention                                                                             | Conforms / Diverges                                                                                                                                                                                                          |
| ------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ADR location and numbering                        | `website/src/content/docs/governance/adr/NNNN-*.md`, sequential                        | Conforms — 0028, the next number after 0027                                                                                                                                                                                  |
| ADR structure                                     | Context → Decision → consequences → Criteria → Options → Evaluation matrix             | Conforms — [ADR 0027](/governance/adr/0027-release-please/) as the model                                                                                                                                                     |
| Signalling an unaccepted ADR                      | Template `draft: true`; the `:::caution` banner used for supersession in 0010 and 0016 | New territory — ADRs 0001–0027 carry no status marker and none merged in a Proposed state; this reuses the template flag and the banner idiom rather than following a precedent. Both come out on acceptance                 |
| Implementation tracking in the Decision narrative | Belongs in the epic and PR history, not the ADR                                        | Conforms — the held templates work is referenced only in Option 3's requirements                                                                                                                                             |
| Dependency maintenance tiers                      | `DEPENDENCY_MANAGEMENT.md` manual tier                                                 | Conforms — removes the tier's members; the tier definition itself is untouched                                                                                                                                               |
| Deprecating a published CLI surface               | No precedent in ADRs 0001–0027                                                         | New territory — settled in the sub-decision above, not a divergence                                                                                                                                                          |
| Pagination                                        | [ADR 0011](/governance/adr/0011-pagination/) `page` / `pageSize`                       | N/A — no endpoint or query parameter is added or changed                                                                                                                                                                     |
| Path identifiers                                  | `{resource}Id`; [ADR 0023](/governance/adr/0023-org-ids/) for organizations            | N/A — no route or path parameter is touched                                                                                                                                                                                  |
| Headers                                           | Header names established by existing routes                                            | N/A — no request or response header is defined                                                                                                                                                                               |
| Field names                                       | `createdAt` / `lastModifiedAt` and the core model naming                               | N/A — no model field is added, renamed, or retyped                                                                                                                                                                           |
| Response shapes                                   | Core response wrappers and error shapes                                                | N/A — no response body is defined; this decision changes documentation, CLI commands, and repository contents only                                                                                                           |
| Security                                          | Auth boundaries, input validation, exposed surface                                     | N/A to the protocol surface — no credential path or validation boundary changes. Retiring `cg init` removes a runtime fetch of remote template content into a user's machine, which narrows exposure rather than widening it |
| Privacy                                           | PII handling, log redaction                                                            | N/A — nothing this decision changes collects, stores, or logs personal data                                                                                                                                                  |
| Observability                                     | What is logged or metered for the new surface                                          | N/A — no runtime service remains to instrument. The related question, that package downloads cannot reveal which command ran, is addressed in the Context                                                                    |
| Reliability                                       | Error paths and partial-failure modes                                                  | Addressed — old-CLI failure behavior is one of the two items both compatibility paths must settle                                                                                                                            |
| Performance                                       | Query cost, payload size                                                               | N/A — no request path or payload is defined or changed                                                                                                                                                                       |
| Cost                                              | Storage, compute, third-party spend                                                    | Addressed — no infrastructure spend changes; the cost at stake is maintenance, weighed as the evidence-proportional-maintenance criterion                                                                                    |
| Operations                                        | Deploy, rollback, migration, versioning                                                | Addressed — release and removal sequencing in the compatibility sub-decision; documentation migration in Option 3's requirements                                                                                             |
