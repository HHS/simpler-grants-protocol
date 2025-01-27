---
title: Release workflow
description: ADR documenting the decision to adopt a CI/CD workflow that prioritizes pre-releases initially, and then stable releases using Changesets.
---

## Summary

### Problem statement

The CommonGrants codebase is a monorepo containing multiple interrelated libraries, including the core TypeSpec library, CLI tools, and TypeSpec emitters for server and client code generation. We need a strategy for publishing these libraries to `npm` that supports both releases and pre-releases effectively, while ensuring transparency and minimizing complexity.

### Decision outcome

We will initially adopt Option 1 (CD for prereleases with manually triggered GitHub releases) since we only have a single package and haven't published a stable release yet. Once we have multiple packages and at least one stable release, we plan to migrate to Option 2 (Changesets) for better independent release management.

- **Positive consequences**
  - Quick and easy publishing of pre-releases while iterating on package APIs for the first release
  - Simple setup with minimal configuration needed
  - Automated workflows reduce manual intervention (for pre-releases)
  - Avoids committing to a long-term release workflow until we have a better understanding of our needs
- **Negative consequences**
  - Limited traceability of changes before first stable release
  - May require additional work to set up Changesets in the future
  - No automated changelog generation initially

### Decision drivers

- Pre-releases are easy to publish.
- Stable releases are easy to manage and audit.
- Individual packages can be released independently.
- Initial set up and configuration is simple.
- Future releases have minimal overhead.

### Options considered

- **Option 1:** CD for prereleases (with manually triggered GitHub releases).
- **Option 2:** CD for independent releases with Changesets.
- **Option 3:** CD for synchronized releases with Lerna.

## Evaluation

### Side-by-side

- ✅ Criterion met
- ❌ Criterion not met
- 🟡 Partially met or unsure

| Criteria                     | Option 1 | Option 2 | Option 3 |
| ---------------------------- | :------: | :------: | :------: |
| Easy pre-release workflow    |    ✅    |   🟡    |   🟡    |
| Managed stable releases      |    ✅    |    ✅    |    ✅    |
| Decoupled package releases   |    ✅    |    ✅    |    ❌    |
| Auto-generated changelogs    |    ❌    |    ✅    |    ✅    |
| Easy setup and configuration |    ✅    |    ❌    |   🟡    |
| Minimal overhead             |    ❌    |   🟡    |   🟡    |

### Option 1

:::note[Bottom line]
Option 1 is best if:

- We prioritize simplicity for pre-releases and manual control over stable releases.
- We can manage changelog generation outside of the release pipeline.
  :::

#### How it works

- **Summary:** Automatically publish a pre-release each time code is merged into `main`. Manually create GitHub releases for new versions. GitHub releases automatically trigger CD to publish a corresponding `npm` version.
- **Common workflows:**
  1. **Pre-release:** Push changes to the `main` branch; CD pipeline publishes a pre-release version automatically.
  2. **Major/minor release:** Manually create a GitHub release, triggering the pipeline to publish the new version.
  3. **Patches:** Hard to apply multiple patch releases to different versions of the same package in this workflow.
  4. **Merge without changes:** Pre-releases are only published if changes are made to a given package's sub-directory.

#### Tradeoffs

- **Pros**
  - Simplifies pre-release automation.
  - Allows manual control over stable releases.
- **Cons**
  - Lacks automation for changelog generation.
  - Increased manual effort for stable releases.

### Option 2

:::note[Bottom line]
Option 2 is best if:

- We need independent versioning and release cycles for each package
- We want automated changelog generation and release notes
- We can accept the additional complexity of managing changesets
  :::

#### How it works

- **Summary:** Use Changesets to manage versions, changelogs, and releases independently for each package. Changes are tracked through changeset files that specify the type of change and affected packages.
- **Common workflows:**
  1. **Pre-release:** Create a changeset with pre-release tag, merge to main, and Changesets handles versioning and publishing.
  2. **Major/minor release:** Add changesets for affected packages, merge to main, and the release PR is automatically created.
  3. **Patches:** Create changesets for patch changes, merge, and releases are published independently.
  4. **Merge without changes:** No changesets needed; no versions are bumped.

#### Tradeoffs

- **Pros**
  - Automated changelog generation
  - Independent package versioning
  - Clear tracking of changes through changeset files
  - Supports both pre-releases and stable releases
- **Cons**
  - More complex setup and configuration
  - Requires developers to create changesets
  - Additional PR workflow for releases
  - Harder to manage inter-package dependencies
  - Harder to manage pre-releases

### Option 3

:::note[Bottom line]
Option 3 is best if:

- We want to keep all packages in sync with a single version
- We prefer simpler dependency management over granular releases
- We can accept version bumps for unchanged packages
  :::

#### How it works

- **Summary:** Use Lerna to manage versions and releases with a single shared version number across all packages. Changes to any package trigger version bumps for all packages.
- **Common workflows:**
  1. **Pre-release:** Run lerna version with pre-release tag; all packages get new pre-release versions.
  2. **Major/minor release:** Run lerna version to bump all packages to the new version.
  3. **Patches:** Create patch release that updates all packages, even unchanged ones.
  4. **Merge without changes:** No automatic version bumps; releases must be explicitly triggered.

#### Tradeoffs

- **Pros**
  - Simple version management with single number
  - Built-in tooling for monorepo management
  - Automated publishing workflow
  - Guaranteed package version alignment
- **Cons**
  - Forces version bumps for unchanged packages
  - Less flexibility for package-specific releases
  - Can lead to unnecessary package updates
