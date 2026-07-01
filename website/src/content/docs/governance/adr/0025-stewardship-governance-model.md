---
title: Stewardship governance model
description: ADR documenting the participation-based governance model for CommonGrants stewardship, adapted from the OpenID Foundation model.
---

This document proposes mechanics for the stewardship model chosen in [ADR 0021](/governance/adr/0021-community-stewardship/). It covers participation and membership, decision-making authority and process, with open questions to be addressed. There is also an appendix to address suggested criteria for host selection.

The community stewardship ADR chose the high-level stewardship archetype (neutral host with participation-based stewardship) and named **HL7/FHIR** and the **OpenID Foundation** as current working examples for a potential model for CommonGrants. The draft governance model below attempts to build upon those two existing models to adapt a suggested template for CommonGrants governance.

## Decision

We will adapt the **OpenID Foundation** model for the CommonGrants stewardship body. OpenID is the closest structural match to what we need: a small, neutral, non-profit standards body with no central infrastructure dependency. At a glance, the model covers:

- **Participation and membership**: who can join and how they earn voting authority.
- **Decision-making authority**: what kinds of decisions the body makes and how HHS transitions out.
- **Decision process:** how the body reaches decisions (consent-based by default, with escalation to formal vote if needed).
- **Other model elements**: extensions, funding, IP and licensing.

### Positive consequences

- Influence tracks adoption and contribution, not ability to pay
- Funding does not depend on running central infrastructure
- Body stays small and neutral, with room to adapt as the community matures

### Negative consequences

- Authority accrues slowly through sustained participation, which can delay fast-moving contributors
- Certification program takes time to build and may not fund operations in early years
- Defining what counts as participation requires sustained moderation

## Criteria

The decision drivers used to evaluate the two candidate bodies:

- **Fit for a small standards body in early phase:** The body's process and overhead should match what a small standards body can sustain.
- **Authority earned through participation:** Decision authority should be earned through demonstrated participation, not paid membership.
- **Cross-sector neutrality:** The body should not advantage any sector (gov, vendor, philanthropic, nonprofit) over the others.
- **Process pace compatible with co-planning:** Decision cadence should match community co-planning, not block on multi-stage formal ballots.
- **Funding model achievable without large corporate dues:** The body should have a realistic path to funding beyond corporate dues alone.
- **Adaptable as the community matures:** The body should evolve processes without requiring a fundamental reset.

## Options considered

### Side-by-side comparison

| **Criterion** | **HL7/FHIR** | **OpenID Foundation (chosen)** |
| --- | --- | --- |
| Fit for a small body in early phase | ❌ | ✅ |
| Authority earned through participation | 🟡 | ✅ |
| Cross-sector neutrality | 🟡 | ✅ |
| Process pace compatible with co-planning | ❌ | 🟡 |
| Funding model achievable without large corporate dues | ❌ | 🟡 |
| Adaptable as the community matures | 🟡 | ✅ |

Legend: ✅ fully meets, 🟡 partially meets, ❌ does not meet.

### Option 1: HL7/FHIR-style

HL7 is an ANSI-accredited not-for-profit standards developer with tiered organizational membership priced by revenue, plus individual and academic tiers. Decision-making runs through working groups, a Technical Steering Committee, and the FHIR-specific FHIR Management Group, with specifications moving through a multi-stage ballot pipeline. Authority covers the FHIR trademark, spec publication under CC0, ANSI accreditation, balloting, and IP policy. Funding mixes membership dues, education and certification revenue, and sponsorship.

#### Pros

- Revenue-scaled dues keep small participants at the table without being priced out
- ANSI-accredited, with deep institutional trust
- Mature ballot pipeline with formal comment reconciliation

#### Cons

- Heavy governance overhead, slow for a small body in early phase
- Tiered membership categories do not map cleanly to the grants ecosystem
- Vendor-heavy in practice, which weakens cross-sector neutrality

### Option 2: OpenID Foundation-style (chosen)

The OpenID Foundation is a small, neutral, non-profit standards body that does not run shared infrastructure. Working groups are open to those who sign the Contribution Agreement, with consensus as the default decision mode. Specifications go through a 60-day public review and a 14-day vote of the membership. The board balances Sustaining members ($50K/yr each, board seat), Corporate Representatives (smaller orgs), and Community Representatives (elected by the broader membership).

_The pattern most relevant to CommonGrants: small, neutral, no infrastructure dependency, with explicit Community Representative seats that give long-term contributors a path to authority not gated by paid membership. The funding mix (dues + certification fees + directed funding) is achievable without operating shared infrastructure. The trade-off: smaller institutional footprint than HL7._

#### Pros

- Closest structural match: small, neutral, no infrastructure dependency
- Working groups open without paid membership, so anyone can contribute
- Community Representative seats give long-term contributors a path to authority not gated by paid membership

#### Cons

- Smaller institutional footprint than HL7
- Certification program takes time to build, will not fund operations in early years
- OpenID's Sustaining tier ($50K/yr) may not translate directly to grants ecosystem economics, dues thresholds need to be right-sized

## Proposed implementation

The rest of this document fleshes out OpenID Foundation-style mechanics for the CommonGrants context.

### Participation and membership

Participation is open to organizations or individuals whose work touches the protocol, including grant-making agencies, philanthropic funders, grant management platforms, integrators, technical implementers, and researchers.

Authority is earned, not bought, through three forms of participation: adoption, contribution, and stewardship. Sponsorship and dues fund the body's operations but do not grant decision-making authority. Participants may join by signing the Contribution Agreement, patterned after the OpenID Foundation IPR framework. No dues are required for joining.

### Decision-making authority

