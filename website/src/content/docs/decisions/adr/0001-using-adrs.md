---
title: Using ADRs
description: ADR to document the use of ADRs to record decisions.
---

## Summary

### Problem statement

What is the best way to document key architectural decisions made within the project so that future contributors can understand the rationale behind those decisions?

### Decision outcome

We've decided to use Architecture Decision Records (ADRs) as described in [Recording decisions](/simpler-grants-protocol/decisions/overview). These records will be published on the website for this project.

- **Positive consequences**
  - Decisions are documented explicitly
  - Decision records travel with the repo
  - Decision records live alongside other docs in the repo
- **Negative consequences**
  - It may be slower to record decisions, relative to documenting them outside the repo
  - It may be harder for folks to create decision records if they are not familiar with markdown or GitHub
  - We'll need to spend time keeping these decision records up-to-date, so they aren't inaccurate

### Decision drivers

- **Transparency:** We want our decisions to be transparent to project stakeholders.
- **Discoverability:** We want our decisions to be easily discoverable by project maintainers and external stakeholders.
- **Minimal overhead:** We want to minimize the amount of overhead required to maintain our decision log, so that the log accurate reflects the current state of our decisions.

### Options considered

- **Using ADRs published on the website:** Chosen because it balanced transparency, discoverability, and colocation with the code the decisions relate to.
- **Documenting decisions in Google Drive:** Would make recording decisions faster and require less overhead, but less transparent and further removed from the code the decisions relate to.
- **Documenting decisions as ADRs in each sub-directory:** Would keep the decision record closer to the code, but make them less discoverable.
