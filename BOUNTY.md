# Open Source Bounty Program

## Overview

The CommonGrants open source bounty program funds outside contributions to the protocol and its tooling. This document covers how the program runs, what gets funded, and how contributions come in.

## Funding Model

### Sources
- **HHS Grants Innovation Fund**: Primary funding source for initial bounties
- **Community Donations**: Optional contributor donations to specific bounties
- **Implementation Fees**: Organizations that benefit from protocol improvements contribute back

### Budget Allocation
- **Small bounties** (\-\): Documentation fixes, bug fixes, minor features
- **Medium bounties** (\-\): New features, SDK improvements, template enhancements
- **Large bounties** (\+): Major protocol extensions, new language SDKs, significant tooling

## Bounty Lifecycle

### 1. Proposal
- Submit a bounty proposal via [GitHub Issue](https://github.com/HHS/simpler-grants-protocol/issues/new?template=3-bounty-request.yml)
- Include: scope, acceptance criteria, estimated reward, timeline
- Community review period: 7 days

### 2. Approval
- Maintainers review proposals weekly
- Approved bounties get the ounty label
- Reward amount finalized based on complexity assessment

### 3. Claiming
- Contributors comment /claim on the bounty issue to lock it for 24 hours
- First valid claim wins the bounty window
- Multiple contributors can collaborate on one bounty

### 4. Execution
- Create a fork and feature branch
- Implement according to acceptance criteria
- Follow [Contributing Guidelines](CONTRIBUTING.md)

### 5. Review & Payment
- PR review by maintainers
- Upon merge, payment processed within 14 days
- Payment via GitHub Sponsors or direct transfer

## Acceptance Criteria Template

All bounties must include:

- [ ] Clear problem statement
- [ ] Specific acceptance criteria (checklist format)
- [ ] Technical approach guidance (optional)
- [ ] Testing requirements
- [ ] Documentation requirements
- [ ] Estimated completion time

## RFC Process

For bounties affecting the protocol specification:

1. **RFC Draft**: Create a markdown file in proposals/ directory
2. **Community Review**: 14-day review period on GitHub Discussions
3. **Revision**: Incorporate feedback
4. **Vote**: Community vote via Fider or GitHub reactions
5. **Implementation**: Once approved, create bounty issue

## Reward Schedule

| Category | Min | Max | Examples |
|----------|-----|-----|----------|
| Documentation | \ | \ | README updates, guide creation |
| Bug Fix | \ | \ | Critical bugs, security fixes |
| Feature | \ | \ | New CLI commands, SDK methods |
| Enhancement | \ | \ | New templates, integrations |
| Protocol Change | \ | \ | TypeSpec changes, new models |

## Rules

1. **Original Work**: All contributions must be original work
2. **No Duplicate Claims**: Same issue cannot have multiple active claims
3. **Quality Standards**: All code must pass CI checks
4. **Communication**: Respond to review comments within 48 hours
5. **Time Limits**: Complete claimed bounties within stated timeline

## Getting Started

1. Browse [active bounties](https://github.com/HHS/simpler-grants-protocol/issues?q=is%3Aissue+is%3Aopen+label%3Abounty)
2. Read [Contributing Guidelines](CONTRIBUTING.md)
3. Comment /claim on your chosen bounty
4. Fork, branch, and start coding!

## Questions?

- Join the [community forum](https://forum.simpler.grants.gov/c/commongrants/8)
- Open a [discussion](https://github.com/HHS/simpler-grants-protocol/discussions)
- Contact: laurabelinfante (issue assignee)