The body makes four kinds of decisions:

- **protocol changes** (versioned changes to the data contract, including promotion of extensions to core, deprecation, and sunset),
- **operational decisions** (release cadence, working group structure, conformance program direction, and non-normative changes to spec text such as wording, formatting, and clarifications),
- **stewardship decisions** (admission of new working groups, recognition of named roles, acceptance of new implementer organizations),
- **and governance model changes** (modifications to this document itself).

During the transition period (HHS as initial steward through September 2027 per the Stewardship Roadmap), HHS retains final authority on protocol changes that affect Simpler.Grants.gov (eventually [grants.gov](http://grants.gov) post transition) compliance. The body has authority over operational, stewardship, and governance model decisions, with HHS review on operational and stewardship matters during transition. Post-transition, the body holds full authority across all four categories. HHS retains a durable anchor stakeholder role.

Versioned changes follow a public review and consent process patterned after the OpenID Foundation. Non-breaking changes follow a lighter path: working group review and a single ratification step. The Quad 5 custom field pattern is the model for non-breaking extension handling. Governance model changes follow the same process as versioned changes. HHS does not hold transition-period override authority over governance model changes, otherwise transition-period authority could be used to alter the body's own rules. Emergency or security-critical changes (e.g., zero-day vulnerabilities) may be acted on directly by the body, with retroactive consent review by the working group.

### Decision process

The body uses a consent-based decision process. Proposals proceed unless a participant raises a substantive objection. Objections must include a concrete concern and a path to resolution. The body's chair facilitates resolution; unresolved objections escalate to a formal vote at a 2/3 threshold. Procedural concerns (conflict of interest, inadequate notice, process irregularities) escalate to the body's chair, with outcomes published.

### Other model elements

Implementers publish to a public catalog without a ratification vote, as long as they conform to the published extension framework. Promotion of an extension to a core protocol field follows the protocol-change process.

Funding does not depend on running central infrastructure. HHS supports operations through September 2027 per the Stewardship Roadmap.

IP and licensing keep the protocol open and the specification will be published under a permissive open license. Once published, the spec cannot be relicensed under restrictive or closed-source terms. SDKs and reference implementations are published under CC0-1.0. The CommonGrants name and logo will be trademarks held by the body. The Contribution Agreement will establish that contributors grant a perpetual, irrevocable, royalty-free license, with the body retaining rights to relicense as needed.

## Appendix A: Host evaluation criteria

A draft set of criteria the body will use to evaluate potential host organizations, published for community review.

### Decision drivers

The lens the body applies when evaluating a candidate host:

- **Vested interest:** The hosting body should have a strong incentive to prioritize the long-term success and adoption of the CommonGrants protocol.
- **Long-term sustainability:** The host can support the protocol over a multi-year horizon, including changes in staffing, funding, and community participation.
- **Trust and credibility across implementers:** The host is perceived as a credible steward by federal, state, philanthropic, vendor, and nonprofit implementers.
- **Compatibility with this governance model:** The host can accommodate participation-based stewardship, consent-based decision-making, and open working groups.
- **Operational and legal capacity:** The host has the staffing, infrastructure, and legal form to license content openly and administer the body's operations.

### Criteria categories

**1. Governance compatibility.** Can the host's bylaws and culture accommodate the participation-based governance model defined in this document?

- Are the host's existing governance bodies (boards, committees) compatible with overseeing a stewardship model?

**2. Neutrality and credibility.** Is the host perceived as neutral across the grants ecosystem's sectors?

- No conflicts in the host's portfolio that would directly compete with CommonGrants, although overlapping standards may be okay provided that the main goal of our work is interoperability
- Demonstrated trust across gov, vendor, philanthropic, and nonprofit communities

**3. Operational and legal capacity.** Does the host have the resources and form to take on the protocol?

- Legal form (501(c)(3), (4), or equivalent) that can hold IP and trademarks
- Infrastructure for community management, working group facilitation, and spec hosting

**4. Track record and transition fit.** Has the host stewarded similar standards successfully?

- Demonstrated experience with open standards
- Willingness to commit to the protocol as a long-term mandate
- Compatibility through HHS transition period

### How the body applies these criteria

The body will use these criteria when evaluating candidate hosts during the transition window. The body will publish its evaluation and reasoning for community review before finalizing a host selection.

### Acknowledged trade-offs

- A larger, more established host offers stability but may be less flexible.
- A new entity gives the body more control over its own structure but requires more setup work.
- A host with existing brand recognition in adjacent communities (open standards, civic tech) brings credibility but may have priorities that diverge from grants specifically.

## Appendix B: Next steps

These open questions are intentionally left for a small working group of HHS and select community members to resolve as the next phase of this work. They are not blockers to adopting the model in ADR 0021; they are the decisions the body will make as it forms.

### Scope and structure of the body

- New entity vs. hosted by an existing one, and geographic or sector scope (US-only, civic-tech-only, etc.)
- Whether tiers exist (single working tier vs. stratified by org type), and whether decision weight is equal or scales with contribution

### Decision-making and the HHS transition

- Whether HHS retains a veto path during transition beyond protocol-change authority, and whether transport mechanisms are in the body's scope or left to implementers
- Whether consent applies uniformly across decision categories or high-stakes changes require an explicit vote, and whether HHS holds an objection-resolution role during transition

### Extensions, funding, and licensing

- Stable extension tier (FHIR-style), whether dues exist and how they scale, whether the body runs any infrastructure, and spec license direction (CC0, CC-BY 4.0, or other)

### Host selection criteria (Appendix A)

- Whether the criteria framing and sub-criteria are right, what else belongs, and how to weigh categories
