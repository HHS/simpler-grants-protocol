---
title: Retiring cg init and the root templates and examples
description: ADR documenting the decision to retire the cg init command and the root templates and examples in favor of docs-owned onboarding guides.
---

The repository root contains five standalone projects outside the pnpm workspace: three `cg init` templates (`quickstart`, `express-js`, and `fast-api`) and two example APIs (`examples/ca-opportunity-example/` and `examples/pa-opportunity-example/`). The [dependency audit in issue #761](https://github.com/HHS/simpler-grants-protocol/issues/761) documents their dependencies, automation, and documentation relationships.

Published CLI releases containing remote scaffolding, beginning with [`0.1.0-alpha.2`](https://unpkg.com/@common-grants/cli@0.1.0-alpha.2/dist/services/init.service.js), fetch `templates/template.json` from the `main` branch at runtime, as shown by the [initializer source before this decision](https://github.com/HHS/simpler-grants-protocol/blob/b99d2cfcef34c7dcfde6e5376ae3c7e2b41e116e/lib/cli/src/commands/init/init-service.ts#L6). The manifest currently lists relative file paths, so TypeSpec resolves those files from the same branch. Changes to the manifest or its referenced files therefore change what those installed releases generate. Deleting the manifest causes their initialization command to fail.

Issue [#612](https://github.com/HHS/simpler-grants-protocol/issues/612) moved these projects to the manual maintenance tier. Since then, their package pins have diverged from published packages, documentation has accumulated stale names and links, and their workflows have had no automatic scheduled or release-triggered signal. Manual and reusable workflow runs remain possible, but upstream breakage is not detected automatically.

The existing documentation uses the artifacts in different ways. Getting Started generates a small TypeSpec specification from `quickstart`; the TypeScript and Python guides generate framework applications from `express-js` and `fast-api`. From 2025-09-01 through 2026-08-31, npm reported [3,840 downloads of the CLI package](https://api.npmjs.org/downloads/point/2025-09-01:2026-08-31/@common-grants/cli). That package-level proxy does not identify which command ran, so this decision treats reliance on `cg init` as unknown rather than zero.

## Decision

1. **Retire `cg init`.** The `check`, `compile`, and `preview` commands are unaffected.
2. **Retire the root template projects.** Getting Started will present a complete small TypeSpec project directly in the guide, including its package manifest or explicit dependency-install command. Readers will still compile and preview the result.
3. **Rewrite the TypeScript and Python guides around integration.** Both will begin with an existing application and teach SDK and plugin integration rather than generate an Express or FastAPI application. No maintained full application replaces those templates.
4. **Delete the legacy monorepo CA and PA example applications.** The active [California](https://github.com/agilesix/cg-api-ca/tree/55f535fdbb3747e4c8b05fea4ef2f8293df492a1) and [Pennsylvania](https://github.com/agilesix/cg-api-pa/tree/4d067a4559cb51aefa10290a11314ef37e8a8cb9) API repositories are separate and unaffected. Comparison with the pinned legacy [CA](https://github.com/HHS/simpler-grants-protocol/tree/b99d2cfcef34c7dcfde6e5376ae3c7e2b41e116e/examples/ca-opportunity-example) and [PA](https://github.com/HHS/simpler-grants-protocol/tree/b99d2cfcef34c7dcfde6e5376ae3c7e2b41e116e/examples/pa-opportunity-example) trees found no reason to retain either legacy application as executable software. Legacy date-transformation sentinel constants and former UUID namespaces are not adopted by the active applications.
5. **Provide a 90-day commit-pinned compatibility bridge.** Already-published CLIs will continue fetching `templates/template.json` from `main`, but that manifest will point every template file to an absolute raw GitHub URL containing the full commit SHA of the final template snapshot. The referenced template files can then be deleted from `main`; only the manifest remains during the bridge.

The retirement release starts the 90-day window. Its implementation must:

- verify the rewritten manifest across the affected published CLI and bundled-compiler families before deleting the root template files;
- protect the retained manifest with review controls and an automated integrity check that verifies the whole manifest against an approved digest;
- announce the retirement in the release and replacement documentation;
- name a removal owner and calendar deadline; and
- delete the manifest at the deadline. Scaffold attempts then fail with a download error; `cg init --list` logs that error but displays its existing hard-coded fallback names.

The approved digest covers the complete manifest, including file sources, write destinations, dependencies, and generation settings. This prevents a manifest change from redirecting content, writing to new destinations, or injecting dependencies without an explicit review of the new digest. The archived content is unsupported during the bridge: it receives no dependency updates and has no compatibility guarantee with future package releases. Its remote-install and aging-dependency exposure remains for 90 days.

Package-local examples under `lib/ts-sdk/examples/` and `lib/python-sdk/examples/` are out of scope. They remain inside package boundaries and under their packages' CI.

For this decision, existing-system integration and evaluator clarity take priority over retaining greenfield application generation.

### Positive consequences

- Root standalone applications, their lock files, workflows, label rules, and manual dependency surfaces are removed.
- Affected old CLIs resolve the same commit-pinned content whenever the raw URLs remain available, instead of files that change with `main`.
- After 90 days, `main` is no longer a runtime source for installed CLI releases.
- The guides expose the files and integration steps readers are expected to understand.
- No new repository, template service, or release process is created.

### Negative consequences

- The generated on-ramp and the maintained Express and FastAPI applications disappear.
- Three documentation flows require end-to-end replacement work.
- `templates/template.json` remains a security-sensitive runtime input on `main` for 90 days: it controls fetched content, write destinations, and generated dependencies. The whole-manifest digest and review controls are required throughout that window.
- The Node templates install frozen lockfile graphs, while FastAPI resolves unlocked dependency ranges. Neither receives maintenance during the bridge.
- Affected old CLIs fail to initialize after the manifest is removed, and that behavior cannot be changed in packages users already installed.
- The merged mock API playground provides a separate interactive evaluation path, but it is not a maintained full application in either language. [Issue #1111](https://github.com/HHS/simpler-grants-protocol/issues/1111) records the completed QA pass that established the path works today.

## Criteria

1. **Consumer fit** — teach integration with existing systems rather than preserve framework generation by default.
2. **Evaluator clarity** — let a new reader create, compile, and preview a complete small specification.
3. **Compatibility** — account explicitly for affected published CLIs whose manifest URL cannot be changed.
4. **Integrity** — do not leave mutable executable template content on `main` without an enforced check.
5. **Freshness** — permanent supported artifacts require an automated freshness signal; a frozen, unsupported bridge must instead preserve exact content and expire on schedule.
6. **Proportional maintenance** — do not permanently fund artifacts whose use and strategic value are unestablished.
7. **Ownership and finality** — give temporary compatibility a named removal owner and fixed end date without creating a permanent service.

## Options considered

| Option                                       | Primary benefit                                                    | Primary cost                                                        | Result   |
| -------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- | -------- |
| Keep all artifacts and automate freshness    | Avoids migration and old-CLI breakage                              | Retains five standalone surfaces and mutable-`main` coupling        | Rejected |
| Move all artifacts to a versioned repository | Separates ownership and enables versioning for future CLIs         | Adds an operational surface and cannot redirect installed CLIs      | Rejected |
| Retire templates, examples, and `cg init`    | Removes the standalone projects and aligns guides with integration | Removes generated applications and requires three guide rewrites    | Selected |
| Keep only a quickstart initializer           | Preserves a short evaluator path at lower cost                     | Retains the manifest contract, ownership, and freshness obligations | Rejected |
| Retire immediately with no bridge            | Ends the `main` runtime contract during implementation             | Breaks affected installed clients immediately                       | Rejected |

The retirement option is selected because the evaluator outcome can be preserved directly in Getting Started without preserving a generator. Immediate removal was also considered. The 90-day bridge was selected instead because reliance cannot be measured directly and the commit-pinned design bounds compatibility without retaining mutable template projects on `main`.

## Compatibility bridge

An installed CLI cannot be republished in place with a new manifest URL. The manifest it already requests can, however, direct TypeSpec to absolute file URLs at an immutable commit. The URL resolvers in TypeSpec [0.63](https://unpkg.com/@typespec/compiler@0.63.0/dist/src/utils/misc.js) and [1.13](https://unpkg.com/@typespec/compiler@1.13.0/dist/src/utils/misc.js) leave absolute URLs unchanged, and the [1.13 initialization code](https://unpkg.com/@typespec/compiler@1.13.0/dist/src/init/scaffold.js) applies that resolver to every `files[].path`:

```text
affected cg init
    -> main/templates/template.json (retained for 90 days)
    -> raw GitHub URLs at one full commit SHA
    -> frozen template files no longer present on main
```

The commit SHA fixes the content but not the availability of these URLs. An unavailable repository or raw-content host ends the bridge early with a download failure rather than serving altered content.

## Deferred

- **A future template service.** This ADR removes the current surface rather than choosing a versioned home for a replacement. A later ADR may reconsider one if usage evidence justifies its ownership and operational cost.
- **Website treatment of the active CA and PA repositories.** The active repositories remain available; deciding whether and how to present them as reference material is separate documentation work.
- **Held template maintenance.** Retirement supersedes the premise of [issue #506](https://github.com/HHS/simpler-grants-protocol/issues/506); implementation tracking will disposition that issue.

## Revisit triggers

- A named adopter reports relying on `cg init` or the generated applications.
- Product direction explicitly adopts greenfield application generation as a supported journey.
- Onboarding evaluation shows that the direct guide materially reduces successful first use.
- A named owner accepts the permanent maintenance and automation obligations of a template surface.
- Observed failures show that the public mock API playground is unreliable as an interactive evaluation path.

## Conformance

This decision changes no protocol wire shape, authentication boundary, personal-data flow, runtime service, storage path, or performance characteristic; privacy, observability, and infrastructure cost are therefore unaffected.

| Aspect                                     | Convention                                                                                                                                                                                           | Conforms / Diverges                                                                                                      |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Protocol wire shapes                       | [ADRs 0011](/governance/adr/0011-pagination/), [0012](/governance/adr/0012-filtering/), and [0013](/governance/adr/0013-sorting/), plus existing identifiers, headers, fields, and response wrappers | N/A — no protocol wire shape changes                                                                                     |
| Dependency maintenance                     | [`DEPENDENCY_MANAGEMENT.md`](https://github.com/HHS/simpler-grants-protocol/blob/b99d2cfcef34c7dcfde6e5376ae3c7e2b41e116e/DEPENDENCY_MANAGEMENT.md) manual tier                                      | Conforms — removes the tier's root template and example members                                                          |
| CLI deprecation, reliability, and security | No prior ADR defines this retirement shape                                                                                                                                                           | N/A — the bridge is new territory and explicitly retains remote-install exposure until removal                           |
| Bridge freshness                           | Issue #1089 requires automated freshness for retained artifacts                                                                                                                                      | Diverges — the frozen bridge uses exact-content integrity instead of updating dependencies                               |
| Operations                                 | Release, rollback, migration, and versioning consequences must be explicit                                                                                                                           | Conforms — the retirement release starts the bridge; a named owner removes the protected manifest on a calendar deadline |

**Freshness exception.** This scoped divergence serves users of affected installed CLIs during a bounded deprecation period. Updating the archived content would restore the mutable output and maintenance obligations this decision removes, so the bridge preserves an exact reviewed manifest and snapshot until its scheduled deletion instead.
