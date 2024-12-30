---
title: Recording decisions
description: Summary of how decisions are recorded on this project.
---

## About ADRs

### Why do we need to document architecture decisions?

Documenting key decisions in the project helps:

1. Transfer knowledge about the project to future maintainers and open source collaborators.
2. Explicitly document tradeoffs and alternatives that were considered making a particular choice.
3. Increase the speed at which new team members can be onboarded to the project.

### What constitutes an architecture decision?

Almost all of engineering and code development involves making choices, so how do you know when a particular choices rises to the level of an architecture decision and requires an ADR?

> An Architectural Decision (AD) is a software design choice that addresses a functional or non-functional requirement that is architecturally significant.
>
> Source: [ADR GitHub Organization](adr)

Another way to recognize when making a decision related to your project constitutes an architecture decision is to ask yourself three questions about that decision:

1. Does this decision affect the structure, direction, or outcome of the project?
2. Would someone unfamiliar with the project ask me to explain why I made this decision?
3. Were there other viable alternatives I could have chosen?

If you answer "Yes" to at least one of these questions, then you've likely just made an architectural decision, and you should create an ADR to explain why you made that choice. Other contributors (and your future self) will thank you for it.

### Examples of architecture decisions

While architecture decisions come in all shapes and sizes, some common examples include:

- Setting up the repository's main file structure
- Selecting a critical library, tool, or platform
- Adopting a certain analytical framework or algorithm
- Choosing _not_ to build a particular feature

## ADR process

When an architectural decision needs to be recorded, please use the following steps:

1. Create a GitHub issue with the Internal - Decision template and describe the decision that needs to be made
2. Create a new branch prefixed with the issue number
3. Copy the ADR template and add it to `src/content/docs/decisions/adr/` with the date of the original decision in the title
4. Fill out the ADR template to record your decision and link your to your ADR in the decisions section below:
5. Open up a PR and tag the reviewers who need to sign off on your decision

## Acknowledgements and further reading

- [ADR GitHub Organization][adr]
- [Joel Parker Henderson's ADR repo][joel]
- [GitHub Blog - Why Write ADRs][github]

[adr]: https://adr.github.io/
[joel]: https://github.com/joelparkerhenderson/architecture-decision-record#what-is-an-architecture-decision-record
[github]: https://github.blog/2020-08-13-why-write-adrs/
