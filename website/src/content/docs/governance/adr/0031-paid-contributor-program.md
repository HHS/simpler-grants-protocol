---
title: Funding open source contributions to CommonGrants
description: ADR documenting the decision to run a lightweight paid contributor pilot that funds outside contributions through fixed awards on GitHub issues.
---

_CommonGrants is launching an open source paid contributor program that funds outside contributions, with a documented process for community members to propose and steward code contributions. We need to determine how contributors are paid, who is eligible to claim a funded issue, and who scopes and reviews the work._

## Decision

To run this pilot we will label four GitHub issues with awards ranging from $50 to $500 per issue, pay contributors through Tremendous (already in use for community steward payments), and track the program in a spreadsheet.

### Process

- **Payment.** Sent via Tremendous, the same route that is currently used to pay community stewards.
- **Roles.** Engineers will select the issues eligible for funding and review the submitted pull requests. Product and delivery will handle claims, payment, communications, and administration.
- **Eligibility.** US persons only for the duration of the pilot. Paying non-resident contributors requires collecting foreign tax forms (W-8BEN), which is more administrative overhead than the program warrants at this scale.
- **Contributors with an interest in the work.** A contributor may claim a funded issue whose outcome benefits their own organization, provided the code is public under an open license and anyone is free to read, fork and adapt it.
- **Claims.** Any US person may claim a funded issue by commenting on the issue. A claim is confirmed by assignment. We are not building a claim bot.
- **Implementation issues.** Some funded issues ask for a CommonGrants-compatible API over a grant source, or a plugin for a grant portal, built in the contributor's own repository. Contributors propose instead of claiming, two reviewers choose a proposal, and payment follows both reviewers confirming the work meets the acceptance criteria.
- **Merging code.** All contributions will go through our existing code review and approval process. Maintainer approval and passing CI/CD checks are required before any pull request is merged.

The terms contributors agree to are published in the [paid contributor terms](https://github.com/HHS/simpler-grants-protocol/blob/main/PAID_CONTRIBUTOR_TERMS.md). This pilot will be revisited in January 2027. Continuing past that depends on contributors having claimed and completed funded issues, and the scale and scope of the work being sustainable for the current team.

### Positive consequences

- Pays people for work on public infrastructure
- Nothing requires unwinding if the program ends. No platform, no escrow, no contracts

### Negative consequences

- Scoping and review consume engineering time that has to be visible in sprint planning
- Claims, payment, and records are handled manually for the duration of the pilot

### Criteria

- **Easy to administer:** The program runs on processes we already have, with no new machinery and no dedicated hire.
- **Encourages community contribution:** The program brings in people from outside the core team and its partners.
- **Extends and enhances our work:** What comes back advances the protocol rather than creating drag on the team.
- **High return on investment:** The value of the contributions exceeds what we spend in money and in review time.
- **Low legal and contracting risk:** Paying contributors this way does not create new contracting, tax, or employment-classification exposure.

### Options considered

- **Option 1: Volunteer contributions only** - Maintain good first issues and fund nothing.
- **Option 2: Lightweight paid contributor pilot** - Label issues `funded` and state the award amount on the issue, accept claims by comment, pay through Tremendous, and track in a spreadsheet. _(chosen)_
- **Option 3: Platform-mediated payouts** - Procure a paid contribution management platform such as Algora, with escrow and automated payout on merge.
- **Option 4: Cohort-based retainer program** - Select contributors by application and engage them on monthly retainers with assigned mentors.

## Evaluation

### Side-by-side comparison

- ✅ Criterion met
- ❌ Criterion not met
- 🟡 Partially met or unsure

| Criteria                          | Volunteer only | Lightweight pilot | Platform | Cohort |
| --------------------------------- | :------------: | :---------------: | :------: | :----: |
| Easy to administer                |       ✅       |        🟡         |    🟡    |   ❌   |
| Encourages community contribution |       ❌       |        ✅         |    ✅    |   🟡   |
| Extends and enhances our work     |       ❌       |        ✅         |    ✅    |   ✅   |
| High return on investment         |       🟡       |        ✅         |    ❌    |   ❌   |
| Low legal and contracting risk    |       ✅       |        ✅         |    🟡    |   ❌   |

### Option 1: Volunteer contributions only

Maintain good first issues and fund nothing.

- **Pros**
  - Creates no tax or procurement exposure
  - Low administrative overhead
  - No new process to run
- **Cons**
  - Leaves the contribution pipeline dependent on partners with an existing reason to engage
  - May signal that unpaid labor is a preferred method of community engagement
  - Would likely result in fewer contributions overall as compared to a paid program

### Option 2: Lightweight paid contributor pilot (chosen)

Label a small set of issues `funded` and state the award amount on the issue. Contributors claim by commenting. Payment runs through Tremendous and tracking is a spreadsheet. No platform and no custom automation.

- **Pros**
  - Runs on processes already in place, including the payment workflow used for community stewards
  - Nothing requires unwinding if the program ends
  - The administrative load is capped by the number of funded issues published
- **Cons**
  - Claims, payment and records are handled manually
  - Funded issues are discovered only through our own outreach
  - Does not scale beyond roughly fifteen active funded issues without additional tooling

### Option 3: Platform-mediated payouts

Procure a paid contribution management platform such as Algora. Funded issues publish to a marketplace, claims and payouts are automated, and funds sit in escrow.

- **Pros**
  - Native GitHub workflow and automatic payout on merge
  - Exposure to an audience of contributors that already exists
  - Lower administration per funded issue once volume is high
- **Cons**
  - Procurement for a platform we cannot yet justify
  - Approximately ten percent in fees
  - No federal compliance features, so tax handling still falls to us

### Option 4: Cohort-based retainer program

Select a small group of contributors by application and engage them on monthly retainers with assigned mentors and milestone reviews.

- **Pros**
  - Highest contribution quality, and contributors accumulate context between engagements
  - Predictable cadence
- **Cons**
  - Requires contractor agreements and a procurement path
  - Demands mentoring capacity the team does not have
  - Increases worker classification exposure once compensation becomes time-based
  - Set up time would outweigh the benefits of contributions
