---
title: "Community Stewardship Model"
description: "ADR documenting the decision to pursue a phased transition to community stewardship with a neutral host and participation-based governance"
---

The CommonGrants protocol requires a stewardship model that supports early-stage development while enabling long-term sustainability, neutrality, and broad adoption across the grants ecosystem. As the protocol matures beyond its initial federal use case, we need to determine who should host and steward the protocol over time and how stewardship authority should be allocated among participating stakeholders.

## Decision

CommonGrants will pursue a **phased transition to community stewardship**, with the following principles:

- **Short term:** HHS serves as the initial steward while the protocol is pre-v1.0 and adoption is emerging
- **Long term:** Hosting transitions to a neutral nonprofit or purpose-aligned host, with governance authority exercised through a participation-based model
- **Authority:** Earned through demonstrated adoption, contribution, and stewardship, with clear tie-breaking mechanisms to ensure forward progress

Specific transition checkpoints, participation metrics, and host selection criteria will be defined in a separate transition plan.

**Positive consequences**

- Preserves momentum during early development
- Establishes a credible path toward neutrality and shared ownership
- Aligns influence with real-world impact and responsibility
- Supports long-term sustainability and trust across sectors

**Negative consequences**

- Requires careful coordination during transitions
- Introduces operational and administrative overhead as stewardship matures
- Defers some decisions (e.g. host selection) to future milestones

### Criteria

- **Vested interest:** The hosting body should have a strong incentive to prioritize the long-term success and adoption of the CommonGrants protocol.
- **Resources & sustainability:** The stewardship model must be supportable with realistic staffing, funding, and operational capacity over time.
- **Trusted authority:** The protocol continues to be governed by a hosting body and governance structure that is trusted by current and potential adopters.
- **Neutrality:** The protocol stewardship model should not be perceived as giving an advantage to any single funder, vendor, or sector.
- **Aligned incentives:** The stewardship model should incentivize shared ownership and adoption amongst relevant stakeholders in the grants ecosystem.
- **Balanced participation:** The hosting body should reflect the diversity of stakeholders, grantors, grant seekers, implementers, and platform providers, in proportion to their contributions.
- **Operational clarity:** Decision-making authority, escalation paths, and dispute resolution must be explicit.
- **Flexibility:** The structure should be able to mature and change as adoption increases without requiring a fundamental reset.

### Options considered

- **Option 1: Government-led stewardship** - HHS remains the long-term host and final decision-maker, with structured but non-binding community input.
- **Option 2: Transition to existing grants standards initiative** - Hosting and stewardship transition to an existing organization whose primary mission already includes grants, philanthropy, or funding data standards.
- **Option 3: Neutral host with participation-based stewardship** - Transition hosting to a neutral nonprofit entity, either newly established or purpose-selected, with governance authority earned through demonstrated participation. _(chosen)_
- **Option 4: Established open source foundation hosting** - Transition stewardship and hosting to an established open source foundation (e.g., CNCF, Linux Foundation, Apache Foundation).

## Evaluation

### Side-by-side comparison

| Criteria               | Option 1 | Option 2 | Option 3 | Option 4 |
| ---------------------- | :------: | :------: | :------: | :------: |
| Vested interest        |    🟡    |    🟡    |    ✅    |    ❌    |
| Sustainability         |    ✅    |    🟡    |    🟡    |    🟡    |
| Trusted authority      |    ✅    |    🟡    |    🟡    |    ✅    |
| Neutrality             |    🟡    |    ❌    |    ✅    |    ✅    |
| Aligned incentives     |    ✅    |    🟡    |    ✅    |    ❌    |
| Balanced participation |    ❌    |    ❌    |    ✅    |    🟡    |
| Operational clarity    |    ✅    |    ✅    |    🟡    |    ✅    |
| Flexibility            |    ❌    |    🟡    |    ✅    |    🟡    |

### Option 1: Government-led stewardship

HHS remains the long-term host and final decision-maker, with structured but non-binding community input.

_Example: US Core Data for Interoperability (USCDI) - A federal agency owns and evolves the standard, with public comment and advisory input, but final authority remains with the government. This works well for compliance-driven standards but can limit cross-sector ownership._

- **Pros**
  - Strong alignment with federal priorities
  - Clear authority and accountability
  - Low overhead
- **Cons**
  - Limited neutrality for non-federal adopters
  - Reduced incentive for private and nonprofit investment
  - Risk of being perceived as "federal-only"

### Option 2: Transition to existing grants standards initiative

Hosting and stewardship transition to an existing organization whose primary mission already includes grants, philanthropy, or funding data standards.

_Example: Candid and Philanthropy Data Commons (PDC) - An established grants-adjacent organization that already stewards widely adopted data standards and maintains active relationships with funders, platforms, and intermediaries. Legitimacy flows from existing adoption and institutional trust within the grants and philanthropy ecosystem._

- **Pros**
  - Immediate credibility within the grants and philanthropy ecosystem
  - Lower startup cost than forming a new entity
  - Faster path to operational sustainability
- **Cons**
  - Host priorities may diverge from protocol needs
  - Perceived bias toward philanthropy over public-sector or applicant perspectives
  - Authority ultimately anchored to the host organization

### Option 3: Neutral host with participation-based stewardship

Transition hosting to a neutral nonprofit entity, either newly established or purpose-selected, whose primary mandate is stewardship of the CommonGrants protocol. Governance authority is earned through demonstrated participation in adoption, contribution, and stewardship.

_Example: FHIR (HL7) and OpenID Foundation - A neutral steward maintains the standard while authority is earned through sustained adoption, contribution, and community engagement. Influence scales with real-world impact, supported by clear editorial and tie-breaking authority._

- **Pros**
  - Aligns influence with real-world impact and responsibility
  - Strong neutrality across public, private, and nonprofit sectors
  - Scales as adoption grows
  - Avoids symbolic or static representation
- **Cons**
  - Higher initial design and setup effort
  - Requires clear participation metrics and enforcement
  - Slower to stand up than reusing an existing institution

### Option 4: Established open source foundation hosting

Transition stewardship and hosting to an established open source foundation (e.g., CNCF, Linux Foundation, Apache Foundation), using their standard project lifecycle and governance frameworks.

_Example: Kubernetes (CNCF) / Apache Software Foundation projects - A mature foundation provides legal and operational scaffolding, with stewardship driven by technical contributors. This model excels for software ecosystems but often underrepresents non-technical stakeholders and adoption outcomes._

- **Pros**
  - Mature legal and operational infrastructure
  - Well-understood governance models
  - Strong credibility within technical communities
- **Cons**
  - Optimized for software projects rather than multi-stakeholder data standards
  - Influence favors engineering capacity over adoption impact
  - Weaker representation for grantors and grant seekers
