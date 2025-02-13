---
title: RFC format
description: ADR documenting the decision to use GitHub Discussions for the RFC process for the CommonGrants protocol.
---

## Summary

### Problem statement

The CommonGrants protocol team needs to choose a forum for hosting a request for comment (RFC) period on the draft protocol to gather feedback from stakeholders, including public and private funders, grant platform executives, and developers. The format should align with open-source best practices, ensure accessibility, transparency, and minimize overhead.

### Decision outcome

We've decided to use **GitHub Discussions** as the primary platform for hosting the RFC process. We'll also plan to link to a Google Form in the GitHub Discussions thread as a secondary feedback option for who are not comfortable with GitHub.

- **Positive consequences**
  - Transparent and publicly accessible discussion format.
  - Well-integrated with GitHub, where protocol development occurs.
  - Enables threaded conversations and structured feedback.
  - Provides built-in engagement metrics (views, comments, reactions).
  - Provides a backup option for stakeholders who are not comfortable with GitHub.
- **Negative consequences**
  - Some less technical stakeholders may be unfamiliar with GitHub.
  - Stakeholders without a GitHub account will need to create one to participate.
  - Requires setting up guidelines for engagement to maintain productive discussions.
  - May result in conversations being fragmented across multiple platforms (GitHub Discussions and Google Form).

### Decision drivers

- The RFC process and format should align with other open-source RFCs.
- The RFC process should be accessible to a mix of funders, grant platform execs, and developers.
- The RFC process should be open and transparent.
- The RFC process should require minimal overhead.
- It should be relatively easy to track engagement metrics (e.g., views, comments, response rate, etc.).

## Options considered

- GitHub Discussions
- A dedicated webpage with a form/email for feedback
- Google Groups
- Discourse

## Evaluation

### Side-by-side

| Criteria                            | GitHub Discussions | Dedicated Webpage | Google Groups | Discourse |
| ----------------------------------- | :----------------: | :---------------: | :-----------: | :-------: |
| Aligns with open-source RFCs        |         ✅         |        🟡         |      ❌       |    🟡     |
| Accessible to a mix of stakeholders |         🟡         |        ✅         |      ✅       |    ✅     |
| Open and transparent                |         ✅         |        ❌         |      ✅       |    ✅     |
| Minimal overhead                    |         ✅         |        ❌         |      ❌       |    ❌     |
| Easy to track engagement metrics    |         ✅         |        🟡         |      ❌       |    ❌     |

### GitHub Discussions

:::note[Bottom line]
**GitHub Discussions** is best if:

- We want to prioritize transparency and open engagement.
- We can provide onboarding support for non-technical stakeholders, or offer a secondary feedback option for those who are not comfortable with GitHub.
  :::

- **Pros**
  - Transparent, public, and structured discussion format.
  - Well-integrated into GitHub where development happens.
  - Enables easy tracking of engagement (comments, reactions, views).
- **Cons**
  - Some funders and grant execs may not be comfortable using GitHub.
  - Requires setup of participation guidelines to keep discussions productive.

### Dedicated webpage with form/email

:::note[Bottom line]
**A dedicated webpage** is best if:

- We want to maximize accessibility for non-technical stakeholders.
- We can manage the added overhead of manually compiling feedback.
  :::

- **Pros**
  - Easy for non-technical users to participate.
  - No need for a GitHub account.
- **Cons**
  - Harder to track engagement metrics and trends.
  - Feedback lacks the structured, conversational format of GitHub Discussions.
  - Higher overhead to review and synthesize responses.

### Google Groups

:::note[Bottom line]
**Google Groups** is best if:

- We want a familiar email-based discussion platform.
- We need a low-barrier entry point for non-technical users.
- We can manage the added overhead of manually compiling feedback.
  :::

- **Pros**
  - Familiar to many users as an email-based discussion tool.
  - Allows threaded conversations.
- **Cons**
  - Lacks structured engagement metrics.
  - Not widely used in open-source RFCs.
  - Can become difficult to moderate and organize long-term discussions.

### Discourse

:::note[Bottom line]
**Discourse** is best if:

- We want a structured discussion forum separate from GitHub.
- We are willing to maintain an additional platform.
  :::

- **Pros**
  - Supports structured discussions with threading and categories.
  - More accessible for non-developers than GitHub Discussions.
- **Cons**
  - Requires additional setup and moderation.
  - Engagement metrics may not be as easily tracked.
  - Separate from GitHub, potentially fragmenting discussions.
