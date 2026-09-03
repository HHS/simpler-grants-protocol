---
title: Separating API templates from the protocol monorepo
description: ADR documenting the decision to retire cg init and maintain framework-specific CommonGrants API templates in standalone repositories.
---

The repository root contains five standalone projects outside the pnpm workspace: three `cg init` templates (`quickstart`, `express-js`, and `fast-api`) and two example APIs (`examples/ca-opportunity-example/` and `examples/pa-opportunity-example/`). A [dependency audit](https://github.com/user-attachments/files/31036461/templates-examples-dependency-audit.md) documents their dependencies, automation, and documentation relationships.

Published CLI releases containing remote scaffolding, beginning with [`0.1.0-alpha.2`](https://unpkg.com/@common-grants/cli@0.1.0-alpha.2/dist/services/init.service.js), fetch `templates/template.json` from the `main` branch at runtime, as shown by the [initializer source before this decision](https://github.com/HHS/simpler-grants-protocol/blob/b99d2cfcef34c7dcfde6e5376ae3c7e2b41e116e/lib/cli/src/commands/init/init-service.ts#L6). The manifest currently lists relative file paths, so TypeSpec resolves those files from the same branch. Changes to the manifest or its referenced files therefore change what installed releases generate. Deleting the manifest causes their initialization command to fail.

The repository's [dependency policy](https://github.com/HHS/simpler-grants-protocol/blob/b99d2cfcef34c7dcfde6e5376ae3c7e2b41e116e/DEPENDENCY_MANAGEMENT.md) moved the root templates and examples to a manual maintenance tier. Their package pins and documentation subsequently drifted, and their workflows have no scheduled or release-triggered signal.

CommonGrants needs maintained TypeScript and Python API templates that help adopters turn existing data sources into working APIs. The current `cg init` distribution model couples those templates to the protocol repository and to already-published CLI releases.

The existing documentation uses the current artifacts in different ways. Getting Started generates a small TypeSpec specification from `quickstart`; the TypeScript and Python guides generate framework applications from `express-js` and `fast-api`. From 2025-09-01 through 2026-08-31, npm reported [3,840 downloads of the CLI package](https://api.npmjs.org/downloads/point/2025-09-01:2026-08-31/@common-grants/cli). That package-level proxy does not identify which command ran, so this decision treats reliance on `cg init` as unknown rather than zero.

## Decision

1. **Retire `cg init`.** The `check`, `compile`, and `preview` commands are unaffected. New template repositories will not depend on the CLI's remote manifest.
2. **Move the minimal quickstart into Getting Started.** The guide will present a complete small TypeSpec project, including its package manifest or explicit dependency-install command. Readers will still compile and preview the result without generating it through `cg init`.
3. **Maintain Express, Hono, and FastAPI as three framework-specific API templates in standalone repositories.** The existing Express and FastAPI projects will be extracted and refreshed, and the Hono project will be created separately. Each repository is a directly usable project template with its own documentation, automation, and ownership.
4. **Keep a shared support contract while allowing framework-specific design.** Each template will provide a runnable CommonGrants API from an existing data source. Framework-native project structure and deployment choices may differ.
5. **Remove the framework projects from this monorepo after their standalone replacements are verified.** The TypeScript and Python guides will point to the maintained template repositories and explain how their SDK and plugin boundaries connect existing data to CommonGrants. The migration is not a direct copy: each template must be refreshed against supported published packages and pass its replacement checks before the monorepo copy is removed. Associated monorepo CI and maintenance documentation will be removed or updated with the projects.
6. **Delete the root `examples/` directory.** This includes the legacy CA and PA applications, `examples/README.md`, and the unreferenced `examples/opportunity_example.py`. The active [California](https://github.com/agilesix/cg-api-ca/tree/55f535fdbb3747e4c8b05fea4ef2f8293df492a1) and [Pennsylvania](https://github.com/agilesix/cg-api-pa/tree/4d067a4559cb51aefa10290a11314ef37e8a8cb9) API repositories are separate and unaffected. Comparison with the pinned legacy [CA](https://github.com/HHS/simpler-grants-protocol/tree/b99d2cfcef34c7dcfde6e5376ae3c7e2b41e116e/examples/ca-opportunity-example) and [PA](https://github.com/HHS/simpler-grants-protocol/tree/b99d2cfcef34c7dcfde6e5376ae3c7e2b41e116e/examples/pa-opportunity-example) trees found no behavior that requires retaining either legacy application as a second executable reference.
7. **Provide a 90-day commit-pinned compatibility bridge.** Already-published CLIs will continue fetching `templates/template.json` from `main`, but that manifest will point every legacy template file to an absolute raw GitHub URL containing the full commit SHA of the final monorepo snapshot. The root template projects can then be removed from `main`; only the manifest remains during the bridge. The bridge preserves old output temporarily and does not distribute or update the standalone replacements.

TypeSpec [leaves absolute template file URLs unchanged](https://unpkg.com/@typespec/compiler@1.13.0/dist/src/utils/misc.js), so the retained manifest can resolve the removed files at the pinned commit. The SHA fixes their content but not their availability.

The retirement release starts the 90-day window. Its implementation must:

- verify the rewritten manifest across affected published CLI families, including their bundled or runtime-resolved compiler behavior, before removing the root template files;
- protect the retained manifest with review controls and an automated integrity check that verifies the whole manifest against an approved digest;
- announce the `cg init` retirement and replacement template repositories in the release and documentation;
- name a removal owner and calendar deadline; and
- delete the manifest at the deadline. Scaffold attempts then fail with a download error.

The approved digest covers the complete manifest, including file sources, write destinations, dependency declarations, and generation settings. The archived content is unsupported during the bridge: it receives no dependency updates and has no compatibility guarantee with future package releases.

Each standalone template is a supported developer-tooling surface. Before the corresponding monorepo project is removed, its repository must have:

- a named owner and documented maintenance expectations;
- integration with the applicable CommonGrants SDK for request and response validation;
- a generated OpenAPI document and automated CommonGrants contract validation;
- dependency automation and tests against its supported SDK range.

Package-local example code under `lib/ts-sdk/examples/` and `lib/python-sdk/examples/` remains inside package boundaries and under package CI. References from those examples to the legacy CA and PA backends are part of the migration: they must point to a maintained template, package-local mock, or active external API before the root `examples/` directory is deleted.

### Positive consequences

- Express, Hono, and FastAPI users each receive an intentional, directly usable template.
- Template repositories can evolve, test, and automate dependencies on framework-specific schedules without adding application dependencies to the protocol monorepo.
- The quickstart remains a complete evaluator path without preserving a generator for a small TypeSpec project.
- Affected old CLIs resolve the same commit-pinned content during the bridge instead of files that change with `main`.
- After 90 days, `main` is no longer a runtime template source for installed CLI releases.
- Existing Express and FastAPI work remains available as migration input rather than being discarded and recreated later.

### Negative consequences

- Three repositories require ownership, dependency automation, CI, documentation, and periodic compatibility work.
- Shared behavior can drift across templates unless common contract outcomes are tested consistently.
- SDK releases and breaking changes require coordination with repositories outside the monorepo.
- Users need guidance for choosing between the two TypeScript framework paths.
- The extraction and refresh of Express and FastAPI add migration work before their root directories can be removed.
- `templates/template.json` remains a security-sensitive runtime input on `main` for 90 days.
- Affected old CLIs fail to initialize after the manifest is removed, and that behavior cannot be changed in packages users already installed.

### Criteria

1. **Consumer fit** — help an adopter turn an existing data source into a working CommonGrants API through a framework they can use.
2. **Framework coverage** — support Express, Hono, and FastAPI as distinct framework paths.
3. **Evaluator clarity** — let a new reader create, compile, and preview a complete small specification without requiring application scaffolding.
4. **Independent freshness** — give every maintained template automated dependency and compatibility signals appropriate to its framework.
5. **Clear ownership** — make every supported template's maintenance responsibility and lifecycle explicit.
6. **Protocol-repository focus** — remove standalone application dependency trees and framework release cadence from the protocol monorepo.
7. **Compatibility** — account explicitly for affected published CLIs whose manifest URL cannot be changed.
8. **Integrity** — do not leave mutable executable template content on `main` without an enforced check.
9. **Migration safety** — verify a replacement before deleting the corresponding monorepo project.

### Options considered

- **Keep and refresh all templates in this monorepo** — Rejected.
- **Move all maintained templates into one external repository** — Rejected.
- **Maintain one template per language** — Rejected.
- **Treat artifact classes differently: move the quickstart into the guide, use one standalone repository per framework template, and delete the legacy examples** — Selected.
- **Retire all full application templates** — Rejected.

The standalone-repository option is selected because the template portfolio is an intentional developer-tooling product, while the protocol monorepo is not the right maintenance boundary for three framework applications. Staleness in the current projects is evidence that they need explicit ownership and automation, not evidence that their user journeys should be removed. Separate repositories also let Express and Hono remain distinct TypeScript choices while FastAPI serves Python adopters.

The location decision does not determine the transition for installed CLIs, whose manifest URL cannot be changed. Three compatibility options were considered separately:

| Compatibility option                 | Primary benefit                                        | Primary cost                                                      | Result   |
| ------------------------------------ | ------------------------------------------------------ | ----------------------------------------------------------------- | -------- |
| Preserve the legacy manifest forever | Avoids intentionally breaking installed `cg init`      | Keeps an unsupported remote-scaffolding contract and removal duty | Rejected |
| Keep a 90-day commit-pinned bridge   | Gives users a bounded transition with immutable files  | Retains remote-install and aging-dependency exposure for 90 days  | Selected |
| Remove the manifest immediately      | Ends the `main` runtime contract during implementation | Breaks affected installed clients without a transition            | Rejected |

The 90-day duration is a policy judgment rather than a value derived from usage data. It provides a three-month notice period while retaining a fixed calendar deadline set when the retirement release begins. A commit-pinned manifest bounds that compatibility period without making the new template repositories part of an immutable URL contract embedded in old CLI releases. A permanent bridge conflicts with the decision to end the unsupported runtime contract, while immediate removal provides no transition under uncertain usage.

## Evaluation

### Side-by-side

- ✅ Criterion met
- ❌ Criterion not met
- 🟡 Partially met or requires additional work

This matrix evaluates the template portfolio and location criteria. CLI compatibility and manifest integrity are evaluated by the separate compatibility decision above.

| Criteria                  | Keep in monorepo | One external repository | One per language | One per framework | Retire all templates |
| ------------------------- | :--------------: | :---------------------: | :--------------: | :---------------: | :------------------: |
| Consumer fit              |        ✅        |           ✅            |        🟡        |        ✅         |          ❌          |
| Framework coverage        |        ✅        |           ✅            |        ❌        |        ✅         |          ❌          |
| Evaluator clarity         |        ✅        |           ✅            |        ✅        |        ✅         |          ✅          |
| Independent freshness     |        🟡        |           🟡            |        ✅        |        ✅         |          ✅          |
| Clear ownership           |        🟡        |           ✅            |        ✅        |        ✅         |          ✅          |
| Protocol-repository focus |        ❌        |           ✅            |        ✅        |        ✅         |          ✅          |
| Migration safety          |        ✅        |           🟡            |        🟡        |        ✅         |          ❌          |

### Keep and refresh templates in this monorepo

:::note[Bottom line]
This option is best if keeping applications with the protocol is more important than separating their framework-specific dependencies and release schedules.
:::

- **Pros**
  - Preserves the existing projects and documentation relationships with the least relocation work.
  - Keeps protocol and template changes available to one pull request and one CI system.
  - Avoids creating additional repositories.
- **Cons**
  - Retains three application dependency trees and their framework maintenance in the protocol monorepo.
  - Preserves the current runtime coupling unless `cg init` is separately retired.
  - Repeats the maintenance model that failed to detect or correct the current drift.

### Move maintained templates into one external repository

:::note[Bottom line]
This option is best if centralized template governance is more important than independent framework maintenance and direct repository-template ergonomics.
:::

- **Pros**
  - Removes application dependencies from the protocol monorepo.
  - Provides one place for shared policy, documentation, and contract tests.
  - Requires less repository administration than one repository per framework.
- **Cons**
  - Shares repository governance and settings across Python and TypeScript tooling.
  - A repository containing several projects is not directly usable as one framework-specific repository template without another selection mechanism.
  - Repository-wide maintenance gaps can affect every framework path even when project checks are path-scoped.

### Maintain one template per language

:::note[Bottom line]
This option is best if limiting maintenance to one TypeScript and one Python template is more important than preserving both documented TypeScript framework paths.
:::

- **Pros**
  - Provides TypeScript and Python paths with two repositories instead of three.
  - Gives each language one default onboarding path.
  - Reduces duplicated TypeScript compatibility and documentation work.
- **Cons**
  - Requires choosing between the two planned TypeScript framework paths.
  - Removes an existing framework path without usage evidence or a recorded supersession decision.

### Use one standalone repository per framework template

:::note[Bottom line]
This option is best if each framework should provide a directly usable, independently maintained path from existing data to a CommonGrants API, while accepting three explicit maintenance commitments.
:::

- **Pros**
  - Express, Hono, and FastAPI remain distinct supported choices.
  - Each repository can use framework-native dependency automation, CI, documentation, and maintenance practices.
  - Existing Express and FastAPI projects can be extracted and refreshed in place rather than discarded.
  - Each repository can be consumed directly without a central runtime manifest.
- **Cons**
  - Three repositories increase administration and cross-repository coordination.
  - Common capabilities can drift without shared contract outcomes and release checks.
  - Documentation must explain the two TypeScript choices and their deployment trade-offs.

### Retire all full application templates

:::note[Bottom line]
This option is best if reducing maintenance is more important than the developer-tooling commitment to runnable TypeScript and Python API starters.
:::

- **Pros**
  - Eliminates application-template maintenance and cross-repository coordination.
  - Keeps onboarding concentrated in protocol and SDK documentation.
  - Requires no new repository ownership.
- **Cons**
  - Does not provide the TypeScript and Python starter paths.
  - Leaves teams to assemble validation, OpenAPI generation, and project structure themselves.

## Deferred

- **Template creation mechanism beyond direct repository use.** A future `npm create` command or other generator may be considered separately; the standalone repositories do not require a central runtime service.
- **Additional frameworks.** A Go template depends on a Go SDK and is not selected or rejected by this three-template decision.
- **Website treatment of the active CA and PA repositories.** The active repositories remain available; deciding whether and how to present them as reference material is separate documentation work.

## Revisit triggers

- Usability tests show that a maintained template does not improve completion, time, or steps for its intended adopters.
- A template lacks an owner or repeatedly misses its declared SDK compatibility window.
- User evidence supports adding or retiring a framework path.
- A shared generator becomes necessary to keep the standalone repositories consistent.
